import { Router } from 'express';
import { OAuthManager } from '../services/oauth-manager';
import { BrowserAutomationService } from '../services/browser-automation';
import { realisticDataGenerator } from '../services/realistic-data-generator';
import { storage } from '../storage';

const router = Router();
const oauthManager = new OAuthManager();
const browserAutomation = new BrowserAutomationService();

/**
 * Get available OAuth platforms and their configuration status
 */
router.get('/platforms', async (req, res) => {
  try {
    const platforms = oauthManager.getAvailablePlatforms();
    res.json({ platforms });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to get platforms',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Initiate OAuth flow for a platform
 */
router.post('/connect/:platform', async (req, res) => {
  try {
    const { platform } = req.params;
    const { userId } = req.body;

    if (!['tiktok', 'instagram'].includes(platform)) {
      return res.status(400).json({ error: 'Invalid platform' });
    }

    if (!oauthManager.isConfigured(platform as any)) {
      return res.status(400).json({ 
        error: `OAuth not configured for ${platform}`,
        message: 'Please configure API credentials in environment variables'
      });
    }

    const { authUrl, state } = await oauthManager.generateAuthUrl(platform as any, userId);

    res.json({
      authUrl,
      state,
      message: `Redirect user to ${platform} for authorization`
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to initiate OAuth',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * OAuth callback handler for TikTok
 */
router.get('/callback/tiktok', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(`/account-management?error=${encodeURIComponent(error as string)}`);
    }

    if (!code || !state) {
      return res.redirect('/account-management?error=Missing+authorization+code');
    }

    const { tokens, accountInfo, oauthState } = await oauthManager.handleCallback(
      'tiktok',
      code as string,
      state as string
    );

    // Create social media account record
    const account = await storage.createSocialMediaAccount({
      name: `TikTok - ${accountInfo.username}`,
      platform: 'tiktok',
      username: accountInfo.username,
      accountType: 'official',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      businessAccountId: accountInfo.id,
      isActive: true,
      postingPriority: 1,
      maxDailyPosts: 10,
      automationData: null
    });

    res.redirect(`/account-management?success=TikTok+account+connected&accountId=${account.id}`);

  } catch (error) {
    console.error('TikTok OAuth callback error:', error);
    res.redirect(`/account-management?error=${encodeURIComponent(error instanceof Error ? error.message : 'OAuth failed')}`);
  }
});

/**
 * OAuth callback handler for Instagram
 */
router.get('/callback/instagram', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(`/account-management?error=${encodeURIComponent(error as string)}`);
    }

    if (!code || !state) {
      return res.redirect('/account-management?error=Missing+authorization+code');
    }

    const { tokens, accountInfo, oauthState } = await oauthManager.handleCallback(
      'instagram',
      code as string,
      state as string
    );

    // Create social media account record
    const account = await storage.createSocialMediaAccount({
      name: `Instagram - ${accountInfo.username}`,
      platform: 'instagram',
      username: accountInfo.username,
      accountType: 'official',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      businessAccountId: accountInfo.id,
      isActive: true,
      postingPriority: 1,
      maxDailyPosts: 25,
      automationData: null
    });

    res.redirect(`/account-management?success=Instagram+account+connected&accountId=${account.id}`);

  } catch (error) {
    console.error('Instagram OAuth callback error:', error);
    res.redirect(`/account-management?error=${encodeURIComponent(error instanceof Error ? error.message : 'OAuth failed')}`);
  }
});

/**
 * Generate realistic account data for form pre-population
 */
router.get('/generate-account-data', async (req, res) => {
  try {
    const count = parseInt(req.query.count as string) || 1;
    
    if (count === 1) {
      const accountData = realisticDataGenerator.generateAccountData();
      res.json(accountData);
    } else {
      const accountsData = realisticDataGenerator.generateMultipleAccounts(Math.min(count, 10)); // Limit to 10 max
      res.json(accountsData);
    }
  } catch (error) {
    console.error('Error generating account data:', error);
    res.status(500).json({
      error: 'Failed to generate account data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Browser-based account creation for platforms
 */
router.post('/browser-create-account', async (req, res) => {
  try {
    const { platform, email, username, password, fullName, dateOfBirth, proxy } = req.body;

    if (!['tiktok', 'instagram'].includes(platform)) {
      return res.status(400).json({ error: 'Invalid platform' });
    }

    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Email, username, and password required' });
    }

    const accountData = {
      platform: platform as any,
      email,
      username,
      password,
      fullName,
      proxy
    };

    const session = platform === 'tiktok' 
      ? await browserAutomation.createTikTokAccount(accountData)
      : await browserAutomation.createInstagramAccount(accountData);

    // Create social media account record
    const account = await storage.createSocialMediaAccount({
      name: `${platform} - ${username} (Created)`,
      platform: platform as any,
      username,
      accountType: 'unofficial',
      isActive: true,
      postingPriority: 1,
      maxDailyPosts: platform === 'tiktok' ? 10 : 25,
      automationData: {
        sessionId: session.id,
        cookies: session.cookies,
        userAgent: session.userAgent,
        lastLogin: session.createdAt,
        accountCreated: true
      }
    });

    res.json({
      success: true,
      account,
      session: {
        id: session.id,
        platform: session.platform,
        username: session.username,
        isActive: session.isActive,
        createdAt: session.createdAt
      }
    });

  } catch (error) {
    console.error('Browser account creation error:', error);
    
    let errorMessage = 'Browser automation is not available in this environment';
    let suggestion = 'Please use the API connection method instead';
    
    if (error instanceof Error) {
      // Provide helpful messages for common issues
      if (error.message.includes('Host system is missing dependencies') || 
          error.message.includes('browserType.launch') ||
          error.message.includes('Browser automation is not available')) {
        errorMessage = 'Browser automation requires additional system dependencies that are not installed in this environment';
        suggestion = 'Use the "Official API" tab instead to connect your accounts through the proper OAuth flow';
      } else {
        errorMessage = error.message;
      }
    }
    
    res.status(400).json({
      error: 'Browser automation not available',
      message: errorMessage,
      suggestion: suggestion,
      availableAlternatives: ['Official API OAuth connection']
    });
  }
});

/**
 * Browser-based login for platforms
 */
router.post('/browser-login', async (req, res) => {
  try {
    const { platform, username, password, proxy } = req.body;

    if (!['tiktok', 'instagram'].includes(platform)) {
      return res.status(400).json({ error: 'Invalid platform' });
    }

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Check if browser automation is available first
    const isAvailable = await browserAutomation.isBrowserAvailable();
    if (!isAvailable) {
      return res.status(400).json({
        error: 'Browser automation not available',
        message: 'Browser automation requires additional system dependencies that are not installed in this environment',
        suggestion: 'Use the "Official API" tab instead to connect your accounts through the proper OAuth flow',
        availableAlternatives: ['Official API OAuth connection']
      });
    }

    const session = platform === 'tiktok' 
      ? await browserAutomation.loginToTikTok({ platform, username, password, proxy })
      : await browserAutomation.loginToInstagram({ platform, username, password, proxy });

    // Create social media account record
    const account = await storage.createSocialMediaAccount({
      name: `${platform} - ${username} (Browser)`,
      platform: platform as any,
      username,
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

    res.json({
      success: true,
      account,
      session: {
        id: session.id,
        platform: session.platform,
        username: session.username,
        isActive: session.isActive,
        createdAt: session.createdAt
      }
    });

  } catch (error) {
    res.status(500).json({
      error: 'Browser login failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Verify account status
 */
router.post('/verify/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;
    const account = await storage.getSocialMediaAccount(accountId);

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    let verification;

    if (account.accountType === 'official' && account.accessToken) {
      // Verify API token
      verification = await oauthManager.validateToken(account.platform, account.accessToken);
    } else if (account.accountType === 'unofficial' && account.automationData?.sessionId) {
      // Verify browser session
      verification = await browserAutomation.verifyAccountStatus(
        account.automationData.sessionId,
        account.platform
      );
    } else {
      verification = { isValid: false, error: 'No valid credentials found' };
    }

    // Update account status based on verification
    await storage.updateSocialMediaAccount(accountId, {
      lastVerified: new Date(),
      isActive: verification.isActive || verification.isValid || false
    });

    res.json({
      accountId,
      verification,
      timestamp: new Date()
    });

  } catch (error) {
    res.status(500).json({
      error: 'Account verification failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Refresh account tokens/sessions
 */
router.post('/refresh/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;
    const account = await storage.getSocialMediaAccount(accountId);

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    if (account.accountType === 'official' && account.refreshToken) {
      // Refresh API token
      const tokens = await oauthManager.refreshToken(account.platform, account.refreshToken);
      
      await storage.updateSocialMediaAccount(accountId, {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || account.refreshToken,
        lastVerified: new Date()
      });

      res.json({
        success: true,
        message: 'API tokens refreshed',
        expiresIn: tokens.expiresIn
      });

    } else if (account.accountType === 'unofficial' && account.automationData?.sessionId) {
      // Check browser session health
      const health = await browserAutomation.getSessionHealth(account.automationData.sessionId);
      
      res.json({
        success: health.isHealthy,
        message: health.isHealthy ? 'Browser session is healthy' : 'Browser session needs refresh',
        health,
        issues: health.issues
      });

    } else {
      res.status(400).json({ error: 'No refresh method available for this account' });
    }

  } catch (error) {
    res.status(500).json({
      error: 'Token refresh failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Disconnect account
 */
router.delete('/disconnect/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;
    const account = await storage.getSocialMediaAccount(accountId);

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Revoke tokens/cleanup sessions
    if (account.accountType === 'official' && account.accessToken) {
      try {
        await oauthManager.revokeToken(account.platform, account.accessToken);
      } catch (error) {
        console.warn('Failed to revoke token:', error);
      }
    } else if (account.accountType === 'unofficial' && account.automationData?.sessionId) {
      try {
        await browserAutomation.cleanupSession(account.automationData.sessionId);
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

    res.json({
      success: true,
      message: 'Account disconnected successfully'
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to disconnect account',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get browser sessions status
 */
router.get('/browser-sessions', async (req, res) => {
  try {
    const sessions = await browserAutomation.getActiveSessions();
    
    const sessionsWithHealth = await Promise.all(
      sessions.map(async (session) => {
        const health = await browserAutomation.getSessionHealth(session.id);
        return {
          ...session,
          health
        };
      })
    );

    res.json({ sessions: sessionsWithHealth });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to get browser sessions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;