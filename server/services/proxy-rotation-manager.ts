export interface ProxyConfig {
  id: string;
  server: string;
  port: number;
  username?: string;
  password?: string;
  type: 'http' | 'https' | 'socks5';
  country?: string;
  region?: string;
  city?: string;
  provider: 'residential' | 'mobile' | 'datacenter';
  speed: number; // ms response time
  reliability: number; // 0-100 success rate
  lastUsed: Date;
  failureCount: number;
  active: boolean;
  maxConcurrentSessions: number;
  currentSessions: number;
}

export interface ProxyHealth {
  id: string;
  isOnline: boolean;
  responseTime: number;
  lastChecked: Date;
  errorRate: number;
  ipAddress: string;
  location: {
    country: string;
    region: string;
    city: string;
    timezone: string;
  };
  reputation: 'good' | 'moderate' | 'poor' | 'blacklisted';
}

export interface ProxyRotationStrategy {
  type: 'round_robin' | 'random' | 'health_based' | 'geographic' | 'sticky_session';
  accountId?: string;
  platform?: string;
  preferences: {
    preferredCountries?: string[];
    minSpeed?: number;
    minReliability?: number;
    maxFailures?: number;
    sessionDuration?: number; // minutes
  };
}

export class ProxyRotationManager {
  private proxies: Map<string, ProxyConfig> = new Map();
  private healthStatus: Map<string, ProxyHealth> = new Map();
  private accountProxyMapping: Map<string, string> = new Map(); // accountId -> proxyId
  private proxyUsageHistory: Map<string, Date[]> = new Map();
  private blacklistedIPs: Set<string> = new Set();

  constructor() {
    this.startHealthMonitoring();
  }

  /**
   * Add a proxy to the rotation pool
   */
  addProxy(proxy: ProxyConfig): void {
    this.proxies.set(proxy.id, proxy);
    this.initializeProxyHealth(proxy.id);
  }

  /**
   * Remove a proxy from the pool
   */
  removeProxy(proxyId: string): void {
    this.proxies.delete(proxyId);
    this.healthStatus.delete(proxyId);
    this.proxyUsageHistory.delete(proxyId);
    
    // Remove from account mappings
    for (const [accountId, mappedProxyId] of Array.from(this.accountProxyMapping.entries())) {
      if (mappedProxyId === proxyId) {
        this.accountProxyMapping.delete(accountId);
      }
    }
  }

  /**
   * Get the best proxy for an account based on strategy
   */
  async getBestProxy(
    accountId: string,
    strategy: ProxyRotationStrategy = { type: 'health_based', preferences: {} }
  ): Promise<ProxyConfig | null> {
    const availableProxies = Array.from(this.proxies.values())
      .filter(proxy => this.isProxyAvailable(proxy, strategy.preferences));

    if (availableProxies.length === 0) {
      console.warn('No available proxies found');
      return null;
    }

    let selectedProxy: ProxyConfig;

    switch (strategy.type) {
      case 'round_robin':
        selectedProxy = this.selectRoundRobin(availableProxies);
        break;
      
      case 'random':
        selectedProxy = this.selectRandom(availableProxies);
        break;
      
      case 'health_based':
        selectedProxy = this.selectHealthBased(availableProxies);
        break;
      
      case 'geographic':
        selectedProxy = this.selectGeographic(availableProxies, strategy.preferences);
        break;
      
      case 'sticky_session':
        selectedProxy = await this.selectStickySession(accountId, availableProxies, strategy.preferences);
        break;
      
      default:
        selectedProxy = this.selectHealthBased(availableProxies);
    }

    // Update usage tracking
    this.updateProxyUsage(selectedProxy.id);
    this.accountProxyMapping.set(accountId, selectedProxy.id);

    return selectedProxy;
  }

  /**
   * Get current proxy for an account
   */
  getCurrentProxy(accountId: string): ProxyConfig | null {
    const proxyId = this.accountProxyMapping.get(accountId);
    return proxyId ? this.proxies.get(proxyId) || null : null;
  }

  /**
   * Force rotation for an account (e.g., after errors or detection)
   */
  async forceRotation(
    accountId: string,
    strategy: ProxyRotationStrategy = { type: 'health_based', preferences: {} }
  ): Promise<ProxyConfig | null> {
    // Remove current mapping
    const currentProxyId = this.accountProxyMapping.get(accountId);
    this.accountProxyMapping.delete(accountId);

    // Add current proxy to temporary blacklist for this account
    if (currentProxyId) {
      this.temporarilyBlacklistProxy(currentProxyId, 30); // 30 minutes
    }

    // Get new proxy
    return await this.getBestProxy(accountId, strategy);
  }

