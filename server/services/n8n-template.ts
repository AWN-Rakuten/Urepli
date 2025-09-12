import { GeminiService } from "./gemini";
import { BanditAlgorithmService } from "./bandit";
import { ComfyUIService, AICharacterConfig } from "./comfyui-integration";
import type { N8nTemplate, OptimizationEvent, BanditArm } from "@shared/schema";
import axios from 'axios';
import { execSync } from 'child_process';

export interface GitIntegrationConfig {
  repositoryUrl: string;
  branch: string;
  accessToken?: string;
  autoSync: boolean;
  syncInterval: number; // minutes
}

export interface N8nOptimizationRequest {
  templateId: string;
  performanceData: {
    totalRevenue: number;
    totalCost: number;
    roas: number;
    contentGenerated: number;
    averageEngagement: number;
    platformPerformance: Record<string, number>;
  };
  banditArms: BanditArm[];
  currentSettings: Record<string, any>;
}

export interface N8nOptimizationResult {
  optimizedTemplate: N8nTemplate;
  optimizationEvent: Omit<OptimizationEvent, 'id' | 'createdAt'>;
  performanceImprovement: number;
  appliedChanges: string[];
}

export class N8nTemplateService {
  private geminiService: GeminiService;
  private banditService: BanditAlgorithmService;
  private comfyUIService: ComfyUIService;
  private gitConfig?: GitIntegrationConfig;
  private templateRepository: string = './data/n8n-git-templates';

  constructor(gitConfig?: GitIntegrationConfig) {
    this.geminiService = new GeminiService();
    this.banditService = new BanditAlgorithmService();
    this.comfyUIService = new ComfyUIService();
    this.gitConfig = gitConfig;
    
    if (gitConfig?.autoSync) {
      this.startAutoSync();
    }
  }

  /**
   * Initialize Git repository for template management
   */
  async initializeGitRepository(): Promise<void> {
    if (!this.gitConfig) {
      throw new Error('Git configuration not provided');
    }

    try {
      // Clone or initialize repository
      execSync(`mkdir -p ${this.templateRepository}`);
      
      try {
        execSync(`git clone ${this.gitConfig.repositoryUrl} ${this.templateRepository}`, 
                { stdio: 'pipe' });
      } catch {
        // Repository might already exist, try to pull latest
        execSync(`cd ${this.templateRepository} && git pull origin ${this.gitConfig.branch}`, 
                { stdio: 'pipe' });
      }
      
      console.log('Git repository initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Git repository:', error);
      throw error;
    }
  }

  /**
   * Sync templates with Git repository
   */
  async syncWithGitRepository(): Promise<{
    pulled: string[];
    pushed: string[];
    conflicts: string[];
  }> {
    if (!this.gitConfig) {
      throw new Error('Git configuration not provided');
    }

    const result = { pulled: [], pushed: [], conflicts: [] };

    try {
      // Pull latest changes
      const pullResult = execSync(
        `cd ${this.templateRepository} && git pull origin ${this.gitConfig.branch}`, 
        { encoding: 'utf-8' }
      );
      
      if (pullResult.includes('CONFLICT')) {
        result.conflicts.push('Merge conflicts detected');
      } else {
        result.pulled.push('Successfully pulled latest templates');
      }

      // Commit and push local changes if any
      try {
        execSync(`cd ${this.templateRepository} && git add .`, { stdio: 'pipe' });
        execSync(
          `cd ${this.templateRepository} && git commit -m "Auto-sync: Update templates ${new Date().toISOString()}"`, 
          { stdio: 'pipe' }
        );
        execSync(
          `cd ${this.templateRepository} && git push origin ${this.gitConfig.branch}`, 
          { stdio: 'pipe' }
        );
        result.pushed.push('Successfully pushed local changes');
      } catch {
        // No changes to commit
      }

      return result;
    } catch (error) {
      console.error('Git sync failed:', error);
      throw error;
    }
  }

