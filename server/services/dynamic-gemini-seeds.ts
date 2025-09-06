import { GeminiService } from './gemini';
import { storage } from '../storage';

export interface GeminiSeed {
  id: string;
  name: string;
  description: string;
  category: 'content_generation' | 'optimization' | 'personalization' | 'analysis';
  seedValue: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  topK: number;
  isActive: boolean;
  performanceScore: number;
  useCount: number;
  successRate: number;
  avgResponseTime: number;
  createdAt: Date;
  lastUsed?: Date;
  lastOptimized?: Date;
}

export interface SeedOptimizationResult {
  originalSeed: GeminiSeed;
  optimizedSeed: GeminiSeed;
  improvements: string[];
  performanceGain: number;
  reasoning: string;
}

export class DynamicGeminiSeedManager {
  private geminiService: GeminiService;

  // Predefined high-performing seeds for Japanese market
  private baseSeedsJapanese: Omit<GeminiSeed, 'id' | 'performanceScore' | 'useCount' | 'successRate' | 'avgResponseTime' | 'createdAt'>[] = [
    {
      name: 'Japanese MNP Script Generator',
      description: 'Generate engaging Japanese MNP switching content with cultural nuances',
      category: 'content_generation',
      seedValue: `You are a Japanese mobile marketing expert creating viral TikTok content about MNP (携帯電話番号ポータビリティ) carrier switching. 

CONTEXT: Japanese mobile users are highly price-conscious and value-driven. Use appropriate keigo (honorific language) and cultural references.

REQUIREMENTS:
- Use natural Japanese expressions and slang appropriate for TikTok
- Include specific savings amounts in yen
- Reference popular Japanese carriers (ドコモ, au, ソフトバンク, 楽天モバイル)  
- Add emotional hooks about saving money or getting better service
- Include call-to-action with urgency (limited time offers, etc.)
- Use casual but respectful tone suitable for young adults

STRUCTURE:
1. Hook (驚きのフック): Open with surprising savings amount or benefit
2. Problem (問題提起): Current carrier frustrations
3. Solution (解決策): MNP switching benefits  
4. Proof (証明): Specific numbers and testimonials
5. CTA (行動促進): Clear next steps with affiliate link

Generate content that feels authentic to Japanese social media culture while driving MNP conversions.`,
      temperature: 0.8,
      maxTokens: 1000,
      topP: 0.9,
      topK: 40,
      isActive: true
    },
    {
      name: 'Japanese Affiliate Product Integrator',
      description: 'Seamlessly integrate affiliate products into Japanese video content',
      category: 'content_generation',
      seedValue: `You are a Japanese affiliate marketing specialist integrating product recommendations naturally into video content.

CONTEXT: Japanese consumers value authenticity and detailed product information. They prefer subtle recommendations over aggressive sales pitches.

APPROACH:
- Use storytelling format (ストーリーテリング)
- Provide genuine personal experiences or user testimonials  
- Include specific product benefits relevant to Japanese lifestyle
- Use appropriate product names and pricing in yen
- Add seasonal relevance when applicable
- Reference popular Japanese review sites or influencers when relevant

INTEGRATION STYLE:
- Natural product mentions within valuable content
- Problem-solution format highlighting product benefits
- Comparison with alternatives available in Japan
- Cultural context (why this product suits Japanese needs)
- Trust-building elements (reviews, guarantees, return policies)

Generate content that feels like genuine recommendations from a trusted friend rather than advertising.`,
      temperature: 0.7,
      maxTokens: 800,
      topP: 0.85,
      topK: 35,
      isActive: true
    },
    {
      name: 'Japanese Cultural Optimizer',
      description: 'Optimize content for Japanese cultural preferences and timing',
      category: 'optimization',
      seedValue: `You are a Japanese cultural marketing expert optimizing content for maximum engagement and conversion.

CULTURAL FACTORS TO CONSIDER:
- Seasonal events (お盆, 正月, ゴールデンウィーク, etc.)
- Business cycles (fiscal year ending in March, bonus seasons)
- Social norms around money discussions (subtle, value-focused)
- Communication style preferences (indirect, context-heavy)
- Visual aesthetics popular in Japan (minimalist, clean, cute elements)
- Platform-specific behaviors on Japanese TikTok/Instagram

OPTIMIZATION AREAS:
1. Timing: Best posting times for Japanese audiences
2. Language: Appropriate formality level and expressions  
3. Visuals: Colors, fonts, imagery that resonate in Japan
4. Cultural references: Relevant analogies and examples
5. Social proof: Types of testimonials that build trust
6. Call-to-action: Phrasing that motivates action without being pushy

Provide specific recommendations for improving content performance in Japanese market.`,
      temperature: 0.6,
      maxTokens: 700,
      topP: 0.8,
      topK: 30,
      isActive: true
    },
    {
      name: 'Performance Analysis Expert',
      description: 'Analyze content performance and provide optimization insights',
      category: 'analysis',
      seedValue: `You are a Japanese digital marketing analytics expert analyzing content performance data.

ANALYSIS FRAMEWORK:
- Performance metrics interpretation for Japanese market
- Cultural factors affecting engagement (time, format, messaging)
- Conversion funnel analysis specific to Japanese consumer behavior
- Competitor analysis in Japanese affiliate marketing space
- ROI optimization recommendations

DATA POINTS TO ANALYZE:
1. Engagement rates by time of day/week
2. Conversion rates by traffic source  
3. Demographics performance (age, gender, region)
4. Content format effectiveness (video length, style, messaging)
5. Affiliate program performance comparison
6. Seasonal trends and patterns

DELIVERABLES:
- Performance summary with key insights
- Actionable recommendations for improvement
- Predicted outcomes of proposed changes
- Risk assessment of optimization strategies
- Implementation timeline and priority ranking

Provide data-driven insights with clear explanations and Japanese market context.`,
      temperature: 0.5,
      maxTokens: 900,
      topP: 0.75,
      topK: 25,
      isActive: true
    },
    {
      name: 'Personalized Content Creator',
      description: 'Create personalized content based on user segments and behavior',
      category: 'personalization',
      seedValue: `You are a Japanese personalization expert creating tailored content for different user segments.

JAPANESE CONSUMER SEGMENTS:
1. 節約志向層 (Budget-conscious): Focus on savings, value, cost comparisons
2. 品質重視層 (Quality-focused): Emphasize reliability, service quality, brand trust
3. トレンド追従層 (Trend-followers): Latest technology, popular choices, social proof  
4. 安心志向層 (Security-focused): Safety, guarantee, customer support, established brands

PERSONALIZATION FACTORS:
- Demographics (age, gender, income level, location)
- Past behavior (viewed content, clicked links, purchase history)
- Current context (season, events, trending topics)
- Device and platform preferences
- Engagement patterns and preferred content types

CONTENT ADAPTATION:
- Adjust language formality and vocabulary
- Select relevant examples and use cases
- Modify value propositions and benefits
- Choose appropriate visual and audio elements
- Customize call-to-action messaging
- Optimize timing and frequency

Generate highly personalized content that resonates with specific Japanese user segments while maintaining authenticity and cultural appropriateness.`,
      temperature: 0.9,
      maxTokens: 1200,
      topP: 0.95,
      topK: 45,
      isActive: true
    }
  ];

