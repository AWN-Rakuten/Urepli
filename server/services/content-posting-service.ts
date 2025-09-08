import { TikTokApiService, TikTokVideoUpload, TikTokUploadResponse } from './tiktok-api';
import { InstagramApiService, InstagramMediaUpload, InstagramReelResponse } from './instagram-api';
import { GeminiService } from './gemini';
import * as fs from 'fs';
import * as path from 'path';

export interface ContentPostingConfig {
  tiktok?: {
    accessToken: string;
    clientKey?: string;
    clientSecret?: string;
  };
  instagram?: {
    accessToken: string;
    businessAccountId: string;
    clientId?: string;
    clientSecret?: string;
  };
}

export interface PostContent {
  title: string;
  caption: string;
  hashtags: string[];
  mediaUrl?: string;
  mediaPath?: string;
  mediaType: 'video' | 'image';
  platforms: ('tiktok' | 'instagram')[];
  privacy?: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'FOLLOWER_OF_CREATOR' | 'SELF_ONLY';
  scheduleTime?: Date;
}

export interface PostResult {
  platform: 'tiktok' | 'instagram';
  success: boolean;
  postId?: string;
  url?: string;
  error?: string;
}

export class ContentPostingService {
  private tiktokService?: TikTokApiService;
  private instagramService?: InstagramApiService;
  private geminiService: GeminiService;

  constructor(config: ContentPostingConfig) {
    // Initialize TikTok service if configured
    if (config.tiktok?.accessToken) {
      this.tiktokService = new TikTokApiService(config.tiktok.accessToken);
    }

    // Initialize Instagram service if configured
    if (config.instagram?.accessToken && config.instagram?.businessAccountId) {
      this.instagramService = new InstagramApiService({
        accessToken: config.instagram.accessToken,
        businessAccountId: config.instagram.businessAccountId,
        clientId: config.instagram.clientId,
        clientSecret: config.instagram.clientSecret
      });
    }

    // Initialize Gemini for content generation
    this.geminiService = new GeminiService();
  }

  /**
   * Generate Japanese marketing content using Gemini
   */
  async generateJapaneseContent(topic: string, platform: 'tiktok' | 'instagram'): Promise<{
    title: string;
    caption: string;
    hashtags: string[];
  }> {
    try {
      const prompt = `Create engaging Japanese marketing content for ${platform}:

Topic: ${topic}

Requirements:
- Platform: ${platform}
- Language: Japanese
- Style: Engaging, modern, trend-aware
- Include relevant hashtags
- Keep ${platform === 'tiktok' ? 'title under 100 characters' : 'caption under 2200 characters'}

Format your response as JSON:
{
  "title": "Catchy title in Japanese",
  "caption": "Engaging caption in Japanese with call-to-action",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"]
}`;

      const response = await this.geminiService.generateJapaneseScript(prompt);
      
      try {
        const parsed = JSON.parse(response);
        return {
          title: parsed.title || `${topic}について`,
          caption: parsed.caption || `${topic}の素晴らしいコンテンツです！`,
          hashtags: parsed.hashtags || ['トレンド', 'おすすめ', '人気', 'バズり', '最新']
        };
      } catch (parseError) {
        // Fallback if JSON parsing fails
        return {
          title: `${topic}について`,
          caption: `${topic}の素晴らしいコンテンツです！ぜひチェックしてください！`,
          hashtags: ['トレンド', 'おすすめ', '人気', 'バズり', '最新']
        };
      }
    } catch (error) {
      console.error('Content generation error:', error);
      // Return fallback content
      return {
        title: `${topic}について`,
        caption: `${topic}の素晴らしいコンテンツです！`,
        hashtags: ['トレンド', 'おすすめ', '人気', 'バズり', '最新']
      };
    }
  }

