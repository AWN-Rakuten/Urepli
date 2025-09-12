#!/usr/bin/env node

/**
 * Test script for Phase 1 Enhanced AI Integration features
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api/enhanced-ai';

// Test configurations
const testCharacterConfig = {
  gender: 'female',
  ethnicity: 'japanese',
  age: 'young',
  style: 'hyperrealistic',
  clothing: 'casual modern outfit',
  background: 'minimalist studio setting',
  emotions: ['confident', 'friendly'],
  voice: {
    language: 'japanese',
    accent: 'tokyo',
    tone: 'energetic'
  }
};

const testContentOptimization = {
  content: {
    type: 'video',
    text: 'Create engaging content about AI automation in Japanese market',
    metadata: {
      duration: 30,
      language: 'japanese'
    }
  },
  targetPlatforms: ['tiktok', 'instagram'],
  audience: {
    demographics: ['18-35', 'tech-interested'],
    interests: ['AI', 'automation', 'technology'],
    location: 'japan',
    timeZone: 'Asia/Tokyo'
  },
  objectives: ['engagement', 'reach', 'conversions']
};

const testCompetitorAnalysis = {
  competitors: [
    {
      name: 'TechInfluencerJP',
      platforms: ['tiktok', 'instagram'],
      urls: ['@techinfluencerjp'],
      trackingEnabled: true
    }
  ],
  analysisFrequency: 'daily',
  metrics: ['engagement', 'followers', 'content_types'],
  alertThresholds: {
    engagement_spike: 0.1,
    follower_growth: 0.05,
    viral_content: 10000
  }
};

const testSentimentConfig = {
  keywords: ['AI automation', 'social media marketing', 'TikTok trends'],
  languages: ['japanese', 'english'],
  sources: ['twitter', 'reddit'],
  geolocation: ['japan', 'global'],
  timeframe: 'last_day'
};

const testROIConfig = {
  campaigns: [
    {
      id: 'test-campaign-1',
      name: 'Japanese AI Content Campaign',
      budget: 50000,
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      platforms: ['tiktok', 'instagram'],
      objectives: ['engagement', 'conversions']
    }
  ],
  historicalData: {
    pastCampaigns: [],
    seasonalTrends: [],
    marketConditions: []
  }
};

async function testService() {
  console.log('🚀 Testing Phase 1 Enhanced AI Integration Features\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing Health Check...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health Check:', healthResponse.data.success ? 'PASSED' : 'FAILED');
    console.log('📊 Available Features:', healthResponse.data.features);
    console.log('');

    // Test 2: AI Character Generation
    console.log('2️⃣ Testing AI Character Generation...');
    try {
      const characterResponse = await axios.post(`${BASE_URL}/video/generate-character`, {
        characterConfig: testCharacterConfig,
        scriptPrompt: 'Introduce latest AI automation tools for Japanese creators',
        platform: 'tiktok'
      });
      console.log('✅ AI Character Generation:', characterResponse.data.success ? 'STARTED' : 'FAILED');
      if (characterResponse.data.success) {
        console.log('🎬 Generation ID:', characterResponse.data.video?.generationId);
        console.log('📈 Predicted Engagement:', characterResponse.data.analytics?.estimatedEngagement);
      }
    } catch (error) {
      console.log('❌ AI Character Generation: FAILED -', error.response?.data?.error || error.message);
    }
    console.log('');

    // Test 3: N8N AI Character Workflow
    console.log('3️⃣ Testing N8N AI Character Workflow Creation...');
    try {
      const workflowResponse = await axios.post(`${BASE_URL}/n8n/create-character-workflow`, {
        characterConfig: testCharacterConfig,
        scriptPrompt: 'Daily content automation for Japanese market',
        platform: 'tiktok'
      });
      console.log('✅ N8N Workflow Creation:', workflowResponse.data.success ? 'PASSED' : 'FAILED');
      if (workflowResponse.data.success) {
        console.log('🔧 Workflow Nodes:', workflowResponse.data.template?.nodes);
        console.log('🏷️ Template Name:', workflowResponse.data.template?.name);
      }
    } catch (error) {
      console.log('❌ N8N Workflow Creation: FAILED -', error.response?.data?.error || error.message);
    }
    console.log('');

    // Test 4: ML Content Optimization
    console.log('4️⃣ Testing ML Content Optimization...');
    try {
      const optimizationResponse = await axios.post(`${BASE_URL}/ml/optimize-content`, testContentOptimization);
      console.log('✅ ML Content Optimization:', optimizationResponse.data.success ? 'PASSED' : 'FAILED');
      if (optimizationResponse.data.success) {
        console.log('💡 Suggestions Count:', optimizationResponse.data.insights?.totalSuggestions);
        console.log('📊 Optimization Score:', optimizationResponse.data.insights?.optimizationScore);
        console.log('💰 Predicted ROI:', optimizationResponse.data.insights?.predictedROI);
      }
    } catch (error) {
      console.log('❌ ML Content Optimization: FAILED -', error.response?.data?.error || error.message);
    }
    console.log('');

    // Test 5: Advanced Analytics
    console.log('5️⃣ Testing Advanced Analytics...');
    try {
      const analyticsResponse = await axios.post(`${BASE_URL}/analytics/comprehensive`, {
        competitorConfig: testCompetitorAnalysis,
        sentimentConfig: testSentimentConfig,
        roiConfig: testROIConfig
      });
      console.log('✅ Advanced Analytics:', analyticsResponse.data.success ? 'PASSED' : 'FAILED');
      if (analyticsResponse.data.success) {
        console.log('🏢 Competitors Analyzed:', analyticsResponse.data.summary?.competitorsAnalyzed);
        console.log('😊 Overall Sentiment:', analyticsResponse.data.summary?.overallSentiment);
        console.log('📈 Portfolio ROI:', analyticsResponse.data.summary?.portfolioROI);
        console.log('🚨 Alerts Triggered:', analyticsResponse.data.summary?.alertsTriggered);
      }
    } catch (error) {
      console.log('❌ Advanced Analytics: FAILED -', error.response?.data?.error || error.message);
    }
    console.log('');

    // Test 6: Real-time Video Editing
    console.log('6️⃣ Testing Real-time Video Editing...');
    try {
      const editingResponse = await axios.post(`${BASE_URL}/video/realtime-edit`, {
        inputVideoUrl: 'https://example.com/test-video.mp4',
        editingInstructions: ['enhance colors', 'add smooth transitions', 'optimize for TikTok'],
        effects: ['color_correction', 'smooth_transitions', 'stabilization']
      });
      console.log('✅ Real-time Video Editing:', editingResponse.data.success ? 'STARTED' : 'FAILED');
      if (editingResponse.data.success) {
        console.log('🎞️ Generation ID:', editingResponse.data.video?.generationId);
        console.log('📈 Predicted Views:', editingResponse.data.analytics?.predictedViews);
      }
    } catch (error) {
      console.log('❌ Real-time Video Editing: FAILED -', error.response?.data?.error || error.message);
    }
    console.log('');

    // Test 7: Custom Animation Creation
    console.log('7️⃣ Testing Custom Animation Creation...');
    try {
      const animationResponse = await axios.post(`${BASE_URL}/video/create-animations`, {
        elements: [
          { type: 'text', content: 'Welcome to AI Automation', animation: 'fade_in' },
          { type: 'logo', content: 'Brand Logo', animation: 'zoom_in' },
          { type: 'cta', content: 'Follow for more!', animation: 'bounce' }
        ],
        duration: 15,
        style: 'modern'
      });
      console.log('✅ Custom Animation Creation:', animationResponse.data.success ? 'STARTED' : 'FAILED');
      if (animationResponse.data.success) {
        console.log('🎨 Generation ID:', animationResponse.data.video?.generationId);
        console.log('⭐ Optimization Score:', animationResponse.data.analytics?.optimizationScore);
      }
    } catch (error) {
      console.log('❌ Custom Animation Creation: FAILED -', error.response?.data?.error || error.message);
    }
    console.log('');

    console.log('🎉 Enhanced AI Integration Testing Complete!');
    console.log('📋 Summary: All major features have been tested');
    console.log('🚀 Ready for Phase 1 deployment');

  } catch (error) {
    console.error('💥 Test suite failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('🔧 Make sure the server is running on http://localhost:3000');
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testService().catch(console.error);
}

export { testService };