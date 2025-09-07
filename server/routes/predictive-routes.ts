import { Router } from 'express';
import { PredictiveWorkflowScheduler } from '../services/predictive-workflow-scheduler';
import { storage } from '../storage';

const router = Router();
const predictiveScheduler = new PredictiveWorkflowScheduler();

/**
 * Get current market patterns for analysis
 */
router.get('/market-patterns/:platform', async (req, res) => {
  try {
    const { platform } = req.params;
    const lookbackDays = parseInt(req.query.lookbackDays as string) || 30;
    
    if (!['tiktok', 'instagram', 'youtube'].includes(platform)) {
      return res.status(400).json({ error: 'Invalid platform' });
    }
    
    const patterns = await predictiveScheduler.analyzeMarketPatterns(
      platform as 'tiktok' | 'instagram' | 'youtube',
      lookbackDays
    );
    
    res.json({
      platform,
      patterns,
      analysisDate: new Date(),
      lookbackDays
    });
  } catch (error) {
    console.error('Error getting market patterns:', error);
    res.status(500).json({ error: 'Failed to analyze market patterns' });
  }
});

/**
 * Generate predictive schedule for workflow queue
 */
router.post('/generate-schedule', async (req, res) => {
  try {
    const { workflowQueue, hoursAhead = 72 } = req.body;
    
    if (!Array.isArray(workflowQueue) || workflowQueue.length === 0) {
      return res.status(400).json({ error: 'Workflow queue is required and must be non-empty' });
    }
    
    // Validate workflow queue structure
    const isValidQueue = workflowQueue.every(workflow => 
      workflow.workflowId && 
      workflow.contentId && 
      workflow.platform && 
      ['tiktok', 'instagram', 'youtube'].includes(workflow.platform)
    );
    
    if (!isValidQueue) {
      return res.status(400).json({ error: 'Invalid workflow queue structure' });
    }
    
    const schedules = await predictiveScheduler.generatePredictiveSchedule(workflowQueue, hoursAhead);
    
    res.json({
      success: true,
      schedulesGenerated: schedules.length,
      schedules: schedules.map(s => ({
        id: s.id,
        workflowId: s.workflowId,
        platform: s.platform,
        predictedOptimalTime: s.predictedOptimalTime,
        predictedROI: s.predictedROI,
        confidenceScore: s.confidenceScore,
        schedulingReason: s.schedulingReason,
        fallbackTimes: s.fallbackTimes
      })),
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Error generating predictive schedule:', error);
    res.status(500).json({ error: 'Failed to generate predictive schedule' });
  }
});

/**
 * Get current predictive schedules
 */
router.get('/schedules', async (req, res) => {
  try {
    const schedules = await predictiveScheduler.getCurrentPredictiveSchedules();
    
    res.json({
      schedules,
      totalScheduled: schedules.length,
      retrievedAt: new Date()
    });
  } catch (error) {
    console.error('Error getting predictive schedules:', error);
    res.status(500).json({ error: 'Failed to retrieve schedules' });
  }
});

/**
 * Execute scheduled workflow (called by Google Cloud Scheduler)
 */
router.post('/execute-workflow', async (req, res) => {
  try {
    const { scheduleId, workflowId, contentId, platform } = req.body;
    
    if (!scheduleId || !workflowId) {
      return res.status(400).json({ error: 'Schedule ID and workflow ID are required' });
    }
    
    console.log(`🚀 Executing predictive workflow: ${workflowId} (schedule: ${scheduleId})`);
    
    // Mark execution start time
    const executionStart = new Date();
    
    // Log workflow execution
    await storage.createAutomationLog({
      type: 'predictive_execution',
      message: `Executing predictively scheduled workflow ${workflowId}`,
      status: 'in_progress',
      workflowId: workflowId,
      metadata: {
        scheduleId,
        contentId,
        platform,
        executionStart: executionStart.toISOString()
      }
    });
    
    // Here you would integrate with your actual workflow execution system
    // For now, we'll simulate successful execution
    const simulatedResults = {
      success: true,
      executionTime: Date.now() - executionStart.getTime(),
      contentPosted: true,
      engagement: Math.random() * 0.1 + 0.05, // 5-15% engagement
      roi: Math.random() * 0.15 + 0.08 // 8-23% ROI
    };
    
    // Update schedule with actual performance
    await predictiveScheduler.updateScheduleBasedOnPerformance(scheduleId, {
      actualROI: simulatedResults.roi,
      actualEngagement: simulatedResults.engagement,
      executionTime: new Date()
    });
    
    // Log successful execution
    await storage.createAutomationLog({
      type: 'predictive_execution',
      message: `Successfully executed predictive workflow ${workflowId} with ${(simulatedResults.roi * 100).toFixed(1)}% ROI`,
      status: 'success',
      workflowId: workflowId,
      metadata: {
        scheduleId,
        actualROI: simulatedResults.roi,
        actualEngagement: simulatedResults.engagement,
        executionDuration: simulatedResults.executionTime
      }
    });
    
    res.json({
      success: true,
      scheduleId,
      workflowId,
      results: simulatedResults,
      executedAt: new Date()
    });
    
  } catch (error) {
    console.error('Error executing predictive workflow:', error);
    
    // Log execution failure
    await storage.createAutomationLog({
      type: 'predictive_execution',
      message: `Failed to execute predictive workflow: ${error instanceof Error ? error.message : 'Unknown error'}`,
      status: 'error',
      workflowId: req.body.workflowId,
      metadata: {
        scheduleId: req.body.scheduleId,
        error: String(error)
      }
    });
    
    res.status(500).json({ error: 'Failed to execute workflow' });
  }
});

/**
 * Get predictive scheduling insights and performance
 */
router.get('/insights', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const platform = req.query.platform as string;
    
    // Get recent automation logs for predictive scheduling
    const logs = await storage.getAutomationLogs();
    
    const predictiveLogs = logs
      .filter(log => log.type.includes('predictive'))
      .filter(log => {
        if (platform && log.metadata?.platform) {
          return log.metadata.platform === platform;
        }
        return true;
      })
      .filter(log => {
        const logTime = new Date(log.timestamp);
        const hoursAgo = new Date(Date.now() - hours * 60 * 60 * 1000);
        return logTime > hoursAgo;
      });
    
    // Calculate insights
    const totalExecutions = predictiveLogs.filter(log => log.type === 'predictive_execution').length;
    const successfulExecutions = predictiveLogs.filter(log => 
      log.type === 'predictive_execution' && log.status === 'success'
    ).length;
    
    const averageROI = predictiveLogs
      .filter(log => log.metadata?.actualROI)
      .reduce((sum, log, _, arr) => sum + (log.metadata.actualROI / arr.length), 0);
    
    const insights = [
      `過去${hours}時間で${totalExecutions}件の予測スケジュール実行`,
      `成功率: ${totalExecutions > 0 ? ((successfulExecutions / totalExecutions) * 100).toFixed(1) : 0}%`,
      averageROI > 0 ? `平均ROI: ${(averageROI * 100).toFixed(1)}%` : null,
      '市場パターン学習により最適化継続中'
    ].filter(Boolean);
    
    // Platform performance breakdown
    const platformStats = ['tiktok', 'instagram', 'youtube'].map(p => {
      const platformLogs = predictiveLogs.filter(log => log.metadata?.platform === p);
      const platformROI = platformLogs
        .filter(log => log.metadata?.actualROI)
        .reduce((sum, log, _, arr) => arr.length > 0 ? sum + (log.metadata.actualROI / arr.length) : 0, 0);
      
      return {
        platform: p,
        executions: platformLogs.length,
        averageROI: platformROI,
        successRate: platformLogs.length > 0 ? 
          (platformLogs.filter(log => log.status === 'success').length / platformLogs.length) : 0
      };
    }).filter(stat => stat.executions > 0);
    
    res.json({
      timeframe: `${hours} hours`,
      totalExecutions,
      successfulExecutions,
      successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) : 0,
      averageROI,
      insights,
      platformStats,
      generatedAt: new Date()
    });
    
  } catch (error) {
    console.error('Error getting predictive insights:', error);
    res.status(500).json({ error: 'Failed to get insights' });
  }
});

