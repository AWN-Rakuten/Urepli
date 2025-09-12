/**
 * TikTok Trends API Routes
 */

import { Router } from 'express';
import { tiktokTrendsService } from '../services/trends.tiktok';
import { runTrendsHarvestNow } from '../cron/trends.cron';

const router = Router();

/**
 * GET /api/trends/tiktok?country=JP&type=hashtag&limit=20
 * Get stored TikTok trends
 */
router.get('/tiktok', async (req, res) => {
  try {
    const { country = 'JP', type, limit = '50' } = req.query;
    
    const trends = await tiktokTrendsService.getTrends(
      country as string,
      type as string | undefined,
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data: trends,
      count: trends.length,
      filters: { country, type, limit }
    });
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trends'
    });
  }
});

/**
 * POST /api/trends/tiktok/harvest
 * Manually trigger trend harvesting
 */
router.post('/tiktok/harvest', async (req, res) => {
  try {
    const trends = await runTrendsHarvestNow();
    
    res.json({
      success: true,
      message: 'Trends harvested successfully',
      data: trends,
      count: trends.length
    });
  } catch (error) {
    console.error('Error harvesting trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to harvest trends'
    });
  }
});

/**
 * GET /api/trends/tiktok/stats
 * Get trend statistics
 */
router.get('/tiktok/stats', async (req, res) => {
  try {
    const { country = 'JP' } = req.query;
    
    const [hashtags, songs, creators] = await Promise.all([
      tiktokTrendsService.getTrends(country as string, 'hashtag', 1000),
      tiktokTrendsService.getTrends(country as string, 'song', 1000), 
      tiktokTrendsService.getTrends(country as string, 'creator', 1000)
    ]);

    const stats = {
      total: hashtags.length + songs.length + creators.length,
      hashtags: hashtags.length,
      songs: songs.length,
      creators: creators.length,
      topHashtags: hashtags.slice(0, 10).map(h => ({ name: h.name, score: h.score })),
      topSongs: songs.slice(0, 5).map(s => ({ name: s.name, score: s.score })),
      topCreators: creators.slice(0, 5).map(c => ({ name: c.name, score: c.score })),
      lastUpdated: hashtags[0]?.metadata?.updated_at || new Date().toISOString()
    };

    res.json({
      success: true,
      data: stats,
      country
    });
  } catch (error) {
    console.error('Error fetching trend stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trend statistics'
    });
  }
});

export default router;