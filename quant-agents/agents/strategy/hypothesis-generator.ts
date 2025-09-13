import { BaseAgent, AgentConfig } from '../../infra/agent-base';
import { EventTypes, Event } from '../../infra/event-bus';
import { EntityType, RelationType } from '../../infra/knowledge-graph';
import { Strategy, UniverseSelector, SignalBlock, PositionSizer, ExecutionPlan, RiskOverlay } from '../../dsl/strategy-nodes';

export interface StrategyHypothesis {
  id: string;
  name: string;
  mechanismExplanation: string;
  entryLogic: string;
  exitLogic: string;
  riskControls: string[];
  expectedFailureModes: string[];
  innovationDistanceEstimate: number;
  confidence: number;
  targetRegimes: string[];
  strategy: Strategy;
}

export interface AnomalyInput {
  type: 'factor_anomaly' | 'regime_shift' | 'sentiment_divergence' | 'microstructure_imbalance';
  description: string;
  significance: number;
  factorId?: string;
  marketData: any;
  metadata: any;
}

/**
 * Hypothesis Generator Agent
 * Converts anomalies into testable strategies using LLM reasoning
 * Forces causal consistency and estimates innovation distance
 */
export class HypothesisGeneratorAgent extends BaseAgent {
  private readonly hypothesesHistory: StrategyHypothesis[] = [];
  private readonly maxHistorySize = 1000;
  private currentRegime: any = null;
  private factorPanel: any[] = [];

  protected async setupSubscriptions(): Promise<void> {
    this.subscribeToEvent(EventTypes.FACTOR_CANDIDATE, this.handleFactorCandidate.bind(this));
    this.subscribeToEvent(EventTypes.REGIME_STATE_CHANGE, this.handleRegimeChange.bind(this));
    this.subscribeToEvent(EventTypes.DATA_QUALITY_FLAG, this.handleDataQualityFlag.bind(this));
  }

  protected async initialize(): Promise<void> {
    console.log(`${this.config.name}: Initialized strategy hypothesis generation system`);
  }

  protected async cleanup(): Promise<void> {
    this.hypothesesHistory.length = 0;
    this.factorPanel = [];
  }

  private async handleFactorCandidate(event: Event): Promise<void> {
    const { factor, factorId } = event.data;
    
    // Add to factor panel
    this.factorPanel.push({
      id: factorId,
      ...factor,
      discoveredAt: new Date()
    });
    
    // Keep factor panel bounded
    if (this.factorPanel.length > 200) {
      this.factorPanel.shift();
    }
    
    // Generate hypothesis if factor is significant enough
    if (factor.zScore > 2.0 && factor.noveltyScore > 0.5) {
      const anomaly: AnomalyInput = {
        type: 'factor_anomaly',
        description: `Strong factor signal: ${factor.name} (z-score: ${factor.zScore})`,
        significance: factor.significance,
        factorId: factorId,
        marketData: event.data.marketData || {},
        metadata: {
          noveltyScore: factor.noveltyScore,
          crowdingRisk: factor.crowdingRisk,
          halfLife: factor.halfLife
        }
      };
      
      const hypothesis = await this.generateHypothesis(anomaly);
      if (hypothesis) {
        await this.publishHypothesis(hypothesis);
      }
    }
  }

  private async handleRegimeChange(event: Event): Promise<void> {
    this.currentRegime = event.data;
    
    // Generate regime-based strategies
    const anomaly: AnomalyInput = {
      type: 'regime_shift',
      description: `Regime change to ${event.data.newRegime}`,
      significance: event.data.probability,
      marketData: {},
      metadata: {
        characteristics: event.data.characteristics,
        transitionProbabilities: event.metadata?.transitionProbabilities
      }
    };
    
    const hypothesis = await this.generateHypothesis(anomaly);
    if (hypothesis) {
      await this.publishHypothesis(hypothesis);
    }
  }

  private async handleDataQualityFlag(event: Event): Promise<void> {
    // Generate strategies that exploit data quality issues or structural breaks
    const { qualityIssue, affectedData } = event.data;
    
    const anomaly: AnomalyInput = {
      type: 'microstructure_imbalance',
      description: `Data quality anomaly: ${qualityIssue}`,
      significance: 0.8,
      marketData: affectedData,
      metadata: {
        qualityIssue,
        potentialOpportunity: true
      }
    };
    
    const hypothesis = await this.generateHypothesis(anomaly);
    if (hypothesis) {
      await this.publishHypothesis(hypothesis);
    }
  }

