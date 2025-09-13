import { Strategy } from '../dsl/strategy-nodes';
import { knowledgeGraph, EntityType } from '../infra/knowledge-graph';

export interface OriginalityMetrics {
  innovationDistance: number; // 0-1, semantic distance from library
  fragmentationIndex: number; // 0-1, probability strategy falls below Sharpe threshold
  informationHalfLife: number; // days until rolling IR decays 50%
  stressResilienceScore: number; // normalized average rank across scenarios
  complexityPenalty: number; // MDL of factor graph
  driftSensitivity: number; // gradient of performance vs regime transition
  adversarialGap: number; // performance drop under synthetic attacks
  crowdingRisk: number; // similarity to public factor taxonomies
}

export interface NoveltyVector {
  semanticEmbedding: number[];
  transformationPath: string[];
  factorFamily: string;
  dataRequirements: string[];
  timeHorizon: string;
  marketRegime: string;
}

/**
 * Originality and Crowding Auditor
 * Calculates innovation distance and detects factor crowd replication
 */
export class OriginalityAuditor {
  private readonly publicFactorLibrary: Map<string, NoveltyVector> = new Map();
  private readonly internalFactorLibrary: Map<string, NoveltyVector> = new Map();
  
  constructor() {
    this.initializePublicFactors();
  }

  /**
   * Estimate innovation distance for a strategy
   */
  async estimateInnovationDistance(strategy: Strategy): Promise<number> {
    const noveltyVector = await this.extractNoveltyVector(strategy);
    
    // Calculate distances to existing factors
    const internalDistance = this.calculateMinDistance(noveltyVector, this.internalFactorLibrary);
    const publicDistance = this.calculateMinDistance(noveltyVector, this.publicFactorLibrary);
    
    // Combined innovation distance with higher weight on avoiding internal duplication
    const combinedDistance = Math.min(internalDistance * 0.7 + publicDistance * 0.3, 1.0);
    
    // Apply complexity penalty
    const complexityPenalty = this.calculateComplexityPenalty(strategy);
    
    // Apply novelty bonus for alternative data usage
    const altDataBonus = this.calculateAltDataBonus(strategy);
    
    const finalDistance = Math.max(0, Math.min(1, 
      combinedDistance - complexityPenalty + altDataBonus
    ));
    
    // Store in internal library for future comparisons
    this.internalFactorLibrary.set(strategy.id, noveltyVector);
    
    return finalDistance;
  }

  /**
   * Calculate crowding risk score
   */
  calculateCrowdingRisk(strategy: Strategy): number {
    const noveltyVector = this.extractNoveltyVectorSync(strategy);
    
    // Find similar factors in public library
    const similarFactors = this.findSimilarFactors(noveltyVector, this.publicFactorLibrary, 0.7);
    
    // Base crowding risk from factor family popularity
    const familyRisk = this.getFactorFamilyRisk(noveltyVector.factorFamily);
    
    // Similarity-based crowding risk
    const similarityRisk = Math.min(0.9, similarFactors.length * 0.15);
    
    // Data availability risk (more available = more crowded)
    const dataRisk = this.getDataAvailabilityRisk(noveltyVector.dataRequirements);
    
    return Math.max(0.1, Math.min(0.95, familyRisk + similarityRisk + dataRisk));
  }

  /**
   * Calculate fragility index (Bayesian estimate of strategy fragility)
   */
  calculateFragilityIndex(strategy: Strategy, historicalPerformance?: any[]): number {
    let fragility = 0;
    
    // Complexity-based fragility
    const complexity = this.calculateStrategyComplexity(strategy);
    fragility += Math.min(0.3, complexity / 15);
    
    // Parameter count fragility
    const paramCount = this.countParameters(strategy);
    fragility += Math.min(0.2, paramCount / 50);
    
    // Factor concentration fragility
    const concentration = this.calculateFactorConcentration(strategy);
    fragility += concentration * 0.2;
    
    // Data dependency fragility
    const dataDeps = this.calculateDataDependencies(strategy);
    fragility += dataDeps * 0.15;
    
    // Historical performance fragility (if available)
    if (historicalPerformance && historicalPerformance.length > 0) {
      const performanceFragility = this.calculatePerformanceFragility(historicalPerformance);
      fragility += performanceFragility * 0.15;
    }
    
    return Math.min(1, fragility);
  }

