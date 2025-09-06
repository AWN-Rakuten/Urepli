export interface N8nWorkflowTemplate {
  id: string;
  name: string;
  nodes: N8nNode[];
  connections: Record<string, any>;
  settings: Record<string, any>;
  parameters: WorkflowParameters;
}

export interface N8nNode {
  id: string;
  name: string;
  type: string;
  position: [number, number];
  parameters: Record<string, any>;
}

export interface WorkflowParameters {
  scheduleInterval: string;
  contentNiche: string;
  platformAllocation: {
    tiktok: number;
    instagram: number;
  };
  voiceSettings: {
    voice: string;
    speed: number;
    pitch: number;
  };
  optimizationSettings: {
    banditWindowMinutes: number;
    profitThreshold: number;
    reallocationTrigger: number;
  };
}

export class WorkflowService {
  private defaultTemplate: N8nWorkflowTemplate;

  constructor() {
    this.defaultTemplate = this.createDefaultTemplate();
  }

  private createDefaultTemplate(): N8nWorkflowTemplate {
    return {
      id: "jp_content_pipeline",
      name: "JP Content Pipeline",
      nodes: [
        {
          id: "schedule_trigger",
          name: "Schedule Trigger",
          type: "n8n-nodes-base.cron",
          position: [0, 0],
          parameters: {
            rule: {
              interval: [{ field: "hours", value: 2 }]
            }
          }
        },
        {
          id: "gemini_script_generation",
          name: "Gemini Script Generation",
          type: "n8n-nodes-base.httpRequest",
          position: [200, 0],
          parameters: {
            url: "/api/content/generate-script",
            method: "POST",
            sendBody: true,
            bodyParameters: {
              niche: "={{ $node.workflow.parameters.contentNiche }}",
              platform: "={{ $node.workflow.parameters.currentPlatform }}",
              hookType: "={{ $node.workflow.parameters.selectedHook }}"
            }
          }
        },
        {
          id: "google_tts",
          name: "Google Cloud TTS",
          type: "n8n-nodes-base.googleCloudTts",
          position: [400, 0],
          parameters: {
            voice: "ja-JP-Wavenet-F",
            audioFormat: "mp3",
            speed: 1.0,
            pitch: 0
          }
        },
        {
          id: "video_assembly",
          name: "Video Assembly",
          type: "n8n-nodes-base.httpRequest",
          position: [600, 0],
          parameters: {
            url: "/api/content/assemble-video",
            method: "POST"
          }
        },
        {
          id: "cloud_storage_upload",
          name: "Cloud Storage Upload",
          type: "n8n-nodes-base.googleCloudStorage",
          position: [800, 0],
          parameters: {
            operation: "upload",
            bucketName: "={{ $node.workflow.parameters.storageBucket }}"
          }
        },
        {
          id: "platform_distribution",
          name: "Platform Distribution",
          type: "n8n-nodes-base.merge",
          position: [1000, 0],
          parameters: {}
        },
        {
          id: "tiktok_publish",
          name: "TikTok Publish",
          type: "n8n-nodes-base.httpRequest",
          position: [1200, -100],
          parameters: {
            url: "/api/social/publish/tiktok",
            method: "POST"
          }
        },
        {
          id: "instagram_publish",
          name: "Instagram Publish", 
          type: "n8n-nodes-base.httpRequest",
          position: [1200, 100],
          parameters: {
            url: "/api/social/publish/instagram", 
            method: "POST"
          }
        },
        {
          id: "performance_tracking",
          name: "Performance Tracking",
          type: "n8n-nodes-base.httpRequest",
          position: [1400, 0],
          parameters: {
            url: "/api/analytics/track-performance",
            method: "POST"
          }
        },
        {
          id: "bandit_optimization",
          name: "Bandit Optimization",
          type: "n8n-nodes-base.httpRequest",
          position: [1600, 0],
          parameters: {
            url: "/api/bandit/update-allocations",
            method: "POST"
          }
        }
      ],
      connections: {
        "schedule_trigger": {
          "main": [[{ node: "gemini_script_generation", type: "main", index: 0 }]]
        },
        "gemini_script_generation": {
          "main": [[{ node: "google_tts", type: "main", index: 0 }]]
        },
        "google_tts": {
          "main": [[{ node: "video_assembly", type: "main", index: 0 }]]
        },
        "video_assembly": {
          "main": [[{ node: "cloud_storage_upload", type: "main", index: 0 }]]
        },
        "cloud_storage_upload": {
          "main": [[{ node: "platform_distribution", type: "main", index: 0 }]]
        },
        "platform_distribution": {
          "main": [
            [{ node: "tiktok_publish", type: "main", index: 0 }],
            [{ node: "instagram_publish", type: "main", index: 0 }]
          ]
        },
        "tiktok_publish": {
          "main": [[{ node: "performance_tracking", type: "main", index: 0 }]]
        },
        "instagram_publish": {
          "main": [[{ node: "performance_tracking", type: "main", index: 0 }]]
        },
        "performance_tracking": {
          "main": [[{ node: "bandit_optimization", type: "main", index: 0 }]]
        }
      },
      settings: {
        timezone: "Asia/Tokyo",
        executionTimeout: 3600
      },
      parameters: {
        scheduleInterval: "0 */2 * * *",
        contentNiche: "investment_tips",
        platformAllocation: {
          tiktok: 70,
          instagram: 30
        },
        voiceSettings: {
          voice: "ja-JP-Wavenet-F",
          speed: 1.0,
          pitch: 0
        },
        optimizationSettings: {
          banditWindowMinutes: 60,
          profitThreshold: 1000,
          reallocationTrigger: 5
        }
      }
    };
  }

