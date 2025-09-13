import { EventBus, EventTypes, Event } from './event-bus';
import { KnowledgeGraph } from './knowledge-graph';

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  eventBus: EventBus;
  knowledgeGraph: KnowledgeGraph;
  llmProvider?: LLMProvider;
}

export interface LLMProvider {
  generateText(prompt: string, options?: any): Promise<string>;
  generateEmbedding(text: string): Promise<number[]>;
}

export interface AgentMetrics {
  tasksCompleted: number;
  successRate: number;
  averageResponseTime: number;
  errorCount: number;
  lastActive: Date;
}

export enum AgentStatus {
  STARTING = 'starting',
  ACTIVE = 'active',
  IDLE = 'idle',
  ERROR = 'error',
  STOPPED = 'stopped'
}

/**
 * Base class for all quant agents
 * Provides common functionality for event handling, metrics, and lifecycle management
 */
export abstract class BaseAgent {
  protected readonly config: AgentConfig;
  protected readonly eventBus: EventBus;
  protected readonly knowledgeGraph: KnowledgeGraph;
  protected readonly llm?: LLMProvider;
  
  protected status: AgentStatus = AgentStatus.STARTING;
  protected subscriptions: string[] = [];
  protected metrics: AgentMetrics = {
    tasksCompleted: 0,
    successRate: 0,
    averageResponseTime: 0,
    errorCount: 0,
    lastActive: new Date()
  };

  protected responseTimeSamples: number[] = [];
  private readonly maxSamples = 100;

  constructor(config: AgentConfig) {
    this.config = config;
    this.eventBus = config.eventBus;
    this.knowledgeGraph = config.knowledgeGraph;
    this.llm = config.llmProvider;
  }

  /**
   * Start the agent and set up subscriptions
   */
  async start(): Promise<void> {
    try {
      this.status = AgentStatus.STARTING;
      
      // Set up event subscriptions
      await this.setupSubscriptions();
      
      // Initialize agent-specific resources
      await this.initialize();
      
      this.status = AgentStatus.ACTIVE;
      
      // Announce agent startup
      await this.eventBus.publish(
        EventTypes.AGENT_STARTED,
        { agentId: this.config.id, name: this.config.name },
        this.config.id
      );

      console.log(`Agent ${this.config.name} (${this.config.id}) started successfully`);
    } catch (error) {
      this.status = AgentStatus.ERROR;
      console.error(`Failed to start agent ${this.config.name}:`, error);
      throw error;
    }
  }

  /**
   * Stop the agent and clean up resources
   */
  async stop(): Promise<void> {
    try {
      // Clean up subscriptions
      for (const subscriptionId of this.subscriptions) {
        this.eventBus.unsubscribe(subscriptionId);
      }
      this.subscriptions = [];
      
      // Agent-specific cleanup
      await this.cleanup();
      
      this.status = AgentStatus.STOPPED;
      
      // Announce agent shutdown
      await this.eventBus.publish(
        EventTypes.AGENT_STOPPED,
        { agentId: this.config.id, name: this.config.name },
        this.config.id
      );

      console.log(`Agent ${this.config.name} (${this.config.id}) stopped successfully`);
    } catch (error) {
      console.error(`Error stopping agent ${this.config.name}:`, error);
      this.status = AgentStatus.ERROR;
      throw error;
    }
  }

  /**
   * Get current agent status and metrics
   */
  getStatus(): {
    id: string;
    name: string;
    status: AgentStatus;
    metrics: AgentMetrics;
  } {
    return {
      id: this.config.id,
      name: this.config.name,
      status: this.status,
      metrics: { ...this.metrics }
    };
  }

  /**
   * Subscribe to an event type with error handling and metrics
   */
  protected subscribeToEvent(
    eventType: string,
    handler: (event: Event) => Promise<void>
  ): void {
    const wrappedHandler = async (event: Event) => {
      const startTime = Date.now();
      
      try {
        this.status = AgentStatus.ACTIVE;
        this.metrics.lastActive = new Date();
        
        await handler(event);
        
        // Update success metrics
        this.metrics.tasksCompleted++;
        const responseTime = Date.now() - startTime;
        this.updateResponseTimeMetrics(responseTime);
        
        this.status = AgentStatus.IDLE;
      } catch (error) {
        this.metrics.errorCount++;
        this.status = AgentStatus.ERROR;
        
        console.error(`Error in ${this.config.name} handling ${eventType}:`, error);
        
        // Publish error event for monitoring
        await this.eventBus.publish(
          EventTypes.AGENT_ERROR,
          {
            agentId: this.config.id,
            eventType,
            error: error instanceof Error ? error.message : String(error)
          },
          this.config.id
        );
        
        // Attempt recovery
        setTimeout(() => {
          if (this.status === AgentStatus.ERROR) {
            this.status = AgentStatus.IDLE;
          }
        }, 5000);
      }
    };

    const subscriptionId = this.eventBus.subscribe(eventType, wrappedHandler, this.config.id);
    this.subscriptions.push(subscriptionId);
  }