  /**
   * Calculate information half-life estimate
   */
  estimateInformationHalfLife(strategy: Strategy, factorMetrics?: any): number {
    // Default half-life based on strategy characteristics
    let halfLife = 30; // days
    
    // Adjust based on signal types
    for (const signal of strategy.components.signals) {
      switch (signal.signalType) {
        case 'microstructure_imbalance':
          halfLife = Math.min(halfLife, 3); // Very short for microstructure
          break;
        case 'sentiment_divergence':
          halfLife = Math.min(halfLife, 7); // Short for sentiment
          break;
        case 'momentum':
          halfLife = Math.min(halfLife, 15); // Medium for momentum
          break;
        case 'mean_reversion':
          halfLife = Math.min(halfLife, 10); // Short-medium for reversion
          break;
        case 'statistical_arbitrage':
          halfLife = Math.min(halfLife, 5); // Short for stat arb
          break;
        default:
          halfLife = Math.min(halfLife, 20);
      }
    }
    
    // Adjust for universe size (smaller universe = shorter half-life)
    const universeComplexity = this.calculateUniverseComplexity(strategy.components.universe);
    halfLife *= Math.max(0.5, universeComplexity);
    
    // Adjust for alternative data (longer half-life for novel data)
    const altDataFactor = this.calculateAltDataFactor(strategy);
    halfLife *= (1 + altDataFactor * 0.5);
    
    // Adjust for factor novelty (more novel = longer half-life)
    const noveltyFactor = Math.max(0.5, this.extractNoveltyVectorSync(strategy).factorFamily === 'custom' ? 1.2 : 0.8);
    halfLife *= noveltyFactor;
    
    return Math.max(1, Math.round(halfLife));
  }

  /**
   * Calculate stress resilience score
   */
  calculateStressResilience(strategy: Strategy, stressScenarios?: any[]): number {
    // Base resilience from strategy design
    let resilience = 0.5;
    
    // Risk overlay bonus
    const riskOverlays = strategy.components.riskOverlays;
    resilience += Math.min(0.2, riskOverlays.length * 0.05);
    
    // Drawdown control bonus
    const hasDrawdownControl = riskOverlays.some(overlay => 
      overlay.riskType === 'drawdown_circuit_breaker'
    );
    if (hasDrawdownControl) {
      resilience += 0.1;
    }
    
    // Diversification bonus
    const diversification = this.calculateDiversification(strategy);
    resilience += diversification * 0.15;
    
    // Position sizing conservatism bonus
    const conservatism = this.calculatePositionSizingConservatism(strategy);
    resilience += conservatism * 0.1;
    
    // Regime adaptability bonus
    const adaptability = this.calculateRegimeAdaptability(strategy);
    resilience += adaptability * 0.1;
    
    // Stress scenario performance (if available)
    if (stressScenarios && stressScenarios.length > 0) {
      const stressPerformance = this.calculateStressPerformance(stressScenarios);
      resilience = resilience * 0.7 + stressPerformance * 0.3;
    }
    
    return Math.max(0.1, Math.min(1, resilience));
  }

  /**
   * Extract novelty vector from strategy
   */
  private async extractNoveltyVector(strategy: Strategy): Promise<NoveltyVector> {
    const description = this.createStrategyDescription(strategy);
    const embedding = await this.generateEmbedding(description);
    
    return {
      semanticEmbedding: embedding || this.generateSimpleEmbedding(description),
      transformationPath: this.extractTransformationPath(strategy),
      factorFamily: this.classifyFactorFamily(strategy),
      dataRequirements: this.extractDataRequirements(strategy),
      timeHorizon: this.extractTimeHorizon(strategy),
      marketRegime: this.extractMarketRegime(strategy)
    };
  }

  private extractNoveltyVectorSync(strategy: Strategy): NoveltyVector {
    const description = this.createStrategyDescription(strategy);
    
    return {
      semanticEmbedding: this.generateSimpleEmbedding(description),
      transformationPath: this.extractTransformationPath(strategy),
      factorFamily: this.classifyFactorFamily(strategy),
      dataRequirements: this.extractDataRequirements(strategy),
      timeHorizon: this.extractTimeHorizon(strategy),
      marketRegime: this.extractMarketRegime(strategy)
    };
  }

