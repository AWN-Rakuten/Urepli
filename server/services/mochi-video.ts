import axios, { AxiosError } from 'axios';
import { IStorage } from '../storage';
import { VideoGeneration } from '../../shared/schema';

export interface MochiVideoRequest {
  prompt: string;
  negative_prompt?: string;
  num_inference_steps?: number;
  guidance_scale?: number;
  num_frames?: number;
  seed?: number;
  height?: number;
  width?: number;
}

export interface MochiVideoResponse {
  video_url: string;
  seed: string;
  request_id: string | null;
  inference_status: {
    status: string;
    runtime_ms: number;
    cost: number;
    tokens_generated: number;
    tokens_input: number;
  };
}

export class MochiVideoService {
  private apiKey: string;
  private baseUrl = 'https://api.deepinfra.com/v1/inference/genmo/mochi-1-preview';
  private storage: IStorage;
  private costPerVideo = 0.17; // $0.17 per video based on research

  constructor(storage: IStorage, apiKey?: string) {
    this.apiKey = apiKey || process.env.MOCHI_API_KEY || '';
    this.storage = storage;
  }

  async generateVideo(request: MochiVideoRequest, contentId?: string): Promise<VideoGeneration> {
    if (!this.apiKey) {
      throw new Error('Mochi API key not configured');
    }

    // Create database record
    const videoGeneration = await this.storage.createVideoGeneration({
      provider: 'mochi',
      prompt: request.prompt,
      status: 'pending',
      cost: this.costPerVideo,
      contentId: contentId || null,
      metadata: {
        request: request,
        provider_name: 'DeepInfra Mochi 1',
        expected_duration: 5.4,
        expected_resolution: '480x848'
      }
    });

    try {
      console.log(`Starting Mochi video generation: ${videoGeneration.id}`);
      
      const payload = {
        prompt: request.prompt,
        negative_prompt: request.negative_prompt || "",
        num_inference_steps: request.num_inference_steps || 64,
        guidance_scale: request.guidance_scale || 4.5,
        num_frames: request.num_frames || 31,
        seed: request.seed || Math.floor(Math.random() * 1000000),
        height: request.height || 480,
        width: request.width || 848
      };

      const response = await axios.post<MochiVideoResponse>(
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
      
      // Update with processing status
      const updatedGeneration = await this.storage.updateVideoGeneration(videoGeneration.id, {
        status: 'processing',
        metadata: {
          ...(videoGeneration.metadata || {}),
          request_id: result.request_id,
          seed: result.seed,
          inference_status: result.inference_status
        }
      });

      // If video URL is immediately available (rare), update to completed
      if (result.video_url) {
        return await this.storage.updateVideoGeneration(videoGeneration.id, {
          status: 'completed',
          videoUrl: result.video_url,
          duration: 5.4, // Default Mochi duration
          resolution: '480x848',
          completedAt: new Date()
        });
      }

      // Return processing status - will need polling
      return updatedGeneration;

    } catch (error) {
      console.error('Mochi generation error:', error);
      
      await this.storage.updateVideoGeneration(videoGeneration.id, {
        status: 'failed',
        metadata: {
          ...(videoGeneration.metadata || {}),
          error: error instanceof AxiosError ? error.response?.data : error
        }
      });


      throw error;
    }
  }

  async checkStatus(generationId: string): Promise<VideoGeneration> {
    const generation = await this.storage.getVideoGeneration(generationId);
    if (!generation) {
      throw new Error(`Video generation not found: ${generationId}`);
    }

    if (generation.status === 'completed' || generation.status === 'failed') {
      return generation;
    }

    // In a real implementation, you would check the actual status
    // For now, return the current status
    return generation;
  }

  async getAllGenerations(): Promise<VideoGeneration[]> {
    return await this.storage.getAllVideoGenerations('mochi');
  }

  getEstimatedCost(): number {
    return this.costPerVideo;
  }

  getProviderInfo() {
    return {
      name: 'Mochi 1 (DeepInfra)',
      cost_per_video: this.costPerVideo,
      max_duration: 5.4,
      resolution: '480x848',
      features: ['Text-to-video', 'High motion fidelity', 'Photorealistic'],
      model: 'genmo/mochi-1-preview'
    };
  }
}