import { BaseAgent, AgentConfig } from '../../infra/agent-base';
import { EventTypes, Event } from '../../infra/event-bus';
import { EntityType, RelationType } from '../../infra/knowledge-graph';
import { Strategy, StrategyValidator } from '../../dsl/strategy-nodes';

export interface RiskAssessment {
  strategyId: string;
  overall: 'PASS' | 'WARN' | 'FAIL';
  riskScore: number; // 0-100
  fragility: {
    index: number; // 0-1, Bayesian fragility index
    contributors: string[];
  };
  checks: RiskCheck[];
  mitigation: string[];
  timestamp: Date;
}

export interface RiskCheck {
  name: string;
  category: 'position_size' | 'correlation' | 'drawdown' | 'leverage' | 'concentration' | 'regime_stability';
  status: 'PASS' | 'WARN' | 'FAIL';
  value: number;
  threshold: number;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface RiskLimits {
  maxPositionSize: number; // per asset
  maxSectorExposure: number; // per sector
  maxDrawdown: number; // portfolio level
  maxLeverage: number;
  maxCorrelation: number; // to existing strategies
  minLiquidity: number; // minimum liquidity requirement
  maxConcentration: number; // maximum concentration in single strategy
}

/**
 * Risk Arbiter Agent
 * Enforces multi-layer risk constraints and calculates Bayesian fragility index
 * Provides mitigation advice for risk violations
 */
export class RiskArbiterAgent extends BaseAgent {
  private readonly riskLimits: RiskLimits = {
    maxPositionSize: 0.05, // 5% per asset
    maxSectorExposure: 0.20, // 20% per sector
    maxDrawdown: 0.15, // 15% max drawdown
    maxLeverage: 2.0, // 2x leverage
    maxCorrelation: 0.7, // 70% correlation to existing strategies
    minLiquidity: 1000000, // $1M minimum daily volume
    maxConcentration: 0.25 // 25% in single strategy
  };

  private riskAssessments: Map<string, RiskAssessment> = new Map();
  private existingStrategies: Strategy[] = [];
  private currentRegime: any = null;

  protected async setupSubscriptions(): Promise<void> {
    this.subscribeToEvent(EventTypes.STRATEGY_DRAFT, this.handleStrategyDraft.bind(this));
    this.subscribeToEvent(EventTypes.STRATEGY_EVOLVED, this.handleStrategyEvolved.bind(this));
    this.subscribeToEvent(EventTypes.REGIME_STATE_CHANGE, this.handleRegimeChange.bind(this));
    this.subscribeToEvent(EventTypes.PORTFOLIO_ALLOCATION_UPDATE, this.handlePortfolioUpdate.bind(this));
  }

  protected async initialize(): Promise<void> {
    console.log(`${this.config.name}: Initialized risk management system with limits:`, this.riskLimits);
  }

  protected async cleanup(): Promise<void> {
    this.riskAssessments.clear();
    this.existingStrategies = [];
  }

  private async handleStrategyDraft(event: Event): Promise<void> {
    const { strategy, hypothesis } = event.data;
    
    const assessment = await this.assessStrategy(strategy, hypothesis);
    this.riskAssessments.set(strategy.id, assessment);
    
    // Publish risk assessment
    await this.publishRiskAssessment(assessment, strategy);
  }

  private async handleStrategyEvolved(event: Event): Promise<void> {
    const { strategy } = event.data;
    
    // Re-assess evolved strategy
    const assessment = await this.assessStrategy(strategy);
    this.riskAssessments.set(strategy.id, assessment);
    
    await this.publishRiskAssessment(assessment, strategy);
  }

  private async handleRegimeChange(event: Event): Promise<void> {
    this.currentRegime = event.data;
    
    // Re-assess all strategies in new regime context
    for (const strategy of this.existingStrategies) {
      const assessment = await this.assessStrategy(strategy);
      this.riskAssessments.set(strategy.id, assessment);
      
      // Only publish if risk level changed significantly
      const previousAssessment = this.riskAssessments.get(strategy.id);
      if (!previousAssessment || 
          Math.abs(assessment.riskScore - previousAssessment.riskScore) > 10) {
        await this.publishRiskAssessment(assessment, strategy);
      }
    }
  }

  private async handlePortfolioUpdate(event: Event): Promise<void> {
    const { allocations } = event.data;
    
    // Check portfolio-level risk constraints
    await this.assessPortfolioRisk(allocations);
  }

