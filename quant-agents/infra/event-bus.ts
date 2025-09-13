import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface Event {
  id: string;
  type: string;
  timestamp: Date;
  agentId: string;
  data: any;
  metadata?: any;
}

export type EventHandler = (event: Event) => Promise<void> | void;

export interface EventSubscription {
  id: string;
  eventType: string;
  handler: EventHandler;
  agentId: string;
}

/**
 * Core event bus for inter-agent communication
 * Manages typed events and subscriptions across the agent system
 */
export class EventBus extends EventEmitter {
  private subscriptions: Map<string, EventSubscription[]> = new Map();
  private eventHistory: Event[] = [];
  private readonly maxHistorySize = 10000;

  constructor() {
    super();
    this.setMaxListeners(100); // Support many agents
  }

  /**
   * Subscribe to events of a specific type
   */
  subscribe(eventType: string, handler: EventHandler, agentId: string): string {
    const subscriptionId = uuidv4();
    const subscription: EventSubscription = {
      id: subscriptionId,
      eventType,
      handler,
      agentId
    };

    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }

    this.subscriptions.get(eventType)!.push(subscription);
    
    // Also use EventEmitter for built-in event handling
    this.on(eventType, handler);
    
    return subscriptionId;
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(subscriptionId: string): boolean {
    for (const [eventType, subs] of this.subscriptions.entries()) {
      const index = subs.findIndex(sub => sub.id === subscriptionId);
      if (index !== -1) {
        const sub = subs[index];
        subs.splice(index, 1);
        this.off(eventType, sub.handler);
        return true;
      }
    }
    return false;
  }

  /**
   * Publish an event to all subscribers
   */
  async publish(eventType: string, data: any, agentId: string, metadata?: any): Promise<void> {
    const event: Event = {
      id: uuidv4(),
      type: eventType,
      timestamp: new Date(),
      agentId,
      data,
      metadata
    };

    // Add to history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Emit to subscribers
    this.emit(eventType, event);

    // Handle subscriptions with error isolation
    const subscriptions = this.subscriptions.get(eventType) || [];
    const promises = subscriptions.map(async (sub) => {
      try {
        await sub.handler(event);
      } catch (error) {
        console.error(`Error in event handler for ${eventType}:`, error);
        // Emit error event for monitoring
        this.emit('agent.error', {
          ...event,
          error,
          failedAgentId: sub.agentId
        });
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Get recent events matching criteria
   */
  getEvents(filter?: {
    type?: string;
    agentId?: string;
    since?: Date;
    limit?: number;
  }): Event[] {
    let events = [...this.eventHistory];

    if (filter?.type) {
      events = events.filter(e => e.type === filter.type);
    }
    if (filter?.agentId) {
      events = events.filter(e => e.agentId === filter.agentId);
    }
    if (filter?.since) {
      events = events.filter(e => e.timestamp >= filter.since!);
    }

    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return filter?.limit ? events.slice(0, filter.limit) : events;
  }

  /**
   * Get subscription statistics
   */
  getStats(): {
    totalSubscriptions: number;
    subscriptionsByType: Record<string, number>;
    recentEventCount: number;
  } {
    const totalSubscriptions = Array.from(this.subscriptions.values())
      .reduce((total, subs) => total + subs.length, 0);

    const subscriptionsByType: Record<string, number> = {};
    for (const [type, subs] of this.subscriptions.entries()) {
      subscriptionsByType[type] = subs.length;
    }

    return {
      totalSubscriptions,
      subscriptionsByType,
      recentEventCount: this.eventHistory.length
    };
  }

  /**
   * Clear event history (for cleanup)
   */
  clearHistory(): void {
    this.eventHistory = [];
  }
}

// Event type constants
export const EventTypes = {
  // Data events
  DATA_INGESTED: 'data.ingested',
  DATA_QUALITY_FLAG: 'data.quality_flag',
  
  // Macro events
  MACRO_NARRATIVE_UPDATED: 'macro.narrative_updated',
  
  // Regime events
  REGIME_STATE_CHANGE: 'regime.state_change',
  
  // Factor events
  FACTOR_CANDIDATE: 'factor.candidate',
  FACTOR_VALIDATED: 'factor.validated',
  
  // Strategy events
  STRATEGY_DRAFT: 'strategy.draft',
  STRATEGY_EVOLVED: 'strategy.evolved',
  STRATEGY_ROBUSTNESS_REPORT: 'strategy.robustness_report',
  
  // Risk events
  RISK_ALERT: 'risk.alert',
  DECAY_ALERT: 'decay.alert',
  
  // Stress testing
  STRESS_RESULT: 'stress.result',
  
  // Portfolio events
  PORTFOLIO_ALLOCATION_UPDATE: 'portfolio.allocation_update',
  
  // Meta events
  META_ROLE_SCORE_UPDATE: 'meta.role_score_update',
  
  // System events
  AGENT_ERROR: 'agent.error',
  AGENT_STARTED: 'agent.started',
  AGENT_STOPPED: 'agent.stopped'
} as const;

// Global event bus instance
export const eventBus = new EventBus();