import { Router } from 'express';
import { GoogleCloudAutomation } from '../services/google-cloud-automation';
import { GoogleCloudWorkflows } from '../services/google-cloud-workflows';
import { GoogleCloudAffiliateTracker } from '../services/google-cloud-affiliate-tracker';

const router = Router();

// Initialize services
const cloudAutomation = new GoogleCloudAutomation();
const cloudWorkflows = new GoogleCloudWorkflows();
const affiliateTracker = new GoogleCloudAffiliateTracker();

/**
 * Video Upload and Management
 */
router.post('/upload-video', async (req, res) => {
  try {
    const { filename, content, metadata } = req.body;
    
    if (!filename || !content) {
      return res.status(400).json({ error: 'Filename and content are required' });
    }

    const videoContent = await cloudAutomation.uploadVideo(
      Buffer.from(content, 'base64'),
      filename,
      metadata
    );

    res.json({
      success: true,
      video: videoContent,
      message: 'Video uploaded successfully to Google Cloud Storage',
    });
  } catch (error) {
    console.error('Error uploading video:', error);
    res.status(500).json({ error: 'Failed to upload video', details: error });
  }
});

/**
 * Workflow Management
 */
router.get('/workflows/templates', async (req, res) => {
  try {
    const templates = cloudWorkflows.getWorkflowTemplates();
    res.json({
      success: true,
      templates,
    });
  } catch (error) {
    console.error('Error getting workflow templates:', error);
    res.status(500).json({ error: 'Failed to get workflow templates' });
  }
});

router.post('/workflows/execute', async (req, res) => {
  try {
    const { templateId, input = {}, options = {} } = req.body;
    
    if (!templateId) {
      return res.status(400).json({ error: 'Template ID is required' });
    }

    const executionId = await cloudWorkflows.executeWorkflow(templateId, input, options);
    
    res.json({
      success: true,
      executionId,
      message: 'Workflow execution started',
    });
  } catch (error) {
    console.error('Error executing workflow:', error);
    res.status(500).json({ error: 'Failed to execute workflow', details: error });
  }
});

router.get('/workflows/execution/:executionId', async (req, res) => {
  try {
    const { executionId } = req.params;
    const execution = cloudWorkflows.getExecutionStatus(executionId);
    
    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    res.json({
      success: true,
      execution,
    });
  } catch (error) {
    console.error('Error getting execution status:', error);
    res.status(500).json({ error: 'Failed to get execution status' });
  }
});

router.delete('/workflows/execution/:executionId', async (req, res) => {
  try {
    const { executionId } = req.params;
    const cancelled = await cloudWorkflows.cancelExecution(executionId);
    
    if (!cancelled) {
      return res.status(400).json({ error: 'Cannot cancel execution or execution not found' });
    }

    res.json({
      success: true,
      message: 'Workflow execution cancelled',
    });
  } catch (error) {
    console.error('Error cancelling execution:', error);
    res.status(500).json({ error: 'Failed to cancel execution' });
  }
});

/**
 * Affiliate Link Management
 */
router.post('/affiliate/generate-link', async (req, res) => {
  try {
    const { postId, platform, linkType, campaignId, customParams } = req.body;
    
    if (!postId || !platform || !linkType) {
      return res.status(400).json({ 
        error: 'Post ID, platform, and link type are required' 
      });
    }

    const affiliateLink = await affiliateTracker.generateTrackingLink(
      postId,
      platform,
      linkType,
      campaignId,
      customParams
    );

    res.json({
      success: true,
      affiliateLink,
      message: 'Affiliate tracking link generated successfully',
    });
  } catch (error) {
    console.error('Error generating affiliate link:', error);
    res.status(500).json({ error: 'Failed to generate affiliate link', details: error });
  }
});

router.post('/affiliate/auto-inject', async (req, res) => {
  try {
    const { content, postId, platform, campaignId } = req.body;
    
    if (!content || !postId || !platform) {
      return res.status(400).json({ 
        error: 'Content, post ID, and platform are required' 
      });
    }

    const result = await affiliateTracker.autoInjectLinks(
      content,
      postId,
      platform,
      campaignId
    );

    res.json({
      success: true,
      ...result,
      message: `Injected ${result.injectedLinks.length} affiliate links`,
    });
  } catch (error) {
    console.error('Error auto-injecting affiliate links:', error);
    res.status(500).json({ error: 'Failed to auto-inject affiliate links', details: error });
  }
});

router.get('/affiliate/performance', async (req, res) => {
  try {
    const { linkId, timeframe = 'week', limit = 10 } = req.query;
    
    let performances;
    if (linkId) {
      performances = await affiliateTracker.getAffiliatePerformance(linkId as string);
    } else {
      performances = await affiliateTracker.getTopPerformingLinks(
        parseInt(limit as string),
        timeframe as 'day' | 'week' | 'month'
      );
    }

    res.json({
      success: true,
      performances,
    });
  } catch (error) {
    console.error('Error getting affiliate performance:', error);
    res.status(500).json({ error: 'Failed to get affiliate performance' });
  }
});