  /**
   * Publish an event with automatic agent ID
   */
  protected async publishEvent(
    eventType: string,
    data: any,
    metadata?: any
  ): Promise<void> {
    await this.eventBus.publish(eventType, data, this.config.id, metadata);
  }

  /**
   * Generate embeddings using LLM provider
   */
  protected async generateEmbedding(text: string): Promise<number[] | null> {
    if (!this.llm) return null;
    
    try {
      return await this.llm.generateEmbedding(text);
    } catch (error) {
      console.error(`Error generating embedding in ${this.config.name}:`, error);
      return null;
    }
  }

  /**
   * Generate text using LLM provider
   */
  protected async generateText(prompt: string, options?: any): Promise<string | null> {
    if (!this.llm) return null;
    
    try {
      return await this.llm.generateText(prompt, options);
    } catch (error) {
      console.error(`Error generating text in ${this.config.name}:`, error);
      return null;
    }
  }

  /**
   * Update response time metrics
   */
  private updateResponseTimeMetrics(responseTime: number): void {
    this.responseTimeSamples.push(responseTime);
    if (this.responseTimeSamples.length > this.maxSamples) {
      this.responseTimeSamples.shift();
    }
    
    const sum = this.responseTimeSamples.reduce((a, b) => a + b, 0);
    this.metrics.averageResponseTime = sum / this.responseTimeSamples.length;
    
    // Update success rate
    const totalTasks = this.metrics.tasksCompleted + this.metrics.errorCount;
    this.metrics.successRate = totalTasks > 0 
      ? this.metrics.tasksCompleted / totalTasks 
      : 0;
  }

  /**
   * Abstract methods to be implemented by concrete agents
   */
  protected abstract setupSubscriptions(): Promise<void>;
  protected abstract initialize(): Promise<void>;
  protected abstract cleanup(): Promise<void>;
}

/**
 * Agent factory for creating and managing agent instances
 */
export class AgentManager {
  private agents: Map<string, BaseAgent> = new Map();
  private readonly eventBus: EventBus;
  private readonly knowledgeGraph: KnowledgeGraph;

  constructor(eventBus: EventBus, knowledgeGraph: KnowledgeGraph) {
    this.eventBus = eventBus;
    this.knowledgeGraph = knowledgeGraph;
  }

  /**
   * Register and start an agent
   */
  async registerAgent(
    AgentClass: new (config: AgentConfig) => BaseAgent,
    config: Partial<AgentConfig>
  ): Promise<string> {
    const agentConfig: AgentConfig = {
      id: config.id || `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: config.name || 'Unnamed Agent',
      description: config.description || '',
      eventBus: this.eventBus,
      knowledgeGraph: this.knowledgeGraph,
      llmProvider: config.llmProvider
    };

    const agent = new AgentClass(agentConfig);
    await agent.start();
    
    this.agents.set(agentConfig.id, agent);
    return agentConfig.id;
  }

  /**
   * Stop and unregister an agent
   */
  async unregisterAgent(agentId: string): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    await agent.stop();
    this.agents.delete(agentId);
    return true;
  }

  /**
   * Get agent status
   */
  getAgentStatus(agentId: string) {
    const agent = this.agents.get(agentId);
    return agent ? agent.getStatus() : null;
  }

  /**
   * Get all agent statuses
   */
  getAllAgentStatuses() {
    const statuses: any[] = [];
    for (const agent of this.agents.values()) {
      statuses.push(agent.getStatus());
    }
    return statuses;
  }

  /**
   * Stop all agents
   */
  async shutdown(): Promise<void> {
    const stopPromises = Array.from(this.agents.values()).map(agent => agent.stop());
    await Promise.allSettled(stopPromises);
    this.agents.clear();
  }
}