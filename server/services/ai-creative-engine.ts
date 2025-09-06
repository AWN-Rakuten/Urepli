import { IStorage } from '../storage';
import { GoogleGenAI } from "@google/genai";

export interface CreativeSuggestion {
  id: string;
  type: 'hook' | 'visual' | 'audio' | 'cta' | 'hashtag' | 'title';
  content: string;
  platform: 'tiktok' | 'instagram' | 'both';
  targetAudience: string;
  confidence: number;
  reasoning: string;
  metadata: {
    style: string;
    emotion: string;
    trendScore: number;
    viralPotential: number;
    japaneseContext: boolean;
  };
}

export interface ContentAnalysis {
  imageDescription: string;
  brandElements: string[];
  emotionalTone: string;
  targetDemographic: string;
  improvementSuggestions: string[];
  competitorComparison: string;
  marketPositioning: string;
}

export interface TrendAnalysis {
  keyword: string;
  platform: string;
  trendScore: number;
  volume: number;
  growth: number;
  demographics: string;
  relatedKeywords: string[];
  optimal_timing: string;
}

export class AICreativeEngine {
  private ai: GoogleGenAI;
  private storage: IStorage;
  private japanesePhrasesBank: Map<string, string[]> = new Map();
  private marketTrends: Map<string, TrendAnalysis> = new Map();
  private creativeSuggestions: Map<string, CreativeSuggestion[]> = new Map();

