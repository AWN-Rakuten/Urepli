import { BaseAgent, AgentConfig } from '../../infra/agent-base';
import { EventTypes, Event } from '../../infra/event-bus';
import { EntityType, RelationType } from '../../infra/knowledge-graph';

export interface FactorCandidate {
  id: string;
  name: string;
  description: string;
  type: 'cross_sectional' | 'time_series' | 'hybrid';
  formula: string;
  dataRequirements: string[];
  zScore: number;
  significance: number;
  noveltyScore: number;
  crowdingRisk: number;
  halfLife: number; // decay rate in days
  regimeStability: Record<string, number>;
}

export interface MarketData {
  timestamp: Date;
  prices: Record<string, number>;
  volumes: Record<string, number>;
  fundamentals: Record<string, any>;
  microstructure: Record<string, any>;
  alternativeData: Record<string, any>;
}

/**
 * Factor & Motif Miner Agent
 * Discovers candidate factors (cross-sectional & time-series)
 * Penalizes factor crowding using external crowd proxies
 */
export class FactorMinerAgent extends BaseAgent {
  private readonly factorLibrary: FactorCandidate[] = [];
  private marketDataHistory: MarketData[] = [];
  private readonly maxHistorySize = 1000;
  
  // Known factor families for crowding analysis
  private readonly knownFactorFamilies = {
    momentum: ['price_momentum', 'earnings_momentum', 'analyst_revision'],
    value: ['pe_ratio', 'pb_ratio', 'ev_ebitda', 'dividend_yield'],
    quality: ['roe', 'roa', 'debt_to_equity', 'earnings_stability'],
    size: ['market_cap', 'enterprise_value'],
    volatility: ['realized_vol', 'idiosyncratic_vol', 'beta'],
    liquidity: ['bid_ask_spread', 'amihud_illiq', 'turnover']
  };

  protected async setupSubscriptions(): Promise<void> {
    this.subscribeToEvent(EventTypes.DATA_INGESTED, this.handleDataIngested.bind(this));
    this.subscribeToEvent(EventTypes.REGIME_STATE_CHANGE, this.handleRegimeChange.bind(this));
  }

  protected async initialize(): Promise<void> {
    console.log(`${this.config.name}: Initialized factor mining system`);
    
    // Initialize with some basic factors for testing
    await this.seedBasicFactors();
  }

  protected async cleanup(): Promise<void> {
    this.marketDataHistory = [];
    this.factorLibrary.length = 0;
  }

  private async handleDataIngested(event: Event): Promise<void> {
    const { marketData } = event.data;
    
    if (marketData) {
      this.marketDataHistory.push(marketData);
      
      // Keep history bounded
      if (this.marketDataHistory.length > this.maxHistorySize) {
        this.marketDataHistory.shift();
      }
      
      // Mine for new factors if we have sufficient data
      if (this.marketDataHistory.length >= 50) {
        const newFactors = await this.mineFactors(marketData);
        
        for (const factor of newFactors) {
          await this.evaluateAndPublishFactor(factor);
        }
      }
    }
  }

  private async handleRegimeChange(event: Event): Promise<void> {
    const { newRegime } = event.data;
    
    // Re-evaluate factor stability in new regime
    for (const factor of this.factorLibrary) {
      const stability = await this.calculateRegimeStability(factor, newRegime);
      factor.regimeStability[newRegime] = stability;
    }
    
    console.log(`${this.config.name}: Updated factor stability for regime ${newRegime}`);
  }

  private async mineFactors(currentData: MarketData): Promise<FactorCandidate[]> {
    const newFactors: FactorCandidate[] = [];
    
    // Cross-sectional factor mining
    const crossSectionalFactors = await this.mineCrossSectionalFactors(currentData);
    newFactors.push(...crossSectionalFactors);
    
    // Time-series factor mining
    const timeSeriesFactors = await this.mineTimeSeriesFactors();
    newFactors.push(...timeSeriesFactors);
    
    // Alternative data factors
    const altDataFactors = await this.mineAlternativeDataFactors(currentData);
    newFactors.push(...altDataFactors);
    
    return newFactors;
  }

