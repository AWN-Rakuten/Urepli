import axios from 'axios';

export interface ComfyUIWorkflow {
  id: string;
  nodes: Record<string, any>;
  prompt: string;
  outputFormat: 'mp4' | 'gif' | 'jpg';
}

export interface AICharacterConfig {
  gender: 'male' | 'female' | 'non-binary';
  ethnicity: 'japanese' | 'western' | 'asian' | 'mixed' | 'custom';
  age: 'young' | 'middle' | 'mature';
  style: 'realistic' | 'anime' | 'stylized' | 'hyperrealistic';
  clothing: string;
  background: string;
  emotions: string[];
  voice: {
    language: string;
    accent: string;
    tone: 'professional' | 'casual' | 'energetic' | 'calm' | 'emotional';
  };
}

export class ComfyUIService {
  private baseUrl: string;
  private wsUrl: string;
  private clientId: string;
  private latestModels: Map<string, string> = new Map();

  constructor(baseUrl = 'http://localhost:8188') {
    this.baseUrl = baseUrl;
    this.wsUrl = baseUrl.replace('http', 'ws');
    this.clientId = Math.random().toString(36).substring(7);
    this.initializeLatestModels();
  }

  private initializeLatestModels(): void {
    // Latest ComfyUI models for enhanced AI integration
    this.latestModels.set('realistic_character', 'SDXL_RealVisXL_V4.0');
    this.latestModels.set('anime_character', 'AnythingXL_V3.0');
    this.latestModels.set('video_generation', 'AnimateDiff_V3_SD15');
    this.latestModels.set('style_transfer', 'ControlNet_V1.5_InstantStyle');
    this.latestModels.set('face_animation', 'LivePortrait_V1.2');
    this.latestModels.set('lip_sync', 'Wav2Lip_GAN_HD');
    this.latestModels.set('pose_control', 'OpenPose_V2.1');
    this.latestModels.set('depth_estimation', 'DepthAnything_V2');
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

  /**
   * Create hyper-realistic AI character with LLM-generated script
   */
  createAICharacterWorkflow(
    characterConfig: AICharacterConfig,
    script: string,
    duration: number = 30
  ): ComfyUIWorkflow {
    const modelName = this.getOptimalModel(characterConfig.style);
    
    return {
      id: `ai-character-${Date.now()}`,
      prompt: `Create hyper-realistic ${characterConfig.ethnicity} ${characterConfig.gender} character: ${script}`,
      outputFormat: 'mp4',
      nodes: {
        "1": {
          "inputs": {
            "ckpt_name": modelName,
            "config_name": "config.yaml"
          },
          "class_type": "CheckpointLoaderSimple"
        },
        "2": {
          "inputs": {
            "text": this.buildCharacterPrompt(characterConfig, script),
            "clip": ["1", 1]
          },
          "class_type": "CLIPTextEncode"
        },
        "3": {
          "inputs": {
            "text": "blurry, low quality, distorted, bad anatomy, bad proportions",
            "clip": ["1", 1]
          },
          "class_type": "CLIPTextEncode"
        },
        "4": {
          "inputs": {
            "width": 512,
            "height": 768,
            "batch_size": 1
          },
          "class_type": "EmptyLatentImage"
        },
        "5": {
          "inputs": {
            "seed": Math.floor(Math.random() * 1000000),
            "steps": 30,
            "cfg": 8.0,
            "sampler_name": "dpmpp_2m",
            "scheduler": "karras",
            "denoise": 1.0,
            "model": ["1", 0],
            "positive": ["2", 0],
            "negative": ["3", 0],
            "latent_image": ["4", 0]
          },
          "class_type": "KSampler"
        },
        "6": {
          "inputs": {
            "samples": ["5", 0],
            "vae": ["1", 2]
          },
          "class_type": "VAEDecode"
        },
        "7": {
          "inputs": {
            "image": ["6", 0],
            "control_net": "control_openpose-fp16.safetensors"
          },
          "class_type": "ControlNetApply"
        },
        "8": {
          "inputs": {
            "image": ["7", 0],
            "motion_model": "mm_sd_v15_v2.ckpt",
            "context_length": 16,
            "context_stride": 1,
            "context_overlap": 4
          },
          "class_type": "AnimateDiffLoader"
        },
        "9": {
          "inputs": {
            "image": ["8", 0],
            "audio_file": script,
            "face_model": "LivePortrait_V1.2.pth"
          },
          "class_type": "LivePortraitLoader"
        },
        "10": {
          "inputs": {
            "images": ["9", 0],
            "filename_prefix": `ai_character_${characterConfig.style}`,
            "format": "mp4",
            "fps": 24,
            "quality": 95
          },
          "class_type": "VHS_VideoCombine"
        }
      }
    };
  }

  /**
   * Create real-time video editing workflow with AI enhancements
   */
  createRealTimeEditingWorkflow(
    inputVideoUrl: string,
    editingPrompts: string[],
    effects: string[] = []
  ): ComfyUIWorkflow {
    return {
      id: `realtime-edit-${Date.now()}`,
      prompt: `Real-time AI video editing: ${editingPrompts.join(', ')}`,
      outputFormat: 'mp4',
      nodes: {
        "1": {
          "inputs": {
            "video": inputVideoUrl
          },
          "class_type": "VHS_LoadVideo"
        },
        "2": {
          "inputs": {
            "video": ["1", 0],
            "frame_rate": 24,
            "loop_count": 1
          },
          "class_type": "VHS_VideoInfo"
        },
        "3": {
          "inputs": {
            "video": ["1", 0],
            "model_name": this.latestModels.get('style_transfer'),
            "strength": 0.8,
            "prompt": editingPrompts[0] || "enhance video quality"
          },
          "class_type": "InstantStyle"
        },
        "4": {
          "inputs": {
            "video": ["3", 0],
            "effects": effects.includes('color_correction'),
            "brightness": 1.1,
            "contrast": 1.2,
            "saturation": 1.15
          },
          "class_type": "ColorCorrection"
        },
        "5": {
          "inputs": {
            "video": ["4", 0],
            "transition_type": effects.includes('smooth_transitions') ? "cross_fade" : "cut",
            "duration": 0.5
          },
          "class_type": "TransitionEffects"
        },
        "6": {
          "inputs": {
            "video": ["5", 0],
            "noise_reduction": effects.includes('noise_reduction'),
            "stabilization": effects.includes('stabilization'),
            "sharpening": effects.includes('sharpening')
          },
          "class_type": "VideoEnhancement"
        },
        "7": {
          "inputs": {
            "video": ["6", 0],
            "filename_prefix": "realtime_edited",
            "format": "mp4",
            "quality": "high",
            "codec": "h264"
          },
          "class_type": "VHS_VideoCombine"
        }
      }
    };
  }

  /**
   * Create custom animation and transition effects workflow
   */
  createAnimationEffectsWorkflow(
    elements: Array<{type: string; content: string; animation: string}>,
    duration: number,
    transitions: string[]
  ): ComfyUIWorkflow {
    return {
      id: `animation-effects-${Date.now()}`,
      prompt: `Create custom animations and transitions`,
      outputFormat: 'mp4',
      nodes: {
        "1": {
          "inputs": {
            "width": 1080,
            "height": 1920,
            "batch_size": 1,
            "color": "#000000"
          },
          "class_type": "EmptyImage"
        },
        "2": {
          "inputs": {
            "image": ["1", 0],
            "keyframes": this.generateKeyframes(elements, duration),
            "easing": "ease_in_out"
          },
          "class_type": "KeyframeAnimation"
        },
        "3": {
          "inputs": {
            "image": ["2", 0],
            "particle_system": "sparkles",
            "particle_count": 100,
            "animation_speed": 1.0
          },
          "class_type": "ParticleSystem"
        },
        "4": {
          "inputs": {
            "image": ["3", 0],
            "transitions": transitions,
            "timing": "synchronized"
          },
          "class_type": "TransitionComposer"
        },
        "5": {
          "inputs": {
            "image": ["4", 0],
            "fps": 60,
            "duration": duration,
            "format": "mp4"
          },
          "class_type": "AnimationRenderer"
        }
      }
    };
  }

  private getOptimalModel(style: string): string {
    switch (style) {
      case 'hyperrealistic':
        return this.latestModels.get('realistic_character') || 'SDXL_RealVisXL_V4.0';
      case 'anime':
        return this.latestModels.get('anime_character') || 'AnythingXL_V3.0';
      case 'realistic':
        return this.latestModels.get('realistic_character') || 'SDXL_RealVisXL_V4.0';
      default:
        return 'SDXL_base_1.0';
    }
  }

  private buildCharacterPrompt(config: AICharacterConfig, script: string): string {
    const basePrompt = `${config.style} ${config.ethnicity} ${config.gender}`;
    const ageDescriptor = config.age === 'young' ? '20-25 years old' : 
                         config.age === 'middle' ? '30-40 years old' : '45-55 years old';
    
    return `${basePrompt}, ${ageDescriptor}, ${config.clothing}, ${config.background}, ` +
           `expressing ${config.emotions.join(' and ')}, high quality, detailed, professional lighting, ` +
           `8k resolution, photorealistic, speaking: "${script.substring(0, 100)}"`;
  }

  private generateKeyframes(elements: Array<{type: string; content: string; animation: string}>, duration: number): any {
    const keyframes = [];
    const timePerElement = duration / elements.length;
    
    elements.forEach((element, index) => {
      const startTime = index * timePerElement;
      const endTime = (index + 1) * timePerElement;
      
      keyframes.push({
        time: startTime,
        element: element.type,
        content: element.content,
        animation: element.animation,
        properties: {
          opacity: element.animation.includes('fade') ? [0, 1] : [1, 1],
          scale: element.animation.includes('zoom') ? [0.8, 1.2] : [1, 1],
          position: element.animation.includes('slide') ? 
                    [['-100px', '0px'], ['0px', '0px']] : [['0px', '0px'], ['0px', '0px']]
        }
      });
    });
    
    return keyframes;
  }
}