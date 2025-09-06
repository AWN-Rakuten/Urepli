import { Router } from 'express';
import { N8nJapaneseNodes, JapaneseMarketContext } from '../services/n8n-japanese-nodes';

const router = Router();
const n8nJapaneseNodes = new N8nJapaneseNodes();

/**
 * Create Japanese Market Workflow
 */
router.post('/create-japanese-workflow', async (req, res) => {
  try {
    const { workflowName, marketContext } = req.body;
    
    if (!workflowName || !marketContext) {
      return res.status(400).json({ 
        error: 'workflowName and marketContext are required' 
      });
    }

    const workflow = await n8nJapaneseNodes.createJapaneseMarketWorkflow(
      workflowName,
      marketContext as JapaneseMarketContext
    );

    res.json({
      success: true,
      workflow,
      message: '日本市場向けワークフローが作成されました'
    });
  } catch (error) {
    console.error('Error creating Japanese workflow:', error);
    res.status(500).json({ 
      error: 'Failed to create Japanese workflow',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Deploy Workflow to n8n Instance
 */
router.post('/deploy-workflow', async (req, res) => {
  try {
    const { workflow } = req.body;
    
    if (!workflow) {
      return res.status(400).json({ error: 'Workflow data is required' });
    }

    const result = await n8nJapaneseNodes.deployWorkflowToN8n(workflow);
    
    if (result.success) {
      res.json({
        success: true,
        workflowId: result.workflowId,
        message: 'ワークフローがn8nにデプロイされました'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        message: 'ワークフローのデプロイに失敗しました'
      });
    }
  } catch (error) {
    console.error('Error deploying workflow:', error);
    res.status(500).json({ 
      error: 'Failed to deploy workflow',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Create Gemini-Optimized Workflow
 */
router.post('/create-gemini-workflow', async (req, res) => {
  try {
    const { prompt, marketContext } = req.body;
    
    if (!prompt || !marketContext) {
      return res.status(400).json({ 
        error: 'prompt and marketContext are required' 
      });
    }

    const workflow = await n8nJapaneseNodes.createGeminiOptimizedWorkflow(
      prompt,
      marketContext as JapaneseMarketContext
    );

    res.json({
      success: true,
      workflow,
      message: 'Gemini最適化ワークフローが作成されました'
    });
  } catch (error) {
    console.error('Error creating Gemini workflow:', error);
    res.status(500).json({ 
      error: 'Failed to create Gemini workflow',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get Japanese Workflow Templates
 */
router.get('/templates', (req, res) => {
  try {
    const templates = n8nJapaneseNodes.getJapaneseWorkflowTemplates();
    
    res.json({
      success: true,
      templates,
      totalTemplates: templates.length
    });
  } catch (error) {
    console.error('Error getting templates:', error);
    res.status(500).json({ error: 'Failed to get workflow templates' });
  }
});

/**
 * Create Individual Japanese Nodes
 */
router.post('/create-node/:nodeType', (req, res) => {
  try {
    const { nodeType } = req.params;
    const { nodeId, position, ...nodeParams } = req.body;
    
    if (!nodeId || !position) {
      return res.status(400).json({ 
        error: 'nodeId and position are required' 
      });
    }

    let node;
    
    switch (nodeType) {
      case 'content-localizer':
        node = n8nJapaneseNodes.createJapaneseContentLocalizationNode(
          nodeId,
          position,
          nodeParams.inputText,
          nodeParams.targetAudience
        );
        break;
        
      case 'carrier-comparison':
        node = n8nJapaneseNodes.createMNPCarrierComparisonNode(
          nodeId,
          position,
          nodeParams.currentCarrier,
          nodeParams.customerSegment
        );
        break;
        
      case 'timing-optimizer':
        node = n8nJapaneseNodes.createJapaneseTimingOptimizationNode(
          nodeId,
          position,
          nodeParams.platform,
          nodeParams.contentType
        );
        break;
        
      case 'hashtag-generator':
        node = n8nJapaneseNodes.createJapaneseHashtagGeneratorNode(
          nodeId,
          position,
          nodeParams.platform,
          nodeParams.maxHashtags
        );
        break;
        
      default:
        return res.status(400).json({ 
          error: 'Invalid node type. Supported types: content-localizer, carrier-comparison, timing-optimizer, hashtag-generator' 
        });
    }

    res.json({
      success: true,
      node,
      nodeType,
      message: `${nodeType}ノードが作成されました`
    });
  } catch (error) {
    console.error('Error creating node:', error);
    res.status(500).json({ 
      error: 'Failed to create node',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Analyze Workflow for Japanese Market Optimization
 */
router.post('/analyze-workflow/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;
    
    const analysis = await n8nJapaneseNodes.analyzeWorkflowForJapaneseMarket(workflowId);
    
    res.json({
      success: true,
      workflowId,
      analysis,
      message: 'ワークフロー分析が完了しました'
    });
  } catch (error) {
    console.error('Error analyzing workflow:', error);
    res.status(500).json({ 
      error: 'Failed to analyze workflow',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get Japanese Market Context Suggestions
 */
router.get('/market-context-suggestions', (req, res) => {
  try {
    const suggestions = {
      customerSegments: [
        { id: 'youth', name: '若年層 (18-25歳)', description: 'SNS活用、価格重視' },
        { id: 'business', name: 'ビジネス層 (26-45歳)', description: '安定性・サービス品質重視' },
        { id: 'senior', name: 'シニア層 (46歳以上)', description: 'サポート・分かりやすさ重視' },
        { id: 'family', name: 'ファミリー層', description: 'コストパフォーマンス・家族割重視' }
      ],
      conversionGoals: [
        { id: 'mnp_switch', name: 'MNP乗換', description: '他社からの番号ポータビリティ' },
        { id: 'plan_upgrade', name: 'プランアップグレード', description: '既存顧客のプラン変更' },
        { id: 'device_purchase', name: '端末購入', description: '新規端末購入促進' }
      ],
      targetCarriers: [
        { id: 'docomo', name: 'NTTドコモ', marketShare: 35.6 },
        { id: 'au', name: 'au (KDDI)', marketShare: 27.8 },
        { id: 'softbank', name: 'ソフトバンク', marketShare: 21.2 },
        { id: 'rakuten', name: '楽天モバイル', marketShare: 4.8 },
        { id: 'mvno', name: 'MVNO各社', marketShare: 10.6 }
      ],
      regions: [
        '関東地方', '関西地方', '中部地方', '九州地方', '東北地方', '中国地方', '四国地方', '北海道地方', '沖縄地方'
      ],
      urgencyLevels: [
        { id: 'low', name: '低', description: '長期的なキャンペーン' },
        { id: 'medium', name: '中', description: '期間限定キャンペーン' },
        { id: 'high', name: '高', description: '緊急・即時対応' }
      ]
    };

    res.json({
      success: true,
      suggestions,
      message: '日本市場コンテキスト情報'
    });
  } catch (error) {
    console.error('Error getting market context suggestions:', error);
    res.status(500).json({ error: 'Failed to get market context suggestions' });
  }
});

/**
 * Validate Japanese Market Context
 */
router.post('/validate-context', (req, res) => {
  try {
    const context = req.body as JapaneseMarketContext;
    const errors: string[] = [];
    
    // Validation rules
    if (!context.customerSegment || !['youth', 'business', 'senior', 'family'].includes(context.customerSegment)) {
      errors.push('Invalid customer segment');
    }
    
    if (!context.conversionGoal || !['mnp_switch', 'plan_upgrade', 'device_purchase'].includes(context.conversionGoal)) {
      errors.push('Invalid conversion goal');
    }
    
    if (!context.targetCarriers || !Array.isArray(context.targetCarriers) || context.targetCarriers.length === 0) {
      errors.push('At least one target carrier is required');
    }
    
    if (!context.budget || context.budget < 1000) {
      errors.push('Budget must be at least 1000 yen');
    }
    
    if (!context.urgency || !['low', 'medium', 'high'].includes(context.urgency)) {
      errors.push('Invalid urgency level');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        errors,
        message: 'コンテキスト検証エラー'
      });
    }

    // Calculate optimization score
    let optimizationScore = 70; // Base score
    
    if (context.budget > 50000) optimizationScore += 10;
    if (context.targetCarriers.length > 1) optimizationScore += 5;
    if (context.urgency === 'high') optimizationScore += 5;
    if (context.customerSegment === 'youth') optimizationScore += 5; // TikTok focus
    
    res.json({
      success: true,
      valid: true,
      optimizationScore,
      recommendations: [
        context.customerSegment === 'youth' ? 'TikTokに重点を置いた戦略を推奨' : '',
        context.budget > 100000 ? 'マルチキャリア戦略の実装を推奨' : '',
        context.urgency === 'high' ? 'リアルタイム最適化機能を有効化' : ''
      ].filter(Boolean),
      message: 'コンテキスト検証完了'
    });
  } catch (error) {
    console.error('Error validating context:', error);
    res.status(500).json({ 
      error: 'Failed to validate context',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;