  private async mineCrossSectionalFactors(data: MarketData): Promise<FactorCandidate[]> {
    const factors: FactorCandidate[] = [];
    
    // Price-based factors
    if (data.prices && Object.keys(data.prices).length > 10) {
      // Price momentum factor
      const momentumFactor = await this.createMomentumFactor(data);
      if (momentumFactor) factors.push(momentumFactor);
      
      // Price reversal factor
      const reversalFactor = await this.createReversalFactor(data);
      if (reversalFactor) factors.push(reversalFactor);
    }
    
    // Volume-based factors
    if (data.volumes && Object.keys(data.volumes).length > 10) {
      const volumeFactor = await this.createVolumeFactor(data);
      if (volumeFactor) factors.push(volumeFactor);
    }
    
    // Fundamental factors
    if (data.fundamentals) {
      const fundamentalFactors = await this.createFundamentalFactors(data);
      factors.push(...fundamentalFactors);
    }
    
    return factors;
  }

  private async mineTimeSeriesFactors(): Promise<FactorCandidate[]> {
    if (this.marketDataHistory.length < 100) return [];
    
    const factors: FactorCandidate[] = [];
    
    // Volatility regime factor
    const volRegimeFactor = await this.createVolatilityRegimeFactor();
    if (volRegimeFactor) factors.push(volRegimeFactor);
    
    // Correlation breakdown factor
    const corrBreakdownFactor = await this.createCorrelationBreakdownFactor();
    if (corrBreakdownFactor) factors.push(corrBreakdownFactor);
    
    return factors;
  }

  private async mineAlternativeDataFactors(data: MarketData): Promise<FactorCandidate[]> {
    const factors: FactorCandidate[] = [];
    
    if (data.alternativeData) {
      // Sentiment-based factors
      if (data.alternativeData.sentiment) {
        const sentimentFactor = await this.createSentimentFactor(data);
        if (sentimentFactor) factors.push(sentimentFactor);
      }
      
      // Satellite data factors (placeholder)
      if (data.alternativeData.satellite) {
        const satelliteFactor = await this.createSatelliteFactor(data);
        if (satelliteFactor) factors.push(satelliteFactor);
      }
    }
    
    return factors;
  }

  private async createMomentumFactor(data: MarketData): Promise<FactorCandidate | null> {
    // Simple price momentum calculation
    const prices = Object.entries(data.prices);
    if (prices.length < 10) return null;
    
    const momentumScores: Record<string, number> = {};
    
    for (const [symbol, currentPrice] of prices) {
      // Get historical prices for this symbol
      const historicalPrices = this.getHistoricalPrices(symbol, 20);
      if (historicalPrices.length >= 20) {
        const oldPrice = historicalPrices[0];
        const momentum = (currentPrice - oldPrice) / oldPrice;
        momentumScores[symbol] = momentum;
      }
    }
    
    if (Object.keys(momentumScores).length === 0) return null;
    
    // Calculate factor statistics
    const scores = Object.values(momentumScores);
    const zScore = this.calculateZScore(scores);
    
    return {
      id: `momentum_${Date.now()}`,
      name: 'Price Momentum 20D',
      description: '20-day price momentum factor',
      type: 'cross_sectional',
      formula: '(price_t / price_t-20) - 1',
      dataRequirements: ['daily_prices'],
      zScore,
      significance: this.calculateSignificance(scores),
      noveltyScore: await this.calculateNoveltyScore('momentum', momentumScores),
      crowdingRisk: this.calculateCrowdingRisk('momentum'),
      halfLife: 15, // estimated
      regimeStability: {}
    };
  }

  private async createReversalFactor(data: MarketData): Promise<FactorCandidate | null> {
    // Short-term reversal factor
    const prices = Object.entries(data.prices);
    if (prices.length < 10) return null;
    
    const reversalScores: Record<string, number> = {};
    
    for (const [symbol, currentPrice] of prices) {
      const historicalPrices = this.getHistoricalPrices(symbol, 5);
      if (historicalPrices.length >= 5) {
        const recentPrice = historicalPrices[historicalPrices.length - 1];
        const reversal = -(currentPrice - recentPrice) / recentPrice; // Negative for reversal
        reversalScores[symbol] = reversal;
      }
    }
    
    if (Object.keys(reversalScores).length === 0) return null;
    
    const scores = Object.values(reversalScores);
    const zScore = this.calculateZScore(scores);
    
    return {
      id: `reversal_${Date.now()}`,
      name: 'Short-term Reversal 5D',
      description: '5-day mean reversion factor',
      type: 'cross_sectional',
      formula: '-(price_t / price_t-5) + 1',
      dataRequirements: ['daily_prices'],
      zScore,
      significance: this.calculateSignificance(scores),
      noveltyScore: await this.calculateNoveltyScore('momentum', reversalScores),
      crowdingRisk: this.calculateCrowdingRisk('momentum'),
      halfLife: 8,
      regimeStability: {}
    };
  }

