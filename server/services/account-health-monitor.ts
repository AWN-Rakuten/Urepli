import { EnhancedRateLimiter, AccountHealth } from './enhanced-rate-limiter';

export interface HealthAlert {
  id: string;
  accountId: string;
  platform: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  type: 'rate_limit' | 'captcha' | 'error_spike' | 'suspicious_activity' | 'account_warning' | 'low_success_rate';
  message: string;
  timestamp: Date;
  resolved: boolean;
  actionRequired: string[];
}

export interface AccountStats {
  accountId: string;
  platform: string;
  todayStats: {
    posts: number;
    follows: number;
    likes: number;
    comments: number;
    errors: number;
    captchas: number;
  };
  weeklyStats: {
    posts: number;
    follows: number;
    likes: number;
    comments: number;
    errors: number;
    captchas: number;
  };
  successRates: {
    overall: number;
    posts: number;
    follows: number;
    likes: number;
    comments: number;
  };
  trends: {
    direction: 'improving' | 'stable' | 'declining';
    score: number;
  };
}

export interface HealthRecommendation {
  type: 'immediate' | 'scheduled' | 'optional';
  action: string;
  description: string;
  expectedImpact: string;
  timeframe: string;
}

export class AccountHealthMonitor {
  private rateLimiter: EnhancedRateLimiter;
  private alerts: Map<string, HealthAlert[]> = new Map();
  private healthHistory: Map<string, AccountHealth[]> = new Map();

  constructor(rateLimiter: EnhancedRateLimiter) {
    this.rateLimiter = rateLimiter;
    
    // Start background monitoring
    this.startHealthMonitoring();
  }

  /**
   * Get comprehensive health report for an account
   */
  async getHealthReport(accountId: string, platform: string): Promise<{
    health: AccountHealth;
    stats: AccountStats;
    alerts: HealthAlert[];
    recommendations: HealthRecommendation[];
    predictions: {
      nextWeekRisk: 'low' | 'medium' | 'high' | 'critical';
      recommendedActions: number;
      expectedHealthScore: number;
    };
  }> {
    const health = await this.rateLimiter.getAccountHealth(accountId, platform);
    const stats = await this.getAccountStats(accountId, platform);
    const alerts = this.getActiveAlerts(accountId, platform);
    const recommendations = this.generateRecommendations(health, stats, alerts);
    const predictions = this.predictFutureHealth(health, stats);

    return {
      health,
      stats,
      alerts,
      recommendations,
      predictions,
    };
  }

  /**
   * Monitor all accounts and generate alerts
   */
  async monitorAllAccounts(accounts: Array<{ id: string; platform: string }>): Promise<HealthAlert[]> {
    const newAlerts: HealthAlert[] = [];

    for (const account of accounts) {
      try {
        const health = await this.rateLimiter.getAccountHealth(account.id, account.platform);
        const accountAlerts = await this.analyzeHealthForAlerts(account.id, account.platform, health);
        newAlerts.push(...accountAlerts);
      } catch (error) {
        console.error(`Error monitoring account ${account.id} on ${account.platform}:`, error);
        
        newAlerts.push({
          id: `${account.id}_${account.platform}_${Date.now()}`,
          accountId: account.id,
          platform: account.platform,
          severity: 'error',
          type: 'account_warning',
          message: 'Failed to monitor account health',
          timestamp: new Date(),
          resolved: false,
          actionRequired: ['Check account connection', 'Verify credentials'],
        });
      }
    }

    // Store new alerts
    for (const alert of newAlerts) {
      this.addAlert(alert);
    }

    return newAlerts;
  }

  /**
   * Get account performance statistics
   */
  private async getAccountStats(accountId: string, platform: string): Promise<AccountStats> {
    // This would typically fetch from your database
    // For now, return mock data structure
    return {
      accountId,
      platform,
      todayStats: {
        posts: 0,
        follows: 0,
        likes: 0,
        comments: 0,
        errors: 0,
        captchas: 0,
      },
      weeklyStats: {
        posts: 0,
        follows: 0,
        likes: 0,
        comments: 0,
        errors: 0,
        captchas: 0,
      },
      successRates: {
        overall: 85,
        posts: 90,
        follows: 80,
        likes: 88,
        comments: 85,
      },
      trends: {
        direction: 'stable',
        score: 0,
      },
    };
  }

