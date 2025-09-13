import { EventBus, eventBus, EventTypes } from '../infra/event-bus';
import { KnowledgeGraph, knowledgeGraph } from '../infra/knowledge-graph';
import { AgentManager, LLMProvider } from '../infra/agent-base';
import { RegimeClassifierAgent } from '../agents/regime/regime-classifier';
import { FactorMinerAgent } from '../agents/factor/factor-miner';
import { HypothesisGeneratorAgent } from '../agents/strategy/hypothesis-generator';
import { RiskArbiterAgent } from '../agents/risk/risk-arbiter';
import { LLMProviderFactory, LLMConfig } from '../llm/client';
import { originalityAuditor } from '../scoring/originality';

export interface OrchestratorConfig {
  llmConfig?: LLMConfig;
  enabledAgents: string[];
  riskLimits?: any;
  dataSourceConfig?: any;
}

export interface SystemStatus {
  isRunning: boolean;
  activeAgents: number;
  totalEvents: number;
  recentErrors: string[];
  lastActivity: Date;
  performanceMetrics: {
    strategiesGenerated: number;
    factorsDiscovered: number;
    riskAssessments: number;
    regimeChanges: number;
  };
}

/**
 * Main orchestrator for the quant agents system
 * Manages agent lifecycle, coordinates workflows, and provides system status
 */
export class QuantAgentsOrchestrator {
  private readonly eventBus: EventBus;
  private readonly knowledgeGraph: KnowledgeGraph;
  private readonly agentManager: AgentManager;
  private llmProvider?: LLMProvider;
  
  private isInitialized = false;
  private isRunning = false;
  private config: OrchestratorConfig;
  
  private performanceMetrics = {
    strategiesGenerated: 0,
    factorsDiscovered: 0,
    riskAssessments: 0,
    regimeChanges: 0
  };
  
  private recentErrors: string[] = [];
  private readonly maxErrors = 50;

  constructor(config: OrchestratorConfig) {
    this.config = config;
    this.eventBus = eventBus;
    this.knowledgeGraph = knowledgeGraph;
    this.agentManager = new AgentManager(this.eventBus, this.knowledgeGraph);
    
    this.setupEventHandlers();
  }

  /**
   * Initialize the orchestrator and all enabled agents
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      throw new Error('Orchestrator already initialized');
    }

    try {
      console.log('Initializing Quant Agents Orchestrator...');
      
      // Initialize LLM provider if configured
      if (this.config.llmConfig) {
        this.llmProvider = LLMProviderFactory.create(this.config.llmConfig);
      }
      
      // Register enabled agents
      await this.registerAgents();
      
      this.isInitialized = true;
      console.log('Quant Agents Orchestrator initialized successfully');
    } catch (error) {
      console.error('Failed to initialize orchestrator:', error);
      throw error;
    }
  }

  /**
   * Start the agent system
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Orchestrator must be initialized before starting');
    }
    
    if (this.isRunning) {
      console.log('Orchestrator already running');
      return;
    }

    try {
      console.log('Starting Quant Agents System...');
      
      this.isRunning = true;
      
      // Start workflow monitoring
      this.startPerformanceMonitoring();
      
      console.log('Quant Agents System started successfully');
      
      // Publish system startup event
      await this.eventBus.publish(
        'system.started',
        { 
          timestamp: new Date(),
          activeAgents: this.agentManager.getAllAgentStatuses().length
        },
        'orchestrator'
      );
      
    } catch (error) {
      console.error('Failed to start orchestrator:', error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop the agent system
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('Orchestrator not running');
      return;
    }

    try {
      console.log('Stopping Quant Agents System...');
      
      this.isRunning = false;
      
      // Stop all agents
      await this.agentManager.shutdown();
      
      console.log('Quant Agents System stopped successfully');
      
    } catch (error) {
      console.error('Error stopping orchestrator:', error);
      throw error;
    }
  }

  /**
   * Simulate market data ingestion
   */
  async ingestMarketData(data: any): Promise<void> {
    if (!this.isRunning) {
      throw new Error('System not running');
    }

    await this.eventBus.publish(
      EventTypes.DATA_INGESTED,
      { marketData: data },
      'orchestrator'
    );
  }

