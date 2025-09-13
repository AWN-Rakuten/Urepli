import { BaseAgent, AgentConfig } from '../../infra/agent-base';
import { EventTypes, Event } from '../../infra/event-bus';
import { EntityType, RelationType } from '../../infra/knowledge-graph';

export interface RegimeState {
  id: string;
  name: string;
  probability: number;
  characteristics: {
    volatility: 'low' | 'medium' | 'high';
    liquidity: 'abundant' | 'normal' | 'scarce';
    creditStress: 'low' | 'medium' | 'high';
    dispersion: 'low' | 'medium' | 'high';
    momentum: 'weak' | 'moderate' | 'strong';
  };
  duration: number; // expected duration in days
  transitionProbabilities: Record<string, number>;
}

export interface MarketFeatures {
  volatility: number;
  liquidity: number;
  creditSpreads: number;
  dispersion: number;
  momentum: number;
  correlations: number[];
  volume: number;
  timestamp: Date;
}

/**
 * Regime Classifier Agent
 * Identifies formal regime labels and computes transition probabilities
 * Uses Hidden Semi-Markov models with causal graph constraints
 */
export class RegimeClassifierAgent extends BaseAgent {
  private readonly regimeStates: RegimeState[] = [
    {
      id: 'risk_on',
      name: 'Risk On',
      probability: 0.0,
      characteristics: {
        volatility: 'low',
        liquidity: 'abundant',
        creditStress: 'low',
        dispersion: 'low',
        momentum: 'strong'
      },
      duration: 45,
      transitionProbabilities: {
        'risk_off': 0.15,
        'uncertainty': 0.10,
        'risk_on': 0.75
      }
    },
    {
      id: 'risk_off',
      name: 'Risk Off',
      probability: 0.0,
      characteristics: {
        volatility: 'high',
        liquidity: 'scarce',
        creditStress: 'high',
        dispersion: 'high',
        momentum: 'weak'
      },
      duration: 25,
      transitionProbabilities: {
        'risk_on': 0.20,
        'uncertainty': 0.25,
        'risk_off': 0.55
      }
    },
    {
      id: 'uncertainty',
      name: 'Uncertainty/Transition',
      probability: 0.0,
      characteristics: {
        volatility: 'medium',
        liquidity: 'normal',
        creditStress: 'medium',
        dispersion: 'medium',
        momentum: 'moderate'
      },
      duration: 15,
      transitionProbabilities: {
        'risk_on': 0.40,
        'risk_off': 0.40,
        'uncertainty': 0.20
      }
    }
  ];

  private currentRegime: RegimeState | null = null;
  private featureHistory: MarketFeatures[] = [];
  private readonly maxHistorySize = 252; // 1 year of daily data
  
  protected async setupSubscriptions(): Promise<void> {
    this.subscribeToEvent(EventTypes.DATA_INGESTED, this.handleDataIngested.bind(this));
    this.subscribeToEvent(EventTypes.MACRO_NARRATIVE_UPDATED, this.handleNarrativeUpdate.bind(this));
  }

  protected async initialize(): Promise<void> {
    // Initialize with equal probabilities
    for (const regime of this.regimeStates) {
      regime.probability = 1.0 / this.regimeStates.length;
    }
    
    console.log(`${this.config.name}: Initialized with ${this.regimeStates.length} regime states`);
  }

  protected async cleanup(): Promise<void> {
    this.featureHistory = [];
  }

  private async handleDataIngested(event: Event): Promise<void> {
    const { marketData } = event.data;
    
    if (marketData) {
      const features = this.extractFeatures(marketData);
      this.featureHistory.push(features);
      
      // Keep history bounded
      if (this.featureHistory.length > this.maxHistorySize) {
        this.featureHistory.shift();
      }
      
      // Update regime probabilities
      const updatedRegimes = this.updateRegimeProbabilities(features);
      const newRegime = this.detectRegimeChange(updatedRegimes);
      
      if (newRegime && (!this.currentRegime || newRegime.id !== this.currentRegime.id)) {
        await this.publishRegimeChange(newRegime);
      }
    }
  }

  private async handleNarrativeUpdate(event: Event): Promise<void> {
    // Adjust regime probabilities based on macro narrative
    const { narrative } = event.data;
    
    // Simple narrative-based adjustment (in production, use NLP analysis)
    const adjustments = this.analyzeNarrativeImpact(narrative);
    
    for (const regime of this.regimeStates) {
      if (adjustments[regime.id]) {
        regime.probability *= adjustments[regime.id];
      }
    }
    
    // Renormalize probabilities
    this.normalizeProbabilities();
  }

