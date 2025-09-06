import { Router } from 'express';
import { SocialMediaManager } from '../services/social-media-manager';

const router = Router();
const socialMediaManager = new SocialMediaManager();

/**
 * Get OAuth connection URL for platform
 */
router.post('/connect/url', async (req, res) => {
  try {
    const { platform, userId } = req.body;
    
    if (!platform || !userId) {
      return res.status(400).json({ 
        error: 'platform and userId are required' 
      });
    }

    if (!['tiktok', 'instagram'].includes(platform)) {
      return res.status(400).json({ 
        error: 'platform must be tiktok or instagram' 
      });
    }

    const result = await socialMediaManager.getConnectionUrl(platform, userId);
    
    res.json({
      success: true,
      ...result,
      message: `${platform} connection URL generated`
    });
  } catch (error) {
    console.error('Error getting connection URL:', error);
    res.status(500).json({ error: 'Failed to generate connection URL' });
  }
});

/**
 * Complete OAuth flow and connect account
 */
router.post('/connect/callback', async (req, res) => {
  try {
    const { platform, code, state } = req.body;
    
    if (!platform || !code || !state) {
      return res.status(400).json({ 
        error: 'platform, code, and state are required' 
      });
    }

    const account = await socialMediaManager.connectAccount(platform, code, state);
    
    res.json({
      success: true,
      account: {
        ...account,
        accessToken: undefined, // Don't expose token
        refreshToken: undefined
      },
      message: `${platform} account connected successfully`
    });
  } catch (error) {
    console.error('Error connecting account:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to connect account' 
    });
  }
});

/**
 * Get all connected accounts
 */
router.get('/accounts', async (req, res) => {
  try {
    const { userId } = req.query;
    const accounts = await socialMediaManager.getConnectedAccounts(userId as string);
    
    // Remove sensitive tokens from response
    const safeAccounts = accounts.map(account => ({
      ...account,
      accessToken: undefined,
      refreshToken: undefined,
      hasTokens: !!(account.accessToken && account.refreshToken)
    }));

    res.json({
      success: true,
      accounts: safeAccounts,
      totalAccounts: accounts.length,
      byPlatform: accounts.reduce((acc, account) => {
        acc[account.platform] = (acc[account.platform] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ error: 'Failed to fetch connected accounts' });
  }
});

/**
 * Get account by ID
 */
router.get('/accounts/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;
    const account = await socialMediaManager.getAccount(accountId);
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json({
      success: true,
      account: {
        ...account,
        accessToken: undefined,
        refreshToken: undefined,
        hasTokens: !!(account.accessToken && account.refreshToken)
      }
    });
  } catch (error) {
    console.error('Error fetching account:', error);
    res.status(500).json({ error: 'Failed to fetch account' });
  }
});

/**
 * Schedule content post
 */
router.post('/schedule', async (req, res) => {
  try {
    const postData = req.body;
    
    // Validate required fields
    const requiredFields = ['accountId', 'contentType', 'scheduledTime', 'content'];
    const missingFields = requiredFields.filter(field => !postData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: `Missing required fields: ${missingFields.join(', ')}` 
      });
    }

    const schedule = await socialMediaManager.schedulePost({
      ...postData,
      scheduledTime: new Date(postData.scheduledTime)
    });

    res.json({
      success: true,
      schedule,
      message: 'Content scheduled successfully'
    });
  } catch (error) {
    console.error('Error scheduling post:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to schedule post' 
    });
  }
});

/**
 * Get scheduled posts
 */
router.get('/scheduled', async (req, res) => {
  try {
    const { accountId, status, limit } = req.query;
    
    // This would be implemented in storage
    const scheduledPosts = await socialMediaManager.getScheduledPosts({
      accountId: accountId as string,
      status: status as any,
      limit: limit ? parseInt(limit as string) : undefined
    });

    res.json({
      success: true,
      scheduledPosts,
      totalPosts: scheduledPosts.length
    });
  } catch (error) {
    console.error('Error fetching scheduled posts:', error);
    res.status(500).json({ error: 'Failed to fetch scheduled posts' });
  }
});

/**
 * Execute scheduled posts (manual trigger)
 */
router.post('/execute-scheduled', async (_req, res) => {
  try {
    const result = await socialMediaManager.executeScheduledPosts();
    
    res.json({
      success: true,
      ...result,
      message: `Execution complete. ${result.posted} posts successful, ${result.failed} failed.`
    });
  } catch (error) {
    console.error('Error executing scheduled posts:', error);
    res.status(500).json({ error: 'Failed to execute scheduled posts' });
  }
});

/**
 * Update account metrics
 */
router.post('/accounts/:accountId/sync-metrics', async (req, res) => {
  try {
    const { accountId } = req.params;
    await socialMediaManager.updateAccountMetrics(accountId);
    
    res.json({
      success: true,
      message: 'Account metrics updated successfully'
    });
  } catch (error) {
    console.error('Error updating account metrics:', error);
    res.status(500).json({ error: 'Failed to update account metrics' });
  }
});