  constructor(storage: IStorage) {
    this.storage = storage;
    this.ai = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY || "" 
    });
    this.initializeCreativeDatabase();
  }

  private initializeCreativeDatabase() {
    // Japanese creative phrases bank
    this.japanesePhrasesBank.set('hooks', [
      '知らないと損する',
      '今すぐチェック',
      '驚きの結果が',
      '実は簡単だった',
      '専門家が教える',
      'バズり中の',
      '完全攻略法',
      '裏技公開',
      '最新トレンド',
      '激変する前に'
    ]);

    this.japanesePhrasesBank.set('emotions', [
      'ドキドキ', 'ワクワク', 'キュンキュン', 'ほっこり', 'スッキリ',
      'ジーン', 'ギュッと', 'ふわふわ', 'きゅんきゅん', 'もやもや'
    ]);

    this.japanesePhrasesBank.set('cta', [
      'コメントで教えて',
      'フォローして続きを',
      '保存必須',
      'シェア拡散',
      '今すぐDM',
      'ストーリーで反応',
      'いいねで応援',
      'みんなでやろう',
      '一緒に始めよう',
      '今日から実践'
    ]);

    // Initialize market trends
    this.initializeMarketTrends();
  }

  private initializeMarketTrends() {
    const trends: TrendAnalysis[] = [
      {
        keyword: 'MNP乗り換え',
        platform: 'both',
        trendScore: 85,
        volume: 45000,
        growth: 15,
        demographics: '20-40代',
        relatedKeywords: ['携帯料金', 'キャッシュバック', '格安SIM', '乗り換え特典'],
        optimal_timing: '平日昼休み'
      },
      {
        keyword: '節約術',
        platform: 'instagram',
        trendScore: 78,
        volume: 67000,
        growth: 22,
        demographics: '25-35代主婦',
        relatedKeywords: ['家計管理', 'ポイ活', '副業', '投資'],
        optimal_timing: '夜19-21時'
      },
      {
        keyword: 'バズりレシピ',
        platform: 'tiktok',
        trendScore: 92,
        volume: 89000,
        growth: 35,
        demographics: '18-30代',
        relatedKeywords: ['簡単料理', '時短レシピ', 'ヘルシー', 'インスタ映え'],
        optimal_timing: '夕方17-19時'
      }
    ];

    trends.forEach(trend => {
      this.marketTrends.set(trend.keyword, trend);
    });
  }

  // Main Creative Suggestion Engine
  async generateCreativeSuggestions(
    contentType: string,
    platform: 'tiktok' | 'instagram' | 'both',
    targetAudience: string,
    context: string
  ): Promise<CreativeSuggestion[]> {
    try {
      const suggestions: CreativeSuggestion[] = [];

      // Generate different types of suggestions
      const hooks = await this.generateHookSuggestions(platform, targetAudience, context);
      const visuals = await this.generateVisualSuggestions(contentType, platform, context);
      const ctas = await this.generateCTASuggestions(platform, targetAudience);
      const hashtags = await this.generateHashtagSuggestions(context, platform);
      const titles = await this.generateTitleSuggestions(context, platform, targetAudience);

      suggestions.push(...hooks, ...visuals, ...ctas, ...hashtags, ...titles);

      // Store suggestions
      this.creativeSuggestions.set(`${platform}_${Date.now()}`, suggestions);

      // Log generation
      await this.storage.createAutomationLog({
        type: 'creative_suggestions_generated',
        message: `Generated ${suggestions.length} creative suggestions for ${platform} targeting ${targetAudience}`,
        status: 'success',
        workflowId: null,
        metadata: {
          platform,
          targetAudience,
          contentType,
          suggestionCount: suggestions.length,
          topConfidence: Math.max(...suggestions.map(s => s.confidence))
        }
      });

      return suggestions;

    } catch (error) {
      console.error('Creative suggestion generation failed:', error);
      
      await this.storage.createAutomationLog({
        type: 'creative_generation_error',
        message: `Creative suggestion generation failed: ${error}`,
        status: 'error',
        workflowId: null,
        metadata: { error: String(error), platform, targetAudience }
      });

      throw error;
    }
  }

  private async generateHookSuggestions(
    platform: string,
    targetAudience: string,
    context: string
  ): Promise<CreativeSuggestion[]> {
    const hookPrompt = `
日本のSNSマーケティング専門家として、効果的なフック（導入部分）を5個生成してください。

条件:
- プラットフォーム: ${platform}
- ターゲット: ${targetAudience}  
- コンテンツ: ${context}
- 最初の3秒で注意を引く
- 日本語の自然な表現
- 感情に訴える要素を含む

各フックに対して以下の形式で回答:
{
  "content": "フック文",
  "reasoning": "効果的な理由",
  "emotionalTrigger": "感情トリガー",
  "trendScore": 1-100のスコア
}

5個のフックをJSON配列で回答してください。
`;

    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              content: { type: "string" },
              reasoning: { type: "string" },
              emotionalTrigger: { type: "string" },
              trendScore: { type: "number" }
            }
          }
        }
      },
      contents: hookPrompt
    });

    const hookData = JSON.parse(response.text || '[]');
    
    return hookData.map((hook: any, index: number) => ({
      id: `hook_${Date.now()}_${index}`,
      type: 'hook' as const,
      content: hook.content,
      platform: platform as any,
      targetAudience,
      confidence: hook.trendScore / 100,
      reasoning: hook.reasoning,
      metadata: {
        style: 'engaging',
        emotion: hook.emotionalTrigger,
        trendScore: hook.trendScore,
        viralPotential: hook.trendScore * 0.8,
        japaneseContext: true
      }
    }));
  }

  private async generateVisualSuggestions(
    contentType: string,
    platform: string,
    context: string
  ): Promise<CreativeSuggestion[]> {
    const visualPrompt = `
日本のビジュアルマーケティング専門家として、${platform}向けの効果的なビジュアル要素を提案してください。

コンテンツタイプ: ${contentType}
コンテキスト: ${context}

以下の観点から3個のビジュアル提案を生成:
1. 色彩設計（日本の文化的好み考慮）
2. レイアウト構成
3. テキストオーバーレイの配置
4. 視線誘導の流れ
5. ブランド要素の配置

各提案に以下の情報を含めて:
{
  "description": "ビジュアル要素の詳細説明",
  "colorPalette": ["色1", "色2", "色3"],
  "layout": "レイアウト説明",
  "textElements": ["テキスト要素1", "テキスト要素2"],
  "viralScore": 1-100のスコア
}

JSON配列で3個の提案を回答してください。
`;

    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        responseMimeType: "application/json"
      },
      contents: visualPrompt
    });

    const visualData = JSON.parse(response.text || '[]');
    
    return visualData.map((visual: any, index: number) => ({
      id: `visual_${Date.now()}_${index}`,
      type: 'visual' as const,
      content: visual.description,
      platform: platform as any,
      targetAudience: '',
      confidence: visual.viralScore / 100,
      reasoning: `カラーパレット: ${visual.colorPalette.join(', ')}、レイアウト: ${visual.layout}`,
      metadata: {
        style: visual.layout,
        emotion: 'engaging',
        trendScore: visual.viralScore,
        viralPotential: visual.viralScore * 0.9,
        japaneseContext: true
      }
    }));
  }

  private async generateCTASuggestions(
    platform: string,
    targetAudience: string
  ): Promise<CreativeSuggestion[]> {
    const ctas = this.japanesePhrasesBank.get('cta') || [];
    const suggestions: CreativeSuggestion[] = [];

    // Select best CTAs based on platform and audience
    const selectedCTAs = ctas.slice(0, 3);

    selectedCTAs.forEach((cta, index) => {
      let confidence = 0.7;
      let reasoning = 'Standard CTA effectiveness';

      // Platform-specific adjustments
      if (platform === 'tiktok' && cta.includes('コメント')) {
        confidence = 0.9;
        reasoning = 'TikTokでコメント促進は効果的';
      }
      
      if (platform === 'instagram' && cta.includes('保存')) {
        confidence = 0.85;
        reasoning = 'Instagram保存機能は高いエンゲージメント';
      }

      suggestions.push({
        id: `cta_${Date.now()}_${index}`,
        type: 'cta',
        content: cta,
        platform: platform as any,
        targetAudience,
        confidence,
        reasoning,
        metadata: {
          style: 'action_oriented',
          emotion: 'urgency',
          trendScore: confidence * 100,
          viralPotential: confidence * 80,
          japaneseContext: true
        }
      });
    });

    return suggestions;
  }

  private async generateHashtagSuggestions(
    context: string,
    platform: string
  ): Promise<CreativeSuggestion[]> {
    const hashtagPrompt = `
SNSハッシュタグ専門家として、以下のコンテンツに最適なハッシュタグ戦略を提案してください。

コンテンツ: ${context}
プラットフォーム: ${platform}

ハッシュタグ戦略:
1. 大規模ハッシュタグ（100万投稿以上）: 2個
2. 中規模ハッシュタグ（10万-100万投稿）: 3個  
3. ニッチハッシュタグ（1万-10万投稿）: 5個

各ハッシュタググループに対して:
{
  "category": "大規模/中規模/ニッチ",
  "hashtags": ["#ハッシュタグ1", "#ハッシュタグ2"],
  "reasoning": "選定理由",
  "expectedReach": 推定リーチ数
}

JSON配列で3つのカテゴリーを回答してください。
`;

    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        responseMimeType: "application/json"
      },
      contents: hashtagPrompt
    });

    const hashtagData = JSON.parse(response.text || '[]');
    const suggestions: CreativeSuggestion[] = [];

    hashtagData.forEach((group: any, groupIndex: number) => {
      group.hashtags.forEach((hashtag: string, index: number) => {
        const confidence = group.category === 'ニッチ' ? 0.8 : 
                         group.category === '中規模' ? 0.65 : 0.5;

        suggestions.push({
          id: `hashtag_${Date.now()}_${groupIndex}_${index}`,
          type: 'hashtag',
          content: hashtag,
          platform: platform as any,
          targetAudience: '',
          confidence,
          reasoning: `${group.category}ハッシュタグ: ${group.reasoning}`,
          metadata: {
            style: group.category,
            emotion: 'discovery',
            trendScore: confidence * 100,
            viralPotential: group.expectedReach / 10000,
            japaneseContext: true
          }
        });
      });
    });

    return suggestions.slice(0, 10); // Limit to 10 hashtags
  }

  private async generateTitleSuggestions(
    context: string,
    platform: string,
    targetAudience: string
  ): Promise<CreativeSuggestion[]> {
    const titlePrompt = `
${platform}のタイトル専門家として、魅力的なタイトルを5個作成してください。

コンテンツ: ${context}
ターゲット: ${targetAudience}
プラットフォーム: ${platform}

タイトル要件:
- ${platform === 'tiktok' ? '20文字以内、インパクト重視' : '50文字以内、情報価値重視'}
- ターゲット層の興味を引く
- 数字や具体性を含む
- 感情に訴える要素

各タイトルに対して:
{
  "title": "タイトル文",
  "clickProbability": 1-100のクリック率予想,
  "reasoning": "効果的な理由",
  "keywords": ["キーワード1", "キーワード2"]
}

JSON配列で5個のタイトルを回答してください。
`;

    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        responseMimeType: "application/json"
      },
      contents: titlePrompt
    });

    const titleData = JSON.parse(response.text || '[]');
    
    return titleData.map((title: any, index: number) => ({
      id: `title_${Date.now()}_${index}`,
      type: 'title' as const,
      content: title.title,
      platform: platform as any,
      targetAudience,
      confidence: title.clickProbability / 100,
      reasoning: title.reasoning,
      metadata: {
        style: 'compelling',
        emotion: 'curiosity',
        trendScore: title.clickProbability,
        viralPotential: title.clickProbability * 0.7,
        japaneseContext: true
      }
    }));
  }

  // Content Analysis (simulating BLIP/CLIP functionality)
  async analyzeContent(imageUrl?: string, text?: string): Promise<ContentAnalysis> {
    const analysisPrompt = `
コンテンツマーケティング分析専門家として、以下のコンテンツを詳細分析してください。

${imageUrl ? `画像URL: ${imageUrl}` : ''}
${text ? `テキスト: ${text}` : ''}

分析項目:
1. ブランド要素の特定
2. 感情的トーン
3. ターゲット層の推定  
4. 改善提案
5. 競合比較
6. 市場ポジショニング

以下の形式で回答:
{
  "imageDescription": "画像の詳細説明",
  "brandElements": ["要素1", "要素2"],
  "emotionalTone": "感情的トーン",
  "targetDemographic": "ターゲット層",
  "improvementSuggestions": ["改善案1", "改善案2"],
  "competitorComparison": "競合との比較",
  "marketPositioning": "市場での位置づけ"
}

JSON形式で回答してください。
`;

    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        responseMimeType: "application/json"
      },
      contents: analysisPrompt
    });

    const analysis = JSON.parse(response.text || '{}');

    // Log analysis
    await this.storage.createAutomationLog({
      type: 'content_analysis',
      message: `Analyzed content - Target: ${analysis.targetDemographic}, Tone: ${analysis.emotionalTone}`,
      status: 'success',
      workflowId: null,
      metadata: {
        hasImage: !!imageUrl,
        hasText: !!text,
        brandElements: analysis.brandElements?.length || 0,
        improvements: analysis.improvementSuggestions?.length || 0
      }
    });

    return analysis;
  }

  // Trend Analysis
  async analyzeTrends(keywords: string[], platform: string): Promise<TrendAnalysis[]> {
    const trends: TrendAnalysis[] = [];

    for (const keyword of keywords) {
      const existingTrend = this.marketTrends.get(keyword);
      
      if (existingTrend) {
        // Update with current data
        trends.push({
          ...existingTrend,
          platform: platform as any
        });
      } else {
        // Generate new trend analysis
        const trendPrompt = `
トレンド分析専門家として、「${keyword}」の${platform}でのトレンド状況を分析してください。

分析観点:
1. 現在のトレンドスコア（1-100）
2. 推定検索/投稿ボリューム
3. 成長率（月次%）
4. 主要ターゲット層
5. 関連キーワード
6. 最適投稿時間

以下の形式で回答:
{
  "trendScore": 1-100,
  "volume": 推定数値,
  "growth": 成長率%,
  "demographics": "ターゲット層",
  "relatedKeywords": ["関連1", "関連2"],
  "optimal_timing": "最適時間"
}

JSON形式で回答してください。
`;

        try {
          const response = await this.ai.models.generateContent({
            model: "gemini-2.5-flash",
            config: {
              responseMimeType: "application/json"
            },
            contents: trendPrompt
          });

          const trendData = JSON.parse(response.text || '{}');
          
          const newTrend: TrendAnalysis = {
            keyword,
            platform,
            trendScore: trendData.trendScore || 50,
            volume: trendData.volume || 1000,
            growth: trendData.growth || 0,
            demographics: trendData.demographics || '一般',
            relatedKeywords: trendData.relatedKeywords || [],
            optimal_timing: trendData.optimal_timing || '日中'
          };

          this.marketTrends.set(keyword, newTrend);
          trends.push(newTrend);

        } catch (error) {
          console.error(`Trend analysis failed for ${keyword}:`, error);
        }
      }
    }

    return trends;
  }

  // Get all creative suggestions
  async getAllSuggestions(): Promise<any> {
    return {
      suggestions: Array.from(this.creativeSuggestions.values()).flat(),
      trends: Array.from(this.marketTrends.values()),
      phrasesBank: Object.fromEntries(this.japanesePhrasesBank),
      lastUpdated: new Date()
    };
  }

  // Get suggestions by type
  async getSuggestionsByType(type: string, platform?: string): Promise<CreativeSuggestion[]> {
    const allSuggestions = Array.from(this.creativeSuggestions.values()).flat();
    
    return allSuggestions.filter(suggestion => {
      const typeMatch = suggestion.type === type;
      const platformMatch = !platform || suggestion.platform === platform || suggestion.platform === 'both';
      return typeMatch && platformMatch;
    });
  }

  getProviderInfo() {
    return {
      name: 'AI Creative Engine',
      features: ['Japanese market optimization', 'Multi-platform suggestions', 'Trend analysis', 'Content analysis'],
      capabilities: ['Hook generation', 'Visual suggestions', 'Hashtag strategy', 'CTA optimization'],
      available: !!process.env.GEMINI_API_KEY
    };
  }
}