import { EnhancedBrowserAutomation, BrowserOptions } from './enhanced-browser-automation';
import { EnhancedRateLimiter, ActionResult } from './enhanced-rate-limiter';
import { AccountHealthMonitor } from './account-health-monitor';
import { ProxyRotationManager, ProxyConfig, ProxyRotationStrategy } from './proxy-rotation-manager';
import { AIContentOptimizer, ContentVariation } from './ai-content-optimizer';

export interface PostingAccount {
  id: string;
  platform: 'tiktok' | 'instagram' | 'youtube' | 'facebook' | 'linkedin' | 'twitter';
  credentials: {
    username: string;
    password: string;
    accessToken?: string;
    refreshToken?: string;
  };
  status: 'active' | 'suspended' | 'limited' | 'error' | 'maintenance';
  lastUsed: Date;
  priority: number; // 1-10, higher = preferred
  dailyQuota: number;
  usedQuota: number;
  proxy?: ProxyConfig;
  healthScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface PostingTask {
  id: string;
  accountId: string;
  platform: string;
  content: {
    text: string;
    media?: string[];
    optimizedVersions?: ContentVariation[];
  };
  scheduled: Date;
  priority: number;
  maxRetries: number;
  currentRetries: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  errors: string[];
  metadata: {
    campaignId?: string;
    contentType: 'post' | 'story' | 'reel' | 'video';
    estimatedEngagement?: number;
  };
}

export interface PostingResult {
  success: boolean;
  accountId: string;
  platform: string;
  postId?: string;
  error?: string;
  metrics?: {
    responseTime: number;
    attempts: number;
    proxyUsed?: string;
    captchaEncountered: boolean;
  };
}

export class EnhancedMultiAccountPoster {
  private browser: EnhancedBrowserAutomation;
  private rateLimiter: EnhancedRateLimiter;
  private healthMonitor: AccountHealthMonitor;
  private proxyManager: ProxyRotationManager;
  private contentOptimizer: AIContentOptimizer;
  
  private accounts: Map<string, PostingAccount> = new Map();
  private activeTasks: Map<string, PostingTask> = new Map();
  private completedTasks: Map<string, PostingResult> = new Map();
  
  private isProcessing: boolean = false;
  private processingQueue: PostingTask[] = [];

  constructor() {
    this.rateLimiter = new EnhancedRateLimiter();
    this.healthMonitor = new AccountHealthMonitor(this.rateLimiter);
    this.proxyManager = new ProxyRotationManager();
    this.contentOptimizer = new AIContentOptimizer();
    this.browser = new EnhancedBrowserAutomation();

    // Start background processing
    this.startBackgroundProcessing();
  }

  /**
   * Add an account to the posting pool
   */
  addAccount(account: PostingAccount): void {
    this.accounts.set(account.id, account);
    console.log(`Added account ${account.id} for ${account.platform}`);
  }

  /**
   * Remove an account from the pool
   */
  removeAccount(accountId: string): void {
    this.accounts.delete(accountId);
    // Cancel pending tasks for this account
    this.processingQueue = this.processingQueue.filter(task => task.accountId !== accountId);
    console.log(`Removed account ${accountId}`);
  }

  /**
   * Schedule a post with intelligent account selection and optimization
   */
  async schedulePost(task: PostingTask): Promise<string> {
    // Optimize content for the platform
    if (!task.content.optimizedVersions) {
      task.content.optimizedVersions = await this.contentOptimizer.optimizeContent(
        task.content.text,
        task.platform,
        task.metadata.contentType
      );
    }

    // Add to processing queue
    this.processingQueue.push(task);
    this.activeTasks.set(task.id, task);

    console.log(`Scheduled task ${task.id} for ${task.platform} at ${task.scheduled}`);
    return task.id;
  }

  /**
   * Post immediately with best available account
   */
  async postNow(
    platform: string,
    content: {
      text: string;
      media?: string[];
    },
    options: {
      contentType?: 'post' | 'story' | 'reel' | 'video';
      priority?: number;
      maxRetries?: number;
    } = {}
  ): Promise<PostingResult> {
    const task: PostingTask = {
      id: `immediate_${Date.now()}`,
      accountId: '', // Will be selected
      platform,
      content,
      scheduled: new Date(),
      priority: options.priority || 5,
      maxRetries: options.maxRetries || 3,
      currentRetries: 0,
      status: 'pending',
      errors: [],
      metadata: {
        contentType: options.contentType || 'post',
      },
    };

    return await this.executePostingTask(task);
  }

