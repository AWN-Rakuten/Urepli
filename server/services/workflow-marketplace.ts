import { IStorage } from '../storage';
import { GoogleGenAI } from "@google/genai";

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'content_generation' | 'campaign_management' | 'analytics' | 'optimization' | 'custom';
  platform: 'tiktok' | 'instagram' | 'both' | 'universal';
  targetMarket: 'japan' | 'global' | 'asia';
  complexity: 'beginner' | 'intermediate' | 'advanced';
  estimatedROI: number;
  implementationTime: number; // minutes
  template: {
    nodes: WorkflowNode[];
    connections: WorkflowConnection[];
    triggers: WorkflowTrigger[];
    outputs: WorkflowOutput[];
  };
  metadata: {
    author: string;
    version: string;
    tags: string[];
    rating: number;
    downloads: number;
    lastUpdated: Date;
    aiCurationScore: number;
    performanceMetrics: {
      avgROAS: number;
      successRate: number;
      processingTime: number;
    };
  };
}

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'integration' | 'ai' | 'optimization';
  name: string;
  config: any;
  position: { x: number; y: number };
  inputs: string[];
  outputs: string[];
}

export interface WorkflowConnection {
  id: string;
  source: string;
  target: string;
  condition?: string;
}

export interface WorkflowTrigger {
  type: 'schedule' | 'webhook' | 'market_event' | 'performance_threshold';
  config: any;
}

export interface WorkflowOutput {
  type: 'content' | 'campaign' | 'analytics' | 'notification';
  destination: string;
  format: string;
}

export interface MarketplaceRecommendation {
  templateId: string;
  score: number;
  reasoning: string;
  benefits: string[];
  estimatedImpact: {
    revenueIncrease: number;
    timesSaved: number;
    automationLevel: number;
  };
}

export class WorkflowMarketplace {
  private ai: GoogleGenAI;
  private storage: IStorage;
  private templates: Map<string, WorkflowTemplate> = new Map();
  private userPreferences: Map<string, any> = new Map();