  private async assessStrategy(strategy: Strategy, hypothesis?: any): Promise<RiskAssessment> {
    const checks: RiskCheck[] = [];
    
    // Validate strategy structure
    const validation = StrategyValidator.validate(strategy);
    if (!validation.isValid) {
      checks.push({
        name: 'Structure Validation',
        category: 'position_size',
        status: 'FAIL',
        value: 0,
        threshold: 1,
        description: `Strategy structure invalid: ${validation.errors.join(', ')}`,
        severity: 'critical'
      });
    }
    
    // Position size checks
    const positionSizeCheck = this.checkPositionSize(strategy);
    checks.push(positionSizeCheck);
    
    // Correlation checks
    const correlationCheck = await this.checkCorrelation(strategy);
    checks.push(correlationCheck);
    
    // Drawdown checks
    const drawdownCheck = this.checkDrawdownLimits(strategy);
    checks.push(drawdownCheck);
    
    // Leverage checks
    const leverageCheck = this.checkLeverage(strategy);
    checks.push(leverageCheck);
    
    // Concentration checks
    const concentrationCheck = this.checkConcentration(strategy);
    checks.push(concentrationCheck);
    
    // Regime stability check
    const regimeStabilityCheck = await this.checkRegimeStability(strategy, hypothesis);
    checks.push(regimeStabilityCheck);
    
    // Liquidity checks
    const liquidityCheck = this.checkLiquidity(strategy);
    checks.push(liquidityCheck);
    
    // Calculate overall assessment
    const riskScore = this.calculateRiskScore(checks);
    const fragility = this.calculateFragilityIndex(checks, strategy);
    const overall = this.determineOverallStatus(checks, riskScore);
    const mitigation = this.generateMitigationAdvice(checks, strategy);
    
    return {
      strategyId: strategy.id,
      overall,
      riskScore,
      fragility,
      checks,
      mitigation,
      timestamp: new Date()
    };
  }

  private checkPositionSize(strategy: Strategy): RiskCheck {
    const sizer = strategy.components.positionSizer;
    let maxPosition = 0.1; // default 10%
    
    if (sizer.sizingType === 'kelly_fraction_capped' && sizer.parameters.maxPosition) {
      maxPosition = sizer.parameters.maxPosition;
    }
    
    const status = maxPosition <= this.riskLimits.maxPositionSize ? 'PASS' : 
                   maxPosition <= this.riskLimits.maxPositionSize * 1.2 ? 'WARN' : 'FAIL';
    
    return {
      name: 'Position Size Limit',
      category: 'position_size',
      status,
      value: maxPosition,
      threshold: this.riskLimits.maxPositionSize,
      description: `Maximum position size: ${(maxPosition * 100).toFixed(1)}%`,
      severity: maxPosition > this.riskLimits.maxPositionSize * 2 ? 'critical' : 
                maxPosition > this.riskLimits.maxPositionSize * 1.5 ? 'high' : 'medium'
    };
  }

  private async checkCorrelation(strategy: Strategy): RiskCheck {
    // Calculate correlation to existing strategies
    let maxCorrelation = 0;
    
    if (this.existingStrategies.length > 0) {
      // Simplified correlation calculation
      // In production, would use actual return correlations
      for (const existing of this.existingStrategies) {
        const correlation = this.calculateStrategyCorrelation(strategy, existing);
        maxCorrelation = Math.max(maxCorrelation, correlation);
      }
    }
    
    const status = maxCorrelation <= this.riskLimits.maxCorrelation ? 'PASS' : 
                   maxCorrelation <= this.riskLimits.maxCorrelation * 1.1 ? 'WARN' : 'FAIL';
    
    return {
      name: 'Strategy Correlation',
      category: 'correlation',
      status,
      value: maxCorrelation,
      threshold: this.riskLimits.maxCorrelation,
      description: `Maximum correlation to existing strategies: ${(maxCorrelation * 100).toFixed(1)}%`,
      severity: maxCorrelation > 0.9 ? 'critical' : maxCorrelation > 0.8 ? 'high' : 'medium'
    };
  }

