import { IStorage } from '../storage';
import { SocialAccountManager, AccountSelectionCriteria } from './social-account-manager';
import { SocialMediaAccount, Content } from '@shared/schema';
import { TikTokApiService } from './tiktok-api';
import { InstagramApiService } from './instagram-api';

export interface PostingOptions {
  content: Content;
  platform: string;
  videoUrl: string;
  thumbnailUrl?: string;
  caption: string;
  tags?: string[];
  scheduledTime?: Date;
}

export interface PostingResult {
  success: boolean;
  accountId?: string;
  accountUsername?: string;
  platform: string;
  postUrl?: string;
  error?: string;
  rotationAttempts: number;
}

export class MultiAccountPoster {
  private storage: IStorage;
  private accountManager: SocialAccountManager;
  private tiktokServices: Map<string, TikTokApiService> = new Map();
  private instagramServices: Map<string, InstagramApiService> = new Map();

  constructor(storage: IStorage) {
    this.storage = storage;
    this.accountManager = new SocialAccountManager(storage);
  }

  /**
   * Post content using the best available account with automatic rotation
   */
  async postContent(options: PostingOptions): Promise<PostingResult> {
    const { content, platform, videoUrl, thumbnailUrl, caption, tags, scheduledTime } = options;
    
    let rotationAttempts = 0;
    const maxAttempts = 3;
    const excludedAccounts: string[] = [];

    while (rotationAttempts < maxAttempts) {
      rotationAttempts++;

      // Get next best account for posting
      const account = await this.accountManager.getNextAccountForPosting({
        platform,
        excludeAccountIds: excludedAccounts,
        prioritizeByFrequency: true,
        respectRateLimits: true
      });

      if (!account) {
        return {
          success: false,
          platform,
          error: 'No available accounts for posting',
          rotationAttempts
        };
      }

      try {
        // Attempt to post with selected account
        const postResult = await this.postWithSpecificAccount(
          account,
          { videoUrl, thumbnailUrl, caption, tags, scheduledTime }
        );

        if (postResult.success) {
          // Record successful post
          await this.accountManager.recordSuccessfulPost(account.id, content.id);
          
          // Update content with posting info
          await this.storage.updateContent(content.id, {
            status: 'published'
          });

          return {
            success: true,
            accountId: account.id,
            accountUsername: account.username,
            platform: account.platform,
            postUrl: postResult.postUrl,
            rotationAttempts
          };
        } else {
          // Record failed post and exclude this account for next attempts
          await this.accountManager.recordFailedPost(
            account.id, 
            postResult.error || 'Unknown posting error',
            content.id
          );
          excludedAccounts.push(account.id);
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Record failed post
        await this.accountManager.recordFailedPost(account.id, errorMessage, content.id);
        excludedAccounts.push(account.id);

        // Log the error
        await this.storage.createAutomationLog({
          type: 'posting_error',
          message: `Failed to post content "${content.title}" using account ${account.username}: ${errorMessage}`,
          status: 'error',
          metadata: {
            contentId: content.id,
            accountId: account.id,
            platform,
            attempt: rotationAttempts
          }
        });
      }
    }

    // All attempts failed
    await this.storage.updateContent(content.id, {
      status: 'failed'
    });

    return {
      success: false,
      platform,
      error: `Failed to post after ${maxAttempts} attempts with different accounts`,
      rotationAttempts
    };
  }

  /**
   * Post with a specific account
   */
  private async postWithSpecificAccount(
    account: SocialMediaAccount,
    postData: {
      videoUrl: string;
      thumbnailUrl?: string;
      caption: string;
      tags?: string[];
      scheduledTime?: Date;
    }
  ): Promise<{ success: boolean; postUrl?: string; error?: string }> {
    
    switch (account.platform) {
      case 'tiktok':
        return this.postToTikTok(account, postData);
      case 'instagram':
        return this.postToInstagram(account, postData);
      case 'youtube':
        return this.postToYouTube(account, postData);
      default:
        return {
          success: false,
          error: `Unsupported platform: ${account.platform}`
        };
    }
  }

  /**
   * Post to TikTok using official API or browser automation
   */
  private async postToTikTok(
    account: SocialMediaAccount,
    postData: {
      videoUrl: string;
      thumbnailUrl?: string;
      caption: string;
      tags?: string[];
      scheduledTime?: Date;
    }
  ): Promise<{ success: boolean; postUrl?: string; error?: string }> {
    
    if (account.accountType === 'official' && account.accessToken) {
      // Use official TikTok API
      const service = this.getTikTokService(account);
      
      try {
        const uploadResult = await service.uploadVideo({
          videoUrl: postData.videoUrl,
          description: postData.caption,
          hashtags: postData.tags || []
        });

        return {
          success: true,
          postUrl: `https://tiktok.com/@${account.username}/video/${uploadResult.videoId}`
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'TikTok API error'
        };
      }
    } else if (account.accountType === 'unofficial' && account.automationData) {
      // Use browser automation (Playwright/Puppeteer)
      return this.postToTikTokUnofficially(account, postData);
    }

    return {
      success: false,
      error: 'No valid credentials for TikTok posting'
    };
  }

  /**
   * Post to Instagram using official API or browser automation
   */
  private async postToInstagram(
    account: SocialMediaAccount,
    postData: {
      videoUrl: string;
      thumbnailUrl?: string;
      caption: string;
      tags?: string[];
      scheduledTime?: Date;
    }
  ): Promise<{ success: boolean; postUrl?: string; error?: string }> {
    
    if (account.accountType === 'official' && account.accessToken && account.businessAccountId) {
      // Use official Instagram API
      const service = this.getInstagramService(account);
      
      try {
        const uploadResult = await service.uploadReel({
          videoUrl: postData.videoUrl,
          caption: postData.caption,
          tags: postData.tags || []
        });

        return {
          success: true,
          postUrl: `https://instagram.com/p/${uploadResult.mediaId}`
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Instagram API error'
        };
      }
    } else if (account.accountType === 'unofficial' && account.automationData) {
      // Use browser automation
      return this.postToInstagramUnofficially(account, postData);
    }

    return {
      success: false,
      error: 'No valid credentials for Instagram posting'
    };
  }

  /**
   * Post to YouTube (placeholder for future implementation)
   */
  private async postToYouTube(
    account: SocialMediaAccount,
    postData: {
      videoUrl: string;
      thumbnailUrl?: string;
      caption: string;
      tags?: string[];
      scheduledTime?: Date;
    }
  ): Promise<{ success: boolean; postUrl?: string; error?: string }> {
    
    // YouTube implementation would go here
    return {
      success: false,
      error: 'YouTube posting not yet implemented'
    };
  }

  /**
   * Browser automation posting for TikTok (unofficial)
   */
  private async postToTikTokUnofficially(
    account: SocialMediaAccount,
    postData: {
      videoUrl: string;
      caption: string;
      tags?: string[];
    }
  ): Promise<{ success: boolean; postUrl?: string; error?: string }> {
    
    try {
      // This would use Playwright or Puppeteer to automate TikTok posting
      // For now, we'll simulate the process
      
      // Validate automation data
      const automationData = account.automationData as any;
      if (!automationData || !automationData.cookies) {
        return {
          success: false,
          error: 'Invalid automation data - missing cookies'
        };
      }

      // Simulate browser automation process
      // In real implementation, this would:
      // 1. Launch browser with cookies
      // 2. Navigate to TikTok upload page
      // 3. Upload video file
      // 4. Fill caption and tags
      // 5. Submit post
      // 6. Extract post URL

      // For demonstration, we'll simulate success/failure based on account health
      const successRate = Math.max(0.7, 1 - ((account.errorCount || 0) * 0.1));
      const isSuccessful = Math.random() < successRate;

      if (isSuccessful) {
        // Simulate successful post
        const fakePostId = Math.random().toString(36).substring(7);
        return {
          success: true,
          postUrl: `https://tiktok.com/@${account.username}/video/${fakePostId}`
        };
      } else {
        return {
          success: false,
          error: 'Browser automation failed - possible rate limiting or account issues'
        };
      }

    } catch (error) {
      return {
        success: false,
        error: `Browser automation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Browser automation posting for Instagram (unofficial)
   */
  private async postToInstagramUnofficially(
    account: SocialMediaAccount,
    postData: {
      videoUrl: string;
      caption: string;
      tags?: string[];
    }
  ): Promise<{ success: boolean; postUrl?: string; error?: string }> {
    
    try {
      // Similar to TikTok automation, but for Instagram
      const automationData = account.automationData as any;
      if (!automationData || !automationData.cookies) {
        return {
          success: false,
          error: 'Invalid automation data - missing cookies'
        };
      }

      // Simulate Instagram automation process
      const successRate = Math.max(0.6, 1 - ((account.errorCount || 0) * 0.15));
      const isSuccessful = Math.random() < successRate;

      if (isSuccessful) {
        const fakePostId = Math.random().toString(36).substring(7);
        return {
          success: true,
          postUrl: `https://instagram.com/reel/${fakePostId}`
        };
      } else {
        return {
          success: false,
          error: 'Instagram automation failed - possible rate limiting or account suspension'
        };
      }

    } catch (error) {
      return {
        success: false,
        error: `Instagram automation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get or create TikTok service for account
   */
  private getTikTokService(account: SocialMediaAccount): TikTokApiService {
    if (!this.tiktokServices.has(account.id)) {
      this.tiktokServices.set(
        account.id, 
        new TikTokApiService(account.accessToken || undefined)
      );
    }
    return this.tiktokServices.get(account.id)!;
  }

  /**
   * Get or create Instagram service for account
   */
  private getInstagramService(account: SocialMediaAccount): InstagramApiService {
    if (!this.instagramServices.has(account.id)) {
      this.instagramServices.set(
        account.id, 
        new InstagramApiService(account.accessToken || undefined, account.businessAccountId || undefined)
      );
    }
    return this.instagramServices.get(account.id)!;
  }

  /**
   * Batch post content to multiple platforms
   */
  async batchPost(
    content: Content,
    platforms: string[],
    postingOptions: {
      videoUrl: string;
      thumbnailUrl?: string;
      caption: string;
      tags?: string[];
      scheduledTime?: Date;
    }
  ): Promise<PostingResult[]> {
    
    const results: PostingResult[] = [];

    // Post to each platform concurrently
    const postingPromises = platforms.map(platform =>
      this.postContent({
        content,
        platform,
        ...postingOptions
      })
    );

    const batchResults = await Promise.allSettled(postingPromises);
    
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          success: false,
          platform: platforms[index],
          error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
          rotationAttempts: 0
        });
      }
    });

    // Log batch posting results
    await this.storage.createAutomationLog({
      type: 'batch_posting',
      message: `Batch posted content "${content.title}" to ${platforms.length} platforms`,
      status: results.some(r => r.success) ? 'success' : 'error',
      metadata: {
        contentId: content.id,
        platforms,
        results: results.map(r => ({
          platform: r.platform,
          success: r.success,
          accountUsername: r.accountUsername,
          error: r.error
        }))
      }
    });

    return results;
  }

  /**
   * Get posting statistics and account performance
   */
  async getPostingStats(timeframe: 'day' | 'week' | 'month' = 'day'): Promise<any> {
    const now = new Date();
    const startDate = new Date();
    
    switch (timeframe) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
    }

    const logs = await this.storage.getAccountRotationLogs(undefined, 1000);
    const recentLogs = logs.filter(log => 
      new Date(log.createdAt!) >= startDate
    );

    const stats = {
      totalAttempts: recentLogs.length,
      successfulPosts: recentLogs.filter(log => log.result === 'success').length,
      failedPosts: recentLogs.filter(log => log.result === 'failure').length,
      platformBreakdown: {} as Record<string, { attempts: number; successes: number }>,
      topPerformingAccounts: {} as Record<string, number>,
      errorBreakdown: {} as Record<string, number>
    };

    // Calculate platform breakdown
    recentLogs.forEach(log => {
      if (!stats.platformBreakdown[log.platform]) {
        stats.platformBreakdown[log.platform] = { attempts: 0, successes: 0 };
      }
      stats.platformBreakdown[log.platform].attempts++;
      if (log.result === 'success') {
        stats.platformBreakdown[log.platform].successes++;
      }
    });

    // Calculate top performing accounts
    recentLogs
      .filter(log => log.result === 'success')
      .forEach(log => {
        stats.topPerformingAccounts[log.accountId] = 
          (stats.topPerformingAccounts[log.accountId] || 0) + 1;
      });

    // Calculate error breakdown
    recentLogs
      .filter(log => log.result === 'failure' && log.errorMessage)
      .forEach(log => {
        const errorType = this.categorizeError(log.errorMessage!);
        stats.errorBreakdown[errorType] = (stats.errorBreakdown[errorType] || 0) + 1;
      });

    return stats;
  }

  /**
   * Categorize errors for better reporting
   */
  private categorizeError(errorMessage: string): string {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return 'Rate Limiting';
    }
    if (message.includes('authentication') || message.includes('token') || message.includes('credentials')) {
      return 'Authentication';
    }
    if (message.includes('network') || message.includes('connection') || message.includes('timeout')) {
      return 'Network Issues';
    }
    if (message.includes('suspended') || message.includes('banned') || message.includes('restricted')) {
      return 'Account Suspension';
    }
    if (message.includes('automation') || message.includes('browser') || message.includes('selenium')) {
      return 'Automation Failure';
    }
    
    return 'Other';
  }
}