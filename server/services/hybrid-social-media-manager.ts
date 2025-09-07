import { SocialMediaManager } from './social-media-manager';
import { BrowserAutomationService } from './browser-automation';
import { OAuthManager } from './oauth-manager';
import { storage } from '../storage';

export class HybridSocialMediaManager {
  private apiManager: SocialMediaManager;
  private browserAutomation: BrowserAutomationService;
  private oauthManager: OAuthManager;

  constructor() {
    this.apiManager = new SocialMediaManager();
    this.browserAutomation = new BrowserAutomationService();
    this.oauthManager = new OAuthManager();
  }

  /**
   * Connect account using preferred method (API first, browser as fallback)
   */
  async connectAccount(platform: 'tiktok' | 'instagram', method: 'api' | 'browser', credentials: any): Promise<{
    success: boolean;
    account?: any;
    error?: string;
    method: 'api' | 'browser';
  }> {
    try {
      if (method === 'api') {
        // Try OAuth API connection first
        if (this.oauthManager.isConfigured(platform)) {
          const { authUrl } = await this.oauthManager.generateAuthUrl(platform, credentials.userId);
          return {
            success: true,
            account: { authUrl, requiresRedirect: true },
            method: 'api'
          };
        } else {
          throw new Error(`${platform} API not configured`);
        }
      } else {
        // Use browser automation
        const session = platform === 'tiktok' 
          ? await this.browserAutomation.loginToTikTok(credentials)
          : await this.browserAutomation.loginToInstagram(credentials);

        const account = await storage.createSocialMediaAccount({
          name: `${platform} - ${credentials.username} (Browser)`,
          platform,
          username: credentials.username,
          accountType: 'unofficial',
          isActive: true,
          postingPriority: 1,
          maxDailyPosts: platform === 'tiktok' ? 10 : 25,
          automationData: {
            sessionId: session.id,
            cookies: session.cookies,
            userAgent: session.userAgent,
            lastLogin: session.createdAt
          }
        });

        return {
          success: true,
          account,
          method: 'browser'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        method
      };
    }
  }

  /**
   * Post content using best available method for the account
   */
  async postContent(accountId: string, content: {
    type: 'video' | 'image';
    filePath: string;
    caption: string;
    hashtags: string[];
    location?: string;
  }): Promise<{
    success: boolean;
    postId?: string;
    error?: string;
    method: 'api' | 'browser';
  }> {
    try {
      const account = await storage.getSocialMediaAccount(accountId);
      if (!account) {
        throw new Error('Account not found');
      }

      if (account.accountType === 'official' && account.accessToken) {
        // Use API method
        try {
          const result = await this.postViaAPI(account, content);
          return {
            success: true,
            postId: result.postId,
            method: 'api'
          };
        } catch (apiError) {
          // Fallback to browser if API fails and browser session exists
          if (account.automationData?.sessionId) {
            const result = await this.postViaBrowser(account, content);
            return {
              success: result.success,
              postId: result.postId,
              error: result.error,
              method: 'browser'
            };
          }
          throw apiError;
        }
      } else if (account.accountType === 'unofficial' && account.automationData?.sessionId) {
        // Use browser automation
        const result = await this.postViaBrowser(account, content);
        return {
          success: result.success,
          postId: result.postId,
          error: result.error,
          method: 'browser'
        };
      } else {
        throw new Error('No valid authentication method available');
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        method: 'api' // default
      };
    }
  }

  /**
   * Verify account status using all available methods
   */
  async verifyAccount(accountId: string): Promise<{
    isValid: boolean;
    method: 'api' | 'browser';
    details?: any;
    canPost?: boolean;
    restrictions?: string[];
  }> {
    try {
      const account = await storage.getSocialMediaAccount(accountId);
      if (!account) {
        return { isValid: false, method: 'api' };
      }

      // Try API verification first
      if (account.accountType === 'official' && account.accessToken) {
        try {
          const validation = await this.oauthManager.validateToken(account.platform, account.accessToken);
          return {
            isValid: validation.isValid,
            method: 'api',
            details: validation,
            canPost: validation.isValid
          };
        } catch (apiError) {
          console.warn('API verification failed, trying browser:', apiError);
        }
      }

      // Try browser verification
      if (account.accountType === 'unofficial' && account.automationData?.sessionId) {
        const verification = await this.browserAutomation.verifyAccountStatus(
          account.automationData.sessionId,
          account.platform
        );
        return {
          isValid: verification.isActive,
          method: 'browser',
          details: verification,
          canPost: verification.canPost,
          restrictions: verification.restrictions
        };
      }

      return { isValid: false, method: 'api' };
    } catch (error) {
      return { 
        isValid: false, 
        method: 'api',
        restrictions: [`Verification error: ${error}`]
      };
    }
  }

  /**
   * Get comprehensive account status including all available data
   */
  async getAccountStatus(accountId: string): Promise<{
    account: any;
    verification: any;
    health?: any;
    lastActivity?: Date;
    method: 'api' | 'browser' | 'both';
  }> {
    const account = await storage.getSocialMediaAccount(accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    const verification = await this.verifyAccount(accountId);
    let health = undefined;
    let method: 'api' | 'browser' | 'both' = 'api';

    // Get browser session health if available
    if (account.automationData?.sessionId) {
      health = await this.browserAutomation.getSessionHealth(account.automationData.sessionId);
      method = account.accessToken ? 'both' : 'browser';
    }

    return {
      account,
      verification,
      health,
      lastActivity: account.lastVerified || account.updatedAt,
      method
    };
  }

  /**
   * Cleanup account connections
   */
  async disconnectAccount(accountId: string): Promise<void> {
    const account = await storage.getSocialMediaAccount(accountId);
    if (!account) return;

    // Cleanup API tokens
    if (account.accessToken) {
      try {
        await this.oauthManager.revokeToken(account.platform, account.accessToken);
      } catch (error) {
        console.warn('Failed to revoke API token:', error);
      }
    }

    // Cleanup browser sessions
    if (account.automationData?.sessionId) {
      try {
        await this.browserAutomation.cleanupSession(account.automationData.sessionId);
      } catch (error) {
        console.warn('Failed to cleanup browser session:', error);
      }
    }

    // Update account status
    await storage.updateSocialMediaAccount(accountId, {
      isActive: false,
      accessToken: undefined,
      refreshToken: undefined,
      automationData: null
    });
  }

  /**
   * Get available connection methods for platform
   */
  getAvailableMethods(platform: 'tiktok' | 'instagram'): {
    api: boolean;
    browser: boolean;
    recommended: 'api' | 'browser';
  } {
    const apiAvailable = this.oauthManager.isConfigured(platform);
    
    return {
      api: apiAvailable,
      browser: true, // Browser automation always available
      recommended: apiAvailable ? 'api' : 'browser'
    };
  }

  /**
   * Batch verify multiple accounts
   */
  async batchVerifyAccounts(accountIds: string[]): Promise<Array<{
    accountId: string;
    isValid: boolean;
    method: 'api' | 'browser';
    error?: string;
  }>> {
    const results = await Promise.allSettled(
      accountIds.map(async (accountId) => {
        try {
          const verification = await this.verifyAccount(accountId);
          return {
            accountId,
            isValid: verification.isValid,
            method: verification.method
          };
        } catch (error) {
          return {
            accountId,
            isValid: false,
            method: 'api' as const,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    return results.map((result) => 
      result.status === 'fulfilled' ? result.value : {
        accountId: '',
        isValid: false,
        method: 'api' as const,
        error: 'Verification failed'
      }
    );
  }

  // Private helper methods
  private async postViaAPI(account: any, content: any): Promise<{ postId: string }> {
    const schedule = {
      id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      accountId: account.id,
      contentType: content.type,
      scheduledTime: new Date(),
      content: {
        videoUrl: content.filePath,
        imageUrls: content.type === 'image' ? [content.filePath] : undefined,
        caption: content.caption,
        hashtags: content.hashtags,
        location: content.location
      },
      affiliateLinks: [],
      status: 'scheduled'
    };

    return this.apiManager.postContent(account, schedule);
  }

  private async postViaBrowser(account: any, content: any): Promise<{ success: boolean; postId?: string; error?: string }> {
    if (!account.automationData?.sessionId) {
      throw new Error('No browser session available');
    }

    return account.platform === 'tiktok' 
      ? await this.browserAutomation.postToTikTokBrowser(account.automationData.sessionId, content)
      : await this.browserAutomation.postToInstagramBrowser(account.automationData.sessionId, content);
  }
}