  getDefaultTemplate(): N8nWorkflowTemplate {
    return this.defaultTemplate;
  }

  optimizeWorkflowParameters(
    template: N8nWorkflowTemplate, 
    optimizations: any
  ): N8nWorkflowTemplate {
    const optimizedTemplate = JSON.parse(JSON.stringify(template));
    
    // Apply Gemini-suggested optimizations
    if (optimizations.suggestedParameters) {
      Object.keys(optimizations.suggestedParameters).forEach(paramKey => {
        if (paramKey.includes('schedule')) {
          optimizedTemplate.parameters.scheduleInterval = optimizations.suggestedParameters[paramKey];
        }
        if (paramKey.includes('allocation')) {
          const allocation = optimizations.suggestedParameters[paramKey];
          optimizedTemplate.parameters.platformAllocation = allocation;
        }
        if (paramKey.includes('voice')) {
          optimizedTemplate.parameters.voiceSettings = {
            ...optimizedTemplate.parameters.voiceSettings,
            ...optimizations.suggestedParameters[paramKey]
          };
        }
      });
    }

    return optimizedTemplate;
  }

  async executeWorkflow(template: N8nWorkflowTemplate): Promise<{ 
    success: boolean; 
    executionId: string; 
    logs: string[] 
  }> {
    const executionId = `exec_${Date.now()}`;
    const logs: string[] = [];

    try {
      logs.push(`Starting workflow execution: ${template.name}`);
      
      // Simulate workflow execution steps
      for (const node of template.nodes) {
        logs.push(`Executing node: ${node.name}`);
        await this.simulateNodeExecution(node);
        logs.push(`Completed node: ${node.name}`);
      }

      logs.push(`Workflow execution completed successfully`);
      return { success: true, executionId, logs };
    } catch (error) {
      logs.push(`Workflow execution failed: ${error}`);
      return { success: false, executionId, logs };
    }
  }

  private async simulateNodeExecution(node: N8nNode): Promise<void> {
    // Simulate processing time based on node type
    const processingTime = this.getNodeProcessingTime(node.type);
    await new Promise(resolve => setTimeout(resolve, processingTime));
  }

  private getNodeProcessingTime(nodeType: string): number {
    const timings: Record<string, number> = {
      'n8n-nodes-base.cron': 100,
      'n8n-nodes-base.httpRequest': 500,
      'n8n-nodes-base.googleCloudTts': 2000,
      'n8n-nodes-base.googleCloudStorage': 1000,
      'n8n-nodes-base.merge': 200,
    };
    return timings[nodeType] || 500;
  }
}
