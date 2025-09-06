import { Router } from 'express';
import { AffiliateTracker } from '../services/affiliate-tracker';
import { DynamicGeminiSeedManager } from '../services/dynamic-gemini-seeds';
import { storage } from '../storage';

const router = Router();
const affiliateTracker = new AffiliateTracker();
const seedManager = new DynamicGeminiSeedManager();

/**
 * Get all available real affiliate programs
 */
router.get('/programs', async (_req, res) => {
  try {
    const programs = await affiliateTracker.getRealAffiliatePrograms();
    res.json({
      success: true,
      programs,
      totalPrograms: programs.length
    });
  } catch (error) {
    console.error('Error fetching affiliate programs:', error);
    res.status(500).json({ error: 'Failed to fetch affiliate programs' });
  }
});

/**
 * Get affiliate program by ID
 */
router.get('/programs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const program = await affiliateTracker.getAffiliateProgramById(id);
    
    if (!program) {
      return res.status(404).json({ error: 'Affiliate program not found' });
    }

    res.json({
      success: true,
      program
    });
  } catch (error) {
    console.error('Error fetching affiliate program:', error);
    res.status(500).json({ error: 'Failed to fetch affiliate program' });
  }
});

/**
 * Create affiliate tracking link
 */
router.post('/links', async (req, res) => {
  try {
    const { programId, originalUrl, campaignName, customParameters } = req.body;
    
    if (!programId || !originalUrl) {
      return res.status(400).json({ 
        error: 'programId and originalUrl are required' 
      });
    }

    const link = await affiliateTracker.createAffiliateLink(
      programId,
      originalUrl,
      campaignName,
      customParameters
    );

    res.json({
      success: true,
      link,
      message: 'Affiliate link created successfully'
    });
  } catch (error) {
    console.error('Error creating affiliate link:', error);
    res.status(500).json({ error: 'Failed to create affiliate link' });
  }
});

/**
 * Track affiliate link click
 */
router.post('/links/:linkId/click', async (req, res) => {
  try {
    const { linkId } = req.params;
    const { source } = req.body;
    
    if (!source || !['tiktok', 'instagram', 'youtube', 'direct'].includes(source)) {
      return res.status(400).json({ 
        error: 'Valid source is required (tiktok, instagram, youtube, direct)' 
      });
    }

    await affiliateTracker.trackClick(linkId, source);

    res.json({
      success: true,
      message: 'Click tracked successfully'
    });
  } catch (error) {
    console.error('Error tracking click:', error);
    res.status(500).json({ error: 'Failed to track click' });
  }
});

/**
 * Record affiliate sale
 */
router.post('/sales', async (req, res) => {
  try {
    const saleData = req.body;
    
    // Validate required fields
    const requiredFields = ['linkId', 'programId', 'saleAmount', 'commission', 'source', 'saleDate'];
    const missingFields = requiredFields.filter(field => !saleData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: `Missing required fields: ${missingFields.join(', ')}` 
      });
    }

    const sale = await affiliateTracker.recordSale({
      ...saleData,
      saleDate: new Date(saleData.saleDate)
    });

    res.json({
      success: true,
      sale,
      message: 'Sale recorded successfully'
    });
  } catch (error) {
    console.error('Error recording sale:', error);
    res.status(500).json({ error: 'Failed to record sale' });
  }
});

/**
 * Get comprehensive affiliate KPIs
 */
router.get('/kpis', async (req, res) => {
  try {
    const { startDate, endDate, programId } = req.query;
    
    const kpis = await affiliateTracker.getAffiliateKPIs(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined,
      programId as string
    );

    res.json({
      success: true,
      kpis,
      period: {
        startDate: startDate || 'All time',
        endDate: endDate || 'Present',
        programId: programId || 'All programs'
      }
    });
  } catch (error) {
    console.error('Error fetching affiliate KPIs:', error);
    res.status(500).json({ error: 'Failed to fetch affiliate KPIs' });
  }
});

/**
 * Optimize affiliate links
 */
router.post('/optimize', async (req, res) => {
  try {
    const result = await affiliateTracker.optimizeAffiliateLinks();

    res.json({
      success: true,
      ...result,
      message: `Optimization complete. ${result.autoAppliedChanges} auto-changes applied, ${result.recommendations.length} recommendations provided.`
    });
  } catch (error) {
    console.error('Error optimizing affiliate links:', error);
    res.status(500).json({ error: 'Failed to optimize affiliate links' });
  }
});

/**
 * Get program recommendations
 */
router.post('/recommendations', async (req, res) => {
  try {
    const { targetAudience, platform, minEPC } = req.body;
    
    if (!targetAudience || !platform) {
      return res.status(400).json({ 
        error: 'targetAudience and platform are required' 
      });
    }

    const recommendations = await affiliateTracker.getRecommendedPrograms(
      targetAudience,
      platform,
      minEPC
    );

    res.json({
      success: true,
      recommendations,
      criteria: { targetAudience, platform, minEPC }
    });
  } catch (error) {
    console.error('Error getting program recommendations:', error);
    res.status(500).json({ error: 'Failed to get program recommendations' });
  }
});

/**
 * Handle affiliate network webhooks
 */
router.post('/webhooks/:source', async (req, res) => {
  try {
    const { source } = req.params;
    const payload = req.body;
    
    const result = await affiliateTracker.handleAffiliateWebhook(source, payload);
    
    res.json(result);
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Webhook processing failed' 
    });
  }
});

/**
 * Get affiliate performance dashboard data
 */