  constructor() {
    this.geminiService = new GeminiService();
  }

  /**
   * Initialize seed database with base seeds
   */
  async initializeSeeds(): Promise<void> {
    const existingSeeds = await storage.getGeminiSeeds();
    
    if (existingSeeds.length === 0) {
      // Create base seeds
      for (const baseSeed of this.baseSeedsJapanese) {
        const seed: GeminiSeed = {
          ...baseSeed,
          id: `seed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          performanceScore: 75, // Starting score
          useCount: 0,
          successRate: 0,
          avgResponseTime: 0,
          createdAt: new Date()
        };
        
        await storage.createGeminiSeed(seed);
      }

      await storage.createAutomationLog({
        type: 'seed_initialization',
        message: `Initialized ${this.baseSeedsJapanese.length} base Gemini seeds for Japanese market`,
        status: 'success',
        metadata: { seedCount: this.baseSeedsJapanese.length }
      });
    }
  }

  /**
   * Get all active seeds
   */
  async getActiveSeeds(category?: string): Promise<GeminiSeed[]> {
    const seeds = await storage.getGeminiSeeds();
    return seeds
      .filter(seed => seed.isActive && (!category || seed.category === category))
      .sort((a, b) => b.performanceScore - a.performanceScore);
  }

  /**
   * Get best performing seed for a category
   */
  async getBestSeed(category: string): Promise<GeminiSeed | null> {
    const categorySeeds = await this.getActiveSeeds(category);
    return categorySeeds.length > 0 ? categorySeeds[0] : null;
  }

  /**
   * Create new seed using Gemini AI
   */
  async createOptimizedSeed(
    baseCategory: string,
    performance: { successRate: number; avgResponseTime: number; userFeedback?: string[] },
    context?: string
  ): Promise<GeminiSeed> {
    const existingSeeds = await this.getActiveSeeds(baseCategory);
    const topSeeds = existingSeeds.slice(0, 3); // Get top 3 performing seeds

    const optimizationPrompt = `
Based on the following high-performing Gemini seeds and performance data, create a new optimized seed for ${baseCategory}:

EXISTING TOP PERFORMERS:
${topSeeds.map(seed => `
Name: ${seed.name}
Performance Score: ${seed.performanceScore}
Success Rate: ${seed.successRate}%
Seed Content: ${seed.seedValue}
`).join('\n---\n')}

PERFORMANCE DATA:
- Success Rate: ${performance.successRate}%
- Avg Response Time: ${performance.avgResponseTime}ms
- User Feedback: ${performance.userFeedback?.join(', ') || 'None'}

CONTEXT: ${context || 'Japanese affiliate marketing for mobile and lifestyle products'}

CREATE A NEW SEED THAT:
1. Combines the best elements of top performers
2. Addresses any weaknesses shown in performance data
3. Incorporates user feedback if provided
4. Optimizes for Japanese market preferences
5. Maintains cultural authenticity and effectiveness

Provide the new seed in JSON format with these fields:
- name: Descriptive name for the seed
- description: What this seed accomplishes
- seedValue: The actual prompt/instruction text
- temperature: Optimal temperature setting (0.1-1.0)
- maxTokens: Recommended token limit
- topP: Nucleus sampling parameter
- topK: Top-k sampling parameter
- reasoning: Explanation of optimization choices
`;

    try {
      const response = await this.geminiService.generateContent(optimizationPrompt, {
        temperature: 0.7,
        maxTokens: 1500
      });

      // Parse the response to create new seed
      const seedData = this.parseGeminiResponse(response);
      const newSeed: GeminiSeed = {
        id: `seed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        category: baseCategory as any,
        performanceScore: 70, // Starting score for new seeds
        useCount: 0,
        successRate: 0,
        avgResponseTime: 0,
        isActive: true,
        createdAt: new Date(),
        ...seedData
      };

      await storage.createGeminiSeed(newSeed);
      
      await storage.createAutomationLog({
        type: 'seed_optimization',
        message: `Created optimized Gemini seed: ${newSeed.name}`,
        status: 'success',
        metadata: { seedId: newSeed.id, category: baseCategory }
      });

      return newSeed;
    } catch (error) {
      console.error('Error creating optimized seed:', error);
      throw new Error('Failed to create optimized seed');
    }
  }

  /**
   * Update seed performance based on usage
   */
  async updateSeedPerformance(
    seedId: string,
    metrics: {
      successful: boolean;
      responseTime: number;
      contentQuality?: number; // 1-10 scale
      userEngagement?: number; // engagement metrics
      conversionRate?: number; // if applicable
    }
  ): Promise<void> {
    const seed = await storage.getGeminiSeed(seedId);
    if (!seed) return;

    // Update usage statistics
    const newUseCount = seed.useCount + 1;
    const newSuccessCount = seed.successRate * seed.useCount + (metrics.successful ? 1 : 0);
    const newSuccessRate = (newSuccessCount / newUseCount) * 100;
    
    const newAvgResponseTime = 
      ((seed.avgResponseTime * seed.useCount) + metrics.responseTime) / newUseCount;

    // Calculate new performance score
    let performanceScore = seed.performanceScore;
    
    if (metrics.successful) {
      performanceScore += 2; // Boost for success
    } else {
      performanceScore = Math.max(0, performanceScore - 5); // Penalty for failure
    }

    // Factor in response time (faster is better, within reason)
    if (metrics.responseTime < 2000) {
      performanceScore += 1;
    } else if (metrics.responseTime > 5000) {
      performanceScore = Math.max(0, performanceScore - 2);
    }

    // Factor in content quality if provided
    if (metrics.contentQuality) {
      const qualityBonus = (metrics.contentQuality - 5) * 2; // -10 to +10 range
      performanceScore = Math.max(0, performanceScore + qualityBonus);
    }

    // Cap performance score
    performanceScore = Math.min(100, performanceScore);

    await storage.updateGeminiSeed(seedId, {
      useCount: newUseCount,
      successRate: newSuccessRate,
      avgResponseTime: newAvgResponseTime,
      performanceScore,
      lastUsed: new Date()
    });
  }

  /**
   * Auto-optimize underperforming seeds
   */
  async autoOptimizeSeeds(): Promise<SeedOptimizationResult[]> {
    const allSeeds = await storage.getGeminiSeeds();
    const results: SeedOptimizationResult[] = [];

    // Find seeds that need optimization (low performance, high usage)
    const seedsToOptimize = allSeeds.filter(seed => 
      seed.isActive && 
      seed.useCount > 10 && 
      seed.performanceScore < 60
    );

    for (const seed of seedsToOptimize) {
      try {
        // Create optimized version
        const optimized = await this.createOptimizedSeed(
          seed.category,
          {
            successRate: seed.successRate,
            avgResponseTime: seed.avgResponseTime
          },
          `Optimize the underperforming seed: ${seed.name}`
        );

        results.push({
          originalSeed: seed,
          optimizedSeed: optimized,
          improvements: [
            'Enhanced prompt structure',
            'Improved Japanese cultural context',
            'Optimized parameter settings'
          ],
          performanceGain: optimized.performanceScore - seed.performanceScore,
          reasoning: 'Automatically optimized based on performance metrics'
        });

        // Deactivate original if new one performs better after initial testing
        setTimeout(async () => {
          if (optimized.performanceScore > seed.performanceScore + 10) {
            await storage.updateGeminiSeed(seed.id, { isActive: false });
          }
        }, 24 * 60 * 60 * 1000); // Check after 24 hours

      } catch (error) {
        console.error(`Error optimizing seed ${seed.id}:`, error);
      }
    }

    if (results.length > 0) {
      await storage.createAutomationLog({
        type: 'auto_seed_optimization',
        message: `Auto-optimized ${results.length} Gemini seeds`,
        status: 'success',
        metadata: { optimizedCount: results.length }
      });
    }

    return results;
  }

  /**
   * Get seed recommendations based on content type and audience
   */
  async getSeedRecommendations(
    contentType: string,
    targetAudience: string[],
    platform: string
  ): Promise<GeminiSeed[]> {
    const allSeeds = await this.getActiveSeeds();
    
    // Score seeds based on relevance to request
    const scoredSeeds = allSeeds.map(seed => {
      let relevanceScore = seed.performanceScore;
      
      // Boost score for relevant category
      if (contentType === 'content_generation' && seed.category === 'content_generation') {
        relevanceScore += 20;
      }
      
      // Boost for platform-specific seeds
      if (seed.seedValue.toLowerCase().includes(platform.toLowerCase())) {
        relevanceScore += 10;
      }
      
      // Boost for audience-relevant seeds
      const audienceMatch = targetAudience.some(audience => 
        seed.seedValue.toLowerCase().includes(audience.toLowerCase())
      );
      if (audienceMatch) {
        relevanceScore += 15;
      }
      
      return { ...seed, relevanceScore };
    });

    return scoredSeeds
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5);
  }

