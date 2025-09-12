import { EventEmitter } from 'events';
import { IStorage } from '../storage';

export interface SmartphoneDevice {
  id: string;
  name: string;
  udid: string; // Unique device identifier
  platform: 'android' | 'ios';
  osVersion: string;
  screenResolution: {
    width: number;
    height: number;
    density: number;
  };
  status: 'available' | 'busy' | 'offline' | 'maintenance' | 'error';
  capabilities: {
    canPostVideo: boolean;
    canWatchContent: boolean;
    canEngageContent: boolean;
    supportedPlatforms: Array<'tiktok' | 'instagram' | 'youtube'>;
  };
  currentSession?: {
    sessionId: string;
    platform: string;
    startTime: Date;
    activity: 'watching' | 'posting' | 'engaging' | 'idle';
  };
  proxyConfig?: {
    server: string;
    port: number;
    username?: string;
    password?: string;
    country?: string;
    carrier?: string;
  };
  healthMetrics: {
    batteryLevel: number;
    temperature: number;
    memoryUsage: number;
    cpuUsage: number;
    lastHealthCheck: Date;
  };
  statistics: {
    totalWatchTime: number;
    totalPosts: number;
    totalEngagements: number;
    successRate: number;
    lastActive: Date;
  };
  accountAssignments: Array<{
    platform: string;
    accountId: string;
    username: string;
  }>;
}

export interface DeviceAllocationRequest {
  platform: 'tiktok' | 'instagram' | 'youtube';
  activity: 'watching' | 'posting' | 'engaging';
  duration?: number; // estimated duration in minutes
  priority: 'low' | 'medium' | 'high';
  requirements?: {
    minBatteryLevel?: number;
    maxTemperature?: number;
    specificDevice?: string;
  };
}

export interface DeviceAllocationResult {
  success: boolean;
  device?: SmartphoneDevice;
  sessionId?: string;
  error?: string;
  estimatedWaitTime?: number;
}

/**
 * Manages a pool of smartphone devices for social media automation
 * Handles device allocation, health monitoring, and session management
 */
export class SmartphoneDeviceManager extends EventEmitter {
  private storage: IStorage;
  private devices: Map<string, SmartphoneDevice> = new Map();
  private activeSessions: Map<string, SmartphoneDevice> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private allocationQueue: Array<{
    request: DeviceAllocationRequest;
    resolve: (result: DeviceAllocationResult) => void;
    timestamp: Date;
  }> = [];

  constructor(storage: IStorage) {
    super();
    this.storage = storage;
    this.startHealthMonitoring();
    this.loadDeviceConfigurations();
  }

  /**
   * Initialize smartphone devices from configuration
   */
  private async loadDeviceConfigurations(): Promise<void> {
    try {
      // Load device configurations from storage or config files
      const deviceConfigs = await this.storage.getSmartphoneDevices?.() || [];
      
      for (const config of deviceConfigs) {
        const device: SmartphoneDevice = {
          id: config.id,
          name: config.name || `Device-${config.id}`,
          udid: config.udid,
          platform: config.platform || 'android',
          osVersion: config.osVersion || '11.0',
          screenResolution: config.screenResolution || {
            width: 1080,
            height: 2340,
            density: 3
          },
          status: 'offline',
          capabilities: config.capabilities || {
            canPostVideo: true,
            canWatchContent: true,
            canEngageContent: true,
            supportedPlatforms: ['tiktok', 'instagram', 'youtube']
          },
          proxyConfig: config.proxyConfig,
          healthMetrics: {
            batteryLevel: 100,
            temperature: 25,
            memoryUsage: 0,
            cpuUsage: 0,
            lastHealthCheck: new Date()
          },
          statistics: {
            totalWatchTime: 0,
            totalPosts: 0,
            totalEngagements: 0,
            successRate: 100,
            lastActive: new Date()
          },
          accountAssignments: config.accountAssignments || []
        };

        this.devices.set(device.id, device);
        await this.checkDeviceHealth(device.id);
      }

      console.log(`Loaded ${this.devices.size} smartphone devices`);
      this.emit('devicesLoaded', this.devices.size);
    } catch (error) {
      console.error('Failed to load device configurations:', error);
    }
  }

  /**
   * Request allocation of a device for specific task
   */
  async allocateDevice(request: DeviceAllocationRequest): Promise<DeviceAllocationResult> {
    return new Promise((resolve) => {
      // Add to queue with timestamp
      this.allocationQueue.push({
        request,
        resolve,
        timestamp: new Date()
      });

      // Process queue
      this.processAllocationQueue();
    });
  }

