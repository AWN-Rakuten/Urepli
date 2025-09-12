/**
 * Google Ads API Integration
 * Auto-boost winning content with Performance Max and Video Action campaigns
 */

import fetch from 'node-fetch';

export interface GoogleAdsConfig {
  customerId: string;
  developerToken: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  campaignName: string;
  dailyBudget: number; // in JPY micros (1 JPY = 1,000,000 micros)
  videoUrl: string;
  targetUrl: string;
  campaignType: 'PERFORMANCE_MAX' | 'VIDEO_ACTION';
}

export interface GoogleAdsCampaignResponse {
  success: boolean;
  data?: {
    campaignId: string;
    adGroupId?: string;
    adId?: string;
  };
  error?: string;
}

/**
 * Google Ads Service
 */
export class GoogleAdsService {
  private baseUrl = 'https://googleads.googleapis.com/v15';
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  /**
   * Create Google Ads campaign
   */
  async createAdCampaign(config: GoogleAdsConfig): Promise<GoogleAdsCampaignResponse> {
    try {
      // Get access token
      const token = await this.getAccessToken(config);
      if (!token) {
        return {
          success: false,
          error: 'Failed to obtain access token'
        };
      }

      if (config.campaignType === 'PERFORMANCE_MAX') {
        return this.createPerformanceMaxCampaign(config, token);
      } else {
        return this.createVideoActionCampaign(config, token);
      }

    } catch (error) {
      console.error('Google Ads campaign creation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get campaign metrics
   */
  async getCampaignMetrics(customerId: string, campaignId: string, config: GoogleAdsConfig) {
    const token = await this.getAccessToken(config);
    if (!token) {
      throw new Error('Failed to obtain access token');
    }

    const query = `
      SELECT 
        campaign.id,
        campaign.name,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.ctr,
        metrics.average_cpm,
        metrics.average_cpc,
        metrics.conversions,
        metrics.cost_per_conversion,
        metrics.conversion_rate
      FROM campaign 
      WHERE campaign.id = ${campaignId}
      AND segments.date >= '2024-01-01'
    `;

    const url = `${this.baseUrl}/customers/${customerId}/googleAds:search`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'developer-token': config.developerToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    });

    return response.json();
  }

  /**
   * Update campaign budget
   */
  async updateCampaignBudget(
    customerId: string,
    campaignBudgetId: string,
    newBudgetMicros: number,
    config: GoogleAdsConfig
  ) {
    const token = await this.getAccessToken(config);
    if (!token) {
      throw new Error('Failed to obtain access token');
    }

    const url = `${this.baseUrl}/customers/${customerId}/campaignBudgets:mutate`;
    
    const operation = {
      operations: [
        {
          update: {
            resourceName: `customers/${customerId}/campaignBudgets/${campaignBudgetId}`,
            amountMicros: newBudgetMicros
          },
          updateMask: 'amountMicros'
        }
      ]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'developer-token': config.developerToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(operation)
    });

    return response.json();
  }

  /**
   * Private helper methods
   */
  private async getAccessToken(config: GoogleAdsConfig): Promise<string | null> {
    // Check if current token is still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: config.clientId,
          client_secret: config.clientSecret,
          refresh_token: config.refreshToken
        })
      });

      const result = await response.json();
      
      if (result.access_token) {
        this.accessToken = result.access_token;
        this.tokenExpiry = Date.now() + (result.expires_in * 1000) - 60000; // Subtract 1 minute buffer
        return this.accessToken;
      } else {
        console.error('Token refresh failed:', result);
        return null;
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  }

  private async createPerformanceMaxCampaign(config: GoogleAdsConfig, token: string): Promise<GoogleAdsCampaignResponse> {
    const url = `${this.baseUrl}/customers/${config.customerId}:mutate`;
    
    // 1. Create campaign budget
    const budgetOperation = {
      campaignBudgetOperations: [
        {
          create: {
            name: `${config.campaignName}_Budget`,
            amountMicros: config.dailyBudget * 1000000, // Convert to micros
            deliveryMethod: 'STANDARD'
          }
        }
      ]
    };

    try {
      const budgetResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'developer-token': config.developerToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(budgetOperation)
      });

      const budgetResult = await budgetResponse.json();
      const budgetResourceName = budgetResult.results?.[0]?.resourceName;

      if (!budgetResourceName) {
        throw new Error('Failed to create campaign budget');
      }

      // 2. Create Performance Max campaign
      const campaignOperation = {
        campaignOperations: [
          {
            create: {
              name: config.campaignName,
              advertisingChannelType: 'PERFORMANCE_MAX',
              status: 'ENABLED',
              campaignBudget: budgetResourceName,
              biddingStrategyType: 'MAXIMIZE_CONVERSIONS',
              startDate: new Date().toISOString().split('T')[0].replace(/-/g, ''),
              endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0].replace(/-/g, ''),
              performanceMaxOptIn: {
                performanceMaxOptIn: true
              }
            }
          }
        ]
      };

      const campaignResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'developer-token': config.developerToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(campaignOperation)
      });

      const campaignResult = await campaignResponse.json();
      const campaignResourceName = campaignResult.results?.[0]?.resourceName;

      if (!campaignResourceName) {
        throw new Error('Failed to create Performance Max campaign');
      }

      const campaignId = campaignResourceName.split('/').pop();

      return {
        success: true,
        data: {
          campaignId
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async createVideoActionCampaign(config: GoogleAdsConfig, token: string): Promise<GoogleAdsCampaignResponse> {
    const url = `${this.baseUrl}/customers/${config.customerId}:mutate`;
    
    try {
      // 1. Create campaign budget
      const budgetOperation = {
        campaignBudgetOperations: [
          {
            create: {
              name: `${config.campaignName}_Budget`,
              amountMicros: config.dailyBudget * 1000000,
              deliveryMethod: 'STANDARD'
            }
          }
        ]
      };

      const budgetResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'developer-token': config.developerToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(budgetOperation)
      });

      const budgetResult = await budgetResponse.json();
      const budgetResourceName = budgetResult.results?.[0]?.resourceName;

      // 2. Create Video Action campaign
      const campaignOperation = {
        campaignOperations: [
          {
            create: {
              name: config.campaignName,
              advertisingChannelType: 'VIDEO',
              advertisingChannelSubType: 'VIDEO_ACTION',
              status: 'ENABLED',
              campaignBudget: budgetResourceName,
              biddingStrategyType: 'TARGET_CPA',
              startDate: new Date().toISOString().split('T')[0].replace(/-/g, ''),
              videoSettings: {
                videoSettings: {
                  videoSettings: true
                }
              }
            }
          }
        ]
      };

      const campaignResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'developer-token': config.developerToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(campaignOperation)
      });

      const campaignResult = await campaignResponse.json();
      const campaignResourceName = campaignResult.results?.[0]?.resourceName;
      const campaignId = campaignResourceName.split('/').pop();

      // 3. Create ad group
      const adGroupOperation = {
        adGroupOperations: [
          {
            create: {
              name: `${config.campaignName}_AdGroup`,
              campaign: campaignResourceName,
              status: 'ENABLED',
              type: 'VIDEO_TRUE_VIEW_IN_STREAM'
            }
          }
        ]
      };

      const adGroupResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'developer-token': config.developerToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(adGroupOperation)
      });

      const adGroupResult = await adGroupResponse.json();
      const adGroupResourceName = adGroupResult.results?.[0]?.resourceName;
      const adGroupId = adGroupResourceName.split('/').pop();

      return {
        success: true,
        data: {
          campaignId,
          adGroupId
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export const googleAdsService = new GoogleAdsService();