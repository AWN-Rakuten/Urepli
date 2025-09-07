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
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateJapaneseContent(niche: string, platform: string, hookType: string): Promise<ContentScript> {
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
}
