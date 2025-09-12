import { Router } from 'express';
import { z } from 'zod';
import { searchRakutenItems } from '../services/rakuten.service';
import { getBestOfferByERPC, calculateERPC, getNetworkPerformance } from '../services/erpc.service';
import { thompsonSamplingBandit } from '../services/bandit.service';
import { eventsOrchestrator } from '../services/events-orchestrator.service';
import { complianceService } from '../services/compliance.service';
import { AffiliateNetworkSchema } from '../../shared/types/affiliate';

const router = Router();

// Search offers across networks with eRPC optimization
const searchOffersSchema = z.object({
  keyword: z.string().min(1),
  limit: z.number().optional().default(10)
});

router.get('/search', async (req, res) => {
  try {
    const { keyword, limit } = searchOffersSchema.parse(req.query);
    
    const offers = await getBestOfferByERPC(keyword, limit);
    
    res.json({
      success: true,
      data: offers,
      message: `Found ${offers.length} offers sorted by eRPC`
    });
  } catch (error) {
    console.error('Affiliate search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search offers'
    });
  }
});

// Get best offer for a specific post using bandit optimization
const bestOfferSchema = z.object({
  postId: z.string().min(1),
  keyword: z.string().optional()
});

router.get('/best-offer', async (req, res) => {
  try {
    const { postId, keyword } = bestOfferSchema.parse(req.query);
    
    // Use Thompson Sampling to choose best variant
    const selectedVariantId = await thompsonSamplingBandit.chooseVariant(postId);
    
    if (!selectedVariantId && keyword) {
      // Fallback to eRPC-based selection if no variants exist
      const offers = await getBestOfferByERPC(keyword, 1);
      return res.json({
        success: true,
        data: {
          type: 'erpc_fallback',
          offer: offers[0] || null
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        type: 'bandit_selected',
        variant_id: selectedVariantId
      }
    });
  } catch (error) {
    console.error('Best offer selection error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to select best offer'
    });
  }
});

// Record click/conversion for bandit learning
const recordMetricSchema = z.object({
  variant_id: z.string().min(1),
  type: z.enum(['click', 'conversion']),
  revenue_jpy: z.number().optional().default(0)
});

router.post('/record-metric', async (req, res) => {
  try {
    const { variant_id, type, revenue_jpy } = recordMetricSchema.parse(req.body);
    
    if (type === 'click') {
      await thompsonSamplingBandit.recordClick(variant_id);
    } else if (type === 'conversion') {
      await thompsonSamplingBandit.recordConversion(variant_id, revenue_jpy);
    }
    
    res.json({
      success: true,
      message: `${type} recorded for variant ${variant_id}`
    });
  } catch (error) {
    console.error('Metric recording error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record metric'
    });
  }
});

// Search Rakuten specifically
const rakutenSearchSchema = z.object({
  keyword: z.string().min(1),
  genreId: z.number().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  sort: z.string().optional(),
  hits: z.number().optional().default(20)
});

router.get('/rakuten/search', async (req, res) => {
  try {
    const params = rakutenSearchSchema.parse(req.query);
    
    const offers = await searchRakutenItems(params);
    
    res.json({
      success: true,
      data: offers,
      message: `Found ${offers.length} Rakuten offers`
    });
  } catch (error) {
    console.error('Rakuten search error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search Rakuten'
    });
  }
});

// Get network performance analytics
router.get('/analytics/networks', async (req, res) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    
    const performance = await getNetworkPerformance(days);
    
    res.json({
      success: true,
      data: performance
    });
  } catch (error) {
    console.error('Network analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get network analytics'
    });
  }
});

// Get variant performance for bandit
router.get('/analytics/variants', async (req, res) => {
  try {
    const postId = req.query.postId as string;
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    
    const performance = await thompsonSamplingBandit.getVariantPerformance(postId, days);
    
    res.json({
      success: true,
      data: performance
    });
  } catch (error) {
    console.error('Variant analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get variant analytics'
    });
  }
});

// Japanese events management
router.get('/events/active', async (req, res) => {
  try {
    const activeEvents = await eventsOrchestrator.getActiveEvents();
    const boostSettings = await eventsOrchestrator.getEventBoostSettings();
    
    res.json({
      success: true,
      data: {
        events: activeEvents,
        boost_settings: boostSettings
      }
    });
  } catch (error) {
    console.error('Active events error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get active events'
    });
  }
});

router.get('/events/calendar', async (req, res) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    
    const calendar = await eventsOrchestrator.getEventCalendar(days);
    
    res.json({
      success: true,
      data: calendar
    });
  } catch (error) {
    console.error('Event calendar error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get event calendar'
    });
  }
});

router.post('/events/populate-5-0-days', async (req, res) => {
  try {
    const months = req.body.months || 3;
    
    await eventsOrchestrator.populateFiveZeroDays(months);
    
    res.json({
      success: true,
      message: `Populated 5と0の日 events for next ${months} months`
    });
  } catch (error) {
    console.error('Event population error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to populate events'
    });
  }
});

// Compliance and disclosure management
const complianceCheckSchema = z.object({
  content: z.string().min(1),
  networks: z.array(AffiliateNetworkSchema),
  platform: z.string().min(1),
  include_amazon_associates: z.boolean().optional().default(false)
});

router.post('/compliance/check', async (req, res) => {
  try {
    const { content, networks, platform, include_amazon_associates } = complianceCheckSchema.parse(req.body);
    
    const validation = complianceService.validateDisclosure(content, {
      networks,
      platform,
      include_amazon_associates
    });
    
    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('Compliance check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check compliance'
    });
  }
});

router.post('/compliance/inject', async (req, res) => {
  try {
    const { content, networks, platform, include_amazon_associates } = complianceCheckSchema.parse(req.body);
    
    const updatedContent = complianceService.injectDisclosure(content, {
      networks,
      platform,
      include_amazon_associates
    });
    
    res.json({
      success: true,
      data: {
        original_content: content,
        updated_content: updatedContent
      }
    });
  } catch (error) {
    console.error('Compliance injection error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to inject compliance disclosure'
    });
  }
});

router.get('/compliance/guidelines/:platform', async (req, res) => {
  try {
    const platform = req.params.platform;
    
    const guidelines = complianceService.getPlatformGuidelines(platform);
    
    res.json({
      success: true,
      data: guidelines
    });
  } catch (error) {
    console.error('Compliance guidelines error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get compliance guidelines'
    });
  }
});

export default router;