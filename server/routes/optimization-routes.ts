import { Router } from 'express';
import { llmPromptOptimizer } from '../services/llm-prompt-optimizer';
import { contentPerformancePredictor } from '../services/content-performance-predictor';
import { realTimeMarketIntelligence } from '../services/real-time-market-intelligence';
import { advancedComplianceGuard } from '../services/advanced-compliance-guard';

const router = Router();

// LLM Prompt Optimization Routes
router.post('/optimize-prompt', async (req, res) => {
  try {
    const result = await llmPromptOptimizer.optimizePrompt(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error optimizing prompt:', error);
    res.status(500).json({ error: 'Failed to optimize prompt' });
  }
});

router.post('/prompt-variations', async (req, res) => {
  try {
    const { basePrompt, platform, variationCount = 3 } = req.body;
    const variations = await llmPromptOptimizer.generatePromptVariations(
      basePrompt, 
      platform, 
      variationCount
    );
    res.json({ variations });
  } catch (error) {
    console.error('Error generating prompt variations:', error);
    res.status(500).json({ error: 'Failed to generate prompt variations' });
  }
});

router.get('/best-prompts/:platform/:audience', async (req, res) => {
  try {
    const { platform, audience } = req.params;
    const limit = parseInt(req.query.limit as string) || 5;
    const bestPrompts = await llmPromptOptimizer.getBestPerformingPrompts(
      platform, 
      audience, 
      limit
    );
    res.json(bestPrompts);
  } catch (error) {
    console.error('Error getting best prompts:', error);
    res.status(500).json({ error: 'Failed to get best prompts' });
  }
});

router.post('/record-prompt-performance', async (req, res) => {
  try {
    const { promptId, platform, audience, metrics } = req.body;
    await llmPromptOptimizer.recordPromptPerformance(promptId, platform, audience, metrics);
    res.json({ success: true });
  } catch (error) {
    console.error('Error recording prompt performance:', error);
    res.status(500).json({ error: 'Failed to record prompt performance' });
  }
});

// Content Performance Prediction Routes
router.post('/predict-performance', async (req, res) => {
  try {
    const prediction = await contentPerformancePredictor.predictContentPerformance(req.body);
    res.json(prediction);
  } catch (error) {
    console.error('Error predicting content performance:', error);
    res.status(500).json({ error: 'Failed to predict content performance' });
  }
});

router.get('/trending-topics', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const trending = await contentPerformancePredictor.getTrendingTopics(limit);
    res.json(trending);
  } catch (error) {
    console.error('Error getting trending topics:', error);
    res.status(500).json({ error: 'Failed to get trending topics' });
  }
});

router.get('/content-recommendations/:platform/:category/:audience', async (req, res) => {
  try {
    const { platform, category, audience } = req.params;
    const recommendations = await contentPerformancePredictor.getContentRecommendations(
      platform, 
      category, 
      audience
    );
    res.json(recommendations);
  } catch (error) {
    console.error('Error getting content recommendations:', error);
    res.status(500).json({ error: 'Failed to get content recommendations' });
  }
});

