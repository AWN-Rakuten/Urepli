import { IStorage } from '../storage';
import { SocialMediaAccount, AccountRotationLog } from '@shared/schema';

export interface AccountSelectionCriteria {
  platform: string;
  excludeAccountIds?: string[];
  prioritizeByFrequency?: boolean;
  respectRateLimits?: boolean;
}

export interface PostingResult {
  accountId: string;
  success: boolean;
  error?: string;
  rotationReason?: string;
}

export class SocialAccountManager {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Get the next best account for posting based on rotation strategy
   */
  async getNextAccountForPosting(criteria: AccountSelectionCriteria): Promise<SocialMediaAccount | null> {
    const activeAccounts = await this.storage.getActiveSocialMediaAccounts(criteria.platform);
    
    if (activeAccounts.length === 0) {
      return null;
    }

    // Filter out excluded accounts
    let availableAccounts = activeAccounts.filter(
      account => !criteria.excludeAccountIds?.includes(account.id)
    );

    if (availableAccounts.length === 0) {
      return null;
    }

    // Apply rate limiting filter
    if (criteria.respectRateLimits) {
      availableAccounts = await this.filterByRateLimits(availableAccounts);
    }

    // Prioritize accounts that haven't posted recently
    if (criteria.prioritizeByFrequency) {
      availableAccounts.sort((a, b) => {
        const aLastPost = a.lastPostDate ? new Date(a.lastPostDate).getTime() : 0;
        const bLastPost = b.lastPostDate ? new Date(b.lastPostDate).getTime() : 0;
        return aLastPost - bLastPost; // Oldest posts first
      });
    }

    // Use weighted selection based on priority and health
    return this.selectAccountByPriority(availableAccounts);
  }

