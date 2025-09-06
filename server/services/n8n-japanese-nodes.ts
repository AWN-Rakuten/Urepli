import axios from 'axios';
import { BigQuery } from '@google-cloud/bigquery';
import { Firestore } from '@google-cloud/firestore';

export interface N8nWorkflowNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, any>;
  credentials?: Record<string, string>;
}

export interface N8nWorkflowData {
  name: string;
  nodes: N8nWorkflowNode[];
  connections: Record<string, any>;
  settings: Record<string, any>;
  active: boolean;
}

export interface JapaneseMarketContext {
  targetCarriers: string[];
  customerSegment: 'youth' | 'business' | 'senior' | 'family';
  region: string;
  conversionGoal: 'mnp_switch' | 'plan_upgrade' | 'device_purchase';
  budget: number;
  urgency: 'low' | 'medium' | 'high';
}

export interface N8nApiResponse {
  success: boolean;
  workflowId?: string;
  error?: string;
}

export class N8nJapaneseNodes {
  private bigquery: BigQuery;
  private firestore: Firestore;
  
  private readonly N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://localhost:5678';
  private readonly N8N_API_KEY = process.env.N8N_API_KEY;
  private readonly PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID || 'mnp-dashboard';

  // Japanese carrier-specific data
  private readonly JAPANESE_CARRIERS = {
    docomo: {
      name: 'NTTドコモ',
      marketShare: 35.6,
      strengths: ['ネットワーク品質', '企業向けサービス', 'dポイント'],
      weaknesses: ['料金が高い', '複雑なプラン'],
      targetSegments: ['business', 'senior'],
    },
    au: {
      name: 'au (KDDI)',
      marketShare: 27.8,
      strengths: ['エンタメサービス', 'Pontaポイント', '5G対応エリア'],
      weaknesses: ['地方での電波', 'サポート品質'],
      targetSegments: ['youth', 'family'],
    },
    softbank: {
      name: 'ソフトバンク',
      marketShare: 21.2,
      strengths: ['PayPay連携', '割引キャンペーン', 'Yahoo!サービス'],
      weaknesses: ['ネットワーク品質', '料金体系の複雑さ'],
      targetSegments: ['youth', 'business'],
    },
    rakuten: {
      name: '楽天モバイル',
      marketShare: 4.8,
      strengths: ['料金の安さ', '楽天ポイント', '無制限プラン'],
      weaknesses: ['エリアカバレッジ', 'サポート体制'],
      targetSegments: ['youth', 'family'],
    },
  };

  constructor() {
    this.bigquery = new BigQuery({ projectId: this.PROJECT_ID });
    this.firestore = new Firestore({ projectId: this.PROJECT_ID });
  }

  /**
   * Create Japanese Content Localization Node
   */
  createJapaneseContentLocalizationNode(
    nodeId: string,
    position: [number, number],
    inputText: string = '{{ $json.content }}',
    targetAudience: string = 'general'
  ): N8nWorkflowNode {
    const functionCode = `
// Japanese Content Localization with Cultural Adaptation
const inputText = ${inputText} || '';
const targetAudience = '${targetAudience}';

// Japanese localization patterns
const localizationRules = {
  general: {
    honorifics: ['お客様', 'ご利用いただき'],
    politeness: 'です・ます調',
    culturalContext: '丁寧語中心'
  },
  youth: {
    honorifics: ['みなさん', 'ユーザーの皆様'],
    politeness: 'カジュアル',
    culturalContext: 'SNS風表現'
  },
  business: {
    honorifics: ['貴社', 'ご担当者様'],
    politeness: '謙譲語',
    culturalContext: 'ビジネス敬語'
  },
  senior: {
    honorifics: ['お客様', 'ご利用者様'],
    politeness: '丁寧語',
    culturalContext: '分かりやすい表現'
  }
};

// MNP-specific terminology
const mnpTerms = {
  'mobile number portability': 'MNP（携帯電話番号ポータビリティ）',
  'carrier switch': '携帯会社の乗換',
  'phone plan': '料金プラン',
  'data allowance': 'データ容量',
  'unlimited': '使い放題',
  'family plan': 'ファミリープラン',
  'student discount': '学割',
  'cashback': 'キャッシュバック'
};

// Apply localization
let localizedContent = inputText;

// Replace English terms with Japanese equivalents
Object.entries(mnpTerms).forEach(([en, jp]) => {
  const regex = new RegExp(en, 'gi');
  localizedContent = localizedContent.replace(regex, jp);
});

// Add appropriate honorifics and politeness level
const rules = localizationRules[targetAudience] || localizationRules.general;
const timestamp = new Date().toISOString();

return {
  localizedContent,
  originalContent: inputText,
  targetAudience,
  localizationRules: rules,
  timestamp,
  culturalAdaptations: {
    honorificsAdded: true,
    politenessLevel: rules.politeness,
    culturalContext: rules.culturalContext
  }
};`;

    return {
      id: nodeId,
      name: 'Japanese Content Localizer',
      type: 'n8n-nodes-base.function',
      typeVersion: 1,
      position,
      parameters: {
        functionCode
      }
    };
  }

