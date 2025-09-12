/**
 * Meta (Facebook/Instagram) Ads API Integration
 * Auto-boost winning organic content to Meta Ads with rate limit handling
 */

import fetch from 'node-fetch';

export interface MetaAdConfig {
  accountId: string;
  accessToken: string;
  campaignName: string;
  dailyBudget: number; // in JPY cents
  creativeVideoId: string;
  targetUrl: string;
  pixelId?: string;
  audience?: {
    locations?: string[];
    ages?: { min: number; max: number };
    interests?: string[];
  };
}

export interface MetaCampaignResponse {
  success: boolean;
  data?: {
    campaign_id: string;
    adset_id: string;
    ad_id: string;
  };
  error?: string;
}

/**
 * Meta Ads Service with BUC (Business Use Case) rate limiting
 */
export class MetaAdsService {
  private baseUrl = 'https://graph.facebook.com/v18.0';
  private rateLimitHeaders = new Map<string, number>();
  private readonly BUC_RATE_LIMIT = 100; // BUC calls per hour limit

  /**
   * Create Meta ad campaign from successful organic content
   */
  async createAdCampaign(config: MetaAdConfig): Promise<MetaCampaignResponse> {
    try {
      // Check rate limits before proceeding
      if (!this.canMakeRequest(config.accountId)) {
        return {
          success: false,
          error: 'Rate limit exceeded. Please wait before making more requests.'
        };
      }

      // 1. Create Campaign
      const campaign = await this.createCampaign(config);
      if (!campaign.success) {
        return { success: false, error: campaign.error };
      }

      // 2. Create Ad Set
      const adSet = await this.createAdSet(config, campaign.campaignId);
      if (!adSet.success) {
        return { success: false, error: adSet.error };
      }

      // 3. Create Ad Creative
      const creative = await this.createAdCreative(config);
      if (!creative.success) {
        return { success: false, error: creative.error };
      }

      // 4. Create Ad
      const ad = await this.createAd(config, adSet.adSetId, creative.creativeId);
      if (!ad.success) {
        return { success: false, error: ad.error };
      }

      return {
        success: true,
        data: {
          campaign_id: campaign.campaignId,
          adset_id: adSet.adSetId,
          ad_id: ad.adId
        }
      };

    } catch (error) {
      console.error('Meta ad creation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get campaign insights with rate limiting
   */
  async getCampaignInsights(accountId: string, campaignId: string, accessToken: string) {
    if (!this.canMakeRequest(accountId)) {
      throw new Error('Rate limit exceeded');
    }

    const url = `${this.baseUrl}/${campaignId}/insights`;
    const params = new URLSearchParams({
      access_token: accessToken,
      fields: 'spend,impressions,clicks,ctr,cpm,cpc,conversions,cost_per_conversion,conversion_rate_ranking',
      date_preset: 'last_7d'
    });

    const response = await fetch(`${url}?${params}`, {
      method: 'GET'
    });

    this.updateRateLimit(accountId, response.headers);
    return response.json();
  }

  /**
   * Update campaign budget
   */
  async updateCampaignBudget(
    accountId: string,
    adSetId: string, 
    newBudget: number,
    accessToken: string
  ) {
    if (!this.canMakeRequest(accountId)) {
      throw new Error('Rate limit exceeded');
    }

    const url = `${this.baseUrl}/${adSetId}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        access_token: accessToken,
        daily_budget: newBudget * 100 // Convert JPY to cents
      })
    });

    this.updateRateLimit(accountId, response.headers);
    return response.json();
  }

  /**
   * Private helper methods
   */
  private async createCampaign(config: MetaAdConfig) {
    const url = `${this.baseUrl}/act_${config.accountId}/campaigns`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          access_token: config.accessToken,
          name: config.campaignName,
          objective: 'CONVERSIONS',
          status: 'ACTIVE',
          special_ad_categories: []
        })
      });

      this.updateRateLimit(config.accountId, response.headers);
      const result = await response.json();
      
      if (result.id) {
        return {
          success: true,
          campaignId: result.id
        };
      } else {
        return {
          success: false,
          error: result.error?.message || 'Unknown error'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async createAdSet(config: MetaAdConfig, campaignId: string) {
    const url = `${this.baseUrl}/act_${config.accountId}/adsets`;
    
    const targeting = {
      geo_locations: {
        countries: config.audience?.locations || ['JP']
      },
      age_min: config.audience?.ages?.min || 18,
      age_max: config.audience?.ages?.max || 65,
      ...(config.audience?.interests ? {
        interests: config.audience.interests.map(interest => ({
          id: interest,
          name: interest
        }))
      } : {})
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          access_token: config.accessToken,
          name: `${config.campaignName}_AdSet`,
          campaign_id: campaignId,
          daily_budget: config.dailyBudget,
          billing_event: 'IMPRESSIONS',
          optimization_goal: 'CONVERSIONS',
          targeting: targeting,
          status: 'ACTIVE',
          ...(config.pixelId ? {
            promoted_object: {
              pixel_id: config.pixelId,
              custom_event_type: 'PURCHASE'
            }
          } : {})
        })
      });

      this.updateRateLimit(config.accountId, response.headers);
      const result = await response.json();
      
      if (result.id) {
        return {
          success: true,
          adSetId: result.id
        };
      } else {
        return {
          success: false,
          error: result.error?.message || 'Unknown error'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async createAdCreative(config: MetaAdConfig) {
    const url = `${this.baseUrl}/act_${config.accountId}/adcreatives`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          access_token: config.accessToken,
          name: `${config.campaignName}_Creative`,
          object_story_spec: {
            page_id: config.accountId,
            video_data: {
              video_id: config.creativeVideoId,
              call_to_action: {
                type: 'LEARN_MORE',
                value: {
                  link: config.targetUrl
                }
              }
            }
          }
        })
      });

      this.updateRateLimit(config.accountId, response.headers);
      const result = await response.json();
      
      if (result.id) {
        return {
          success: true,
          creativeId: result.id
        };
      } else {
        return {
          success: false,
          error: result.error?.message || 'Unknown error'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async createAd(config: MetaAdConfig, adSetId: string, creativeId: string) {
    const url = `${this.baseUrl}/act_${config.accountId}/ads`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          access_token: config.accessToken,
          name: `${config.campaignName}_Ad`,
          adset_id: adSetId,
          creative: {
            creative_id: creativeId
          },
          status: 'ACTIVE'
        })
      });

      this.updateRateLimit(config.accountId, response.headers);
      const result = await response.json();
      
      if (result.id) {
        return {
          success: true,
          adId: result.id
        };
      } else {
        return {
          success: false,
          error: result.error?.message || 'Unknown error'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Rate limiting methods
   */
  private canMakeRequest(accountId: string): boolean {
    const key = `meta_${accountId}`;
    const lastRequest = this.rateLimitHeaders.get(key) || 0;
    const now = Date.now();
    
    // Allow request if more than 36 seconds have passed (100 calls per hour = 1 call per 36 seconds)
    return (now - lastRequest) > 36000;
  }

  private updateRateLimit(accountId: string, headers: any) {
    const key = `meta_${accountId}`;
    this.rateLimitHeaders.set(key, Date.now());
    
    // Log rate limit info if available
    const remaining = headers.get('x-fb-usage');
    if (remaining) {
      console.log(`Meta API usage for ${accountId}:`, remaining);
    }
  }

  /**
   * Exponential backoff retry mechanism
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) throw error;
        
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`Retry attempt ${attempt} after ${delay}ms delay`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error('Max retries exceeded');
  }
}

export const metaAdsService = new MetaAdsService();