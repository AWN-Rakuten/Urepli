/**
 * Strategy Domain Specific Language (DSL)
 * Defines machine-operable and LLM-editable strategy components
 */

export interface StrategyNode {
  id: string;
  type: string;
  name: string;
  description?: string;
  parameters: Record<string, any>;
  inputs?: string[];
  outputs?: string[];
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  components: {
    universe: UniverseSelector;
    signals: SignalBlock[];
    features: FeatureTransform[];
    positionSizer: PositionSizer;
    riskOverlays: RiskOverlay[];
    execution: ExecutionPlan;
  };
  metadata: {
    created: Date;
    lastModified: Date;
    author: string;
    version: string;
    tags: string[];
  };
}

// Universe Selection
export interface UniverseSelector extends StrategyNode {
  type: 'universe_selector';
  parameters: {
    assetClasses: string[];
    marketCap?: { min?: number; max?: number };
    volume?: { min?: number; max?: number };
    sectors?: string[];
    regions?: string[];
    excludeList?: string[];
    dynamicFilters?: {
      name: string;
      condition: string;
      value: any;
    }[];
  };
}

// Signal Generation
export interface SignalBlock extends StrategyNode {
  type: 'signal_block';
  signalType: 
    | 'rolling_zscore'
    | 'microstructure_imbalance'
    | 'sentiment_divergence'
    | 'momentum'
    | 'mean_reversion'
    | 'pairs_trading'
    | 'statistical_arbitrage'
    | 'custom';
  parameters: {
    lookbackPeriod?: number;
    threshold?: number;
    decay?: number;
    [key: string]: any;
  };
}

// Rolling Z-Score Signal
export interface RollingZScoreSignal extends SignalBlock {
  signalType: 'rolling_zscore';
  parameters: {
    lookbackPeriod: number;
    factor: string;
    threshold: number;
    neutralization?: 'sector' | 'market' | 'none';
  };
}

// Microstructure Imbalance Signal
export interface MicrostructureImbalanceSignal extends SignalBlock {
  signalType: 'microstructure_imbalance';
  parameters: {
    timeWindow: number; // milliseconds
    volumeThreshold: number;
    priceImpactThreshold: number;
    orderBookDepth: number;
  };
}

// Sentiment Divergence Signal
export interface SentimentDivergenceSignal extends SignalBlock {
  signalType: 'sentiment_divergence';
  parameters: {
    sentimentSources: string[];
    positioningMetrics: string[];
    divergenceThreshold: number;
    halfLife: number; // decay rate
  };
}

// Feature Transformations
export interface FeatureTransform extends StrategyNode {
  type: 'feature_transform';
  transformType:
    | 'regime_conditional'
    | 'vol_adjust'
    | 'rank'
    | 'winsorize'
    | 'standardize'
    | 'custom';
}

export interface RegimeConditionalTransform extends FeatureTransform {
  transformType: 'regime_conditional';
  parameters: {
    regimeClassifier: string;
    regimeSpecificTransforms: Record<string, any>;
  };
}

export interface VolAdjustTransform extends FeatureTransform {
  transformType: 'vol_adjust';
  parameters: {
    volEstimator: 'ewma' | 'garch' | 'realized';
    halfLife?: number;
    targetVol?: number;
  };
}

// Position Sizing
export interface PositionSizer extends StrategyNode {
  type: 'position_sizer';
  sizingType:
    | 'kelly_fraction_capped'
    | 'impact_aware'
    | 'risk_parity'
    | 'equal_weight'
    | 'optimization_based';
}

export interface KellyFractionCappedSizer extends PositionSizer {
  sizingType: 'kelly_fraction_capped';
  parameters: {
    maxPosition: number; // as fraction of portfolio
    confidenceInterval: number; // e.g., 0.95
    lookbackPeriod: number;
  };
}

export interface ImpactAwareSizer extends PositionSizer {
  sizingType: 'impact_aware';
  parameters: {
    impactModel: string;
    maxImpact: number; // bps
    participationRate: number;
    urgency: number; // 0-1 scale
  };
}

// Risk Overlays
export interface RiskOverlay extends StrategyNode {
  type: 'risk_overlay';
  riskType:
    | 'max_sector_exposure'
    | 'drawdown_circuit_breaker'
    | 'leverage_limit'
    | 'var_limit'
    | 'correlation_limit';
}

export interface MaxSectorExposureOverlay extends RiskOverlay {
  riskType: 'max_sector_exposure';
  parameters: {
    maxExposure: Record<string, number>; // sector -> max weight
    rebalanceThreshold: number;
  };
}

export interface DrawdownCircuitBreakerOverlay extends RiskOverlay {
  riskType: 'drawdown_circuit_breaker';
  parameters: {
    maxDrawdown: number; // percentage
    recoveryThreshold: number; // percentage
    shutdownDuration: number; // hours
  };
}

// Execution Plans
export interface ExecutionPlan extends StrategyNode {
  type: 'execution_plan';
  executionType:
    | 'twap_adaptive'
    | 'liquidity_slicer'
    | 'venue_router'
    | 'dark_pool'
    | 'iceberg';
}

export interface TWAPAdaptiveExecution extends ExecutionPlan {
  executionType: 'twap_adaptive';
  parameters: {
    timeHorizon: number; // minutes
    adaptationRate: number; // 0-1
    minOrderSize: number;
    maxOrderSize: number;
    venuePreferences: string[];
  };
}

