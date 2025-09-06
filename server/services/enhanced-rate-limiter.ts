import { Redis } from 'ioredis';

export interface PlatformLimits {
  dailyPosts: number;
  hourlyPosts: number;
  dailyFollows: number;
  hourlyFollows: number;
  dailyLikes: number;
  hourlyLikes: number;
  dailyComments: number;
  hourlyComments: number;
  minDelayBetweenActions: number; // milliseconds
  maxDelayBetweenActions: number; // milliseconds
}

export interface ActionResult {
  success: boolean;
  rateLimited: boolean;
  retryAfter?: number; // seconds
  currentCount: number;
  limit: number;
  resetTime: Date;
}

export interface AccountHealth {
  accountId: string;
  platform: string;
  healthScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  lastActivity: Date;
  actionsToday: number;
  suspiciousActivity: boolean;
  captchaCount: number;
  consecutiveErrors: number;
  warnings: string[];
}

export class EnhancedRateLimiter {
  private redis: Redis | null = null;
  private memoryStore: Map<string, any> = new Map();
  private useMemory: boolean = true;

  // Platform-specific rate limits based on research
  private platformLimits: Record<string, PlatformLimits> = {
    'tiktok': {
      dailyPosts: 10,
      hourlyPosts: 3,
      dailyFollows: 200,
      hourlyFollows: 50,
      dailyLikes: 500,
      hourlyLikes: 100,
      dailyComments: 50,
      hourlyComments: 15,
      minDelayBetweenActions: 3000,
      maxDelayBetweenActions: 8000,
    },
    'instagram': {
      dailyPosts: 8,
      hourlyPosts: 2,
      dailyFollows: 150,
      hourlyFollows: 20,
      dailyLikes: 300,
      hourlyLikes: 60,
      dailyComments: 30,
      hourlyComments: 8,
      minDelayBetweenActions: 5000,
      maxDelayBetweenActions: 12000,
    },
    'youtube': {
      dailyPosts: 3,
      hourlyPosts: 1,
      dailyFollows: 100,
      hourlyFollows: 15,
      dailyLikes: 200,
      hourlyLikes: 40,
      dailyComments: 20,
      hourlyComments: 5,
      minDelayBetweenActions: 10000,
      maxDelayBetweenActions: 20000,
    },
    'facebook': {
      dailyPosts: 25,
      hourlyPosts: 5,
      dailyFollows: 100,
      hourlyFollows: 25,
      dailyLikes: 500,
      hourlyLikes: 100,
      dailyComments: 50,
      hourlyComments: 12,
      minDelayBetweenActions: 4000,
      maxDelayBetweenActions: 10000,
    },
    'linkedin': {
      dailyPosts: 5,
      hourlyPosts: 2,
      dailyFollows: 100,
      hourlyFollows: 15,
      dailyLikes: 200,
      hourlyLikes: 40,
      dailyComments: 25,
      hourlyComments: 8,
      minDelayBetweenActions: 6000,
      maxDelayBetweenActions: 15000,
    },
    'twitter': {
      dailyPosts: 50,
      hourlyPosts: 10,
      dailyFollows: 400,
      hourlyFollows: 100,
      dailyLikes: 1000,
      hourlyLikes: 200,
      dailyComments: 100,
      hourlyComments: 25,
      minDelayBetweenActions: 2000,
      maxDelayBetweenActions: 6000,
    },
  };

