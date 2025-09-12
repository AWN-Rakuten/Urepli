import { Router } from 'express';
import { performanceOptimizer } from '../services/performance.optimizer';
import { japaneseCompliance } from '../services/japanese.compliance';
import { z } from 'zod';

const router = Router();

// Performance optimization schemas
const performanceMetricsSchema = z.object({
  url: z.string(),
  impressions: z.number().min(0),
  clicks: z.number().min(0),
  ctr: z.number().min(0).max(1),
  avgPosition: z.number().min(0),
  dwellTime: z.number().min(0),
  bounceRate: z.number().min(0).max(1),
  conversions: z.number().min(0),
  revenue: z.number().min(0),
  date: z.string().transform((str) => new Date(str))
});

const contentVariantSchema = z.object({
  id: z.string(),
  type: z.enum(['title', 'thumbnail', 'meta_description', 'hook', 'cta']),
  content: z.string(),
  performanceScore: z.number().default(0),
  impressions: z.number().default(0),
  clicks: z.number().default(0),
  conversions: z.number().default(0)
});

// Compliance schemas
const complianceCheckSchema = z.object({
  title: z.string().optional(),
  body: z.string(),
  hasAffiliateLinks: z.boolean().default(false),
  hasAmazonLinks: z.boolean().default(false),
  hasRakutenLinks: z.boolean().default(false),
  platform: z.string().default('blog')
});

/**
 * POST /api/optimization/record-performance
 * Record performance metrics for content
 */
router.post('/record-performance', async (req, res) => {
  try {
    const { contentId, metrics } = req.body;
    
    if (!contentId || !metrics) {
      return res.status(400).json({
        error: 'contentId and metrics are required'
      });
    }

    const validation = performanceMetricsSchema.safeParse(metrics);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid metrics data',
        details: validation.error.errors
      });
    }

    performanceOptimizer.recordPerformance(contentId, validation.data);
    
    res.json({
      success: true,
      message: 'Performance metrics recorded'
    });

  } catch (error) {
    console.error('Failed to record performance:', error);
    res.status(500).json({
      error: 'Failed to record performance metrics',
      message: error.message
    });
  }
});

/**
 * GET /api/optimization/performance/:contentId
 * Get performance summary for content
 */
router.get('/performance/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;
    
    const summary = performanceOptimizer.getPerformanceSummary(contentId);
    
    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('Failed to get performance summary:', error);
    res.status(500).json({
      error: 'Failed to get performance summary',
      message: error.message
    });
  }
});

/**
 * POST /api/optimization/add-variant
 * Add content variant for A/B testing
 */
router.post('/add-variant', async (req, res) => {
  try {
    const { contentId, variant } = req.body;
    
    if (!contentId || !variant) {
      return res.status(400).json({
        error: 'contentId and variant are required'
      });
    }

    const validation = contentVariantSchema.safeParse(variant);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid variant data',
        details: validation.error.errors
      });
    }

    const variantData = {
      ...validation.data,
      lastTested: new Date()
    };

    performanceOptimizer.addContentVariant(contentId, variantData);
    
    res.json({
      success: true,
      message: 'Content variant added for testing',
      data: variantData
    });

  } catch (error) {
    console.error('Failed to add variant:', error);
    res.status(500).json({
      error: 'Failed to add content variant',
      message: error.message
    });
  }
});

/**
 * GET /api/optimization/select-variant/:contentId
 * Select optimal variant using bandit algorithm
 */
router.get('/select-variant/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;
    
    const selectedVariant = performanceOptimizer.selectOptimalVariant(contentId);
    
    if (!selectedVariant) {
      return res.status(404).json({
        error: 'No variants found for this content'
      });
    }

    res.json({
      success: true,
      data: selectedVariant
    });

  } catch (error) {
    console.error('Failed to select variant:', error);
    res.status(500).json({
      error: 'Failed to select optimal variant',
      message: error.message
    });
  }
});

/**
 * POST /api/optimization/update-performance
 * Update variant performance with success/failure
 */
router.post('/update-performance', async (req, res) => {
  try {
    const { contentId, variantId, success, reward = 0 } = req.body;
    
    if (!contentId || !variantId || typeof success !== 'boolean') {
      return res.status(400).json({
        error: 'contentId, variantId, and success are required'
      });
    }

    await performanceOptimizer.updateArmPerformance(
      contentId, 
      variantId, 
      success, 
      reward
    );
    
    res.json({
      success: true,
      message: 'Performance updated successfully'
    });

  } catch (error) {
    console.error('Failed to update performance:', error);
    res.status(500).json({
      error: 'Failed to update performance',
      message: error.message
    });
  }
});

/**
 * GET /api/optimization/analyze/:contentId
 * Analyze content performance and get recommendations
 */
router.get('/analyze/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;
    
    const recommendations = await performanceOptimizer.analyzePerformance(contentId);
    
    res.json({
      success: true,
      data: {
        contentId,
        recommendations,
        generatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Failed to analyze performance:', error);
    res.status(500).json({
      error: 'Failed to analyze performance',
      message: error.message
    });
  }
});

/**
 * POST /api/optimization/auto-optimize/:contentId
 * Auto-optimize content based on performance data
 */
router.post('/auto-optimize/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;
    
    const result = await performanceOptimizer.autoOptimizeContent(contentId);
    
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Failed to auto-optimize:', error);
    res.status(500).json({
      error: 'Failed to auto-optimize content',
      message: error.message
    });
  }
});

