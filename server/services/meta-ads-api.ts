import axios, { AxiosError } from 'axios';
import { IStorage } from '../storage';

export interface MetaCampaignConfig {
  name: string;
  objective: 'CONVERSIONS' | 'TRAFFIC' | 'REACH' | 'VIDEO_VIEWS' | 'BRAND_AWARENESS';
  budget: number;
  bidStrategy: 'LOWEST_COST_WITHOUT_CAP' | 'LOWEST_COST_WITH_BID_CAP' | 'TARGET_COST';
  targetAudience: {
    age_min?: number;
    age_max?: number;
    genders?: number[];
    geo_locations?: {
      countries?: string[];
      cities?: string[];
    };
    interests?: string[];
    behaviors?: string[];
    custom_audiences?: string[];
    lookalike_audiences?: string[];
  };
  placements: ('instagram_feed' | 'instagram_stories' | 'instagram_reels' | 'facebook_feed' | 'facebook_stories')[];
  schedule?: {
    start_time: string;
    end_time?: string;
  };
}

export interface MetaCampaignResult {
  campaign_id: string;
  adset_id: string;
  ad_id: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  cpm: number;
  cpc: number;
  ctr: number;
  roas: number;
  created_time: string;
}

export interface MetaOptimizationRule {
  field: 'spend' | 'cpm' | 'cpc' | 'ctr' | 'roas';
  operator: 'GREATER_THAN' | 'LESS_THAN' | 'EQUAL';
  value: number;
  action: 'PAUSE_CAMPAIGN' | 'INCREASE_BUDGET' | 'DECREASE_BUDGET' | 'CHANGE_BID';
  action_value?: number;
}

export class MetaAdsService {
  private accessToken: string;
  private adAccountId: string;
  private baseUrl = 'https://graph.facebook.com/v19.0';
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.accessToken = process.env.META_ACCESS_TOKEN || '';
    this.adAccountId = process.env.META_AD_ACCOUNT_ID || '';

