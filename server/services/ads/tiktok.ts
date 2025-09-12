/**
 * TikTok Ads API Integration
 * Auto-boost winning organic content to TikTok Ads
 */

import fetch from 'node-fetch';

export interface TikTokAdConfig {
  advertiserId: string;
  accessToken: string;
  campaignName: string;
  dailyBudget: number; // in JPY
  creativeId: string;
  targetUrl: string;
  audience?: {
    locations?: string[];
    ages?: string[];
    interests?: string[];
  };
}

export interface TikTokCampaignResponse {
  code: number;
  message: string;
  data?: {
    campaign_id: string;
    adgroup_id: string;
    ad_id: string;
  };
}

/**
 * TikTok Ads Service
 */
export class TikTokAdsService {
  private baseUrl = 'https://business-api.tiktok.com/open_api/v1.3';

  /**
   * Create TikTok ad campaign from successful organic content
   */
  async createAdCampaign(config: TikTokAdConfig): Promise<TikTokCampaignResponse> {
    try {
      // 1. Create Campaign
      const campaign = await this.createCampaign(config);
      if (!campaign.success) {
        throw new Error(`Campaign creation failed: ${campaign.error}`);
      }

      // 2. Create Ad Group
      const adGroup = await this.createAdGroup(config, campaign.campaignId);
      if (!adGroup.success) {
        throw new Error(`Ad group creation failed: ${adGroup.error}`);
      }

      // 3. Create Ad
      const ad = await this.createAd(config, adGroup.adGroupId);
      if (!ad.success) {
        throw new Error(`Ad creation failed: ${ad.error}`);
      }

      return {
        code: 0,
        message: 'Success',
        data: {
          campaign_id: campaign.campaignId,
          adgroup_id: adGroup.adGroupId,
          ad_id: ad.adId
        }
      };

    } catch (error) {
      console.error('TikTok ad creation failed:', error);
      return {
        code: -1,
        message: error.message
      };
    }
  }

  /**
   * Get campaign performance metrics
   */
  async getCampaignMetrics(advertiserId: string, campaignId: string, accessToken: string) {
    const url = `${this.baseUrl}/report/integrated/get/`;
    
    const payload = {
      advertiser_id: advertiserId,
      report_type: 'BASIC',
      data_level: 'AUCTION_CAMPAIGN',
      dimensions: ['campaign_id', 'stat_time_day'],
      metrics: [
        'spend', 'impressions', 'clicks', 'ctr', 'cpm', 'cpc', 
        'conversions', 'cost_per_conversion', 'conversion_rate'
      ],
      filters: [
        {
          field_name: 'campaign_ids',
          filter_type: 'IN',
          filter_value: [campaignId]
        }
      ],
      start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': accessToken
      },
      body: JSON.stringify(payload)
    });

    return response.json();
  }

  /**
   * Update campaign budget
   */
  async updateCampaignBudget(
    advertiserId: string, 
    campaignId: string, 
    newBudget: number, 
    accessToken: string
  ) {
    const url = `${this.baseUrl}/campaign/update/`;
    
    const payload = {
      advertiser_id: advertiserId,
      campaign_id: campaignId,
      budget: newBudget * 100, // TikTok uses cents
      budget_mode: 'BUDGET_MODE_DAY'
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': accessToken
      },
      body: JSON.stringify(payload)
    });

    return response.json();
  }

  /**
   * Private helper methods
   */
  private async createCampaign(config: TikTokAdConfig) {
    const url = `${this.baseUrl}/campaign/create/`;
    
    const payload = {
      advertiser_id: config.advertiserId,
      campaign_name: config.campaignName,
      objective_type: 'CONVERSIONS',
      campaign_type: 'REGULAR_CAMPAIGN',
      budget: config.dailyBudget * 100, // Convert to cents
      budget_mode: 'BUDGET_MODE_DAY'
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Access-Token': config.accessToken
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      
      if (result.code === 0 && result.data?.campaign_id) {
        return {
          success: true,
          campaignId: result.data.campaign_id
        };
      } else {
        return {
          success: false,
          error: result.message || 'Unknown error'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async createAdGroup(config: TikTokAdConfig, campaignId: string) {
    const url = `${this.baseUrl}/adgroup/create/`;
    
    const payload = {
      advertiser_id: config.advertiserId,
      campaign_id: campaignId,
      adgroup_name: `${config.campaignName}_AdGroup`,
      placement_type: 'PLACEMENT_TYPE_AUTOMATIC',
      location_ids: config.audience?.locations || ['JP'],
      age: config.audience?.ages || ['AGE_18_24', 'AGE_25_34', 'AGE_35_44'],
      gender: 'GENDER_UNLIMITED',
      budget: config.dailyBudget * 100,
      budget_mode: 'BUDGET_MODE_DAY',
      bid_type: 'BID_TYPE_AUTO',
      optimization_event: 'COMPLETE_PAYMENT'
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Access-Token': config.accessToken
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      
      if (result.code === 0 && result.data?.adgroup_id) {
        return {
          success: true,
          adGroupId: result.data.adgroup_id
        };
      } else {
        return {
          success: false,
          error: result.message || 'Unknown error'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async createAd(config: TikTokAdConfig, adGroupId: string) {
    const url = `${this.baseUrl}/ad/create/`;
    
    const payload = {
      advertiser_id: config.advertiserId,
      adgroup_id: adGroupId,
      ad_name: `${config.campaignName}_Ad`,
      ad_format: 'SINGLE_VIDEO',
      creative_material_mode: 'CUSTOM',
      video_id: config.creativeId,
      landing_page_url: config.targetUrl,
      display_name: config.campaignName,
      call_to_action: 'SHOP_NOW'
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Access-Token': config.accessToken
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      
      if (result.code === 0 && result.data?.ad_id) {
        return {
          success: true,
          adId: result.data.ad_id
        };
      } else {
        return {
          success: false,
          error: result.message || 'Unknown error'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export const tiktokAdsService = new TikTokAdsService();