  /**
   * Post content to multiple platforms
   */
  async postToMultiplePlatforms(content: PostContent): Promise<PostResult[]> {
    const results: PostResult[] = [];

    // Post to TikTok
    if (content.platforms.includes('tiktok') && this.tiktokService) {
      try {
        const result = await this.postToTikTok(content);
        results.push({
          platform: 'tiktok',
          success: true,
          postId: result.publish_id,
          url: `https://www.tiktok.com/video/${result.publish_id}`
        });
      } catch (error) {
        results.push({
          platform: 'tiktok',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Post to Instagram
    if (content.platforms.includes('instagram') && this.instagramService) {
      try {
        const result = await this.postToInstagram(content);
        results.push({
          platform: 'instagram',
          success: true,
          postId: result.id,
          url: result.permalink
        });
      } catch (error) {
        results.push({
          platform: 'instagram',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  /**
   * Post video content to TikTok
   */
  private async postToTikTok(content: PostContent): Promise<TikTokUploadResponse> {
    if (!this.tiktokService) {
      throw new Error('TikTok service not configured');
    }

    if (content.mediaType !== 'video') {
      throw new Error('TikTok only supports video content');
    }

    const postInfo: TikTokVideoUpload = {
      title: content.title,
      privacy_level: content.privacy || 'PUBLIC_TO_EVERYONE',
      disable_duet: false,
      disable_comment: false,
      disable_stitch: false
    };

    if (content.mediaPath) {
      // Upload from file path
      const videoBuffer = fs.readFileSync(content.mediaPath);
      return await this.tiktokService.uploadVideoFromBuffer(videoBuffer, postInfo);
    } else if (content.mediaUrl) {
      // Download video from URL and upload
      const videoBuffer = await this.downloadMediaBuffer(content.mediaUrl);
      return await this.tiktokService.uploadVideoFromBuffer(videoBuffer, postInfo);
    } else {
      throw new Error('No media provided for TikTok upload');
    }
  }

  /**
   * Post content to Instagram
   */
  private async postToInstagram(content: PostContent): Promise<InstagramReelResponse> {
    if (!this.instagramService) {
      throw new Error('Instagram service not configured');
    }

    const mediaUpload: InstagramMediaUpload = {
      caption: content.caption,
      hashtags: content.hashtags,
      media_type: content.mediaType === 'video' ? 'REELS' : 'IMAGE'
    };

    if (content.mediaUrl) {
      // Use media URL directly
      if (content.mediaType === 'video') {
        mediaUpload.video_url = content.mediaUrl;
      } else {
        mediaUpload.image_url = content.mediaUrl;
      }
    } else if (content.mediaPath) {
      throw new Error('Instagram requires media URL, not file path. Please upload media to accessible URL first.');
    } else {
      throw new Error('No media provided for Instagram upload');
    }

    // Handle scheduled posting
    if (content.scheduleTime) {
      mediaUpload.published = false;
      mediaUpload.publish_time = content.scheduleTime.toISOString();
    }

    return await this.instagramService.uploadAndPublishMedia(mediaUpload);
  }

  /**
   * Generate and post content automatically
   */
  async generateAndPost(
    topic: string,
    mediaUrl: string,
    mediaType: 'video' | 'image',
    platforms: ('tiktok' | 'instagram')[]
  ): Promise<{
    content: PostContent;
    results: PostResult[];
  }> {
    try {
      // Generate content for the primary platform
      const primaryPlatform = platforms[0];
      const generatedContent = await this.generateJapaneseContent(topic, primaryPlatform);

      const postContent: PostContent = {
        title: generatedContent.title,
        caption: generatedContent.caption,
        hashtags: generatedContent.hashtags,
        mediaUrl,
        mediaType,
        platforms,
        privacy: 'PUBLIC_TO_EVERYONE'
      };

      // Post to all platforms
      const results = await this.postToMultiplePlatforms(postContent);

      return {
        content: postContent,
        results
      };
    } catch (error) {
      console.error('Generate and post error:', error);
      throw error;
    }
  }

  /**
   * Download media from URL as buffer
   */
  private async downloadMediaBuffer(url: string): Promise<Buffer> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download media: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error('Media download error:', error);
      throw new Error('Failed to download media from URL');
    }
  }

  /**
   * Get posting capabilities based on configuration
   */
  getCapabilities(): {
    tiktok: boolean;
    instagram: boolean;
    platforms: string[];
  } {
    return {
      tiktok: !!this.tiktokService,
      instagram: !!this.instagramService,
      platforms: [
        ...(this.tiktokService ? ['tiktok'] : []),
        ...(this.instagramService ? ['instagram'] : [])
      ]
    };
  }

  /**
   * Test platform connections
   */
  async testConnections(): Promise<{
    tiktok?: { connected: boolean; error?: string };
    instagram?: { connected: boolean; error?: string };
  }> {
    const results: any = {};

    // Test TikTok connection
    if (this.tiktokService) {
      try {
        await this.tiktokService.getUserInfo(this.tiktokService['accessToken']);
        results.tiktok = { connected: true };
      } catch (error) {
        results.tiktok = { 
          connected: false, 
          error: error instanceof Error ? error.message : 'Connection failed'
        };
      }
    }

    // Test Instagram connection
    if (this.instagramService) {
      try {
        await this.instagramService.getBusinessAccountInfo();
        results.instagram = { connected: true };
      } catch (error) {
        results.instagram = { 
          connected: false, 
          error: error instanceof Error ? error.message : 'Connection failed'
        };
      }
    }

    return results;
  }
}