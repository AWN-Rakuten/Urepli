import axios from 'axios';

export interface ComfyUIWorkflow {
  id: string;
  nodes: Record<string, any>;
  prompt: string;
  outputFormat: 'mp4' | 'gif' | 'jpg';
}

export class ComfyUIService {
  private baseUrl: string;
  private wsUrl: string;
  private clientId: string;

  constructor(baseUrl = 'http://localhost:8188') {
    this.baseUrl = baseUrl;
    this.wsUrl = baseUrl.replace('http', 'ws');
    this.clientId = Math.random().toString(36).substring(7);
  }

  async queueWorkflow(workflow: ComfyUIWorkflow): Promise<string> {
    try {
      const response = await axios.post(`${this.baseUrl}/prompt`, {
        prompt: workflow.nodes,
        client_id: this.clientId
      });
      
      return response.data.prompt_id;
    } catch (error) {
      console.error('ComfyUI service not available:', error);
      throw new Error('ComfyUI service not available');
    }
  }

  async getWorkflowProgress(promptId: string): Promise<{
    status: 'queued' | 'running' | 'completed' | 'failed';
    progress: number;
    outputUrls?: string[];
  }> {
    try {
      const response = await axios.get(`${this.baseUrl}/history/${promptId}`);
      const history = response.data[promptId];
      
      if (!history) {
        return { status: 'queued', progress: 0 };
      }
      
      if (history.status?.completed) {
        const outputs = this.extractOutputUrls(history.outputs);
        return { status: 'completed', progress: 100, outputUrls: outputs };
      }
      
      return { status: 'running', progress: 50 };
    } catch (error) {
      return { status: 'failed', progress: 0 };
    }
  }

  private extractOutputUrls(outputs: any): string[] {
    const urls: string[] = [];
    for (const nodeId in outputs) {
      const nodeOutput = outputs[nodeId];
      if (nodeOutput.images) {
        nodeOutput.images.forEach((img: any) => {
          urls.push(`${this.baseUrl}/view?filename=${img.filename}&subfolder=${img.subfolder || ''}&type=${img.type}`);
        });
      }
      if (nodeOutput.videos) {
        nodeOutput.videos.forEach((vid: any) => {
          urls.push(`${this.baseUrl}/view?filename=${vid.filename}&subfolder=${vid.subfolder || ''}&type=${vid.type}`);
        });
      }
    }
    return urls;
  }

  createCopyrightSafeWorkflow(inputVideoUrl: string): ComfyUIWorkflow {
    return {
      id: `copyright-safe-${Date.now()}`,
      prompt: "Transform video to avoid copyright detection",
      outputFormat: 'mp4',
      nodes: {
        "1": {
          "inputs": {
            "video": inputVideoUrl
          },
          "class_type": "LoadVideo",
          "_meta": {
            "title": "Load Video"
          }
        },
        "2": {
          "inputs": {
            "video": ["1", 0],
            "style_strength": 0.7,
            "color_grading": "cinematic"
          },
          "class_type": "StyleTransfer",
          "_meta": {
            "title": "Style Transfer"
          }
        },
        "3": {
          "inputs": {
            "video": ["2", 0],
            "speed_factor": 1.1,
            "frame_interpolation": true
          },
          "class_type": "TimeTransform",
          "_meta": {
            "title": "Time Transform"
          }
        },
        "4": {
          "inputs": {
            "video": ["3", 0],
            "format": "mp4",
            "quality": "high"
          },
          "class_type": "SaveVideo",
          "_meta": {
            "title": "Save Video"
          }
        }
      }
    };
  }

  createJapaneseContentWorkflow(text: string, backgroundVideoUrl: string): ComfyUIWorkflow {
    return {
      id: `japanese-content-${Date.now()}`,
      prompt: `Create Japanese social media video: ${text}`,
      outputFormat: 'mp4',
      nodes: {
        "1": {
          "inputs": {
            "video": backgroundVideoUrl
          },
          "class_type": "LoadVideo"
        },
        "2": {
          "inputs": {
            "text": text,
            "font": "NotoSansJP-Bold",
            "size": 48,
            "color": "#FFFFFF",
            "stroke_color": "#000000",
            "stroke_width": 2
          },
          "class_type": "TextOverlay"
        },
        "3": {
          "inputs": {
            "video": ["1", 0],
            "text_overlay": ["2", 0],
            "position": "bottom_center",
            "animation": "fade_in"
          },
          "class_type": "CompositeVideo"
        },
        "4": {
          "inputs": {
            "video": ["3", 0],
            "duration": 30,
            "aspect_ratio": "9:16"
          },
          "class_type": "CropAndResize"
        },
        "5": {
          "inputs": {
            "video": ["4", 0],
            "format": "mp4"
          },
          "class_type": "SaveVideo"
        }
      }
    };
  }
}