  /**
   * Report proxy failure
   */
  async reportProxyFailure(proxyId: string, errorType: string): Promise<void> {
    const proxy = this.proxies.get(proxyId);
    if (!proxy) return;

    proxy.failureCount += 1;
    proxy.lastUsed = new Date();

    // Update health status
    const health = this.healthStatus.get(proxyId);
    if (health) {
      health.errorRate = Math.min(100, health.errorRate + 5);
      health.reputation = this.calculateReputation(health.errorRate);
    }

    // Auto-disable proxy if too many failures
    if (proxy.failureCount >= 10) {
      proxy.active = false;
      console.warn(`Proxy ${proxyId} disabled due to excessive failures`);
    }

    // Blacklist IP temporarily for severe errors
    if (errorType === 'blocked' || errorType === 'banned') {
      this.temporarilyBlacklistProxy(proxyId, 120); // 2 hours
    }
  }

  /**
   * Report successful proxy usage
   */
  async reportProxySuccess(proxyId: string, responseTime: number): Promise<void> {
    const proxy = this.proxies.get(proxyId);
    if (!proxy) return;

    proxy.lastUsed = new Date();
    proxy.speed = (proxy.speed + responseTime) / 2; // Moving average
    
    // Reduce failure count on success
    if (proxy.failureCount > 0) {
      proxy.failureCount = Math.max(0, proxy.failureCount - 1);
    }

    // Update health status
    const health = this.healthStatus.get(proxyId);
    if (health) {
      health.responseTime = responseTime;
      health.errorRate = Math.max(0, health.errorRate - 2);
      health.lastChecked = new Date();
      health.reputation = this.calculateReputation(health.errorRate);
    }
  }

  /**
   * Get proxy pool statistics
   */
  getProxyPoolStats(): {
    total: number;
    active: number;
    healthy: number;
    byType: Record<string, number>;
    byProvider: Record<string, number>;
    averageSpeed: number;
    averageReliability: number;
  } {
    const proxies = Array.from(this.proxies.values());
    const healthyProxies = proxies.filter(p => p.active && p.reliability > 80 && p.failureCount < 5);

    const byType: Record<string, number> = {};
    const byProvider: Record<string, number> = {};

    proxies.forEach(proxy => {
      byType[proxy.type] = (byType[proxy.type] || 0) + 1;
      byProvider[proxy.provider] = (byProvider[proxy.provider] || 0) + 1;
    });

    return {
      total: proxies.length,
      active: proxies.filter(p => p.active).length,
      healthy: healthyProxies.length,
      byType,
      byProvider,
      averageSpeed: proxies.reduce((sum, p) => sum + p.speed, 0) / proxies.length || 0,
      averageReliability: proxies.reduce((sum, p) => sum + p.reliability, 0) / proxies.length || 0,
    };
  }

  /**
   * Get proxy health reports
   */
  getProxyHealthReports(): ProxyHealth[] {
    return Array.from(this.healthStatus.values())
      .sort((a, b) => b.lastChecked.getTime() - a.lastChecked.getTime());
  }

  /**
   * Test proxy connectivity and performance
   */
  async testProxy(proxyId: string): Promise<ProxyHealth | null> {
    const proxy = this.proxies.get(proxyId);
    if (!proxy) return null;

    try {
      const startTime = Date.now();
      
      // Test connectivity (you would implement actual HTTP request here)
      const testResult = await this.performConnectivityTest(proxy);
      
      const responseTime = Date.now() - startTime;
      
      const health: ProxyHealth = {
        id: proxyId,
        isOnline: testResult.success,
        responseTime,
        lastChecked: new Date(),
        errorRate: testResult.success ? 0 : 100,
        ipAddress: testResult.ipAddress || 'unknown',
        location: testResult.location || {
          country: proxy.country || 'unknown',
          region: proxy.region || 'unknown',
          city: proxy.city || 'unknown',
          timezone: 'UTC',
        },
        reputation: testResult.success ? 'good' : 'poor',
      };

      this.healthStatus.set(proxyId, health);
      return health;
    } catch (error) {
      console.error(`Error testing proxy ${proxyId}:`, error);
      return null;
    }
  }

  // Private helper methods

  private isProxyAvailable(proxy: ProxyConfig, preferences: any): boolean {
    if (!proxy.active) return false;
    if (proxy.currentSessions >= proxy.maxConcurrentSessions) return false;
    if (this.blacklistedIPs.has(proxy.id)) return false;
    
    if (preferences.minSpeed && proxy.speed > preferences.minSpeed) return false;
    if (preferences.minReliability && proxy.reliability < preferences.minReliability) return false;
    if (preferences.maxFailures && proxy.failureCount > preferences.maxFailures) return false;
    
    if (preferences.preferredCountries && preferences.preferredCountries.length > 0) {
      if (!preferences.preferredCountries.includes(proxy.country || '')) return false;
    }

    return true;
  }