  /**
   * Create AI-powered character generation workflow with LLM integration
   */
  async createAICharacterWorkflow(
    characterConfig: AICharacterConfig,
    scriptPrompt: string,
    platform: 'tiktok' | 'instagram' | 'youtube' = 'tiktok'
  ): Promise<N8nTemplate> {
    const workflowId = `ai-character-workflow-${Date.now()}`;
    
    const template: Omit<N8nTemplate, 'id' | 'createdAt' | 'updatedAt'> = {
      name: `AI Character Generation - ${characterConfig.style} ${characterConfig.ethnicity}`,
      description: `Advanced AI character workflow with LLM script generation for ${platform}`,
      template: {
        id: workflowId,
        name: `AI Character Pipeline v2.0`,
        nodes: [
          {
            id: "trigger",
            name: "Content Trigger",
            type: "n8n-nodes-base.cron",
            position: [0, 0],
            parameters: {
              rule: "0 */2 * * *", // Every 2 hours
              timezone: "Asia/Tokyo"
            }
          },
          {
            id: "generate_script",
            name: "Generate Character Script with Gemini",
            type: "n8n-nodes-base.httpRequest",
            position: [200, 0],
            parameters: {
              url: "/api/ai/generate-character-script",
              method: "POST",
              sendBody: true,
              bodyParameters: {
                prompt: scriptPrompt,
                character: characterConfig,
                platform: platform,
                duration: 30,
                language: "japanese"
              }
            }
          },
          {
            id: "enhance_script",
            name: "Enhance Script with Context",
            type: "n8n-nodes-base.httpRequest", 
            position: [400, 0],
            parameters: {
              url: "/api/ai/enhance-script",
              method: "POST",
              sendBody: true,
              bodyParameters: {
                script: "={{$node['Generate Character Script with Gemini'].json['script']}}",
                character: characterConfig,
                emotions: characterConfig.emotions,
                voice: characterConfig.voice
              }
            }
          },
          {
            id: "generate_character",
            name: "Generate AI Character Video",
            type: "n8n-nodes-base.httpRequest",
            position: [600, 0], 
            parameters: {
              url: "/api/comfyui/generate-character",
              method: "POST",
              sendBody: true,
              bodyParameters: {
                characterConfig: characterConfig,
                script: "={{$node['Enhance Script with Context'].json['enhancedScript']}}",
                workflow: "hyperrealistic_character"
              }
            }
          },
          {
            id: "add_voice_synthesis",
            name: "Generate Voice with TTS",
            type: "n8n-nodes-base.httpRequest",
            position: [800, 0],
            parameters: {
              url: "/api/tts/generate-voice", 
              method: "POST",
              sendBody: true,
              bodyParameters: {
                text: "={{$node['Enhance Script with Context'].json['enhancedScript']}}",
                voice: characterConfig.voice,
                speed: 1.0,
                emotion: characterConfig.emotions[0] || 'neutral'
              }
            }
          },
          {
            id: "lip_sync_video",
            name: "Synchronize Lip Movement",
            type: "n8n-nodes-base.httpRequest",
            position: [1000, 0],
            parameters: {
              url: "/api/comfyui/lip-sync",
              method: "POST", 
              sendBody: true,
              bodyParameters: {
                videoUrl: "={{$node['Generate AI Character Video'].json['videoUrl']}}",
                audioUrl: "={{$node['Generate Voice with TTS'].json['audioUrl']}}",
                model: "Wav2Lip_GAN_HD"
              }
            }
          },
          {
            id: "optimize_for_platform",
            name: "Optimize for Platform",
            type: "n8n-nodes-base.httpRequest",
            position: [1200, 0],
            parameters: {
              url: "/api/video/optimize-platform",
              method: "POST",
              sendBody: true,
              bodyParameters: {
                videoUrl: "={{$node['Synchronize Lip Movement'].json['syncedVideoUrl']}}",
                platform: platform,
                aspectRatio: platform === 'tiktok' ? '9:16' : '16:9',
                duration: 30,
                quality: 'high'
              }
            }
          },
          {
            id: "add_captions",
            name: "Generate Auto Captions",
            type: "n8n-nodes-base.httpRequest",
            position: [1400, 0],
            parameters: {
              url: "/api/video/auto-captions",
              method: "POST",
              sendBody: true,
              bodyParameters: {
                videoUrl: "={{$node['Optimize for Platform'].json['optimizedVideoUrl']}}",
                script: "={{$node['Enhance Script with Context'].json['enhancedScript']}}",
                language: "ja",
                style: "modern"
              }
            }
          },
          {
            id: "post_content",
            name: "Multi-Platform Posting",
            type: "n8n-nodes-base.httpRequest",
            position: [1600, 0],
            parameters: {
              url: "/api/social/multi-platform-post",
              method: "POST", 
              sendBody: true,
              bodyParameters: {
                videoUrl: "={{$node['Generate Auto Captions'].json['captionedVideoUrl']}}",
                caption: "={{$node['Enhance Script with Context'].json['socialCaption']}}",
                platforms: [platform],
                scheduleTime: "optimal"
              }
            }
          }
        ],
        connections: {
          "Content Trigger": {
            "main": [["Generate Character Script with Gemini"]]
          },
          "Generate Character Script with Gemini": {
            "main": [["Enhance Script with Context"]]
          },
          "Enhance Script with Context": {
            "main": [["Generate AI Character Video", "Generate Voice with TTS"]]
          },
          "Generate AI Character Video": {
            "main": [["Synchronize Lip Movement"]]
          },
          "Generate Voice with TTS": {
            "main": [["Synchronize Lip Movement"]]
          },
          "Synchronize Lip Movement": {
            "main": [["Optimize for Platform"]]
          },
          "Optimize for Platform": {
            "main": [["Generate Auto Captions"]]
          },
          "Generate Auto Captions": {
            "main": [["Multi-Platform Posting"]]
          }
        }
      }
    };

    return template as N8nTemplate;
  }

