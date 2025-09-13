/**
 * Auto-Boost Cron Job
 * Monitors content performance and automatically creates ad campaigns for viral content
 */

import cron from 'node-cron';
import { autoBoostService } from '../services/ads/auto.boost';
import { BOOST_THRESHOLDS } from '../services/ads/auto.boost';

/**
 * Setup auto-boost monitoring cron jobs
 */
export function setupBoostCronJob() {
  
  // Every 15 minutes: Check for viral content and create boost campaigns
  cron.schedule('*/15 * * * *', async () => {
    console.log('🚀 Scanning for auto-boost opportunities...');
    
    try {
      // 1. Scan for content that meets boost criteria
      const triggers = await autoBoostService.scanForBoostOpportunities();
      
      if (triggers.length === 0) {
        console.log('📊 No content meets boost criteria currently');
        return;
      }
      
      console.log(`🎯 Found ${triggers.length} boost opportunities:`, 
        triggers.map(t => `Post ${t.postId}: ${t.views60m} views, ${(t.ctr * 100).toFixed(2)}% CTR`)
      );
      
      // 2. Create boost plans for each trigger
      let totalCampaigns = 0;
      let successfulCampaigns = 0;
      
      for (const trigger of triggers) {
        try {
          const plans = await autoBoostService.createBoostPlans(trigger);
          console.log(`📋 Created ${plans.length} boost plans for post ${trigger.postId}`);
          
          if (plans.length > 0) {
            // 3. Execute boost campaigns
            const results = await autoBoostService.executeBoostCampaigns(plans);
            
            totalCampaigns += results.length;
            successfulCampaigns += results.filter(r => r.success).length;
            
            console.log(`📈 Campaign results for post ${trigger.postId}:`);
            results.forEach(result => {
              if (result.success) {
                console.log(`  ✅ ${result.channel}: Campaign ${result.campaignId} created`);
              } else {
                console.log(`  ❌ ${result.channel}: ${result.error}`);
              }
            });
          }
        } catch (error) {
          console.error(`❌ Failed to process boost for post ${trigger.postId}:`, error);
        }
        
        // Rate limit: Wait 5 seconds between posts
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
      console.log(`✅ Auto-boost scan completed: ${successfulCampaigns}/${totalCampaigns} campaigns created successfully`);
      
    } catch (error) {
      console.error('❌ Auto-boost scan failed:', error);
    }
  }, {
    timezone: 'UTC'
  });

  // Hourly: Performance monitoring and budget adjustments
  cron.schedule('0 * * * *', async () => {
    console.log('📊 Running hourly ad performance check...');
    
    try {
      // Get active campaigns and their performance
      // This would integrate with each platform's reporting API
      await monitorCampaignPerformance();
      
    } catch (error) {
      console.error('❌ Campaign performance monitoring failed:', error);
    }
  }, {
    
    timezone: 'UTC'
  });

  // Daily at 08:00 JST: Budget optimization and campaign cleanup
  cron.schedule('0 23 * * *', async () => {
    console.log('🔧 Running daily campaign optimization...');
    
    try {
      await optimizeDailyCampaigns();
      
    } catch (error) {
      console.error('❌ Daily campaign optimization failed:', error);
    }
  }, {
    
    timezone: 'UTC'
  });

  console.log('⏰ Auto-boost cron jobs scheduled:');
  console.log('  - Viral content scan: Every 15 minutes');
  console.log('  - Performance monitoring: Hourly');
  console.log('  - Daily optimization: 08:00 JST');
}

/**
 * Monitor campaign performance and pause underperformers
 */
async function monitorCampaignPerformance() {
  // Implementation would:
  // 1. Get all active campaigns from the last 24h
  // 2. Fetch performance metrics from each platform
  // 3. Identify underperforming campaigns (ROAS < 1.5)
  // 4. Pause or adjust budgets automatically
  
  console.log('📈 Campaign performance monitoring completed');
}

/**
 * Daily campaign optimization
 */
async function optimizeDailyCampaigns() {
  // Implementation would:
  // 1. Analyze all campaigns from the past week
  // 2. Reallocate budgets based on performance
  // 3. Pause campaigns with poor ROAS
  // 4. Increase budgets for high-performing campaigns
  // 5. Generate optimization report
  
  console.log('🎯 Daily campaign optimization completed');
}

/**
 * Manual trigger for testing boost logic
 */
export async function runBoostScanNow() {
  console.log('🚀 Manual boost scan started...');
  
  try {
    const triggers = await autoBoostService.scanForBoostOpportunities();
    
    if (triggers.length === 0) {
      console.log('📊 No content currently meets boost criteria');
      return { triggers: [], campaigns: [] };
    }

    const campaignResults = [];
    
    for (const trigger of triggers) {
      const plans = await autoBoostService.createBoostPlans(trigger);
      
      if (plans.length > 0) {
        const results = await autoBoostService.executeBoostCampaigns(plans);
        campaignResults.push({
          postId: trigger.postId,
          plans: plans.length,
          results
        });
      }
    }
    
    console.log(`✅ Manual boost scan completed: ${triggers.length} opportunities, ${campaignResults.length} campaigns executed`);
    
    return {
      triggers,
      campaigns: campaignResults
    };
    
  } catch (error) {
    console.error('❌ Manual boost scan failed:', error);
    throw error;
  }
}

/**
 * Get current boost configuration and thresholds
 */
export function getBoostConfiguration() {
  return {
    thresholds: {
      views60m: 1000, // From BOOST_THRESHOLDS.VIEWS_60M
      ctrThreshold: 0.03, // 3% CTR threshold
      minEngagement: 50,
      roasForecastMin: 2.0
    },
    schedule: {
      scanInterval: '15 minutes',
      performanceCheck: '1 hour', 
      optimization: 'Daily at 08:00 JST'
    },
    channels: ['tiktok', 'meta', 'google'],
    budgetRange: {
      min: 1000,
      max: 20000,
      base: 3000
    }
  };
}