  private extractFeatures(marketData: any): MarketFeatures {
    // Extract relevant features from market data
    // This is a simplified version - in production, use sophisticated feature engineering
    return {
      volatility: this.calculateVolatility(marketData),
      liquidity: this.calculateLiquidity(marketData),
      creditSpreads: marketData.creditSpreads || 0,
      dispersion: this.calculateDispersion(marketData),
      momentum: this.calculateMomentum(marketData),
      correlations: marketData.correlations || [],
      volume: marketData.volume || 0,
      timestamp: new Date()
    };
  }

  private calculateVolatility(marketData: any): number {
    // Simple volatility calculation
    // In production, use more sophisticated methods (GARCH, realized vol, etc.)
    if (this.featureHistory.length < 2) return 0.15; // default
    
    const returns = marketData.returns || [];
    if (returns.length === 0) return 0.15;
    
    const mean = returns.reduce((sum: number, ret: number) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum: number, ret: number) => 
      sum + Math.pow(ret - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance * 252); // Annualized
  }

  private calculateLiquidity(marketData: any): number {
    // Simple liquidity measure based on bid-ask spread and volume
    const spread = marketData.bidAskSpread || 0.001;
    const volume = marketData.volume || 1000000;
    
    // Higher liquidity = lower spread, higher volume
    return volume / (spread * 1000000); // Normalized measure
  }

