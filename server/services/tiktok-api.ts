import axios from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';

export interface TikTokConfig {
  clientKey: string;
  clientSecret: string;
  redirectUri: string;
}

export interface TikTokAuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  open_id: string;
}

export interface TikTokUserInfo {
  open_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  follower_count: number;
  following_count: number;
  likes_count: number;
  video_count: number;
}

export interface TikTokVideoUpload {
  title: string;
  description?: string;
  videoPath?: string;
  privacy_level: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'FOLLOWER_OF_CREATOR' | 'SELF_ONLY';
  disable_duet?: boolean;
  disable_comment?: boolean;
  disable_stitch?: boolean;
  video_cover_timestamp_ms?: number;
  tags?: string[];
}

export interface TikTokVideoResponse {
  id: string;
  url: string;
  status: 'processing' | 'published' | 'failed';
  views?: number;
  likes?: number;
  shares?: number;
  comments?: number;
}

export interface TikTokUploadResponse {
  publish_id: string;
  status: string;
  status_msg: string;
}

export interface TikTokAnalytics {
  videoId: string;
  views: number;
  likes: number;
  shares: number;
  comments: number;
  engagementRate: number;
  revenue: number;
  cost: number;
  roas: number;
}

export class TikTokApiService {
  private accessToken: string;
  private baseUrl = 'https://open.tiktokapis.com';
  private authUrl = 'https://www.tiktok.com/v2/auth/authorize';
  private tokenUrl = 'https://open.tiktokapis.com/v2/oauth/token/';

  constructor(accessToken?: string) {
    this.accessToken = accessToken || process.env.TIKTOK_ACCESS_TOKEN || '';
  }