  private async generateHypothesis(anomaly: AnomalyInput): Promise<StrategyHypothesis | null> {
    try {
      // Build context for LLM
      const context = this.buildStrategyContext(anomaly);
      
      // Generate hypothesis using LLM
      const llmResponse = await this.generateStrategyWithLLM(context, anomaly);
      if (!llmResponse) return null;
      
      // Parse LLM response
      const parsedStrategy = this.parseLLMResponse(llmResponse);
      if (!parsedStrategy) return null;
      
      // Build complete strategy object
      const strategy = await this.buildCompleteStrategy(parsedStrategy, anomaly);
      
      // Create hypothesis
      const hypothesis: StrategyHypothesis = {
        id: `hypothesis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: parsedStrategy.name,
        mechanismExplanation: parsedStrategy.mechanismExplanation,
        entryLogic: parsedStrategy.entryLogic,
        exitLogic: parsedStrategy.exitLogic,
        riskControls: parsedStrategy.riskControls,
        expectedFailureModes: parsedStrategy.expectedFailureModes,
        innovationDistanceEstimate: parsedStrategy.innovationDistanceEstimate || 0.5,
        confidence: parsedStrategy.confidence || 0.7,
        targetRegimes: parsedStrategy.targetRegimes || [this.currentRegime?.newRegime || 'any'],
        strategy
      };
      
      // Validate hypothesis
      if (await this.validateHypothesis(hypothesis)) {
        return hypothesis;
      }
      
      return null;
    } catch (error) {
      console.error(`${this.config.name}: Error generating hypothesis:`, error);
      return null;
    }
  }

  private buildStrategyContext(anomaly: AnomalyInput): string {
    const recentFactors = this.factorPanel.slice(-10);
    const regimeInfo = this.currentRegime ? 
      `Current regime: ${this.currentRegime.newRegime} (probability: ${this.currentRegime.probability})` : 
      'No current regime information';
    
    return `
Context for Strategy Generation:
${regimeInfo}

Recent Factors:
${recentFactors.map(f => `- ${f.name}: ${f.description} (novelty: ${f.noveltyScore})`).join('\n')}

Anomaly Details:
Type: ${anomaly.type}
Description: ${anomaly.description}
Significance: ${anomaly.significance}

Market Conditions:
${JSON.stringify(anomaly.metadata, null, 2)}
    `.trim();
  }

  private async generateStrategyWithLLM(context: string, anomaly: AnomalyInput): Promise<string | null> {
    if (!this.llm) {
      return this.generateFallbackStrategy(anomaly);
    }
    
    const prompt = this.buildStrategyPrompt(context, anomaly);
    
    try {
      return await this.llm.generateText(prompt, {
        maxTokens: 1500,
        temperature: 0.7,
        stopSequences: ['---END---']
      });
    } catch (error) {
      console.error(`${this.config.name}: LLM generation failed:`, error);
      return this.generateFallbackStrategy(anomaly);
    }
  }

  private buildStrategyPrompt(context: string, anomaly: AnomalyInput): string {
    return `
System: You are the Hypothesis Generator in a quantitative trading system. Generate ONLY strategies whose mechanism is causally consistent with the stated anomaly and regime context. 

Required Output Format (JSON):
{
  "name": "Strategy Name",
  "mechanismExplanation": "Clear causal explanation of why this works",
  "entryLogic": "Specific entry conditions",
  "exitLogic": "Specific exit conditions", 
  "riskControls": ["Control 1", "Control 2"],
  "expectedFailureModes": ["Failure 1", "Failure 2"],
  "innovationDistanceEstimate": 0.XX,
  "confidence": 0.XX,
  "targetRegimes": ["regime1", "regime2"]
}

Context:
${context}

Requirements:
1. Mechanism must be logically consistent with the anomaly
2. Innovation distance should reflect uniqueness (0-1 scale)
3. Include realistic failure modes
4. Confidence should reflect uncertainty in the hypothesis

Generate the strategy now:
    `.trim();
  }

  private generateFallbackStrategy(anomaly: AnomalyInput): string {
    // Fallback strategy generation when LLM is not available
    const strategies = {
      factor_anomaly: {
        name: 'Factor Anomaly Reversion',
        mechanismExplanation: 'Exploit factor anomaly through mean reversion or momentum continuation',
        entryLogic: 'Enter when factor z-score exceeds threshold',
        exitLogic: 'Exit when factor returns to normal range or after fixed period',
        riskControls: ['Position sizing based on volatility', 'Maximum holding period'],
        expectedFailureModes: ['Factor crowding', 'Regime shift', 'Data mining bias'],
        innovationDistanceEstimate: 0.4,
        confidence: 0.6,
        targetRegimes: ['any']
      },
      regime_shift: {
        name: 'Regime Transition Strategy',
        mechanismExplanation: 'Capitalize on regime transitions through positioning changes',
        entryLogic: 'Enter positions aligned with new regime characteristics',
        exitLogic: 'Exit when regime stabilizes or reverses',
        riskControls: ['Regime confidence threshold', 'Maximum exposure limits'],
        expectedFailureModes: ['False regime signals', 'Transition timing', 'Regime duration uncertainty'],
        innovationDistanceEstimate: 0.6,
        confidence: 0.7,
        targetRegimes: [anomaly.metadata?.newRegime || 'transition']
      }
    };
    
    const template = strategies[anomaly.type as keyof typeof strategies] || strategies.factor_anomaly;
    return JSON.stringify(template);
  }

  private parseLLMResponse(response: string): any {
    try {
      // Try to parse as JSON first
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback parsing for non-JSON responses
      return this.parseUnstructuredResponse(response);
    } catch (error) {
      console.error(`${this.config.name}: Failed to parse LLM response:`, error);
      return null;
    }
  }

  private parseUnstructuredResponse(response: string): any {
    // Simple keyword-based parsing for unstructured responses
    const lines = response.split('\n').map(line => line.trim());
    
    const result: any = {
      name: 'Generated Strategy',
      mechanismExplanation: '',
      entryLogic: '',
      exitLogic: '',
      riskControls: [],
      expectedFailureModes: [],
      innovationDistanceEstimate: 0.5,
      confidence: 0.6,
      targetRegimes: ['any']
    };
    
    // Extract information using simple patterns
    for (const line of lines) {
      if (line.toLowerCase().includes('mechanism') || line.toLowerCase().includes('explanation')) {
        result.mechanismExplanation = line;
      } else if (line.toLowerCase().includes('entry')) {
        result.entryLogic = line;
      } else if (line.toLowerCase().includes('exit')) {
        result.exitLogic = line;
      } else if (line.toLowerCase().includes('risk')) {
        result.riskControls.push(line);
      } else if (line.toLowerCase().includes('failure') || line.toLowerCase().includes('fail')) {
        result.expectedFailureModes.push(line);
      }
    }
    
    return result;
  }

  private async buildCompleteStrategy(parsedStrategy: any, anomaly: AnomalyInput): Promise<Strategy> {
    const strategyId = `strategy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Build universe selector
    const universe: UniverseSelector = {
      id: `universe_${strategyId}`,
      type: 'universe_selector',
      name: 'Default Universe',
      parameters: {
        assetClasses: ['equities'],
        marketCap: { min: 1000000000 }, // $1B minimum
        volume: { min: 1000000 }, // $1M minimum daily volume
        sectors: [],
        regions: ['US'],
        excludeList: [],
        dynamicFilters: []
      }
    };
    
    // Build signal blocks based on anomaly
    const signals: SignalBlock[] = [];
    
    if (anomaly.type === 'factor_anomaly' && anomaly.factorId) {
      const factor = this.factorPanel.find(f => f.id === anomaly.factorId);
      if (factor) {
        signals.push({
          id: `signal_${strategyId}`,
          type: 'signal_block',
          name: `${factor.name} Signal`,
          signalType: factor.type === 'cross_sectional' ? 'rolling_zscore' : 'momentum',
          parameters: {
            lookbackPeriod: 20,
            threshold: 2.0,
            factor: factor.name
          }
        });
      }
    } else {
      // Default momentum signal
      signals.push({
        id: `signal_${strategyId}`,
        type: 'signal_block',
        name: 'Momentum Signal',
        signalType: 'momentum',
        parameters: {
          lookbackPeriod: 20,
          threshold: 1.5
        }
      });
    }
    
    // Build position sizer
    const positionSizer: PositionSizer = {
      id: `sizer_${strategyId}`,
      type: 'position_sizer',
      name: 'Kelly Fraction Sizer',
      sizingType: 'kelly_fraction_capped',
      parameters: {
        maxPosition: 0.05, // 5% maximum position
        confidenceInterval: 0.95,
        lookbackPeriod: 252
      }
    };
    
    // Build risk overlays
    const riskOverlays: RiskOverlay[] = [
      {
        id: `risk_${strategyId}_1`,
        type: 'risk_overlay',
        name: 'Drawdown Circuit Breaker',
        riskType: 'drawdown_circuit_breaker',
        parameters: {
          maxDrawdown: 0.1, // 10% max drawdown
          recoveryThreshold: 0.05, // 5% recovery threshold
          shutdownDuration: 24 // 24 hours
        }
      }
    ];
    
    // Build execution plan
    const execution: ExecutionPlan = {
      id: `exec_${strategyId}`,
      type: 'execution_plan',
      name: 'TWAP Execution',
      executionType: 'twap_adaptive',
      parameters: {
        timeHorizon: 60, // 1 hour
        adaptationRate: 0.3,
        minOrderSize: 100,
        maxOrderSize: 10000,
        venuePreferences: ['NYSE', 'NASDAQ']
      }
    };
    
    // Create complete strategy
    const strategy: Strategy = {
      id: strategyId,
      name: parsedStrategy.name,
      description: parsedStrategy.mechanismExplanation,
      components: {
        universe,
        signals,
        features: [], // No feature transforms for now
        positionSizer,
        riskOverlays,
        execution
      },
      metadata: {
        created: new Date(),
        lastModified: new Date(),
        author: 'HypothesisGeneratorAgent',
        version: '1.0',
        tags: ['generated', anomaly.type, 'experimental']
      }
    };
    
    return strategy;
  }

  private async validateHypothesis(hypothesis: StrategyHypothesis): Promise<boolean> {
    // Basic validation checks
    
    // Check if mechanism explanation exists and is meaningful
    if (!hypothesis.mechanismExplanation || hypothesis.mechanismExplanation.length < 10) {
      return false;
    }
    
    // Check if entry and exit logic are defined
    if (!hypothesis.entryLogic || !hypothesis.exitLogic) {
      return false;
    }
    
    // Check if innovation distance is reasonable
    if (hypothesis.innovationDistanceEstimate < 0 || hypothesis.innovationDistanceEstimate > 1) {
      return false;
    }
    
    // Check if confidence is reasonable
    if (hypothesis.confidence < 0.1 || hypothesis.confidence > 1) {
      return false;
    }
    
    // Check for duplicate strategies (simplified)
    const isDuplicate = this.hypothesesHistory.some(h => 
      h.name === hypothesis.name || 
      h.mechanismExplanation === hypothesis.mechanismExplanation
    );
    
    if (isDuplicate) {
      return false;
    }
    
    return true;
  }

  private async publishHypothesis(hypothesis: StrategyHypothesis): Promise<void> {
    // Add to history
    this.hypothesesHistory.push(hypothesis);
    
    // Keep history bounded
    if (this.hypothesesHistory.length > this.maxHistorySize) {
      this.hypothesesHistory.shift();
    }
    
    // Store in knowledge graph
    const strategyEntity = this.knowledgeGraph.addEntity(
      EntityType.STRATEGY,
      {
        name: hypothesis.name,
        mechanismExplanation: hypothesis.mechanismExplanation,
        innovationDistance: hypothesis.innovationDistanceEstimate,
        confidence: hypothesis.confidence,
        targetRegimes: hypothesis.targetRegimes,
        riskControls: hypothesis.riskControls,
        expectedFailureModes: hypothesis.expectedFailureModes
      },
      await this.generateEmbedding(`${hypothesis.name} ${hypothesis.mechanismExplanation} ${hypothesis.entryLogic}`)
    );
    
    // Link to related factors if applicable
    if (hypothesis.strategy.components.signals.length > 0) {
      const factorName = hypothesis.strategy.components.signals[0].parameters.factor;
      if (factorName) {
        const factorEntities = this.knowledgeGraph.findEntities({
          entityTypes: [EntityType.FACTOR],
          properties: { name: factorName }
        });
        
        if (factorEntities.length > 0) {
          this.knowledgeGraph.addRelation(
            RelationType.STRATEGY_USES_FACTOR,
            strategyEntity.id,
            factorEntities[0].id,
            { confidence: hypothesis.confidence }
          );
        }
      }
    }
    
    // Publish strategy draft event
    await this.publishEvent(
      EventTypes.STRATEGY_DRAFT,
      {
        hypothesisId: hypothesis.id,
        strategyEntityId: strategyEntity.id,
        hypothesis: hypothesis,
        strategy: hypothesis.strategy
      },
      {
        innovationDistance: hypothesis.innovationDistanceEstimate,
        confidence: hypothesis.confidence,
        targetRegimes: hypothesis.targetRegimes
      }
    );
    
    console.log(`${this.config.name}: Generated strategy hypothesis: ${hypothesis.name} (confidence: ${hypothesis.confidence.toFixed(3)})`);
  }

  /**
   * Get recent strategy hypotheses
   */
  getRecentHypotheses(limit: number = 10): StrategyHypothesis[] {
    return this.hypothesesHistory.slice(-limit);
  }

  /**
   * Get hypotheses by regime
   */
  getHypothesesForRegime(regime: string): StrategyHypothesis[] {
    return this.hypothesesHistory.filter(h => 
      h.targetRegimes.includes(regime) || h.targetRegimes.includes('any')
    );
  }
}