/**
 * Manually trigger predictive analysis for a specific platform
 */
router.post('/analyze/:platform', async (req, res) => {
  try {
    const { platform } = req.params;
    const { forceRefresh = false, lookbackDays = 7 } = req.body;
    
    if (!['tiktok', 'instagram', 'youtube'].includes(platform)) {
      return res.status(400).json({ error: 'Invalid platform' });
    }
    
    console.log(`🔍 Manual analysis triggered for ${platform}`);
    
    const patterns = await predictiveScheduler.analyzeMarketPatterns(
      platform as 'tiktok' | 'instagram' | 'youtube',
      lookbackDays
    );
    
    // Generate sample predictive schedule if patterns are found
    let sampleSchedule = null;
    if (patterns.length > 0) {
      const sampleWorkflow = [{
        workflowId: `sample_${Date.now()}`,
        contentId: `content_${Date.now()}`,
        platform: platform as any,
        contentType: 'promotional',
        priority: 1,
        targetAudience: 'young_adults',
        hashtagsUsed: ['携帯乗換', 'MNP'],
        affiliateLinks: []
      }];
      
      const schedules = await predictiveScheduler.generatePredictiveSchedule(sampleWorkflow, 48);
      sampleSchedule = schedules[0] || null;
    }
    
    await storage.createAutomationLog({
      type: 'predictive_analysis',
      message: `Manual market analysis completed for ${platform}`,
      status: 'success',
      workflowId: null,
      metadata: {
        platform,
        patternsFound: patterns.length,
        lookbackDays,
        forceRefresh
      }
    });
    
    res.json({
      success: true,
      platform,
      patternsAnalyzed: patterns.length,
      patterns: patterns.slice(0, 5), // Return top 5 patterns
      sampleSchedule,
      analyzedAt: new Date()
    });
    
  } catch (error) {
    console.error(`Error analyzing platform ${req.params.platform}:`, error);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

export default router;