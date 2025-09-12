import { EventEmitter } from 'events';
import { SmartphoneDeviceManager, SmartphoneDevice } from './smartphone-device-manager';
import { MobileContentWatcher, WatchingRequest, ContentWatchingSession } from './mobile-content-watcher';
import { MultiAccountPoster } from './multi-account-poster';
import { IStorage } from '../storage';

export interface SmartphoneWorkflow {
  id: string;
  name: string;
  description: string;
  devices: string[]; // device IDs
  platforms: Array<'tiktok' | 'instagram' | 'youtube'>;
  schedule: {
    startTime: Date;
    endTime: Date;
    repeatDaily: boolean;
    daysOfWeek?: number[]; // 0-6, Sunday = 0
  };
  activities: Array<{
    type: 'watch' | 'post' | 'engage' | 'wait';
    duration: number; // minutes
    parameters: any;
    parallel?: boolean; // run in parallel across devices
  }>;
  status: 'scheduled' | 'running' | 'paused' | 'completed' | 'failed';
  statistics: {
    totalRuns: number;
    successfulRuns: number;
    lastRun: Date | null;
    nextRun: Date | null;
    totalWatchTime: number;
    totalPosts: number;
    totalEngagements: number;
  };
}

export interface CoordinationStrategy {
  name: string;
  description: string;
  deviceAllocation: 'round_robin' | 'load_balanced' | 'platform_specialized' | 'random';
  contentStrategy: 'synchronized' | 'diversified' | 'trending_focused' | 'niche_focused';
  timing: 'staggered' | 'simultaneous' | 'peak_hours' | 'off_peak';
  engagement: 'conservative' | 'moderate' | 'aggressive';
}

/**
 * Coordinates multiple smartphone devices for comprehensive social media automation
 * Manages complex workflows across 10 devices with intelligent orchestration
 */
export class SmartphoneCoordinator extends EventEmitter {
  private deviceManager: SmartphoneDeviceManager;
  private contentWatcher: MobileContentWatcher;
  private multiAccountPoster: MultiAccountPoster;
  private storage: IStorage;
  
  private activeWorkflows: Map<string, SmartphoneWorkflow> = new Map();
  private scheduledWorkflows: Map<string, NodeJS.Timeout> = new Map();
  private coordinationStrategies: Map<string, CoordinationStrategy> = new Map();
  private deviceQueues: Map<string, Array<{ activity: any; timestamp: Date }>> = new Map();

  constructor(
    deviceManager: SmartphoneDeviceManager,
    contentWatcher: MobileContentWatcher,
    multiAccountPoster: MultiAccountPoster,
    storage: IStorage
  ) {
    super();
    this.deviceManager = deviceManager;
    this.contentWatcher = contentWatcher;
    this.multiAccountPoster = multiAccountPoster;
    this.storage = storage;
    
    this.initializeCoordinationStrategies();
    this.loadWorkflows();
    this.startWorkflowScheduler();
  }

  /**
   * Initialize predefined coordination strategies
   */
  private initializeCoordinationStrategies(): void {
    // Japanese Market Focused Strategy
    this.coordinationStrategies.set('japanese_market_focus', {
      name: 'Japanese Market Focus',
      description: 'Optimized for Japanese social media algorithms and user behavior',
      deviceAllocation: 'platform_specialized',
      contentStrategy: 'trending_focused',
      timing: 'peak_hours',
      engagement: 'moderate'
    });

    // Content Discovery Strategy
    this.coordinationStrategies.set('content_discovery', {
      name: 'Content Discovery',
      description: 'Focus on discovering trending content and viral patterns',
      deviceAllocation: 'load_balanced',
      contentStrategy: 'diversified',
      timing: 'staggered',
      engagement: 'conservative'
    });

    // Aggressive Growth Strategy
    this.coordinationStrategies.set('aggressive_growth', {
      name: 'Aggressive Growth',
      description: 'Maximum engagement and posting for rapid account growth',
      deviceAllocation: 'round_robin',
      contentStrategy: 'synchronized',
      timing: 'simultaneous',
      engagement: 'aggressive'
    });

    // Stealth Operation Strategy
    this.coordinationStrategies.set('stealth_operation', {
      name: 'Stealth Operation',
      description: 'Low-profile operation to avoid detection',
      deviceAllocation: 'random',
      contentStrategy: 'niche_focused',
      timing: 'off_peak',
      engagement: 'conservative'
    });
  }

