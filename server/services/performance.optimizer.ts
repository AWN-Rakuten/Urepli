interface PerformanceMetrics {
  url: string;
  impressions: number;
  clicks: number;
  ctr: number;
  avgPosition: number;
  dwellTime: number;
  bounceRate: number;
  conversions: number;
  revenue: number;
  date: Date;
}

interface ContentVariant {
  id: string;
  type: 'title' | 'thumbnail' | 'meta_description' | 'hook' | 'cta';
  content: string;
  performanceScore: number;
  impressions: number;
  clicks: number;
  conversions: number;
  lastTested: Date;
}

interface BanditArm {
  id: string;
  variant: ContentVariant;
  successCount: number;
  totalCount: number;
  averageReward: number;
  confidenceInterval: [number, number];
  lastUpdated: Date;
}

interface OptimizationRecommendation {
  type: 'title' | 'content' | 'timing' | 'platform';
  description: string;
  expectedImprovement: number;
  confidence: number;
  implementation: string;
  priority: 'high' | 'medium' | 'low';
}

class PerformanceOptimizationService {
  private banditArms: Map<string, BanditArm[]> = new Map();
  private performanceHistory: Map<string, PerformanceMetrics[]> = new Map();

  /**
   * Multi-Armed Bandit Algorithm for Content Optimization
   * Using Thompson Sampling for exploration vs exploitation
   */
  private thompsonSampling(arms: BanditArm[]): string {
    let bestArmId = '';
    let bestSample = -1;

    for (const arm of arms) {
      // Beta distribution parameters
      const alpha = arm.successCount + 1;
      const beta = arm.totalCount - arm.successCount + 1;
      
      // Sample from beta distribution (simplified approximation)
      const sample = this.sampleBeta(alpha, beta);
      
      if (sample > bestSample) {
        bestSample = sample;
        bestArmId = arm.id;
      }
    }

    return bestArmId;
  }

  /**
   * Simplified Beta distribution sampling
   */
  private sampleBeta(alpha: number, beta: number): number {
    // Simplified beta sampling using ratio method
    const x = this.gammaRandom(alpha);
    const y = this.gammaRandom(beta);
    return x / (x + y);
  }

  /**
   * Gamma distribution random sampling (simplified)
   */
  private gammaRandom(alpha: number): number {
    // Simplified gamma sampling for demonstration
    // In production, use proper gamma distribution implementation
    if (alpha < 1) {
      return Math.pow(Math.random(), 1/alpha);
    }
    
    let sum = 0;
    for (let i = 0; i < Math.floor(alpha); i++) {
      sum += -Math.log(Math.random());
    }
    return sum;
  }

  /**
   * Update bandit arm performance with new data
   */
  async updateArmPerformance(
    contentId: string, 
    variantId: string, 
    success: boolean,
    reward: number = 0
  ): Promise<void> {
    const arms = this.banditArms.get(contentId) || [];
    const arm = arms.find(a => a.id === variantId);
    
    if (arm) {
      arm.totalCount++;
      if (success) {
        arm.successCount++;
      }
      
      // Update average reward using exponential moving average
      const alpha = 0.1; // Learning rate
      arm.averageReward = (1 - alpha) * arm.averageReward + alpha * reward;
      
      // Update confidence interval
      arm.confidenceInterval = this.calculateConfidenceInterval(arm);
      arm.lastUpdated = new Date();
      
      this.banditArms.set(contentId, arms);
    }
  }

  /**
   * Calculate confidence interval for arm performance
   */
  private calculateConfidenceInterval(arm: BanditArm): [number, number] {
    if (arm.totalCount === 0) {
      return [0, 1];
    }
    
    const p = arm.successCount / arm.totalCount;
    const n = arm.totalCount;
    const z = 1.96; // 95% confidence
    
    const margin = z * Math.sqrt((p * (1 - p)) / n);
    return [
      Math.max(0, p - margin),
      Math.min(1, p + margin)
    ];
  }

  /**
   * Select optimal content variant using bandit algorithm
   */
  selectOptimalVariant(contentId: string): ContentVariant | null {
    const arms = this.banditArms.get(contentId);
    if (!arms || arms.length === 0) {
      return null;
    }

    const selectedArmId = this.thompsonSampling(arms);
    const selectedArm = arms.find(a => a.id === selectedArmId);
    
    return selectedArm?.variant || null;
  }

