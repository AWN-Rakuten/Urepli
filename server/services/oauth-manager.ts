import axios from 'axios';
import crypto from 'crypto';
import { storage } from '../storage';

export interface OAuthConfig {
  platform: 'tiktok' | 'instagram';
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface OAuthState {
  state: string;
  platform: 'tiktok' | 'instagram';
  userId?: string;
  expiresAt: Date;
  codeVerifier?: string; // For PKCE
}

export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType: string;
  scope?: string;
}

export interface AccountInfo {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  followerCount?: number;
  isVerified?: boolean;
  profileImageUrl?: string;
  bio?: string;
  accountType?: string;
}

export class OAuthManager {
  private readonly configs: Map<string, OAuthConfig> = new Map();

  constructor() {
    this.initializeConfigs();
  }

  private initializeConfigs() {
    // TikTok OAuth configuration
    if (process.env.TIKTOK_CLIENT_ID && process.env.TIKTOK_CLIENT_SECRET) {
      this.configs.set('tiktok', {
        platform: 'tiktok',
        clientId: process.env.TIKTOK_CLIENT_ID,
        clientSecret: process.env.TIKTOK_CLIENT_SECRET,
        redirectUri: process.env.TIKTOK_REDIRECT_URI || `${process.env.BASE_URL || 'http://localhost:5000'}/api/oauth/callback/tiktok`,
        scopes: [
          'user.info.basic',
          'user.info.profile',
          'user.info.stats',
          'video.list',
          'video.upload'
        ]
      });
    }

    // Instagram/Facebook OAuth configuration
    if (process.env.INSTAGRAM_CLIENT_ID && process.env.INSTAGRAM_CLIENT_SECRET) {
      this.configs.set('instagram', {
        platform: 'instagram',
        clientId: process.env.INSTAGRAM_CLIENT_ID,
        clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
        redirectUri: process.env.INSTAGRAM_REDIRECT_URI || `${process.env.BASE_URL || 'http://localhost:5000'}/api/oauth/callback/instagram`,
        scopes: [
          'instagram_basic',
          'instagram_content_publish',
          'pages_show_list',
          'pages_read_engagement'
        ]
      });
    }
  }

  /**
   * Generate OAuth authorization URL
   */
  async generateAuthUrl(platform: 'tiktok' | 'instagram', userId?: string): Promise<{ authUrl: string; state: string }> {
    const config = this.configs.get(platform);
    if (!config) {
      throw new Error(`OAuth not configured for platform: ${platform}`);
    }

    // Generate state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');
    const codeVerifier = platform === 'tiktok' ? crypto.randomBytes(32).toString('base64url') : undefined;

    // Store OAuth state
    const oauthState: OAuthState = {
      state,
      platform,
      userId,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      codeVerifier
    };

    await storage.createOAuthState(oauthState);

    let authUrl: string;

    if (platform === 'tiktok') {
      const codeChallenge = codeVerifier ? 
        crypto.createHash('sha256').update(codeVerifier).digest('base64url') : '';

      const params = new URLSearchParams({
        client_key: config.clientId,
        scope: config.scopes.join(','),
        response_type: 'code',
        redirect_uri: config.redirectUri,
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256'
      });

      authUrl = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
    } else {
      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        scope: config.scopes.join(','),
        response_type: 'code',
        state
      });

