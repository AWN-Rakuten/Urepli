import { GeminiService } from './gemini.js';
import { VideoGeneratorService } from './video-generator.js';
import { TikTokApiService } from './tiktok-api.js';
import { InstagramApiService } from './instagram-api.js';
import { BanditAlgorithmService } from './bandit.js';
import { IStorage } from '../storage.js';
import * as fs from 'fs';
import * as path from 'path';

export interface ContentGenerationRequest {
  topic: string;
  targetPlatforms: ('tiktok' | 'instagram' | 'youtube')[];
  targetAudience: string;
  budget: number;
  style: 'minimal' | 'dynamic' | 'business';
}

export interface ContentGenerationResult {
  contentId: string;
  script: string;
  audioPath: string;
  videos: {
    platform: string;
    videoPath: string;
    thumbnailPath: string;
    uploadResponse?: any;
    promotionResponse?: any;
  }[];
  totalCost: number;
  estimatedReach: number;
  status: 'processing' | 'completed' | 'failed';
}

export class ContentAutomationService {
  private geminiService: GeminiService;
  private videoGenerator: VideoGeneratorService;
  private tiktokApi: TikTokApiService;
  private instagramApi: InstagramApiService;
  private banditService: BanditAlgorithmService;
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.geminiService = new GeminiService();
    this.videoGenerator = new VideoGeneratorService();
    this.tiktokApi = new TikTokApiService();
    this.instagramApi = new InstagramApiService();
    this.banditService = new BanditAlgorithmService(storage);
  }

  async generateAndDistributeContent(request: ContentGenerationRequest): Promise<ContentGenerationResult> {
    const contentId = `content_${Date.now()}`;
    
    try {
      // Step 1: Generate Japanese script using Gemini
      console.log('Generating Japanese script...');
      const script = await this.geminiService.generateJapaneseScript({
        topic: request.topic,
        targetAudience: request.targetAudience,
        platform: request.targetPlatforms[0], // Primary platform
        duration: 60,
        style: request.style
      });

      // Step 2: Convert script to speech using Google Cloud TTS
      console.log('Converting script to speech...');
      const audioPath = await this.geminiService.generateSpeech({
        text: script.content,
        voice: 'ja-JP-Wavenet-F',
        audioFormat: 'mp3',
        speed: 1.0,
        pitch: 0
      });

      // Step 3: Get platform allocation from bandit algorithm
      console.log('Optimizing platform allocation...');
      const allocation = await this.banditService.selectOptimalAllocation();
      
      // Step 4: Generate videos for each platform
      console.log('Generating videos for platforms...');
      const videos = [];
      let totalCost = 0;
      let estimatedReach = 0;

      for (const platform of request.targetPlatforms) {
        const platformAllocation = allocation.find(a => a.platform.toLowerCase() === platform);
        if (!platformAllocation || platformAllocation.allocation < 0.1) continue; // Skip if allocation too low

        // Generate platform-specific video
        const videoResult = await this.videoGenerator.generateVideo({
          script: script.content,
          audioFile: audioPath,
          targetPlatform: platform,
          visualStyle: request.style,
          duration: 60
        });

        // Calculate platform budget based on allocation
        const platformBudget = request.budget * platformAllocation.allocation;

        let uploadResponse, promotionResponse;

        // Upload to platform
        try {
          if (platform === 'tiktok') {
            uploadResponse = await this.tiktokApi.uploadVideo({
              title: script.title,
              description: script.description,
              videoPath: videoResult.videoPath,
              privacy: 'public',
              tags: script.hashtags
            });

            // Promote if budget allows
            if (platformBudget > 20) {
              promotionResponse = await this.tiktokApi.promoteVideo(
                uploadResponse.id, 
                platformBudget * 0.7, // 70% for promotion, 30% for organic
                { audience: request.targetAudience }
              );
            }

          } else if (platform === 'instagram') {
            uploadResponse = await this.instagramApi.uploadReel({
              videoPath: videoResult.videoPath,
              caption: script.description,
              hashtags: script.hashtags
            });

            // Promote if budget allows
            if (platformBudget > 15) {
              promotionResponse = await this.instagramApi.promoteReel(
                uploadResponse.id,
                platformBudget * 0.6, // 60% for promotion
                { audience: request.targetAudience }
              );
            }
          }

          totalCost += platformBudget;
          estimatedReach += promotionResponse?.estimatedReach || Math.floor(platformBudget * 50);

        } catch (error) {
          console.error(`Failed to upload to ${platform}:`, error);
          uploadResponse = { id: `${platform}_${Date.now()}`, status: 'failed' };
        }

        videos.push({
          platform,
          videoPath: videoResult.videoPath,
          thumbnailPath: videoResult.thumbnailPath,
          uploadResponse,
          promotionResponse
        });

        // Store content in database
        await this.storage.createContent({
          title: script.title,
          description: script.description,
          platform,
          videoUrl: uploadResponse?.url || videoResult.videoPath,
          thumbnailUrl: videoResult.thumbnailPath,
          views: uploadResponse?.views || 0,
          likes: uploadResponse?.likes || 0,
          shares: uploadResponse?.shares || 0,
          revenue: 0, // Will be updated when analytics come in
          cost: platformBudget,
          tags: script.hashtags?.join(',') || '',
          status: uploadResponse?.status || 'processing'
        });
      }

      // Step 5: Log the automation process
      await this.storage.createAutomationLog({
        type: 'content_generation',
        message: `Generated content for topic: ${request.topic}`,
        status: 'success',
        metadata: {
          contentId,
          platforms: request.targetPlatforms,
          totalCost,
          estimatedReach,
          scriptLength: script.content.length,
          videosGenerated: videos.length
        }
      });

      // Step 6: Update bandit arms with new cost data
      for (const video of videos) {
        const platformAllocation = allocation.find(a => a.platform.toLowerCase() === video.platform);
        if (platformAllocation) {
          const platformBudget = request.budget * platformAllocation.allocation;
          await this.banditService.updateArmPerformance(
            platformAllocation.id,
            0, // Revenue will be updated later when analytics come in
            platformBudget
          );
        }
      }

      return {
        contentId,
        script: script.content,
        audioPath,
        videos,
        totalCost,
        estimatedReach,
        status: 'completed'
      };

    } catch (error) {
      console.error('Content generation failed:', error);
      
      await this.storage.createAutomationLog({
        type: 'content_generation',
        message: `Content generation failed: ${error}`,
        status: 'error',
        metadata: {
          contentId,
          topic: request.topic,
          error: String(error)
        }
      });

      return {
        contentId,
        script: '',
        audioPath: '',
        videos: [],
        totalCost: 0,
        estimatedReach: 0,
        status: 'failed'
      };
    }
  }

  async updateContentAnalytics(contentId: string): Promise<void> {
    try {
      // Get all content pieces for this generation
      const content = await this.storage.getContent(100);
      const contentPieces = content.filter(c => c.title.includes(contentId.split('_')[1]));

      for (const piece of contentPieces) {
        let analytics;
        
        if (piece.platform === 'tiktok') {
          analytics = await this.tiktokApi.getVideoAnalytics(piece.videoUrl.split('/').pop() || '');
        } else if (piece.platform === 'instagram') {
          analytics = await this.instagramApi.getReelAnalytics(piece.videoUrl.split('/').pop() || '');
        }

        if (analytics) {
          // Update content with real analytics
          const updatedContent = {
            views: analytics.views,
            likes: analytics.likes,
            shares: analytics.shares,
            revenue: analytics.revenue
          };
          
          // Note: In a real implementation, you'd have an updateContent method
          // For now, we'll create a log entry
          await this.storage.createAutomationLog({
            type: 'analytics_update',
            message: `Updated analytics for ${piece.platform} content`,
            status: 'success',
            metadata: {
              contentId: piece.id,
              platform: piece.platform,
              views: analytics.views,
              revenue: analytics.revenue,
              roas: analytics.roas
            }
          });

          // Update bandit algorithm with real performance data
          const banditArms = await this.storage.getBanditArms();
          const arm = banditArms.find(a => a.platform.toLowerCase() === piece.platform);
          if (arm) {
            await this.banditService.updateArmPerformance(
              arm.id,
              analytics.revenue,
              piece.cost
            );
          }
        }
      }

    } catch (error) {
      console.error('Failed to update content analytics:', error);
      
      await this.storage.createAutomationLog({
        type: 'analytics_update',
        message: `Failed to update analytics: ${error}`,
        status: 'error',
        metadata: { contentId, error: String(error) }
      });
    }
  }

  async getContentPerformanceReport(days: number = 7): Promise<any> {
    try {
      const content = await this.storage.getContent(100);
      const recentContent = content.filter(c => {
        const createdAt = new Date(c.createdAt);
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        return createdAt > cutoff;
      });

      const platformStats = recentContent.reduce((acc, piece) => {
        if (!acc[piece.platform]) {
          acc[piece.platform] = {
            count: 0,
            totalViews: 0,
            totalRevenue: 0,
            totalCost: 0,
            avgROAS: 0
          };
        }
        
        acc[piece.platform].count++;
        acc[piece.platform].totalViews += piece.views;
        acc[piece.platform].totalRevenue += piece.revenue;
        acc[piece.platform].totalCost += piece.cost;
        
        return acc;
      }, {} as any);

      // Calculate ROAS for each platform
      Object.keys(platformStats).forEach(platform => {
        const stats = platformStats[platform];
        stats.avgROAS = stats.totalCost > 0 ? stats.totalRevenue / stats.totalCost : 0;
      });

      return {
        period: `${days} days`,
        totalContent: recentContent.length,
        totalViews: recentContent.reduce((sum, c) => sum + c.views, 0),
        totalRevenue: recentContent.reduce((sum, c) => sum + c.revenue, 0),
        totalCost: recentContent.reduce((sum, c) => sum + c.cost, 0),
        platformStats,
        topPerforming: recentContent
          .sort((a, b) => (b.revenue / Math.max(b.cost, 1)) - (a.revenue / Math.max(a.cost, 1)))
          .slice(0, 5)
      };

    } catch (error) {
      console.error('Failed to generate performance report:', error);
      return null;
    }
  }
}