    if (!this.accessToken || !this.adAccountId) {
      throw new Error('META_ACCESS_TOKEN and META_AD_ACCOUNT_ID environment variables are required');
    }
  }

  async createCampaign(config: MetaCampaignConfig, videoUrl: string, contentId?: string): Promise<MetaCampaignResult> {
    try {
      // Step 1: Create Campaign
      const campaignResponse = await axios.post(
        `${this.baseUrl}/act_${this.adAccountId}/campaigns`,
        {
          name: config.name,
          objective: config.objective,
          status: 'ACTIVE',
          access_token: this.accessToken
        }
      );

      const campaignId = campaignResponse.data.id;

      // Step 2: Create Ad Set with targeting and budget
      const adSetResponse = await axios.post(
        `${this.baseUrl}/act_${this.adAccountId}/adsets`,
        {
          name: `${config.name} - AdSet`,
          campaign_id: campaignId,
          daily_budget: Math.round(config.budget * 100), // Convert to cents
          billing_event: config.objective === 'CONVERSIONS' ? 'IMPRESSIONS' : 'LINK_CLICKS',
          optimization_goal: config.objective === 'CONVERSIONS' ? 'OFFSITE_CONVERSIONS' : 'LINK_CLICKS',
          bid_strategy: config.bidStrategy,
          targeting: this.buildTargeting(config.targetAudience),
          status: 'ACTIVE',
          access_token: this.accessToken
        }
      );

      const adSetId = adSetResponse.data.id;

      // Step 3: Create Creative
      const creativeResponse = await axios.post(
        `${this.baseUrl}/act_${this.adAccountId}/adcreatives`,
        {
          name: `${config.name} - Creative`,
          object_story_spec: {
            page_id: process.env.META_PAGE_ID,
            video_data: {
              video_id: await this.uploadVideo(videoUrl),
              call_to_action: {
                type: 'LEARN_MORE',
                value: {
                  link: process.env.LANDING_PAGE_URL || 'https://example.com'
                }
              }
            }
          },
          access_token: this.accessToken
        }
      );

      const creativeId = creativeResponse.data.id;

      // Step 4: Create Ad
      const adResponse = await axios.post(
        `${this.baseUrl}/act_${this.adAccountId}/ads`,
        {
          name: `${config.name} - Ad`,
          adset_id: adSetId,
          creative: { creative_id: creativeId },
          status: 'ACTIVE',
          access_token: this.accessToken
        }
      );

      const adId = adResponse.data.id;

      // Log campaign creation
      await this.storage.createAutomationLog({
        type: 'campaign_created',
        message: `Meta campaign created: ${config.name}`,
        status: 'success',
        workflowId: null,
        metadata: {
          campaign_id: campaignId,
          adset_id: adSetId,
          ad_id: adId,
          budget: config.budget,
          objective: config.objective,
          contentId
        }
      });

      return {
        campaign_id: campaignId,
        adset_id: adSetId,
        ad_id: adId,
        status: 'ACTIVE',
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        cpm: 0,
        cpc: 0,
        ctr: 0,
        roas: 0,
        created_time: new Date().toISOString()
      };

    } catch (error) {
      console.error('Meta campaign creation failed:', error);
      
      await this.storage.createAutomationLog({
        type: 'campaign_error',
        message: `Meta campaign creation failed: ${error}`,
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

  async getCampaignPerformance(campaignId: string): Promise<MetaCampaignResult> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${campaignId}/insights`,
        {
          params: {
            fields: 'spend,impressions,clicks,actions,cpm,cpc,ctr,frequency,reach',
            time_range: JSON.stringify({
              since: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              until: new Date().toISOString().split('T')[0]
            }),
            access_token: this.accessToken
          }
        }
      );

      const data = response.data.data[0] || {};
      const conversions = data.actions?.find((a: any) => a.action_type === 'offsite_conversion')?.value || 0;
      const spend = parseFloat(data.spend || '0');
      const revenue = conversions * 50; // Estimate $50 per conversion
      
      return {
        campaign_id: campaignId,
        adset_id: '',
        ad_id: '',
        status: 'ACTIVE',
        spend,
        impressions: parseInt(data.impressions || '0'),
        clicks: parseInt(data.clicks || '0'),
        conversions: parseInt(conversions),
        cpm: parseFloat(data.cpm || '0'),
        cpc: parseFloat(data.cpc || '0'),
        ctr: parseFloat(data.ctr || '0'),
        roas: spend > 0 ? revenue / spend : 0,
        created_time: ''
      };

    } catch (error) {
      console.error('Meta performance tracking failed:', error);
      throw error;
    }
  }

  async optimizeCampaign(campaignId: string, rules: MetaOptimizationRule[]): Promise<void> {
    try {
      const performance = await this.getCampaignPerformance(campaignId);
      
      for (const rule of rules) {
        const currentValue = performance[rule.field as keyof MetaCampaignResult] as number;
        const shouldApply = this.evaluateRule(currentValue, rule.operator, rule.value);
        
        if (shouldApply) {
          await this.executeOptimizationAction(campaignId, rule);
          
          await this.storage.createAutomationLog({
            type: 'campaign_optimization',
            message: `Applied optimization rule: ${rule.field} ${rule.operator} ${rule.value} → ${rule.action}`,
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
      console.error('Meta campaign optimization failed:', error);
      throw error;
    }
  }

  async pauseCampaign(campaignId: string): Promise<void> {
    try {
      await axios.post(
        `${this.baseUrl}/${campaignId}`,
        {
          status: 'PAUSED',
          access_token: this.accessToken
        }
      );

      await this.storage.createAutomationLog({
        type: 'campaign_paused',
        message: `Meta campaign paused: ${campaignId}`,
        status: 'success',
        workflowId: null,
        metadata: { campaign_id: campaignId }
      });

    } catch (error) {
      console.error('Meta campaign pause failed:', error);
      throw error;
    }
  }

  async getActiveCampaigns(): Promise<MetaCampaignResult[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/act_${this.adAccountId}/campaigns`,
        {
          params: {
            fields: 'id,name,status,created_time',
            effective_status: ['ACTIVE'],
            access_token: this.accessToken
          }
        }
      );

      const campaigns = response.data.data || [];
      const results: MetaCampaignResult[] = [];

      for (const campaign of campaigns) {
        try {
          const performance = await this.getCampaignPerformance(campaign.id);
          results.push(performance);
        } catch (error) {
          console.error(`Failed to get performance for campaign ${campaign.id}:`, error);
        }
      }

      return results;

    } catch (error) {
      console.error('Meta campaigns fetch failed:', error);
      throw error;
    }
  }

  private buildTargeting(audience: MetaCampaignConfig['targetAudience']): any {
    const targeting: any = {};

    if (audience.age_min) targeting.age_min = audience.age_min;
    if (audience.age_max) targeting.age_max = audience.age_max;
    if (audience.genders) targeting.genders = audience.genders;
    if (audience.geo_locations) targeting.geo_locations = audience.geo_locations;
    if (audience.interests) targeting.interests = audience.interests.map(id => ({ id }));
    if (audience.behaviors) targeting.behaviors = audience.behaviors.map(id => ({ id }));
    if (audience.custom_audiences) targeting.custom_audiences = audience.custom_audiences.map(id => ({ id }));
    if (audience.lookalike_audiences) targeting.lookalike_audiences = audience.lookalike_audiences.map(id => ({ id }));

    return targeting;
  }

  private async uploadVideo(videoUrl: string): Promise<string> {
    try {
      // Download video from URL
      const videoResponse = await axios.get(videoUrl, { responseType: 'stream' });
      
      // Upload to Meta
      const uploadResponse = await axios.post(
        `${this.baseUrl}/act_${this.adAccountId}/advideos`,
        {
          source: videoResponse.data,
          access_token: this.accessToken
        },
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      return uploadResponse.data.id;

    } catch (error) {
      console.error('Video upload to Meta failed:', error);
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

  private async executeOptimizationAction(campaignId: string, rule: MetaOptimizationRule): Promise<void> {
    switch (rule.action) {
      case 'PAUSE_CAMPAIGN':
        await this.pauseCampaign(campaignId);
        break;
      case 'INCREASE_BUDGET':
      case 'DECREASE_BUDGET':
        // Implementation would update adset budget
        break;
      case 'CHANGE_BID':
        // Implementation would update bid strategy
        break;
    }
  }

  getProviderInfo() {
    return {
      name: 'Meta Ads (Facebook/Instagram)',
      platforms: ['Facebook', 'Instagram', 'Messenger', 'WhatsApp'],
      features: ['Real-time optimization', 'Advanced targeting', 'Cross-platform campaigns'],
      min_budget: 5.00,
      available: !!(this.accessToken && this.adAccountId)
    };
  }
}