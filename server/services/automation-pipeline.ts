import { IStorage } from '../storage';
import { GeminiService } from './gemini';
import { VideoOrchestrator } from './video-orchestrator';
import { AdSpendManager } from './ad-spend-manager';
import { HumanApprovalWorkflow } from './human-approval-workflow';
import { ComplianceGuardService } from './compliance-guard';
import { RSSIngestionService } from './rss-ingestion';
import { ProfitBanditService } from './profit-bandit';

export interface AutomationTask {
  id: string;
  type: 'content_generation' | 'video_creation' | 'compliance_check' | 'publishing' | 'optimization';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'requires_approval';
  priority: 'low' | 'medium' | 'high' | 'critical';
  streamKey: string;
  data: any;
  dependencies: string[]; // Task IDs this depends on
  estimatedCost: number;
  expectedRevenue: number;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
  approvalRequestId?: string;
}

export interface AutomationMetrics {
  tasksCompleted: number;
  tasksInProgress: number;
  tasksFailed: number;
  totalRevenue: number;
  totalCost: number;
  roas: number;
  automationRate: number; // Percentage of tasks completed without human intervention
  avgProcessingTime: number;
  errorRate: number;
}

export class AutomationPipeline {
  private storage: IStorage;
  private geminiService: GeminiService;
  private videoOrchestrator: VideoOrchestrator;
  private adSpendManager: AdSpendManager;
  private approvalWorkflow: HumanApprovalWorkflow;
  private complianceGuard: ComplianceGuardService;
  private rssService: RSSIngestionService;
  private profitBandit: ProfitBanditService;
  
  private taskQueue: Map<string, AutomationTask> = new Map();
  private isProcessing: boolean = false;
  private maxConcurrentTasks: number = 5;
  private emergencyStopActive: boolean = false;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.geminiService = new GeminiService();
    this.videoOrchestrator = new VideoOrchestrator(storage);
    this.adSpendManager = new AdSpendManager(storage);
    this.approvalWorkflow = new HumanApprovalWorkflow(storage);
    this.complianceGuard = new ComplianceGuardService(storage);
    this.rssService = new RSSIngestionService(storage);
    this.profitBandit = new ProfitBanditService(storage);