  /**
   * Simulate macro narrative update
   */
  async updateMacroNarrative(narrative: string): Promise<void> {
    if (!this.isRunning) {
      throw new Error('System not running');
    }

    await this.eventBus.publish(
      EventTypes.MACRO_NARRATIVE_UPDATED,
      { narrative },
      'orchestrator'
    );
  }

  /**
   * Get system status
   */
  getSystemStatus(): SystemStatus {
    const agents = this.agentManager.getAllAgentStatuses();
    const eventStats = this.eventBus.getStats();
    
    return {
      isRunning: this.isRunning,
      activeAgents: agents.filter(a => a.status === 'active').length,
      totalEvents: eventStats.recentEventCount,
      recentErrors: [...this.recentErrors],
      lastActivity: new Date(),
      performanceMetrics: { ...this.performanceMetrics }
    };
  }

  /**
   * Get agent statuses
   */
  getAgentStatuses(): any[] {
    return this.agentManager.getAllAgentStatuses();
  }

  /**
   * Get knowledge graph statistics
   */
  getKnowledgeGraphStats(): any {
    return this.knowledgeGraph.getStats();
  }

  /**
   * Get event bus statistics
   */
  getEventBusStats(): any {
    return this.eventBus.getStats();
  }

  /**
   * Get recent events
   */
  getRecentEvents(limit: number = 50): any[] {
    return this.eventBus.getEvents({ limit });
  }

  /**
   * Force a complete system analysis cycle
   */
  async triggerAnalysisCycle(): Promise<void> {
    if (!this.isRunning) {
      throw new Error('System not running');
    }

    console.log('Triggering complete analysis cycle...');
    
    // Simulate fresh market data
    const mockMarketData = this.generateMockMarketData();
    await this.ingestMarketData(mockMarketData);
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update macro narrative
    const narrative = 'Market showing increased volatility with sector rotation patterns emerging';
    await this.updateMacroNarrative(narrative);
    
    console.log('Analysis cycle triggered');
  }

  /**
   * Get strategy recommendations
   */
  async getStrategyRecommendations(): Promise<any[]> {
    // Get recent strategies from knowledge graph
    const strategies = this.knowledgeGraph.findEntities({
      entityTypes: ['strategy' as any],
      timeRange: {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        end: new Date()
      }
    });

    return strategies.map(strategy => ({
      id: strategy.id,
      name: strategy.properties.name,
      confidence: strategy.properties.confidence,
      innovationDistance: strategy.properties.innovationDistance,
      riskScore: strategy.properties.riskAssessment?.riskScore,
      targetRegimes: strategy.properties.targetRegimes,
      createdAt: strategy.createdAt
    }));
  }

  /**
   * Get factor discoveries
   */
  getFactorDiscoveries(limit: number = 20): any[] {
    const factors = this.knowledgeGraph.findEntities({
      entityTypes: ['factor' as any]
    });

    return factors
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
      .map(factor => ({
        id: factor.id,
        name: factor.properties.name,
        type: factor.properties.type,
        zScore: factor.properties.zScore,
        noveltyScore: factor.properties.noveltyScore,
        crowdingRisk: factor.properties.crowdingRisk,
        halfLife: factor.properties.halfLife,
        createdAt: factor.createdAt
      }));
  }

  /**
   * Register and start agents based on configuration
   */
  private async registerAgents(): Promise<void> {
    const { enabledAgents } = this.config;
    
    if (enabledAgents.includes('regime_classifier')) {
      await this.agentManager.registerAgent(RegimeClassifierAgent, {
        name: 'Regime Classifier',
        description: 'Identifies market regimes and transition probabilities',
        llmProvider: this.llmProvider
      });
    }
    
    if (enabledAgents.includes('factor_miner')) {
      await this.agentManager.registerAgent(FactorMinerAgent, {
        name: 'Factor Miner',
        description: 'Discovers and validates new trading factors',
        llmProvider: this.llmProvider
      });
    }
    
    if (enabledAgents.includes('hypothesis_generator')) {
      await this.agentManager.registerAgent(HypothesisGeneratorAgent, {
        name: 'Hypothesis Generator',
        description: 'Generates strategy hypotheses from market anomalies',
        llmProvider: this.llmProvider
      });
    }
    
    if (enabledAgents.includes('risk_arbiter')) {
      await this.agentManager.registerAgent(RiskArbiterAgent, {
        name: 'Risk Arbiter',
        description: 'Assesses and manages strategy risk',
        llmProvider: this.llmProvider
      });
    }
    
    console.log(`Registered ${enabledAgents.length} agents`);
  }