  private async createVolumeFactor(data: MarketData): Promise<FactorCandidate | null> {
    const volumes = Object.entries(data.volumes);
    if (volumes.length < 10) return null;
    
    const volumeScores: Record<string, number> = {};
    
    for (const [symbol, currentVolume] of volumes) {
      const historicalVolumes = this.getHistoricalVolumes(symbol, 20);
      if (historicalVolumes.length >= 20) {
        const avgVolume = historicalVolumes.reduce((sum, vol) => sum + vol, 0) / historicalVolumes.length;
        const volumeRatio = currentVolume / avgVolume;
        volumeScores[symbol] = Math.log(volumeRatio);
      }
    }
    
    if (Object.keys(volumeScores).length === 0) return null;
    
    const scores = Object.values(volumeScores);
    const zScore = this.calculateZScore(scores);
    
    return {
      id: `volume_${Date.now()}`,
      name: 'Volume Anomaly',
      description: 'Abnormal volume factor',
      type: 'cross_sectional',
      formula: 'log(volume_t / avg_volume_20d)',
      dataRequirements: ['daily_volume'],
      zScore,
      significance: this.calculateSignificance(scores),
      noveltyScore: await this.calculateNoveltyScore('liquidity', volumeScores),
      crowdingRisk: this.calculateCrowdingRisk('liquidity'),
      halfLife: 3,
      regimeStability: {}
    };
  }

  private async createFundamentalFactors(data: MarketData): Promise<FactorCandidate[]> {
    const factors: FactorCandidate[] = [];
    const fundamentals = data.fundamentals;
    
    // PE ratio factor
    if (fundamentals.pe_ratios) {
      const peScores = Object.entries(fundamentals.pe_ratios)
        .reduce((acc, [symbol, pe]) => {
          if (typeof pe === 'number' && pe > 0) {
            acc[symbol] = -Math.log(pe); // Low PE = high score
          }
          return acc;
        }, {} as Record<string, number>);
      
      if (Object.keys(peScores).length > 10) {
        const scores = Object.values(peScores);
        factors.push({
          id: `pe_value_${Date.now()}`,
          name: 'PE Value Factor',
          description: 'Inverse PE ratio factor',
          type: 'cross_sectional',
          formula: '-log(pe_ratio)',
          dataRequirements: ['pe_ratios'],
          zScore: this.calculateZScore(scores),
          significance: this.calculateSignificance(scores),
          noveltyScore: await this.calculateNoveltyScore('value', peScores),
          crowdingRisk: this.calculateCrowdingRisk('value'),
          halfLife: 180,
          regimeStability: {}
        });
      }
    }
    
    return factors;
  }

  private async createVolatilityRegimeFactor(): Promise<FactorCandidate | null> {
    if (this.marketDataHistory.length < 100) return null;
    
    // Calculate rolling volatility
    const volatilities: number[] = [];
    for (let i = 20; i < this.marketDataHistory.length; i++) {
      const recentPrices = this.marketDataHistory.slice(i - 20, i).map(d => 
        Object.values(d.prices)[0] || 100
      );
      const returns = [];
      for (let j = 1; j < recentPrices.length; j++) {
        returns.push((recentPrices[j] - recentPrices[j - 1]) / recentPrices[j - 1]);
      }
      const vol = Math.sqrt(returns.reduce((sum, ret) => sum + ret * ret, 0) / returns.length);
      volatilities.push(vol);
    }
    
    // Detect volatility regime changes
    const currentVol = volatilities[volatilities.length - 1];
    const historicalMedianVol = this.median(volatilities.slice(0, -30));
    
    const volRegimeScore = (currentVol - historicalMedianVol) / historicalMedianVol;
    
    return {
      id: `vol_regime_${Date.now()}`,
      name: 'Volatility Regime Factor',
      description: 'Volatility regime change detector',
      type: 'time_series',
      formula: '(current_vol - median_vol) / median_vol',
      dataRequirements: ['daily_prices'],
      zScore: Math.abs(volRegimeScore) * 2, // Simplified z-score
      significance: 0.8,
      noveltyScore: 0.9, // High novelty for regime factors
      crowdingRisk: 0.2,
      halfLife: 30,
      regimeStability: {}
    };
  }