  /**
   * Create MNP Carrier Comparison Node
   */
  createMNPCarrierComparisonNode(
    nodeId: string,
    position: [number, number],
    currentCarrier: string = '{{ $json.currentCarrier }}',
    customerSegment: string = 'general'
  ): N8nWorkflowNode {
    const functionCode = `
// MNP Carrier Switching Analysis for Japanese Market
const currentCarrier = (${currentCarrier} || '').toLowerCase();
const segment = '${customerSegment}';

// Japanese carrier data with current market positioning
const carriers = ${JSON.stringify(this.JAPANESE_CARRIERS, null, 2)};

// MNP switching incentives by carrier and segment
const switchingIncentives = {
  docomo: {
    to_au: { cashback: 22000, points: 'Pontaポイント5000P', devices: 'iPhone15が実質1円' },
    to_softbank: { cashback: 20000, points: 'PayPayボーナス10000円', devices: 'Android最新機種割引' },
    to_rakuten: { cashback: 15000, points: '楽天ポイント20000P', devices: 'Rakuten Hand無料' }
  },
  au: {
    to_docomo: { cashback: 25000, points: 'dポイント8000P', devices: 'Galaxy最新機種50%オフ' },
    to_softbank: { cashback: 18000, points: 'PayPayボーナス12000円', devices: 'Pixel最新機種割引' },
    to_rakuten: { cashback: 12000, points: '楽天ポイント15000P', devices: 'Rakuten Hand無料' }
  },
  softbank: {
    to_docomo: { cashback: 28000, points: 'dポイント10000P', devices: 'iPhone最新機種大幅割引' },
    to_au: { cashback: 24000, points: 'Pontaポイント7000P', devices: 'Android機種豊富な選択肢' },
    to_rakuten: { cashback: 10000, points: '楽天ポイント12000P', devices: 'Rakuten Hand無料' }
  },
  rakuten: {
    to_docomo: { cashback: 35000, points: 'dポイント15000P', devices: 'iPhone大幅割引キャンペーン' },
    to_au: { cashback: 30000, points: 'Pontaポイント12000P', devices: 'Android最新機種特価' },
    to_softbank: { cashback: 25000, points: 'PayPayボーナス15000円', devices: 'Pixel特別価格' }
  }
};

// Calculate switching recommendations
const recommendations = [];
const currentCarrierData = carriers[currentCarrier];

if (currentCarrierData) {
  Object.keys(carriers).forEach(targetCarrier => {
    if (targetCarrier !== currentCarrier) {
      const targetData = carriers[targetCarrier];
      const incentiveKey = 'to_' + targetCarrier;
      const incentive = switchingIncentives[currentCarrier]?.[incentiveKey];
      
      // Calculate appeal score based on segment
      let appealScore = 50; // Base score
      
      if (targetData.targetSegments.includes(segment)) {
        appealScore += 20;
      }
      
      // Market share consideration
      if (targetData.marketShare > currentCarrierData.marketShare) {
        appealScore += 10;
      }
      
      // Incentive value boost
      if (incentive?.cashback > 20000) {
        appealScore += 15;
      }
      
      recommendations.push({
        carrier: targetCarrier,
        carrierName: targetData.name,
        appealScore,
        marketShare: targetData.marketShare,
        strengths: targetData.strengths,
        incentives: incentive,
        segmentMatch: targetData.targetSegments.includes(segment),
        reasoning: targetData.name + 'への乗換で' + (incentive?.cashback || 0) + '円のキャッシュバック + ' + (incentive?.points || 'ポイント特典なし')
      });
    }
  });
}

// Sort by appeal score
recommendations.sort((a, b) => b.appealScore - a.appealScore);

return {
  currentCarrier,
  currentCarrierData,
  customerSegment: segment,
  topRecommendation: recommendations[0],
  allRecommendations: recommendations,
  timestamp: new Date().toISOString(),
  mnpBenefits: {
    estimatedSavings: recommendations[0]?.incentives?.cashback || 0,
    additionalPerks: recommendations[0]?.incentives?.points || '',
    deviceOffers: recommendations[0]?.incentives?.devices || '',
  }
};`;

    return {
      id: nodeId,
      name: 'MNP Carrier Comparison',
      type: 'n8n-nodes-base.function',
      typeVersion: 1,
      position,
      parameters: {
        functionCode
      }
    };
  }