  /**
   * Generate OAuth authorization URL for TikTok login
   */
  getAuthorizationUrl(clientKey: string, redirectUri: string, state?: string): string {
    const params = new URLSearchParams({
      client_key: clientKey,
      scope: 'user.info.basic,video.publish,video.upload',
      response_type: 'code',
      redirect_uri: redirectUri,
      state: state || Math.random().toString(36).substring(7)
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async getAccessToken(config: TikTokConfig, code: string): Promise<TikTokAuthResponse> {
    try {
      const response = await axios.post(this.tokenUrl, {
        client_key: config.clientKey,
        client_secret: config.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: config.redirectUri
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (response.data.error) {
        throw new Error(`TikTok OAuth error: ${response.data.error_description}`);
      }

      return response.data;
    } catch (error) {
      console.error('TikTok token exchange error:', error);
      throw new Error('Failed to exchange TikTok authorization code');
    }
  }

  /**
   * Get user information
   */
  async getUserInfo(accessToken: string): Promise<TikTokUserInfo> {
    try {
      const response = await axios.get(`${this.baseUrl}/v2/user/info/`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params: {
          fields: 'open_id,username,display_name,avatar_url,follower_count,following_count,likes_count,video_count'
        }
      });

      if (response.data.error) {
        throw new Error(`TikTok API error: ${response.data.error.message}`);
      }

      return response.data.data.user;
    } catch (error) {
      console.error('TikTok user info error:', error);
      throw new Error('Failed to fetch TikTok user information');
    }
  }

  /**
   * Upload video using buffer or file path
   */
  async uploadVideo(upload: TikTokVideoUpload & { videoPath: string }): Promise<TikTokVideoResponse> {
    if (!this.accessToken) {
      throw new Error('TikTok access token not configured');
    }

    try {
      // Step 1: Initialize upload
      const videoSize = fs.statSync(upload.videoPath).size;
      const initResponse = await axios.post(
        `${this.baseUrl}/v2/post/publish/video/init/`,
        {
          post_info: {
            title: upload.title,
            privacy_level: upload.privacy_level,
            disable_duet: upload.disable_duet || false,
            disable_comment: upload.disable_comment || false,
            disable_stitch: upload.disable_stitch || false,
            video_cover_timestamp_ms: upload.video_cover_timestamp_ms || 1000
          },
          source_info: {
            source: 'FILE_UPLOAD',
            video_size: videoSize,
            chunk_size: 10000000,
            total_chunk_count: 1
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const { publish_id, upload_url } = initResponse.data.data;

      // Step 2: Upload video file as buffer
      const videoBuffer = fs.readFileSync(upload.videoPath);
      await axios.put(upload_url, videoBuffer, {
        headers: {
          'Content-Type': 'video/mp4',
          'Authorization': `Bearer ${this.accessToken}`
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      });

      // Step 3: Confirm upload
      const confirmResponse = await axios.post(
        `${this.baseUrl}/v2/post/publish/`,
        { publish_id },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        id: confirmResponse.data.data.publish_id,
        url: `https://www.tiktok.com/@user/video/${confirmResponse.data.data.publish_id}`,
        status: 'processing'
      };

    } catch (error: any) {
      console.error('TikTok upload error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Upload video from buffer directly
   */
  async uploadVideoFromBuffer(
    videoBuffer: Buffer,
    postInfo: TikTokVideoUpload
  ): Promise<TikTokUploadResponse> {
    if (!this.accessToken) {
      throw new Error('TikTok access token not configured');
    }

    try {
      // Step 1: Initialize upload
      const initResponse = await axios.post(
        `${this.baseUrl}/v2/post/publish/video/init/`,
        {
          post_info: postInfo,
          source_info: {
            source: 'FILE_UPLOAD',
            video_size: videoBuffer.length,
            chunk_size: 10000000,
            total_chunk_count: Math.ceil(videoBuffer.length / 10000000)
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (initResponse.data.error) {
        throw new Error(`TikTok upload init error: ${initResponse.data.error.message}`);
      }

      const { publish_id, upload_url } = initResponse.data.data;

      // Step 2: Upload video buffer
      await axios.put(upload_url, videoBuffer, {
        headers: {
          'Content-Type': 'video/mp4'
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      });

      // Step 3: Publish video
      const publishResponse = await axios.post(
        `${this.baseUrl}/v2/post/publish/`,
        { publish_id },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (publishResponse.data.error) {
        throw new Error(`TikTok publish error: ${publishResponse.data.error.message}`);
      }

      return publishResponse.data.data;
    } catch (error: any) {
      console.error('TikTok video upload error:', error.response?.data || error.message);
      throw error;
    }
  }

  async getVideoAnalytics(videoId: string): Promise<TikTokAnalytics> {
    if (!this.accessToken) {
      throw new Error('TikTok access token not configured');
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/v2/research/video/query/`,
        {
          params: {
            video_ids: videoId,
            fields: 'id,video_description,create_time,region_code,share_count,view_count,like_count,comment_count'
          },
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      const videoData = response.data.data.videos[0];
      const views = videoData.view_count;
      const likes = videoData.like_count;
      const shares = videoData.share_count;
      const comments = videoData.comment_count;
      
      const engagementRate = views > 0 ? ((likes + shares + comments) / views) * 100 : 0;
      
      // Calculate estimated revenue (example: $0.01-0.05 per view depending on engagement)
      const revenuePerView = 0.01 + (engagementRate / 100) * 0.04;
      const revenue = views * revenuePerView;
      
      // Estimated cost for content creation and promotion
      const cost = 15 + (shares * 0.1); // Base cost + promotion cost
      
      const roas = cost > 0 ? revenue / cost : 0;

      return {
        videoId,
        views,
        likes,
        shares,
        comments,
        engagementRate,
        revenue,
        cost,
        roas
      };

    } catch (error: any) {
      console.error('TikTok analytics error:', error.response?.data || error.message);
      throw error;
    }
  }

  async promoteVideo(videoId: string, budget: number, targetAudience?: any): Promise<any> {
    if (!this.accessToken) {
      throw new Error('TikTok access token not configured');
    }

    try {
      // TikTok Ads API integration for intelligent promotion
      const response = await axios.post(
        `${this.baseUrl}/v1.3/ad/create/`,
        {
          advertiser_id: process.env.TIKTOK_ADVERTISER_ID,
          campaign_id: process.env.TIKTOK_CAMPAIGN_ID,
          adgroup_id: process.env.TIKTOK_ADGROUP_ID,
          creative_material_mode: 'CUSTOM',
          ad_name: `Promotion_${videoId}`,
          app_name: 'MNP Content',
          landing_page_url: `https://www.tiktok.com/@user/video/${videoId}`,
          call_to_action: 'WATCH_MORE',
          ad_text: 'Discover amazing content!',
          budget: budget,
          bid_type: 'BID_TYPE_CUSTOM',
          bid_price: budget / 1000, // CPM bidding
          optimization_goal: 'REACH'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        adId: response.data.data.ad_id,
        status: 'active',
        budget,
        estimatedReach: Math.floor(budget * 100), // Estimated reach based on budget
        startDate: new Date().toISOString()
      };

    } catch (error: any) {
      console.error('TikTok promotion error:', error.response?.data || error.message);
      throw error;
    }
  }

  async getPromotionAnalytics(adId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/v1.3/report/integrated/get/`,
        {
          params: {
            advertiser_id: process.env.TIKTOK_ADVERTISER_ID,
            report_type: 'BASIC',
            dimensions: '["ad_id"]',
            metrics: '["spend","impressions","clicks","conversions","ctr","cpm","cost_per_conversion"]',
            start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end_date: new Date().toISOString().split('T')[0],
            filters: `[{"field_name":"ad_id","filter_type":"IN","filter_value":["${adId}"]}]`
          },
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      const data = response.data.data.list[0] || {};
      
      return {
        adId,
        spend: parseFloat(data.spend || '0'),
        impressions: parseInt(data.impressions || '0'),
        clicks: parseInt(data.clicks || '0'),
        conversions: parseInt(data.conversions || '0'),
        ctr: parseFloat(data.ctr || '0'),
        cpm: parseFloat(data.cpm || '0'),
        costPerConversion: parseFloat(data.cost_per_conversion || '0'),
        roas: data.spend > 0 ? (data.conversions * 10) / data.spend : 0 // Assuming $10 per conversion
      };

    } catch (error: any) {
      console.error('TikTok promotion analytics error:', error.response?.data || error.message);
      throw error;
    }
  }
}