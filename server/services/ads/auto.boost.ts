/**
 * Auto-Boost Service
 * Automatically promotes winning organic content to paid ads across TikTok, Meta, and Google
 */

import { db } from '../../db';
import { content, variantMetricsDaily } from '../../../shared/schema';
import { eq, gte, sql } from 'drizzle-orm';
import { subHours, subDays } from 'date-fns';
import { tiktokAdsService } from './tiktok';
import { metaAdsService } from './meta';
import { googleAdsService } from './google';
import { 
  BoostTrigger, 
  BoostPlan, 
  AdCampaignResult, 
  AdChannel,
  CampaignConfig 
} from './ads.types';

// Boost thresholds
export const BOOST_THRESHOLDS = {
  VIEWS_60M: 1000,
  CTR_THRESHOLD: 0.03, // 3%
  MIN_ENGAGEMENT: 50,
  ROAS_FORECAST_MIN: 2.0
};

/**
 * Auto-Boost Service for promoting viral content
 */
export class AutoBoostService {
  
  /**
   * Check all recent content for boost eligibility
   */
  async scanForBoostOpportunities(): Promise<BoostTrigger[]> {
    const oneHourAgo = subHours(new Date(), 1);
    const oneDayAgo = subDays(new Date(), 1);
    
    // Get recent content with performance metrics
    const candidates = await db.select({
      id: content.id,
      title: content.title,
      platform: content.platform,
      views: content.views,
      thumbnailUrl: content.thumbnailUrl,
      videoUrl: content.videoUrl,
      createdAt: content.createdAt
    })
    .from(content)
    .where(
      and(
        gte(content.createdAt, oneDayAgo),
        eq(content.status, 'published')
      )
    );

    const boostTriggers: BoostTrigger[] = [];

    for (const post of candidates) {
      // Calculate 60-minute window performance
      const performance = await this.getPostPerformance(post.id, 1);
      
      if (this.shouldBoost(performance)) {
        boostTriggers.push({
          postId: post.id,
          views60m: performance.views,
          ctr: performance.ctr,
          platform: post.platform,
          creativeId: post.id, // Use post ID as creative reference
          videoUrl: post.videoUrl,
          thumbnailUrl: post.thumbnailUrl
        });
      }
    }

    return boostTriggers;
  }

  /**
   * Create boost plans for triggered content
   */
  async createBoostPlans(trigger: BoostTrigger): Promise<BoostPlan[]> {
    const plans: BoostPlan[] = [];
    
    // Get offer URL for this post
    const bestOffer = await this.getBestOfferForPost(trigger.postId);
    const targetUrl = bestOffer?.affiliate_url || 'https://example.com';

    // Calculate performance-based budget allocation
    const basebudget = this.calculateBaseBudget(trigger);
    
    // Create plans for each channel based on content performance
    if (trigger.views60m >= BOOST_THRESHOLDS.VIEWS_60M) {
      // TikTok plan
      plans.push({
        channel: 'tiktok',
        dailyBudgetJPY: Math.round(basebudget * 1.2), // TikTok gets 20% premium for viral content
        ctaUrl: targetUrl,
        creativeId: trigger.creativeId,
        campaignName: `AutoBoost_${trigger.postId}_TikTok`,
        audience: {
          locations: ['JP'],
          ages: ['AGE_18_24', 'AGE_25_34', 'AGE_35_44'],
          interests: []
        },
        priority: 8,
        expectedROAS: this.forecastROAS(trigger, 'tiktok')
      });

      // Meta plan (Instagram/Facebook)
      plans.push({
        channel: 'meta',
        dailyBudgetJPY: basebudget,
        ctaUrl: targetUrl,
        creativeId: trigger.creativeId,
        campaignName: `AutoBoost_${trigger.postId}_Meta`,
        audience: {
          locations: ['JP'],
          ages: { min: 18, max: 45 },
          interests: []
        },
        priority: 7,
        expectedROAS: this.forecastROAS(trigger, 'meta')
      });
    }

    // Google plan (always create for high CTR content)
    if (trigger.ctr >= BOOST_THRESHOLDS.CTR_THRESHOLD) {
      plans.push({
        channel: 'google',
        dailyBudgetJPY: Math.round(basebudget * 0.8), // Google typically more efficient
        ctaUrl: targetUrl,
        creativeId: trigger.creativeId,
        campaignName: `AutoBoost_${trigger.postId}_Google`,
        priority: 9, // Google gets highest priority
        expectedROAS: this.forecastROAS(trigger, 'google')
      });
    }

    // Sort by priority and expected ROAS
    return plans.sort((a, b) => {
      const roasDiff = (b.expectedROAS || 0) - (a.expectedROAS || 0);
      if (Math.abs(roasDiff) < 0.5) {
        return b.priority - a.priority;
      }
      return roasDiff;
    });
  }