  private checkDrawdownLimits(strategy: Strategy): RiskCheck {
    // Check if strategy has appropriate drawdown controls
    const hasDrawdownControl = strategy.components.riskOverlays.some(
      overlay => overlay.riskType === 'drawdown_circuit_breaker'
    );
    
    let maxDrawdown = this.riskLimits.maxDrawdown;
    
    if (hasDrawdownControl) {
      const ddControl = strategy.components.riskOverlays.find(
        overlay => overlay.riskType === 'drawdown_circuit_breaker'
      );
      if (ddControl) {
        maxDrawdown = ddControl.parameters.maxDrawdown || maxDrawdown;
      }
    }
    
    const status = maxDrawdown <= this.riskLimits.maxDrawdown ? 'PASS' : 
                   maxDrawdown <= this.riskLimits.maxDrawdown * 1.2 ? 'WARN' : 'FAIL';
    
    return {
      name: 'Drawdown Control',
      category: 'drawdown',
      status,
      value: maxDrawdown,
      threshold: this.riskLimits.maxDrawdown,
      description: hasDrawdownControl ? 
        `Drawdown limit: ${(maxDrawdown * 100).toFixed(1)}%` :
        'No drawdown control implemented',
      severity: !hasDrawdownControl ? 'high' : 
                maxDrawdown > this.riskLimits.maxDrawdown * 2 ? 'critical' : 'medium'
    };
  }

  private checkLeverage(strategy: Strategy): RiskCheck {
    // Estimate leverage from position sizing
    let estimatedLeverage = 1.0;
    
    const sizer = strategy.components.positionSizer;
    if (sizer.sizingType === 'kelly_fraction_capped') {
      const maxPosition = sizer.parameters.maxPosition || 0.05;
      const signalCount = strategy.components.signals.length;
      
      // Rough leverage estimate
      estimatedLeverage = Math.min(signalCount * maxPosition * 5, 3.0);
    }
    
    const status = estimatedLeverage <= this.riskLimits.maxLeverage ? 'PASS' : 
                   estimatedLeverage <= this.riskLimits.maxLeverage * 1.2 ? 'WARN' : 'FAIL';
    
    return {
      name: 'Leverage Limit',
      category: 'leverage',
      status,
      value: estimatedLeverage,
      threshold: this.riskLimits.maxLeverage,
      description: `Estimated leverage: ${estimatedLeverage.toFixed(1)}x`,
      severity: estimatedLeverage > this.riskLimits.maxLeverage * 2 ? 'critical' : 'medium'
    };
  }

  private checkConcentration(strategy: Strategy): RiskCheck {
    // Check concentration in single assets/sectors
    const universe = strategy.components.universe;
    let concentrationRisk = 0.1; // default
    
    // Higher concentration risk if universe is small or sector-specific
    if (universe.parameters.sectors && universe.parameters.sectors.length === 1) {
      concentrationRisk = 0.3; // High sector concentration
    }
    
    if (universe.parameters.assetClasses && universe.parameters.assetClasses.length === 1) {
      concentrationRisk += 0.1;
    }
    
    const status = concentrationRisk <= this.riskLimits.maxConcentration ? 'PASS' : 
                   concentrationRisk <= this.riskLimits.maxConcentration * 1.2 ? 'WARN' : 'FAIL';
    
    return {
      name: 'Concentration Risk',
      category: 'concentration',
      status,
      value: concentrationRisk,
      threshold: this.riskLimits.maxConcentration,
      description: `Estimated concentration risk: ${(concentrationRisk * 100).toFixed(1)}%`,
      severity: concentrationRisk > 0.4 ? 'high' : 'medium'
    };
  }

  private async checkRegimeStability(strategy: Strategy, hypothesis?: any): RiskCheck {
    let stabilityScore = 0.7; // default moderate stability
    
    if (hypothesis && hypothesis.targetRegimes) {
      // Check if strategy is designed for current regime
      const currentRegimeMatch = this.currentRegime && 
        hypothesis.targetRegimes.includes(this.currentRegime.newRegime);
      
      if (currentRegimeMatch) {
        stabilityScore = 0.8;
      } else if (hypothesis.targetRegimes.includes('any')) {
        stabilityScore = 0.6;
      } else {
        stabilityScore = 0.4; // Low stability if not designed for current regime
      }
    }
    
    const status = stabilityScore >= 0.6 ? 'PASS' : 
                   stabilityScore >= 0.4 ? 'WARN' : 'FAIL';
    
    return {
      name: 'Regime Stability',
      category: 'regime_stability',
      status,
      value: stabilityScore,
      threshold: 0.6,
      description: `Regime stability score: ${(stabilityScore * 100).toFixed(1)}%`,
      severity: stabilityScore < 0.3 ? 'high' : 'medium'
    };
  }