  private selectRoundRobin(proxies: ProxyConfig[]): ProxyConfig {
    // Sort by last used time, select least recently used
    return proxies.sort((a, b) => a.lastUsed.getTime() - b.lastUsed.getTime())[0];
  }

  private selectRandom(proxies: ProxyConfig[]): ProxyConfig {
    return proxies[Math.floor(Math.random() * proxies.length)];
  }

  private selectHealthBased(proxies: ProxyConfig[]): ProxyConfig {
    // Weight by reliability and inverse of failure count and response time
    const weighted = proxies.map(proxy => ({
      proxy,
      score: (proxy.reliability * 2) - proxy.failureCount - (proxy.speed / 100),
    }));

    weighted.sort((a, b) => b.score - a.score);
    return weighted[0].proxy;
  }

  private selectGeographic(proxies: ProxyConfig[], preferences: any): ProxyConfig {
    if (preferences.preferredCountries && preferences.preferredCountries.length > 0) {
      const preferred = proxies.filter(p => 
        preferences.preferredCountries.includes(p.country || '')
      );
      if (preferred.length > 0) {
        return this.selectHealthBased(preferred);
      }
    }
    
    return this.selectHealthBased(proxies);
  }

  private async selectStickySession(
    accountId: string,
    proxies: ProxyConfig[],
    preferences: any
  ): Promise<ProxyConfig> {
    const currentProxyId = this.accountProxyMapping.get(accountId);
    const currentProxy = currentProxyId ? proxies.find(p => p.id === currentProxyId) : null;
    
    // If current proxy is still healthy, keep using it
    if (currentProxy && this.isProxyHealthy(currentProxy)) {
      return currentProxy;
    }
    
    // Otherwise select new best proxy
    return this.selectHealthBased(proxies);
  }

  private isProxyHealthy(proxy: ProxyConfig): boolean {
    return proxy.active && 
           proxy.reliability > 70 && 
           proxy.failureCount < 5 &&
           proxy.currentSessions < proxy.maxConcurrentSessions;
  }

  private updateProxyUsage(proxyId: string): void {
    const proxy = this.proxies.get(proxyId);
    if (proxy) {
      proxy.currentSessions += 1;
      proxy.lastUsed = new Date();
      
      // Track usage history
      if (!this.proxyUsageHistory.has(proxyId)) {
        this.proxyUsageHistory.set(proxyId, []);
      }
      const history = this.proxyUsageHistory.get(proxyId)!;
      history.push(new Date());
      
      // Keep only last 100 usage records
      if (history.length > 100) {
        history.shift();
      }
    }
  }

  private temporarilyBlacklistProxy(proxyId: string, minutes: number): void {
    this.blacklistedIPs.add(proxyId);
    setTimeout(() => {
      this.blacklistedIPs.delete(proxyId);
    }, minutes * 60 * 1000);
  }

  private calculateReputation(errorRate: number): 'good' | 'moderate' | 'poor' | 'blacklisted' {
    if (errorRate === 100) return 'blacklisted';
    if (errorRate < 10) return 'good';
    if (errorRate < 30) return 'moderate';
    return 'poor';
  }

  private initializeProxyHealth(proxyId: string): void {
    this.healthStatus.set(proxyId, {
      id: proxyId,
      isOnline: false,
      responseTime: 0,
      lastChecked: new Date(0),
      errorRate: 0,
      ipAddress: 'unknown',
      location: {
        country: 'unknown',
        region: 'unknown',
        city: 'unknown',
        timezone: 'UTC',
      },
      reputation: 'moderate',
    });
  }

  private async performConnectivityTest(proxy: ProxyConfig): Promise<{
    success: boolean;
    ipAddress?: string;
    location?: {
      country: string;
      region: string;
      city: string;
      timezone: string;
    };
  }> {
    // This would implement actual connectivity testing
    // For now, return mock successful result
    return {
      success: true,
      ipAddress: '127.0.0.1',
      location: {
        country: proxy.country || 'JP',
        region: proxy.region || 'Tokyo',
        city: proxy.city || 'Tokyo',
        timezone: 'Asia/Tokyo',
      },
    };
  }

  private startHealthMonitoring(): void {
    // Monitor proxy health every 15 minutes
    setInterval(async () => {
      for (const proxyId of Array.from(this.proxies.keys())) {
        try {
          await this.testProxy(proxyId);
        } catch (error) {
          console.error(`Health check failed for proxy ${proxyId}:`, error);
        }
      }
    }, 15 * 60 * 1000);
  }
}