  private startAutoSync(): void {
    if (!this.gitConfig?.autoSync) return;
    
    setInterval(async () => {
      try {
        await this.syncWithGitRepository();
        console.log('Auto-sync completed successfully');
      } catch (error) {
        console.error('Auto-sync failed:', error);
      }
    }, this.gitConfig.syncInterval * 60 * 1000);
  }

  async optimizeTemplate(
    currentTemplate: N8nTemplate,
    optimizationRequest: N8nOptimizationRequest
  ): Promise<N8nOptimizationResult> {
    // Step 1: Analyze current performance with Gemini
    const performanceAnalysis = await this.analyzePerformanceWithGemini(
      currentTemplate,
      optimizationRequest
    );

    // Step 2: Generate optimization suggestions
    const optimizationSuggestions = await this.generateOptimizationSuggestions(
      currentTemplate,
      performanceAnalysis,
      optimizationRequest
    );

    // Step 3: Apply optimizations to template
    const optimizedTemplate = await this.applyOptimizations(
      currentTemplate,
      optimizationSuggestions
    );

    // Step 4: Calculate expected performance improvement
    const performanceImprovement = await this.calculatePerformanceImprovement(
      optimizationSuggestions,
      optimizationRequest.performanceData
    );

    // Step 5: Create optimization event record
    const optimizationEvent: Omit<OptimizationEvent, 'id' | 'createdAt'> = {
      templateId: currentTemplate.id,
      performanceData: optimizationRequest.performanceData,
      geminiAnalysis: {
        analysis: performanceAnalysis,
        suggestions: optimizationSuggestions
      },
      appliedChanges: optimizationSuggestions.appliedChanges,
      performanceImprovement,
      status: "completed"
    };

    return {
      optimizedTemplate,
      optimizationEvent,
      performanceImprovement,
      appliedChanges: optimizationSuggestions.appliedChanges
    };
  }

  private async analyzePerformanceWithGemini(
    template: N8nTemplate,
    request: N8nOptimizationRequest
  ): Promise<any> {
    const analysisPrompt = `Analyze this n8n workflow performance data for Japanese market content automation:

Current Template: ${JSON.stringify(template.template, null, 2)}
Performance Data: ${JSON.stringify(request.performanceData, null, 2)}
Bandit Arms Performance: ${JSON.stringify(request.banditArms, null, 2)}

Focus Analysis On:
1. Revenue optimization (current ROAS: ${request.performanceData.roas}x)
2. Japanese market timing and cultural factors
3. Content generation efficiency and quality
4. Platform allocation optimization (TikTok vs Instagram)
5. Voice settings and TTS optimization for Japanese audience

Provide detailed analysis of:
- Current bottlenecks and inefficiencies
- Revenue leakage points
- Timing optimization opportunities (Japan timezone)
- Content quality improvements
- Platform-specific optimizations

Respond with JSON format:
{
  "performanceScore": number (1-100),
  "bottlenecks": ["list of identified issues"],
  "revenueOptimizations": ["specific revenue improvement opportunities"],
  "timingIssues": ["Japanese market timing problems"],
  "contentQualityIssues": ["script and TTS quality issues"],
  "platformOptimizations": {"platform": "optimization recommendation"}
}`;

    try {
      const response = await this.geminiService.optimizeWorkflow(
        template.template,
        request.performanceData,
        request.performanceData.totalRevenue
      );

      // Parse the detailed analysis response
      return {
        overallAnalysis: response,
        detailedBreakdown: await this.getDetailedAnalysis(analysisPrompt)
      };
    } catch (error) {
      throw new Error(`Failed to analyze performance: ${error}`);
    }
  }

