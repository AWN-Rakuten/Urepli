/**
 * TikTok Trends Harvester Cron Job
 * Runs daily at 05:00 JST to fetch trending hashtags, songs, and creators
 */

import cron from 'node-cron';
import { tiktokTrendsService } from '../services/trends.tiktok';

/**
 * Schedule: Daily at 05:00 JST
 * Cron expression: '0 5 * * *' in JST (20:00 UTC previous day)
 */
export function setupTrendsCronJob() {
  // Run at 20:00 UTC (05:00 JST next day)
  cron.schedule('0 20 * * *', async () => {
    console.log('🎯 Starting TikTok trends harvesting at 05:00 JST...');
    
    try {
      // Fetch all trends for Japan
      const trends = await tiktokTrendsService.fetchAllTrends('JP');
      
      console.log(`📊 Fetched ${trends.length} trends:`, {
        hashtags: trends.filter(t => t.type === 'hashtag').length,
        songs: trends.filter(t => t.type === 'song').length,
        creators: trends.filter(t => t.type === 'creator').length
      });

      // Store trends in database
      await tiktokTrendsService.storeTrends(trends);
      
      console.log('✅ TikTok trends harvesting completed successfully');
      
      // Cleanup browser resources
      await tiktokTrendsService.closeBrowser();
      
    } catch (error) {
      console.error('❌ TikTok trends harvesting failed:', error);
    }
  }, {
    scheduled: true,
    timezone: 'UTC'
  });

  // Also run a lighter update every 4 hours for hashtags only
  cron.schedule('0 */4 * * *', async () => {
    console.log('🔄 Running hourly hashtag update...');
    
    try {
      const hashtags = await tiktokTrendsService.fetchTrendingHashtags('JP');
      await tiktokTrendsService.storeTrends(hashtags);
      
      console.log(`✅ Updated ${hashtags.length} hashtags`);
      await tiktokTrendsService.closeBrowser();
      
    } catch (error) {
      console.error('❌ Hashtag update failed:', error);
    }
  }, {
    scheduled: true,
    timezone: 'UTC'
  });

  console.log('⏰ TikTok trends cron jobs scheduled:');
  console.log('  - Full harvest: Daily at 05:00 JST');
  console.log('  - Hashtag updates: Every 4 hours');
}

/**
 * Manual trigger for testing
 */
export async function runTrendsHarvestNow() {
  console.log('🚀 Manual TikTok trends harvest started...');
  
  try {
    const trends = await tiktokTrendsService.fetchAllTrends('JP');
    await tiktokTrendsService.storeTrends(trends);
    await tiktokTrendsService.closeBrowser();
    
    console.log(`✅ Manual harvest completed: ${trends.length} trends stored`);
    return trends;
  } catch (error) {
    console.error('❌ Manual harvest failed:', error);
    throw error;
  }
}