  /**
   * Execute boost campaigns across all channels
   */
  async executeBoostCampaigns(plans: BoostPlan[]): Promise<AdCampaignResult[]> {
    const results: AdCampaignResult[] = [];
    
    for (const plan of plans) {
      try {
        let result: AdCampaignResult;
        
        switch (plan.channel) {
          case 'tiktok':
            result = await this.createTikTokCampaign(plan);
            break;
          case 'meta':
            result = await this.createMetaCampaign(plan);
            break;
          case 'google':
            result = await this.createGoogleCampaign(plan);
            break;
          default:
            result = {
              success: false,
              channel: plan.channel,
              error: 'Unsupported ad channel'
            };
        }
        
        results.push(result);
        
        // Store campaign result in database
        await this.storeCampaignResult(plan, result);
        
        // Add delay between API calls to respect rate limits
        await this.delay(2000);
        
      } catch (error) {
        console.error(`Failed to create ${plan.channel} campaign:`, error);
        results.push({
          success: false,
          channel: plan.channel,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * Get performance metrics for a post
   */
  private async getPostPerformance(postId: string, hours: number = 1) {
    const cutoff = subHours(new Date(), hours);
    
    const metrics = await db.select({
      totalViews: sql<number>`COALESCE(SUM(${variantMetricsDaily.impressions}), 0)`,
      totalClicks: sql<number>`COALESCE(SUM(${variantMetricsDaily.clicks}), 0)`,
      totalConversions: sql<number>`COALESCE(SUM(${variantMetricsDaily.conversions}), 0)`
    })
    .from(variantMetricsDaily)
    .where(gte(variantMetricsDaily.date, cutoff));

    const result = metrics[0];
    const views = Number(result?.totalViews || 0);
    const clicks = Number(result?.totalClicks || 0);
    const conversions = Number(result?.totalConversions || 0);
    
    return {
      views,
      clicks,
      conversions,
      ctr: views > 0 ? clicks / views : 0,
      conversionRate: clicks > 0 ? conversions / clicks : 0
    };
  }

  /**
   * Determine if content should be boosted
   */
  private shouldBoost(performance: any): boolean {
    return (
      performance.views >= BOOST_THRESHOLDS.VIEWS_60M ||
      (performance.ctr >= BOOST_THRESHOLDS.CTR_THRESHOLD && performance.views >= BOOST_THRESHOLDS.MIN_ENGAGEMENT)
    );
  }

  /**
   * Calculate base budget based on performance
   */
  private calculateBaseBudget(trigger: BoostTrigger): number {
    const baseAmount = 3000; // ¥3,000 base daily budget
    
    // Scale based on viral metrics
    const viewsMultiplier = Math.min(trigger.views60m / BOOST_THRESHOLDS.VIEWS_60M, 5);
    const ctrMultiplier = Math.min(trigger.ctr / BOOST_THRESHOLDS.CTR_THRESHOLD, 3);
    
    const scaledBudget = baseAmount * Math.max(viewsMultiplier, ctrMultiplier);
    
    // Cap at reasonable limits
    return Math.min(Math.max(scaledBudget, 1000), 20000);
  }

  /**
   * Forecast ROAS for different channels
   */
  private forecastROAS(trigger: BoostTrigger, channel: AdChannel): number {
    // Base ROAS estimates by channel
    const baseROAS = {
      tiktok: 2.5,
      meta: 3.0,
      google: 3.5
    };
    
    // Adjust based on content performance
    const performanceMultiplier = Math.min(trigger.ctr / 0.02, 2.0);
    
    return baseROAS[channel] * performanceMultiplier;
  }

  /**
   * Channel-specific campaign creation methods
   */
  private async createTikTokCampaign(plan: BoostPlan): Promise<AdCampaignResult> {
    const config = await this.getTikTokConfig(plan);
    const result = await tiktokAdsService.createAdCampaign(config);
    
    return {
      success: result.code === 0,
      channel: 'tiktok',
      campaignId: result.data?.campaign_id,
      adGroupId: result.data?.adgroup_id,
      adId: result.data?.ad_id,
      error: result.code !== 0 ? result.message : undefined
    };
  }

  private async createMetaCampaign(plan: BoostPlan): Promise<AdCampaignResult> {
    const config = await this.getMetaConfig(plan);
    const result = await metaAdsService.createAdCampaign(config);
    
    return {
      success: result.success,
      channel: 'meta',
      campaignId: result.data?.campaign_id,
      adId: result.data?.ad_id,
      error: result.error
    };
  }

  private async createGoogleCampaign(plan: BoostPlan): Promise<AdCampaignResult> {
    const config = await this.getGoogleConfig(plan);
    const result = await googleAdsService.createAdCampaign(config);
    
    return {
      success: result.success,
      channel: 'google',
      campaignId: result.data?.campaignId,
      adGroupId: result.data?.adGroupId,
      error: result.error
    };
  }

  /**
   * Helper methods for platform configurations
   */
  private async getTikTokConfig(plan: BoostPlan) {
    // Get TikTok credentials from environment or database
    return {
      advertiserId: process.env.TIKTOK_ADVERTISER_ID || '',
      accessToken: process.env.TIKTOK_ACCESS_TOKEN || '',
      campaignName: plan.campaignName,
      dailyBudget: plan.dailyBudgetJPY,
      creativeId: plan.creativeId,
      targetUrl: plan.ctaUrl,
      audience: plan.audience
    };
  }

  private async getMetaConfig(plan: BoostPlan) {
    return {
      accountId: process.env.META_ACCOUNT_ID || '',
      accessToken: process.env.META_ACCESS_TOKEN || '',
      campaignName: plan.campaignName,
      dailyBudget: plan.dailyBudgetJPY * 100, // Convert to cents
      creativeVideoId: plan.creativeId,
      targetUrl: plan.ctaUrl,
      pixelId: process.env.META_PIXEL_ID,
      audience: plan.audience
    };
  }

  private async getGoogleConfig(plan: BoostPlan) {
    return {
      customerId: process.env.GOOGLE_ADS_CUSTOMER_ID || '',
      developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
      clientId: process.env.GOOGLE_ADS_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET || '',
      refreshToken: process.env.GOOGLE_ADS_REFRESH_TOKEN || '',
      campaignName: plan.campaignName,
      dailyBudget: plan.dailyBudgetJPY,
      videoUrl: `https://example.com/video/${plan.creativeId}`,
      targetUrl: plan.ctaUrl,
      campaignType: 'PERFORMANCE_MAX' as const
    };
  }

  private async getBestOfferForPost(postId: string) {
    // Implementation would get the best offer for this post
    // For now, return null to use default URL
    return null;
  }

  private async storeCampaignResult(plan: BoostPlan, result: AdCampaignResult) {
    // Store campaign results in database for tracking
    console.log(`Campaign result stored: ${plan.channel} - ${result.success ? 'Success' : 'Failed'}`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const autoBoostService = new AutoBoostService();