/**
 * Disconnect account
 */
router.delete('/accounts/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;
    await socialMediaManager.disconnectAccount(accountId);
    
    res.json({
      success: true,
      message: 'Account disconnected successfully'
    });
  } catch (error) {
    console.error('Error disconnecting account:', error);
    res.status(500).json({ error: 'Failed to disconnect account' });
  }
});

/**
 * Bulk update accounts
 */
router.patch('/accounts/bulk', async (req, res) => {
  try {
    const { accountIds, updates } = req.body;
    
    if (!accountIds || !Array.isArray(accountIds) || !updates) {
      return res.status(400).json({ 
        error: 'accountIds (array) and updates object are required' 
      });
    }

    const result = await socialMediaManager.bulkUpdateAccounts(accountIds, updates);
    
    res.json({
      success: true,
      ...result,
      message: `Bulk update complete. ${result.updated} accounts updated, ${result.failed} failed.`
    });
  } catch (error) {
    console.error('Error bulk updating accounts:', error);
    res.status(500).json({ error: 'Failed to bulk update accounts' });
  }
});

/**
 * Get platform connection status and requirements
 */
router.get('/platforms/:platform/info', async (req, res) => {
  try {
    const { platform } = req.params;
    
    if (!['tiktok', 'instagram', 'youtube'].includes(platform)) {
      return res.status(400).json({ error: 'Invalid platform' });
    }

    const info = {
      tiktok: {
        name: 'TikTok',
        requiredEnvVars: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET', 'TIKTOK_REDIRECT_URI'],
        scopes: ['user.info.basic', 'video.list', 'video.upload'],
        limits: { dailyPosts: 10, hourlyPosts: 3, videoLength: 600 },
        features: ['Video Upload', 'Account Info', 'Analytics'],
        isConfigured: !!(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET)
      },
      instagram: {
        name: 'Instagram',
        requiredEnvVars: ['INSTAGRAM_CLIENT_ID', 'INSTAGRAM_CLIENT_SECRET', 'INSTAGRAM_REDIRECT_URI'],
        scopes: ['instagram_basic', 'instagram_content_publish', 'pages_show_list'],
        limits: { dailyPosts: 25, hourlyPosts: 6, videoLength: 90 },
        features: ['Photo/Video Upload', 'Stories', 'Reels', 'Analytics'],
        isConfigured: !!(process.env.INSTAGRAM_CLIENT_ID && process.env.INSTAGRAM_CLIENT_SECRET)
      },
      youtube: {
        name: 'YouTube',
        requiredEnvVars: ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REDIRECT_URI'],
        scopes: ['https://www.googleapis.com/auth/youtube.upload'],
        limits: { dailyPosts: 5, hourlyPosts: 2, videoLength: 3600 },
        features: ['Video Upload', 'Channel Analytics', 'Live Streaming'],
        isConfigured: !!(process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET)
      }
    };

    res.json({
      success: true,
      platform: info[platform as keyof typeof info],
      setupGuide: {
        steps: [
          'Register your app with the platform',
          'Get client credentials (ID and secret)',
          'Set up redirect URI in your app settings',
          'Configure environment variables in your system',
          'Test the connection using the connect endpoint'
        ]
      }
    });
  } catch (error) {
    console.error('Error fetching platform info:', error);
    res.status(500).json({ error: 'Failed to fetch platform info' });
  }
});

/**
 * Get social media dashboard data
 */
router.get('/dashboard', async (req, res) => {
  try {
    const { userId } = req.query;
    const accounts = await socialMediaManager.getConnectedAccounts(userId as string);
    
    // Calculate dashboard metrics
    const totalFollowers = accounts.reduce((sum, acc) => sum + acc.followerCount, 0);
    const platformCounts = accounts.reduce((acc, account) => {
      acc[account.platform] = (acc[account.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const activeAccounts = accounts.filter(acc => acc.status === 'active').length;
    const businessAccounts = accounts.filter(acc => acc.businessAccount).length;

    // Get recent activity (this would be implemented in storage)
    const recentActivity = []; // Placeholder for recent posts, engagement metrics, etc.

    const dashboardData = {
      summary: {
        totalAccounts: accounts.length,
        activeAccounts,
        totalFollowers,
        businessAccounts,
        platformDistribution: platformCounts
      },
      topPerformingAccounts: accounts
        .sort((a, b) => b.followerCount - a.followerCount)
        .slice(0, 5),
      recentActivity,
      platformStatus: {
        tiktok: {
          configured: !!(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET),
          accounts: platformCounts.tiktok || 0
        },
        instagram: {
          configured: !!(process.env.INSTAGRAM_CLIENT_ID && process.env.INSTAGRAM_CLIENT_SECRET),
          accounts: platformCounts.instagram || 0
        },
        youtube: {
          configured: !!(process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET),
          accounts: platformCounts.youtube || 0
        }
      }
    };

    res.json({
      success: true,
      dashboard: dashboardData
    });
  } catch (error) {
    console.error('Error fetching social media dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch social media dashboard' });
  }
});

export default router;