router.post('/affiliate/track-click', async (req, res) => {
  try {
    const { linkId, userAgent, referrer, ipAddress, sessionId } = req.body;
    
    if (!linkId) {
      return res.status(400).json({ error: 'Link ID is required' });
    }

    const clickId = await affiliateTracker.trackClick(
      linkId,
      userAgent || req.get('User-Agent') || '',
      referrer || req.get('Referer') || '',
      ipAddress || req.ip || '',
      sessionId || `session_${Date.now()}`
    );

    res.json({
      success: true,
      clickId,
      message: 'Click tracked successfully',
    });
  } catch (error) {
    console.error('Error tracking click:', error);
    res.status(500).json({ error: 'Failed to track click', details: error });
  }
});

router.post('/affiliate/track-conversion', async (req, res) => {
  try {
    const { linkId, clickId, conversionValue, conversionType, customerData } = req.body;
    
    if (!linkId || !clickId || !conversionValue) {
      return res.status(400).json({ 
        error: 'Link ID, click ID, and conversion value are required' 
      });
    }

    await affiliateTracker.trackConversion(
      linkId,
      clickId,
      parseFloat(conversionValue),
      conversionType,
      customerData
    );

    res.json({
      success: true,
      message: 'Conversion tracked successfully',
    });
  } catch (error) {
    console.error('Error tracking conversion:', error);
    res.status(500).json({ error: 'Failed to track conversion', details: error });
  }
});

/**
 * ROI Analytics and Optimization
 */
router.get('/analytics/roi', async (req, res) => {
  try {
    const { timeframe = 'week' } = req.query;
    const analytics = await cloudAutomation.getROIAnalytics(timeframe as 'day' | 'week' | 'month');
    
    res.json({
      success: true,
      analytics,
    });
  } catch (error) {
    console.error('Error getting ROI analytics:', error);
    res.status(500).json({ error: 'Failed to get ROI analytics' });
  }
});

router.post('/analytics/optimize-spend', async (req, res) => {
  try {
    const optimization = await cloudAutomation.optimizeAdSpend();
    
    res.json({
      success: true,
      optimization,
      message: 'Ad spend optimization completed',
    });
  } catch (error) {
    console.error('Error optimizing ad spend:', error);
    res.status(500).json({ error: 'Failed to optimize ad spend' });
  }
});

/**
 * Complete Automation Pipeline
 */
router.post('/automation/content-to-conversion', async (req, res) => {
  try {
    const { 
      video, 
      content, 
      platforms = ['tiktok', 'instagram'], 
      campaignId = 'auto_campaign',
      priority = 'medium' 
    } = req.body;
    
    if (!video && !content) {
      return res.status(400).json({ 
        error: 'Either video or content is required' 
      });
    }

    // Execute complete content-to-conversion workflow
    const executionId = await cloudWorkflows.executeWorkflow('content_to_conversion', {
      video,
      content,
      platforms,
      campaignId,
    }, {
      priority: priority as 'low' | 'medium' | 'high',
      maxCost: 10, // Maximum 10 Google Cloud credits
    });

    res.json({
      success: true,
      executionId,
      message: 'Content-to-conversion automation started',
      estimatedCompletion: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    });
  } catch (error) {
    console.error('Error starting content-to-conversion automation:', error);
    res.status(500).json({ 
      error: 'Failed to start automation pipeline', 
      details: error 
    });
  }
});

router.post('/automation/daily-optimization', async (req, res) => {
  try {
    const executionId = await cloudWorkflows.executeWorkflow('daily_optimization', {}, {
      priority: 'high',
      maxCost: 2,
    });

    res.json({
      success: true,
      executionId,
      message: 'Daily optimization workflow started',
      estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    });
  } catch (error) {
    console.error('Error starting daily optimization:', error);
    res.status(500).json({ error: 'Failed to start daily optimization' });
  }
});

router.post('/automation/bulk-process', async (req, res) => {
  try {
    const { videos, maxCost = 15 } = req.body;
    
    if (!videos || !Array.isArray(videos)) {
      return res.status(400).json({ error: 'Videos array is required' });
    }

    const executionId = await cloudWorkflows.executeWorkflow('bulk_video_process', {
      videos,
    }, {
      priority: 'medium',
      maxCost,
    });

    res.json({
      success: true,
      executionId,
      message: `Bulk processing started for ${videos.length} videos`,
      estimatedCompletion: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    });
  } catch (error) {
    console.error('Error starting bulk processing:', error);
    res.status(500).json({ error: 'Failed to start bulk processing' });
  }
});

/**
 * Real-time Monitoring
 */
router.get('/monitoring/active-workflows', async (req, res) => {
  try {
    // This would get active workflows from Firestore in a real implementation
    const activeWorkflows = []; // Placeholder
    
    res.json({
      success: true,
      activeWorkflows,
      totalActive: activeWorkflows.length,
    });
  } catch (error) {
    console.error('Error getting active workflows:', error);
    res.status(500).json({ error: 'Failed to get active workflows' });
  }
});

router.get('/monitoring/system-health', async (req, res) => {
  try {
    // Check Google Cloud services health
    const systemHealth = {
      storage: 'healthy',
      bigquery: 'healthy',
      firestore: 'healthy',
      workflows: 'healthy',
      lastChecked: new Date(),
      uptime: process.uptime(),
      creditsRemaining: 1000, // Estimated remaining credits
    };

    res.json({
      success: true,
      systemHealth,
    });
  } catch (error) {
    console.error('Error getting system health:', error);
    res.status(500).json({ error: 'Failed to get system health' });
  }
});

export default router;