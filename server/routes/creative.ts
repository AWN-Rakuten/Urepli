/**
 * Creative Generation API Routes
 */

import { Router } from 'express';
import { creativeGenerator } from '../services/creative.generator';
import { tiktokTrendsService } from '../services/trends.tiktok';
import { unifiedOfferService } from '../services/unified.offers';
import { eventsService } from '../services/events';

const router = Router();

/**
 * POST /api/creative/generate
 * Generate creative content variations
 */
router.post('/generate', async (req, res) => {
  try {
    const { trendId, keyword, offerCount = 3 } = req.body;
    
    if (!keyword) {
      return res.status(400).json({
        success: false,
        error: 'Keyword is required'
      });
    }

    // Get trend (either by ID or use latest trending hashtag)
    let trend;
    if (trendId) {
      const trends = await tiktokTrendsService.getTrends('JP', undefined, 100);
      trend = trends.find(t => t.id === trendId);
    } else {
      const trends = await tiktokTrendsService.getTrends('JP', 'hashtag', 1);
      trend = trends[0];
    }

    if (!trend) {
      return res.status(404).json({
        success: false,
        error: 'No trending content found'
      });
    }

    // Get offers for the keyword
    const offers = await unifiedOfferService.searchOffers({ keyword, limit: offerCount });
    
    if (offers.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No offers found for keyword'
      });
    }

    // Check for active events
    const currentEvent = await eventsService.getCurrentEvent();

    // Generate creative content for each offer
    const creativeResults = await Promise.allSettled(
      offers.map(offer => 
        creativeGenerator.generateContent({
          trend,
          offer,
          eventActive: currentEvent ? {
            code: currentEvent.code,
            badge: currentEvent.metadata.badge || currentEvent.name,
            multiplier: currentEvent.metadata.pointMultiplier
          } : undefined
        })
      )
    );

    const successfulResults = creativeResults
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map(result => result.value);

    res.json({
      success: true,
      data: {
        trend,
        currentEvent,
        offers: offers.slice(0, successfulResults.length),
        creatives: successfulResults,
        generatedCount: successfulResults.length
      }
    });

  } catch (error) {
    console.error('Error generating creative content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate creative content'
    });
  }
});

/**
 * POST /api/creative/generate-batch
 * Generate creative content for multiple keywords
 */
router.post('/generate-batch', async (req, res) => {
  try {
    const { keywords, trendsCount = 3 } = req.body;
    
    if (!keywords || !Array.isArray(keywords)) {
      return res.status(400).json({
        success: false,
        error: 'Keywords array is required'
      });
    }

    // Get top trends
    const trends = await tiktokTrendsService.getTrends('JP', 'hashtag', trendsCount);
    const currentEvent = await eventsService.getCurrentEvent();

    const batchResults = [];

    for (const keyword of keywords.slice(0, 5)) { // Limit to 5 keywords
      try {
        const offers = await unifiedOfferService.searchOffers({ keyword, limit: 2 });
        
        if (offers.length > 0 && trends.length > 0) {
          const creative = await creativeGenerator.generateContent({
            trend: trends[0], // Use top trend
            offer: offers[0], // Use best offer
            eventActive: currentEvent ? {
              code: currentEvent.code,
              badge: currentEvent.metadata.badge || currentEvent.name,
              multiplier: currentEvent.metadata.pointMultiplier
            } : undefined
          });

          batchResults.push({
            keyword,
            trend: trends[0],
            offer: offers[0],
            creative,
            success: true
          });
        } else {
          batchResults.push({
            keyword,
            success: false,
            error: 'No offers or trends found'
          });
        }
      } catch (error) {
        batchResults.push({
          keyword,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      data: {
        currentEvent,
        totalKeywords: keywords.length,
        processedKeywords: batchResults.length,
        successfulGenerations: batchResults.filter(r => r.success).length,
        results: batchResults
      }
    });

  } catch (error) {
    console.error('Error in batch creative generation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate batch creative content'
    });
  }
});

/**
 * GET /api/creative/templates
 * Get available creative templates and presets
 */
router.get('/templates', async (req, res) => {
  try {
    // Import shorts presets
    const { shortsPresets, eventPresetModifiers } = await import('../../client/src/presets/shorts');
    
    res.json({
      success: true,
      data: {
        presets: shortsPresets,
        eventModifiers: eventPresetModifiers,
        totalPresets: shortsPresets.length
      }
    });
  } catch (error) {
    console.error('Error fetching creative templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch creative templates'
    });
  }
});

/**
 * POST /api/creative/validate-script
 * Validate and optimize a creative script
 */
router.post('/validate-script', async (req, res) => {
  try {
    const { script, duration, platform = 'tiktok' } = req.body;
    
    if (!script) {
      return res.status(400).json({
        success: false,
        error: 'Script is required'
      });
    }

    // Basic script validation
    const wordCount = script.split(/\s+/).length;
    const estimatedDuration = wordCount * 0.5; // Rough estimate: 0.5 seconds per word
    const durationMatch = Math.abs(estimatedDuration - (duration || 20)) < 5;

    // Check for required elements
    const hasHook = script.toLowerCase().includes('hook') || script.length > 10;
    const hasCTA = script.toLowerCase().includes('リンク') || script.toLowerCase().includes('チェック');
    const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(script);

    const validation = {
      isValid: hasHook && hasCTA && hasJapanese && durationMatch,
      checks: {
        hasHook,
        hasCTA,
        hasJapanese,
        durationMatch,
        wordCount,
        estimatedDuration
      },
      suggestions: []
    };

    if (!hasHook) validation.suggestions.push('スクリプトにフック要素を追加してください');
    if (!hasCTA) validation.suggestions.push('コールトゥアクション（CTA）を追加してください');
    if (!hasJapanese) validation.suggestions.push('日本語テキストを追加してください');
    if (!durationMatch) validation.suggestions.push('スクリプトの長さを調整してください');

    res.json({
      success: true,
      data: validation
    });

  } catch (error) {
    console.error('Error validating script:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate script'
    });
  }
});

export default router;