  /**
   * Create and schedule a new smartphone workflow
   */
  async createWorkflow(workflowConfig: Partial<SmartphoneWorkflow> & {
    name: string;
    activities: SmartphoneWorkflow['activities'];
  }): Promise<string> {
    const workflowId = this.generateWorkflowId();
    
    const workflow: SmartphoneWorkflow = {
      id: workflowId,
      name: workflowConfig.name,
      description: workflowConfig.description || '',
      devices: workflowConfig.devices || this.selectOptimalDevices(5), // Default to 5 devices
      platforms: workflowConfig.platforms || ['tiktok', 'instagram', 'youtube'],
      schedule: workflowConfig.schedule || {
        startTime: new Date(),
        endTime: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours from now
        repeatDaily: false
      },
      activities: workflowConfig.activities,
      status: 'scheduled',
      statistics: {
        totalRuns: 0,
        successfulRuns: 0,
        lastRun: null,
        nextRun: workflowConfig.schedule?.startTime || new Date(),
        totalWatchTime: 0,
        totalPosts: 0,
        totalEngagements: 0
      }
    };

    this.activeWorkflows.set(workflowId, workflow);
    this.scheduleWorkflow(workflow);
    
    await this.saveWorkflow(workflow);
    this.emit('workflowCreated', workflow);

    return workflowId;
  }