  /**
   * Process device allocation queue
   */
  private processAllocationQueue(): void {
    if (this.allocationQueue.length === 0) return;

    // Sort by priority and timestamp
    this.allocationQueue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.request.priority];
      const bPriority = priorityOrder[b.request.priority];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }
      
      return a.timestamp.getTime() - b.timestamp.getTime(); // Earlier first for same priority
    });

    const currentRequest = this.allocationQueue[0];
    const availableDevice = this.findBestDevice(currentRequest.request);

    if (availableDevice) {
      // Allocate device
      const sessionId = this.generateSessionId();
      availableDevice.status = 'busy';
      availableDevice.currentSession = {
        sessionId,
        platform: currentRequest.request.platform,
        startTime: new Date(),
        activity: currentRequest.request.activity
      };

      this.activeSessions.set(sessionId, availableDevice);
      
      // Remove from queue and resolve
      this.allocationQueue.shift();
      currentRequest.resolve({
        success: true,
        device: availableDevice,
        sessionId
      });

      this.emit('deviceAllocated', { device: availableDevice, sessionId });

      // Process next in queue if any
      if (this.allocationQueue.length > 0) {
        setTimeout(() => this.processAllocationQueue(), 1000);
      }
    } else {
      // No device available, calculate wait time
      const estimatedWaitTime = this.calculateEstimatedWaitTime(currentRequest.request);
      
      if (estimatedWaitTime > 30) { // If wait time > 30 minutes, reject
        this.allocationQueue.shift();
        currentRequest.resolve({
          success: false,
          error: 'No devices available and wait time too long',
          estimatedWaitTime
        });
      }
      // Otherwise keep in queue and try again later
    }
  }

  /**
   * Find the best available device for a request
   */
  private findBestDevice(request: DeviceAllocationRequest): SmartphoneDevice | null {
    const availableDevices = Array.from(this.devices.values()).filter(device => {
      // Basic availability check
      if (device.status !== 'available') return false;

      // Platform support check
      if (!device.capabilities.supportedPlatforms.includes(request.platform)) return false;

      // Activity capability check
      switch (request.activity) {
        case 'posting':
          if (!device.capabilities.canPostVideo) return false;
          break;
        case 'watching':
          if (!device.capabilities.canWatchContent) return false;
          break;
        case 'engaging':
          if (!device.capabilities.canEngageContent) return false;
          break;
      }

      // Requirements check
      if (request.requirements) {
        if (request.requirements.minBatteryLevel && 
            device.healthMetrics.batteryLevel < request.requirements.minBatteryLevel) {
          return false;
        }
        
        if (request.requirements.maxTemperature && 
            device.healthMetrics.temperature > request.requirements.maxTemperature) {
          return false;
        }

        if (request.requirements.specificDevice && 
            device.id !== request.requirements.specificDevice) {
          return false;
        }
      }

      return true;
    });

    if (availableDevices.length === 0) return null;

    // Score devices based on multiple factors
    const scoredDevices = availableDevices.map(device => {
      let score = 0;

      // Battery level (20% weight)
      score += (device.healthMetrics.batteryLevel / 100) * 20;

      // Temperature (lower is better, 15% weight)
      score += Math.max(0, (50 - device.healthMetrics.temperature) / 50) * 15;

      // Success rate (25% weight)
      score += (device.statistics.successRate / 100) * 25;

      // Recency of use (prefer less recently used devices, 20% weight)
      const timeSinceLastUse = Date.now() - device.statistics.lastActive.getTime();
      const hoursSinceLastUse = timeSinceLastUse / (1000 * 60 * 60);
      score += Math.min(hoursSinceLastUse / 24, 1) * 20; // Max 1 day gives full points

      // Platform specialization (10% weight)
      const hasAssignedAccount = device.accountAssignments.some(
        assignment => assignment.platform === request.platform
      );
      if (hasAssignedAccount) score += 10;

      // Memory and CPU usage (10% weight)
      score += Math.max(0, (100 - device.healthMetrics.memoryUsage - device.healthMetrics.cpuUsage) / 200) * 10;

      return { device, score };
    });

    // Sort by score descending and return best device
    scoredDevices.sort((a, b) => b.score - a.score);
    return scoredDevices[0].device;
  }

  /**
   * Release a device session
   */
  async releaseDevice(sessionId: string, statistics?: {
    success: boolean;
    duration: number;
    postsCount?: number;
    engagementsCount?: number;
    watchTime?: number;
  }): Promise<boolean> {
    const device = this.activeSessions.get(sessionId);
    if (!device) return false;

    // Update device status
    device.status = 'available';
    device.currentSession = undefined;

    // Update statistics if provided
    if (statistics) {
      device.statistics.lastActive = new Date();
      
      if (statistics.postsCount) {
        device.statistics.totalPosts += statistics.postsCount;
      }
      
      if (statistics.engagementsCount) {
        device.statistics.totalEngagements += statistics.engagementsCount;
      }
      
      if (statistics.watchTime) {
        device.statistics.totalWatchTime += statistics.watchTime;
      }

      // Update success rate (exponential moving average)
      const alpha = 0.1;
      device.statistics.successRate = 
        (1 - alpha) * device.statistics.successRate + 
        alpha * (statistics.success ? 100 : 0);
    }

    // Remove from active sessions
    this.activeSessions.delete(sessionId);

    // Save device state
    await this.saveDeviceState(device);

    this.emit('deviceReleased', { device, sessionId, statistics });

    // Process queue in case devices are waiting
    setTimeout(() => this.processAllocationQueue(), 500);

    return true;
  }

  /**
   * Get device status and information
   */
  getDevice(deviceId: string): SmartphoneDevice | null {
    return this.devices.get(deviceId) || null;
  }

  /**
   * Get all devices with their current status
   */
  getAllDevices(): SmartphoneDevice[] {
    return Array.from(this.devices.values());
  }

  /**
   * Get devices filtered by status
   */
  getDevicesByStatus(status: SmartphoneDevice['status']): SmartphoneDevice[] {
    return Array.from(this.devices.values()).filter(device => device.status === status);
  }

  /**
   * Start health monitoring for all devices
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      for (const deviceId of this.devices.keys()) {
        await this.checkDeviceHealth(deviceId);
      }
    }, 60000); // Check every minute
  }

  /**
   * Check health of a specific device
   */
  private async checkDeviceHealth(deviceId: string): Promise<void> {
    const device = this.devices.get(deviceId);
    if (!device) return;

    try {
      // Simulate device health check (in real implementation, this would use ADB/Appium)
      const healthData = await this.queryDeviceHealth(device.udid);
      
      device.healthMetrics = {
        ...healthData,
        lastHealthCheck: new Date()
      };

      // Update device status based on health
      if (device.status === 'offline' && healthData.batteryLevel > 0) {
        device.status = 'available';
      } else if (device.status !== 'offline' && healthData.batteryLevel === 0) {
        device.status = 'offline';
      }

      // Check for critical health issues
      if (healthData.temperature > 45) {
        device.status = 'maintenance';
        this.emit('deviceOverheating', device);
      }

      if (healthData.batteryLevel < 20) {
        this.emit('deviceLowBattery', device);
      }

    } catch (error) {
      console.error(`Health check failed for device ${deviceId}:`, error);
      device.status = 'error';
      this.emit('deviceHealthCheckFailed', { device, error });
    }
  }

  /**
   * Query device health metrics (placeholder for actual implementation)
   */
  private async queryDeviceHealth(udid: string): Promise<{
    batteryLevel: number;
    temperature: number;
    memoryUsage: number;
    cpuUsage: number;
  }> {
    // In real implementation, this would use ADB commands or Appium
    // For now, return simulated data
    return {
      batteryLevel: Math.floor(Math.random() * 100),
      temperature: 25 + Math.random() * 20,
      memoryUsage: Math.floor(Math.random() * 80),
      cpuUsage: Math.floor(Math.random() * 60)
    };
  }

  /**
   * Calculate estimated wait time for device allocation
   */
  private calculateEstimatedWaitTime(request: DeviceAllocationRequest): number {
    const busyDevices = this.getDevicesByStatus('busy');
    const compatibleBusyDevices = busyDevices.filter(device =>
      device.capabilities.supportedPlatforms.includes(request.platform)
    );

    if (compatibleBusyDevices.length === 0) {
      return 60; // 60 minutes if no compatible devices are even busy
    }

    // Calculate average session duration based on activity type
    const avgDuration = {
      watching: 30, // 30 minutes
      posting: 5,   // 5 minutes
      engaging: 15  // 15 minutes
    }[request.activity];

    // Find the shortest remaining session time
    let shortestRemainingTime = Number.MAX_SAFE_INTEGER;
    
    compatibleBusyDevices.forEach(device => {
      if (device.currentSession) {
        const sessionDuration = Date.now() - device.currentSession.startTime.getTime();
        const estimatedTotal = avgDuration * 60000; // Convert to milliseconds
        const remaining = Math.max(0, estimatedTotal - sessionDuration);
        shortestRemainingTime = Math.min(shortestRemainingTime, remaining);
      }
    });

    return Math.ceil(shortestRemainingTime / (1000 * 60)); // Convert to minutes
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save device state to storage
   */
  private async saveDeviceState(device: SmartphoneDevice): Promise<void> {
    try {
      if (this.storage.updateSmartphoneDevice) {
        await this.storage.updateSmartphoneDevice(device.id, device);
      }
    } catch (error) {
      console.error(`Failed to save device state for ${device.id}:`, error);
    }
  }

  /**
   * Add a new device to the pool
   */
  async addDevice(deviceConfig: Partial<SmartphoneDevice> & { udid: string }): Promise<string> {
    const deviceId = deviceConfig.id || `device_${Date.now()}`;
    
    const device: SmartphoneDevice = {
      id: deviceId,
      name: deviceConfig.name || `Device-${deviceId}`,
      udid: deviceConfig.udid,
      platform: deviceConfig.platform || 'android',
      osVersion: deviceConfig.osVersion || '11.0',
      screenResolution: deviceConfig.screenResolution || {
        width: 1080,
        height: 2340,
        density: 3
      },
      status: 'offline',
      capabilities: deviceConfig.capabilities || {
        canPostVideo: true,
        canWatchContent: true,
        canEngageContent: true,
        supportedPlatforms: ['tiktok', 'instagram', 'youtube']
      },
      proxyConfig: deviceConfig.proxyConfig,
      healthMetrics: {
        batteryLevel: 100,
        temperature: 25,
        memoryUsage: 0,
        cpuUsage: 0,
        lastHealthCheck: new Date()
      },
      statistics: {
        totalWatchTime: 0,
        totalPosts: 0,
        totalEngagements: 0,
        successRate: 100,
        lastActive: new Date()
      },
      accountAssignments: deviceConfig.accountAssignments || []
    };

    this.devices.set(deviceId, device);
    await this.checkDeviceHealth(deviceId);
    await this.saveDeviceState(device);

    this.emit('deviceAdded', device);
    return deviceId;
  }

  /**
   * Remove a device from the pool
   */
  async removeDevice(deviceId: string): Promise<boolean> {
    const device = this.devices.get(deviceId);
    if (!device) return false;

    // Release any active session
    if (device.currentSession) {
      await this.releaseDevice(device.currentSession.sessionId);
    }

    this.devices.delete(deviceId);
    this.emit('deviceRemoved', device);
    return true;
  }

  /**
   * Get overall pool statistics
   */
  getPoolStatistics(): {
    totalDevices: number;
    availableDevices: number;
    busyDevices: number;
    offlineDevices: number;
    maintenanceDevices: number;
    errorDevices: number;
    averageBatteryLevel: number;
    averageSuccessRate: number;
    totalWatchTime: number;
    totalPosts: number;
    totalEngagements: number;
  } {
    const devices = Array.from(this.devices.values());
    
    return {
      totalDevices: devices.length,
      availableDevices: devices.filter(d => d.status === 'available').length,
      busyDevices: devices.filter(d => d.status === 'busy').length,
      offlineDevices: devices.filter(d => d.status === 'offline').length,
      maintenanceDevices: devices.filter(d => d.status === 'maintenance').length,
      errorDevices: devices.filter(d => d.status === 'error').length,
      averageBatteryLevel: devices.reduce((sum, d) => sum + d.healthMetrics.batteryLevel, 0) / devices.length,
      averageSuccessRate: devices.reduce((sum, d) => sum + d.statistics.successRate, 0) / devices.length,
      totalWatchTime: devices.reduce((sum, d) => sum + d.statistics.totalWatchTime, 0),
      totalPosts: devices.reduce((sum, d) => sum + d.statistics.totalPosts, 0),
      totalEngagements: devices.reduce((sum, d) => sum + d.statistics.totalEngagements, 0)
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Release all active sessions
    for (const sessionId of this.activeSessions.keys()) {
      await this.releaseDevice(sessionId);
    }

    this.removeAllListeners();
  }
}