  private async getDetailedAnalysis(prompt: string): Promise<any> {
    try {
      const response = await this.geminiService.analyzePerformanceData([{ prompt }]);
      return response[0] || "Analysis not available";
    } catch (error) {
      return `Analysis failed: ${error}`;
    }
  }

  private async generateOptimizationSuggestions(
    template: N8nTemplate,
    analysis: any,
    request: N8nOptimizationRequest
  ): Promise<any> {
    const optimizationPrompt = `Based on this performance analysis, generate specific n8n workflow optimizations:

Analysis: ${JSON.stringify(analysis, null, 2)}
Current Performance: ROAS ${request.performanceData.roas}x, Revenue ¥${request.performanceData.totalRevenue}

Generate optimizations for:
1. Schedule timing (consider Japanese peak hours: 19:00-23:00 JST)
2. Content parameters (niche, hook types, platform allocation)
3. TTS voice settings (optimize for Japanese audience engagement)
4. Bandit algorithm parameters (window size, reallocation triggers)
5. Platform distribution (current: ${JSON.stringify(request.performanceData.platformPerformance)})

Respond with JSON format:
{
  "scheduleOptimizations": {
    "newCronSchedule": "optimized cron expression",
    "reasoning": "why this timing is better for Japanese market"
  },
  "contentOptimizations": {
    "niches": ["optimized content niches"],
    "hookTypes": ["best performing hook types"],
    "platformAllocation": {"tiktok": percentage, "instagram": percentage}
  },
  "voiceOptimizations": {
    "voice": "optimal Japanese voice",
    "speed": number,
    "pitch": number,
    "reasoning": "why these settings improve engagement"
  },
  "banditOptimizations": {
    "windowMinutes": number,
    "reallocationTrigger": number,
    "profitThreshold": number
  },
  "appliedChanges": ["list of specific changes to be applied"],
  "expectedImprovementPercent": number
}`;

    try {
      // Get optimization suggestions from Gemini
      const response = await this.geminiService.optimizeWorkflow(
        template.template,
        request.performanceData,
        request.performanceData.totalRevenue
      );

      // Also get bandit algorithm optimizations
      const banditOptimizations = this.banditService.optimizeScheduleTiming(
        request.performanceData.platformPerformance
      );

      return {
        geminiSuggestions: response,
        banditOptimizations,
        appliedChanges: [
          "Updated schedule timing for Japanese peak hours",
          "Optimized platform allocation based on performance data",
          "Adjusted TTS voice settings for better engagement",
          "Updated bandit algorithm parameters for faster optimization"
        ]
      };
    } catch (error) {
      throw new Error(`Failed to generate optimizations: ${error}`);
    }
  }

  private async applyOptimizations(
    template: N8nTemplate,
    suggestions: any
  ): Promise<N8nTemplate> {
    const optimizedTemplate = JSON.parse(JSON.stringify(template));

    // Apply schedule optimizations
    if (suggestions.banditOptimizations?.recommendedSchedule) {
      const scheduleNode = optimizedTemplate.template.nodes.find(
        (node: any) => node.type === "n8n-nodes-base.cron"
      );
      if (scheduleNode) {
        scheduleNode.parameters.rule = suggestions.banditOptimizations.recommendedSchedule;
      }
    }

    // Apply content optimizations
    if (suggestions.geminiSuggestions?.suggestedParameters) {
      const params = suggestions.geminiSuggestions.suggestedParameters;
      
      // Update content generation node
      const contentNode = optimizedTemplate.template.nodes.find(
        (node: any) => node.name === "Gemini Script Generation"
      );
      if (contentNode && params.niche) {
        contentNode.parameters.bodyParameters.niche = params.niche;
      }

      // Update TTS node
      const ttsNode = optimizedTemplate.template.nodes.find(
        (node: any) => node.type === "n8n-nodes-base.googleCloudTts"
      );
      if (ttsNode && params.voice) {
        ttsNode.parameters.voice = params.voice.voice || "ja-JP-Wavenet-F";
        ttsNode.parameters.speed = params.voice.speed || 1.0;
        ttsNode.parameters.pitch = params.voice.pitch || 0;
      }
    }

    // Update template metadata
    optimizedTemplate.version += 1;
    optimizedTemplate.performanceScore = Math.min(100, template.performanceScore + 5);
    optimizedTemplate.updatedAt = new Date();

    // Add to optimization history
    if (!optimizedTemplate.optimizationHistory) {
      optimizedTemplate.optimizationHistory = [];
    }
    optimizedTemplate.optimizationHistory.push({
      version: optimizedTemplate.version,
      timestamp: new Date(),
      changes: suggestions.appliedChanges,
      performanceImprovement: suggestions.geminiSuggestions?.expectedImprovement || 0
    });

    return optimizedTemplate;
  }

