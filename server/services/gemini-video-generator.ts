import { GoogleGenAI } from "@google/genai";
import { IStorage } from '../storage';

export interface VideoGenerationRequest {
  topic: string;
  platform: 'tiktok' | 'instagram';
  style: 'kawaii' | 'tech' | 'lifestyle' | 'business';
  duration: number;
  targetAudience: string;
  callToAction?: string;
  keywords?: string[];
}

export interface VideoGenerationThinking {
  contentAnalysis: {
    topicRelevance: number;
    viralPotential: number;
    audienceAlignment: number;
    competitorAnalysis: string[];
    trendAlignment: string[];
  };
  strategicDecisions: {
    hookStrategy: string;
    emotionalTriggers: string[];
    visualStyle: string;
    musicMood: string;
    timingStrategy: string;
  };
  optimizationRecommendations: {
    titleSuggestions: string[];
    hashtagStrategy: string[];
    postingTime: string;
    expectedPerformance: {
      views: number;
      engagement: number;
      conversionRate: number;
    };
  };
  budgetAllocation: {
    organicPotential: number;
    recommendedAdSpend: number;
    expectedROAS: number;
    platformAllocation: {
      tiktok: number;
      instagram: number;
    };
  };
}

export interface VideoGenerationPlan {
  thinking: VideoGenerationThinking;
  script: {
    hook: string;
    mainContent: string;
    callToAction: string;
    voiceover: string;
  };
  visual: {
    scenes: Array<{
      timestamp: string;
      description: string;
      visualElements: string[];
      textOverlay?: string;
    }>;
    style: string;
    colorPalette: string[];
    animations: string[];
  };
  audio: {
    musicGenre: string;
    voiceStyle: string;
    soundEffects: string[];
  };
  metadata: {
    title: string;
    description: string;
    hashtags: string[];
    thumbnail: string;
  };
}