  /**
   * Get the best available account for a platform
   */
  async selectBestAccount(platform: string, excludeAccounts: string[] = []): Promise<PostingAccount | null> {
    const platformAccounts = Array.from(this.accounts.values())
      .filter(account => 
        account.platform === platform &&
        account.status === 'active' &&
        !excludeAccounts.includes(account.id)
      );

    if (platformAccounts.length === 0) {
      return null;
    }

    // Score accounts based on multiple factors
    const scoredAccounts = await Promise.all(
      platformAccounts.map(async (account) => {
        // Check rate limits
        const rateLimitCheck = await this.rateLimiter.checkRateLimit(account.id, platform, 'post');
        if (rateLimitCheck.rateLimited) {
          return { account, score: -1 }; // Skip rate-limited accounts
        }

        // Get account health
        const health = await this.rateLimiter.getAccountHealth(account.id, platform);
        
        // Calculate composite score
        let score = 0;
        
        // Health score (0-40 points)
        score += health.healthScore * 0.4;
        
        // Priority weight (0-20 points)
        score += account.priority * 2;
        
        // Usage efficiency (0-20 points)
        const usageRatio = account.usedQuota / account.dailyQuota;
        score += (1 - usageRatio) * 20;
        
        // Risk penalty (-50 to 0 points)
        const riskPenalty = {
          'low': 0,
          'medium': -10,
          'high': -25,
          'critical': -50,
        }[health.riskLevel];
        score += riskPenalty;
        
        // Recent success bonus (0-10 points)
        if (health.consecutiveErrors === 0) {
          score += 10;
        }
        
        // Last used penalty (prefer less recently used accounts)
        const hoursAgo = (Date.now() - account.lastUsed.getTime()) / (1000 * 60 * 60);
        if (hoursAgo > 2) {
          score += Math.min(10, hoursAgo);
        }

        return { account, score };
      })
    );

    // Filter out rate-limited accounts and sort by score
    const availableAccounts = scoredAccounts
      .filter(item => item.score >= 0)
      .sort((a, b) => b.score - a.score);

    return availableAccounts.length > 0 ? availableAccounts[0].account : null;
  }

