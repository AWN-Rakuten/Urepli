import express from 'express';
import { SmartphoneDeviceManager, DeviceAllocationRequest } from '../services/smartphone-device-manager';
import { MobileContentWatcher, WatchingRequest } from '../services/mobile-content-watcher';
import { SmartphoneCoordinator } from '../services/smartphone-coordinator';
import { IStorage } from '../storage';

export function createSmartphoneAutomationRoutes(
  deviceManager: SmartphoneDeviceManager,
  contentWatcher: MobileContentWatcher,
  coordinator: SmartphoneCoordinator,
  storage: IStorage
) {
  const router = express.Router();

  // Device Management Routes
  
  /**
   * Get all smartphone devices
   */
  router.get('/devices', async (req, res) => {
    try {
      const devices = deviceManager.getAllDevices();
      const statistics = deviceManager.getPoolStatistics();
      
      res.json({
        success: true,
        devices,
        statistics
      });
    } catch (error) {
      console.error('Failed to get devices:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Get specific device information
   */
  router.get('/devices/:deviceId', async (req, res) => {
    try {
      const device = deviceManager.getDevice(req.params.deviceId);
      
      if (!device) {
        return res.status(404).json({
          success: false,
          error: 'Device not found'
        });
      }

      res.json({
        success: true,
        device
      });
    } catch (error) {
      console.error('Failed to get device:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Add a new smartphone device
   */
  router.post('/devices', async (req, res) => {
    try {
      const { udid, name, platform, osVersion, screenResolution, capabilities, proxyConfig } = req.body;

      if (!udid) {
        return res.status(400).json({
          success: false,
          error: 'UDID is required'
        });
      }

      const deviceId = await deviceManager.addDevice({
        udid,
        name,
        platform,
        osVersion,
        screenResolution,
        capabilities,
        proxyConfig
      });

      res.json({
        success: true,
        deviceId,
        message: 'Device added successfully'
      });
    } catch (error) {
      console.error('Failed to add device:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Remove a smartphone device
   */
  router.delete('/devices/:deviceId', async (req, res) => {
    try {
      const success = await deviceManager.removeDevice(req.params.deviceId);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Device not found'
        });
      }

      res.json({
        success: true,
        message: 'Device removed successfully'
      });
    } catch (error) {
      console.error('Failed to remove device:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Allocate a device for specific task
   */
  router.post('/devices/allocate', async (req, res) => {
    try {
      const allocationRequest: DeviceAllocationRequest = req.body;
      
      const result = await deviceManager.allocateDevice(allocationRequest);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(409).json(result); // Conflict - no available devices
      }
    } catch (error) {
      console.error('Failed to allocate device:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Release a device allocation
   */
  router.post('/devices/release/:sessionId', async (req, res) => {
    try {
      const { statistics } = req.body;
      
      const success = await deviceManager.releaseDevice(req.params.sessionId, statistics);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      res.json({
        success: true,
        message: 'Device released successfully'
      });
    } catch (error) {
      console.error('Failed to release device:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Content Watching Routes

  /**
   * Start a content watching session
   */
  router.post('/watching/start', async (req, res) => {
    try {
      const watchingRequest: WatchingRequest = req.body;
      
      const result = await contentWatcher.startWatchingSession(watchingRequest);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Failed to start watching session:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Stop a content watching session
   */
  router.post('/watching/stop/:sessionId', async (req, res) => {
    try {
      const success = await contentWatcher.stopWatchingSession(req.params.sessionId);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      res.json({
        success: true,
        message: 'Watching session stopped'
      });
    } catch (error) {
      console.error('Failed to stop watching session:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Get watching session information
   */
  router.get('/watching/sessions/:sessionId', async (req, res) => {
    try {
      const session = contentWatcher.getSession(req.params.sessionId);
      
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      res.json({
        success: true,
        session
      });
    } catch (error) {
      console.error('Failed to get session:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Get all active watching sessions
   */
  router.get('/watching/sessions', async (req, res) => {
    try {
      const { platform } = req.query;
      
      let sessions;
      if (platform) {
        sessions = contentWatcher.getSessionsByPlatform(platform as string);
      } else {
        sessions = contentWatcher.getActiveSessions();
      }

      res.json({
        success: true,
        sessions
      });
    } catch (error) {
      console.error('Failed to get sessions:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Get watching profiles
   */
  router.get('/watching/profiles', async (req, res) => {
    try {
      // Get predefined profiles (this would be expanded to include custom profiles)
      const profiles = {
        'japanese_business': contentWatcher.getWatchingProfile('japanese_business'),
        'entertainment_trending': contentWatcher.getWatchingProfile('entertainment_trending'),
        'educational': contentWatcher.getWatchingProfile('educational'),
        'lifestyle_fashion': contentWatcher.getWatchingProfile('lifestyle_fashion')
      };

      res.json({
        success: true,
        profiles
      });
    } catch (error) {
      console.error('Failed to get profiles:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Generate session report
   */
  router.get('/watching/sessions/:sessionId/report', async (req, res) => {
    try {
      const report = contentWatcher.generateSessionReport(req.params.sessionId);
      
      if (!report) {
        return res.status(404).json({
          success: false,
          error: 'Session not found or report unavailable'
        });
      }

      res.json({
        success: true,
        report
      });
    } catch (error) {
      console.error('Failed to generate report:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Coordination and Workflow Routes

  /**
   * Create a new workflow
   */
  router.post('/workflows', async (req, res) => {
    try {
      const workflowConfig = req.body;
      
      const workflowId = await coordinator.createWorkflow(workflowConfig);
      
      res.json({
        success: true,
        workflowId,
        message: 'Workflow created successfully'
      });
    } catch (error) {
      console.error('Failed to create workflow:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Start content watching workflow
   */
  router.post('/workflows/watching', async (req, res) => {
    try {
      const config = req.body;
      
      const result = await coordinator.startContentWatchingWorkflow(config);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Failed to start watching workflow:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Coordinate content posting
   */
  router.post('/workflows/posting', async (req, res) => {
    try {
      const config = req.body;
      
      const result = await coordinator.coordinateContentPosting(config);
      
      res.json(result);
    } catch (error) {
      console.error('Failed to coordinate posting:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Execute comprehensive workflow
   */
  router.post('/workflows/comprehensive', async (req, res) => {
    try {
      const config = req.body;
      
      const result = await coordinator.executeComprehensiveWorkflow(config);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Failed to execute comprehensive workflow:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Get workflow information
   */
  router.get('/workflows/:workflowId', async (req, res) => {
    try {
      const workflow = coordinator.getWorkflow(req.params.workflowId);
      
      if (!workflow) {
        return res.status(404).json({
          success: false,
          error: 'Workflow not found'
        });
      }

      res.json({
        success: true,
        workflow
      });
    } catch (error) {
      console.error('Failed to get workflow:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Get all workflows
   */
  router.get('/workflows', async (req, res) => {
    try {
      const workflows = coordinator.getAllWorkflows();
      
      res.json({
        success: true,
        workflows
      });
    } catch (error) {
      console.error('Failed to get workflows:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Pause a workflow
   */
  router.post('/workflows/:workflowId/pause', async (req, res) => {
    try {
      const success = await coordinator.pauseWorkflow(req.params.workflowId);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Workflow not found'
        });
      }

      res.json({
        success: true,
        message: 'Workflow paused'
      });
    } catch (error) {
      console.error('Failed to pause workflow:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Resume a workflow
   */
  router.post('/workflows/:workflowId/resume', async (req, res) => {
    try {
      const success = await coordinator.resumeWorkflow(req.params.workflowId);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Workflow not found'
        });
      }

      res.json({
        success: true,
        message: 'Workflow resumed'
      });
    } catch (error) {
      console.error('Failed to resume workflow:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Stop a workflow
   */
  router.post('/workflows/:workflowId/stop', async (req, res) => {
    try {
      const success = await coordinator.stopWorkflow(req.params.workflowId);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Workflow not found'
        });
      }

      res.json({
        success: true,
        message: 'Workflow stopped'
      });
    } catch (error) {
      console.error('Failed to stop workflow:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Get coordination strategies
   */
  router.get('/strategies', async (req, res) => {
    try {
      const strategies = coordinator.getAllCoordinationStrategies();
      
      res.json({
        success: true,
        strategies
      });
    } catch (error) {
      console.error('Failed to get strategies:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Get specific coordination strategy
   */
  router.get('/strategies/:strategyName', async (req, res) => {
    try {
      const strategy = coordinator.getCoordinationStrategy(req.params.strategyName);
      
      if (!strategy) {
        return res.status(404).json({
          success: false,
          error: 'Strategy not found'
        });
      }

      res.json({
        success: true,
        strategy
      });
    } catch (error) {
      console.error('Failed to get strategy:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Analytics and Monitoring Routes

  /**
   * Get comprehensive dashboard data
   */
  router.get('/dashboard', async (req, res) => {
    try {
      const deviceStatistics = deviceManager.getPoolStatistics();
      const activeSessions = contentWatcher.getActiveSessions();
      const activeWorkflows = coordinator.getAllWorkflows().filter(w => w.status === 'running');
      
      const dashboard = {
        devices: {
          total: deviceStatistics.totalDevices,
          available: deviceStatistics.availableDevices,
          busy: deviceStatistics.busyDevices,
          offline: deviceStatistics.offlineDevices,
          averageBatteryLevel: deviceStatistics.averageBatteryLevel,
          averageSuccessRate: deviceStatistics.averageSuccessRate
        },
        watching: {
          activeSessions: activeSessions.length,
          totalWatchTime: activeSessions.reduce((sum, session) => sum + session.statistics.totalWatchTime, 0),
          totalEngagements: activeSessions.reduce((sum, session) => 
            sum + Object.values(session.statistics.engagements).reduce((s, v) => s + v, 0), 0)
        },
        workflows: {
          active: activeWorkflows.length,
          completed: coordinator.getAllWorkflows().filter(w => w.status === 'completed').length,
          failed: coordinator.getAllWorkflows().filter(w => w.status === 'failed').length
        },
        totals: {
          watchTime: deviceStatistics.totalWatchTime,
          posts: deviceStatistics.totalPosts,
          engagements: deviceStatistics.totalEngagements
        }
      };

      res.json({
        success: true,
        dashboard
      });
    } catch (error) {
      console.error('Failed to get dashboard data:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Get real-time system health
   */
  router.get('/health', async (req, res) => {
    try {
      const devices = deviceManager.getAllDevices();
      const activeSessions = contentWatcher.getActiveSessions();
      const activeWorkflows = coordinator.getAllWorkflows().filter(w => w.status === 'running');

      const health = {
        overall: 'healthy', // This would be calculated based on various metrics
        devices: {
          healthy: devices.filter(d => d.status === 'available').length,
          warning: devices.filter(d => d.healthMetrics.batteryLevel < 30 || d.healthMetrics.temperature > 40).length,
          critical: devices.filter(d => d.status === 'error' || d.status === 'maintenance').length
        },
        sessions: {
          active: activeSessions.length,
          failed: activeSessions.filter(s => s.status === 'failed').length
        },
        workflows: {
          running: activeWorkflows.length,
          failed: coordinator.getAllWorkflows().filter(w => w.status === 'failed').length
        },
        timestamp: new Date().toISOString()
      };

      // Determine overall health
      if (health.devices.critical > 0 || health.workflows.failed > 0) {
        health.overall = 'critical';
      } else if (health.devices.warning > 2 || health.sessions.failed > 0) {
        health.overall = 'warning';
      }

      res.json({
        success: true,
        health
      });
    } catch (error) {
      console.error('Failed to get system health:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
}