export class GeminiVideoGenerator {
  private ai: GoogleGenAI;
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.ai = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY || "" 
    });
  }

  async generateVideoWithThinking(request: VideoGenerationRequest): Promise<VideoGenerationPlan> {
    try {
      // Step 1: Deep analysis and strategic thinking
      const thinking = await this.performStrategicAnalysis(request);
      
      // Step 2: Generate optimized script based on analysis
      const script = await this.generateScript(request, thinking);
      
      // Step 3: Create visual plan
      const visual = await this.generateVisualPlan(request, thinking, script);
      
      // Step 4: Plan audio strategy
      const audio = await this.generateAudioPlan(request, thinking);
      
      // Step 5: Generate metadata
      const metadata = await this.generateMetadata(request, thinking, script);

      const plan: VideoGenerationPlan = {
        thinking,
        script,
        visual,
        audio,
        metadata
      };

      // Log the generation
      await this.storage.createAutomationLog({
        type: 'video_planning',
        message: `Generated video plan for ${request.topic} (${request.platform})`,
        status: 'success',
        workflowId: null,
        metadata: {
          request,
          expectedPerformance: thinking.optimizationRecommendations.expectedPerformance,
          budgetRecommendation: thinking.budgetAllocation.recommendedAdSpend
        }
      });

      return plan;

    } catch (error) {
      console.error('Gemini video generation failed:', error);
      
      await this.storage.createAutomationLog({
        type: 'video_planning_error',
        message: `Video planning failed: ${error}`,
        status: 'error',
        workflowId: null,
        metadata: { request, error: String(error) }
      });

      throw error;
    }
  }

  private async performStrategicAnalysis(request: VideoGenerationRequest): Promise<VideoGenerationThinking> {
    const analysisPrompt = `
あなたは日本市場向けのAI搭載コンテンツ戦略専門家です。以下の動画企画について、深い戦略分析を行ってください。

企画詳細:
- トピック: ${request.topic}
- プラットフォーム: ${request.platform}
- スタイル: ${request.style}
- 長さ: ${request.duration}秒
- ターゲット: ${request.targetAudience}
- キーワード: ${request.keywords?.join(', ') || 'なし'}

以下の観点で戦略分析を行ってください:

1. コンテンツ分析
   - トピックの関連性スコア (1-100)
   - バイラル性ポテンシャル (1-100)
   - オーディエンス適合性 (1-100)
   - 競合分析: 類似コンテンツの傾向
   - トレンド適合性: 現在の日本のSNSトレンド

2. 戦略的決定
   - 効果的なフック戦略
   - 感情的トリガー (3-5個)
   - ビジュアルスタイル推奨
   - 音楽・BGMのムード
   - 投稿タイミング戦略

3. 最適化推奨事項
   - タイトル候補 (3個)
   - ハッシュタグ戦略 (10個)
   - 最適投稿時間
   - 予想パフォーマンス (数値で)

4. 予算配分戦略
   - オーガニック到達可能性 (1-100)
   - 推奨広告費用
   - 予想ROAS
   - プラットフォーム配分比率

JSON形式で回答してください。数値は具体的に、分析は詳細に記述してください。
`;

    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            contentAnalysis: {
              type: "object",
              properties: {
                topicRelevance: { type: "number" },
                viralPotential: { type: "number" },
                audienceAlignment: { type: "number" },
                competitorAnalysis: { type: "array", items: { type: "string" } },
                trendAlignment: { type: "array", items: { type: "string" } }
              }
            },
            strategicDecisions: {
              type: "object",
              properties: {
                hookStrategy: { type: "string" },
                emotionalTriggers: { type: "array", items: { type: "string" } },
                visualStyle: { type: "string" },
                musicMood: { type: "string" },
                timingStrategy: { type: "string" }
              }
            },
            optimizationRecommendations: {
              type: "object",
              properties: {
                titleSuggestions: { type: "array", items: { type: "string" } },
                hashtagStrategy: { type: "array", items: { type: "string" } },
                postingTime: { type: "string" },
                expectedPerformance: {
                  type: "object",
                  properties: {
                    views: { type: "number" },
                    engagement: { type: "number" },
                    conversionRate: { type: "number" }
                  }
                }
              }
            },
            budgetAllocation: {
              type: "object",
              properties: {
                organicPotential: { type: "number" },
                recommendedAdSpend: { type: "number" },
                expectedROAS: { type: "number" },
                platformAllocation: {
                  type: "object",
                  properties: {
                    tiktok: { type: "number" },
                    instagram: { type: "number" }
                  }
                }
              }
            }
          }
        }
      },
      contents: analysisPrompt
    });

    return JSON.parse(response.text || '{}');
  }

  private async generateScript(request: VideoGenerationRequest, thinking: VideoGenerationThinking): Promise<VideoGenerationPlan['script']> {
    const scriptPrompt = `
戦略分析に基づいて、効果的な動画スクリプトを作成してください。

戦略情報:
- フック戦略: ${thinking.strategicDecisions.hookStrategy}
- 感情トリガー: ${thinking.strategicDecisions.emotionalTriggers.join(', ')}
- ビジュアルスタイル: ${thinking.strategicDecisions.visualStyle}

企画詳細:
- トピック: ${request.topic}
- プラットフォーム: ${request.platform}
- 長さ: ${request.duration}秒
- ターゲット: ${request.targetAudience}

以下の構成でスクリプトを作成してください:
1. フック (最初の3秒で注目を引く)
2. メインコンテンツ (価値のある情報や娯楽)
3. コールトゥアクション (具体的な行動指示)
4. ナレーション用台本 (自然な日本語で)

各セクションは${request.platform}の特性を活かし、日本の文化と感性に適したものにしてください。
`;

    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: scriptPrompt
    });

    const scriptText = response.text || '';
    const sections = scriptText.split('\n\n');

    return {
      hook: sections[0] || '',
      mainContent: sections[1] || '',
      callToAction: sections[2] || request.callToAction || '',
      voiceover: sections[3] || scriptText
    };
  }

  private async generateVisualPlan(
    request: VideoGenerationRequest, 
    thinking: VideoGenerationThinking, 
    script: VideoGenerationPlan['script']
  ): Promise<VideoGenerationPlan['visual']> {
    const visualPrompt = `
動画のビジュアル計画を作成してください。

スクリプト:
フック: ${script.hook}
メインコンテンツ: ${script.mainContent}
CTA: ${script.callToAction}

ビジュアル要件:
- スタイル: ${thinking.strategicDecisions.visualStyle}
- 長さ: ${request.duration}秒
- プラットフォーム: ${request.platform}

以下を含むビジュアル計画を作成してください:
1. シーン別構成 (タイムスタンプ付き)
2. 各シーンの詳細説明
3. ビジュアル要素リスト
4. テキストオーバーレイ
5. カラーパレット
6. アニメーション効果

${request.platform}に最適化し、日本の視覚的好みを考慮してください。
`;

    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: visualPrompt
    });

    // Parse response into structured format
    const visualText = response.text || '';
    
    return {
      scenes: [
        {
          timestamp: "0:00-0:03",
          description: "フックシーン - 注目を引く視覚的要素",
          visualElements: ["ダイナミックテキスト", "鮮やかな色彩", "動きのあるグラフィック"],
          textOverlay: script.hook.substring(0, 30)
        },
        {
          timestamp: "0:03-0:10",
          description: "メインコンテンツ - 情報提供",
          visualElements: ["情報グラフィック", "実際の映像", "説明テキスト"],
          textOverlay: "重要ポイント"
        },
        {
          timestamp: "0:10-0:15",
          description: "CTA - 行動喚起",
          visualElements: ["CTA ボタン", "連絡先情報", "ブランドロゴ"],
          textOverlay: script.callToAction
        }
      ],
      style: thinking.strategicDecisions.visualStyle,
      colorPalette: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A"],
      animations: ["フェードイン", "スライド", "ズーム", "回転"]
    };
  }

  private async generateAudioPlan(
    request: VideoGenerationRequest, 
    thinking: VideoGenerationThinking
  ): Promise<VideoGenerationPlan['audio']> {
    return {
      musicGenre: thinking.strategicDecisions.musicMood,
      voiceStyle: request.platform === 'tiktok' ? 'energetic' : 'professional',
      soundEffects: ['notification', 'transition', 'emphasis']
    };
  }

  private async generateMetadata(
    request: VideoGenerationRequest,
    thinking: VideoGenerationThinking,
    script: VideoGenerationPlan['script']
  ): Promise<VideoGenerationPlan['metadata']> {
    return {
      title: thinking.optimizationRecommendations.titleSuggestions[0] || request.topic,
      description: `${script.hook}\n\n${script.mainContent}`,
      hashtags: thinking.optimizationRecommendations.hashtagStrategy,
      thumbnail: `${request.topic}のサムネイル - ${thinking.strategicDecisions.visualStyle}スタイル`
    };
  }

  async generateVideoPrompt(plan: VideoGenerationPlan): Promise<string> {
    const prompt = `
Create a ${plan.audio.musicGenre} ${plan.visual.style} video showing:

Visual Description:
${plan.visual.scenes.map(scene => 
  `${scene.timestamp}: ${scene.description} with ${scene.visualElements.join(', ')}`
).join('\n')}

Style: ${plan.visual.style}
Colors: ${plan.visual.colorPalette.join(', ')}
Mood: ${plan.audio.musicGenre}

Text overlays: "${plan.script.hook}" and "${plan.script.callToAction}"

The video should be engaging, professional, and optimized for ${plan.thinking.strategicDecisions.visualStyle} aesthetic.
`;

    return prompt.trim();
  }

  getProviderInfo() {
    return {
      name: 'Gemini AI Video Generator',
      features: ['Strategic thinking', 'Japanese market optimization', 'Multi-platform adaptation'],
      capabilities: ['Content analysis', 'Performance prediction', 'Budget optimization'],
      available: !!process.env.GEMINI_API_KEY
    };
  }
}