export interface LiquiditySlicerExecution extends ExecutionPlan {
  executionType: 'liquidity_slicer';
  parameters: {
    maxParticipationRate: number; // 0-1
    liquidityThreshold: number;
    sliceSize: number;
    adaptiveSlicing: boolean;
  };
}

// Strategy Validation and Compilation
export class StrategyValidator {
  /**
   * Validate strategy structure and parameters
   */
  static validate(strategy: Strategy): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required components check
    if (!strategy.components.universe) {
      errors.push('Universe selector is required');
    }
    
    if (!strategy.components.signals || strategy.components.signals.length === 0) {
      errors.push('At least one signal block is required');
    }
    
    if (!strategy.components.positionSizer) {
      errors.push('Position sizer is required');
    }
    
    if (!strategy.components.execution) {
      errors.push('Execution plan is required');
    }

    // Parameter validation
    for (const signal of strategy.components.signals) {
      if (signal.signalType === 'rolling_zscore') {
        const params = signal.parameters as RollingZScoreSignal['parameters'];
        if (!params.lookbackPeriod || params.lookbackPeriod <= 0) {
          errors.push(`Invalid lookback period for signal ${signal.id}`);
        }
        if (!params.threshold || params.threshold <= 0) {
          errors.push(`Invalid threshold for signal ${signal.id}`);
        }
      }
    }

    // Risk overlay validation
    for (const overlay of strategy.components.riskOverlays) {
      if (overlay.riskType === 'max_sector_exposure') {
        const params = overlay.parameters as MaxSectorExposureOverlay['parameters'];
        for (const [sector, weight] of Object.entries(params.maxExposure)) {
          if (weight < 0 || weight > 1) {
            errors.push(`Invalid sector exposure for ${sector}: must be between 0 and 1`);
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate complexity score for strategy
   */
  static calculateComplexity(strategy: Strategy): number {
    let complexity = 0;
    
    // Base complexity for each component
    complexity += 1; // universe selector
    complexity += strategy.components.signals.length * 2; // signals
    complexity += strategy.components.features.length * 1.5; // features
    complexity += 1; // position sizer
    complexity += strategy.components.riskOverlays.length; // risk overlays
    complexity += 1; // execution

    // Additional complexity for parameter counts
    const getTotalParams = (node: StrategyNode) => {
      return Object.keys(node.parameters).length;
    };

    complexity += getTotalParams(strategy.components.universe) * 0.1;
    complexity += strategy.components.signals.reduce((sum, signal) => 
      sum + getTotalParams(signal) * 0.2, 0);
    complexity += strategy.components.features.reduce((sum, feature) => 
      sum + getTotalParams(feature) * 0.15, 0);
    complexity += getTotalParams(strategy.components.positionSizer) * 0.1;
    complexity += strategy.components.riskOverlays.reduce((sum, overlay) => 
      sum + getTotalParams(overlay) * 0.1, 0);
    complexity += getTotalParams(strategy.components.execution) * 0.1;

    return Math.round(complexity * 100) / 100;
  }
}

// Strategy Serialization
export class StrategySerializer {
  /**
   * Convert strategy to JSON
   */
  static toJSON(strategy: Strategy): string {
    return JSON.stringify(strategy, null, 2);
  }

  /**
   * Load strategy from JSON
   */
  static fromJSON(json: string): Strategy {
    return JSON.parse(json);
  }

  /**
   * Convert strategy to human-readable description
   */
  static toDescription(strategy: Strategy): string {
    const parts: string[] = [];
    
    parts.push(`Strategy: ${strategy.name}`);
    parts.push(`Description: ${strategy.description}`);
    
    // Universe
    const universe = strategy.components.universe;
    parts.push(`Universe: ${universe.parameters.assetClasses.join(', ')}`);
    
    // Signals
    parts.push(`Signals (${strategy.components.signals.length}):`);
    for (const signal of strategy.components.signals) {
      parts.push(`  - ${signal.signalType}: ${signal.name}`);
    }
    
    // Position sizing
    parts.push(`Position Sizing: ${strategy.components.positionSizer.sizingType}`);
    
    // Risk overlays
    if (strategy.components.riskOverlays.length > 0) {
      parts.push(`Risk Overlays (${strategy.components.riskOverlays.length}):`);
      for (const overlay of strategy.components.riskOverlays) {
        parts.push(`  - ${overlay.riskType}`);
      }
    }
    
    // Execution
    parts.push(`Execution: ${strategy.components.execution.executionType}`);
    
    return parts.join('\n');
  }

  /**
   * Generate strategy hash for uniqueness checking
   */
  static generateHash(strategy: Strategy): string {
    // Create a canonical representation for hashing
    const canonical = {
      universe: strategy.components.universe.parameters,
      signals: strategy.components.signals.map(s => ({
        type: s.signalType,
        params: s.parameters
      })),
      features: strategy.components.features.map(f => ({
        type: f.transformType,
        params: f.parameters
      })),
      positionSizer: {
        type: strategy.components.positionSizer.sizingType,
        params: strategy.components.positionSizer.parameters
      },
      riskOverlays: strategy.components.riskOverlays.map(r => ({
        type: r.riskType,
        params: r.parameters
      })),
      execution: {
        type: strategy.components.execution.executionType,
        params: strategy.components.execution.parameters
      }
    };

    // Simple hash function (in production, use crypto.createHash)
    const str = JSON.stringify(canonical);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
}