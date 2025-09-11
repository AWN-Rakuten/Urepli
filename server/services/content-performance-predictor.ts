import { GoogleGenAI } from "@google/genai";
import { storage } from "../storage";

export interface ContentPredictionRequest {
  title: string;
  script: string;
  platform: 'tiktok' | 'instagram' | 'youtube';
  audience: string;
  category: string;
  scheduled_time?: Date;
  hashtags?: string[];
  thumbnail_description?: string;
}

export interface ContentPredictionResult {
  predicted_engagement_rate: number;
  predicted_views: number;
  predicted_revenue: number;
  confidence_score: number;
  success_probability: number;
  risk_factors: string[];
  optimization_suggestions: string[];
  best_posting_time?: Date;
  recommended_hashtags: string[];
  competitive_analysis: {
    similar_content_performance: number;
    market_saturation: 'low' | 'medium' | 'high';
    trending_score: number;
  };
}

export interface HistoricalContentData {
  id: string;
  title: string;
  platform: string;
  category: string;
  views: number;
  revenue: number;
  engagement_rate: number;
  posted_at: Date;
  hashtags: string[];
  performance_score: number;
}

export class ContentPerformancePredictor {
  private ai: GoogleGenAI | null;
  private historicalData: HistoricalContentData[] = [];
  private trendingTopics: Map<string, number> = new Map();

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      console.warn("GEMINI_API_KEY not configured - Content Performance Predictor using mock responses");
      this.ai = null;
    } else {
      try {
        this.ai = new GoogleGenAI(apiKey);
      } catch (error) {
        console.warn("Failed to initialize Gemini AI for Content Performance Predictor - using mock responses");
        this.ai = null;
      }
    }
    this.loadHistoricalData();
  }

  private async loadHistoricalData() {
    try {
      const content = await storage.getContentWithMetrics();
      this.historicalData = content.map(item => ({
        id: item.id,
        title: item.title,
        platform: item.platform,
        category: 'general', // Default category
        views: item.views || 0,
        revenue: item.revenue || 0,
        engagement_rate: this.calculateEngagementRate(item),
        posted_at: item.createdAt || new Date(),
        hashtags: [], // Extract from title/metadata if available
        performance_score: this.calculatePerformanceScore(item)
      }));

      // Build trending topics map
      this.updateTrendingTopics();
    } catch (error) {
      console.warn("Failed to load historical content data:", error);
    }
  }

  private calculateEngagementRate(content: any): number {
    // Simple engagement calculation based on views and revenue
    if (content.views === 0) return 0;
    return Math.min((content.revenue * 100) / content.views, 10);
  }

  private calculatePerformanceScore(content: any): number {
    const viewsScore = Math.log(content.views + 1) * 10;
    const revenueScore = content.revenue * 5;
    return Math.min(viewsScore + revenueScore, 100);
  }

  private updateTrendingTopics() {
    // Analyze recent content to identify trending topics
    const recentContent = this.historicalData
      .filter(item => {
        const daysDiff = (Date.now() - item.posted_at.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= 7;
      })
      .sort((a, b) => b.performance_score - a.performance_score);

    // Extract keywords from top performing content
    recentContent.slice(0, 10).forEach(content => {
      const keywords = this.extractKeywords(content.title);
      keywords.forEach(keyword => {
        const currentScore = this.trendingTopics.get(keyword) || 0;
        this.trendingTopics.set(keyword, currentScore + content.performance_score);
      });
    });
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction for Japanese content
    const commonWords = ['の', 'は', 'が', 'を', 'に', 'で', 'と', 'から', 'まで', 'より'];
    return text
      .split(/[\s\u3000]+/)
      .filter(word => word.length > 1 && !commonWords.includes(word))
      .slice(0, 5);
  }

  async predictContentPerformance(request: ContentPredictionRequest): Promise<ContentPredictionResult> {
    if (!this.ai) {
      return this.generateMockPrediction(request);
    }

    try {
      // Analyze historical similar content
      const similarContent = this.findSimilarContent(request);
      
      // Get market analysis
      const marketAnalysis = await this.analyzeMarketConditions(request);
      
      // Generate LLM prediction
      const predictionPrompt = this.buildPredictionPrompt(request, similarContent, marketAnalysis);
      
      const model = this.ai.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(predictionPrompt);
      const response = result.response.text();
      
      return this.parsePredictionResponse(response, request, similarContent);
      
    } catch (error) {
      console.error("Error predicting content performance:", error);
      return this.generateMockPrediction(request);
    }
  }

  private findSimilarContent(request: ContentPredictionRequest): HistoricalContentData[] {
    // Find content with similar characteristics
    return this.historicalData
      .filter(item => 
        item.platform === request.platform &&
        this.calculateSimilarity(item.title, request.title) > 0.3
      )
      .sort((a, b) => b.performance_score - a.performance_score)
      .slice(0, 10);
  }

  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = this.extractKeywords(text1);
    const words2 = this.extractKeywords(text2);
    
    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = new Set([...words1, ...words2]).size;
    
    return totalWords > 0 ? commonWords.length / totalWords : 0;
  }

  private async analyzeMarketConditions(request: ContentPredictionRequest): Promise<string> {
    // Analyze current market conditions
    const platformMetrics = this.historicalData
      .filter(item => item.platform === request.platform)
      .slice(-50); // Recent 50 posts

    const avgViews = platformMetrics.reduce((sum, item) => sum + item.views, 0) / platformMetrics.length;
    const avgRevenue = platformMetrics.reduce((sum, item) => sum + item.revenue, 0) / platformMetrics.length;
    
    // Check trending topics relevance
    const titleKeywords = this.extractKeywords(request.title);
    const trendingScore = titleKeywords.reduce((score, keyword) => 
      score + (this.trendingTopics.get(keyword) || 0), 0
    );

    return JSON.stringify({
      platform_avg_views: avgViews,
      platform_avg_revenue: avgRevenue,
      trending_relevance: trendingScore,
      market_saturation: this.calculateMarketSaturation(request.category),
      optimal_posting_time: this.getOptimalPostingTime(request.platform)
    }, null, 2);
  }

  private calculateMarketSaturation(category: string): 'low' | 'medium' | 'high' {
    const recentPosts = this.historicalData
      .filter(item => {
        const daysDiff = (Date.now() - item.posted_at.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= 7;
      }).length;

    if (recentPosts < 10) return 'low';
    if (recentPosts < 25) return 'medium';
    return 'high';
  }

  private getOptimalPostingTime(platform: string): string {
    // Japanese market optimal times
    const optimalTimes = {
      tiktok: '19:00', // Evening peak
      instagram: '12:00', // Lunch time
      youtube: '21:00' // Night time
    };
    
    return optimalTimes[platform as keyof typeof optimalTimes] || '18:00';
  }

  private buildPredictionPrompt(
    request: ContentPredictionRequest,
    similarContent: HistoricalContentData[],
    marketAnalysis: string
  ): string {
    return `You are an expert AI content performance analyst specializing in Japanese social media.

TASK: Predict the performance of this content with high accuracy.

CONTENT TO ANALYZE:
Title: "${request.title}"
Script: "${request.script}"
Platform: ${request.platform}
Category: ${request.category}
Target Audience: ${request.audience}
Hashtags: ${request.hashtags?.join(', ') || 'None specified'}

HISTORICAL SIMILAR CONTENT PERFORMANCE:
${similarContent.map(item => 
  `- "${item.title}" | Views: ${item.views} | Revenue: ¥${item.revenue} | Engagement: ${item.engagement_rate}%`
).join('\n')}

MARKET ANALYSIS:
${marketAnalysis}

PREDICTION REQUIREMENTS:
1. Analyze content quality, trending potential, and market fit
2. Consider Japanese cultural preferences and current trends
3. Factor in platform-specific algorithms and user behavior
4. Provide realistic estimates based on historical data
5. Identify potential risks and optimization opportunities

RESPONSE FORMAT (JSON):
{
  "predicted_engagement_rate": 5.5,
  "predicted_views": 15000,
  "predicted_revenue": 2500,
  "confidence_score": 0.82,
  "success_probability": 0.75,
  "risk_factors": ["Market saturation in category", "Low trending relevance"],
  "optimization_suggestions": ["Add trending hashtag #トレンド", "Post during peak hours"],
  "recommended_hashtags": ["#おすすめ", "#日本", "#トレンド"],
  "competitive_analysis": {
    "similar_content_performance": 85,
    "market_saturation": "medium",
    "trending_score": 7.2
  }
}

Be conservative but realistic in predictions. Focus on actionable insights.`;
  }

  private parsePredictionResponse(
    response: string,
    request: ContentPredictionRequest,
    similarContent: HistoricalContentData[]
  ): ContentPredictionResult {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Calculate best posting time
        const bestTime = this.calculateBestPostingTime(request.platform, similarContent);
        
        return {
          predicted_engagement_rate: parsed.predicted_engagement_rate || 5.0,
          predicted_views: parsed.predicted_views || 10000,
          predicted_revenue: parsed.predicted_revenue || 1000,
          confidence_score: parsed.confidence_score || 0.7,
          success_probability: parsed.success_probability || 0.6,
          risk_factors: parsed.risk_factors || ["Unknown market conditions"],
          optimization_suggestions: parsed.optimization_suggestions || ["Add more engaging hashtags"],
          best_posting_time: bestTime,
          recommended_hashtags: parsed.recommended_hashtags || ["#おすすめ", "#日本"],
          competitive_analysis: parsed.competitive_analysis || {
            similar_content_performance: 70,
            market_saturation: 'medium' as const,
            trending_score: 5.0
          }
        };
      }
    } catch (error) {
      console.warn("Failed to parse LLM prediction response, using fallback");
    }
    
    return this.generateMockPrediction(request);
  }

  private calculateBestPostingTime(platform: string, similarContent: HistoricalContentData[]): Date {
    // Analyze when similar content performed best
    if (similarContent.length > 0) {
      const topPerformer = similarContent[0];
      const optimalHour = topPerformer.posted_at.getHours();
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(optimalHour, 0, 0, 0);
      
      return tomorrow;
    }
    
    // Default optimal times for Japanese market
    const optimalHours = {
      tiktok: 19,
      instagram: 12,
      youtube: 21
    };
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(optimalHours[platform as keyof typeof optimalHours] || 18, 0, 0, 0);
    
    return tomorrow;
  }

  private generateMockPrediction(request: ContentPredictionRequest): ContentPredictionResult {
    // Generate realistic mock predictions based on platform and content type
    const baseViews = {
      tiktok: 12000,
      instagram: 8000,
      youtube: 5000
    };

    const platformMultiplier = {
      tiktok: 1.5,
      instagram: 1.2,
      youtube: 0.8
    };

    const predictedViews = baseViews[request.platform] * (0.8 + Math.random() * 0.4);
    const engagementRate = 3 + Math.random() * 4; // 3-7% engagement
    const revenue = predictedViews * engagementRate * 0.02; // ¥0.02 per engaged view

    return {
      predicted_engagement_rate: Number(engagementRate.toFixed(2)),
      predicted_views: Math.round(predictedViews),
      predicted_revenue: Math.round(revenue),
      confidence_score: 0.75,
      success_probability: 0.68,
      risk_factors: [
        "Market competition in category",
        "Platform algorithm changes",
        "Audience fatigue with similar content"
      ],
      optimization_suggestions: [
        "Add trending Japanese hashtags",
        "Optimize posting time for target audience",
        "Include engaging visual elements",
        "Use platform-specific content format"
      ],
      best_posting_time: this.calculateBestPostingTime(request.platform, []),
      recommended_hashtags: ["#おすすめ", "#日本", "#トレンド", `#${request.platform}`],
      competitive_analysis: {
        similar_content_performance: 70 + Math.random() * 20,
        market_saturation: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low',
        trending_score: 5 + Math.random() * 3
      }
    };
  }

  async updateContentPerformance(
    contentId: string,
    actualViews: number,
    actualRevenue: number,
    actualEngagement: number
  ): Promise<void> {
    try {
      // Update our historical data with actual performance
      const content = this.historicalData.find(item => item.id === contentId);
      if (content) {
        content.views = actualViews;
        content.revenue = actualRevenue;
        content.engagement_rate = actualEngagement;
        content.performance_score = this.calculatePerformanceScore(content);
      }

      // Also update the persistent storage
      await storage.updateContent(contentId, {
        views: actualViews,
        revenue: actualRevenue
      });

      // Retrain trending topics based on new data
      this.updateTrendingTopics();

    } catch (error) {
      console.error("Failed to update content performance:", error);
    }
  }

  async getTrendingTopics(limit: number = 10): Promise<Array<{topic: string, score: number}>> {
    const sortedTopics = Array.from(this.trendingTopics.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([topic, score]) => ({ topic, score }));

    return sortedTopics;
  }

  async getContentRecommendations(
    platform: string,
    category: string,
    audience: string
  ): Promise<{
    trending_topics: string[];
    optimal_times: string[];
    hashtag_suggestions: string[];
    content_ideas: string[];
  }> {
    const trending = await this.getTrendingTopics(5);
    
    return {
      trending_topics: trending.map(t => t.topic),
      optimal_times: [
        this.getOptimalPostingTime(platform),
        '12:00', '18:00', '21:00'
      ],
      hashtag_suggestions: [
        '#おすすめ', '#日本', '#トレンド',
        `#${platform}`, `#${category}`
      ],
      content_ideas: [
        `${category}の最新トレンド解説`,
        `知らないと損する${category}のコツ`,
        `今話題の${category}をチェック`,
        `${category}初心者向けガイド`,
        `プロが教える${category}の秘密`
      ]
    };
  }
}

export const contentPerformancePredictor = new ContentPerformancePredictor();