  private calculateMinDistance(
    noveltyVector: NoveltyVector,
    library: Map<string, NoveltyVector>
  ): number {
    if (library.size === 0) return 1.0;
    
    let minDistance = 1.0;
    
    for (const existingVector of library.values()) {
      const distance = this.calculateVectorDistance(noveltyVector, existingVector);
      minDistance = Math.min(minDistance, distance);
    }
    
    return minDistance;
  }

  private calculateVectorDistance(v1: NoveltyVector, v2: NoveltyVector): number {
    // Semantic embedding distance (cosine similarity)
    const semanticDistance = 1 - this.cosineSimilarity(v1.semanticEmbedding, v2.semanticEmbedding);
    
    // Factor family distance
    const familyDistance = v1.factorFamily === v2.factorFamily ? 0 : 1;
    
    // Data requirements overlap
    const dataOverlap = this.calculateSetOverlap(v1.dataRequirements, v2.dataRequirements);
    const dataDistance = 1 - dataOverlap;
    
    // Time horizon distance
    const timeDistance = v1.timeHorizon === v2.timeHorizon ? 0 : 0.5;
    
    // Transformation path similarity
    const pathOverlap = this.calculateSetOverlap(v1.transformationPath, v2.transformationPath);
    const pathDistance = 1 - pathOverlap;
    
    // Weighted combination
    return (
      semanticDistance * 0.4 +
      familyDistance * 0.2 +
      dataDistance * 0.2 +
      pathDistance * 0.1 +
      timeDistance * 0.1
    );
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private calculateSetOverlap(set1: string[], set2: string[]): number {
    if (set1.length === 0 && set2.length === 0) return 1;
    if (set1.length === 0 || set2.length === 0) return 0;
    
    const intersection = set1.filter(item => set2.includes(item));
    const union = new Set([...set1, ...set2]);
    
    return intersection.length / union.size;
  }

  private createStrategyDescription(strategy: Strategy): string {
    const signals = strategy.components.signals.map(s => s.signalType).join(' ');
    const universe = strategy.components.universe.parameters.assetClasses.join(' ');
    const sizer = strategy.components.positionSizer.sizingType;
    
    return `${strategy.name} ${strategy.description} ${signals} ${universe} ${sizer}`.toLowerCase();
  }

  private generateEmbedding(text: string): Promise<number[] | null> {
    // In production, use actual embedding service
    return Promise.resolve(null);
  }

  private generateSimpleEmbedding(text: string): number[] {
    // Simple hash-based embedding for fallback
    const embedding = new Array(128).fill(0);
    const words = text.toLowerCase().split(/\s+/);
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const hash = this.hashString(word);
      
      for (let j = 0; j < 128; j++) {
        embedding[j] += Math.sin((hash + j) * 0.01) * (1 / Math.sqrt(words.length));
      }
    }
    
    // Normalize
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / (norm || 1));
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private extractTransformationPath(strategy: Strategy): string[] {
    const path: string[] = [];
    
    // Add feature transformations
    for (const feature of strategy.components.features) {
      path.push(feature.transformType);
    }
    
    // Add signal transformations
    for (const signal of strategy.components.signals) {
      path.push(signal.signalType);
    }
    
    // Add position sizing
    path.push(strategy.components.positionSizer.sizingType);
    
    return path;
  }

  private classifyFactorFamily(strategy: Strategy): string {
    const signals = strategy.components.signals;
    
    if (signals.some(s => s.signalType.includes('momentum'))) return 'momentum';
    if (signals.some(s => s.signalType.includes('reversion'))) return 'mean_reversion';
    if (signals.some(s => s.signalType.includes('sentiment'))) return 'sentiment';
    if (signals.some(s => s.signalType.includes('microstructure'))) return 'microstructure';
    if (signals.some(s => s.signalType.includes('statistical'))) return 'statistical_arbitrage';
    
    return 'custom';
  }