    this.startAutomationLoop();
    this.scheduleOptimizationCycles();
  }

  async triggerFullAutomation(): Promise<string[]> {
    if (this.emergencyStopActive) {
      throw new Error('Automation is in emergency stop mode');
    }

    console.log('🚀 Starting full automation pipeline');
    const taskIds: string[] = [];

    try {
      // Get optimal arms from bandit algorithm
      const optimalArms = this.profitBandit.selectOptimalArms(10);
      
      // Process each content stream
      const streamContent = await this.rssService.fetchAllStreams(1);
      
      for (const [streamKey, items] of streamContent.entries()) {
        if (items.length === 0) continue;

        const relevantArm = optimalArms.find(arm => 
          arm.name.toLowerCase().includes(streamKey) || 
          arm.platform.toLowerCase() === 'tiktok' // Default to TikTok for highest allocation
        );

        if (!relevantArm) continue;

        // Create automation tasks for this stream
        const contentTaskId = await this.createContentGenerationTask(streamKey, items[0], relevantArm);
        taskIds.push(contentTaskId);
      }

      await this.storage.createAutomationLog({
        type: 'automation_trigger',
        message: `Full automation triggered with ${taskIds.length} content streams`,
        status: 'success',
        metadata: {
          taskIds,
          streamCount: streamContent.size,
          timestamp: new Date().toISOString()
        }
      });

      return taskIds;

    } catch (error) {
      console.error('❌ Full automation trigger failed:', error);
      await this.storage.createAutomationLog({
        type: 'automation_error',
        message: `Automation trigger failed: ${error}`,
        status: 'error',
        metadata: { error: String(error) }
      });
      throw error;
    }
  }

  private async createContentGenerationTask(streamKey: string, rssItem: any, arm: any): Promise<string> {
    const estimatedCost = 2.0; // Base content generation cost
    const expectedRevenue = arm.profit / Math.max(arm.cost, 1) * estimatedCost; // Based on arm performance

    const task: AutomationTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'content_generation',
      status: 'pending',
      priority: arm.score > 70 ? 'high' : 'medium',
      streamKey,
      data: {
        rssItem,
        arm,
        platform: arm.platform,
        hookType: arm.hookType,
        niche: streamKey
      },
      dependencies: [],
      estimatedCost,
      expectedRevenue,
      createdAt: new Date()
    };

    this.taskQueue.set(task.id, task);
    console.log(`📝 Created content generation task for ${streamKey}: ${task.id}`);
    
    return task.id;
  }

  private async processTask(task: AutomationTask): Promise<void> {
    task.status = 'processing';
    
    try {
      switch (task.type) {
        case 'content_generation':
          await this.processContentGeneration(task);
          break;
        case 'video_creation':
          await this.processVideoCreation(task);
          break;
        case 'compliance_check':
          await this.processComplianceCheck(task);
          break;
        case 'publishing':
          await this.processPublishing(task);
          break;
        case 'optimization':
          await this.processOptimization(task);
          break;
      }

      task.status = 'completed';
      task.completedAt = new Date();
      console.log(`✅ Task completed: ${task.type} for ${task.streamKey}`);

    } catch (error) {
      task.status = 'failed';
      task.error = String(error);
      console.error(`❌ Task failed: ${task.id}`, error);
      
      // Log the failure
      await this.storage.createAutomationLog({
        type: 'task_failure',
        message: `Task failed: ${task.type} - ${error}`,
        status: 'error',
        metadata: {
          taskId: task.id,
          streamKey: task.streamKey,
          error: String(error)
        }
      });
    }
  }

  private async processContentGeneration(task: AutomationTask): Promise<void> {
    const { rssItem, arm, platform, hookType, niche } = task.data;
    
    // Check spend approval first
    const spendDecision = await this.adSpendManager.evaluateSpendDecision(
      arm.id,
      task.estimatedCost,
      task.expectedRevenue,
      platform
    );

    if (spendDecision.approvalRequired && spendDecision.status === 'pending') {
      task.status = 'requires_approval';
      task.approvalRequestId = spendDecision.id;
      
      // Create human approval request
      await this.approvalWorkflow.createApprovalRequest(
        'ad_spend',
        `Content Generation Spend: ${niche}`,
        `Generate content for ${platform} using ${hookType} hook`,
        {
          taskId: task.id,
          spendDecisionId: spendDecision.id,
          expectedROI: task.expectedRevenue / task.estimatedCost
        },
        {
          financial: task.estimatedCost,
          risk: spendDecision.riskLevel,
          platforms: [platform],
          estimatedOutcome: `Projected revenue: $${task.expectedRevenue.toFixed(2)}`
        }
      );
      
      return;
    }

    // Generate content with Gemini
    const contentScript = await this.geminiService.generateJapaneseContent(niche, platform, hookType);
    
    // Check compliance
    const complianceResult = await this.complianceGuard.checkCompliance({
      title: contentScript.title,
      script: contentScript.script,
      platform,
      niche
    });

    if (!complianceResult.isCompliant && complianceResult.severity === 'high') {
      // Try auto-fix
      const fixedContent = await this.complianceGuard.autoFixContent({
        title: contentScript.title,
        script: contentScript.script,
        platform,
        niche
      });

      if (fixedContent.isCompliant) {
        task.data.contentScript = fixedContent.content;
      } else {
        // Requires human approval for compliance override
        task.status = 'requires_approval';
        
        await this.approvalWorkflow.createApprovalRequest(
          'compliance_override',
          `Compliance Issue: ${contentScript.title}`,
          `Content failed compliance check: ${complianceResult.violations.join(', ')}`,
          {
            taskId: task.id,
            originalContent: contentScript,
            complianceResult
          },
          {
            financial: 0,
            risk: 'high',
            platforms: [platform],
            estimatedOutcome: 'Potential platform violation if published'
          }
        );
        
        return;
      }
    } else {
      task.data.contentScript = contentScript;
    }

    // Create video generation task
    await this.createVideoGenerationTask(task);
  }

  private async createVideoGenerationTask(parentTask: AutomationTask): Promise<void> {
    const videoTask: AutomationTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'video_creation',
      status: 'pending',
      priority: parentTask.priority,
      streamKey: parentTask.streamKey,
      data: {
        contentScript: parentTask.data.contentScript,
        platform: parentTask.data.platform,
        parentTaskId: parentTask.id
      },
      dependencies: [parentTask.id],
      estimatedCost: 0.17, // Mochi cost
      expectedRevenue: parentTask.expectedRevenue * 0.8, // Slightly lower due to additional cost
      createdAt: new Date()
    };

    this.taskQueue.set(videoTask.id, videoTask);
  }

  private async processVideoCreation(task: AutomationTask): Promise<void> {
    const { contentScript, platform } = task.data;
    
    // Generate video using orchestrator
    const videoGeneration = await this.videoOrchestrator.generateVideo({
      prompt: contentScript.script,
      provider: 'auto', // Use cost-optimized selection
      aspect_ratio: platform.toLowerCase() === 'tiktok' ? '9:16' : '16:9'
    });

    task.data.videoGeneration = videoGeneration;
    
    // Create publishing task when video is ready
    if (videoGeneration.status === 'completed') {
      await this.createPublishingTask(task);
    }
  }

  private async createPublishingTask(parentTask: AutomationTask): Promise<void> {
    const publishTask: AutomationTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'publishing',
      status: 'pending',
      priority: parentTask.priority,
      streamKey: parentTask.streamKey,
      data: {
        contentScript: parentTask.data.contentScript,
        videoGeneration: parentTask.data.videoGeneration,
        platform: parentTask.data.platform,
        parentTaskId: parentTask.id
      },
      dependencies: [parentTask.id],
      estimatedCost: 0, // No cost for publishing
      expectedRevenue: parentTask.expectedRevenue,
      createdAt: new Date()
    };

    this.taskQueue.set(publishTask.id, publishTask);
  }

  private async processComplianceCheck(task: AutomationTask): Promise<void> {
    // Implementation for standalone compliance checks
    console.log('🔍 Processing compliance check task');
  }

  private async processPublishing(task: AutomationTask): Promise<void> {
    const { contentScript, videoGeneration, platform } = task.data;
    
    // In a real implementation, this would publish to the actual platform
    console.log(`📢 Publishing content to ${platform}: ${contentScript.title}`);
    
    // Create content record
    await this.storage.createContent({
      title: contentScript.title,
      platform,
      status: 'published',
      videoUrl: videoGeneration.videoUrl,
      thumbnailUrl: videoGeneration.thumbnailUrl,
      armId: task.data.armId
    });

    // Update bandit arm with results
    await this.profitBandit.updateArmProfit(
      task.data.armId || 'default',
      task.expectedRevenue,
      task.estimatedCost + 0.17, // Content + video cost
      1, // 1 click
      1  // 1 conversion (optimistic)
    );
  }

  private async processOptimization(task: AutomationTask): Promise<void> {
    console.log('📊 Processing optimization task');
    
    // Run profit optimization
    await this.profitBandit.rebalanceAllocations();
    await this.profitBandit.pruneNegativeArms();
  }

  private startAutomationLoop(): void {
    setInterval(async () => {
      if (this.isProcessing || this.emergencyStopActive) return;
      
      this.isProcessing = true;
      
      try {
        const pendingTasks = Array.from(this.taskQueue.values())
          .filter(task => task.status === 'pending')
          .filter(task => this.areDependenciesMet(task))
          .sort((a, b) => {
            const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          })
          .slice(0, this.maxConcurrentTasks);

        const processingPromises = pendingTasks.map(task => this.processTask(task));
        await Promise.allSettled(processingPromises);
        
        // Clean up completed tasks
        this.cleanupCompletedTasks();
        
      } catch (error) {
        console.error('❌ Automation loop error:', error);
      } finally {
        this.isProcessing = false;
      }
    }, 30000); // Run every 30 seconds
  }

  private areDependenciesMet(task: AutomationTask): boolean {
    return task.dependencies.every(depId => {
      const depTask = this.taskQueue.get(depId);
      return depTask?.status === 'completed';
    });
  }

  private cleanupCompletedTasks(): void {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [id, task] of this.taskQueue.entries()) {
      if ((task.status === 'completed' || task.status === 'failed') && 
          task.createdAt < cutoffTime) {
        this.taskQueue.delete(id);
      }
    }
  }

  private scheduleOptimizationCycles(): void {
    // Run optimization every 2 hours
    setInterval(async () => {
      if (this.emergencyStopActive) return;
      
      const optimizationTask: AutomationTask = {
        id: `opt_${Date.now()}`,
        type: 'optimization',
        status: 'pending',
        priority: 'medium',
        streamKey: 'system',
        data: {},
        dependencies: [],
        estimatedCost: 0,
        expectedRevenue: 0,
        createdAt: new Date()
      };

      this.taskQueue.set(optimizationTask.id, optimizationTask);
    }, 2 * 60 * 60 * 1000); // 2 hours
  }

  async emergencyStop(reason: string): Promise<void> {
    this.emergencyStopActive = true;
    
    // Stop all pending tasks
    for (const [id, task] of this.taskQueue.entries()) {
      if (task.status === 'pending' || task.status === 'processing') {
        task.status = 'failed';
        task.error = `Emergency stop: ${reason}`;
      }
    }

    // Trigger ad spend emergency stop
    await this.adSpendManager.emergencyStop(reason);
    
    console.log(`🚨 AUTOMATION EMERGENCY STOP: ${reason}`);
    
    await this.storage.createAutomationLog({
      type: 'emergency_stop',
      message: `Automation emergency stop: ${reason}`,
      status: 'warning',
      metadata: {
        reason,
        activeTasks: this.taskQueue.size,
        timestamp: new Date().toISOString()
      }
    });
  }

  resumeAutomation(): void {
    this.emergencyStopActive = false;
    console.log('🔄 Automation resumed');
  }

  getMetrics(): AutomationMetrics {
    const tasks = Array.from(this.taskQueue.values());
    const completed = tasks.filter(t => t.status === 'completed');
    const failed = tasks.filter(t => t.status === 'failed');
    const inProgress = tasks.filter(t => t.status === 'processing');
    
    const totalRevenue = completed.reduce((sum, t) => sum + t.expectedRevenue, 0);
    const totalCost = completed.reduce((sum, t) => sum + t.estimatedCost, 0);
    
    const automatedTasks = completed.filter(t => !t.approvalRequestId);
    const automationRate = completed.length > 0 ? (automatedTasks.length / completed.length) * 100 : 0;
    
    const avgProcessingTime = completed.reduce((sum, t) => {
      if (t.completedAt) {
        return sum + (t.completedAt.getTime() - t.createdAt.getTime());
      }
      return sum;
    }, 0) / Math.max(completed.length, 1);

    return {
      tasksCompleted: completed.length,
      tasksInProgress: inProgress.length,
      tasksFailed: failed.length,
      totalRevenue,
      totalCost,
      roas: totalCost > 0 ? totalRevenue / totalCost : 0,
      automationRate,
      avgProcessingTime: avgProcessingTime / 1000 / 60, // Convert to minutes
      errorRate: tasks.length > 0 ? (failed.length / tasks.length) * 100 : 0
    };
  }

  getTasks(): AutomationTask[] {
    return Array.from(this.taskQueue.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getTaskById(id: string): AutomationTask | undefined {
    return this.taskQueue.get(id);
  }
}