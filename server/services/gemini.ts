import { GoogleGenAI } from "@google/genai";

export interface ContentScript {
  title: string;
  script: string;
  hooks: string[];
  targetAudience: string;
  estimatedEngagement: number;
}

export interface WorkflowOptimization {
  optimizations: string[];
  suggestedParameters: Record<string, any>;
  reasoning: string;
  expectedImprovement: number;
}

export class GeminiService {
  private ai: GoogleGenAI | null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || "";
    if (!this.ai) {
      console.warn("GEMINI_API_KEY not configured - using mock responses");
      this.ai = null;
    } else {
      try {
        this.ai = new GoogleGenAI({ apiKey });
      } catch (error) {
        console.warn("Failed to initialize Gemini AI - using mock responses");
        this.ai = null;
      }
    }
  }

  async generateJapaneseContent(niche: string, platform: string, hookType: string): Promise<ContentScript> {
    if (!this.ai) {
      // Return mock content when API is not available
      return {
        title: `${niche}の最新情報 - ${platform}向け`,
        script: `こんにちは！今日は${niche}について話します。最新のトレンドをお伝えします。`,
        hooks: [hookType, "trending", "japanese_culture"],
        targetAudience: "Japanese mobile users aged 20-40",
        estimatedEngagement: 75 + Math.floor(Math.random() * 20)
      };
    }

    const prompt = `Generate a viral Japanese content script for ${platform} in the ${niche} niche using ${hookType} hook style.

Requirements:
- Target Japanese audience specifically
- 15-30 second script optimized for ${platform}
- Include trending Japanese phrases and cultural references
- Focus on conversion and engagement
- Use ${hookType} hook strategy

Respond with JSON format:
{
  "title": "Japanese title for the content",
  "script": "Complete script in Japanese with timing cues",
  "hooks": ["list of hook elements used"],
  "targetAudience": "specific audience description",
  "estimatedEngagement": number (1-100 engagement score)
}`;

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              title: { type: "string" },
              script: { type: "string" },
              hooks: { type: "array", items: { type: "string" } },
              targetAudience: { type: "string" },
              estimatedEngagement: { type: "number" }
            },
            required: ["title", "script", "hooks", "targetAudience", "estimatedEngagement"]
          }
        },
        contents: prompt,
      });

      const rawJson = response.text;
      if (!rawJson) {
        throw new Error("Empty response from Gemini API");
      }

      return JSON.parse(rawJson) as ContentScript;
    } catch (error) {
      throw new Error(`Failed to generate content script: ${error}`);
    }
  }

  async optimizeWorkflow(
    workflowData: any, 
    performanceMetrics: Record<string, number>,
    currentProfit: number
  ): Promise<WorkflowOptimization> {
    if (!this.ai) {
      // Return mock optimization when API is not available
      return {
        optimizations: [
          "Optimize posting schedule for Japanese peak hours (19:00-23:00 JST)",
          "Increase budget allocation to highest performing platform",
          "Implement A/B testing for content variations",
          "Add trending hashtags for better reach"
        ],
        suggestedParameters: {
          schedule: "0 19,21,23 * * *",
          budgetAllocation: { tiktok: 40, instagram: 35, youtube: 25 },
          voice: { speed: 1.1, pitch: 0.1 },
          niche: "investment_tips"
        },
        reasoning: "Based on performance metrics, optimize for Japanese market timing and highest performing platforms",
        expectedImprovement: 15 + Math.floor(Math.random() * 10)
      };
    }

    const prompt = `Analyze this n8n workflow and performance data to suggest optimizations for profit maximization.

Current Workflow: ${JSON.stringify(workflowData)}
Performance Metrics: ${JSON.stringify(performanceMetrics)}
Current Profit: ¥${currentProfit}

Focus on:
- Timing optimization for Japanese market
- Parameter adjustments for better conversion
- Resource allocation improvements
- A/B testing suggestions

Respond with JSON format:
{
  "optimizations": ["list of specific optimization recommendations"],
  "suggestedParameters": {"parameter_name": "new_value"},
  "reasoning": "detailed explanation of optimizations",
  "expectedImprovement": number (percentage improvement expected)
}`;

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              optimizations: { type: "array", items: { type: "string" } },
              suggestedParameters: { type: "object" },
              reasoning: { type: "string" },
              expectedImprovement: { type: "number" }
            },
            required: ["optimizations", "suggestedParameters", "reasoning", "expectedImprovement"]
          }
        },
        contents: prompt,
      });

      const rawJson = response.text;
      if (!rawJson) {
        throw new Error("Empty response from Gemini API");
      }

      return JSON.parse(rawJson) as WorkflowOptimization;
    } catch (error) {
      throw new Error(`Failed to optimize workflow: ${error}`);
    }
  }

  async analyzePerformanceData(performanceData: any[]): Promise<string[]> {
    if (!this.ai) {
      // Return mock insights when API is not available
      return [
        "TikTok performs best during evening hours (19:00-23:00 JST)",
        "Investment tips content shows 25% higher engagement than general savings tips",
        "Videos with personal stories increase conversion by 18%",
        "Adding trending hashtags improves reach by 40%",
        "Mobile-optimized content performs 60% better than desktop-first content",
        "Call-to-action in first 3 seconds increases retention by 30%",
        "Japanese cultural references improve local engagement by 45%",
        "Shorter scripts (15-20 seconds) outperform longer ones by 22%"
      ];
    }

    const prompt = `Analyze this performance data and provide actionable insights for content optimization:

${JSON.stringify(performanceData)}

Focus on:
- Conversion patterns
- Audience behavior insights
- Content optimization recommendations
- Platform-specific strategies

Provide 5-10 specific, actionable insights.`;

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const text = response.text || "";
      return text.split('\n').filter(line => line.trim().length > 0);
    } catch (error) {
      throw new Error(`Failed to analyze performance data: ${error}`);
    }
  }

  async generateJapaneseScript(params: {
    topic: string;
    targetAudience: string;
    platform: string;
    duration: number;
    style: string;
  }): Promise<{
    title: string;
    description: string;
    script: string;
    hooks: string[];
    targetAudience: string;
    estimatedEngagement: number;
  }> {
    if (!this.ai) {
      // Return mock script when API is not available
      return {
        title: `${params.topic} - ${params.platform}向け動画`,
        description: `${params.topic}について分かりやすく解説する${params.duration}秒の動画です。`,
        script: `こんにちは！今日は${params.topic}について話します。${params.targetAudience}の皆さんに役立つ情報をお届けします。まず重要なポイントから説明していきます。`,
        hooks: ["attention_grabber", "personal_connection", "value_promise"],
        targetAudience: params.targetAudience,
        estimatedEngagement: 70 + Math.floor(Math.random() * 25)
      };
    }

    const prompt = `記事タイトル: "${params.topic}"
対象オーディエンス: ${params.targetAudience}
プラットフォーム: ${params.platform}
動画時間: ${params.duration}秒
スタイル: ${params.style}

上記に基づき、日本の視聴者向けの魅力的な動画台本を作成してください。

要件:
- ${params.duration}秒の動画に最適化
- 日本の文化とトレンドを考慮
- エンゲージメントとコンバージョンに焦点
- ${params.style}スタイルを使用

JSONフォーマットで回答:
{
  "title": "日本語のタイトル",
  "description": "動画の説明文",
  "script": "完全な日本語台本（タイミング指示付き）",
  "hooks": ["使用したフック要素のリスト"],
  "targetAudience": "具体的なオーディエンス説明",
  "estimatedEngagement": エンゲージメントスコア(1-100)
}`;

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              script: { type: "string" },
              hooks: { type: "array", items: { type: "string" } },
              targetAudience: { type: "string" },
              estimatedEngagement: { type: "number" }
            },
            required: ["title", "description", "script", "hooks", "targetAudience", "estimatedEngagement"]
          }
        },
        contents: prompt,
      });

      const rawJson = response.text;
      if (!rawJson) {
        throw new Error("Empty response from Gemini API");
      }

      return JSON.parse(rawJson);
    } catch (error) {
      throw new Error(`Failed to generate Japanese script: ${error}`);
    }
  }

  // New method for enhanced MCP integration
  async optimizeScript(script: string, platform: string): Promise<string> {
    if (!this.ai) {
      // Return enhanced mock script
      return `【最適化版】${script}\n\n#${platform} #最新情報 #必見 #日本`;
    }

    const prompt = `Optimize this script for ${platform}:

"${script}"

Make it more engaging for Japanese audience, add trending elements, and optimize for ${platform} algorithm.`;

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      return response.text || script;
    } catch (error) {
      return script; // Return original if optimization fails
    }
  }
}