  /**
   * Analyze account health and generate alerts
   */
  private async analyzeHealthForAlerts(accountId: string, platform: string, health: AccountHealth): Promise<HealthAlert[]> {
    const alerts: HealthAlert[] = [];
    const now = new Date();

    // Critical health score
    if (health.healthScore < 30) {
      alerts.push({
        id: `${accountId}_${platform}_critical_health_${now.getTime()}`,
        accountId,
        platform,
        severity: 'critical',
        type: 'suspicious_activity',
        message: `Account health critically low (${health.healthScore}/100). Immediate intervention required.`,
        timestamp: now,
        resolved: false,
        actionRequired: [
          'Pause all automation',
          'Manual account review',
          'Check for platform restrictions',
          'Consider account recovery actions',
        ],
      });
    }

    // High error rate
    if (health.consecutiveErrors >= 5) {
      alerts.push({
        id: `${accountId}_${platform}_error_spike_${now.getTime()}`,
        accountId,
        platform,
        severity: 'error',
        type: 'error_spike',
        message: `${health.consecutiveErrors} consecutive errors detected. Account may be restricted.`,
        timestamp: now,
        resolved: false,
        actionRequired: [
          'Review error logs',
          'Check account credentials',
          'Reduce activity rate',
          'Verify proxy functionality',
        ],
      });
    }

    // CAPTCHA frequency
    if (health.captchaCount >= 3) {
      alerts.push({
        id: `${accountId}_${platform}_captcha_${now.getTime()}`,
        accountId,
        platform,
        severity: 'warning',
        type: 'captcha',
        message: `${health.captchaCount} CAPTCHAs encountered. Bot detection likely.`,
        timestamp: now,
        resolved: false,
        actionRequired: [
          'Switch to different proxy',
          'Change browser fingerprint',
          'Reduce automation frequency',
          'Manual verification may be needed',
        ],
      });
    }

    // Suspicious activity warning
    if (health.suspiciousActivity && health.riskLevel !== 'low') {
      alerts.push({
        id: `${accountId}_${platform}_suspicious_${now.getTime()}`,
        accountId,
        platform,
        severity: 'warning',
        type: 'suspicious_activity',
        message: `Suspicious activity detected. Risk level: ${health.riskLevel}`,
        timestamp: now,
        resolved: false,
        actionRequired: [
          'Review recent actions',
          'Implement longer delays',
          'Consider temporary pause',
          'Monitor closely',
        ],
      });
    }

    // Rate limit approaching
    if (health.actionsToday > 0) {
      const limits = this.getEstimatedDailyLimits(platform);
      const usagePercentage = (health.actionsToday / limits) * 100;
      
      if (usagePercentage > 80) {
        alerts.push({
          id: `${accountId}_${platform}_rate_limit_${now.getTime()}`,
          accountId,
          platform,
          severity: usagePercentage > 95 ? 'error' : 'warning',
          type: 'rate_limit',
          message: `Daily limit ${usagePercentage.toFixed(1)}% reached (${health.actionsToday}/${limits} actions)`,
          timestamp: now,
          resolved: false,
          actionRequired: [
            'Reduce posting frequency',
            'Spread actions across multiple accounts',
            'Review daily quotas',
          ],
        });
      }
    }

    return alerts;
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(health: AccountHealth, stats: AccountStats, alerts: HealthAlert[]): HealthRecommendation[] {
    const recommendations: HealthRecommendation[] = [];

    // Critical health recommendations
    if (health.healthScore < 50) {
      recommendations.push({
        type: 'immediate',
        action: 'Reduce Activity',
        description: 'Immediately reduce automation frequency by 50% to prevent account suspension',
        expectedImpact: 'Prevent further health degradation and potential account loss',
        timeframe: 'Next 24 hours',
      });
    }

    // Error rate recommendations
    if (health.consecutiveErrors >= 3) {
      recommendations.push({
        type: 'immediate',
        action: 'Investigate Errors',
        description: 'Review error logs and fix underlying issues causing repeated failures',
        expectedImpact: 'Stop error cascade and improve success rate by 20-30%',
        timeframe: 'Next 2-4 hours',
      });
    }

    // CAPTCHA recommendations
    if (health.captchaCount > 1) {
      recommendations.push({
        type: 'scheduled',
        action: 'Rotate Proxies and Fingerprints',
        description: 'Change IP address and browser fingerprint to avoid detection',
        expectedImpact: 'Reduce CAPTCHA encounters by 60-80%',
        timeframe: 'Within 6 hours',
      });
    }

    // Performance optimization
    if (stats.successRates.overall < 85) {
      recommendations.push({
        type: 'optional',
        action: 'Optimize Timing',
        description: 'Adjust posting schedule to match platform peak activity times',
        expectedImpact: 'Improve success rate by 10-15%',
        timeframe: 'Next week',
      });
    }

    // Risk level specific recommendations
    switch (health.riskLevel) {
      case 'high':
        recommendations.push({
          type: 'immediate',
          action: 'Enable Conservative Mode',
          description: 'Triple normal delays between actions and reduce daily quotas by 70%',
          expectedImpact: 'Prevent account suspension and gradually restore trust',
          timeframe: 'Next 48 hours',
        });
        break;
      
      case 'critical':
        recommendations.push({
          type: 'immediate',
          action: 'Emergency Pause',
          description: 'Completely stop automation for 24-48 hours to reset platform algorithms',
          expectedImpact: 'Prevent permanent account ban',
          timeframe: 'Immediately',
        });
        break;
    }

    return recommendations;
  }

  /**
   * Predict future account health
   */
  private predictFutureHealth(health: AccountHealth, stats: AccountStats): {
    nextWeekRisk: 'low' | 'medium' | 'high' | 'critical';
    recommendedActions: number;
    expectedHealthScore: number;
  } {
    let futureHealthScore = health.healthScore;
    let riskLevel = health.riskLevel;

    // Factor in current trends
    if (health.consecutiveErrors > 0) {
      futureHealthScore -= health.consecutiveErrors * 2;
    }

    if (health.captchaCount > 0) {
      futureHealthScore -= health.captchaCount * 5;
    }

    if (stats.successRates.overall > 90) {
      futureHealthScore += 5;
    } else if (stats.successRates.overall < 70) {
      futureHealthScore -= 10;
    }

    // Predict risk level
    if (futureHealthScore < 30) {
      riskLevel = 'critical';
    } else if (futureHealthScore < 50) {
      riskLevel = 'high';
    } else if (futureHealthScore < 70) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    const recommendedActions = riskLevel === 'low' ? 0 : 
                             riskLevel === 'medium' ? 1 : 
                             riskLevel === 'high' ? 3 : 5;

    return {
      nextWeekRisk: riskLevel,
      recommendedActions,
      expectedHealthScore: Math.max(0, Math.min(100, futureHealthScore)),
    };
  }

  /**
   * Background health monitoring
   */
  private startHealthMonitoring(): void {
    setInterval(async () => {
      try {
        // This would fetch all active accounts from your database
        const accounts = await this.getActiveAccounts();
        await this.monitorAllAccounts(accounts);
        
        // Cleanup old alerts (older than 7 days)
        this.cleanupOldAlerts();
      } catch (error) {
        console.error('Background health monitoring error:', error);
      }
    }, 300000); // Every 5 minutes
  }

  private async getActiveAccounts(): Promise<Array<{ id: string; platform: string }>> {
    // This should integrate with your actual account storage
    return [];
  }

  private addAlert(alert: HealthAlert): void {
    const key = `${alert.accountId}_${alert.platform}`;
    if (!this.alerts.has(key)) {
      this.alerts.set(key, []);
    }
    this.alerts.get(key)!.push(alert);
  }

  private getActiveAlerts(accountId: string, platform: string): HealthAlert[] {
    const key = `${accountId}_${platform}`;
    return this.alerts.get(key)?.filter(alert => !alert.resolved) || [];
  }

  private cleanupOldAlerts(): void {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    for (const [key, alerts] of Array.from(this.alerts.entries())) {
      const filteredAlerts = alerts.filter((alert: HealthAlert) => alert.timestamp > weekAgo);
      if (filteredAlerts.length === 0) {
        this.alerts.delete(key);
      } else {
        this.alerts.set(key, filteredAlerts);
      }
    }
  }

  private getEstimatedDailyLimits(platform: string): number {
    // Estimated total daily actions per platform
    const limits: Record<string, number> = {
      'tiktok': 760, // 10 posts + 200 follows + 500 likes + 50 comments
      'instagram': 488, // 8 posts + 150 follows + 300 likes + 30 comments
      'youtube': 323, // 3 posts + 100 follows + 200 likes + 20 comments
      'facebook': 675, // 25 posts + 100 follows + 500 likes + 50 comments
      'linkedin': 330, // 5 posts + 100 follows + 200 likes + 25 comments
      'twitter': 1550, // 50 posts + 400 follows + 1000 likes + 100 comments
    };
    
    return limits[platform] || 300;
  }
}