  /**
   * Execute a posting task with full automation and error handling
   */
  private async executePostingTask(task: PostingTask): Promise<PostingResult> {
    const startTime = Date.now();
    let account: PostingAccount | null = null;
    let proxy: ProxyConfig | null = null;
    let captchaEncountered = false;

    try {
      // Select best account if not already assigned
      if (!task.accountId) {
        account = await this.selectBestAccount(task.platform);
        if (!account) {
          throw new Error(`No available accounts for ${task.platform}`);
        }
        task.accountId = account.id;
      } else {
        account = this.accounts.get(task.accountId) || null;
        if (!account) {
          throw new Error(`Account ${task.accountId} not found`);
        }
      }

      // Check rate limits
      const rateLimitResult = await this.rateLimiter.checkRateLimit(
        account.id,
        task.platform,
        'post'
      );

      if (rateLimitResult.rateLimited) {
        throw new Error(`Rate limited: retry in ${rateLimitResult.retryAfter} seconds`);
      }

      // Get optimal proxy
      const proxyStrategy: ProxyRotationStrategy = {
        type: 'health_based',
        accountId: account.id,
        platform: task.platform,
        preferences: {
          minReliability: 80,
          maxFailures: 3,
          preferredCountries: ['JP', 'US'], // Japanese market focus
        },
      };

      proxy = await this.proxyManager.getBestProxy(account.id, proxyStrategy);
      
      // Prepare browser options
      const browserOptions: BrowserOptions = {
        headless: true,
        proxy: proxy ? {
          server: `${proxy.server}:${proxy.port}`,
          username: proxy.username,
          password: proxy.password,
        } : undefined,
        geolocation: {
          latitude: 35.6762 + (Math.random() - 0.5) * 0.01, // Tokyo area with variation
          longitude: 139.6503 + (Math.random() - 0.5) * 0.01,
        },
        timezone: 'Asia/Tokyo',
        locale: 'ja-JP',
      };

      // Launch browser with enhanced stealth
      await this.browser.launchBrowser(account.id, browserOptions);

      // Select best content variation
      const content = this.selectBestContent(task);

      // Execute platform-specific posting
      const postId = await this.executePlatformPosting(account, content, task);

      // Record successful action
      await this.rateLimiter.recordAction(account.id, task.platform, 'post', true);
      
      if (proxy) {
        await this.proxyManager.reportProxySuccess(proxy.id, Date.now() - startTime);
      }

      // Update account usage
      account.usedQuota += 1;
      account.lastUsed = new Date();
      account.healthScore = Math.min(100, account.healthScore + 2);

      const result: PostingResult = {
        success: true,
        accountId: account.id,
        platform: task.platform,
        postId,
        metrics: {
          responseTime: Date.now() - startTime,
          attempts: task.currentRetries + 1,
          proxyUsed: proxy?.id,
          captchaEncountered,
        },
      };

      this.completedTasks.set(task.id, result);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Posting failed for task ${task.id}:`, errorMessage);

      // Record failed action
      if (account) {
        await this.rateLimiter.recordAction(account.id, task.platform, 'post', false);
        
        // Check if error indicates CAPTCHA
        if (errorMessage.toLowerCase().includes('captcha')) {
          await this.rateLimiter.recordCaptcha(account.id, task.platform);
          captchaEncountered = true;
        }
      }

      // Report proxy failure
      if (proxy && account) {
        let errorType = 'general';
        if (errorMessage.includes('blocked') || errorMessage.includes('banned')) {
          errorType = 'blocked';
        }
        await this.proxyManager.reportProxyFailure(proxy.id, errorType);
      }

      // Update task for retry or failure
      task.currentRetries += 1;
      task.errors.push(`Attempt ${task.currentRetries}: ${errorMessage}`);

      if (task.currentRetries < task.maxRetries) {
        // Schedule retry with exponential backoff
        const delay = this.rateLimiter.getExponentialBackoffDelay(task.currentRetries);
        task.scheduled = new Date(Date.now() + delay);
        task.status = 'pending';
        
        // Force proxy rotation for retry
        if (account) {
          const retryProxyStrategy: ProxyRotationStrategy = {
            type: 'health_based',
            accountId: account.id,
            platform: task.platform,
            preferences: {
              minReliability: 80,
              maxFailures: 3,
            },
          };
          await this.proxyManager.forceRotation(account.id, retryProxyStrategy);
        }
      } else {
        task.status = 'failed';
      }

      const result: PostingResult = {
        success: false,
        accountId: account?.id || task.accountId,
        platform: task.platform,
        error: errorMessage,
        metrics: {
          responseTime: Date.now() - startTime,
          attempts: task.currentRetries,
          proxyUsed: proxy?.id,
          captchaEncountered,
        },
      };

      this.completedTasks.set(task.id, result);
      return result;

    } finally {
      // Always cleanup browser
      await this.browser.closeBrowser();
      
      // Update task status
      this.activeTasks.delete(task.id);
    }
  }

  /**
   * Select the best content variation for posting
   */
  private selectBestContent(task: PostingTask): string {
    if (!task.content.optimizedVersions || task.content.optimizedVersions.length === 0) {
      return task.content.text;
    }

    // Select variation with highest expected improvement
    const bestVariation = task.content.optimizedVersions
      .sort((a, b) => b.expectedImprovement - a.expectedImprovement)[0];

    return bestVariation.optimizedContent;
  }

  /**
   * Execute platform-specific posting logic
   */
  private async executePlatformPosting(
    account: PostingAccount,
    content: string,
    task: PostingTask
  ): Promise<string> {
    switch (account.platform) {
      case 'instagram':
        return await this.postToInstagram(account, content, task);
      case 'tiktok':
        return await this.postToTikTok(account, content, task);
      case 'youtube':
        return await this.postToYouTube(account, content, task);
      case 'facebook':
        return await this.postToFacebook(account, content, task);
      case 'linkedin':
        return await this.postToLinkedIn(account, content, task);
      case 'twitter':
        return await this.postToTwitter(account, content, task);
      default:
        throw new Error(`Unsupported platform: ${account.platform}`);
    }
  }

  // Platform-specific posting methods (enhanced with stealth automation)

  private async postToInstagram(account: PostingAccount, content: string, task: PostingTask): Promise<string> {
    await this.browser.navigateTo('https://www.instagram.com/accounts/login/');
    
    // Check for challenges
    const challenge = await this.browser.detectChallenge();
    if (challenge.type) {
      throw new Error(`Instagram challenge detected: ${challenge.type}`);
    }

    // Login
    await this.browser.humanType('input[name="username"]', account.credentials.username);
    await this.browser.humanType('input[name="password"]', account.credentials.password);
    await this.browser.humanClick('button[type="submit"]');

    // Wait for home page
    const loginSuccess = await this.browser.waitForElement('svg[aria-label="Home"]', 15000);
    if (!loginSuccess) {
      throw new Error('Instagram login failed');
    }

    // Navigate to create post
    await this.browser.humanClick('svg[aria-label="New post"]');
    
    // Handle media upload if present
    if (task.content.media && task.content.media.length > 0) {
      // This would handle media upload logic
      console.log('Media upload not implemented in this demo');
    }

    // Add caption
    await this.browser.humanType('textarea[aria-label="Write a caption..."]', content);
    
    // Post
    await this.browser.humanClick('button:has-text("Share")');
    
    // Wait for success and extract post ID
    await this.browser.humanDelay(3000, 5000);
    
    return `ig_${Date.now()}`; // Mock post ID
  }

  private async postToTikTok(account: PostingAccount, content: string, task: PostingTask): Promise<string> {
    await this.browser.navigateTo('https://www.tiktok.com/login');
    
    // Login logic similar to Instagram
    // This would be implemented with TikTok-specific selectors
    
    return `tt_${Date.now()}`; // Mock post ID
  }

  private async postToYouTube(account: PostingAccount, content: string, task: PostingTask): Promise<string> {
    // YouTube posting implementation
    return `yt_${Date.now()}`; // Mock post ID
  }

  private async postToFacebook(account: PostingAccount, content: string, task: PostingTask): Promise<string> {
    // Facebook posting implementation
    return `fb_${Date.now()}`; // Mock post ID
  }

  private async postToLinkedIn(account: PostingAccount, content: string, task: PostingTask): Promise<string> {
    // LinkedIn posting implementation
    return `li_${Date.now()}`; // Mock post ID
  }

  private async postToTwitter(account: PostingAccount, content: string, task: PostingTask): Promise<string> {
    // Twitter posting implementation
    return `tw_${Date.now()}`; // Mock post ID
  }

  /**
   * Background processing of queued tasks
   */
  private startBackgroundProcessing(): void {
    setInterval(async () => {
      if (this.isProcessing || this.processingQueue.length === 0) {
        return;
      }

      this.isProcessing = true;
      
      try {
        // Get tasks ready to be processed
        const now = new Date();
        const readyTasks = this.processingQueue
          .filter(task => task.scheduled <= now && task.status === 'pending')
          .sort((a, b) => b.priority - a.priority); // Higher priority first

        // Process up to 3 tasks simultaneously (different accounts)
        const activeBatches = new Map<string, PostingTask>();
        const tasksToProcess: PostingTask[] = [];

        for (const task of readyTasks) {
          const key = `${task.accountId}_${task.platform}`;
          if (!activeBatches.has(key) && tasksToProcess.length < 3) {
            activeBatches.set(key, task);
            tasksToProcess.push(task);
          }
        }

        // Execute tasks
        const results = await Promise.allSettled(
          tasksToProcess.map(task => this.executePostingTask(task))
        );

        // Remove processed tasks from queue
        this.processingQueue = this.processingQueue.filter(
          task => !tasksToProcess.includes(task) || task.status === 'pending'
        );

        console.log(`Processed ${results.length} tasks. Queue size: ${this.processingQueue.length}`);

      } catch (error) {
        console.error('Background processing error:', error);
      } finally {
        this.isProcessing = false;
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Get system status and statistics
   */
  getSystemStats(): {
    accounts: {
      total: number;
      active: number;
      byPlatform: Record<string, number>;
      averageHealth: number;
    };
    queue: {
      pending: number;
      processing: number;
      completed: number;
      failed: number;
    };
    proxies: ReturnType<ProxyRotationManager['getProxyPoolStats']>;
    performance: {
      successRate: number;
      averageResponseTime: number;
      dailyPosts: number;
    };
  } {
    const accounts = Array.from(this.accounts.values());
    const activeAccounts = accounts.filter(a => a.status === 'active');
    
    const byPlatform: Record<string, number> = {};
    accounts.forEach(account => {
      byPlatform[account.platform] = (byPlatform[account.platform] || 0) + 1;
    });

    const averageHealth = accounts.reduce((sum, acc) => sum + acc.healthScore, 0) / accounts.length || 0;
    
    const completedResults = Array.from(this.completedTasks.values());
    const successfulPosts = completedResults.filter(r => r.success);
    const successRate = completedResults.length > 0 ? (successfulPosts.length / completedResults.length) * 100 : 0;
    
    const averageResponseTime = successfulPosts.reduce((sum, r) => 
      sum + (r.metrics?.responseTime || 0), 0) / successfulPosts.length || 0;

    // Count posts from last 24 hours
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const dailyPosts = completedResults.filter(r => 
      r.success && new Date(r.metrics?.responseTime || 0).getTime() > dayAgo
    ).length;

    return {
      accounts: {
        total: accounts.length,
        active: activeAccounts.length,
        byPlatform,
        averageHealth,
      },
      queue: {
        pending: this.processingQueue.filter(t => t.status === 'pending').length,
        processing: this.processingQueue.filter(t => t.status === 'in_progress').length,
        completed: this.processingQueue.filter(t => t.status === 'completed').length,
        failed: this.processingQueue.filter(t => t.status === 'failed').length,
      },
      proxies: this.proxyManager.getProxyPoolStats(),
      performance: {
        successRate,
        averageResponseTime,
        dailyPosts,
      },
    };
  }
}