router.get('/dashboard', async (req, res) => {
  try {
    const [programs, kpis, recentSales] = await Promise.all([
      affiliateTracker.getRealAffiliatePrograms(),
      affiliateTracker.getAffiliateKPIs(),
      storage.getAffiliateSales(undefined, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    ]);

    const dashboardData = {
      totalPrograms: programs.length,
      activePrograms: programs.filter(p => p.isActive).length,
      totalRevenue: kpis.totalRevenue,
      totalClicks: kpis.totalClicks,
      totalConversions: kpis.totalConversions,
      conversionRate: kpis.conversionRate,
      roi: kpis.roi,
      topPerformers: kpis.topPerformers,
      recentSales: recentSales.slice(0, 10),
      weeklyStats: kpis.dailyStats.slice(-7)
    };

    res.json({
      success: true,
      dashboard: dashboardData
    });
  } catch (error) {
    console.error('Error fetching affiliate dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch affiliate dashboard' });
  }
});

/**
 * Gemini Seed Management Routes
 */

/**
 * Initialize Gemini seeds
 */
router.post('/gemini/seeds/initialize', async (_req, res) => {
  try {
    await seedManager.initializeSeeds();
    res.json({
      success: true,
      message: 'Gemini seeds initialized successfully'
    });
  } catch (error) {
    console.error('Error initializing seeds:', error);
    res.status(500).json({ error: 'Failed to initialize Gemini seeds' });
  }
});

/**
 * Get active Gemini seeds
 */
router.get('/gemini/seeds', async (req, res) => {
  try {
    const { category } = req.query;
    const seeds = await seedManager.getActiveSeeds(category as string);
    
    res.json({
      success: true,
      seeds,
      totalSeeds: seeds.length,
      category: category || 'all'
    });
  } catch (error) {
    console.error('Error fetching seeds:', error);
    res.status(500).json({ error: 'Failed to fetch Gemini seeds' });
  }
});

/**
 * Get best performing seed for category
 */
router.get('/gemini/seeds/best/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const seed = await seedManager.getBestSeed(category);
    
    if (!seed) {
      return res.status(404).json({ error: 'No active seeds found for category' });
    }

    res.json({
      success: true,
      seed,
      category
    });
  } catch (error) {
    console.error('Error fetching best seed:', error);
    res.status(500).json({ error: 'Failed to fetch best seed' });
  }
});

/**
 * Create optimized seed
 */
router.post('/gemini/seeds/optimize', async (req, res) => {
  try {
    const { category, performance, context } = req.body;
    
    if (!category || !performance) {
      return res.status(400).json({ 
        error: 'category and performance data are required' 
      });
    }

    const seed = await seedManager.createOptimizedSeed(category, performance, context);
    
    res.json({
      success: true,
      seed,
      message: 'Optimized seed created successfully'
    });
  } catch (error) {
    console.error('Error creating optimized seed:', error);
    res.status(500).json({ error: 'Failed to create optimized seed' });
  }
});

/**
 * Update seed performance
 */
router.post('/gemini/seeds/:seedId/performance', async (req, res) => {
  try {
    const { seedId } = req.params;
    const metrics = req.body;
    
    if (typeof metrics.successful !== 'boolean' || typeof metrics.responseTime !== 'number') {
      return res.status(400).json({ 
        error: 'successful (boolean) and responseTime (number) are required' 
      });
    }

    await seedManager.updateSeedPerformance(seedId, metrics);
    
    res.json({
      success: true,
      message: 'Seed performance updated successfully'
    });
  } catch (error) {
    console.error('Error updating seed performance:', error);
    res.status(500).json({ error: 'Failed to update seed performance' });
  }
});

/**
 * Auto-optimize underperforming seeds
 */
router.post('/gemini/seeds/auto-optimize', async (_req, res) => {
  try {
    const results = await seedManager.autoOptimizeSeeds();
    
    res.json({
      success: true,
      results,
      message: `Auto-optimization complete. ${results.length} seeds optimized.`
    });
  } catch (error) {
    console.error('Error auto-optimizing seeds:', error);
    res.status(500).json({ error: 'Failed to auto-optimize seeds' });
  }
});

/**
 * Get seed recommendations
 */
router.post('/gemini/seeds/recommendations', async (req, res) => {
  try {
    const { contentType, targetAudience, platform } = req.body;
    
    if (!contentType || !targetAudience || !platform) {
      return res.status(400).json({ 
        error: 'contentType, targetAudience, and platform are required' 
      });
    }

    const recommendations = await seedManager.getSeedRecommendations(
      contentType,
      targetAudience,
      platform
    );
    
    res.json({
      success: true,
      recommendations,
      criteria: { contentType, targetAudience, platform }
    });
  } catch (error) {
    console.error('Error getting seed recommendations:', error);
    res.status(500).json({ error: 'Failed to get seed recommendations' });
  }
});

/**
 * Generate content using optimal seed
 */
router.post('/gemini/generate', async (req, res) => {
  try {
    const { category, prompt, context } = req.body;
    
    if (!category || !prompt) {
      return res.status(400).json({ 
        error: 'category and prompt are required' 
      });
    }

    const result = await seedManager.generateWithOptimalSeed(category, prompt, context);
    
    res.json({
      success: true,
      ...result,
      message: 'Content generated successfully'
    });
  } catch (error) {
    console.error('Error generating content:', error);
    res.status(500).json({ error: 'Failed to generate content' });
  }
});

/**
 * Get seed performance report
 */
router.get('/gemini/seeds/report', async (_req, res) => {
  try {
    const report = await seedManager.exportSeedPerformanceReport();
    
    res.json({
      success: true,
      report,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating seed report:', error);
    res.status(500).json({ error: 'Failed to generate seed performance report' });
  }
});

export default router;