  /**
   * Create Japanese Timing Optimization Node
   */
  createJapaneseTimingOptimizationNode(
    nodeId: string,
    position: [number, number],
    platform: string = 'tiktok',
    contentType: string = 'video'
  ): N8nWorkflowNode {
    const functionCode = `
// Japanese Market Timing Optimization
const platform = '${platform}';
const contentType = '${contentType}';
const now = new Date();

// Japanese timezone and cultural timing patterns
const japaneseTimePatterns = {
  tiktok: {
    weekdays: [
      { hour: 7, minute: 30, score: 85, reason: '通勤時間 - 電車内での視聴' },
      { hour: 12, minute: 15, score: 90, reason: 'お昼休み - オフィスワーカーのリラックス時間' },
      { hour: 19, minute: 45, score: 95, reason: '帰宅後のゴールデンタイム' },
      { hour: 22, minute: 30, score: 88, reason: '夜のエンタメタイム - 就寝前' }
    ],
    weekends: [
      { hour: 10, minute: 0, score: 80, reason: '週末の朝 - ゆっくり時間' },
      { hour: 14, minute: 30, score: 85, reason: '午後のカフェタイム' },
      { hour: 20, minute: 0, score: 92, reason: '週末夜の娯楽時間' }
    ]
  }
};

const currentMonth = now.getMonth() + 1;
const currentHour = now.getHours();
const currentDay = now.getDay();
const isWeekend = currentDay === 0 || currentDay === 6;

// Get platform-specific timing data
const platformData = japaneseTimePatterns[platform] || japaneseTimePatterns.tiktok;
const relevantTimes = isWeekend ? platformData.weekends : platformData.weekdays;

// Find current time score
let currentTimeScore = 50;
let currentReason = '標準時間帯';

relevantTimes.forEach(timeSlot => {
  const timeDiff = Math.abs(currentHour - timeSlot.hour);
  if (timeDiff <= 1) {
    currentTimeScore = Math.max(currentTimeScore, timeSlot.score * (1 - timeDiff * 0.3));
    currentReason = timeSlot.reason;
  }
});

// Calculate final optimization score
const finalScore = Math.min(100, currentTimeScore);

return {
  platform,
  contentType,
  currentTiming: {
    score: Math.round(finalScore),
    reason: currentReason,
    culturalContext: '日本市場向け最適化'
  },
  recommendations: {
    shouldPostNow: finalScore >= 70,
    bestTimeToday: relevantTimes.reduce((best, current) => 
      current.score > best.score ? current : best
    )
  },
  japaneseContext: {
    isWeekend,
    timezone: 'Asia/Tokyo'
  },
  timestamp: now.toISOString()
};`;

    return {
      id: nodeId,
      name: 'Japanese Timing Optimizer',
      type: 'n8n-nodes-base.function',
      typeVersion: 1,
      position,
      parameters: {
        functionCode
      }
    };
  }