  constructor(storage: IStorage) {
    this.storage = storage;
    this.ai = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY || "" 
    });
    this.initializeMarketplace();
  }

  private async initializeMarketplace() {
    // Initialize with high-quality Japanese market templates
    const templates: WorkflowTemplate[] = [
      {
        id: 'japanese_viral_content_pipeline',
        name: 'Japanese Viral Content Pipeline',
        description: '日本市場向けバイラルコンテンツ自動生成パイプライン。トレンド分析、感情マーケティング、最適タイミング配信を組み合わせ',
        category: 'content_generation',
        platform: 'both',
        targetMarket: 'japan',
        complexity: 'advanced',
        estimatedROI: 3.2,
        implementationTime: 45,
        template: {
          nodes: [
            {
              id: 'trend_monitor',
              type: 'trigger',
              name: 'Japanese Trend Monitor',
              config: { keywords: ['バズり', 'トレンド', '話題'], interval: '1h' },
              position: { x: 0, y: 0 },
              inputs: [],
              outputs: ['trending_data']
            },
            {
              id: 'gemini_content_gen',
              type: 'ai',
              name: 'Gemini Japanese Content Generator',
              config: { 
                model: 'gemini-2.5-pro',
                temperature: 0.8,
                audience: '20-30代',
                style: 'kawaii'
              },
              position: { x: 200, y: 0 },
              inputs: ['trending_data'],
              outputs: ['content_ideas']
            },
            {
              id: 'emotion_optimizer',
              type: 'optimization',
              name: 'Emotion-Based Optimizer',
              config: { emotions: ['ワクワク', 'ドキドキ', 'ほっこり'] },
              position: { x: 400, y: 0 },
              inputs: ['content_ideas'],
              outputs: ['optimized_content']
            },
            {
              id: 'timing_scheduler',
              type: 'optimization',
              name: 'Optimal Timing Scheduler',
              config: { timezone: 'Asia/Tokyo', audience_active_hours: ['07:00-09:00', '19:00-21:00'] },
              position: { x: 600, y: 0 },
              inputs: ['optimized_content'],
              outputs: ['scheduled_content']
            }
          ],
          connections: [
            { id: 'c1', source: 'trend_monitor', target: 'gemini_content_gen' },
            { id: 'c2', source: 'gemini_content_gen', target: 'emotion_optimizer' },
            { id: 'c3', source: 'emotion_optimizer', target: 'timing_scheduler' }
          ],
          triggers: [
            { type: 'schedule', config: { cron: '0 */2 * * *' } },
            { type: 'market_event', config: { threshold: 'trending_score > 70' } }
          ],
          outputs: [
            { type: 'content', destination: 'tiktok', format: 'video' },
            { type: 'content', destination: 'instagram', format: 'reel' }
          ]
        },
        metadata: {
          author: 'AI Automation Labs',
          version: '2.1.0',
          tags: ['japanese', 'viral', 'content', 'emotion', 'trending'],
          rating: 4.8,
          downloads: 1247,
          lastUpdated: new Date(),
          aiCurationScore: 92,
          performanceMetrics: {
            avgROAS: 3.2,
            successRate: 0.84,
            processingTime: 120
          }
        }
      },
      {
        id: 'mnp_campaign_automation',
        name: 'MNP Campaign Automation Suite',
        description: 'MNP乗り換えキャンペーン完全自動化。競合分析、価格最適化、タイミング戦略、承認フローを統合',
        category: 'campaign_management',
        platform: 'both',
        targetMarket: 'japan',
        complexity: 'advanced',
        estimatedROI: 4.1,
        implementationTime: 60,
        template: {
          nodes: [
            {
              id: 'competitor_monitor',
              type: 'integration',
              name: 'Competitor Price Monitor',
              config: { sources: ['docomo', 'au', 'softbank'], check_interval: '30m' },
              position: { x: 0, y: 0 },
              inputs: [],
              outputs: ['price_data']
            },
            {
              id: 'dynamic_pricing',
              type: 'ai',
              name: 'Dynamic Pricing AI',
              config: { model: 'optimization', strategy: 'undercut_by_percent', margin: 0.15 },
              position: { x: 200, y: 0 },
              inputs: ['price_data'],
              outputs: ['optimal_pricing']
            },
            {
              id: 'campaign_generator',
              type: 'ai',
              name: 'Campaign Content Generator',
              config: { focus: 'price_advantage', tone: 'urgent_but_trustworthy' },
              position: { x: 400, y: 0 },
              inputs: ['optimal_pricing'],
              outputs: ['campaign_content']
            },
            {
              id: 'approval_gate',
              type: 'condition',
              name: 'Human Approval Gate',
              config: { threshold: 'high_impact_campaigns', approvers: ['marketing_manager'] },
              position: { x: 600, y: 0 },
              inputs: ['campaign_content'],
              outputs: ['approved_content']
            },
            {
              id: 'multi_platform_deploy',
              type: 'action',
              name: 'Multi-Platform Deployment',
              config: { platforms: ['meta', 'tiktok'], budget_split: [0.7, 0.3] },
              position: { x: 800, y: 0 },
              inputs: ['approved_content'],
              outputs: ['live_campaigns']
            }
          ],
          connections: [
            { id: 'c1', source: 'competitor_monitor', target: 'dynamic_pricing' },
            { id: 'c2', source: 'dynamic_pricing', target: 'campaign_generator' },
            { id: 'c3', source: 'campaign_generator', target: 'approval_gate' },
            { id: 'c4', source: 'approval_gate', target: 'multi_platform_deploy', condition: 'approved === true' }
          ],
          triggers: [
            { type: 'market_event', config: { event: 'competitor_price_change' } },
            { type: 'schedule', config: { cron: '0 9 * * 1,3,5' } }
          ],
          outputs: [
            { type: 'campaign', destination: 'meta_ads', format: 'json' },
            { type: 'campaign', destination: 'tiktok_ads', format: 'json' },
            { type: 'notification', destination: 'slack', format: 'message' }
          ]
        },
        metadata: {
          author: 'MNP Marketing Experts',
          version: '1.5.2',
          tags: ['mnp', 'telecom', 'pricing', 'automation', 'approval'],
          rating: 4.6,
          downloads: 892,
          lastUpdated: new Date(),
          aiCurationScore: 89,
          performanceMetrics: {
            avgROAS: 4.1,
            successRate: 0.91,
            processingTime: 180
          }
        }
      },
      {
        id: 'predictive_budget_optimizer',
        name: 'Predictive Budget Optimizer',
        description: '機械学習による予測的予算最適化。市場パターン、季節性、競合動向を学習し自動調整',
        category: 'optimization',
        platform: 'universal',
        targetMarket: 'japan',
        complexity: 'advanced',
        estimatedROI: 2.8,
        implementationTime: 40,
        template: {
          nodes: [
            {
              id: 'market_data_collector',
              type: 'integration',
              name: 'Market Data Collector',
              config: { sources: ['google_trends', 'social_media_apis', 'economic_indicators'] },
              position: { x: 0, y: 0 },
              inputs: [],
              outputs: ['market_signals']
            },
            {
              id: 'ml_predictor',
              type: 'ai',
              name: 'ML Budget Predictor',
              config: { algorithm: 'thompson_sampling', features: ['seasonality', 'trends', 'competition'] },
              position: { x: 200, y: 0 },
              inputs: ['market_signals'],
              outputs: ['predictions']
            },
            {
              id: 'risk_assessor',
              type: 'optimization',
              name: 'Risk Assessment Engine',
              config: { risk_tolerance: 'moderate', max_daily_change: 0.2 },
              position: { x: 400, y: 0 },
              inputs: ['predictions'],
              outputs: ['risk_adjusted_budgets']
            },
            {
              id: 'budget_executor',
              type: 'action',
              name: 'Budget Allocation Executor',
              config: { platforms: ['meta', 'tiktok'], update_frequency: 'hourly' },
              position: { x: 600, y: 0 },
              inputs: ['risk_adjusted_budgets'],
              outputs: ['applied_budgets']
            }
          ],
          connections: [
            { id: 'c1', source: 'market_data_collector', target: 'ml_predictor' },
            { id: 'c2', source: 'ml_predictor', target: 'risk_assessor' },
            { id: 'c3', source: 'risk_assessor', target: 'budget_executor' }
          ],
          triggers: [
            { type: 'schedule', config: { cron: '0 */4 * * *' } },
            { type: 'performance_threshold', config: { metric: 'roas_drop', threshold: 0.15 } }
          ],
          outputs: [
            { type: 'analytics', destination: 'dashboard', format: 'json' },
            { type: 'notification', destination: 'email', format: 'report' }
          ]
        },
        metadata: {
          author: 'Predictive Analytics Team',
          version: '3.0.1',
          tags: ['budget', 'prediction', 'machine_learning', 'risk_management'],
          rating: 4.9,
          downloads: 2156,
          lastUpdated: new Date(),
          aiCurationScore: 95,
          performanceMetrics: {
            avgROAS: 2.8,
            successRate: 0.88,
            processingTime: 300
          }
        }
      }
    ];

    // Store templates
    templates.forEach(template => {
      this.templates.set(template.id, template);
    });

    // Log initialization
    await this.storage.createAutomationLog({
      type: 'marketplace_initialized',
      message: `Workflow marketplace initialized with ${templates.length} premium templates`,
      status: 'success',
      workflowId: null,
      metadata: {
        templateCount: templates.length,
        categories: [...new Set(templates.map(t => t.category))],
        avgRating: templates.reduce((sum, t) => sum + t.metadata.rating, 0) / templates.length
      }
    });
  }

  // AI-Powered Template Curation
  async curateTemplatesForUser(userGoals: string[], industry: string, experience: string): Promise<MarketplaceRecommendation[]> {
    try {
      const curationPrompt = `
AI ワークフローキュレーション専門家として、ユーザーに最適なテンプレートを推薦してください。

ユーザー情報:
- 目標: ${userGoals.join(', ')}
- 業界: ${industry}
- 経験レベル: ${experience}

利用可能テンプレート:
${Array.from(this.templates.values()).map(t => `
- ${t.name}: ${t.description}
  カテゴリ: ${t.category}, 複雑度: ${t.complexity}, ROI: ${t.estimatedROI}x
  評価: ${t.metadata.rating}/5, DL数: ${t.metadata.downloads}
`).join('')}

推薦基準:
1. ユーザー目標との適合性
2. 経験レベルとの整合性
3. 業界特化度
4. ROI期待値
5. 実装難易度

各推薦テンプレートに対して以下の形式で回答:
{
  "templateId": "テンプレートID",
  "score": 1-100のスコア,
  "reasoning": "推薦理由",
  "benefits": ["メリット1", "メリット2", "メリット3"],
  "estimatedImpact": {
    "revenueIncrease": 売上増加率%,
    "timesSaved": 節約時間/週,
    "automationLevel": 自動化レベル%
  }
}

上位3つの推薦をJSON配列で回答してください。
`;

      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-pro",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                templateId: { type: "string" },
                score: { type: "number" },
                reasoning: { type: "string" },
                benefits: { type: "array", items: { type: "string" } },
                estimatedImpact: {
                  type: "object",
                  properties: {
                    revenueIncrease: { type: "number" },
                    timesSaved: { type: "number" },
                    automationLevel: { type: "number" }
                  }
                }
              }
            }
          }
        },
        contents: curationPrompt
      });

      const recommendations: MarketplaceRecommendation[] = JSON.parse(response.text || '[]');

      // Log curation
      await this.storage.createAutomationLog({
        type: 'template_curation',
        message: `AI curated ${recommendations.length} template recommendations for user`,
        status: 'success',
        workflowId: null,
        metadata: {
          userGoals,
          industry,
          experience,
          recommendationCount: recommendations.length,
          topScore: recommendations[0]?.score || 0
        }
      });

      return recommendations;

    } catch (error) {
      console.error('Template curation failed:', error);
      
      await this.storage.createAutomationLog({
        type: 'curation_error',
        message: `Template curation failed: ${error}`,
        status: 'error',
        workflowId: null,
        metadata: { error: String(error), userGoals, industry }
      });

      throw error;
    }
  }

  // Create Custom Template with AI Assistance
  async createCustomTemplate(
    requirements: string,
    constraints: string[],
    targetPlatforms: string[]
  ): Promise<WorkflowTemplate> {
    const templatePrompt = `
ワークフロー設計専門家として、カスタムテンプレートを設計してください。

要件: ${requirements}
制約条件: ${constraints.join(', ')}
対象プラットフォーム: ${targetPlatforms.join(', ')}

以下の形式で設計:
{
  "name": "テンプレート名",
  "description": "詳細説明",
  "category": "content_generation|campaign_management|analytics|optimization|custom",
  "complexity": "beginner|intermediate|advanced",
  "estimatedROI": 予想ROI数値,
  "implementationTime": 実装時間（分）,
  "nodes": [
    {
      "id": "ノードID",
      "type": "trigger|action|condition|integration|ai|optimization",
      "name": "ノード名",
      "config": {},
      "position": {"x": 0, "y": 0},
      "inputs": [],
      "outputs": []
    }
  ],
  "connections": [
    {"id": "接続ID", "source": "ソースノード", "target": "ターゲットノード"}
  ],
  "triggers": [
    {"type": "schedule|webhook|market_event|performance_threshold", "config": {}}
  ],
  "outputs": [
    {"type": "content|campaign|analytics|notification", "destination": "出力先", "format": "フォーマット"}
  ]
}

完全なワークフローテンプレートをJSON形式で回答してください。
`;

    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        responseMimeType: "application/json"
      },
      contents: templatePrompt
    });

    const templateData = JSON.parse(response.text || '{}');
    
    const customTemplate: WorkflowTemplate = {
      id: `custom_${Date.now()}`,
      name: templateData.name,
      description: templateData.description,
      category: templateData.category || 'custom',
      platform: targetPlatforms.length === 1 ? targetPlatforms[0] as any : 'both',
      targetMarket: 'japan',
      complexity: templateData.complexity || 'intermediate',
      estimatedROI: templateData.estimatedROI || 2.0,
      implementationTime: templateData.implementationTime || 30,
      template: {
        nodes: templateData.nodes || [],
        connections: templateData.connections || [],
        triggers: templateData.triggers || [],
        outputs: templateData.outputs || []
      },
      metadata: {
        author: 'AI Template Generator',
        version: '1.0.0',
        tags: ['custom', 'ai_generated'],
        rating: 0,
        downloads: 0,
        lastUpdated: new Date(),
        aiCurationScore: 75,
        performanceMetrics: {
          avgROAS: templateData.estimatedROI || 2.0,
          successRate: 0.7,
          processingTime: templateData.implementationTime || 30
        }
      }
    };

    // Store template
    this.templates.set(customTemplate.id, customTemplate);

    // Log creation
    await this.storage.createAutomationLog({
      type: 'custom_template_created',
      message: `Created custom template: ${customTemplate.name}`,
      status: 'success',
      workflowId: customTemplate.id,
      metadata: {
        templateId: customTemplate.id,
        requirements,
        constraints,
        targetPlatforms,
        nodeCount: customTemplate.template.nodes.length
      }
    });

    return customTemplate;
  }

  // Template Performance Analysis
  async analyzeTemplatePerformance(templateId: string, timeRange: string = '30d'): Promise<any> {
    const template = this.templates.get(templateId);
    if (!template) throw new Error(`Template ${templateId} not found`);

    // Simulate performance analysis with realistic data
    const analysis = {
      templateId,
      templateName: template.name,
      timeRange,
      metrics: {
        totalExecutions: Math.floor(Math.random() * 500) + 100,
        successRate: 0.75 + Math.random() * 0.2,
        avgExecutionTime: template.implementationTime + Math.random() * 60,
        costEfficiency: Math.random() * 0.3 + 0.7,
        userSatisfaction: 3.5 + Math.random() * 1.5
      },
      trends: {
        executionGrowth: (Math.random() - 0.5) * 0.4,
        performanceImprovement: Math.random() * 0.3,
        errorReduction: Math.random() * 0.5
      },
      recommendations: [
        'Node optimization suggestions based on execution patterns',
        'Performance bottleneck identification',
        'Alternative workflow paths for better efficiency'
      ],
      generatedAt: new Date()
    };

    return analysis;
  }

  // Search Templates
  async searchTemplates(query: string, filters: any = {}): Promise<WorkflowTemplate[]> {
    const templates = Array.from(this.templates.values());
    
    return templates.filter(template => {
      // Text search
      const matchesQuery = !query || 
        template.name.toLowerCase().includes(query.toLowerCase()) ||
        template.description.toLowerCase().includes(query.toLowerCase()) ||
        template.metadata.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()));

      // Filters
      const matchesCategory = !filters.category || template.category === filters.category;
      const matchesPlatform = !filters.platform || template.platform === filters.platform || template.platform === 'universal';
      const matchesComplexity = !filters.complexity || template.complexity === filters.complexity;
      const matchesRating = !filters.minRating || template.metadata.rating >= filters.minRating;

      return matchesQuery && matchesCategory && matchesPlatform && matchesComplexity && matchesRating;
    }).sort((a, b) => {
      // Sort by AI curation score
      return b.metadata.aiCurationScore - a.metadata.aiCurationScore;
    });
  }

  // Get Template by ID
  async getTemplate(templateId: string): Promise<WorkflowTemplate | null> {
    return this.templates.get(templateId) || null;
  }

  // Get All Templates
  async getAllTemplates(): Promise<WorkflowTemplate[]> {
    return Array.from(this.templates.values());
  }

  // Template Categories
  async getCategories(): Promise<any> {
    const templates = Array.from(this.templates.values());
    const categories = {};

    templates.forEach(template => {
      if (!categories[template.category]) {
        categories[template.category] = {
          count: 0,
          avgRating: 0,
          avgROI: 0,
          templates: []
        };
      }
      
      categories[template.category].count++;
      categories[template.category].avgRating += template.metadata.rating;
      categories[template.category].avgROI += template.estimatedROI;
      categories[template.category].templates.push({
        id: template.id,
        name: template.name,
        rating: template.metadata.rating
      });
    });

    // Calculate averages
    Object.keys(categories).forEach(category => {
      categories[category].avgRating /= categories[category].count;
      categories[category].avgROI /= categories[category].count;
    });

    return categories;
  }

  // Marketplace Statistics
  async getMarketplaceStats(): Promise<any> {
    const templates = Array.from(this.templates.values());
    
    return {
      totalTemplates: templates.length,
      totalDownloads: templates.reduce((sum, t) => sum + t.metadata.downloads, 0),
      avgRating: templates.reduce((sum, t) => sum + t.metadata.rating, 0) / templates.length,
      avgROI: templates.reduce((sum, t) => sum + t.estimatedROI, 0) / templates.length,
      categories: [...new Set(templates.map(t => t.category))].length,
      platforms: [...new Set(templates.map(t => t.platform))].length,
      lastUpdated: new Date()
    };
  }

  getProviderInfo() {
    return {
      name: 'AI Workflow Marketplace',
      features: ['AI curation', 'Custom template generation', 'Performance analytics', 'Japanese market focus'],
      capabilities: ['Template search', 'Recommendation engine', 'Custom workflow builder', 'Performance tracking'],
      templateCount: this.templates.size,
      available: !!process.env.GEMINI_API_KEY
    };
  }
}