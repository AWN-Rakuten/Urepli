import axios, { AxiosError } from 'axios';
import { IStorage } from '../storage';

export interface TikTokCampaignConfig {
  name: string;
  objective: 'REACH' | 'TRAFFIC' | 'VIDEO_VIEW' | 'CONVERSIONS' | 'APP_PROMOTION';
  budget: number;
  bidStrategy: 'LOWEST_COST' | 'BID_CAP' | 'COST_CAP' | 'TARGET_COST';
  targetAudience: {
    age_groups: string[];
    gender: 'MALE' | 'FEMALE' | 'UNLIMITED';
    locations: string[];
    languages?: string[];
    interests?: string[];
    behaviors?: string[];
    device_types?: string[];
    operating_systems?: string[];
  };
  placements: string[];
  schedule?: {
    start_time: string;
    end_time?: string;
    schedule_type: 'SCHEDULE_START_END' | 'SCHEDULE_FROM_NOW';
  };
}

export interface TikTokCampaignResult {
  campaign_id: string;
  adgroup_id: string;
  ad_id: string;
  status: 'ENABLE' | 'DISABLE' | 'DELETE';
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  cpm: number;
  cpc: number;
  ctr: number;
  roas: number;
  video_views: number;
  video_view_rate: number;
  created_time: string;
}

export interface TikTokOptimizationRule {
  field: 'spend' | 'cpm' | 'cpc' | 'ctr' | 'roas' | 'video_view_rate';
  operator: 'GREATER_THAN' | 'LESS_THAN' | 'EQUAL';
  value: number;
  action: 'DISABLE_CAMPAIGN' | 'INCREASE_BUDGET' | 'DECREASE_BUDGET' | 'CHANGE_BID';
  action_value?: number;
}

export class TikTokAdsService {
  private accessToken: string;
  private advertiserId: string;
  private baseUrl = 'https://business-api.tiktok.com/open_api/v1.3';
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.accessToken = process.env.TIKTOK_ADS_ACCESS_TOKEN || '';
    this.advertiserId = process.env.TIKTOK_ADVERTISER_ID || '';

