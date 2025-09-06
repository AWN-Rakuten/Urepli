import axios from 'axios';
import { storage } from '../storage';

export interface SocialMediaAccount {
  id: string;
  platform: 'tiktok' | 'instagram' | 'youtube';
  accountName: string;
  displayName: string;
  followerCount: number;
  isVerified: boolean;
  status: 'active' | 'inactive' | 'suspended' | 'pending_approval';
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  profileUrl: string;
  avatarUrl?: string;
  bio?: string;
  businessAccount: boolean;
  createdAt: Date;
  lastSyncAt?: Date;
  metrics: {
    totalPosts: number;
    totalViews: number;
    totalLikes: number;
    totalShares: number;
    engagementRate: number;
    averageViews: number;
  };
  accountLimits: {
    dailyPosts: number;
    hourlyPosts: number;
    videoLength: number; // seconds
  };
}

export interface PostingSchedule {
  id: string;
  accountId: string;
  contentType: 'video' | 'image' | 'carousel';
  scheduledTime: Date;
  content: {
    videoUrl?: string;
    imageUrls?: string[];
    caption: string;
    hashtags: string[];
    location?: string;
    mentionedAccounts?: string[];
  };
  affiliateLinks: Array<{
    programId: string;
    linkId: string;
    placementType: 'caption' | 'bio' | 'comment';
  }>;
  status: 'scheduled' | 'posted' | 'failed' | 'cancelled';
  postedAt?: Date;
  postId?: string;
  error?: string;
  engagement?: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };
}