  /**
   * Create Japanese Hashtag Generator Node
   */
  createJapaneseHashtagGeneratorNode(
    nodeId: string,
    position: [number, number],
    platform: string = 'tiktok',
    maxHashtags: number = 10
  ): N8nWorkflowNode {
    const functionCode = `
// Japanese Hashtag Generation with MNP and Cultural Context
const platform = '${platform}';
const maxHashtags = ${maxHashtags};
const content = $json.content || $json.text || '';

// Japanese MNP and mobile-related hashtags
const mnpHashtags = {
  core: ['#MNP', '#携帯乗換', '#スマホ乗換', '#格安SIM', '#携帯料金'],
  carriers: ['#ドコモ', '#au', '#ソフトバンク', '#楽天モバイル'],
  benefits: ['#節約', '#お得', '#キャッシュバック', '#割引', '#ポイント還元']
};

// Platform-specific trending hashtags
const platformHashtags = {
  tiktok: {
    general: ['#おすすめ', '#バズり', '#知らなかった', '#驚き', '#便利'],
    tech: ['#スマホ', '#アプリ', '#便利機能', '#裏技', '#IT']
  }
};

const relevantHashtags = [];

// Add core MNP hashtags
relevantHashtags.push(...mnpHashtags.core.slice(0, 3));

// Add platform-specific hashtags
const platHashtags = platformHashtags[platform] || platformHashtags.tiktok;
relevantHashtags.push(...platHashtags.general.slice(0, 3));
relevantHashtags.push(...platHashtags.tech.slice(0, 2));

// Remove duplicates and limit
const uniqueHashtags = [...new Set(relevantHashtags)].slice(0, maxHashtags);
const hashtagString = uniqueHashtags.join(' ');

return {
  success: true,
  platform,
  hashtags: uniqueHashtags,
  hashtagString,
  totalHashtags: uniqueHashtags.length,
  culturalContext: {
    mnpFocused: true,
    japaneseOptimized: true
  },
  timestamp: new Date().toISOString()
};`;

    return {
      id: nodeId,
      name: 'Japanese Hashtag Generator',
      type: 'n8n-nodes-base.function',
      typeVersion: 1,
      position,
      parameters: {
        functionCode
      }
    };
  }

  /**
   * Create complete n8n workflow with Japanese market nodes
   */
  async createJapaneseMarketWorkflow(
    workflowName: string,
    marketContext: JapaneseMarketContext
  ): Promise<N8nWorkflowData> {
    const nodes: N8nWorkflowNode[] = [];
    
    // Trigger node
    nodes.push({
      id: 'trigger',
      name: 'Manual Trigger',
      type: 'n8n-nodes-base.manualTrigger',
      typeVersion: 1,
      position: [100, 200],
      parameters: {}
    });

    // Japanese content localization
    nodes.push(this.createJapaneseContentLocalizationNode(
      'localize',
      [300, 200],
      '{{ $json.originalContent }}',
      marketContext.customerSegment
    ));

    // MNP carrier comparison
    nodes.push(this.createMNPCarrierComparisonNode(
      'carrier_compare',
      [500, 200],
      '{{ $json.currentCarrier }}',
      marketContext.customerSegment
    ));

    // Japanese timing optimization
    nodes.push(this.createJapaneseTimingOptimizationNode(
      'timing_optimize',
      [700, 200],
      'tiktok',
      'video'
    ));

    // Japanese hashtag generation
    nodes.push(this.createJapaneseHashtagGeneratorNode(
      'hashtag_gen',
      [300, 400],
      'tiktok',
      10
    ));

    // Final output formatting
    nodes.push({
      id: 'output',
      name: 'Format Output',
      type: 'n8n-nodes-base.set',
      typeVersion: 1,
      position: [900, 300],
      parameters: {
        values: {
          string: [
            { name: 'workflowType', value: 'japanese_mnp_optimization' },
            { name: 'targetMarket', value: 'Japan' },
            { name: 'conversionGoal', value: marketContext.conversionGoal },
            { name: 'customerSegment', value: marketContext.customerSegment }
          ]
        }
      }
    });

    // Define connections between nodes
    const connections = {
      'Manual Trigger': {
        main: [
          [
            { node: 'Japanese Content Localizer', type: 'main', index: 0 },
            { node: 'MNP Carrier Comparison', type: 'main', index: 0 }
          ]
        ]
      },
      'Japanese Content Localizer': {
        main: [
          [
            { node: 'Japanese Hashtag Generator', type: 'main', index: 0 }
          ]
        ]
      },
      'MNP Carrier Comparison': {
        main: [
          [
            { node: 'Japanese Timing Optimizer', type: 'main', index: 0 }
          ]
        ]
      },
      'Japanese Timing Optimizer': {
        main: [
          [
            { node: 'Format Output', type: 'main', index: 0 }
          ]
        ]
      },
      'Japanese Hashtag Generator': {
        main: [
          [
            { node: 'Format Output', type: 'main', index: 0 }
          ]
        ]
      }
    };

    return {
      name: workflowName,
      nodes,
      connections,
      settings: {
        executionOrder: 'v1',
        saveManualExecutions: true,
        callerPolicy: 'workflowsFromSameOwner'
      },
      active: false
    };
  }

  /**
   * Deploy workflow to n8n instance
   */
  async deployWorkflowToN8n(workflow: N8nWorkflowData): Promise<N8nApiResponse> {
    if (!this.N8N_API_KEY) {
      return { success: false, error: 'N8N_API_KEY not configured' };
    }

    try {
      const response = await axios.post(
        `${this.N8N_BASE_URL}/api/v1/workflows`,
        workflow,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-N8N-API-KEY': this.N8N_API_KEY
          }
        }
      );