    if (!this.accessToken || !this.advertiserId) {
      throw new Error('TIKTOK_ADS_ACCESS_TOKEN and TIKTOK_ADVERTISER_ID environment variables are required');
    }
  }

  async createCampaign(config: TikTokCampaignConfig, videoUrl: string, contentId?: string): Promise<TikTokCampaignResult> {
    try {
      // Step 1: Create Campaign
      const campaignResponse = await axios.post(
        `${this.baseUrl}/campaign/create/`,
        {
          advertiser_id: this.advertiserId,
          campaign_name: config.name,
          objective_type: config.objective,
          budget_mode: 'BUDGET_MODE_DAY',
          budget: config.budget * 100, // Convert to cents
          operation_status: 'ENABLE'
        },
        {
          headers: {
            'Access-Token': this.accessToken,
            'Content-Type': 'application/json'
          }
        }
      );

      const campaignId = campaignResponse.data.data.campaign_id;

      // Step 2: Create Ad Group with targeting
      const adGroupResponse = await axios.post(
        `${this.baseUrl}/adgroup/create/`,
        {
          advertiser_id: this.advertiserId,
          campaign_id: campaignId,
          adgroup_name: `${config.name} - AdGroup`,
          placement_type: 'PLACEMENT_TYPE_AUTOMATIC',
          placements: config.placements.length > 0 ? config.placements : ['PLACEMENT_TIKTOK'],
          targeting: this.buildTargeting(config.targetAudience),
          budget_mode: 'BUDGET_MODE_DAY',
          budget: config.budget * 100,
          bid_type: config.bidStrategy,
          optimization_goal: this.getOptimizationGoal(config.objective),
          operation_status: 'ENABLE'
        },
        {
          headers: {
            'Access-Token': this.accessToken,
            'Content-Type': 'application/json'
          }
        }
      );

      const adGroupId = adGroupResponse.data.data.adgroup_id;

      // Step 3: Upload and create ad with video
      const videoId = await this.uploadVideo(videoUrl);
      
      const adResponse = await axios.post(
        `${this.baseUrl}/ad/create/`,
        {
          advertiser_id: this.advertiserId,
          adgroup_id: adGroupId,
          ad_name: `${config.name} - Ad`,
          ad_format: 'SINGLE_VIDEO',
          ad_text: 'Check this out! #viral #trending',
          call_to_action: 'LEARN_MORE',
          landing_page_url: process.env.LANDING_PAGE_URL || 'https://example.com',
          video_id: videoId,
          operation_status: 'ENABLE'
        },
        {
          headers: {
            'Access-Token': this.accessToken,
            'Content-Type': 'application/json'
          }
        }
      );

      const adId = adResponse.data.data.ad_id;

      // Log campaign creation
      await this.storage.createAutomationLog({
        type: 'campaign_created',
        message: `TikTok campaign created: ${config.name}`,
        status: 'success',
        workflowId: null,
        metadata: {
          campaign_id: campaignId,
          adgroup_id: adGroupId,
          ad_id: adId,
          budget: config.budget,
          objective: config.objective,
          contentId
        }
      });

      return {
        campaign_id: campaignId,
        adgroup_id: adGroupId,
        ad_id: adId,
        status: 'ENABLE',
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        cpm: 0,
        cpc: 0,
        ctr: 0,
        roas: 0,
        video_views: 0,
        video_view_rate: 0,
        created_time: new Date().toISOString()
      };

    } catch (error) {
      console.error('TikTok campaign creation failed:', error);
      
      await this.storage.createAutomationLog({
        type: 'campaign_error',
        message: `TikTok campaign creation failed: ${error}`,
        status: 'error',
        workflowId: null,
        metadata: {
          error: error instanceof AxiosError ? error.response?.data : String(error),
          config
        }
      });

      throw error;
    }
  }

  async getCampaignPerformance(campaignId: string): Promise<TikTokCampaignResult> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/report/integrated/get/`,
        {
          params: {
            advertiser_id: this.advertiserId,
            report_type: 'BASIC',
            dimensions: JSON.stringify(['campaign_id']),
            metrics: JSON.stringify([
              'spend', 'impressions', 'clicks', 'conversions', 
              'cpm', 'cpc', 'ctr', 'video_views', 'video_view_rate'
            ]),
            start_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end_date: new Date().toISOString().split('T')[0],
            filters: JSON.stringify([{
              field_name: 'campaign_id',
              filter_type: 'IN',
              filter_value: [campaignId]
            }])
          },
          headers: {
            'Access-Token': this.accessToken
          }
        }
      );

      const data = response.data.data.list[0] || {};
      const spend = parseFloat(data.spend || '0');
      const conversions = parseInt(data.conversions || '0');
      const revenue = conversions * 30; // Estimate $30 per conversion for TikTok

      return {
        campaign_id: campaignId,
        adgroup_id: '',
        ad_id: '',
        status: 'ENABLE',
        spend,
        impressions: parseInt(data.impressions || '0'),
        clicks: parseInt(data.clicks || '0'),
        conversions,
        cpm: parseFloat(data.cpm || '0'),
        cpc: parseFloat(data.cpc || '0'),
        ctr: parseFloat(data.ctr || '0'),
        roas: spend > 0 ? revenue / spend : 0,
        video_views: parseInt(data.video_views || '0'),
        video_view_rate: parseFloat(data.video_view_rate || '0'),
        created_time: ''
      };

    } catch (error) {
      console.error('TikTok performance tracking failed:', error);
      throw error;
    }
  }

  async optimizeCampaign(campaignId: string, rules: TikTokOptimizationRule[]): Promise<void> {
    try {
      const performance = await this.getCampaignPerformance(campaignId);
      
      for (const rule of rules) {
        const currentValue = performance[rule.field as keyof TikTokCampaignResult] as number;
        const shouldApply = this.evaluateRule(currentValue, rule.operator, rule.value);
        
        if (shouldApply) {
          await this.executeOptimizationAction(campaignId, rule);
          
          await this.storage.createAutomationLog({
            type: 'campaign_optimization',
            message: `Applied TikTok optimization rule: ${rule.field} ${rule.operator} ${rule.value} → ${rule.action}`,
            status: 'success',
            workflowId: null,
            metadata: {
              campaign_id: campaignId,
              rule,
              current_value: currentValue
            }
          });
        }
      }

    } catch (error) {
      console.error('TikTok campaign optimization failed:', error);
      throw error;
    }
  }

  async pauseCampaign(campaignId: string): Promise<void> {
    try {
      await axios.post(
        `${this.baseUrl}/campaign/update/`,
        {
          advertiser_id: this.advertiserId,
          campaign_id: campaignId,
          operation_status: 'DISABLE'
        },
        {
          headers: {
            'Access-Token': this.accessToken,
            'Content-Type': 'application/json'
          }
        }
      );

      await this.storage.createAutomationLog({
        type: 'campaign_paused',
        message: `TikTok campaign paused: ${campaignId}`,
        status: 'success',
        workflowId: null,
        metadata: { campaign_id: campaignId }
      });

    } catch (error) {
      console.error('TikTok campaign pause failed:', error);
      throw error;
    }
  }

  async getActiveCampaigns(): Promise<TikTokCampaignResult[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/campaign/get/`,
        {
          params: {
            advertiser_id: this.advertiserId,
            fields: JSON.stringify(['campaign_id', 'campaign_name', 'operation_status', 'create_time'])
          },
          headers: {
            'Access-Token': this.accessToken
          }
        }
      );

      const campaigns = response.data.data.list || [];
      const results: TikTokCampaignResult[] = [];

      for (const campaign of campaigns.filter((c: any) => c.operation_status === 'ENABLE')) {
        try {
          const performance = await this.getCampaignPerformance(campaign.campaign_id);
          results.push(performance);
        } catch (error) {
          console.error(`Failed to get performance for TikTok campaign ${campaign.campaign_id}:`, error);
        }
      }

      return results;

    } catch (error) {
      console.error('TikTok campaigns fetch failed:', error);
      throw error;
    }
  }

  private buildTargeting(audience: TikTokCampaignConfig['targetAudience']): any {
    const targeting: any = {
      age_groups: audience.age_groups,
      gender: audience.gender,
      locations: audience.locations.map(code => ({ location_type: 'COUNTRY', location_code: code }))
    };

    if (audience.languages) targeting.languages = audience.languages;
    if (audience.interests) targeting.interest_category_ids = audience.interests;
    if (audience.behaviors) targeting.behavior_category_ids = audience.behaviors;
    if (audience.device_types) targeting.device_model_ids = audience.device_types;
    if (audience.operating_systems) targeting.operating_systems = audience.operating_systems;

    return targeting;
  }

  private getOptimizationGoal(objective: string): string {
    switch (objective) {
      case 'CONVERSIONS': return 'CONVERT';
      case 'TRAFFIC': return 'CLICK';
      case 'VIDEO_VIEW': return 'VIDEO_VIEW';
      case 'REACH': return 'REACH';
      case 'APP_PROMOTION': return 'INSTALL';
      default: return 'CLICK';
    }
  }

  private async uploadVideo(videoUrl: string): Promise<string> {
    try {
      // Download video from URL
      const videoResponse = await axios.get(videoUrl, { responseType: 'stream' });
      
      // Upload to TikTok
      const uploadResponse = await axios.post(
        `${this.baseUrl}/file/video/ad/upload/`,
        {
          advertiser_id: this.advertiserId,
          video_file: videoResponse.data,
          video_signature: `tiktok_video_${Date.now()}`
        },
        {
          headers: {
            'Access-Token': this.accessToken,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      return uploadResponse.data.data.video_id;

    } catch (error) {
      console.error('Video upload to TikTok failed:', error);
      throw error;
    }
  }

  private evaluateRule(currentValue: number, operator: string, targetValue: number): boolean {
    switch (operator) {
      case 'GREATER_THAN': return currentValue > targetValue;
      case 'LESS_THAN': return currentValue < targetValue;
      case 'EQUAL': return currentValue === targetValue;
      default: return false;
    }
  }

  private async executeOptimizationAction(campaignId: string, rule: TikTokOptimizationRule): Promise<void> {
    switch (rule.action) {
      case 'DISABLE_CAMPAIGN':
        await this.pauseCampaign(campaignId);
        break;
      case 'INCREASE_BUDGET':
      case 'DECREASE_BUDGET':
        // Implementation would update adgroup budget
        break;
      case 'CHANGE_BID':
        // Implementation would update bid strategy
        break;
    }
  }

  getProviderInfo() {
    return {
      name: 'TikTok Ads Manager',
      platforms: ['TikTok', 'TikTok Global'],
      features: ['Video-first advertising', 'Young audience reach', 'Viral content optimization'],
      min_budget: 20.00,
      available: !!(this.accessToken && this.advertiserId)
    };
  }
}