      authUrl = `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
    }

    return { authUrl, state };
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleCallback(platform: 'tiktok' | 'instagram', code: string, state: string): Promise<{
    tokens: TokenResponse;
    accountInfo: AccountInfo;
    oauthState: OAuthState;
  }> {
    const config = this.configs.get(platform);
    if (!config) {
      throw new Error(`OAuth not configured for platform: ${platform}`);
    }

    // Validate state
    const oauthState = await storage.getOAuthState(state);
    if (!oauthState || oauthState.platform !== platform || oauthState.expiresAt < new Date()) {
      throw new Error('Invalid or expired OAuth state');
    }

    try {
      // Exchange code for tokens
      const tokens = await this.exchangeCodeForTokens(platform, code, config, oauthState);

      // Get account information
      const accountInfo = await this.getAccountInfo(platform, tokens.accessToken);

      // Clean up OAuth state
      await storage.deleteOAuthState(state);

      await storage.createAutomationLog({
        type: 'oauth_success',
        message: `OAuth completed for ${platform}: ${accountInfo.username}`,
        status: 'success',
        metadata: {
          platform,
          accountId: accountInfo.id,
          username: accountInfo.username,
          scopes: tokens.scope
        }
      });

      return { tokens, accountInfo, oauthState };

    } catch (error) {
      await storage.createAutomationLog({
        type: 'oauth_error',
        message: `OAuth failed for ${platform}: ${error}`,
        status: 'error',
        metadata: { platform, error: String(error) }
      });

      throw error;
    }
  }

  /**
   * Exchange authorization code for access tokens
   */
  private async exchangeCodeForTokens(
    platform: 'tiktok' | 'instagram',
    code: string,
    config: OAuthConfig,
    oauthState: OAuthState
  ): Promise<TokenResponse> {
    if (platform === 'tiktok') {
      const response = await axios.post('https://open-api.tiktok.com/platform/oauth/token/', {
        client_key: config.clientId,
        client_secret: config.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: config.redirectUri,
        code_verifier: oauthState.codeVerifier
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (response.data.error) {
        throw new Error(`TikTok OAuth error: ${response.data.error_description || response.data.error}`);
      }

      const data = response.data.data;
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        tokenType: data.token_type,
        scope: data.scope
      };

    } else {
      // Instagram short-lived token
      const shortTokenResponse = await axios.post('https://api.instagram.com/oauth/access_token', {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: config.redirectUri,
        code
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (shortTokenResponse.data.error) {
        throw new Error(`Instagram OAuth error: ${shortTokenResponse.data.error.message}`);
      }

      // Exchange for long-lived token
      const longTokenResponse = await axios.get('https://graph.instagram.com/access_token', {
        params: {
          grant_type: 'ig_exchange_token',
          client_secret: config.clientSecret,
          access_token: shortTokenResponse.data.access_token
        }
      });

      return {
        accessToken: longTokenResponse.data.access_token,
        expiresIn: longTokenResponse.data.expires_in,
        tokenType: longTokenResponse.data.token_type || 'bearer'
      };
    }
  }

  /**
   * Get account information from platform API
   */
  private async getAccountInfo(platform: 'tiktok' | 'instagram', accessToken: string): Promise<AccountInfo> {
    if (platform === 'tiktok') {
      const response = await axios.post('https://open-api.tiktok.com/platform/user/info/', {}, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.error) {
        throw new Error(`TikTok API error: ${response.data.error.message}`);
      }

      const user = response.data.data.user;
      return {
        id: user.open_id,
        username: user.username || user.display_name,
        displayName: user.display_name,
        followerCount: user.follower_count,
        isVerified: user.is_verified,
        profileImageUrl: user.avatar_url,
        bio: user.bio_description
      };

    } else {
      const response = await axios.get('https://graph.instagram.com/me', {
        params: {
          fields: 'id,username,account_type,media_count,followers_count',
          access_token: accessToken
        }
      });

      if (response.data.error) {
        throw new Error(`Instagram API error: ${response.data.error.message}`);
      }

      const user = response.data;
      return {
        id: user.id,
        username: user.username,
        displayName: user.username,
        followerCount: user.followers_count,
        accountType: user.account_type
      };
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(platform: 'tiktok' | 'instagram', refreshToken: string): Promise<TokenResponse> {
    const config = this.configs.get(platform);
    if (!config) {
      throw new Error(`OAuth not configured for platform: ${platform}`);
    }

    if (platform === 'tiktok') {
      const response = await axios.post('https://open-api.tiktok.com/platform/oauth/token/', {
        client_key: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      });

      if (response.data.error) {
        throw new Error(`TikTok token refresh error: ${response.data.error_description}`);
      }

      const data = response.data.data;
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        tokenType: data.token_type
      };

    } else {
      // Instagram long-lived tokens can be refreshed
      const response = await axios.get('https://graph.instagram.com/refresh_access_token', {
        params: {
          grant_type: 'ig_refresh_token',
          access_token: refreshToken
        }
      });

      if (response.data.error) {
        throw new Error(`Instagram token refresh error: ${response.data.error.message}`);
      }

      return {
        accessToken: response.data.access_token,
        expiresIn: response.data.expires_in,
        tokenType: 'bearer'
      };
    }
  }

  /**
   * Revoke access token
   */
  async revokeToken(platform: 'tiktok' | 'instagram', accessToken: string): Promise<void> {
    const config = this.configs.get(platform);
    if (!config) {
      throw new Error(`OAuth not configured for platform: ${platform}`);
    }

    try {
      if (platform === 'tiktok') {
        await axios.post('https://open-api.tiktok.com/platform/oauth/revoke/', {
          client_key: config.clientId,
          client_secret: config.clientSecret,
          token: accessToken
        });
      } else {
        // Instagram/Facebook token revocation
        await axios.delete(`https://graph.facebook.com/v18.0/me/permissions`, {
          params: {
            access_token: accessToken
          }
        });
      }

      await storage.createAutomationLog({
        type: 'oauth_revoke',
        message: `Access token revoked for ${platform}`,
        status: 'success',
        metadata: { platform }
      });

    } catch (error) {
      await storage.createAutomationLog({
        type: 'oauth_revoke',
        message: `Failed to revoke token for ${platform}: ${error}`,
        status: 'error',
        metadata: { platform, error: String(error) }
      });

      throw error;
    }
  }

  /**
   * Validate access token
   */
  async validateToken(platform: 'tiktok' | 'instagram', accessToken: string): Promise<{
    isValid: boolean;
    expiresAt?: Date;
    scopes?: string[];
  }> {
    try {
      if (platform === 'tiktok') {
        const response = await axios.post('https://open-api.tiktok.com/platform/user/info/', {}, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        return {
          isValid: !response.data.error,
          scopes: response.data.data?.scope?.split(',')
        };

      } else {
        const response = await axios.get('https://graph.instagram.com/me', {
          params: {
            fields: 'id',
            access_token: accessToken
          }
        });

        return {
          isValid: !response.data.error
        };
      }
    } catch (error) {
      return { isValid: false };
    }
  }

  /**
   * Get available OAuth configurations
   */
  getAvailablePlatforms(): Array<{ platform: string; configured: boolean }> {
    return [
      { platform: 'tiktok', configured: this.configs.has('tiktok') },
      { platform: 'instagram', configured: this.configs.has('instagram') }
    ];
  }

  /**
   * Check if platform OAuth is configured
   */
  isConfigured(platform: 'tiktok' | 'instagram'): boolean {
    return this.configs.has(platform);
  }
}