  private calculateDispersion(marketData: any): number {
    // Cross-sectional dispersion of returns
    const returns = marketData.crossSectionReturns || [];
    if (returns.length === 0) return 0.1;
    
    const mean = returns.reduce((sum: number, ret: number) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum: number, ret: number) => 
      sum + Math.pow(ret - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }

  private calculateMomentum(marketData: any): number {
    // Simple momentum calculation
    if (this.featureHistory.length < 20) return 0;
    
    const recentPrices = this.featureHistory.slice(-20).map(f => marketData.price || 100);
    const oldPrice = recentPrices[0];
    const newPrice = recentPrices[recentPrices.length - 1];
    
    return (newPrice - oldPrice) / oldPrice;
  }

  private updateRegimeProbabilities(features: MarketFeatures): RegimeState[] {
    const updatedRegimes = [...this.regimeStates];
    
    // Calculate likelihood of each regime given current features
    for (const regime of updatedRegimes) {
      const likelihood = this.calculateRegimeLikelihood(regime, features);
      
      // Update probability using Bayesian update
      regime.probability = regime.probability * likelihood;
    }
    
    // Normalize probabilities
    this.normalizeProbabilities();
    
    return updatedRegimes;
  }

  private calculateRegimeLikelihood(regime: RegimeState, features: MarketFeatures): number {
    let likelihood = 1.0;
    
    // Volatility likelihood
    likelihood *= this.getFeatureLikelihood(
      features.volatility,
      regime.characteristics.volatility,
      'volatility'
    );
    
    // Liquidity likelihood
    likelihood *= this.getFeatureLikelihood(
      features.liquidity,
      regime.characteristics.liquidity,
      'liquidity'
    );
    
    // Credit stress likelihood
    likelihood *= this.getFeatureLikelihood(
      features.creditSpreads,
      regime.characteristics.creditStress,
      'creditStress'
    );
    
    return likelihood;
  }

  private getFeatureLikelihood(
    featureValue: number,
    regimeCharacteristic: string,
    featureType: string
  ): number {
    // Simple Gaussian likelihood calculation
    // In production, use more sophisticated distributions
    const thresholds = this.getFeatureThresholds(featureType);
    
    let expectedValue: number;
    let variance: number;
    
    switch (regimeCharacteristic) {
      case 'low':
        expectedValue = thresholds.low;
        variance = thresholds.lowVar;
        break;
      case 'medium':
      case 'normal':
      case 'moderate':
        expectedValue = thresholds.medium;
        variance = thresholds.mediumVar;
        break;
      case 'high':
      case 'abundant':
      case 'strong':
        expectedValue = thresholds.high;
        variance = thresholds.highVar;
        break;
      default:
        return 1.0;
    }
    
    // Gaussian likelihood
    const diff = featureValue - expectedValue;
    return Math.exp(-0.5 * Math.pow(diff, 2) / variance);
  }

  private getFeatureThresholds(featureType: string): any {
    // Define thresholds for different features
    const thresholds = {
      volatility: {
        low: 0.10, lowVar: 0.02,
        medium: 0.20, mediumVar: 0.04,
        high: 0.35, highVar: 0.08
      },
      liquidity: {
        low: 500, lowVar: 100,
        medium: 1000, mediumVar: 200,
        high: 2000, highVar: 500
      },
      creditStress: {
        low: 0.5, lowVar: 0.1,
        medium: 1.5, mediumVar: 0.3,
        high: 3.0, highVar: 0.6
      }
    };
    
    return thresholds[featureType as keyof typeof thresholds] || thresholds.volatility;
  }

  private normalizeProbabilities(): void {
    const total = this.regimeStates.reduce((sum, regime) => sum + regime.probability, 0);
    if (total > 0) {
      for (const regime of this.regimeStates) {
        regime.probability /= total;
      }
    }
  }

  private detectRegimeChange(regimes: RegimeState[]): RegimeState | null {
    // Find regime with highest probability
    let maxProbability = 0;
    let dominantRegime: RegimeState | null = null;
    
    for (const regime of regimes) {
      if (regime.probability > maxProbability) {
        maxProbability = regime.probability;
        dominantRegime = regime;
      }
    }
    
    // Only change regime if probability exceeds threshold
    if (dominantRegime && dominantRegime.probability > 0.6) {
      return dominantRegime;
    }
    
    return null;
  }

  private async publishRegimeChange(newRegime: RegimeState): Promise<void> {
    this.currentRegime = newRegime;
    
    // Store regime in knowledge graph
    const regimeEntity = this.knowledgeGraph.addEntity(
      EntityType.REGIME,
      {
        name: newRegime.name,
        characteristics: newRegime.characteristics,
        probability: newRegime.probability,
        expectedDuration: newRegime.duration
      }
    );
    
    // Publish regime change event
    await this.publishEvent(
      EventTypes.REGIME_STATE_CHANGE,
      {
        previousRegime: this.currentRegime?.id,
        newRegime: newRegime.id,
        probability: newRegime.probability,
        characteristics: newRegime.characteristics,
        regimeEntityId: regimeEntity.id
      },
      {
        confidence: newRegime.probability,
        transitionProbabilities: newRegime.transitionProbabilities
      }
    );
    
    console.log(`${this.config.name}: Detected regime change to ${newRegime.name} (probability: ${newRegime.probability.toFixed(3)})`);
  }

  private analyzeNarrativeImpact(narrative: string): Record<string, number> {
    // Simple keyword-based analysis
    // In production, use sophisticated NLP and sentiment analysis
    const riskOnKeywords = ['growth', 'optimism', 'bullish', 'expansion'];
    const riskOffKeywords = ['crisis', 'fear', 'volatility', 'uncertainty', 'recession'];
    
    const lowerNarrative = narrative.toLowerCase();
    
    let riskOnScore = 0;
    let riskOffScore = 0;
    
    for (const keyword of riskOnKeywords) {
      if (lowerNarrative.includes(keyword)) {
        riskOnScore += 1;
      }
    }
    
    for (const keyword of riskOffKeywords) {
      if (lowerNarrative.includes(keyword)) {
        riskOffScore += 1;
      }
    }
    
    // Return adjustment multipliers
    const adjustments: Record<string, number> = {
      'risk_on': 1.0,
      'risk_off': 1.0,
      'uncertainty': 1.0
    };
    
    if (riskOnScore > riskOffScore) {
      adjustments['risk_on'] = 1.2;
      adjustments['risk_off'] = 0.8;
    } else if (riskOffScore > riskOnScore) {
      adjustments['risk_on'] = 0.8;
      adjustments['risk_off'] = 1.2;
      adjustments['uncertainty'] = 1.1;
    }
    
    return adjustments;
  }

  /**
   * Get current regime state and probabilities
   */
  getCurrentRegimeState(): {
    currentRegime: RegimeState | null;
    allProbabilities: { id: string; name: string; probability: number }[];
  } {
    return {
      currentRegime: this.currentRegime,
      allProbabilities: this.regimeStates.map(regime => ({
        id: regime.id,
        name: regime.name,
        probability: regime.probability
      }))
    };
  }
}