import axios, { AxiosError } from 'axios';
import { IStorage } from '../storage';
import { VideoGeneration } from '../../shared/schema';

export interface LumaVideoRequest {
  prompt: string;
  aspect_ratio?: '16:9' | '1:1' | '9:16';
  expand_prompt?: boolean;
  loop?: boolean;
  image_url?: string;
  image_end_url?: string;
}

export interface LumaVideoResponse {
  status: string;
  data: {
    jobId: string;
    state: 'pending' | 'processing' | 'completed' | 'failed';
    videoUrl?: string;
    estimate_wait_seconds?: number;
    quota?: number;
  };
}

export class LumaVideoService {
  private apiKey: string;
  private baseUrl = 'https://api.aimlapi.com/v2/generate/video/luma-ai/generation';
  private storage: IStorage;
  private costPerVideo = 0.30; // Estimated $0.30 per video based on research

  constructor(storage: IStorage, apiKey?: string) {
    this.apiKey = apiKey || process.env.LUMA_API_KEY || '';
    this.storage = storage;
  }

  async generateVideo(request: LumaVideoRequest, contentId?: string): Promise<VideoGeneration> {
    if (!this.apiKey) {
      throw new Error('Luma API key not configured');
    }

    // Create database record
    const videoGeneration = await this.storage.createVideoGeneration({
      provider: 'luma',
      prompt: request.prompt,
      status: 'pending',
      cost: this.costPerVideo,
      contentId: contentId || null,
      metadata: {
        request: request,
        provider_name: 'Luma Dream Machine (AI/ML API)',
        expected_duration: 5.0,
        expected_resolution: '1080p'
      }
    });

    try {
      console.log(`Starting Luma video generation: ${videoGeneration.id}`);
      
      const payload = {
        prompt: request.prompt,
        aspect_ratio: request.aspect_ratio || '16:9',
        expand_prompt: request.expand_prompt || true,
        loop: request.loop || false,
        ...(request.image_url && { image_url: request.image_url }),
        ...(request.image_end_url && { image_end_url: request.image_end_url })
      };

      const response = await axios.post<LumaVideoResponse>(
        this.baseUrl,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000 // 1 minute timeout for initial request
        }
      );

      const result = response.data;
      
      if (result.status !== 'SUCCESS') {
        throw new Error(`Luma API error: ${result.status}`);
      }

      // Update with processing status
      const updatedGeneration = await this.storage.updateVideoGeneration(videoGeneration.id, {
        status: 'processing',
        metadata: {
          ...(videoGeneration.metadata || {}),
          jobId: result.data.jobId,
          estimate_wait_seconds: result.data.estimate_wait_seconds,
          quota: result.data.quota
        }
      });

      // Start polling for completion (in background)
      this.pollForCompletion(videoGeneration.id, result.data.jobId);

      return updatedGeneration;

    } catch (error) {
      console.error('Luma generation error:', error);
      
      await this.storage.updateVideoGeneration(videoGeneration.id, {
        status: 'failed',
        metadata: {
          ...(videoGeneration.metadata || {}),
          error: error instanceof AxiosError ? error.response?.data : error
        }
      });

      // Return mock data for development (remove in production)
      if (process.env.NODE_ENV === 'development') {
        console.log('Returning mock data for development');
        return await this.storage.updateVideoGeneration(videoGeneration.id, {
          status: 'completed',
          videoUrl: `https://mock-video-url.com/luma_${Date.now()}.mp4`,
          thumbnailUrl: `https://mock-thumbnail-url.com/luma_${Date.now()}.jpg`,
          duration: 5.0,
          resolution: '1080p',
          cost: this.costPerVideo,
          completedAt: new Date(),
          metadata: {
            ...(videoGeneration.metadata || {}),
            mock: true,
            prompt: request.prompt
          }
        });
      }

      throw error;
    }
  }

  private async pollForCompletion(generationId: string, jobId: string): Promise<void> {
    const maxPolls = 30; // Max 5 minutes (10 second intervals)
    let polls = 0;

    const poll = async () => {
      try {
        polls++;
        
        const statusResponse = await axios.get(
          `${this.baseUrl}?jobId=${jobId}`,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const status = statusResponse.data;
        
        if (status.data.state === 'completed' && status.data.videoUrl) {
          // Update database with completed video
          await this.storage.updateVideoGeneration(generationId, {
            status: 'completed',
            videoUrl: status.data.videoUrl,
            duration: 5.0, // Default Luma duration
            resolution: '1080p',
            completedAt: new Date(),
            metadata: {
              jobId,
              quota: status.data.quota,
              polls_taken: polls
            }
          });
          console.log(`Luma video generation completed: ${generationId}`);
          return;
        }
        
        if (status.data.state === 'failed') {
          await this.storage.updateVideoGeneration(generationId, {
            status: 'failed',
            metadata: { jobId, error: 'Generation failed on Luma servers', polls_taken: polls }
          });
          return;
        }

        // Continue polling if still processing and under max polls
        if (polls < maxPolls && status.data.state === 'processing') {
          setTimeout(poll, 10000); // Poll every 10 seconds
        } else if (polls >= maxPolls) {
          // Timeout - mark as failed
          await this.storage.updateVideoGeneration(generationId, {
            status: 'failed',
            metadata: { jobId, error: 'Polling timeout exceeded', polls_taken: polls }
          });
        }

      } catch (error) {
        console.error(`Polling error for generation ${generationId}:`, error);
        await this.storage.updateVideoGeneration(generationId, {
          status: 'failed',
          metadata: { jobId, error: 'Polling error', polls_taken: polls }
        });
      }
    };

    // Start polling after initial delay
    setTimeout(poll, 10000);
  }

  async checkStatus(generationId: string): Promise<VideoGeneration> {
    const generation = await this.storage.getVideoGeneration(generationId);
    if (!generation) {
      throw new Error(`Video generation not found: ${generationId}`);
    }

    return generation;
  }

  async getAllGenerations(): Promise<VideoGeneration[]> {
    return await this.storage.getAllVideoGenerations('luma');
  }

  getEstimatedCost(): number {
    return this.costPerVideo;
  }

  getProviderInfo() {
    return {
      name: 'Luma Dream Machine (AI/ML API)',
      cost_per_video: this.costPerVideo,
      max_duration: 5.0,
      resolution: '1080p',
      features: ['Text-to-video', 'Image-to-video', 'Loop creation', 'Ray v1.6 model'],
      model: 'luma-ai/dream-machine'
    };
  }
}