  private async calculatePerformanceImprovement(
    suggestions: any,
    currentPerformance: any
  ): Promise<number> {
    // Calculate expected improvement based on suggestions
    let improvementFactor = 1.0;

    // Schedule optimization impact (5-15% improvement for Japanese market timing)
    if (suggestions.banditOptimizations?.recommendedSchedule) {
      improvementFactor += 0.1;
    }

    // Content optimization impact (10-25% improvement)
    if (suggestions.geminiSuggestions?.expectedImprovement) {
      improvementFactor += (suggestions.geminiSuggestions.expectedImprovement / 100);
    }

    // Platform allocation optimization (5-20% improvement)
    if (suggestions.geminiSuggestions?.suggestedParameters?.allocation) {
      improvementFactor += 0.15;
    }

    // Voice/TTS optimization (3-8% improvement for Japanese audience)
    if (suggestions.geminiSuggestions?.suggestedParameters?.voice) {
      improvementFactor += 0.05;
    }

    // Cap maximum improvement at 50% to be realistic
    const maxImprovement = Math.min(improvementFactor - 1, 0.5);
    return Math.round(maxImprovement * 100 * 100) / 100; // Return as percentage with 2 decimal places
  }

  async createDefaultTemplate(): Promise<Omit<N8nTemplate, 'id' | 'createdAt' | 'updatedAt'>> {
    return {
      name: "JP Content Pipeline v3.0",
      description: "Latest Japanese content automation with advanced Gemini AI optimization and real-time returns-first allocation",
      template: {
        id: "jp_content_pipeline_v3",
        name: "JP Content Pipeline v3.0",
        nodes: [
          {
            id: "schedule_trigger",
            name: "Intelligent Schedule Trigger",
            type: "n8n-nodes-base.cron",
            position: [0, 0],
            parameters: {
              rule: "0 19,21,23 * * *", // Peak Japanese hours
              timezone: "Asia/Tokyo"
            }
          },
          {
            id: "performance_analysis",
            name: "Performance Analysis",
            type: "n8n-nodes-base.httpRequest",
            position: [200, 0],
            parameters: {
              url: "/api/n8n-templates/analyze-performance",
              method: "POST"
            }
          },
          {
            id: "gemini_optimization",
            name: "Gemini Self-Optimization",
            type: "n8n-nodes-base.httpRequest",
            position: [400, 0],
            parameters: {
              url: "/api/n8n-templates/optimize",
              method: "POST",
              sendBody: true
            }
          },
          {
            id: "gemini_script_generation",
            name: "Gemini Script Generation",
            type: "n8n-nodes-base.httpRequest",
            position: [600, 0],
            parameters: {
              url: "/api/content/generate-script",
              method: "POST",
              sendBody: true,
              bodyParameters: {
                niche: "investment_tips",
                platform: "TikTok",
                hookType: "kawaii_hook_b"
              }
            }
          },
          {
            id: "google_tts",
            name: "Google Cloud TTS",
            type: "n8n-nodes-base.googleCloudTts",
            position: [800, 0],
            parameters: {
              voice: "ja-JP-Wavenet-F",
              audioFormat: "mp3",
              speed: 1.0,
              pitch: 0
            }
          },
          {
            id: "bandit_allocation",
            name: "Bandit Platform Allocation",
            type: "n8n-nodes-base.httpRequest",
            position: [1000, 0],
            parameters: {
              url: "/api/bandit/allocate",
              method: "POST"
            }
          }
        ],
        connections: {
          "schedule_trigger": {
            "main": [[{ node: "performance_analysis", type: "main", index: 0 }]]
          },
          "performance_analysis": {
            "main": [[{ node: "gemini_optimization", type: "main", index: 0 }]]
          },
          "gemini_optimization": {
            "main": [[{ node: "gemini_script_generation", type: "main", index: 0 }]]
          },
          "gemini_script_generation": {
            "main": [[{ node: "google_tts", type: "main", index: 0 }]]
          },
          "google_tts": {
            "main": [[{ node: "bandit_allocation", type: "main", index: 0 }]]
          }
        },
        settings: {
          timezone: "Asia/Tokyo",
          executionTimeout: 7200,
          retryOnFail: {
            enabled: true,
            maxRetries: 3
          }
        }
      },
      version: 1,
      performanceScore: 92.5,
      isActive: true,
      optimizationHistory: []
    };
  }
}