  /**
   * Setup event handlers for monitoring
   */
  private setupEventHandlers(): void {
    this.eventBus.subscribe('*', async (event) => {
      try {
        await this.handleSystemEvent(event);
      } catch (error) {
        this.logError(`Event handler error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }, 'orchestrator');
  }

  /**
   * Handle system-wide events for monitoring and metrics
   */
  private async handleSystemEvent(event: any): Promise<void> {
    // Update performance metrics
    switch (event.type) {
      case EventTypes.STRATEGY_DRAFT:
        this.performanceMetrics.strategiesGenerated++;
        break;
      case EventTypes.FACTOR_CANDIDATE:
        this.performanceMetrics.factorsDiscovered++;
        break;
      case EventTypes.RISK_ALERT:
        this.performanceMetrics.riskAssessments++;
        break;
      case EventTypes.REGIME_STATE_CHANGE:
        this.performanceMetrics.regimeChanges++;
        break;
      case EventTypes.AGENT_ERROR:
        this.logError(`Agent error: ${event.data.error}`);
        break;
    }
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    setInterval(() => {
      if (!this.isRunning) return;
      
      const stats = this.getSystemStatus();
      console.log('System Performance:', {
        activeAgents: stats.activeAgents,
        totalEvents: stats.totalEvents,
        metrics: stats.performanceMetrics
      });
      
      // Clear old errors
      if (this.recentErrors.length > this.maxErrors) {
        this.recentErrors = this.recentErrors.slice(-this.maxErrors);
      }
      
    }, 30000); // Every 30 seconds
  }

  /**
   * Log error with timestamp
   */
  private logError(message: string): void {
    const errorWithTimestamp = `[${new Date().toISOString()}] ${message}`;
    this.recentErrors.push(errorWithTimestamp);
    console.error(errorWithTimestamp);
  }

  /**
   * Generate mock market data for testing
   */
  private generateMockMarketData(): any {
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM', 'JNJ', 'V'];
    
    const marketData = {
      timestamp: new Date(),
      prices: {} as Record<string, number>,
      volumes: {} as Record<string, number>,
      fundamentals: {
        pe_ratios: {} as Record<string, number>
      },
      alternativeData: {
        sentiment: {} as Record<string, number>
      }
    };
    
    for (const symbol of symbols) {
      marketData.prices[symbol] = 100 + Math.random() * 400; // $100-$500
      marketData.volumes[symbol] = 1000000 + Math.random() * 5000000; // 1M-6M
      marketData.fundamentals.pe_ratios[symbol] = 10 + Math.random() * 40; // PE 10-50
      marketData.alternativeData.sentiment[symbol] = Math.random() * 2 - 1; // -1 to 1
    }
    
    return marketData;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.isRunning) {
      await this.stop();
    }
    
    this.eventBus.clearHistory();
    this.knowledgeGraph.clear();
  }
}

/**
 * Create a default orchestrator instance
 */
export function createDefaultOrchestrator(): QuantAgentsOrchestrator {
  return new QuantAgentsOrchestrator({
    llmConfig: { provider: 'mock' },
    enabledAgents: [
      'regime_classifier',
      'factor_miner', 
      'hypothesis_generator',
      'risk_arbiter'
    ]
  });
}

// Export singleton for global use
let defaultOrchestrator: QuantAgentsOrchestrator | null = null;

export function getDefaultOrchestrator(): QuantAgentsOrchestrator {
  if (!defaultOrchestrator) {
    defaultOrchestrator = createDefaultOrchestrator();
  }
  return defaultOrchestrator;
}