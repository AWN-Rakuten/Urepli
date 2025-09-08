import { Router } from 'express';
import { ContentPostingService } from '../services/content-posting-service';
import { storage } from '../storage';

const router = Router();

/**
 * Create a content posting service instance
 */
function createPostingService(req: any) {
  // In a real app, these would come from user's stored credentials
  const config = {
    tiktok: process.env.TIKTOK_ACCESS_TOKEN ? {
      accessToken: process.env.TIKTOK_ACCESS_TOKEN
    } : undefined,
    instagram: process.env.INSTAGRAM_ACCESS_TOKEN && process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID ? {
      accessToken: process.env.INSTAGRAM_ACCESS_TOKEN,
      businessAccountId: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID
    } : undefined
  };

  return new ContentPostingService(config);
}

/**
 * Get available posting capabilities
 */
router.get('/capabilities', async (req, res) => {
  try {
    const service = createPostingService(req);
    const capabilities = service.getCapabilities();
    
    res.json({
      success: true,
      capabilities,
      message: `Available platforms: ${capabilities.platforms.join(', ') || 'None configured'}`
    });
  } catch (error) {
    console.error('Capabilities check error:', error);
    res.status(500).json({
      error: 'Failed to check capabilities',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Test platform connections
 */
router.get('/test-connections', async (req, res) => {
  try {
    const service = createPostingService(req);
    const connections = await service.testConnections();
    
    res.json({
      success: true,
      connections,
      summary: {
        tiktok: connections.tiktok?.connected ? 'Connected' : 'Not connected',
        instagram: connections.instagram?.connected ? 'Connected' : 'Not connected'
      }
    });
  } catch (error) {
    console.error('Connection test error:', error);
    res.status(500).json({
      error: 'Failed to test connections',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Generate Japanese content for a given topic
 */
router.post('/generate-content', async (req, res) => {
  try {
    const { topic, platform = 'tiktok' } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const service = createPostingService(req);
    const content = await service.generateJapaneseContent(topic, platform);

    res.json({
      success: true,
      content,
      platform
    });
  } catch (error) {
    console.error('Content generation error:', error);
    res.status(500).json({
      error: 'Failed to generate content',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Post content to multiple platforms
 */
router.post('/post', async (req, res) => {
  try {
    const {
      title,
      caption,
      hashtags = [],
      mediaUrl,
      mediaType = 'video',
      platforms = ['tiktok'],
      privacy = 'PUBLIC_TO_EVERYONE'
    } = req.body;

    // Validate required fields
    if (!title || !caption || !mediaUrl) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['title', 'caption', 'mediaUrl']
      });
    }

    // Validate platforms
    const validPlatforms = ['tiktok', 'instagram'];
    const invalidPlatforms = platforms.filter((p: string) => !validPlatforms.includes(p));
    if (invalidPlatforms.length > 0) {
      return res.status(400).json({
        error: 'Invalid platforms',
        invalid: invalidPlatforms,
        valid: validPlatforms
      });
    }

    const service = createPostingService(req);
    
    const content = {
      title,
      caption,
      hashtags,
      mediaUrl,
      mediaType,
      platforms,
      privacy
    };

    const results = await service.postToMultiplePlatforms(content);

    // Log the posting activity
    await storage.createAutomationLog({
      type: 'content_posting',
      message: `Posted content to ${platforms.join(', ')}: ${title}`,
      status: results.every(r => r.success) ? 'success' : 'warning',
      workflowId: null,
      metadata: {
        content,
        results,
        platforms: platforms,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length
      }
    });

    res.json({
      success: true,
      content,
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });

  } catch (error) {
    console.error('Content posting error:', error);
    
    // Log the error
    await storage.createAutomationLog({
      type: 'content_posting',
      message: `Failed to post content: ${error instanceof Error ? error.message : 'Unknown error'}`,
      status: 'error',
      workflowId: null,
      metadata: { error: String(error) }
    });

    res.status(500).json({
      error: 'Failed to post content',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Generate and post content automatically
 */
router.post('/generate-and-post', async (req, res) => {
  try {
    const {
      topic,
      mediaUrl,
      mediaType = 'video',
      platforms = ['tiktok']
    } = req.body;

    if (!topic || !mediaUrl) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['topic', 'mediaUrl']
      });
    }

    const service = createPostingService(req);
    const { content, results } = await service.generateAndPost(
      topic,
      mediaUrl,
      mediaType,
      platforms
    );

    // Log the activity
    await storage.createAutomationLog({
      type: 'auto_content_generation',
      message: `Auto-generated and posted content about "${topic}" to ${platforms.join(', ')}`,
      status: results.every(r => r.success) ? 'success' : 'warning',
      workflowId: null,
      metadata: {
        topic,
        content,
        results,
        platforms,
        successCount: results.filter(r => r.success).length
      }
    });

    res.json({
      success: true,
      topic,
      generatedContent: content,
      postingResults: results,
      summary: {
        contentGenerated: true,
        platformsPosted: results.filter(r => r.success).map(r => r.platform),
        failures: results.filter(r => !r.success)
      }
    });

  } catch (error) {
    console.error('Auto generate and post error:', error);
    res.status(500).json({
      error: 'Failed to generate and post content',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get content posting history
 */
router.get('/history', async (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;
    
    const logs = await storage.getAutomationLogs({
      type: ['content_posting', 'auto_content_generation'],
      limit: Number(limit),
      offset: Number(offset)
    });

    res.json({
      success: true,
      logs: logs.map(log => ({
        id: log.id,
        type: log.type,
        message: log.message,
        status: log.status,
        timestamp: log.timestamp,
        platforms: log.metadata?.platforms || [],
        successCount: log.metadata?.successCount || 0,
        failureCount: log.metadata?.failureCount || 0
      })),
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        hasMore: logs.length === Number(limit)
      }
    });

  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch posting history',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Create an example post with real content
 */
router.post('/create-example-post', async (req, res) => {
  try {
    const service = createPostingService(req);
    
    // Check capabilities first
    const capabilities = service.getCapabilities();
    if (capabilities.platforms.length === 0) {
      return res.status(400).json({
        error: 'No platforms configured',
        message: 'Please configure TikTok or Instagram API credentials to create posts',
        setup: {
          tiktok: 'Set TIKTOK_ACCESS_TOKEN environment variable',
          instagram: 'Set INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID environment variables'
        }
      });
    }

    // Generate Japanese content about mobile plans (MNP topic)
    const topic = 'MNP携帯乗り換えキャンペーン';
    const platform = capabilities.platforms[0] as 'tiktok' | 'instagram';
    
    const generatedContent = await service.generateJapaneseContent(topic, platform);

    // Use a sample video URL (this would be replaced with real content in production)
    const sampleVideoUrl = 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4';

    const content = {
      title: generatedContent.title,
      caption: generatedContent.caption,
      hashtags: generatedContent.hashtags,
      mediaUrl: sampleVideoUrl,
      mediaType: 'video' as const,
      platforms: capabilities.platforms as ('tiktok' | 'instagram')[],
      privacy: 'PUBLIC_TO_EVERYONE' as const
    };

    // Note: In this demo environment, we'll simulate the posting result
    // since we don't have real access tokens configured
    const simulatedResults = capabilities.platforms.map(platform => ({
      platform: platform as 'tiktok' | 'instagram',
      success: true,
      postId: `demo_${Date.now()}_${platform}`,
      url: platform === 'tiktok' 
        ? `https://www.tiktok.com/video/demo_${Date.now()}`
        : `https://www.instagram.com/p/demo_${Date.now()}`
    }));

    // Log the example creation
    await storage.createAutomationLog({
      type: 'content_posting',
      message: `Created example post: ${generatedContent.title}`,
      status: 'success',
      workflowId: null,
      metadata: {
        content,
        results: simulatedResults,
        isExample: true,
        platforms: capabilities.platforms
      }
    });

    res.json({
      success: true,
      isExample: true,
      message: 'Example post created with real AI-generated Japanese content',
      topic,
      generatedContent,
      postContent: content,
      simulatedResults,
      capabilities,
      note: 'This is a demo post with AI-generated content. Configure real API credentials to post to actual social media platforms.'
    });

  } catch (error) {
    console.error('Example post creation error:', error);
    res.status(500).json({
      error: 'Failed to create example post',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;