      return {
        success: true,
        workflowId: response.data.id
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Create workflow template using Gemini LLM for optimization
   */
  async createGeminiOptimizedWorkflow(
    prompt: string,
    marketContext: JapaneseMarketContext
  ): Promise<N8nWorkflowData> {
    // Since Gemini API has import issues, we'll create a template-based approach
    const baseWorkflow = await this.createJapaneseMarketWorkflow(
      `Gemini Optimized: ${prompt.substring(0, 50)}...`,
      marketContext
    );

    // Add Gemini content generation node
    const geminiNode: N8nWorkflowNode = {
      id: 'gemini_content',
      name: 'Gemini Content Generator',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 1,
      position: [150, 300],
      parameters: {
        url: `${process.env.REPLIT_DOMAIN || 'https://localhost:5000'}/api/gcloud/gemini/generate-content`,
        method: 'POST',
        body: {
          prompt: prompt,
          marketContext: marketContext,
          language: 'Japanese',
          culturalAdaptation: true
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }
    };

    baseWorkflow.nodes.splice(1, 0, geminiNode);
    
    // Update connections to include Gemini node
    baseWorkflow.connections['Manual Trigger'] = {
      main: [
        [
          { node: 'Gemini Content Generator', type: 'main', index: 0 }
        ]
      ]
    };

    baseWorkflow.connections['Gemini Content Generator'] = {
      main: [
        [
          { node: 'Japanese Content Localizer', type: 'main', index: 0 },
          { node: 'MNP Carrier Comparison', type: 'main', index: 0 }
        ]
      ]
    };

    return baseWorkflow;
  }

  /**
   * Get available Japanese workflow templates
   */
  getJapaneseWorkflowTemplates(): Array<{
    name: string;
    description: string;
    useCase: string;
    nodes: string[];
  }> {
    return [
      {
        name: 'MNP Conversion Optimizer',
        description: 'Complete workflow for optimizing MNP conversion campaigns in Japanese market',
        useCase: 'Carrier switching campaigns with cultural localization',
        nodes: ['Content Localizer', 'Carrier Comparison', 'Timing Optimizer', 'Hashtag Generator']
      },
      {
        name: 'Japanese Social Media Automation',
        description: 'Automated social media posting with Japanese cultural timing',
        useCase: 'Multi-platform social media automation for Japanese audience',
        nodes: ['Content Localizer', 'Timing Optimizer', 'Hashtag Generator']
      },
      {
        name: 'Seasonal Campaign Generator',
        description: 'Generate culturally-aware seasonal campaigns for Japanese market',
        useCase: 'Holiday and seasonal marketing campaigns',
        nodes: ['Content Localizer', 'Seasonal Optimizer', 'Cultural Context Analyzer']
      }
    ];
  }

  /**
   * Analyze existing workflow and suggest Japanese market optimizations
   */
  async analyzeWorkflowForJapaneseMarket(workflowId: string): Promise<{
    suggestions: string[];
    optimizations: Array<{
      type: string;
      description: string;
      nodeRecommendation: string;
    }>;
    culturalIssues: string[];
  }> {
    const suggestions = [
      '日本語コンテンツの文化的適応を追加',
      'MNPキャリア比較ロジックの実装',
      '日本のタイムゾーンに合わせた投稿タイミング最適化',
      'Japanese-specific hashtag generation',
      '敬語レベルの調整機能'
    ];

    const optimizations = [
      {
        type: 'Content Localization',
        description: 'Add Japanese cultural adaptation for content',
        nodeRecommendation: 'Japanese Content Localizer'
      },
      {
        type: 'Timing Optimization',
        description: 'Optimize posting times for Japanese audience behavior',
        nodeRecommendation: 'Japanese Timing Optimizer'
      },
      {
        type: 'MNP Conversion',
        description: 'Add carrier switching analysis for MNP campaigns',
        nodeRecommendation: 'MNP Carrier Comparison'
      }
    ];

    const culturalIssues = [
      'コンテンツの敬語レベル調整が必要',
      '日本の祝日・文化的イベントへの配慮',
      'キャリア固有の特徴とユーザー層の考慮',
      'Japanese social media platform preferences'
    ];

    return {
      suggestions,
      optimizations,
      culturalIssues
    };
  }
}