  /**
   * Add new content variant to test
   */
  addContentVariant(
    contentId: string,
    variant: ContentVariant
  ): void {
    const arms = this.banditArms.get(contentId) || [];
    
    const newArm: BanditArm = {
      id: variant.id,
      variant,
      successCount: 0,
      totalCount: 0,
      averageReward: 0,
      confidenceInterval: [0, 1],
      lastUpdated: new Date()
    };
    
    arms.push(newArm);
    this.banditArms.set(contentId, arms);
  }

  /**
   * Analyze performance metrics and generate optimization recommendations
   */
  async analyzePerformance(contentId: string): Promise<OptimizationRecommendation[]> {
    const metrics = this.performanceHistory.get(contentId) || [];
    if (metrics.length < 7) {
      return []; // Need at least a week of data
    }

    const recommendations: OptimizationRecommendation[] = [];
    
    // Analyze CTR trends
    const ctrTrend = this.calculateTrend(metrics.map(m => m.ctr));
    if (ctrTrend < -0.1) {
      recommendations.push({
        type: 'title',
        description: 'CTRが低下傾向です。タイトルの改善を検討してください。',
        expectedImprovement: 0.15,
        confidence: 0.8,
        implementation: 'A/Bテストで新しいタイトルをテストする',
        priority: 'high'
      });
    }

    // Analyze dwell time
    const avgDwellTime = metrics.reduce((sum, m) => sum + m.dwellTime, 0) / metrics.length;
    if (avgDwellTime < 30) { // Less than 30 seconds
      recommendations.push({
        type: 'content',
        description: '滞在時間が短いです。コンテンツの質と構造を改善してください。',
        expectedImprovement: 0.25,
        confidence: 0.7,
        implementation: 'より魅力的な導入部分、見出し構造の改善、視覚的要素の追加',
        priority: 'high'
      });
    }

    // Analyze bounce rate
    const avgBounceRate = metrics.reduce((sum, m) => sum + m.bounceRate, 0) / metrics.length;
    if (avgBounceRate > 0.7) {
      recommendations.push({
        type: 'content',
        description: '直帰率が高いです。関連記事の内部リンクを強化してください。',
        expectedImprovement: 0.2,
        confidence: 0.75,
        implementation: '関連記事セクションの追加、内部リンクの最適化',
        priority: 'medium'
      });
    }

    // Analyze conversion trends
    const conversionTrend = this.calculateTrend(metrics.map(m => m.conversions));
    if (conversionTrend < -0.05) {
      recommendations.push({
        type: 'cta',
        description: 'コンバージョン率が低下しています。CTAの改善を検討してください。',
        expectedImprovement: 0.3,
        confidence: 0.85,
        implementation: 'CTAボタンの位置、文言、デザインの改善',
        priority: 'high'
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Calculate trend (positive = increasing, negative = decreasing)
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const xSum = (n * (n - 1)) / 2;
    const ySum = values.reduce((sum, val) => sum + val, 0);
    const xySum = values.reduce((sum, val, i) => sum + (i * val), 0);
    const x2Sum = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum);
    return slope;
  }

  /**
   * Record performance metrics
   */
  recordPerformance(contentId: string, metrics: PerformanceMetrics): void {
    const history = this.performanceHistory.get(contentId) || [];
    history.push(metrics);
    
    // Keep only last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentHistory = history.filter(m => m.date > thirtyDaysAgo);
    
    this.performanceHistory.set(contentId, recentHistory);
  }

  /**
   * Get performance summary for content
   */
  getPerformanceSummary(contentId: string): {
    averageCtr: number;
    averageDwellTime: number;
    averageBounceRate: number;
    totalConversions: number;
    totalRevenue: number;
    trendScore: number;
  } {
    const metrics = this.performanceHistory.get(contentId) || [];
    if (metrics.length === 0) {
      return {
        averageCtr: 0,
        averageDwellTime: 0,
        averageBounceRate: 0,
        totalConversions: 0,
        totalRevenue: 0,
        trendScore: 0
      };
    }

    const avgCtr = metrics.reduce((sum, m) => sum + m.ctr, 0) / metrics.length;
    const avgDwellTime = metrics.reduce((sum, m) => sum + m.dwellTime, 0) / metrics.length;
    const avgBounceRate = metrics.reduce((sum, m) => sum + m.bounceRate, 0) / metrics.length;
    const totalConversions = metrics.reduce((sum, m) => sum + m.conversions, 0);
    const totalRevenue = metrics.reduce((sum, m) => sum + m.revenue, 0);
    
    // Calculate overall trend score
    const ctrTrend = this.calculateTrend(metrics.map(m => m.ctr));
    const conversionTrend = this.calculateTrend(metrics.map(m => m.conversions));
    const trendScore = (ctrTrend + conversionTrend) / 2;

    return {
      averageCtr: avgCtr,
      averageDwellTime: avgDwellTime,
      averageBounceRate: avgBounceRate,
      totalConversions,
      totalRevenue,
      trendScore
    };
  }

  /**
   * Auto-optimize content based on performance data
   */
  async autoOptimizeContent(contentId: string): Promise<{
    optimizationsApplied: string[];
    expectedImprovement: number;
    newVariants: ContentVariant[];
  }> {
    const recommendations = await this.analyzePerformance(contentId);
    const optimizationsApplied: string[] = [];
    const newVariants: ContentVariant[] = [];
    let totalExpectedImprovement = 0;

    for (const rec of recommendations.filter(r => r.priority === 'high')) {
      if (rec.type === 'title') {
        // Generate new title variants
        const newTitles = await this.generateTitleVariants(contentId);
        newTitles.forEach(title => {
          const variant: ContentVariant = {
            id: `title_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'title',
            content: title,
            performanceScore: 0,
            impressions: 0,
            clicks: 0,
            conversions: 0,
            lastTested: new Date()
          };
          this.addContentVariant(contentId, variant);
          newVariants.push(variant);
        });
        optimizationsApplied.push('タイトル最適化');
        totalExpectedImprovement += rec.expectedImprovement;
      }
      
      if (rec.type === 'content') {
        optimizationsApplied.push('コンテンツ構造最適化');
        totalExpectedImprovement += rec.expectedImprovement;
      }
    }

    return {
      optimizationsApplied,
      expectedImprovement: totalExpectedImprovement,
      newVariants
    };
  }

  /**
   * Generate title variants (mock implementation)
   */
  private async generateTitleVariants(contentId: string): Promise<string[]> {
    // Mock title generation - in production would use AI service
    const baseTitle = "コンテンツタイトル";
    return [
      `${baseTitle} - 完全ガイド`,
      `最新版: ${baseTitle}のすべて`,
      `${baseTitle}で失敗しない方法`,
      `専門家が教える${baseTitle}の秘訣`
    ];
  }

  /**
   * Get optimization insights for dashboard
   */
  getOptimizationInsights(): {
    totalContentsTracked: number;
    averageImprovement: number;
    topPerformers: string[];
    optimizationOpportunities: number;
  } {
    const totalContents = this.performanceHistory.size;
    let totalImprovement = 0;
    let improvementCount = 0;
    const topPerformers: string[] = [];
    let opportunities = 0;

    for (const [contentId, metrics] of this.performanceHistory) {
      if (metrics.length >= 7) {
        const ctrTrend = this.calculateTrend(metrics.map(m => m.ctr));
        if (ctrTrend > 0.05) {
          totalImprovement += ctrTrend;
          improvementCount++;
          if (ctrTrend > 0.2) {
            topPerformers.push(contentId);
          }
        }
        
        // Check for optimization opportunities
        const avgCtr = metrics.reduce((sum, m) => sum + m.ctr, 0) / metrics.length;
        if (avgCtr < 0.02) {
          opportunities++;
        }
      }
    }

    return {
      totalContentsTracked: totalContents,
      averageImprovement: improvementCount > 0 ? totalImprovement / improvementCount : 0,
      topPerformers: topPerformers.slice(0, 5),
      optimizationOpportunities: opportunities
    };
  }

  /**
   * Run automated optimization cycle
   */
  async runOptimizationCycle(): Promise<{
    contentsOptimized: number;
    variantsCreated: number;
    totalExpectedImprovement: number;
  }> {
    let contentsOptimized = 0;
    let variantsCreated = 0;
    let totalExpectedImprovement = 0;

    for (const contentId of this.performanceHistory.keys()) {
      try {
        const result = await this.autoOptimizeContent(contentId);
        if (result.optimizationsApplied.length > 0) {
          contentsOptimized++;
          variantsCreated += result.newVariants.length;
          totalExpectedImprovement += result.expectedImprovement;
        }
      } catch (error) {
        console.error(`Optimization failed for content ${contentId}:`, error);
      }
    }

    return {
      contentsOptimized,
      variantsCreated,
      totalExpectedImprovement
    };
  }
}

export const performanceOptimizer = new PerformanceOptimizationService();
export { PerformanceOptimizationService, PerformanceMetrics, ContentVariant, OptimizationRecommendation };