  private async createCorrelationBreakdownFactor(): Promise<FactorCandidate | null> {
    if (this.marketDataHistory.length < 60) return null;
    
    // Calculate rolling correlation breakdown
    // This is a simplified version
    const correlationBreakdown = this.calculateCorrelationBreakdown();
    
    return {
      id: `corr_breakdown_${Date.now()}`,
      name: 'Correlation Breakdown Factor',
      description: 'Cross-asset correlation breakdown signal',
      type: 'time_series',
      formula: 'rolling_correlation_change',
      dataRequirements: ['cross_asset_prices'],
      zScore: Math.abs(correlationBreakdown) * 1.5,
      significance: 0.7,
      noveltyScore: 0.8,
      crowdingRisk: 0.3,
      halfLife: 20,
      regimeStability: {}
    };
  }

  private async createSentimentFactor(data: MarketData): Promise<FactorCandidate | null> {
    const sentimentData = data.alternativeData?.sentiment;
    if (!sentimentData) return null;
    
    // Simple sentiment scoring
    const sentimentScores: Record<string, number> = {};
    
    for (const [symbol, sentiment] of Object.entries(sentimentData)) {
      if (typeof sentiment === 'number') {
        sentimentScores[symbol] = sentiment;
      }
    }
    
    if (Object.keys(sentimentScores).length < 5) return null;
    
    const scores = Object.values(sentimentScores);
    
    return {
      id: `sentiment_${Date.now()}`,
      name: 'News Sentiment Factor',
      description: 'News sentiment derived factor',
      type: 'cross_sectional',
      formula: 'aggregated_news_sentiment',
      dataRequirements: ['news_sentiment'],
      zScore: this.calculateZScore(scores),
      significance: this.calculateSignificance(scores),
      noveltyScore: await this.calculateNoveltyScore('sentiment', sentimentScores),
      crowdingRisk: 0.4,
      halfLife: 5,
      regimeStability: {}
    };
  }

  private async createSatelliteFactor(data: MarketData): Promise<FactorCandidate | null> {
    // Placeholder for satellite data factors
    return {
      id: `satellite_${Date.now()}`,
      name: 'Satellite Data Factor',
      description: 'Economic activity from satellite imagery',
      type: 'cross_sectional',
      formula: 'satellite_economic_activity',
      dataRequirements: ['satellite_imagery'],
      zScore: 1.5,
      significance: 0.6,
      noveltyScore: 0.95, // Very novel
      crowdingRisk: 0.1, // Low crowding
      halfLife: 60,
      regimeStability: {}
    };
  }

  private async evaluateAndPublishFactor(factor: FactorCandidate): Promise<void> {
    // Apply filters for factor quality
    if (factor.zScore < 1.0 || factor.significance < 0.3) {
      return; // Skip low-quality factors
    }
    
    // Check for novelty
    if (factor.noveltyScore < 0.3) {
      return; // Skip highly crowded factors
    }
    
    // Add to library
    this.factorLibrary.push(factor);
    
    // Store in knowledge graph
    const factorEntity = this.knowledgeGraph.addEntity(
      EntityType.FACTOR,
      {
        name: factor.name,
        type: factor.type,
        formula: factor.formula,
        zScore: factor.zScore,
        noveltyScore: factor.noveltyScore,
        crowdingRisk: factor.crowdingRisk,
        halfLife: factor.halfLife
      },
      await this.generateEmbedding(`${factor.name} ${factor.description} ${factor.formula}`)
    );
    
    // Publish factor candidate event
    await this.publishEvent(
      EventTypes.FACTOR_CANDIDATE,
      {
        factorId: factor.id,
        factorEntityId: factorEntity.id,
        factor: factor
      },
      {
        noveltyScore: factor.noveltyScore,
        significance: factor.significance,
        crowdingRisk: factor.crowdingRisk
      }
    );
    
    console.log(`${this.config.name}: Discovered new factor: ${factor.name} (novelty: ${factor.noveltyScore.toFixed(3)})`);
  }

