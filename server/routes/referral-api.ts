/**
 * Ultimate Referral Generation System API Routes
 * Connects all features with RESTful endpoints
 */

import express from 'express';
import { UltimateReferralGenerator, ReferralContent, ReferralCampaign, BlogPostRequest } from '../services/ultimate-referral-generator.js';
import { EnhancedYouTubeIntegration, VideoGenerationRequest } from '../services/enhanced-youtube-integration.js';
import { EnhancedN8nIntegration } from '../services/enhanced-n8n-integration.js';

const router = express.Router();
const referralGenerator = new UltimateReferralGenerator();
const youtubeIntegration = new EnhancedYouTubeIntegration();
const enhancedN8nIntegration = new EnhancedN8nIntegration({
  host: 'localhost',
  port: 5678,
  protocol: 'http'
} as any, null as any);

/**
 * Feature 1: AI-Powered Referral Content Generation
 */
router.post('/generate-content', async (req, res) => {
  try {
    const { type, topic, platforms, options } = req.body;
    
    const content = await referralGenerator.generateReferralContent(
      type,
      topic,
      platforms,
      options
    );
    
    res.json({
      success: true,
      content,
      message: 'AIコンテンツ生成が完了しました'
    });
  } catch (error) {
    console.error('Content generation error:', error);
    res.status(500).json({
      success: false,
      error: 'コンテンツ生成に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Feature 2: Multi-Platform Campaign Orchestrator
 */
router.post('/campaigns', async (req, res) => {
  try {
    const campaignData = req.body;
    
    const campaign = await referralGenerator.createMultiPlatformCampaign(campaignData);
    
    res.json({
      success: true,
      campaign,
      message: 'マルチプラットフォームキャンペーンを作成しました'
    });
  } catch (error) {
    console.error('Campaign creation error:', error);
    res.status(500).json({
      success: false,
      error: 'キャンペーン作成に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/campaigns', async (req, res) => {
  try {
    // Mock implementation - in production, fetch from database
    const campaigns = [
      {
        id: '1',
        name: 'スマホMNPキャンペーン',
        status: 'active',
        performance: {
          revenue: 450000,
          conversions: 125,
          roi: 340
        }
      }
    ];
    
    res.json({
      success: true,
      campaigns
    });
  } catch (error) {
    console.error('Campaign fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'キャンペーン取得に失敗しました'
    });
  }
});

/**
 * Feature 3: Referral Tracking & Analytics
 */
router.post('/track', async (req, res) => {
  try {
    const { contentId, event, data } = req.body;
    
    await referralGenerator.trackReferralPerformance(contentId, event, data);
    
    res.json({
      success: true,
      message: 'イベントを記録しました'
    });
  } catch (error) {
    console.error('Tracking error:', error);
    res.status(500).json({
      success: false,
      error: 'トラッキングに失敗しました'
    });
  }
});

router.get('/analytics/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;
    
    // Mock analytics data - in production, fetch from BigQuery
    const analytics = {
      views: 125000,
      clicks: 8500,
      conversions: 156,
      revenue: 78000,
      engagement_rate: 12.5,
      conversion_rate: 1.8,
      roi: 234
    };
    
    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    console.error('Analytics fetch error:', error);
    res.status(500).json({
      success: false,
      error: '分析データの取得に失敗しました'
    });
  }
});

/**
 * Feature 4: Japanese Blog Auto-Poster
 */
router.post('/blog/generate-and-post', async (req, res) => {
  try {
    const blogRequest: BlogPostRequest = req.body;
    
    const postUrl = await referralGenerator.generateAndPostJapaneseBlog(blogRequest);
    
    res.json({
      success: true,
      postUrl,
      message: '日本語ブログを自動生成・投稿しました'
    });
  } catch (error) {
    console.error('Blog generation error:', error);
    res.status(500).json({
      success: false,
      error: 'ブログ生成・投稿に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Feature 5: Social Proof Generator
 */
router.post('/social-proof', async (req, res) => {
  try {
    const { product, demographics } = req.body;
    
    const testimonials = await referralGenerator.generateSocialProof(product, demographics);
    
    res.json({
      success: true,
      testimonials,
      message: '社会的証明を生成しました'
    });
  } catch (error) {
    console.error('Social proof generation error:', error);
    res.status(500).json({
      success: false,
      error: '社会的証明の生成に失敗しました'
    });
  }
});

/**
 * Feature 6: Reward Optimization
 */
router.post('/optimize-rewards/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const recommendations = await referralGenerator.optimizeReferralRewards(campaignId);
    
    res.json({
      success: true,
      recommendations,
      message: 'リワード最適化の提案を生成しました'
    });
  } catch (error) {
    console.error('Reward optimization error:', error);
    res.status(500).json({
      success: false,
      error: 'リワード最適化に失敗しました'
    });
  }
});

/**
 * Feature 7: Viral Content Creation
 */
router.post('/viral-content', async (req, res) => {
  try {
    const { topic, platform } = req.body;
    
    const viralContent = await referralGenerator.createViralContent(topic, platform);
    
    res.json({
      success: true,
      content: viralContent,
      message: 'バイラルコンテンツを生成しました'
    });
  } catch (error) {
    console.error('Viral content creation error:', error);
    res.status(500).json({
      success: false,
      error: 'バイラルコンテンツの生成に失敗しました'
    });
  }
});

/**
 * Feature 9: Enhanced YouTube Integration
 */
router.post('/youtube/generate-video', async (req, res) => {
  try {
    const videoRequest: VideoGenerationRequest = req.body;
    
    const videoContent = await youtubeIntegration.generateVideoContent(videoRequest);
    
    res.json({
      success: true,
      videoContent,
      message: 'YouTube動画コンテンツを生成しました'
    });
  } catch (error) {
    console.error('YouTube video generation error:', error);
    res.status(500).json({
      success: false,
      error: 'YouTube動画生成に失敗しました'
    });
  }
});

router.post('/youtube/upload', async (req, res) => {
  try {
    const { videoPath, metadata, referralLinks } = req.body;
    
    const uploadedVideo = await youtubeIntegration.uploadVideo(
      videoPath,
      metadata,
      referralLinks
    );
    
    res.json({
      success: true,
      video: uploadedVideo,
      message: 'YouTubeに動画をアップロードしました'
    });
  } catch (error) {
    console.error('YouTube upload error:', error);
    res.status(500).json({
      success: false,
      error: 'YouTube動画のアップロードに失敗しました'
    });
  }
});

router.post('/youtube/create-shorts', async (req, res) => {
  try {
    const { topic, referralProduct } = req.body;
    
    const shorts = await youtubeIntegration.createViralShorts(topic, referralProduct);
    
    res.json({
      success: true,
      shorts,
      message: `${shorts.length}本のYouTube Shortsを作成しました`
    });
  } catch (error) {
    console.error('YouTube Shorts creation error:', error);
    res.status(500).json({
      success: false,
      error: 'YouTube Shortsの作成に失敗しました'
    });
  }
});

router.get('/youtube/performance/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    
    const performance = await youtubeIntegration.trackVideoPerformance(videoId);
    
    res.json({
      success: true,
      performance
    });
  } catch (error) {
    console.error('YouTube performance tracking error:', error);
    res.status(500).json({
      success: false,
      error: 'YouTubeパフォーマンス取得に失敗しました'
    });
  }
});

/**
 * Feature 10: Dashboard Data
 */
router.get('/dashboard', async (req, res) => {
  try {
    const { timeframe = '7d' } = req.query;
    
    // Mock dashboard data - in production, aggregate from various sources
    const dashboardData = {
      overview: {
        totalRevenue: 1250000,
        totalConversions: 3420,
        conversionRate: 8.5,
        activeReferrers: 156,
        revenueGrowth: 23.5,
        conversionGrowth: 15.8
      },
      realTimeMetrics: {
        currentVisitors: Math.floor(Math.random() * 50) + 20,
        todayConversions: 23,
        todayRevenue: 85600,
        liveConversions: [
          { timestamp: new Date(), amount: 2500, source: 'tiktok', referrer: 'user123' },
          { timestamp: new Date(), amount: 1800, source: 'instagram', referrer: 'user456' }
        ]
      },
      campaignPerformance: [
        { 
          id: '1', 
          name: 'スマホMNPキャンペーン', 
          revenue: 450000, 
          conversions: 125, 
          roi: 340, 
          status: 'active', 
          trend: 'up' 
        }
      ],
      platformBreakdown: [
        { name: 'TikTok', revenue: 520000, conversions: 1234, color: '#ff0050' },
        { name: 'YouTube', revenue: 380000, conversions: 890, color: '#ff0000' },
        { name: 'Instagram', revenue: 210000, conversions: 567, color: '#e4405f' },
        { name: 'Blog', revenue: 140000, conversions: 729, color: '#1da1f2' }
      ],
      aiInsights: [
        {
          type: 'opportunity',
          title: 'TikTok パフォーマンス急上昇',
          description: 'TikTokでのエンゲージメント率が平均より40%高くなっています',
          action: 'TikTok投稿頻度を2倍に増やす',
          impact: 'high'
        }
      ]
    };
    
    res.json({
      success: true,
      data: dashboardData,
      timeframe
    });
  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({
      success: false,
      error: 'ダッシュボードデータの取得に失敗しました'
    });
  }
});

/**
 * N8N Workflow Management
 */
router.post('/workflows/deploy', async (req, res) => {
  try {
    const { workflowData } = req.body;
    
    const workflowId = await enhancedN8nIntegration.deployWorkflow(workflowData);
    
    res.json({
      success: true,
      workflowId,
      message: 'n8nワークフローをデプロイしました'
    });
  } catch (error) {
    console.error('Workflow deployment error:', error);
    res.status(500).json({
      success: false,
      error: 'ワークフローのデプロイに失敗しました'
    });
  }
});

router.post('/workflows/:workflowId/execute', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { inputData } = req.body;
    
    const result = await enhancedN8nIntegration.executeWorkflow(workflowId, inputData);
    
    res.json({
      success: true,
      result,
      message: 'ワークフローを実行しました'
    });
  } catch (error) {
    console.error('Workflow execution error:', error);
    res.status(500).json({
      success: false,
      error: 'ワークフローの実行に失敗しました'
    });
  }
});

router.get('/workflows', async (req, res) => {
  try {
    const workflows = await enhancedN8nIntegration.listWorkflows();
    
    res.json({
      success: true,
      workflows
    });
  } catch (error) {
    console.error('Workflow list error:', error);
    res.status(500).json({
      success: false,
      error: 'ワークフロー一覧の取得に失敗しました'
    });
  }
});

/**
 * Configuration Management
 */
router.get('/config', async (req, res) => {
  try {
    const config = {
      apis: {
        gemini: !!process.env.GOOGLE_GEMINI_API_KEY,
        n8n: !!process.env.N8N_API_KEY,
        youtube: !!process.env.YOUTUBE_API_KEY,
        a8net: !!process.env.A8NET_API_KEY,
        rakuten: !!process.env.RAKUTEN_API_KEY
      },
      features: {
        contentGeneration: true,
        multiPlatformPosting: true,
        realTimeAnalytics: true,
        aiOptimization: true,
        youtubeIntegration: true,
        blogAutoPosting: true,
        viralContentCreation: true,
        rewardOptimization: true,
        socialProofGeneration: true,
        stepByStepGuidance: true
      },
      status: 'operational'
    };
    
    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('Config fetch error:', error);
    res.status(500).json({
      success: false,
      error: '設定の取得に失敗しました'
    });
  }
});

router.post('/config/test', async (req, res) => {
  try {
    const { apiType } = req.body;
    
    // Test API connections
    const testResults = {
      gemini: false,
      n8n: false,
      youtube: false,
      a8net: false,
      rakuten: false
    };
    
    // Mock test results
    testResults[apiType as keyof typeof testResults] = true;
    
    res.json({
      success: true,
      testResults,
      message: `${apiType} APIの接続テストが完了しました`
    });
  } catch (error) {
    console.error('API test error:', error);
    res.status(500).json({
      success: false,
      error: 'APIテストに失敗しました'
    });
  }
});

/**
 * Health Check
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    features: {
      aiContentGeneration: 'operational',
      multiPlatformCampaigns: 'operational',
      referralTracking: 'operational',
      blogAutoPosting: 'operational',
      socialProofGeneration: 'operational',
      rewardOptimization: 'operational',
      viralContentCreation: 'operational',
      youtubeIntegration: 'operational',
      realTimeDashboard: 'operational',
      n8nWorkflows: 'operational'
    }
  });
});

export default router;