  /**
   * Filter accounts by rate limits (daily post limits)
   */
  private async filterByRateLimits(accounts: SocialMediaAccount[]): Promise<SocialMediaAccount[]> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return accounts.filter(account => {
      // Check if account has reached daily limit
      if ((account.dailyPostCount || 0) >= (account.maxDailyPosts || 5)) {
        return false;
      }

      // Reset daily count if it's a new day
      const lastPost = account.lastPostDate ? new Date(account.lastPostDate) : null;
      if (lastPost && lastPost < today) {
        // This should be updated in the database, but for now we filter it
        return true;
      }

      return true;
    });
  }

  /**
   * Select account based on priority and health score
   */
  private selectAccountByPriority(accounts: SocialMediaAccount[]): SocialMediaAccount {
    if (accounts.length === 1) {
      return accounts[0];
    }

    // Calculate weighted scores
    const scoredAccounts = accounts.map(account => ({
      account,
      score: this.calculateAccountScore(account)
    }));

    // Sort by score (higher is better)
    scoredAccounts.sort((a, b) => b.score - a.score);

    return scoredAccounts[0].account;
  }

  /**
   * Calculate account health/priority score
   */
  private calculateAccountScore(account: SocialMediaAccount): number {
    let score = (account.postingPriority || 1) * 10; // Base priority weight

    // Penalize for recent errors
    score -= (account.errorCount || 0) * 5;

    // Bonus for accounts that haven't posted recently
    if (account.lastPostDate) {
      const hoursSinceLastPost = (Date.now() - new Date(account.lastPostDate).getTime()) / (1000 * 60 * 60);
      score += Math.min(hoursSinceLastPost / 24, 5); // Up to 5 points for 24+ hours
    } else {
      score += 10; // Bonus for never-used accounts
    }

    // Penalize for high daily usage
    const usageRatio = (account.dailyPostCount || 0) / (account.maxDailyPosts || 5);
    score -= usageRatio * 15;

    return score;
  }

  /**
   * Record successful posting activity
   */
  async recordSuccessfulPost(accountId: string, contentId?: string): Promise<void> {
    const account = await this.storage.getSocialMediaAccount(accountId);
    if (!account) return;

    // Update account metrics
    await this.storage.updateSocialMediaAccount(accountId, {
      lastUsed: new Date(),
      lastPostDate: new Date(),
      dailyPostCount: (account.dailyPostCount || 0) + 1,
      totalPosts: (account.totalPosts || 0) + 1,
      errorCount: 0, // Reset error count on success
      lastError: null
    });

    // Log the successful rotation
    await this.storage.createAccountRotationLog({
      accountId,
      contentId: contentId || null,
      platform: account.platform,
      action: 'post_success',
      result: 'success',
      rotationReason: 'scheduled',
      metadata: {
        dailyPostCount: (account.dailyPostCount || 0) + 1,
        timestamp: new Date()
      }
    });
  }

  /**
   * Record failed posting attempt
   */
  async recordFailedPost(accountId: string, error: string, contentId?: string): Promise<void> {
    const account = await this.storage.getSocialMediaAccount(accountId);
    if (!account) return;

    const newErrorCount = (account.errorCount || 0) + 1;
    
    // Update account with error info
    const updates: Partial<SocialMediaAccount> = {
      lastUsed: new Date(),
      lastError: error,
      errorCount: newErrorCount
    };

    // Suspend account if too many errors
    if (newErrorCount >= 3) {
      updates.status = 'error';
    }

    // Check for rate limiting
    if (error.toLowerCase().includes('rate limit') || error.toLowerCase().includes('too many requests')) {
      updates.status = 'rate_limited';
    }

    await this.storage.updateSocialMediaAccount(accountId, updates);

    // Log the failed attempt
    await this.storage.createAccountRotationLog({
      accountId,
      contentId: contentId || null,
      platform: account.platform,
      action: 'post_failure',
      result: 'failure',
      errorMessage: error,
      rotationReason: 'error',
      metadata: {
        errorCount: newErrorCount,
        timestamp: new Date()
      }
    });
  }

  /**
   * Reset daily counters (should be called daily via cron)
   */
  async resetDailyCounters(): Promise<void> {
    const allAccounts = await this.storage.getSocialMediaAccounts();
    
    for (const account of allAccounts) {
      await this.storage.updateSocialMediaAccount(account.id, {
        dailyPostCount: 0
      });
    }
  }

  /**
   * Get account health summary for monitoring
   */
  async getAccountHealthSummary(platform?: string): Promise<any> {
    const accounts = await this.storage.getSocialMediaAccounts(platform);
    
    return {
      total: accounts.length,
      active: accounts.filter(a => a.status === 'active' && a.isActive).length,
      suspended: accounts.filter(a => a.status === 'error').length,
      rateLimited: accounts.filter(a => a.status === 'rate_limited').length,
      highError: accounts.filter(a => (a.errorCount || 0) >= 2).length,
      recentActivity: accounts.filter(a => {
        if (!a.lastUsed) return false;
        const hoursSinceLastUse = (Date.now() - new Date(a.lastUsed).getTime()) / (1000 * 60 * 60);
        return hoursSinceLastUse < 24;
      }).length
    };
  }

  /**
   * Bulk validate account credentials and update statuses
   */
  async validateAllAccounts(): Promise<{ accountId: string; status: string; error?: string }[]> {
    const accounts = await this.storage.getSocialMediaAccounts();
    const results: { accountId: string; status: string; error?: string }[] = [];

    for (const account of accounts) {
      try {
        // This would integrate with actual API validation
        const isValid = await this.validateAccountCredentials(account);
        
        if (isValid) {
          await this.storage.updateSocialMediaAccount(account.id, {
            status: 'active',
            errorCount: 0,
            lastError: null
          });
          results.push({ accountId: account.id, status: 'active' });
        } else {
          await this.storage.updateSocialMediaAccount(account.id, {
            status: 'error',
            lastError: 'Credential validation failed'
          });
          results.push({ accountId: account.id, status: 'error', error: 'Invalid credentials' });
        }
      } catch (error) {
        results.push({ 
          accountId: account.id, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return results;
  }

  /**
   * Validate individual account credentials
   */
  private async validateAccountCredentials(account: SocialMediaAccount): Promise<boolean> {
    // This is a placeholder - would integrate with actual API validation
    // For now, just check if required credentials exist
    
    if (account.accountType === 'official') {
      return !!account.accessToken;
    } else if (account.accountType === 'unofficial') {
      return !!(account.automationData && typeof account.automationData === 'object');
    }
    
    return false;
  }
}