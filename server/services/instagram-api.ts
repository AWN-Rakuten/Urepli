import axios from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';

export interface InstagramReelUpload {
  videoPath: string;
  caption: string;
  hashtags?: string[];
  location?: string;
}

export interface InstagramReelResponse {
  id: string;
  permalink: string;
  status: 'processing' | 'published' | 'failed';
  media_type: 'VIDEO';
}

export interface InstagramAnalytics {
  mediaId: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  impressions: number;
  engagementRate: number;
  revenue: number;
  cost: number;
  roas: number;
}

export class InstagramApiService {
  private accessToken: string;
  private businessAccountId: string;
  private baseUrl = 'https://graph.facebook.com/v18.0';

  constructor(accessToken?: string, businessAccountId?: string) {
    this.accessToken = accessToken || process.env.INSTAGRAM_ACCESS_TOKEN || '';
    this.businessAccountId = businessAccountId || process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || '';
  }

  async uploadReel(upload: InstagramReelUpload): Promise<InstagramReelResponse> {
    if (!this.accessToken || !this.businessAccountId) {
      throw new Error('Instagram credentials not configured');
    }

    try {
      // Step 1: Upload video to Instagram servers
      const uploadResponse = await this.uploadVideoFile(upload.videoPath);
      
      // Step 2: Create media container
      const caption = `${upload.caption}\n\n${(upload.hashtags || []).map(tag => `#${tag}`).join(' ')}`;
      
      const containerResponse = await axios.post(
        `${this.baseUrl}/${this.businessAccountId}/media`,
        {
          media_type: 'REELS',
          video_url: uploadResponse.video_url,
          caption: caption,
          access_token: this.accessToken
        }
      );

      const containerId = containerResponse.data.id;

      // Step 3: Publish the reel
      const publishResponse = await axios.post(
        `${this.baseUrl}/${this.businessAccountId}/media_publish`,
        {
          creation_id: containerId,
          access_token: this.accessToken
        }
      );

      return {
        id: publishResponse.data.id,
        permalink: `https://www.instagram.com/reel/${publishResponse.data.id}`,
        status: 'published',
        media_type: 'VIDEO'
      };

    } catch (error: any) {
      console.error('Instagram upload error:', error.response?.data || error.message);
      throw error;
    }
  }

  private async uploadVideoFile(videoPath: string): Promise<{ video_url: string }> {
    throw new Error('Video upload requires proper Instagram Business API setup with media upload endpoints');
  }

  async getReelAnalytics(mediaId: string): Promise<InstagramAnalytics> {
    if (!this.accessToken) {
      throw new Error('Instagram access token not configured');
    }

    try {
      // Get basic media insights
      const insightsResponse = await axios.get(
        `${this.baseUrl}/${mediaId}/insights`,
        {
          params: {
            metric: 'comments,likes,plays,reach,saved,shares,total_interactions',
            access_token: this.accessToken
          }
        }
      );

      const insights = insightsResponse.data.data;
      const plays = insights.find((i: any) => i.name === 'plays')?.values[0]?.value || 0;
      const likes = insights.find((i: any) => i.name === 'likes')?.values[0]?.value || 0;
      const comments = insights.find((i: any) => i.name === 'comments')?.values[0]?.value || 0;
      const shares = insights.find((i: any) => i.name === 'shares')?.values[0]?.value || 0;
      const saves = insights.find((i: any) => i.name === 'saved')?.values[0]?.value || 0;
      const reach = insights.find((i: any) => i.name === 'reach')?.values[0]?.value || 0;
      const interactions = insights.find((i: any) => i.name === 'total_interactions')?.values[0]?.value || 0;

      const engagementRate = reach > 0 ? (interactions / reach) * 100 : 0;
      
      // Calculate estimated revenue (Instagram typically has lower rates than TikTok)
      const revenuePerView = 0.005 + (engagementRate / 100) * 0.02;
      const revenue = plays * revenuePerView;
      
      // Estimated costs for Instagram content
      const cost = 12 + (shares * 0.08); // Base cost + promotion cost
      
      const roas = cost > 0 ? revenue / cost : 0;

      return {
        mediaId,
        views: plays,
        likes,
        comments,
        shares,
        saves,
        reach,
        impressions: reach * 1.2, // Estimated impressions
        engagementRate,
        revenue,
        cost,
        roas
      };

    } catch (error: any) {
      console.error('Instagram analytics error:', error.response?.data || error.message);
      throw error;
    }
  }

  async promoteReel(mediaId: string, budget: number, targetAudience?: any): Promise<any> {
    if (!this.accessToken) {
      throw new Error('Instagram access token not configured');
    }

    try {
      // Facebook Ads API for Instagram promotion
      const response = await axios.post(
        `${this.baseUrl}/act_${process.env.FACEBOOK_AD_ACCOUNT_ID}/ads`,
        {
          name: `Instagram_Promotion_${mediaId}`,
          adset_id: process.env.FACEBOOK_ADSET_ID,
          creative: {
            object_story_spec: {
              page_id: process.env.FACEBOOK_PAGE_ID,
              instagram_actor_id: this.businessAccountId,
              object_attachment_id: mediaId
            }
          },
          status: 'ACTIVE',
          access_token: this.accessToken
        }
      );

      return {
        adId: response.data.id,
        status: 'active',
        budget,
        estimatedReach: Math.floor(budget * 80), // Instagram typically has lower reach than TikTok
        startDate: new Date().toISOString(),
        platform: 'instagram'
      };

    } catch (error: any) {
      console.error('Instagram promotion error:', error.response?.data || error.message);
      throw error;
    }
  }

  async getPromotionAnalytics(adId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${adId}/insights`,
        {
          params: {
            fields: 'spend,impressions,clicks,actions,ctr,cpm,cost_per_action_type',
            access_token: this.accessToken
          }
        }
      );

      const data = response.data.data[0] || {};
      const spend = parseFloat(data.spend || '0');
      const impressions = parseInt(data.impressions || '0');
      const clicks = parseInt(data.clicks || '0');
      const videoViews = data.actions?.find((a: any) => a.action_type === 'video_view')?.value || 0;
      
      return {
        adId,
        spend,
        impressions,
        clicks,
        videoViews: parseInt(videoViews),
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
        costPerView: videoViews > 0 ? spend / videoViews : 0,
        roas: spend > 0 ? (videoViews * 0.01) / spend : 0, // Assuming $0.01 per view value
        platform: 'instagram'
      };

    } catch (error: any) {
      console.error('Instagram promotion analytics error:', error.response?.data || error.message);
      throw error;
    }
  }
}