  /**
   * Start content watching workflow across multiple devices
   */
  async startContentWatchingWorkflow(config: {
    devices?: string[];
    platforms: Array<'tiktok' | 'instagram' | 'youtube'>;
    duration: number; // total duration in minutes
    strategy: string;
    profiles: { [platform: string]: string }; // profile names for each platform
  }): Promise<{ success: boolean; workflowId?: string; sessions?: string[]; error?: string }> {
    try {
      const strategy = this.coordinationStrategies.get(config.strategy);
      if (!strategy) {
        return { success: false, error: 'Invalid coordination strategy' };
      }

      const devices = config.devices || this.selectDevicesForStrategy(strategy, config.platforms.length * 2);
      const sessions: string[] = [];

      // Distribute platforms across devices based on strategy
      const platformAssignments = this.assignPlatformsToDevices(devices, config.platforms, strategy);

      for (const assignment of platformAssignments) {
        const watchingRequest: WatchingRequest = {
          platform: assignment.platform,
          duration: config.duration,
          profile: this.contentWatcher.getWatchingProfile(config.profiles[assignment.platform]) || 
                   this.contentWatcher.getWatchingProfile('japanese_business')!,
          devicePreference: assignment.deviceId,
          priority: 'medium'
        };

        // Add timing strategy
        if (strategy.timing === 'staggered') {
          const delay = sessions.length * 30000; // 30 second stagger
          setTimeout(async () => {
            const result = await this.contentWatcher.startWatchingSession(watchingRequest);
            if (result.success && result.sessionId) {
              sessions.push(result.sessionId);
            }
          }, delay);
        } else {
          const result = await this.contentWatcher.startWatchingSession(watchingRequest);
          if (result.success && result.sessionId) {
            sessions.push(result.sessionId);
          }
        }
      }

      const workflowId = await this.createWorkflow({
        name: `Content Watching - ${strategy.name}`,
        description: `Automated content watching using ${strategy.name} strategy`,
        devices,
        platforms: config.platforms,
        activities: [{
          type: 'watch',
          duration: config.duration,
          parameters: { sessions, strategy: config.strategy }
        }]
      });

      return {
        success: true,
        workflowId,
        sessions
      };

    } catch (error) {
      console.error('Failed to start content watching workflow:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Coordinate content posting across multiple accounts and devices
   */
  async coordinateContentPosting(config: {
    content: {
      videoUrl: string;
      thumbnailUrl?: string;
      caption: string;
      hashtags: string[];
    };
    platforms: Array<'tiktok' | 'instagram' | 'youtube'>;
    accounts: Array<{ platform: string; accountId: string }>;
    strategy: string;
    timing?: 'immediate' | 'staggered' | 'optimal';
  }): Promise<{
    success: boolean;
    results: Array<{ platform: string; accountId: string; success: boolean; postUrl?: string; error?: string }>;
    workflowId?: string;
  }> {
    try {
      const strategy = this.coordinationStrategies.get(config.strategy);
      if (!strategy) {
        throw new Error('Invalid coordination strategy');
      }

      const results: Array<{ platform: string; accountId: string; success: boolean; postUrl?: string; error?: string }> = [];

      // Group accounts by platform
      const accountsByPlatform = config.accounts.reduce((acc, account) => {
        if (!acc[account.platform]) acc[account.platform] = [];
        acc[account.platform].push(account);
        return acc;
      }, {} as { [platform: string]: typeof config.accounts });

      // Process each platform
      for (const platform of config.platforms) {
        const platformAccounts = accountsByPlatform[platform] || [];
        
        for (const account of platformAccounts) {
          try {
            let delay = 0;
            
            // Apply timing strategy
            switch (config.timing || strategy.timing) {
              case 'staggered':
                delay = results.length * this.getStaggerDelay(strategy);
                break;
              case 'optimal':
                delay = await this.calculateOptimalPostingDelay(platform, account.accountId);
                break;
              // 'immediate' has no delay
            }

            if (delay > 0) {
              await this.delay(delay);
            }

            const postResult = await this.multiAccountPoster.postContent({
              content: null, // Will be constructed from config
              platform,
              videoUrl: config.content.videoUrl,
              thumbnailUrl: config.content.thumbnailUrl,
              caption: config.content.caption,
              tags: config.content.hashtags
            });

            results.push({
              platform,
              accountId: account.accountId,
              success: postResult.success,
              postUrl: postResult.postUrl,
              error: postResult.error
            });

          } catch (error) {
            results.push({
              platform,
              accountId: account.accountId,
              success: false,
              error: error.message
            });
          }
        }
      }

      // Create workflow for tracking
      const workflowId = await this.createWorkflow({
        name: 'Content Posting Coordination',
        description: `Multi-platform posting using ${strategy.name} strategy`,
        platforms: config.platforms,
        activities: [{
          type: 'post',
          duration: 30, // Estimated duration
          parameters: { content: config.content, results }
        }]
      });

      return {
        success: results.some(r => r.success),
        results,
        workflowId
      };

    } catch (error) {
      console.error('Failed to coordinate content posting:', error);
      return {
        success: false,
        results: [],
        error: error.message
      };
    }
  }

  /**
   * Execute comprehensive automation workflow (watching + posting + engagement)
   */
  async executeComprehensiveWorkflow(config: {
    name: string;
    strategy: string;
    duration: number; // total workflow duration in minutes
    phases: Array<{
      type: 'watch' | 'post' | 'engage' | 'analyze';
      duration: number;
      platforms: Array<'tiktok' | 'instagram' | 'youtube'>;
      parameters: any;
    }>;
    devices?: string[];
  }): Promise<{ success: boolean; workflowId?: string; error?: string }> {
    try {
      const strategy = this.coordinationStrategies.get(config.strategy);
      if (!strategy) {
        return { success: false, error: 'Invalid coordination strategy' };
      }

      const devices = config.devices || this.selectDevicesForStrategy(strategy, 8); // Use 8 devices
      const workflowId = this.generateWorkflowId();

      const workflow: SmartphoneWorkflow = {
        id: workflowId,
        name: config.name,
        description: `Comprehensive automation workflow using ${strategy.name} strategy`,
        devices,
        platforms: [...new Set(config.phases.flatMap(p => p.platforms))],
        schedule: {
          startTime: new Date(),
          endTime: new Date(Date.now() + config.duration * 60 * 1000),
          repeatDaily: false
        },
        activities: config.phases.map(phase => ({
          type: phase.type,
          duration: phase.duration,
          parameters: { ...phase.parameters, platforms: phase.platforms },
          parallel: strategy.deviceAllocation !== 'round_robin'
        })),
        status: 'running',
        statistics: {
          totalRuns: 0,
          successfulRuns: 0,
          lastRun: new Date(),
          nextRun: null,
          totalWatchTime: 0,
          totalPosts: 0,
          totalEngagements: 0
        }
      };

      this.activeWorkflows.set(workflowId, workflow);
      
      // Execute workflow phases
      this.executeWorkflowPhases(workflow);

      await this.saveWorkflow(workflow);
      this.emit('comprehensiveWorkflowStarted', workflow);

      return { success: true, workflowId };

    } catch (error) {
      console.error('Failed to execute comprehensive workflow:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute workflow phases sequentially or in parallel
   */
  private async executeWorkflowPhases(workflow: SmartphoneWorkflow): Promise<void> {
    try {
      for (const [index, activity] of workflow.activities.entries()) {
        if (workflow.status !== 'running') break;

        console.log(`Executing phase ${index + 1}: ${activity.type}`);
        
        switch (activity.type) {
          case 'watch':
            await this.executeWatchingPhase(workflow, activity);
            break;
          case 'post':
            await this.executePostingPhase(workflow, activity);
            break;
          case 'engage':
            await this.executeEngagementPhase(workflow, activity);
            break;
          case 'wait':
            await this.delay(activity.duration * 60 * 1000);
            break;
          case 'analyze':
            await this.executeAnalysisPhase(workflow, activity);
            break;
        }

        // Break between phases
        if (index < workflow.activities.length - 1) {
          await this.delay(30000); // 30 second break between phases
        }
      }

      workflow.status = 'completed';
      workflow.statistics.successfulRuns++;
      this.emit('workflowCompleted', workflow);

    } catch (error) {
      console.error(`Workflow ${workflow.id} failed:`, error);
      workflow.status = 'failed';
      this.emit('workflowFailed', { workflow, error });
    } finally {
      await this.saveWorkflow(workflow);
    }
  }

  /**
   * Execute watching phase of workflow
   */
  private async executeWatchingPhase(workflow: SmartphoneWorkflow, activity: any): Promise<void> {
    const platforms = activity.parameters.platforms || workflow.platforms;
    const devicesPerPlatform = Math.ceil(workflow.devices.length / platforms.length);

    const watchingSessions: string[] = [];

    for (let i = 0; i < platforms.length; i++) {
      const platform = platforms[i];
      const assignedDevices = workflow.devices.slice(i * devicesPerPlatform, (i + 1) * devicesPerPlatform);

      for (const deviceId of assignedDevices) {
        const watchingRequest: WatchingRequest = {
          platform,
          duration: activity.duration,
          profile: this.contentWatcher.getWatchingProfile('japanese_business')!,
          devicePreference: deviceId,
          priority: 'medium'
        };

        const result = await this.contentWatcher.startWatchingSession(watchingRequest);
        if (result.success && result.sessionId) {
          watchingSessions.push(result.sessionId);
        }
      }
    }

    // Wait for all sessions to complete
    await this.delay(activity.duration * 60 * 1000);
    
    // Update workflow statistics
    for (const sessionId of watchingSessions) {
      const session = this.contentWatcher.getSession(sessionId);
      if (session) {
        workflow.statistics.totalWatchTime += session.statistics.totalWatchTime;
        workflow.statistics.totalEngagements += 
          Object.values(session.statistics.engagements).reduce((sum, val) => sum + val, 0);
      }
    }
  }

  /**
   * Execute posting phase of workflow
   */
  private async executePostingPhase(workflow: SmartphoneWorkflow, activity: any): Promise<void> {
    const platforms = activity.parameters.platforms || workflow.platforms;
    const content = activity.parameters.content;

    if (!content) {
      console.warn('No content specified for posting phase');
      return;
    }

    let postsCount = 0;

    for (const platform of platforms) {
      try {
        const result = await this.multiAccountPoster.postContent({
          content: null,
          platform,
          videoUrl: content.videoUrl,
          thumbnailUrl: content.thumbnailUrl,
          caption: content.caption,
          tags: content.hashtags || []
        });

        if (result.success) {
          postsCount++;
        }

        // Stagger posts
        await this.delay(this.getStaggerDelay({ timing: 'staggered' } as CoordinationStrategy));

      } catch (error) {
        console.error(`Failed to post to ${platform}:`, error);
      }
    }

    workflow.statistics.totalPosts += postsCount;
  }

  /**
   * Execute engagement phase of workflow
   */
  private async executeEngagementPhase(workflow: SmartphoneWorkflow, activity: any): Promise<void> {
    // Implementation for engagement automation
    // This would involve coordinating likes, follows, comments across devices
    console.log(`Executing engagement phase for ${activity.duration} minutes`);
    
    // Placeholder implementation
    await this.delay(activity.duration * 60 * 1000);
  }

  /**
   * Execute analysis phase of workflow
   */
  private async executeAnalysisPhase(workflow: SmartphoneWorkflow, activity: any): Promise<void> {
    // Generate and save analytics report
    const report = this.generateWorkflowReport(workflow);
    
    if (this.storage.saveWorkflowReport) {
      await this.storage.saveWorkflowReport(workflow.id, report);
    }

    this.emit('workflowAnalysisCompleted', { workflow, report });
  }

  /**
   * Helper methods
   */
  private selectOptimalDevices(count: number): string[] {
    const allDevices = this.deviceManager.getAllDevices();
    const availableDevices = allDevices.filter(device => 
      device.status === 'available' && 
      device.healthMetrics.batteryLevel > 30
    );

    // Sort by performance score
    availableDevices.sort((a, b) => {
      const scoreA = this.calculateDeviceScore(a);
      const scoreB = this.calculateDeviceScore(b);
      return scoreB - scoreA;
    });

    return availableDevices.slice(0, count).map(device => device.id);
  }

  private selectDevicesForStrategy(strategy: CoordinationStrategy, count: number): string[] {
    const allDevices = this.deviceManager.getAllDevices();
    let selectedDevices: SmartphoneDevice[] = [];

    switch (strategy.deviceAllocation) {
      case 'load_balanced':
        selectedDevices = allDevices
          .filter(d => d.status === 'available')
          .sort((a, b) => this.calculateDeviceLoad(a) - this.calculateDeviceLoad(b))
          .slice(0, count);
        break;

      case 'platform_specialized':
        // Select devices based on their assigned accounts
        selectedDevices = allDevices
          .filter(d => d.status === 'available' && d.accountAssignments.length > 0)
          .slice(0, count);
        break;

      case 'random':
        const availableDevices = allDevices.filter(d => d.status === 'available');
        selectedDevices = this.shuffleArray(availableDevices).slice(0, count);
        break;

      default: // round_robin
        selectedDevices = allDevices
          .filter(d => d.status === 'available')
          .slice(0, count);
        break;
    }

    return selectedDevices.map(d => d.id);
  }

  private assignPlatformsToDevices(
    deviceIds: string[], 
    platforms: Array<'tiktok' | 'instagram' | 'youtube'>, 
    strategy: CoordinationStrategy
  ): Array<{ deviceId: string; platform: 'tiktok' | 'instagram' | 'youtube' }> {
    const assignments: Array<{ deviceId: string; platform: 'tiktok' | 'instagram' | 'youtube' }> = [];
    
    if (strategy.deviceAllocation === 'platform_specialized') {
      // Assign devices based on their account assignments
      for (const platform of platforms) {
        const specializedDevices = deviceIds.filter(deviceId => {
          const device = this.deviceManager.getDevice(deviceId);
          return device?.accountAssignments.some(assignment => assignment.platform === platform);
        });

        if (specializedDevices.length > 0) {
          assignments.push({ deviceId: specializedDevices[0], platform });
        } else {
          // Fallback to any available device
          const availableDevice = deviceIds.find(id => 
            !assignments.some(a => a.deviceId === id)
          );
          if (availableDevice) {
            assignments.push({ deviceId: availableDevice, platform });
          }
        }
      }
    } else {
      // Round-robin assignment
      platforms.forEach((platform, index) => {
        const deviceIndex = index % deviceIds.length;
        assignments.push({ deviceId: deviceIds[deviceIndex], platform });
      });
    }

    return assignments;
  }

  private calculateDeviceScore(device: SmartphoneDevice): number {
    return (
      device.healthMetrics.batteryLevel * 0.3 +
      device.statistics.successRate * 0.4 +
      (100 - device.healthMetrics.temperature) * 0.2 +
      (100 - device.healthMetrics.cpuUsage) * 0.1
    );
  }

  private calculateDeviceLoad(device: SmartphoneDevice): number {
    return device.healthMetrics.cpuUsage + device.healthMetrics.memoryUsage;
  }

  private getStaggerDelay(strategy: CoordinationStrategy): number {
    switch (strategy.timing) {
      case 'staggered':
        return Math.random() * 60000 + 30000; // 30-90 seconds
      case 'off_peak':
        return Math.random() * 300000 + 120000; // 2-7 minutes
      default:
        return Math.random() * 30000 + 10000; // 10-40 seconds
    }
  }

  private async calculateOptimalPostingDelay(platform: string, accountId: string): Promise<number> {
    // This would analyze posting patterns and audience activity
    // For now, return a basic calculation
    const baseDelay = {
      tiktok: 300000,    // 5 minutes
      instagram: 600000,  // 10 minutes
      youtube: 1800000   // 30 minutes
    }[platform] || 300000;

    return baseDelay + Math.random() * 300000; // Add 0-5 minutes random
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateWorkflowId(): string {
    return `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateWorkflowReport(workflow: SmartphoneWorkflow): any {
    return {
      workflowId: workflow.id,
      name: workflow.name,
      duration: Date.now() - workflow.statistics.lastRun?.getTime() || 0,
      statistics: workflow.statistics,
      deviceCount: workflow.devices.length,
      platformCount: workflow.platforms.length,
      activityCount: workflow.activities.length,
      generatedAt: new Date()
    };
  }

  /**
   * Workflow management methods
   */
  async pauseWorkflow(workflowId: string): Promise<boolean> {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) return false;

    workflow.status = 'paused';
    this.emit('workflowPaused', workflow);
    return true;
  }

  async resumeWorkflow(workflowId: string): Promise<boolean> {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) return false;

    workflow.status = 'running';
    this.emit('workflowResumed', workflow);
    return true;
  }

  async stopWorkflow(workflowId: string): Promise<boolean> {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) return false;

    workflow.status = 'completed';
    this.activeWorkflows.delete(workflowId);
    
    const scheduledTimeout = this.scheduledWorkflows.get(workflowId);
    if (scheduledTimeout) {
      clearTimeout(scheduledTimeout);
      this.scheduledWorkflows.delete(workflowId);
    }

    this.emit('workflowStopped', workflow);
    return true;
  }

  getWorkflow(workflowId: string): SmartphoneWorkflow | null {
    return this.activeWorkflows.get(workflowId) || null;
  }

  getAllWorkflows(): SmartphoneWorkflow[] {
    return Array.from(this.activeWorkflows.values());
  }

  getCoordinationStrategy(strategyName: string): CoordinationStrategy | null {
    return this.coordinationStrategies.get(strategyName) || null;
  }

  getAllCoordinationStrategies(): CoordinationStrategy[] {
    return Array.from(this.coordinationStrategies.values());
  }

  /**
   * Private helper methods
   */
  private async loadWorkflows(): Promise<void> {
    // Load existing workflows from storage
    try {
      if (this.storage.getSmartphoneWorkflows) {
        const workflows = await this.storage.getSmartphoneWorkflows();
        for (const workflow of workflows) {
          this.activeWorkflows.set(workflow.id, workflow);
          if (workflow.status === 'scheduled') {
            this.scheduleWorkflow(workflow);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load workflows:', error);
    }
  }

  private scheduleWorkflow(workflow: SmartphoneWorkflow): void {
    if (workflow.schedule.startTime <= new Date()) {
      // Start immediately
      this.executeWorkflowPhases(workflow);
    } else {
      // Schedule for later
      const delay = workflow.schedule.startTime.getTime() - Date.now();
      const timeout = setTimeout(() => {
        this.executeWorkflowPhases(workflow);
      }, delay);
      
      this.scheduledWorkflows.set(workflow.id, timeout);
    }
  }

  private startWorkflowScheduler(): void {
    // Check for scheduled workflows every minute
    setInterval(() => {
      const now = new Date();
      
      for (const workflow of this.activeWorkflows.values()) {
        if (workflow.status === 'scheduled' && 
            workflow.schedule.startTime <= now &&
            !this.scheduledWorkflows.has(workflow.id)) {
          this.executeWorkflowPhases(workflow);
        }

        // Handle daily repeats
        if (workflow.schedule.repeatDaily && 
            workflow.status === 'completed' &&
            workflow.statistics.lastRun) {
          const daysSinceLastRun = (now.getTime() - workflow.statistics.lastRun.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceLastRun >= 1) {
            workflow.status = 'scheduled';
            workflow.statistics.nextRun = new Date(now.getTime() + 
              (workflow.schedule.startTime.getTime() - workflow.statistics.lastRun.getTime()));
            this.scheduleWorkflow(workflow);
          }
        }
      }
    }, 60000); // Check every minute
  }

  private async saveWorkflow(workflow: SmartphoneWorkflow): Promise<void> {
    try {
      if (this.storage.saveSmartphoneWorkflow) {
        await this.storage.saveSmartphoneWorkflow(workflow);
      }
    } catch (error) {
      console.error(`Failed to save workflow ${workflow.id}:`, error);
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Stop all scheduled workflows
    for (const [workflowId, timeout] of this.scheduledWorkflows) {
      clearTimeout(timeout);
    }
    this.scheduledWorkflows.clear();

    // Complete all active workflows
    for (const workflow of this.activeWorkflows.values()) {
      if (workflow.status === 'running') {
        await this.stopWorkflow(workflow.id);
      }
    }

    this.removeAllListeners();
  }
}