  private checkLiquidity(strategy: Strategy): RiskCheck {
    const universe = strategy.components.universe;
    const minVolume = universe.parameters.volume?.min || 0;
    
    const status = minVolume >= this.riskLimits.minLiquidity ? 'PASS' : 
                   minVolume >= this.riskLimits.minLiquidity * 0.5 ? 'WARN' : 'FAIL';
    
    return {
      name: 'Liquidity Requirement',
      category: 'position_size',
      status,
      value: minVolume,
      threshold: this.riskLimits.minLiquidity,
      description: `Minimum liquidity: $${(minVolume / 1000000).toFixed(1)}M`,
      severity: minVolume < this.riskLimits.minLiquidity * 0.2 ? 'high' : 'medium'
    };
  }

  private calculateRiskScore(checks: RiskCheck[]): number {
    let totalScore = 0;
    let weightSum = 0;
    
    for (const check of checks) {
      let weight = 1;
      let score = 0;
      
      // Assign weights based on category and severity
      switch (check.category) {
        case 'position_size':
        case 'leverage':
          weight = 3;
          break;
        case 'drawdown':
        case 'correlation':
          weight = 2;
          break;
        default:
          weight = 1;
      }
      
      // Severity multiplier
      switch (check.severity) {
        case 'critical':
          weight *= 3;
          break;
        case 'high':
          weight *= 2;
          break;
        case 'medium':
          weight *= 1.5;
          break;
      }
      
      // Status to score conversion
      switch (check.status) {
        case 'PASS':
          score = 0;
          break;
        case 'WARN':
          score = 30;
          break;
        case 'FAIL':
          score = 100;
          break;
      }
      
      totalScore += score * weight;
      weightSum += weight;
    }
    
    return weightSum > 0 ? Math.min(100, totalScore / weightSum) : 0;
  }

  private calculateFragilityIndex(checks: RiskCheck[], strategy: Strategy): { index: number; contributors: string[] } {
    // Bayesian fragility index calculation
    let fragility = 0;
    const contributors: string[] = [];
    
    // Base fragility from complexity
    const complexity = StrategyValidator.calculateComplexity(strategy);
    fragility += Math.min(0.3, complexity / 20); // Normalize complexity contribution
    
    // Add fragility from failed checks
    for (const check of checks) {
      if (check.status === 'FAIL') {
        fragility += 0.2;
        contributors.push(check.name);
      } else if (check.status === 'WARN') {
        fragility += 0.1;
        contributors.push(check.name);
      }
      
      // Critical severity adds extra fragility
      if (check.severity === 'critical') {
        fragility += 0.15;
      }
    }
    
    // Regime mismatch fragility
    if (this.currentRegime) {
      const regimeCheck = checks.find(c => c.category === 'regime_stability');
      if (regimeCheck && regimeCheck.value < 0.5) {
        fragility += 0.2;
        contributors.push('Regime mismatch');
      }
    }
    
    return {
      index: Math.min(1, fragility),
      contributors
    };
  }

  private determineOverallStatus(checks: RiskCheck[], riskScore: number): 'PASS' | 'WARN' | 'FAIL' {
    // Any critical failure = FAIL
    if (checks.some(check => check.status === 'FAIL' && check.severity === 'critical')) {
      return 'FAIL';
    }
    
    // Multiple failures or high risk score = FAIL
    if (checks.filter(check => check.status === 'FAIL').length >= 2 || riskScore > 60) {
      return 'FAIL';
    }
    
    // Any failure or moderate risk = WARN
    if (checks.some(check => check.status === 'FAIL') || riskScore > 30) {
      return 'WARN';
    }
    
    return 'PASS';
  }

  private generateMitigationAdvice(checks: RiskCheck[], strategy: Strategy): string[] {
    const advice: string[] = [];
    
    for (const check of checks) {
      if (check.status === 'FAIL' || check.status === 'WARN') {
        switch (check.category) {
          case 'position_size':
            advice.push(`Reduce maximum position size to ${(this.riskLimits.maxPositionSize * 100).toFixed(1)}% or lower`);
            break;
          case 'correlation':
            advice.push('Consider modifying strategy to reduce correlation with existing strategies');
            break;
          case 'drawdown':
            advice.push('Implement stricter drawdown controls or reduce position sizes');
            break;
          case 'leverage':
            advice.push(`Reduce estimated leverage to ${this.riskLimits.maxLeverage}x or lower`);
            break;
          case 'concentration':
            advice.push('Diversify universe selection to reduce concentration risk');
            break;
          case 'regime_stability':
            advice.push('Consider regime-conditional position sizing or additional regime filters');
            break;
        }
      }
    }
    
    if (advice.length === 0) {
      advice.push('Strategy passes all risk checks - consider gradual deployment');
    }
    
    return advice;
  }