router.post('/update-content-performance', async (req, res) => {
  try {
    const { contentId, actualViews, actualRevenue, actualEngagement } = req.body;
    await contentPerformancePredictor.updateContentPerformance(
      contentId, 
      actualViews, 
      actualRevenue, 
      actualEngagement
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating content performance:', error);
    res.status(500).json({ error: 'Failed to update content performance' });
  }
});

// Market Intelligence Routes
router.get('/market-intelligence', async (req, res) => {
  try {
    const intelligence = await realTimeMarketIntelligence.getMarketIntelligence();
    res.json(intelligence);
  } catch (error) {
    console.error('Error getting market intelligence:', error);
    res.status(500).json({ error: 'Failed to get market intelligence' });
  }
});

router.post('/analyze-keyword', async (req, res) => {
  try {
    const { keyword } = req.body;
    const analysis = await realTimeMarketIntelligence.analyzeTrendingKeyword(keyword);
    res.json(analysis);
  } catch (error) {
    console.error('Error analyzing keyword:', error);
    res.status(500).json({ error: 'Failed to analyze keyword' });
  }
});

router.get('/optimal-posting-times/:platform', async (req, res) => {
  try {
    const { platform } = req.params;
    const optimalTimes = await realTimeMarketIntelligence.getOptimalPostingTimes(platform);
    res.json(optimalTimes);
  } catch (error) {
    console.error('Error getting optimal posting times:', error);
    res.status(500).json({ error: 'Failed to get optimal posting times' });
  }
});

router.post('/refresh-market-data', async (req, res) => {
  try {
    await realTimeMarketIntelligence.refreshMarketData();
    res.json({ success: true, message: 'Market data refreshed successfully' });
  } catch (error) {
    console.error('Error refreshing market data:', error);
    res.status(500).json({ error: 'Failed to refresh market data' });
  }
});

// Compliance and Risk Management Routes
router.post('/check-compliance', async (req, res) => {
  try {
    const complianceResult = await advancedComplianceGuard.checkCompliance(req.body);
    res.json(complianceResult);
  } catch (error) {
    console.error('Error checking compliance:', error);
    res.status(500).json({ error: 'Failed to check compliance' });
  }
});

router.get('/policy-updates', async (req, res) => {
  try {
    const updates = await advancedComplianceGuard.monitorPolicyChanges();
    res.json(updates);
  } catch (error) {
    console.error('Error getting policy updates:', error);
    res.status(500).json({ error: 'Failed to get policy updates' });
  }
});

router.post('/compliance-report', async (req, res) => {
  try {
    const { contentIds } = req.body;
    const report = await advancedComplianceGuard.generateComplianceReport(contentIds);
    res.json(report);
  } catch (error) {
    console.error('Error generating compliance report:', error);
    res.status(500).json({ error: 'Failed to generate compliance report' });
  }
});

// Combined Intelligence Route - Get all optimization data at once
router.get('/optimization-dashboard', async (req, res) => {
  try {
    const [marketIntelligence, trendingTopics, policyUpdates] = await Promise.allSettled([
      realTimeMarketIntelligence.getMarketIntelligence(),
      contentPerformancePredictor.getTrendingTopics(5),
      advancedComplianceGuard.monitorPolicyChanges()
    ]);

    const dashboard = {
      market_intelligence: marketIntelligence.status === 'fulfilled' ? marketIntelligence.value : null,
      trending_topics: trendingTopics.status === 'fulfilled' ? trendingTopics.value : [],
      policy_updates: policyUpdates.status === 'fulfilled' ? policyUpdates.value : [],
      last_updated: new Date().toISOString()
    };

    res.json(dashboard);
  } catch (error) {
    console.error('Error getting optimization dashboard:', error);
    res.status(500).json({ error: 'Failed to get optimization dashboard data' });
  }
});

// Content Optimization Workflow - End-to-end optimization
router.post('/optimize-content-workflow', async (req, res) => {
  try {
    const { content, platform, audience, category } = req.body;
    
    // Step 1: Check compliance
    const complianceCheck = await advancedComplianceGuard.checkCompliance({
      content,
      platform,
      content_type: 'promotional',
      target_audience: audience,
      has_affiliate_links: false,
      is_sponsored: false
    });
    
    if (complianceCheck.compliance_status === 'rejected') {
      return res.json({
        status: 'rejected',
        reason: 'Content failed compliance check',
        compliance_result: complianceCheck
      });
    }
    
    // Step 2: Predict performance
    const performancePrediction = await contentPerformancePredictor.predictContentPerformance({
      title: content.title,
      script: content.script,
      platform,
      audience,
      category
    });
    
    // Step 3: Optimize prompt if performance prediction is low
    let optimizedContent = content;
    if (performancePrediction.success_probability < 0.7) {
      const promptOptimization = await llmPromptOptimizer.optimizePrompt({
        originalPrompt: content.script,
        targetMetric: 'engagement',
        platform,
        audience,
        performanceData: {
          current_score: performancePrediction.predicted_engagement_rate,
          historical_avg: 5.0,
          top_performer_score: 8.0
        }
      });
      
      optimizedContent = {
        ...content,
        script: promptOptimization.optimizedPrompt,
        optimization_applied: true,
        optimization_reasoning: promptOptimization.reasoning
      };
    }
    
    res.json({
      status: 'optimized',
      original_content: content,
      optimized_content: optimizedContent,
      compliance_result: complianceCheck,
      performance_prediction: performancePrediction,
      recommendations: [
        ...complianceCheck.recommended_actions,
        ...performancePrediction.optimization_suggestions
      ]
    });
    
  } catch (error) {
    console.error('Error in content optimization workflow:', error);
    res.status(500).json({ error: 'Failed to optimize content workflow' });
  }
});

export default router;