  private extractDataRequirements(strategy: Strategy): string[] {
    const requirements: Set<string> = new Set();
    
    // Add universe requirements
    requirements.add('prices');
    if (strategy.components.universe.parameters.volume) {
      requirements.add('volume');
    }
    
    // Add signal requirements
    for (const signal of strategy.components.signals) {
      if (signal.parameters.factor) {
        requirements.add('factor_data');
      }
      if (signal.signalType.includes('sentiment')) {
        requirements.add('sentiment_data');
      }
      if (signal.signalType.includes('microstructure')) {
        requirements.add('order_book');
      }
    }
    
    return Array.from(requirements);
  }

  private extractTimeHorizon(strategy: Strategy): string {
    // Analyze signals to determine time horizon
    let minHorizon = Infinity;
    
    for (const signal of strategy.components.signals) {
      const horizon = signal.parameters.lookbackPeriod || 20;
      minHorizon = Math.min(minHorizon, horizon);
    }
    
    if (minHorizon <= 5) return 'intraday';
    if (minHorizon <= 20) return 'short_term';
    if (minHorizon <= 60) return 'medium_term';
    return 'long_term';
  }

  private extractMarketRegime(strategy: Strategy): string {
    // Default to 'any' - in production, would analyze strategy characteristics
    return 'any';
  }

  private findSimilarFactors(
    noveltyVector: NoveltyVector,
    library: Map<string, NoveltyVector>,
    threshold: number
  ): string[] {
    const similar: string[] = [];
    
    for (const [id, vector] of library.entries()) {
      const distance = this.calculateVectorDistance(noveltyVector, vector);
      if (distance < (1 - threshold)) {
        similar.push(id);
      }
    }
    
    return similar;
  }

  private getFactorFamilyRisk(factorFamily: string): number {
    const risks = {
      momentum: 0.8,
      mean_reversion: 0.7,
      value: 0.9,
      sentiment: 0.6,
      microstructure: 0.4,
      statistical_arbitrage: 0.5,
      custom: 0.2
    };
    
    return risks[factorFamily as keyof typeof risks] || 0.5;
  }

  private getDataAvailabilityRisk(dataRequirements: string[]): number {
    const availabilityRisks = {
      prices: 0.9,
      volume: 0.8,
      factor_data: 0.7,
      sentiment_data: 0.4,
      order_book: 0.3,
      satellite_data: 0.1
    };
    
    let totalRisk = 0;
    for (const req of dataRequirements) {
      totalRisk += availabilityRisks[req as keyof typeof availabilityRisks] || 0.5;
    }
    
    return Math.min(0.9, totalRisk / dataRequirements.length);
  }

  private calculateComplexityPenalty(strategy: Strategy): number {
    const complexity = this.calculateStrategyComplexity(strategy);
    return Math.min(0.2, complexity / 25); // Max 20% penalty
  }

  private calculateStrategyComplexity(strategy: Strategy): number {
    let complexity = 0;
    
    complexity += strategy.components.signals.length * 2;
    complexity += strategy.components.features.length * 1.5;
    complexity += strategy.components.riskOverlays.length;
    
    // Parameter complexity
    const paramCount = this.countParameters(strategy);
    complexity += paramCount * 0.1;
    
    return complexity;
  }

  private countParameters(strategy: Strategy): number {
    let count = 0;
    
    count += Object.keys(strategy.components.universe.parameters).length;
    count += strategy.components.signals.reduce((sum, s) => sum + Object.keys(s.parameters).length, 0);
    count += strategy.components.features.reduce((sum, f) => sum + Object.keys(f.parameters).length, 0);
    count += Object.keys(strategy.components.positionSizer.parameters).length;
    count += strategy.components.riskOverlays.reduce((sum, r) => sum + Object.keys(r.parameters).length, 0);
    count += Object.keys(strategy.components.execution.parameters).length;
    
    return count;
  }

  private calculateAltDataBonus(strategy: Strategy): number {
    const dataReqs = this.extractDataRequirements(strategy);
    const altDataTypes = ['sentiment_data', 'satellite_data', 'order_book'];
    
    const altDataCount = dataReqs.filter(req => altDataTypes.includes(req)).length;
    return Math.min(0.15, altDataCount * 0.05); // Max 15% bonus
  }

  private calculateAltDataFactor(strategy: Strategy): number {
    const dataReqs = this.extractDataRequirements(strategy);
    const altDataTypes = ['sentiment_data', 'satellite_data', 'order_book'];
    
    const altDataCount = dataReqs.filter(req => altDataTypes.includes(req)).length;
    return altDataCount / dataReqs.length;
  }

