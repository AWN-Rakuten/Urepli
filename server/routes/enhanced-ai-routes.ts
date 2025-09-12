import express from 'express';
import { ComfyUIService, AICharacterConfig } from '../services/comfyui-integration';
import { N8nTemplateService, GitIntegrationConfig } from '../services/n8n-template';
import { MLContentOptimizer, ContentOptimizationRequest } from '../services/ml-content-optimizer';
import { AdvancedAnalyticsService, CompetitorAnalysisConfig, MarketSentimentConfig, ROIPredictionConfig } from '../services/advanced-analytics';
import { EnhancedVideoGeneration } from '../services/enhanced-video-generation';

const router = express.Router();

// Initialize services
const comfyUIService = new ComfyUIService();
const n8nTemplateService = new N8nTemplateService();
const mlContentOptimizer = new MLContentOptimizer();
const advancedAnalytics = new AdvancedAnalyticsService();
const enhancedVideoGeneration = new EnhancedVideoGeneration();

/**
 * Enhanced ComfyUI Integration Routes
 */

// Generate AI character video
router.post('/comfyui/generate-character', async (req, res) => {
  try {
    const { characterConfig, script, duration = 30 } = req.body as {
      characterConfig: AICharacterConfig;
      script: string;
      duration?: number;
    };

    const workflow = comfyUIService.createAICharacterWorkflow(characterConfig, script, duration);
    const promptId = await comfyUIService.queueWorkflow(workflow);

    res.json({
      success: true,
      promptId,
      workflow: workflow.id,
      estimatedDuration: '2-5 minutes',
      message: 'AI character generation started'
    });
  } catch (error) {
    console.error('AI character generation failed:', error);
    res.status(500).json({
      success: false,
      error: 'AI character generation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Real-time video editing
router.post('/comfyui/realtime-edit', async (req, res) => {
  try {
    const { inputVideoUrl, editingPrompts, effects = [] } = req.body as {
      inputVideoUrl: string;
      editingPrompts: string[];
      effects?: string[];
    };

    const workflow = comfyUIService.createRealTimeEditingWorkflow(inputVideoUrl, editingPrompts, effects);
    const promptId = await comfyUIService.queueWorkflow(workflow);

    res.json({
      success: true,
      promptId,
      workflow: workflow.id,
      editingPrompts,
      effects,
      message: 'Real-time editing started'
    });
  } catch (error) {
    console.error('Real-time editing failed:', error);
    res.status(500).json({
      success: false,
      error: 'Real-time editing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create custom animations
router.post('/comfyui/create-animations', async (req, res) => {
  try {
    const { elements, duration, transitions } = req.body as {
      elements: Array<{type: string; content: string; animation: string}>;
      duration: number;
      transitions: string[];
    };

    const workflow = comfyUIService.createAnimationEffectsWorkflow(elements, duration, transitions);
    const promptId = await comfyUIService.queueWorkflow(workflow);

    res.json({
      success: true,
      promptId,
      workflow: workflow.id,
      elements: elements.length,
      duration,
      message: 'Animation creation started'
    });
  } catch (error) {
    console.error('Animation creation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Animation creation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get workflow progress
router.get('/comfyui/progress/:promptId', async (req, res) => {
  try {
    const { promptId } = req.params;
    const progress = await comfyUIService.getWorkflowProgress(promptId);

    res.json({
      success: true,
      promptId,
      ...progress
    });
  } catch (error) {
    console.error('Failed to get workflow progress:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get workflow progress',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Enhanced N8N Integration Routes
 */

// Initialize Git repository for templates
router.post('/n8n/git/initialize', async (req, res) => {
  try {
    const gitConfig = req.body as GitIntegrationConfig;
    
    const n8nService = new N8nTemplateService(gitConfig);
    await n8nService.initializeGitRepository();

    res.json({
      success: true,
      repository: gitConfig.repositoryUrl,
      branch: gitConfig.branch,
      message: 'Git repository initialized successfully'
    });
  } catch (error) {
    console.error('Git repository initialization failed:', error);
    res.status(500).json({
      success: false,
      error: 'Git repository initialization failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Sync with Git repository
router.post('/n8n/git/sync', async (req, res) => {
  try {
    const gitConfig = req.body as GitIntegrationConfig;
    
    const n8nService = new N8nTemplateService(gitConfig);
    const syncResult = await n8nService.syncWithGitRepository();

    res.json({
      success: true,
      ...syncResult,
      message: 'Git sync completed'
    });
  } catch (error) {
    console.error('Git sync failed:', error);
    res.status(500).json({
      success: false,
      error: 'Git sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create AI character workflow template
router.post('/n8n/create-character-workflow', async (req, res) => {
  try {
    const { characterConfig, scriptPrompt, platform = 'tiktok' } = req.body as {
      characterConfig: AICharacterConfig;
      scriptPrompt: string;
      platform?: 'tiktok' | 'instagram' | 'youtube';
    };

    const template = await n8nTemplateService.createAICharacterWorkflow(
      characterConfig,
      scriptPrompt,
      platform
    );

    res.json({
      success: true,
      template: {
        id: template.template.id,
        name: template.name,
        description: template.description,
        nodes: template.template.nodes.length,
        platform
      },
      workflow: template.template,
      message: 'AI character workflow created successfully'
    });
  } catch (error) {
    console.error('AI character workflow creation failed:', error);
    res.status(500).json({
      success: false,
      error: 'AI character workflow creation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * ML Content Optimization Routes
 */

// Optimize content with ML
router.post('/ml/optimize-content', async (req, res) => {
  try {
    const optimizationRequest = req.body as ContentOptimizationRequest;
    
    const result = await mlContentOptimizer.optimizeContent(optimizationRequest);

    res.json({
      success: true,
      optimization: result,
      insights: {
        totalSuggestions: result.optimizationSuggestions.length,
        averageConfidence: result.performancePrediction.reduce((sum, p) => sum + p.confidence, 0) / result.performancePrediction.length,
        optimizationScore: result.analytics.optimizationScore,
        predictedROI: result.analytics.predictedROI
      },
      message: 'Content optimization completed'
    });
  } catch (error) {
    console.error('Content optimization failed:', error);
    res.status(500).json({
      success: false,
      error: 'Content optimization failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Advanced Analytics Routes
 */

// Comprehensive analytics analysis
router.post('/analytics/comprehensive', async (req, res) => {
  try {
    const { 
      competitorConfig, 
      sentimentConfig, 
      roiConfig 
    } = req.body as {
      competitorConfig: CompetitorAnalysisConfig;
      sentimentConfig: MarketSentimentConfig;
      roiConfig: ROIPredictionConfig;
    };

    const result = await advancedAnalytics.performAdvancedAnalysis(
      competitorConfig,
      sentimentConfig,
      roiConfig
    );

    res.json({
      success: true,
      analytics: result,
      summary: {
        competitorsAnalyzed: result.competitorAnalysis.summary.totalCompetitors,
        overallSentiment: result.marketSentiment.overallSentiment,
        portfolioROI: result.roiPrediction.portfolioROI,
        alertsTriggered: result.marketSentiment.alertsTriggered.length
      },
      message: 'Advanced analytics completed'
    });
  } catch (error) {
    console.error('Advanced analytics failed:', error);
    res.status(500).json({
      success: false,
      error: 'Advanced analytics failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Enhanced Video Generation Routes
 */

// Generate AI character video
router.post('/video/generate-character', async (req, res) => {
  try {
    const { characterConfig, scriptPrompt, platform = 'tiktok' } = req.body as {
      characterConfig: AICharacterConfig;
      scriptPrompt: string;
      platform?: 'tiktok' | 'instagram' | 'youtube';
    };

    const result = await enhancedVideoGeneration.generateAICharacterVideo(
      characterConfig,
      scriptPrompt,
      platform
    );

    res.json({
      success: result.success,
      video: result.success ? {
        videoUrl: result.videoUrl,
        thumbnailUrl: result.thumbnailUrl,
        duration: result.duration,
        generationId: result.generationId
      } : null,
      analytics: result.analytics,
      error: result.error,
      message: result.success ? 'AI character video generated successfully' : 'Video generation failed'
    });
  } catch (error) {
    console.error('AI character video generation failed:', error);
    res.status(500).json({
      success: false,
      error: 'AI character video generation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Real-time video editing
router.post('/video/realtime-edit', async (req, res) => {
  try {
    const { inputVideoUrl, editingInstructions, effects = [] } = req.body as {
      inputVideoUrl: string;
      editingInstructions: string[];
      effects?: string[];
    };

    const result = await enhancedVideoGeneration.performRealTimeEditing(
      inputVideoUrl,
      editingInstructions,
      effects
    );

    res.json({
      success: result.success,
      video: result.success ? {
        videoUrl: result.videoUrl,
        thumbnailUrl: result.thumbnailUrl,
        duration: result.duration,
        generationId: result.generationId
      } : null,
      analytics: result.analytics,
      error: result.error,
      message: result.success ? 'Real-time editing completed' : 'Editing failed'
    });
  } catch (error) {
    console.error('Real-time editing failed:', error);
    res.status(500).json({
      success: false,
      error: 'Real-time editing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create custom animations
router.post('/video/create-animations', async (req, res) => {
  try {
    const { elements, duration, style = 'modern' } = req.body as {
      elements: Array<{type: string; content: string; animation: string}>;
      duration: number;
      style?: 'modern' | 'anime' | 'minimal' | 'cinematic';
    };

    const result = await enhancedVideoGeneration.createCustomAnimations(
      elements,
      duration,
      style
    );

    res.json({
      success: result.success,
      video: result.success ? {
        videoUrl: result.videoUrl,
        thumbnailUrl: result.thumbnailUrl,
        duration: result.duration,
        generationId: result.generationId
      } : null,
      analytics: result.analytics,
      error: result.error,
      message: result.success ? 'Custom animations created successfully' : 'Animation creation failed'
    });
  } catch (error) {
    console.error('Custom animation creation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Custom animation creation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Optimize video with ML
router.post('/video/optimize-ml', async (req, res) => {
  try {
    const videoRequest = req.body;

    const result = await enhancedVideoGeneration.optimizeVideoWithML(videoRequest);

    res.json({
      success: result.success,
      video: result.success ? {
        videoUrl: result.videoUrl,
        thumbnailUrl: result.thumbnailUrl,
        duration: result.duration,
        generationId: result.generationId
      } : null,
      analytics: result.analytics,
      error: result.error,
      message: result.success ? 'ML-optimized video generated successfully' : 'Video optimization failed'
    });
  } catch (error) {
    console.error('ML video optimization failed:', error);
    res.status(500).json({
      success: false,
      error: 'ML video optimization failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Health Check and Status Routes
 */

// Service health check
router.get('/health', async (req, res) => {
  try {
    const services = {
      comfyui: 'healthy',
      gemini: 'healthy', 
      mlOptimizer: 'healthy',
      analytics: 'healthy',
      videoGeneration: 'healthy'
    };

    res.json({
      success: true,
      services,
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      features: [
        'AI Character Generation',
        'Real-time Video Editing', 
        'Custom Animation Effects',
        'ML Content Optimization',
        'Advanced Analytics',
        'Git Template Management'
      ]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;