/**
 * GET /api/optimization/insights
 * Get overall optimization insights
 */
router.get('/insights', async (req, res) => {
  try {
    const insights = performanceOptimizer.getOptimizationInsights();
    
    res.json({
      success: true,
      data: insights
    });

  } catch (error) {
    console.error('Failed to get insights:', error);
    res.status(500).json({
      error: 'Failed to get optimization insights',
      message: error.message
    });
  }
});

/**
 * POST /api/optimization/run-cycle
 * Run automated optimization cycle
 */
router.post('/run-cycle', async (req, res) => {
  try {
    const result = await performanceOptimizer.runOptimizationCycle();
    
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Failed to run optimization cycle:', error);
    res.status(500).json({
      error: 'Failed to run optimization cycle',
      message: error.message
    });
  }
});

// Compliance endpoints

/**
 * POST /api/optimization/compliance/check
 * Check content compliance
 */
router.post('/compliance/check', async (req, res) => {
  try {
    const validation = complianceCheckSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid content data',
        details: validation.error.errors
      });
    }

    const report = japaneseCompliance.checkCompliance(validation.data);
    
    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('Compliance check failed:', error);
    res.status(500).json({
      error: 'Compliance check failed',
      message: error.message
    });
  }
});

/**
 * POST /api/optimization/compliance/auto-fix
 * Auto-fix compliance issues
 */
router.post('/compliance/auto-fix', async (req, res) => {
  try {
    const { content, metadata = {} } = req.body;
    
    if (!content) {
      return res.status(400).json({
        error: 'Content is required'
      });
    }

    const result = japaneseCompliance.autoFixContent(content, metadata);
    
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Auto-fix failed:', error);
    res.status(500).json({
      error: 'Auto-fix failed',
      message: error.message
    });
  }
});

/**
 * POST /api/optimization/compliance/validate
 * Validate content for publishing
 */
router.post('/compliance/validate', async (req, res) => {
  try {
    const { title, body, hasAffiliateLinks, hasAmazonLinks, hasRakutenLinks, platform } = req.body;
    
    if (!body) {
      return res.status(400).json({
        error: 'Content body is required'
      });
    }

    const validation = japaneseCompliance.validateForPublishing({
      title: title || '',
      body,
      hasAffiliateLinks: hasAffiliateLinks || false,
      hasAmazonLinks: hasAmazonLinks || false,
      hasRakutenLinks: hasRakutenLinks || false,
      platform: platform || 'blog'
    });
    
    res.json({
      success: true,
      data: validation
    });

  } catch (error) {
    console.error('Content validation failed:', error);
    res.status(500).json({
      error: 'Content validation failed',
      message: error.message
    });
  }
});

/**
 * GET /api/optimization/compliance/template/:contentType/:niche
 * Generate compliance template
 */
router.get('/compliance/template/:contentType/:niche', async (req, res) => {
  try {
    const { contentType, niche } = req.params;
    
    if (!['blog', 'video', 'social'].includes(contentType)) {
      return res.status(400).json({
        error: 'Invalid content type. Must be blog, video, or social'
      });
    }

    const template = japaneseCompliance.generateComplianceTemplate(
      contentType as 'blog' | 'video' | 'social',
      niche
    );
    
    res.json({
      success: true,
      data: {
        contentType,
        niche,
        template
      }
    });

  } catch (error) {
    console.error('Template generation failed:', error);
    res.status(500).json({
      error: 'Template generation failed',
      message: error.message
    });
  }
});

/**
 * GET /api/optimization/compliance/stats
 * Get compliance statistics
 */
router.get('/compliance/stats', async (req, res) => {
  try {
    const stats = japaneseCompliance.getComplianceStatistics();
    
    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Failed to get compliance stats:', error);
    res.status(500).json({
      error: 'Failed to get compliance statistics',
      message: error.message
    });
  }
});

/**
 * GET /api/optimization/factory/status
 * Get overall factory automation status
 */
router.get('/factory/status', async (req, res) => {
  try {
    const insights = performanceOptimizer.getOptimizationInsights();
    const complianceStats = japaneseCompliance.getComplianceStatistics();
    
    const status = {
      optimization: {
        contentsTracked: insights.totalContentsTracked,
        averageImprovement: insights.averageImprovement,
        opportunities: insights.optimizationOpportunities,
        topPerformers: insights.topPerformers.length
      },
      compliance: {
        totalRules: complianceStats.totalRules,
        criticalRules: complianceStats.criticalRules,
        rulesByCategory: complianceStats.rulesByCategory
      },
      automation: {
        dailyGeneration: '5:00 JST',
        hourlyOptimization: 'Active',
        weeklyMaintenance: 'Sunday 1:00 JST',
        complianceAudit: '23:00 JST'
      },
      lastUpdate: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Failed to get factory status:', error);
    res.status(500).json({
      error: 'Failed to get factory status',
      message: error.message
    });
  }
});

/**
 * POST /api/optimization/factory/emergency
 * Run emergency optimization
 */
router.post('/factory/emergency', async (req, res) => {
  try {
    // Run emergency optimization tasks
    const optimizationResult = await performanceOptimizer.runOptimizationCycle();
    
    res.json({
      success: true,
      message: 'Emergency optimization completed',
      data: optimizationResult
    });

  } catch (error) {
    console.error('Emergency optimization failed:', error);
    res.status(500).json({
      error: 'Emergency optimization failed',
      message: error.message
    });
  }
});

export default router;