  private calculateUniverseComplexity(universe: any): number {
    let complexity = 0.5;
    
    if (universe.parameters.assetClasses.length > 1) complexity += 0.2;
    if (universe.parameters.sectors && universe.parameters.sectors.length > 5) complexity += 0.2;
    if (universe.parameters.regions && universe.parameters.regions.length > 1) complexity += 0.1;
    
    return Math.min(1, complexity);
  }

  private calculateFactorConcentration(strategy: Strategy): number {
    const signalCount = strategy.components.signals.length;
    return signalCount === 1 ? 0.8 : Math.max(0.2, 1 / signalCount);
  }

  private calculateDataDependencies(strategy: Strategy): number {
    const dataReqs = this.extractDataRequirements(strategy);
    return Math.min(0.8, dataReqs.length * 0.1);
  }

  private calculatePerformanceFragility(performance: any[]): number {
    // Simple volatility-based fragility
    if (performance.length < 10) return 0.5;
    
    const returns = performance.map(p => p.return || 0);
    const volatility = this.calculateVolatility(returns);
    
    return Math.min(0.8, volatility * 2);
  }

  private calculateVolatility(returns: number[]): number {
    if (returns.length === 0) return 0;
    
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }

  private calculateDiversification(strategy: Strategy): number {
    const signalCount = strategy.components.signals.length;
    const featureCount = strategy.components.features.length;
    const riskOverlayCount = strategy.components.riskOverlays.length;
    
    const diversification = (signalCount + featureCount + riskOverlayCount) / 10;
    return Math.min(1, diversification);
  }

  private calculatePositionSizingConservatism(strategy: Strategy): number {
    const sizer = strategy.components.positionSizer;
    
    if (sizer.sizingType === 'kelly_fraction_capped') {
      const maxPosition = sizer.parameters.maxPosition || 0.1;
      return maxPosition <= 0.05 ? 1 : maxPosition <= 0.1 ? 0.7 : 0.3;
    }
    
    return 0.5;
  }

  private calculateRegimeAdaptability(strategy: Strategy): number {
    const hasRegimeFeatures = strategy.components.features.some(f => 
      f.transformType === 'regime_conditional'
    );
    
    return hasRegimeFeatures ? 1 : 0.3;
  }

  private calculateStressPerformance(stressScenarios: any[]): number {
    // Placeholder - would use actual stress test results
    return Math.random() * 0.6 + 0.2; // Random between 0.2-0.8
  }

  private initializePublicFactors(): void {
    // Initialize with known public factor families
    const publicFactors = [
      {
        id: 'fama_french_momentum',
        family: 'momentum',
        description: 'Fama-French momentum factor',
        dataReqs: ['prices', 'market_cap']
      },
      {
        id: 'value_pe_ratio',
        family: 'value',
        description: 'Price-to-earnings value factor',
        dataReqs: ['prices', 'earnings']
      },
      {
        id: 'size_market_cap',
        family: 'size',
        description: 'Market capitalization size factor',
        dataReqs: ['market_cap']
      }
    ];
    
    for (const factor of publicFactors) {
      this.publicFactorLibrary.set(factor.id, {
        semanticEmbedding: this.generateSimpleEmbedding(factor.description),
        transformationPath: [factor.family],
        factorFamily: factor.family,
        dataRequirements: factor.dataReqs,
        timeHorizon: 'medium_term',
        marketRegime: 'any'
      });
    }
  }

  /**
   * Get complete originality metrics for a strategy
   */
  async getOriginalityMetrics(strategy: Strategy): Promise<OriginalityMetrics> {
    return {
      innovationDistance: await this.estimateInnovationDistance(strategy),
      fragmentationIndex: this.calculateFragilityIndex(strategy),
      informationHalfLife: this.estimateInformationHalfLife(strategy),
      stressResilienceScore: this.calculateStressResilience(strategy),
      complexityPenalty: this.calculateComplexityPenalty(strategy),
      driftSensitivity: 0.5, // Placeholder
      adversarialGap: 0.3, // Placeholder
      crowdingRisk: this.calculateCrowdingRisk(strategy)
    };
  }
}

// Singleton instance
export const originalityAuditor = new OriginalityAuditor();