  private getHistoricalPrices(symbol: string, days: number): number[] {
    return this.marketDataHistory
      .slice(-days)
      .map(data => data.prices[symbol])
      .filter(price => price !== undefined);
  }

  private getHistoricalVolumes(symbol: string, days: number): number[] {
    return this.marketDataHistory
      .slice(-days)
      .map(data => data.volumes[symbol])
      .filter(volume => volume !== undefined);
  }

  private calculateZScore(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev === 0 ? 0 : Math.abs(mean) / stdDev;
  }

  private calculateSignificance(values: number[]): number {
    // Simple significance calculation based on t-statistic
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1);
    const stdError = Math.sqrt(variance / values.length);
    
    const tStat = stdError === 0 ? 0 : Math.abs(mean) / stdError;
    
    // Convert t-statistic to rough significance (0-1)
    return Math.min(tStat / 3, 1);
  }

  private async calculateNoveltyScore(
    factorFamily: string,
    factorScores: Record<string, number>
  ): Promise<number> {
    // Compare with known factors in the same family
    const knownFactors = this.knownFactorFamilies[factorFamily as keyof typeof this.knownFactorFamilies] || [];
    
    if (knownFactors.length === 0) return 0.9; // High novelty for new families
    
    // In production, would use embedding similarity or correlation analysis
    // For now, use a simple heuristic
    const baseNovelty = Math.random() * 0.4 + 0.3; // 0.3-0.7 range
    
    // Penalize if factor family is well-known
    const familyPenalty = knownFactors.length * 0.05;
    
    return Math.max(0.1, baseNovelty - familyPenalty);
  }

  private calculateCrowdingRisk(factorFamily: string): number {
    // Estimate crowding risk based on factor family popularity
    const crowdingRisks = {
      momentum: 0.8,
      value: 0.9,
      quality: 0.6,
      size: 0.7,
      volatility: 0.5,
      liquidity: 0.4
    };
    
    return crowdingRisks[factorFamily as keyof typeof crowdingRisks] || 0.5;
  }

  private async calculateRegimeStability(
    factor: FactorCandidate,
    regime: string
  ): Promise<number> {
    // Calculate how stable the factor is in different regimes
    // This is a placeholder - in production, would use historical analysis
    return Math.random() * 0.5 + 0.5; // 0.5-1.0 range
  }

  private calculateCorrelationBreakdown(): number {
    // Simplified correlation breakdown calculation
    if (this.marketDataHistory.length < 60) return 0;
    
    const recentCorr = this.calculateAverageCorrelation(-30);
    const historicalCorr = this.calculateAverageCorrelation(-60, -30);
    
    return recentCorr - historicalCorr;
  }

  private calculateAverageCorrelation(startOffset: number, endOffset: number = 0): number {
    const relevantData = endOffset === 0 
      ? this.marketDataHistory.slice(startOffset)
      : this.marketDataHistory.slice(startOffset, endOffset);
    
    if (relevantData.length < 2) return 0;
    
    // Simplified correlation calculation
    return Math.random() * 0.4 + 0.3; // Placeholder
  }

  private median(values: number[]): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  private async seedBasicFactors(): Promise<void> {
    // Seed with some basic factors for demonstration
    const basicFactors: FactorCandidate[] = [
      {
        id: 'momentum_20d',
        name: 'Price Momentum 20D',
        description: '20-day price momentum',
        type: 'cross_sectional',
        formula: '(price_t / price_t-20) - 1',
        dataRequirements: ['daily_prices'],
        zScore: 2.1,
        significance: 0.7,
        noveltyScore: 0.4,
        crowdingRisk: 0.8,
        halfLife: 15,
        regimeStability: {}
      }
    ];
    
    for (const factor of basicFactors) {
      this.factorLibrary.push(factor);
    }
    
    console.log(`${this.config.name}: Seeded ${basicFactors.length} basic factors`);
  }

  /**
   * Get current factor library
   */
  getFactorLibrary(): FactorCandidate[] {
    return [...this.factorLibrary];
  }
}