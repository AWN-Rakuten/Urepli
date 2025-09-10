import { GoogleGenAI } from "@google/genai";
import { storage } from "../storage";

export interface PromptOptimizationRequest {
  originalPrompt: string;
  targetMetric: 'engagement' | 'conversion' | 'click_through' | 'watch_time';
  platform: 'tiktok' | 'instagram' | 'youtube';
  audience: string;
  performanceData?: {
    current_score: number;
    historical_avg: number;
    top_performer_score: number;
  };
}

export interface PromptOptimizationResult {
  optimizedPrompt: string;
  reasoning: string;
  expectedImprovement: number;
  confidence: number;
  testingRecommendations: string[];
  fallbackPrompts: string[];
}

export interface PromptPerformanceData {
  promptId: string;
  prompt: string;
  platform: string;
  audience: string;
  metrics: {
    engagement_rate: number;
    conversion_rate: number;
    click_through_rate: number;
    watch_time_avg: number;
    shares: number;
    comments: number;
    likes: number;
  };
  usage_count: number;
  created_at: Date;
  last_used: Date;
}

export class LLMPromptOptimizer {
  private ai: GoogleGenAI | null;
  private promptDatabase: Map<string, PromptPerformanceData[]> = new Map();

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      console.warn("GEMINI_API_KEY not configured - LLM Prompt Optimizer using mock responses");
      this.ai = null;
    } else {
      try {
        this.ai = new GoogleGenAI(apiKey);
      } catch (error) {
        console.warn("Failed to initialize Gemini AI for Prompt Optimizer - using mock responses");
        this.ai = null;
      }
    }
    this.loadPromptHistory();
  }

  private async loadPromptHistory() {
    // Load historical prompt performance data from database
    try {
      const seeds = await storage.getGeminiSeeds();
      seeds.forEach(seed => {
        const key = `${seed.category}_${seed.name}`;
        if (!this.promptDatabase.has(key)) {
          this.promptDatabase.set(key, []);
        }
        
        const performanceData: PromptPerformanceData = {
          promptId: seed.id,
          prompt: seed.seedValue,
          platform: seed.category,
          audience: 'japanese_general',
          metrics: {
            engagement_rate: seed.performanceScore || 70,
            conversion_rate: seed.successRate || 0,
            click_through_rate: 0,
            watch_time_avg: seed.avgResponseTime || 0,
            shares: 0,
            comments: 0,
            likes: 0
          },
          usage_count: seed.useCount || 0,
          created_at: seed.createdAt || new Date(),
          last_used: seed.lastUsed || new Date()
        };
        
        this.promptDatabase.get(key)?.push(performanceData);
      });
    } catch (error) {
      console.warn("Failed to load prompt history:", error);
    }
  }

  async optimizePrompt(request: PromptOptimizationRequest): Promise<PromptOptimizationResult> {
    if (!this.ai) {
      return this.generateMockOptimization(request);
    }

    try {
      // Get historical performance data for similar prompts
      const historicalData = this.getHistoricalData(request.platform, request.audience);
      
      // Analyze current prompt performance
      const analysis = await this.analyzePromptPerformance(request, historicalData);
      
      // Generate optimized prompt using LLM
      const optimizationPrompt = this.buildOptimizationPrompt(request, analysis);
      
      const model = this.ai.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(optimizationPrompt);
      const response = result.response.text();
      
      return this.parseOptimizationResponse(response, request);
      
    } catch (error) {
      console.error("Error optimizing prompt:", error);
      return this.generateMockOptimization(request);
    }
  }

  private getHistoricalData(platform: string, audience: string): PromptPerformanceData[] {
    const key = `${platform}_${audience}`;
    return this.promptDatabase.get(key) || [];
  }

  private async analyzePromptPerformance(
    request: PromptOptimizationRequest, 
    historicalData: PromptPerformanceData[]
  ): Promise<string> {
    if (historicalData.length === 0) {
      return "No historical data available for analysis.";
    }

    // Calculate performance metrics
    const avgEngagement = historicalData.reduce((sum, data) => 
      sum + data.metrics.engagement_rate, 0) / historicalData.length;
    
    const topPerformers = historicalData
      .filter(data => data.metrics.engagement_rate > avgEngagement * 1.2)
      .slice(0, 3);

    const analysis = {
      historical_average: avgEngagement,
      current_performance: request.performanceData?.current_score || 0,
      top_performers: topPerformers.map(p => ({
        prompt: p.prompt.substring(0, 100),
        engagement: p.metrics.engagement_rate
      })),
      improvement_opportunity: avgEngagement > (request.performanceData?.current_score || 0)
    };

    return JSON.stringify(analysis, null, 2);
  }

  private buildOptimizationPrompt(
    request: PromptOptimizationRequest, 
    analysis: string
  ): string {
    return `You are an expert AI prompt engineer specializing in Japanese social media content optimization.

TASK: Optimize the following prompt for better ${request.targetMetric} on ${request.platform}.

ORIGINAL PROMPT:
"${request.originalPrompt}"

TARGET PLATFORM: ${request.platform}
TARGET AUDIENCE: ${request.audience}
TARGET METRIC: ${request.targetMetric}

PERFORMANCE ANALYSIS:
${analysis}

REQUIREMENTS:
1. Keep the Japanese cultural context and language style appropriate for the platform
2. Optimize for ${request.targetMetric} specifically
3. Maintain authenticity and avoid overly promotional language
4. Consider platform-specific best practices
5. Ensure compliance with Japanese advertising standards

RESPONSE FORMAT (JSON):
{
  "optimized_prompt": "Improved prompt here",
  "reasoning": "Detailed explanation of changes made",
  "expected_improvement": 15-30,
  "confidence": 0.8,
  "testing_recommendations": ["A/B test suggestion 1", "A/B test suggestion 2"],
  "fallback_prompts": ["Alternative prompt 1", "Alternative prompt 2"]
}

Focus on psychological triggers that work well in Japanese culture, trending phrases, and platform-specific formatting.`;
  }

  private parseOptimizationResponse(response: string, request: PromptOptimizationRequest): PromptOptimizationResult {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          optimizedPrompt: parsed.optimized_prompt || request.originalPrompt,
          reasoning: parsed.reasoning || "No reasoning provided",
          expectedImprovement: parsed.expected_improvement || 10,
          confidence: parsed.confidence || 0.7,
          testingRecommendations: parsed.testing_recommendations || [],
          fallbackPrompts: parsed.fallback_prompts || []
        };
      }
    } catch (error) {
      console.warn("Failed to parse LLM response, using fallback");
    }
    
    return this.generateMockOptimization(request);
  }

  private generateMockOptimization(request: PromptOptimizationRequest): PromptOptimizationResult {
    return {
      optimizedPrompt: `${request.originalPrompt} [最新トレンド] #${request.platform} #日本`,
      reasoning: `Added trending Japanese hashtags and engagement triggers for ${request.platform}`,
      expectedImprovement: 15,
      confidence: 0.7,
      testingRecommendations: [
        "Test with different time-of-day posting",
        "A/B test emoji usage",
        "Test hashtag variations"
      ],
      fallbackPrompts: [
        request.originalPrompt + " 今話題の",
        request.originalPrompt + " みんなが注目！"
      ]
    };
  }

  async recordPromptPerformance(
    promptId: string,
    platform: string,
    audience: string,
    metrics: Partial<PromptPerformanceData['metrics']>
  ): Promise<void> {
    try {
      // Update the performance data in our cache
      const key = `${platform}_${audience}`;
      const existingData = this.promptDatabase.get(key) || [];
      
      const existingPrompt = existingData.find(p => p.promptId === promptId);
      if (existingPrompt) {
        // Update existing metrics
        Object.assign(existingPrompt.metrics, metrics);
        existingPrompt.last_used = new Date();
      }

      // Also update in persistent storage
      await storage.updateGeminiSeedPerformance(promptId, {
        performanceScore: metrics.engagement_rate || 70,
        successRate: metrics.conversion_rate || 0,
        lastUsed: new Date()
      });

    } catch (error) {
      console.error("Failed to record prompt performance:", error);
    }
  }

  async getBestPerformingPrompts(
    platform: string, 
    audience: string, 
    limit: number = 5
  ): Promise<PromptPerformanceData[]> {
    const key = `${platform}_${audience}`;
    const data = this.promptDatabase.get(key) || [];
    
    return data
      .sort((a, b) => b.metrics.engagement_rate - a.metrics.engagement_rate)
      .slice(0, limit);
  }

  async generatePromptVariations(
    basePrompt: string,
    platform: string,
    variationCount: number = 3
  ): Promise<string[]> {
    if (!this.ai) {
      return [
        basePrompt + " 🔥",
        basePrompt + " ✨",
        basePrompt + " 💯"
      ];
    }

    try {
      const variationPrompt = `Generate ${variationCount} variations of this Japanese social media prompt for ${platform}:

"${basePrompt}"

Requirements:
- Maintain the core message and intent
- Adapt for ${platform} best practices
- Use different emotional triggers
- Vary the language style (casual, formal, trendy)
- Keep Japanese cultural context

Return as JSON array: ["variation1", "variation2", "variation3"]`;

      const model = this.ai.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(variationPrompt);
      const response = result.response.text();
      
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error("Error generating prompt variations:", error);
    }

    // Fallback variations
    return [
      basePrompt + " 🔥",
      basePrompt + " ✨",
      basePrompt + " 💯"
    ];
  }
}

export const llmPromptOptimizer = new LLMPromptOptimizer();