  constructor(redisUrl?: string) {
    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl);
        this.useMemory = false;
      } catch (error) {
        console.warn('Failed to connect to Redis, falling back to memory storage:', error);
        this.useMemory = true;
      }
    }
  }

  /**
   * Check if an action is allowed for an account on a platform
   */
  async checkRateLimit(
    accountId: string,
    platform: string,
    action: 'post' | 'follow' | 'like' | 'comment'
  ): Promise<ActionResult> {
    const limits = this.platformLimits[platform];
    if (!limits) {
      return {
        success: false,
        rateLimited: true,
        currentCount: 0,
        limit: 0,
        resetTime: new Date(),
      };
    }

    const now = new Date();
    const hourKey = `${accountId}:${platform}:${action}:${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;
    const dayKey = `${accountId}:${platform}:${action}:${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

    // Get current counts
    const hourlyCount = await this.getCount(hourKey);
    const dailyCount = await this.getCount(dayKey);

    // Get limits for this action
    const hourlyLimit = this.getActionLimit(limits, action, 'hourly');
    const dailyLimit = this.getActionLimit(limits, action, 'daily');

    // Check if within limits
    if (hourlyCount >= hourlyLimit) {
      const resetTime = new Date(now);
      resetTime.setHours(now.getHours() + 1, 0, 0, 0);
      
      return {
        success: false,
        rateLimited: true,
        retryAfter: Math.ceil((resetTime.getTime() - now.getTime()) / 1000),
        currentCount: hourlyCount,
        limit: hourlyLimit,
        resetTime,
      };
    }

    if (dailyCount >= dailyLimit) {
      const resetTime = new Date(now);
      resetTime.setDate(now.getDate() + 1);
      resetTime.setHours(0, 0, 0, 0);
      
      return {
        success: false,
        rateLimited: true,
        retryAfter: Math.ceil((resetTime.getTime() - now.getTime()) / 1000),
        currentCount: dailyCount,
        limit: dailyLimit,
        resetTime,
      };
    }

    // Check account health before allowing action
    const accountHealth = await this.getAccountHealth(accountId, platform);
    if (accountHealth.riskLevel === 'critical') {
      return {
        success: false,
        rateLimited: true,
        retryAfter: 3600, // Wait 1 hour for critical accounts
        currentCount: dailyCount,
        limit: dailyLimit,
        resetTime: new Date(now.getTime() + 3600000),
      };
    }

    // Apply risk-based throttling
    const riskMultiplier = this.getRiskMultiplier(accountHealth.riskLevel);
    const adjustedDelay = Math.floor(limits.minDelayBetweenActions * riskMultiplier);

    // Check minimum delay between actions
    const lastActionKey = `${accountId}:${platform}:last_action`;
    const lastActionTime = await this.getNumber(lastActionKey) || 0;
    const timeSinceLastAction = now.getTime() - lastActionTime;

    if (timeSinceLastAction < adjustedDelay) {
      const waitTime = Math.ceil((adjustedDelay - timeSinceLastAction) / 1000);
      return {
        success: false,
        rateLimited: true,
        retryAfter: waitTime,
        currentCount: dailyCount,
        limit: dailyLimit,
        resetTime: new Date(now.getTime() + (adjustedDelay - timeSinceLastAction)),
      };
    }

    // Action is allowed
    return {
      success: true,
      rateLimited: false,
      currentCount: dailyCount,
      limit: dailyLimit,
      resetTime: new Date(now.getTime() + 86400000), // Tomorrow
    };
  }

  /**
   * Record an action for rate limiting
   */
  async recordAction(
    accountId: string,
    platform: string,
    action: 'post' | 'follow' | 'like' | 'comment',
    success: boolean = true
  ): Promise<void> {
    const now = new Date();
    const hourKey = `${accountId}:${platform}:${action}:${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;
    const dayKey = `${accountId}:${platform}:${action}:${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    const lastActionKey = `${accountId}:${platform}:last_action`;

    // Increment counters
    await this.increment(hourKey, 3600); // Expire after 1 hour
    await this.increment(dayKey, 86400); // Expire after 24 hours
    await this.setNumber(lastActionKey, now.getTime(), 86400);

    // Update account health
    await this.updateAccountHealth(accountId, platform, action, success);
  }

  /**
   * Get account health status
   */
  async getAccountHealth(accountId: string, platform: string): Promise<AccountHealth> {
    const healthKey = `${accountId}:${platform}:health`;
    const healthData = await this.getObject(healthKey);

    if (!healthData) {
      // Initialize new account health
      const newHealth: AccountHealth = {
        accountId,
        platform,
        healthScore: 100,
        riskLevel: 'low',
        lastActivity: new Date(),
        actionsToday: 0,
        suspiciousActivity: false,
        captchaCount: 0,
        consecutiveErrors: 0,
        warnings: [],
      };
      
      await this.setObject(healthKey, newHealth, 86400);
      return newHealth;
    }

    return {
      ...healthData,
      lastActivity: new Date(healthData.lastActivity),
    };
  }

  /**
   * Update account health after an action
   */
  async updateAccountHealth(
    accountId: string,
    platform: string,
    action: string,
    success: boolean
  ): Promise<void> {
    const health = await this.getAccountHealth(accountId, platform);
    const now = new Date();
    
    // Update basic metrics
    health.lastActivity = now;
    health.actionsToday += 1;

    if (success) {
      // Reset consecutive errors on success
      health.consecutiveErrors = 0;
      
      // Improve health score slightly
      health.healthScore = Math.min(100, health.healthScore + 0.5);
    } else {
      // Track errors
      health.consecutiveErrors += 1;
      health.healthScore = Math.max(0, health.healthScore - 5);

      if (health.consecutiveErrors >= 5) {
        health.warnings.push(`${health.consecutiveErrors} consecutive errors at ${now.toISOString()}`);
        health.suspiciousActivity = true;
      }
    }

    // Calculate risk level
    health.riskLevel = this.calculateRiskLevel(health);

    // Keep only recent warnings (last 10)
    health.warnings = health.warnings.slice(-10);

    // Save updated health
    const healthKey = `${accountId}:${platform}:health`;
    await this.setObject(healthKey, health, 86400);
  }

  /**
   * Record CAPTCHA encounter
   */
  async recordCaptcha(accountId: string, platform: string): Promise<void> {
    const health = await this.getAccountHealth(accountId, platform);
    health.captchaCount += 1;
    health.healthScore = Math.max(0, health.healthScore - 10);
    health.suspiciousActivity = true;
    health.warnings.push(`CAPTCHA encountered at ${new Date().toISOString()}`);

    const healthKey = `${accountId}:${platform}:health`;
    await this.setObject(healthKey, health, 86400);
  }

  /**
   * Calculate human-like delay with jitter
   */
  getHumanDelay(platform: string, riskLevel: string = 'low'): number {
    const limits = this.platformLimits[platform];
    if (!limits) return 5000;

    const riskMultiplier = this.getRiskMultiplier(riskLevel as any);
    const baseDelay = limits.minDelayBetweenActions;
    const maxDelay = limits.maxDelayBetweenActions;
    
    // Add randomization and risk adjustment
    const randomDelay = baseDelay + Math.random() * (maxDelay - baseDelay);
    return Math.floor(randomDelay * riskMultiplier);
  }

  /**
   * Get exponential backoff delay for errors
   */
  getExponentialBackoffDelay(attemptNumber: number, baseDelayMs: number = 1000): number {
    const maxDelay = 300000; // 5 minutes max
    const delay = Math.min(baseDelayMs * Math.pow(2, attemptNumber), maxDelay);
    
    // Add jitter (±25%)
    const jitter = delay * 0.25 * (Math.random() - 0.5);
    return Math.floor(delay + jitter);
  }

  // Private helper methods
  private calculateRiskLevel(health: AccountHealth): 'low' | 'medium' | 'high' | 'critical' {
    if (health.healthScore >= 80 && health.consecutiveErrors === 0 && health.captchaCount === 0) {
      return 'low';
    }
    if (health.healthScore >= 60 && health.consecutiveErrors < 3 && health.captchaCount < 2) {
      return 'medium';
    }
    if (health.healthScore >= 30 && health.consecutiveErrors < 8 && health.captchaCount < 5) {
      return 'high';
    }
    return 'critical';
  }

  private getRiskMultiplier(riskLevel: 'low' | 'medium' | 'high' | 'critical'): number {
    switch (riskLevel) {
      case 'low': return 1.0;
      case 'medium': return 1.5;
      case 'high': return 2.0;
      case 'critical': return 3.0;
      default: return 1.0;
    }
  }

  private getActionLimit(limits: PlatformLimits, action: string, period: 'hourly' | 'daily'): number {
    const key = `${period}${action.charAt(0).toUpperCase() + action.slice(1)}s` as keyof PlatformLimits;
    return limits[key] as number || 0;
  }

  // Storage abstraction methods
  private async getCount(key: string): Promise<number> {
    if (this.useMemory) {
      return this.memoryStore.get(key) || 0;
    } else if (this.redis) {
      const value = await this.redis.get(key);
      return parseInt(value || '0', 10);
    }
    return 0;
  }

  private async increment(key: string, ttl: number): Promise<number> {
    if (this.useMemory) {
      const current = this.memoryStore.get(key) || 0;
      const newValue = current + 1;
      this.memoryStore.set(key, newValue);
      
      // Simple TTL simulation for memory
      setTimeout(() => {
        this.memoryStore.delete(key);
      }, ttl * 1000);
      
      return newValue;
    } else if (this.redis) {
      const newValue = await this.redis.incr(key);
      await this.redis.expire(key, ttl);
      return newValue;
    }
    return 1;
  }

  private async getNumber(key: string): Promise<number | null> {
    if (this.useMemory) {
      return this.memoryStore.get(key) || null;
    } else if (this.redis) {
      const value = await this.redis.get(key);
      return value ? parseInt(value, 10) : null;
    }
    return null;
  }

  private async setNumber(key: string, value: number, ttl: number): Promise<void> {
    if (this.useMemory) {
      this.memoryStore.set(key, value);
      setTimeout(() => {
        this.memoryStore.delete(key);
      }, ttl * 1000);
    } else if (this.redis) {
      await this.redis.setex(key, ttl, value.toString());
    }
  }

  private async getObject(key: string): Promise<any> {
    if (this.useMemory) {
      return this.memoryStore.get(key);
    } else if (this.redis) {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    }
    return null;
  }

  private async setObject(key: string, value: any, ttl: number): Promise<void> {
    if (this.useMemory) {
      this.memoryStore.set(key, value);
      setTimeout(() => {
        this.memoryStore.delete(key);
      }, ttl * 1000);
    } else if (this.redis) {
      await this.redis.setex(key, ttl, JSON.stringify(value));
    }
  }
}