  private calculateStrategyCorrelation(strategy1: Strategy, strategy2: Strategy): number {
    // Simplified correlation calculation based on strategy components
    let similarity = 0;
    
    // Universe similarity
    const universe1 = strategy1.components.universe;
    const universe2 = strategy2.components.universe;
    
    if (JSON.stringify(universe1.parameters.assetClasses) === 
        JSON.stringify(universe2.parameters.assetClasses)) {
      similarity += 0.3;
    }
    
    // Signal similarity
    const signals1 = strategy1.components.signals.map(s => s.signalType);
    const signals2 = strategy2.components.signals.map(s => s.signalType);
    
    const commonSignals = signals1.filter(s => signals2.includes(s)).length;
    const totalSignals = new Set([...signals1, ...signals2]).size;
    
    if (totalSignals > 0) {
      similarity += (commonSignals / totalSignals) * 0.4;
    }
    
    // Position sizer similarity
    if (strategy1.components.positionSizer.sizingType === 
        strategy2.components.positionSizer.sizingType) {
      similarity += 0.2;
    }
    
    // Execution similarity
    if (strategy1.components.execution.executionType === 
        strategy2.components.execution.executionType) {
      similarity += 0.1;
    }
    
    return similarity;
  }

  private async assessPortfolioRisk(allocations: any): Promise<void> {
    // Portfolio-level risk assessment
    const totalAllocation = Object.values(allocations).reduce((sum: number, alloc: any) => sum + alloc, 0);
    
    if (totalAllocation > 1.1) {
      await this.publishEvent(
        EventTypes.RISK_ALERT,
        {
          type: 'portfolio_overallocation',
          severity: 'high',
          message: `Portfolio allocation exceeds 100%: ${(totalAllocation * 100).toFixed(1)}%`,
          recommendations: ['Reduce allocations to maintain 100% or lower']
        }
      );
    }
  }

  private async publishRiskAssessment(assessment: RiskAssessment, strategy: Strategy): Promise<void> {
    // Store assessment in knowledge graph if needed
    const assessmentEntity = this.knowledgeGraph.addEntity(
      EntityType.STRATEGY,
      {
        riskAssessment: {
          overall: assessment.overall,
          riskScore: assessment.riskScore,
          fragility: assessment.fragility.index,
          timestamp: assessment.timestamp
        }
      }
    );
    
    // Publish appropriate event based on assessment
    if (assessment.overall === 'FAIL') {
      await this.publishEvent(
        EventTypes.RISK_ALERT,
        {
          strategyId: assessment.strategyId,
          assessment: assessment,
          severity: 'high',
          message: `Strategy ${strategy.name} failed risk assessment`
        }
      );
    } else if (assessment.overall === 'WARN') {
      await this.publishEvent(
        EventTypes.RISK_ALERT,
        {
          strategyId: assessment.strategyId,
          assessment: assessment,
          severity: 'medium',
          message: `Strategy ${strategy.name} has risk warnings`
        }
      );
    } else {
      // Strategy passed - add to existing strategies list
      if (!this.existingStrategies.find(s => s.id === strategy.id)) {
        this.existingStrategies.push(strategy);
      }
    }
    
    console.log(`${this.config.name}: Risk assessment for ${strategy.name}: ${assessment.overall} (score: ${assessment.riskScore.toFixed(1)})`);
  }

  /**
   * Get risk assessment for a strategy
   */
  getRiskAssessment(strategyId: string): RiskAssessment | null {
    return this.riskAssessments.get(strategyId) || null;
  }

  /**
   * Get all risk assessments
   */
  getAllRiskAssessments(): RiskAssessment[] {
    return Array.from(this.riskAssessments.values());
  }

  /**
   * Update risk limits
   */
  updateRiskLimits(newLimits: Partial<RiskLimits>): void {
    Object.assign(this.riskLimits, newLimits);
    console.log(`${this.config.name}: Updated risk limits:`, this.riskLimits);
  }
}