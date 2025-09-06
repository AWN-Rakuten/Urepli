import { IStorage } from '../storage';
import { VideoGeneration } from '../../shared/schema';
import { MochiVideoService, MochiVideoRequest } from './mochi-video';
import { LumaVideoService, LumaVideoRequest } from './luma-video';

export type VideoProvider = 'mochi' | 'luma' | 'auto';

export interface VideoGenerationRequest {
  prompt: string;
  provider?: VideoProvider;
  contentId?: string;
  // Provider-specific options
  aspect_ratio?: '16:9' | '1:1' | '9:16';
  negative_prompt?: string;
  num_inference_steps?: number;
  guidance_scale?: number;
  num_frames?: number;
  seed?: number;
  loop?: boolean;
}

export interface ProviderInfo {
  name: string;
  cost_per_video: number;
  max_duration: number;
  resolution: string;
  features: string[];
  available: boolean;
  estimatedTime?: string;
}

export class VideoOrchestrator {
  private mochiService: MochiVideoService;
  private lumaService: LumaVideoService;
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.mochiService = new MochiVideoService(storage);
    this.lumaService = new LumaVideoService(storage);
  }

  async generateVideo(request: VideoGenerationRequest): Promise<VideoGeneration> {
    const provider = this.selectProvider(request.provider);
    
    console.log(`Video orchestrator: Using ${provider} for generation`);
    
    try {
      switch (provider) {
        case 'mochi':
          return await this.generateWithMochi(request);
        case 'luma':
          return await this.generateWithLuma(request);
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }
    } catch (error) {
      console.error(`Video generation failed with ${provider}:`, error);
      
      // Fallback to the other provider if auto mode
      if (request.provider === 'auto') {
        const fallbackProvider = provider === 'mochi' ? 'luma' : 'mochi';
        console.log(`Attempting fallback to ${fallbackProvider}`);
        
        try {
          switch (fallbackProvider) {
            case 'mochi':
              return await this.generateWithMochi(request);
            case 'luma':
              return await this.generateWithLuma(request);
            default:
              throw error;
          }
        } catch (fallbackError) {
          console.error(`Fallback generation also failed:`, fallbackError);
          throw error; // Throw original error
        }
      }
      
      throw error;
    }
  }

  private async generateWithMochi(request: VideoGenerationRequest): Promise<VideoGeneration> {
    const mochiRequest: MochiVideoRequest = {
      prompt: request.prompt,
      negative_prompt: request.negative_prompt,
      num_inference_steps: request.num_inference_steps,
      guidance_scale: request.guidance_scale,
      num_frames: request.num_frames,
      seed: request.seed
    };
    
    return await this.mochiService.generateVideo(mochiRequest, request.contentId);
  }

  private async generateWithLuma(request: VideoGenerationRequest): Promise<VideoGeneration> {
    const lumaRequest: LumaVideoRequest = {
      prompt: request.prompt,
      aspect_ratio: request.aspect_ratio,
      loop: request.loop
    };
    
    return await this.lumaService.generateVideo(lumaRequest, request.contentId);
  }

  private selectProvider(requested?: VideoProvider): 'mochi' | 'luma' {
    if (requested === 'mochi' || requested === 'luma') {
      return requested;
    }
    
    // Auto selection logic based on cost-effectiveness
    // Default to Mochi (cheaper at $0.17/video vs Luma $0.30/video)
    return 'mochi';
  }

  async getGenerationStatus(id: string): Promise<VideoGeneration> {
    const generation = await this.storage.getVideoGeneration(id);
    if (!generation) {
      throw new Error(`Video generation not found: ${id}`);
    }
    
    // Delegate status checking to the appropriate service
    switch (generation.provider) {
      case 'mochi':
        return await this.mochiService.checkStatus(id);
      case 'luma':
        return await this.lumaService.checkStatus(id);
      default:
        return generation;
    }
  }

  async getAllGenerations(): Promise<VideoGeneration[]> {
    return await this.storage.getAllVideoGenerations();
  }

  async getGenerationsByProvider(provider: VideoProvider): Promise<VideoGeneration[]> {
    if (provider === 'auto') {
      return await this.getAllGenerations();
    }
    return await this.storage.getAllVideoGenerations(provider);
  }

  getProviderInfo(): Record<VideoProvider, ProviderInfo> {
    return {
      mochi: {
        ...this.mochiService.getProviderInfo(),
        available: !!process.env.MOCHI_API_KEY,
        estimatedTime: '3-5 minutes'
      },
      luma: {
        ...this.lumaService.getProviderInfo(),
        available: !!process.env.LUMA_API_KEY,
        estimatedTime: '2-5 minutes'
      },
      auto: {
        name: 'Auto Selection (Cost Optimized)',
        cost_per_video: 0.17, // Defaults to cheapest (Mochi)
        max_duration: 5.4,
        resolution: 'Adaptive',
        features: ['Cost optimization', 'Automatic fallback', 'Best value'],
        available: !!(process.env.MOCHI_API_KEY || process.env.LUMA_API_KEY),
        estimatedTime: '2-5 minutes'
      }
    };
  }

  getCostAnalysis() {
    const providers = this.getProviderInfo();
    
    return {
      cheapest: {
        provider: 'mochi',
        cost: providers.mochi.cost_per_video,
        savings_vs_most_expensive: providers.luma.cost_per_video - providers.mochi.cost_per_video
      },
      monthly_estimate: {
        videos_per_day: 6, // Based on 10 channels target
        monthly_videos: 180,
        mochi_monthly_cost: 180 * providers.mochi.cost_per_video,
        luma_monthly_cost: 180 * providers.luma.cost_per_video,
        savings_with_mochi: 180 * (providers.luma.cost_per_video - providers.mochi.cost_per_video)
      },
      break_even_analysis: {
        revenue_per_video_needed: providers.mochi.cost_per_video, // Break-even point
        affiliate_commission_rate: 0.05, // 5% typical
        min_sale_value_needed: providers.mochi.cost_per_video / 0.05
      }
    };
  }
}