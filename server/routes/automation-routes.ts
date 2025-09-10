import { Router } from 'express';
import { AutomationOrchestrator, OneClickConfig } from '../services/automation-orchestrator';

const router = Router();
const automationOrchestrator = new AutomationOrchestrator();

// Start one-click automation
router.post('/start', async (req, res) => {
  try {
    const config: OneClickConfig = req.body;
    
    // Validate configuration
    if (!config.contentTheme || !config.targetAudience || !config.platforms?.length) {
      return res.status(400).json({
        error: 'Missing required configuration: contentTheme, targetAudience, or platforms'
      });
    }

    const result = await automationOrchestrator.executeOneClickAutomation(config);
    
    res.json({
      success: true,
      taskId: result.taskId,
      status: result.status,
      estimatedCompletionTime: result.estimatedCompletionTime,
      message: 'Automation pipeline started successfully'
    });
  } catch (error) {
    console.error('Failed to start automation:', error);
    res.status(500).json({
      error: 'Failed to start automation pipeline',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get automation task status
router.get('/status/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = automationOrchestrator.getTaskStatus(taskId);
    
    if (!task) {
      return res.status(404).json({
        error: 'Task not found'
      });
    }

    res.json({
      success: true,
      task: {
        id: task.id,
        type: task.type,
        status: task.status,
        results: task.results,
        error: task.error,
        createdAt: task.createdAt,
        completedAt: task.completedAt,
        progress: calculateProgress(task)
      }
    });
  } catch (error) {
    console.error('Failed to get task status:', error);
    res.status(500).json({
      error: 'Failed to retrieve task status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get all active automation tasks
router.get('/tasks', async (req, res) => {
  try {
    const tasks = automationOrchestrator.getAllActiveTasks();
    
    res.json({
      success: true,
      tasks: tasks.map(task => ({
        id: task.id,
        type: task.type,
        status: task.status,
        createdAt: task.createdAt,
        completedAt: task.completedAt,
        progress: calculateProgress(task),
        hasResults: !!task.results,
        hasError: !!task.error
      }))
    });
  } catch (error) {
    console.error('Failed to get tasks:', error);
    res.status(500).json({
      error: 'Failed to retrieve tasks',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Cancel automation task
router.post('/cancel/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const cancelled = automationOrchestrator.cancelTask(taskId);
    
    if (!cancelled) {
      return res.status(400).json({
        error: 'Task not found or cannot be cancelled'
      });
    }

    res.json({
      success: true,
      message: 'Task cancelled successfully'
    });
  } catch (error) {
    console.error('Failed to cancel task:', error);
    res.status(500).json({
      error: 'Failed to cancel task',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get automation configuration templates
router.get('/templates', async (req, res) => {
  try {
    const templates = [
      {
        id: 'mobile-marketing-jp',
        name: 'Mobile Marketing (Japan)',
        description: 'Automated mobile device and carrier promotion content for Japanese market',
        config: {
          contentTheme: 'mobile',
          targetAudience: 'Japanese mobile users aged 20-50',
          platforms: ['tiktok', 'instagram', 'youtube'],
          budgetPerPlatform: 10000,
          targetROAS: 3.0,
          japaneseMarketFocus: true,
          affiliateCategories: ['mobile', 'electronics'],
          postingSchedule: {
            frequency: 'daily',
            times: ['09:00', '12:00', '18:00', '21:00']
          },
          videoProcessing: {
            useComfyUI: true,
            copyrightSafeTransformation: true,
            style: 'professional'
          }
        }
      },
      {
        id: 'finance-deals-jp',
        name: 'Finance & Credit Cards (Japan)',
        description: 'Automated financial services and credit card promotion content',
        config: {
          contentTheme: 'finance',
          targetAudience: 'Japanese adults interested in financial services',
          platforms: ['tiktok', 'instagram'],
          budgetPerPlatform: 15000,
          targetROAS: 4.0,
          japaneseMarketFocus: true,
          affiliateCategories: ['finance', 'credit_cards'],
          postingSchedule: {
            frequency: 'daily',
            times: ['08:00', '12:00', '19:00']
          },
          videoProcessing: {
            useComfyUI: true,
            copyrightSafeTransformation: true,
            style: 'professional'
          }
        }
      },
      {
        id: 'tech-gadgets-jp',
        name: 'Tech Gadgets (Japan)',
        description: 'Automated technology and gadget review content',
        config: {
          contentTheme: 'tech',
          targetAudience: 'Japanese tech enthusiasts',
          platforms: ['tiktok', 'instagram', 'youtube'],
          budgetPerPlatform: 8000,
          targetROAS: 3.5,
          japaneseMarketFocus: true,
          affiliateCategories: ['electronics', 'gadgets'],
          postingSchedule: {
            frequency: 'daily',
            times: ['10:00', '15:00', '20:00']
          },
          videoProcessing: {
            useComfyUI: true,
            copyrightSafeTransformation: true,
            style: 'tech'
          }
        }
      },
      {
        id: 'lifestyle-kawaii-jp',
        name: 'Lifestyle & Kawaii (Japan)',
        description: 'Automated cute lifestyle and fashion content for Japanese market',
        config: {
          contentTheme: 'lifestyle',
          targetAudience: 'Japanese women aged 18-35',
          platforms: ['tiktok', 'instagram'],
          budgetPerPlatform: 5000,
          targetROAS: 2.5,
          japaneseMarketFocus: true,
          affiliateCategories: ['fashion', 'beauty', 'lifestyle'],
          postingSchedule: {
            frequency: 'daily',
            times: ['11:00', '16:00', '21:00']
          },
          videoProcessing: {
            useComfyUI: true,
            copyrightSafeTransformation: true,
            style: 'kawaii'
          }
        }
      }
    ];

    res.json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('Failed to get templates:', error);
    res.status(500).json({
      error: 'Failed to retrieve templates',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get automation capabilities and service status
router.get('/capabilities', async (req, res) => {
  try {
    const capabilities = {
      videoGeneration: {
        comfyUI: !!process.env.COMFYUI_URL,
        remotion: true, // Always available as it's code-based
        ffmpeg: true // Assume ffmpeg is available
      },
      socialMediaAutomation: {
        botasaurus: !!process.env.PYTHON_ENV_PATH,
        playwright: true,
        puppeteer: true
      },
      affiliateNetworks: {
        a8net: !!(process.env.A8NET_API_KEY && process.env.A8NET_SECRET_KEY),
        rakuten: !!(process.env.RAKUTEN_APPLICATION_ID && process.env.RAKUTEN_AFFILIATE_ID),
        amazon: !!process.env.AMAZON_ASSOCIATES_API_KEY
      },
      advertisingPlatforms: {
        facebook: !!process.env.FACEBOOK_ACCESS_TOKEN,
        google: !!process.env.GOOGLE_ADS_CUSTOMER_ID,
        tiktok: !!process.env.TIKTOK_ADS_ACCESS_TOKEN
      },
      aiServices: {
        gemini: !!process.env.GOOGLE_GEMINI_API_KEY,
        openai: !!process.env.OPENAI_API_KEY
      },
      supportedPlatforms: ['tiktok', 'instagram', 'youtube', 'twitter'],
      supportedLanguages: ['japanese', 'english'],
      maxConcurrentTasks: 5,
      videoFormats: ['mp4', 'mov', 'webm'],
      imageFormats: ['jpg', 'png', 'webp']
    };

    res.json({
      success: true,
      capabilities
    });
  } catch (error) {
    console.error('Failed to get capabilities:', error);
    res.status(500).json({
      error: 'Failed to retrieve capabilities',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get automation analytics and performance metrics
router.get('/analytics', async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    // In a real implementation, this would fetch from database
    const analytics = {
      timeframe,
      totalTasks: 156,
      successfulTasks: 142,
      failedTasks: 14,
      averageCompletionTime: 12.5, // minutes
      totalContentGenerated: 478,
      totalPostsPublished: 1205,
      totalCampaignsCreated: 89,
      totalRevenue: 2850000, // ¥2,850,000
      totalAdSpend: 890000, // ¥890,000
      netProfit: 1960000, // ¥1,960,000
      averageROAS: 3.2,
      topPerformingPlatforms: [
        { platform: 'tiktok', posts: 456, revenue: 1200000 },
        { platform: 'instagram', posts: 389, revenue: 890000 },
        { platform: 'youtube', posts: 234, revenue: 760000 }
      ],
      topPerformingCategories: [
        { category: 'mobile', revenue: 1500000, commissions: 234 },
        { category: 'finance', revenue: 850000, commissions: 127 },
        { category: 'tech', revenue: 500000, commissions: 89 }
      ],
      recentTrends: {
        contentGeneration: '+15%',
        postingSuccessRate: '+8%',
        averageROAS: '+12%',
        costPerAcquisition: '-18%'
      }
    };

    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    console.error('Failed to get analytics:', error);
    res.status(500).json({
      error: 'Failed to retrieve analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Helper function to calculate task progress
function calculateProgress(task: any): number {
  switch (task.status) {
    case 'pending':
      return 0;
    case 'running':
      // Estimate progress based on time elapsed
      const elapsed = Date.now() - new Date(task.createdAt).getTime();
      const estimatedDuration = 15 * 60 * 1000; // 15 minutes in milliseconds
      return Math.min(90, (elapsed / estimatedDuration) * 100);
    case 'completed':
      return 100;
    case 'failed':
      return task.results ? 50 : 0; // Partial completion if results exist
    default:
      return 0;
  }
}

export default router;