  /**
   * Generate content using dynamic seed selection
   */
  async generateWithOptimalSeed(
    category: string,
    prompt: string,
    context?: Record<string, any>
  ): Promise<{
    content: string;
    seedUsed: GeminiSeed;
    performance: { responseTime: number; successful: boolean };
  }> {
    const startTime = Date.now();
    const bestSeed = await this.getBestSeed(category);
    
    if (!bestSeed) {
      throw new Error(`No active seeds found for category: ${category}`);
    }

    try {
      // Combine seed with user prompt
      const fullPrompt = `${bestSeed.seedValue}\n\nUSER REQUEST: ${prompt}`;
      
      if (context) {
        fullPrompt += `\n\nCONTEXT: ${JSON.stringify(context, null, 2)}`;
      }

      const content = await this.geminiService.generateContent(fullPrompt, {
        temperature: bestSeed.temperature,
        maxTokens: bestSeed.maxTokens
      });

      const responseTime = Date.now() - startTime;
      const successful = content && content.length > 50; // Basic success check

      // Update seed performance
      await this.updateSeedPerformance(bestSeed.id, {
        successful,
        responseTime,
        contentQuality: successful ? 8 : 3 // Estimate based on success
      });

      return {
        content,
        seedUsed: bestSeed,
        performance: { responseTime, successful }
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      await this.updateSeedPerformance(bestSeed.id, {
        successful: false,
        responseTime
      });

      throw error;
    }
  }

  /**
   * Parse Gemini response for seed creation
   */
  private parseGeminiResponse(response: string): Partial<GeminiSeed> {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          name: parsed.name || 'Optimized Seed',
          description: parsed.description || 'AI-optimized seed',
          seedValue: parsed.seedValue || response,
          temperature: parsed.temperature || 0.7,
          maxTokens: parsed.maxTokens || 1000,
          topP: parsed.topP || 0.9,
          topK: parsed.topK || 40
        };
      }
    } catch (error) {
      console.error('Error parsing Gemini response:', error);
    }

    // Fallback: use response as seed value
    return {
      name: 'AI Generated Seed',
      description: 'Dynamically created optimization seed',
      seedValue: response,
      temperature: 0.7,
      maxTokens: 1000,
      topP: 0.9,
      topK: 40
    };
  }

  /**
   * Export seed performance report
   */
  async exportSeedPerformanceReport(): Promise<{
    totalSeeds: number;
    activeSeeds: number;
    avgPerformanceScore: number;
    topPerformers: GeminiSeed[];
    underPerformers: GeminiSeed[];
    categoryBreakdown: Record<string, { count: number; avgScore: number }>;
    optimizationHistory: Array<{
      date: Date;
      optimizedSeeds: number;
      avgImprovement: number;
    }>;
  }> {
    const allSeeds = await storage.getGeminiSeeds();
    const activeSeeds = allSeeds.filter(seed => seed.isActive);
    
    const totalSeeds = allSeeds.length;
    const activeSeedCount = activeSeeds.length;
    const avgPerformanceScore = activeSeeds.reduce((sum, seed) => sum + seed.performanceScore, 0) / activeSeedCount;
    
    const topPerformers = activeSeeds
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .slice(0, 5);
      
    const underPerformers = activeSeeds
      .filter(seed => seed.useCount > 5)
      .sort((a, b) => a.performanceScore - b.performanceScore)
      .slice(0, 5);

    // Category breakdown
    const categoryBreakdown: Record<string, { count: number; avgScore: number }> = {};
    for (const seed of activeSeeds) {
      if (!categoryBreakdown[seed.category]) {
        categoryBreakdown[seed.category] = { count: 0, avgScore: 0 };
      }
      categoryBreakdown[seed.category].count++;
    }
    
    // Calculate average scores for categories
    for (const category in categoryBreakdown) {
      const categorySeeds = activeSeeds.filter(seed => seed.category === category);
      categoryBreakdown[category].avgScore = 
        categorySeeds.reduce((sum, seed) => sum + seed.performanceScore, 0) / categorySeeds.length;
    }

    return {
      totalSeeds,
      activeSeeds: activeSeedCount,
      avgPerformanceScore,
      topPerformers,
      underPerformers,
      categoryBreakdown,
      optimizationHistory: [] // Would be populated from logs in real implementation
    };
  }
}