export interface AccountConnectionConfig {
  platform: 'tiktok' | 'instagram';
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export class SocialMediaManager {
  private readonly TIKTOK_API_BASE = 'https://open-api.tiktok.com';
  private readonly INSTAGRAM_API_BASE = 'https://graph.facebook.com/v18.0';
  
  constructor() {}

  /**
   * Get OAuth URL for platform account connection
   */
  async getConnectionUrl(
    platform: 'tiktok' | 'instagram',
    userId: string
  ): Promise<{ authUrl: string; state: string }> {
    const state = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    let authUrl: string;
    
    switch (platform) {
      case 'tiktok':
        const tiktokScopes = [
          'user.info.basic',
          'video.list',
          'video.upload'
        ].join(',');
        
        authUrl = `${this.TIKTOK_API_BASE}/platform/oauth/authorize/` +
          `?client_key=${process.env.TIKTOK_CLIENT_KEY}` +
          `&scope=${encodeURIComponent(tiktokScopes)}` +
          `&response_type=code` +
          `&redirect_uri=${encodeURIComponent(process.env.TIKTOK_REDIRECT_URI || '')}` +
          `&state=${state}`;
        break;
        
      case 'instagram':
        const instagramScopes = [
          'instagram_basic',
          'instagram_content_publish',
          'pages_show_list'
        ].join(',');
        
        authUrl = `https://www.facebook.com/v18.0/dialog/oauth` +
          `?client_id=${process.env.INSTAGRAM_CLIENT_ID}` +
          `&redirect_uri=${encodeURIComponent(process.env.INSTAGRAM_REDIRECT_URI || '')}` +
          `&scope=${encodeURIComponent(instagramScopes)}` +
          `&response_type=code` +
          `&state=${state}`;
        break;
        
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    // Store state for validation
    await storage.createOAuthState({
      state,
      platform,
      userId,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });

    return { authUrl, state };
  }

  /**
   * Complete OAuth flow and connect account
   */
  async connectAccount(
    platform: 'tiktok' | 'instagram',
    code: string,
    state: string
  ): Promise<SocialMediaAccount> {
    // Validate state
    const storedState = await storage.getOAuthState(state);
    if (!storedState || storedState.expiresAt < new Date()) {
      throw new Error('Invalid or expired OAuth state');
    }

    let tokens: { access_token: string; refresh_token?: string; expires_in?: number };
    let accountInfo: any;

    switch (platform) {
      case 'tiktok':
        tokens = await this.exchangeTikTokCode(code);
        accountInfo = await this.getTikTokAccountInfo(tokens.access_token);
        break;
        
      case 'instagram':
        tokens = await this.exchangeInstagramCode(code);
        accountInfo = await this.getInstagramAccountInfo(tokens.access_token);
        break;
        
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    // Create account record
    const account: SocialMediaAccount = {
      id: `${platform}_${accountInfo.id}`,
      platform,
      accountName: accountInfo.username || accountInfo.name,
      displayName: accountInfo.display_name || accountInfo.name,
      followerCount: accountInfo.followers_count || accountInfo.follower_count || 0,
      isVerified: accountInfo.is_verified || false,
      status: 'active',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : undefined,
      profileUrl: this.buildProfileUrl(platform, accountInfo.username || accountInfo.name),
      avatarUrl: accountInfo.avatar_url || accountInfo.profile_picture_url,
      bio: accountInfo.bio || accountInfo.biography,
      businessAccount: accountInfo.account_type === 'business',
      createdAt: new Date(),
      metrics: {
        totalPosts: accountInfo.media_count || 0,
        totalViews: 0,
        totalLikes: 0,
        totalShares: 0,
        engagementRate: 0,
        averageViews: 0
      },
      accountLimits: this.getAccountLimits(platform)
    };

    await storage.createSocialMediaAccount(account);
    
    // Clean up OAuth state
    await storage.deleteOAuthState(state);

    await storage.createAutomationLog({
      type: 'account_connection',
      message: `Connected ${platform} account: ${account.accountName}`,
      status: 'success',
      metadata: { 
        accountId: account.id, 
        platform, 
        followerCount: account.followerCount 
      }
    });

    return account;
  }

  /**
   * Get all connected accounts
   */
  async getConnectedAccounts(userId?: string): Promise<SocialMediaAccount[]> {
    return await storage.getSocialMediaAccounts(userId);
  }

  /**
   * Get account by ID
   */
  async getAccount(accountId: string): Promise<SocialMediaAccount | null> {
    return await storage.getSocialMediaAccount(accountId);
  }

  /**
   * Schedule content posting
   */
  async schedulePost(postData: Omit<PostingSchedule, 'id' | 'status'>): Promise<PostingSchedule> {
    const account = await this.getAccount(postData.accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    if (account.status !== 'active') {
      throw new Error('Account is not active');
    }

    // Validate posting limits
    await this.validatePostingLimits(account, postData.scheduledTime);

    const schedule: PostingSchedule = {
      id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'scheduled',
      ...postData
    };

    await storage.createPostingSchedule(schedule);

    await storage.createAutomationLog({
      type: 'post_scheduled',
      message: `Content scheduled for ${account.accountName} on ${postData.scheduledTime.toLocaleString()}`,
      status: 'success',
      metadata: { 
        scheduleId: schedule.id, 
        accountId: account.id, 
        scheduledTime: postData.scheduledTime 
      }
    });

    return schedule;
  }

  /**
   * Execute scheduled posts
   */
  async executeScheduledPosts(): Promise<{ posted: number; failed: number }> {
    const now = new Date();
    const scheduledPosts = await storage.getScheduledPosts(now);
    
    let posted = 0;
    let failed = 0;

    for (const post of scheduledPosts) {
      try {
        const account = await this.getAccount(post.accountId);
        if (!account || account.status !== 'active') {
          await storage.updatePostingSchedule(post.id, { 
            status: 'failed', 
            error: 'Account inactive' 
          });
          failed++;
          continue;
        }

        // Refresh token if needed
        if (account.tokenExpiresAt && account.tokenExpiresAt <= new Date()) {
          await this.refreshAccountToken(account);
        }

        // Post content
        const result = await this.postContent(account, post);
        
        await storage.updatePostingSchedule(post.id, {
          status: 'posted',
          postedAt: new Date(),
          postId: result.postId
        });

        // Update account metrics
        await this.updateAccountMetrics(account.id);
        
        posted++;

        await storage.createAutomationLog({
          type: 'post_executed',
          message: `Content posted to ${account.accountName}`,
          status: 'success',
          metadata: { 
            scheduleId: post.id, 
            accountId: account.id, 
            postId: result.postId 
          }
        });

      } catch (error) {
        await storage.updatePostingSchedule(post.id, {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        failed++;

        await storage.createAutomationLog({
          type: 'post_failed',
          message: `Failed to post content: ${error}`,
          status: 'error',
          metadata: { scheduleId: post.id, error: String(error) }
        });
      }
    }

    return { posted, failed };
  }

  /**
   * Update account metrics from platform API
   */
  async updateAccountMetrics(accountId: string): Promise<void> {
    const account = await this.getAccount(accountId);
    if (!account || !account.accessToken) return;

    try {
      let metrics;
      
      switch (account.platform) {
        case 'tiktok':
          metrics = await this.getTikTokMetrics(account.accessToken);
          break;
        case 'instagram':
          metrics = await this.getInstagramMetrics(account.accessToken);
          break;
        default:
          return;
      }

      await storage.updateSocialMediaAccount(accountId, {
        metrics,
        followerCount: metrics.followerCount || account.followerCount,
        lastSyncAt: new Date()
      });

    } catch (error) {
      console.error(`Error updating metrics for ${accountId}:`, error);
    }
  }

  /**
   * Disconnect account
   */
  async disconnectAccount(accountId: string): Promise<void> {
    const account = await this.getAccount(accountId);
    if (!account) return;

    await storage.updateSocialMediaAccount(accountId, {
      status: 'inactive',
      accessToken: undefined,
      refreshToken: undefined,
      tokenExpiresAt: undefined
    });

    await storage.createAutomationLog({
      type: 'account_disconnection',
      message: `Disconnected ${account.platform} account: ${account.accountName}`,
      status: 'success',
      metadata: { accountId, platform: account.platform }
    });
  }

  /**
   * Bulk account operations
   */
  async bulkUpdateAccounts(
    accountIds: string[],
    updates: Partial<SocialMediaAccount>
  ): Promise<{ updated: number; failed: number }> {
    let updated = 0;
    let failed = 0;

    for (const accountId of accountIds) {
      try {
        await storage.updateSocialMediaAccount(accountId, updates);
        updated++;
      } catch (error) {
        failed++;
        console.error(`Failed to update account ${accountId}:`, error);
      }
    }

    return { updated, failed };
  }

  // Private helper methods

  private async exchangeTikTokCode(code: string): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> {
    if (!process.env.TIKTOK_CLIENT_KEY || !process.env.TIKTOK_CLIENT_SECRET) {
      throw new Error('TikTok API credentials not configured');
    }

    const response = await axios.post(`${this.TIKTOK_API_BASE}/platform/oauth/token/`, {
      client_key: process.env.TIKTOK_CLIENT_KEY,
      client_secret: process.env.TIKTOK_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.TIKTOK_REDIRECT_URI
    });

    if (response.data.error) {
      throw new Error(`TikTok OAuth error: ${response.data.error_description}`);
    }

    return response.data.data;
  }

  private async exchangeInstagramCode(code: string): Promise<{ access_token: string; expires_in?: number }> {
    if (!process.env.INSTAGRAM_CLIENT_ID || !process.env.INSTAGRAM_CLIENT_SECRET) {
      throw new Error('Instagram API credentials not configured');
    }

    const response = await axios.post('https://api.instagram.com/oauth/access_token', {
      client_id: process.env.INSTAGRAM_CLIENT_ID,
      client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: process.env.INSTAGRAM_REDIRECT_URI,
      code
    });

    if (response.data.error) {
      throw new Error(`Instagram OAuth error: ${response.data.error.message}`);
    }

    return response.data;
  }

  private async getTikTokAccountInfo(accessToken: string): Promise<any> {
    const response = await axios.post(`${this.TIKTOK_API_BASE}/platform/user/info/`, {}, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (response.data.error) {
      throw new Error(`TikTok API error: ${response.data.error.message}`);
    }

    return response.data.data.user;
  }

  private async getInstagramAccountInfo(accessToken: string): Promise<any> {
    const response = await axios.get(`${this.INSTAGRAM_API_BASE}/me`, {
      params: {
        fields: 'id,username,account_type,media_count',
        access_token: accessToken
      }
    });

    if (response.data.error) {
      throw new Error(`Instagram API error: ${response.data.error.message}`);
    }

    return response.data;
  }

  private async getTikTokMetrics(accessToken: string): Promise<any> {
    const response = await axios.post(`${this.TIKTOK_API_BASE}/platform/user/info/`, {}, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const user = response.data.data.user;
    return {
      totalPosts: user.video_count || 0,
      totalViews: user.likes_count || 0,
      totalLikes: user.likes_count || 0,
      totalShares: 0,
      engagementRate: 0,
      averageViews: 0,
      followerCount: user.follower_count || 0
    };
  }

  private async getInstagramMetrics(accessToken: string): Promise<any> {
    const response = await axios.get(`${this.INSTAGRAM_API_BASE}/me`, {
      params: {
        fields: 'followers_count,media_count',
        access_token: accessToken
      }
    });

    return {
      totalPosts: response.data.media_count || 0,
      totalViews: 0,
      totalLikes: 0,
      totalShares: 0,
      engagementRate: 0,
      averageViews: 0,
      followerCount: response.data.followers_count || 0
    };
  }

  private buildProfileUrl(platform: string, username: string): string {
    switch (platform) {
      case 'tiktok':
        return `https://www.tiktok.com/@${username}`;
      case 'instagram':
        return `https://www.instagram.com/${username}`;
      case 'youtube':
        return `https://www.youtube.com/@${username}`;
      default:
        return '';
    }
  }

  private getAccountLimits(platform: string) {
    switch (platform) {
      case 'tiktok':
        return { dailyPosts: 10, hourlyPosts: 3, videoLength: 600 };
      case 'instagram':
        return { dailyPosts: 25, hourlyPosts: 6, videoLength: 90 };
      case 'youtube':
        return { dailyPosts: 5, hourlyPosts: 2, videoLength: 3600 };
      default:
        return { dailyPosts: 5, hourlyPosts: 2, videoLength: 180 };
    }
  }

  private async validatePostingLimits(account: SocialMediaAccount, scheduledTime: Date): Promise<void> {
    const now = new Date();
    const dayStart = new Date(scheduledTime.getFullYear(), scheduledTime.getMonth(), scheduledTime.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    
    const hourStart = new Date(scheduledTime.getFullYear(), scheduledTime.getMonth(), scheduledTime.getDate(), scheduledTime.getHours());
    const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

    const [dailyPosts, hourlyPosts] = await Promise.all([
      storage.getPostCount(account.id, dayStart, dayEnd),
      storage.getPostCount(account.id, hourStart, hourEnd)
    ]);

    if (dailyPosts >= account.accountLimits.dailyPosts) {
      throw new Error(`Daily posting limit exceeded (${account.accountLimits.dailyPosts} posts per day)`);
    }

    if (hourlyPosts >= account.accountLimits.hourlyPosts) {
      throw new Error(`Hourly posting limit exceeded (${account.accountLimits.hourlyPosts} posts per hour)`);
    }
  }

  private async postContent(account: SocialMediaAccount, post: PostingSchedule): Promise<{ postId: string }> {
    switch (account.platform) {
      case 'tiktok':
        return await this.postToTikTok(account, post);
      case 'instagram':
        return await this.postToInstagram(account, post);
      default:
        throw new Error(`Posting not supported for platform: ${account.platform}`);
    }
  }

  private async postToTikTok(account: SocialMediaAccount, post: PostingSchedule): Promise<{ postId: string }> {
    if (!account.accessToken) {
      throw new Error('No access token available');
    }

    // TikTok posting implementation
    const response = await axios.post(`${this.TIKTOK_API_BASE}/platform/share/video/upload/`, {
      video: {
        video_url: post.content.videoUrl,
        caption: post.content.caption,
        hashtag: post.content.hashtags.join(' ')
      }
    }, {
      headers: { Authorization: `Bearer ${account.accessToken}` }
    });

    if (response.data.error) {
      throw new Error(`TikTok posting error: ${response.data.error.message}`);
    }

    return { postId: response.data.data.share_id };
  }

  private async postToInstagram(account: SocialMediaAccount, post: PostingSchedule): Promise<{ postId: string }> {
    if (!account.accessToken) {
      throw new Error('No access token available');
    }

    // Instagram posting implementation
    let response;
    
    if (post.contentType === 'video') {
      response = await axios.post(`${this.INSTAGRAM_API_BASE}/me/media`, {
        media_type: 'REELS',
        video_url: post.content.videoUrl,
        caption: post.content.caption,
        access_token: account.accessToken
      });
    } else {
      response = await axios.post(`${this.INSTAGRAM_API_BASE}/me/media`, {
        image_url: post.content.imageUrls?.[0],
        caption: post.content.caption,
        access_token: account.accessToken
      });
    }

    if (response.data.error) {
      throw new Error(`Instagram posting error: ${response.data.error.message}`);
    }

    // Publish the media
    const publishResponse = await axios.post(`${this.INSTAGRAM_API_BASE}/me/media_publish`, {
      creation_id: response.data.id,
      access_token: account.accessToken
    });

    return { postId: publishResponse.data.id };
  }

  private async refreshAccountToken(account: SocialMediaAccount): Promise<void> {
    if (!account.refreshToken) {
      throw new Error('No refresh token available');
    }

    let newTokens;

    switch (account.platform) {
      case 'tiktok':
        newTokens = await this.refreshTikTokToken(account.refreshToken);
        break;
      case 'instagram':
        newTokens = await this.refreshInstagramToken(account.accessToken!);
        break;
      default:
        throw new Error(`Token refresh not supported for platform: ${account.platform}`);
    }

    await storage.updateSocialMediaAccount(account.id, {
      accessToken: newTokens.access_token,
      refreshToken: newTokens.refresh_token || account.refreshToken,
      tokenExpiresAt: newTokens.expires_in ? new Date(Date.now() + newTokens.expires_in * 1000) : undefined
    });
  }

  private async refreshTikTokToken(refreshToken: string): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> {
    const response = await axios.post(`${this.TIKTOK_API_BASE}/platform/oauth/token/`, {
      client_key: process.env.TIKTOK_CLIENT_KEY,
      client_secret: process.env.TIKTOK_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    });

    if (response.data.error) {
      throw new Error(`TikTok token refresh error: ${response.data.error_description}`);
    }

    return response.data.data;
  }

  private async refreshInstagramToken(accessToken: string): Promise<{ access_token: string; expires_in?: number }> {
    const response = await axios.get('https://graph.instagram.com/refresh_access_token', {
      params: {
        grant_type: 'ig_refresh_token',
        access_token: accessToken
      }
    });

    if (response.data.error) {
      throw new Error(`Instagram token refresh error: ${response.data.error.message}`);
    }

    return response.data;
  }
}