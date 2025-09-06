import { GoogleCloudAutomation } from './google-cloud-automation';
import { GoogleCloudROIMonitor } from './google-cloud-roi-monitor';
import { OpenSourceIntegrations } from './open-source-integrations';
import { Firestore } from '@google-cloud/firestore';
import { BigQuery } from '@google-cloud/bigquery';
import { CloudSchedulerClient } from '@google-cloud/scheduler';

export interface OptimalSchedule {
  id: string;
  platform: string;
  contentType: 'video' | 'image' | 'carousel' | 'story';
  scheduledTime: Date;
  timezone: string;
  confidence: number;
  expectedEngagement: number;
  expectedReach: number;
  expectedROI: number;
  audienceFactor: number;
  competitionFactor: number;
  seasonalFactor: number;
}

export interface SchedulingConstraints {
  platforms: string[];
  timeRange: {
    startTime: string; // HH:MM format
    endTime: string;
  };
  daysOfWeek: number[]; // 0 = Sunday, 1 = Monday, etc.
  minInterval: number; // Minutes between posts on same platform
  maxPostsPerDay: Record<string, number>;
  avoidCompetitor: boolean;
  prioritizeEngagement: boolean;
}

export interface ContentPerformancePredictor {
  platform: string;
  contentType: string;
  predictedMetrics: {
    reach: { min: number; max: number; expected: number };
    engagement: { rate: number; total: number };
    clicks: number;
    conversions: number;
    revenue: number;
    cost: number;
    roi: number;
  };
  confidence: number;
  factors: Array<{
    name: string;
    impact: number; // -100 to +100
    description: string;
  }>;
}

export class IntelligentScheduler {
  private cloudAutomation: GoogleCloudAutomation;
  private roiMonitor: GoogleCloudROIMonitor;
  private integrations: OpenSourceIntegrations;
  private firestore: Firestore;
  private bigquery: BigQuery;
  private scheduler: CloudSchedulerClient;
  
  private readonly PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID || 'mnp-dashboard';
  
  // Japanese market timing patterns
  private readonly JAPANESE_OPTIMAL_TIMES = {
    tiktok: {
      weekdays: [
        { hour: 7, minute: 30, score: 85, reason: '通勤時間' },
        { hour: 12, minute: 15, score: 90, reason: '昼休み' },
        { hour: 19, minute: 45, score: 95, reason: '帰宅後' },
        { hour: 22, minute: 30, score: 88, reason: 'リラックスタイム' },
      ],
      weekends: [
        { hour: 10, minute: 0, score: 80, reason: '朝のゆっくり時間' },
        { hour: 14, minute: 30, score: 85, reason: '午後のくつろぎ' },
        { hour: 20, minute: 0, score: 92, reason: '夜のエンタメ時間' },
      ],
    },
    instagram: {
      weekdays: [
        { hour: 8, minute: 0, score: 75, reason: '朝の情報収集' },
        { hour: 12, minute: 30, score: 88, reason: '昼休み' },
        { hour: 18, minute: 30, score: 92, reason: '夕方の休憩' },
        { hour: 21, minute: 15, score: 89, reason: '夜のSNSタイム' },
      ],
      weekends: [
        { hour: 11, minute: 0, score: 83, reason: '週末の朝' },
        { hour: 15, minute: 30, score: 87, reason: '午後のライフスタイル投稿' },
        { hour: 19, minute: 30, score: 90, reason: '夜の投稿タイム' },
      ],
    },
    youtube: {
      weekdays: [
        { hour: 19, minute: 0, score: 88, reason: '帰宅後の動画視聴' },
        { hour: 21, minute: 30, score: 93, reason: '夜のゴールデンタイム' },
      ],
      weekends: [
        { hour: 13, minute: 0, score: 85, reason: '昼下がりの動画時間' },
        { hour: 20, minute: 30, score: 91, reason: '週末夜の動画タイム' },
      ],
    },
  };

  constructor() {
    this.cloudAutomation = new GoogleCloudAutomation();
    this.roiMonitor = new GoogleCloudROIMonitor();
    this.integrations = new OpenSourceIntegrations();
    
    this.firestore = new Firestore({
      projectId: this.PROJECT_ID,
    });
    
    this.bigquery = new BigQuery({
      projectId: this.PROJECT_ID,
    });
    
    this.scheduler = new CloudSchedulerClient({
      projectId: this.PROJECT_ID,
    });
  }

  /**
   * Generate optimal posting schedule for next 7 days
   */
  async generateOptimalSchedule(
    contentQueue: Array<{
      id: string;
      platform: string;
      contentType: string;
      priority: number;
      affiliateLinks: string[];
    }>,
    constraints: SchedulingConstraints = this.getDefaultConstraints()
  ): Promise<OptimalSchedule[]> {
    try {
      const schedule: OptimalSchedule[] = [];
      const now = new Date();
      
      // Get historical performance data for ML predictions
      const historicalData = await this.getHistoricalPerformanceData();
      
      // Sort content by priority and expected performance
      const rankedContent = await this.rankContentByExpectedPerformance(contentQueue, historicalData);
      
      // Generate schedule for next 7 days
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const targetDate = new Date(now);
        targetDate.setDate(now.getDate() + dayOffset);
        
        const daySchedule = await this.generateDaySchedule(
          targetDate,
          rankedContent,
          constraints,
          historicalData
        );
        
        schedule.push(...daySchedule);
      }
      
      // Optimize entire schedule for maximum ROI
      const optimizedSchedule = await this.optimizeScheduleForROI(schedule);
      
      // Store schedule in Firestore
      await this.storeSchedule(optimizedSchedule);
      
      // Create Google Cloud Scheduler jobs
      await this.createSchedulerJobs(optimizedSchedule);
      
      return optimizedSchedule;
    } catch (error) {
      console.error('Error generating optimal schedule:', error);
      return [];
    }
  }

  /**
   * Predict content performance based on ML analysis
   */
  async predictContentPerformance(
    content: any,
    platform: string,
    scheduledTime: Date
  ): Promise<ContentPerformancePredictor> {
    try {
      // Get relevant historical data
      const historicalData = await this.getRelevantHistoricalData(platform, content.contentType, scheduledTime);
      
      // Analyze audience availability at scheduled time
      const audienceAnalysis = this.analyzeAudienceAvailability(platform, scheduledTime);
      
      // Analyze competition level
      const competitionAnalysis = await this.analyzeCompetitionLevel(platform, scheduledTime);
      
      // Seasonal and trending factors
      const seasonalFactors = this.getSeasonalFactors(scheduledTime);
      const trendingFactors = await this.getTrendingFactors(content, platform);
      
      // ML-based prediction (simplified)
      const basePerformance = this.calculateBasePerformance(historicalData, content);
      
      const factors = [
        {
          name: 'Audience Availability',
          impact: audienceAnalysis.score - 50, // -50 to +50
          description: `${audienceAnalysis.activeUsers.toLocaleString()}人のアクティブユーザー`,
        },
        {
          name: 'Competition Level',
          impact: (50 - competitionAnalysis.intensity) / 2, // Less competition = higher impact
          description: `競合投稿数: ${competitionAnalysis.competitorPosts}/時`,
        },
        {
          name: 'Seasonal Trend',
          impact: seasonalFactors.impact,
          description: seasonalFactors.description,
        },
        {
          name: 'Trending Topics',
          impact: trendingFactors.impact,
          description: trendingFactors.description,
        },
        {
          name: 'Content Quality Score',
          impact: content.qualityScore - 50,
          description: `AIコンテンツ分析スコア: ${content.qualityScore}/100`,
        },
      ];
      
      // Apply factors to base performance
      const totalImpact = factors.reduce((sum, factor) => sum + factor.impact, 0);
      const performanceMultiplier = Math.max(0.2, Math.min(3.0, 1 + (totalImpact / 200)));
      
      const predictedMetrics = {
        reach: {
          min: Math.round(basePerformance.reach * performanceMultiplier * 0.7),
          max: Math.round(basePerformance.reach * performanceMultiplier * 1.5),
          expected: Math.round(basePerformance.reach * performanceMultiplier),
        },
        engagement: {
          rate: Math.min(10, Math.max(1, basePerformance.engagementRate * performanceMultiplier)),
          total: Math.round(basePerformance.reach * performanceMultiplier * (basePerformance.engagementRate / 100)),
        },
        clicks: Math.round(basePerformance.clicks * performanceMultiplier),
        conversions: Math.round(basePerformance.conversions * performanceMultiplier),
        revenue: Math.round(basePerformance.revenue * performanceMultiplier),
        cost: Math.round(basePerformance.cost * Math.sqrt(performanceMultiplier)), // Cost scales slower
        roi: 0, // Will be calculated
      };
      
      // Calculate ROI
      predictedMetrics.roi = predictedMetrics.cost > 0 
        ? Math.round(((predictedMetrics.revenue - predictedMetrics.cost) / predictedMetrics.cost) * 100)
        : 0;
      
      const confidence = Math.min(95, Math.max(30, 
        60 + (historicalData.dataPoints * 2) + Math.abs(totalImpact / 5)
      ));

      return {
        platform,
        contentType: content.contentType,
        predictedMetrics,
        confidence,
        factors,
      };
    } catch (error) {
      console.error('Error predicting content performance:', error);
      return this.getFallbackPrediction(platform, content.contentType);
    }
  }

  /**
   * Optimize posting schedule in real-time
   */
  async optimizeScheduleRealTime(): Promise<{
    adjustmentsMade: number;
    rescheduledPosts: string[];
    performanceImprovement: number;
    reasoning: string[];
  }> {
    try {
      // Get current schedule
      const currentSchedule = await this.getCurrentSchedule();
      
      // Get real-time performance data
      const realtimeData = await this.roiMonitor.getPerformanceMetrics('hour');
      
      // Identify optimization opportunities
      const optimizations = [];
      const reasoning = [];
      
      for (const scheduledPost of currentSchedule) {
        // Check if current conditions are better than scheduled
        const currentPrediction = await this.predictContentPerformance(
          scheduledPost,
          scheduledPost.platform,
          new Date()
        );
        
        const scheduledPrediction = await this.predictContentPerformance(
          scheduledPost,
          scheduledPost.platform,
          scheduledPost.scheduledTime
        );
        
        // If current time is significantly better, reschedule
        if (currentPrediction.predictedMetrics.roi > scheduledPrediction.predictedMetrics.roi * 1.2) {
          optimizations.push({
            postId: scheduledPost.id,
            action: 'reschedule_immediate',
            improvement: currentPrediction.predictedMetrics.roi - scheduledPrediction.predictedMetrics.roi,
          });
          
          reasoning.push(`${scheduledPost.platform}投稿のROIが${currentPrediction.predictedMetrics.roi}%に改善`);
        }
        
        // Check for platform-specific opportunities
        const platformOptimization = await this.checkPlatformSpecificOptimization(scheduledPost);
        if (platformOptimization.shouldOptimize) {
          optimizations.push({
            postId: scheduledPost.id,
            action: platformOptimization.action,
            improvement: platformOptimization.expectedImprovement,
          });
          
          reasoning.push(platformOptimization.reason);
        }
      }
      
      // Apply optimizations
      let adjustmentsMade = 0;
      const rescheduledPosts = [];
      let totalImprovement = 0;
      
      for (const optimization of optimizations) {
        const success = await this.applyOptimization(optimization);
        if (success) {
          adjustmentsMade++;
          rescheduledPosts.push(optimization.postId);
          totalImprovement += optimization.improvement;
        }
      }
      
      return {
        adjustmentsMade,
        rescheduledPosts,
        performanceImprovement: totalImprovement,
        reasoning,
      };
    } catch (error) {
      console.error('Error optimizing schedule in real-time:', error);
      return {
        adjustmentsMade: 0,
        rescheduledPosts: [],
        performanceImprovement: 0,
        reasoning: ['最適化中にエラーが発生しました'],
      };
    }
  }

  /**
   * Get AI-powered content scheduling recommendations
   */
  async getSchedulingRecommendations(
    platform: string,
    contentType: string,
    targetAudience: any = {}
  ): Promise<Array<{
    time: Date;
    score: number;
    reasoning: string;
    expectedMetrics: any;
    confidence: number;
  }>> {
    try {
      const recommendations = [];
      const now = new Date();
      
      // Check next 48 hours with 1-hour intervals
      for (let hour = 1; hour <= 48; hour++) {
        const candidateTime = new Date(now.getTime() + hour * 60 * 60 * 1000);
        
        // Skip if outside constraints
        if (!this.isTimeWithinConstraints(candidateTime, this.getDefaultConstraints())) {
          continue;
        }
        
        // Predict performance for this time
        const mockContent = { contentType, qualityScore: 75 };
        const prediction = await this.predictContentPerformance(mockContent, platform, candidateTime);
        
        // Calculate overall score
        const score = this.calculateSchedulingScore(prediction, candidateTime, platform);
        
        if (score >= 60) { // Only recommend good times
          recommendations.push({
            time: candidateTime,
            score,
            reasoning: this.generateReasoningText(prediction, candidateTime, platform),
            expectedMetrics: prediction.predictedMetrics,
            confidence: prediction.confidence,
          });
        }
      }
      
      // Sort by score and return top 10
      return recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
    } catch (error) {
      console.error('Error getting scheduling recommendations:', error);
      return [];
    }
  }

  // Private helper methods

  private getDefaultConstraints(): SchedulingConstraints {
    return {
      platforms: ['tiktok', 'instagram', 'youtube'],
      timeRange: { startTime: '06:00', endTime: '23:00' },
      daysOfWeek: [1, 2, 3, 4, 5, 6, 0], // All days
      minInterval: 120, // 2 hours between posts
      maxPostsPerDay: { tiktok: 3, instagram: 2, youtube: 1 },
      avoidCompetitor: true,
      prioritizeEngagement: true,
    };
  }

  private async getHistoricalPerformanceData(): Promise<any> {
    // Query BigQuery for historical performance
    const query = `
      SELECT 
        platform,
        content_type,
        EXTRACT(HOUR FROM timestamp) as hour,
        EXTRACT(DAYOFWEEK FROM timestamp) as day_of_week,
        AVG(conversion_value) as avg_revenue,
        COUNT(*) as total_posts,
        AVG(engagement_rate) as avg_engagement
      FROM \`${this.PROJECT_ID}.mnp_analytics.conversions\`
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)
      GROUP BY platform, content_type, hour, day_of_week
      HAVING total_posts >= 5
      ORDER BY avg_revenue DESC
    `;

    try {
      const [rows] = await this.bigquery.query(query);
      return { dataPoints: rows.length, data: rows };
    } catch (error) {
      // Fallback data
      return { dataPoints: 0, data: [] };
    }
  }

  private async rankContentByExpectedPerformance(contentQueue: any[], historicalData: any): Promise<any[]> {
    const rankedContent = [];
    
    for (const content of contentQueue) {
      // Calculate expected performance score
      const relevantHistory = historicalData.data.filter((d: any) => 
        d.platform === content.platform && d.content_type === content.contentType
      );
      
      const avgRevenue = relevantHistory.length > 0 
        ? relevantHistory.reduce((sum: number, d: any) => sum + d.avg_revenue, 0) / relevantHistory.length
        : 5000; // Default
      
      const performanceScore = (content.priority * 0.4) + (avgRevenue / 100 * 0.6);
      
      rankedContent.push({
        ...content,
        performanceScore,
        expectedRevenue: avgRevenue,
      });
    }
    
    return rankedContent.sort((a, b) => b.performanceScore - a.performanceScore);
  }

  private async generateDaySchedule(
    targetDate: Date,
    contentQueue: any[],
    constraints: SchedulingConstraints,
    historicalData: any
  ): Promise<OptimalSchedule[]> {
    const daySchedule: OptimalSchedule[] = [];
    const dayOfWeek = targetDate.getDay();
    
    // Get optimal times for this day
    const optimalTimes = this.getOptimalTimesForDay(dayOfWeek);
    
    // Assign content to optimal times
    let contentIndex = 0;
    for (const timeSlot of optimalTimes) {
      if (contentIndex >= contentQueue.length) break;
      
      const content = contentQueue[contentIndex];
      const scheduledTime = new Date(targetDate);
      scheduledTime.setHours(timeSlot.hour, timeSlot.minute, 0, 0);
      
      // Skip if constraints not met
      if (!this.meetsConstraints(scheduledTime, content.platform, constraints)) continue;
      
      const schedule: OptimalSchedule = {
        id: `schedule_${content.id}_${scheduledTime.getTime()}`,
        platform: content.platform,
        contentType: content.contentType,
        scheduledTime,
        timezone: 'Asia/Tokyo',
        confidence: timeSlot.score,
        expectedEngagement: timeSlot.score * 10,
        expectedReach: timeSlot.score * 100,
        expectedROI: timeSlot.score * 2,
        audienceFactor: timeSlot.score / 100,
        competitionFactor: 0.8, // Mock value
        seasonalFactor: 1.0, // Mock value
      };
      
      daySchedule.push(schedule);
      contentIndex++;
    }
    
    return daySchedule;
  }

  private getOptimalTimesForDay(dayOfWeek: number): Array<{ hour: number; minute: number; score: number }> {
    // Combine all platform optimal times
    const allTimes = [];
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    Object.values(this.JAPANESE_OPTIMAL_TIMES).forEach(platformTimes => {
      const dayTimes = isWeekend ? platformTimes.weekends : platformTimes.weekdays;
      allTimes.push(...dayTimes);
    });
    
    // Remove duplicates and sort by score
    const uniqueTimes = allTimes.reduce((acc, time) => {
      const key = `${time.hour}:${time.minute}`;
      if (!acc[key] || acc[key].score < time.score) {
        acc[key] = time;
      }
      return acc;
    }, {});
    
    return Object.values(uniqueTimes)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 6); // Top 6 times per day
  }

  private meetsConstraints(scheduledTime: Date, platform: string, constraints: SchedulingConstraints): boolean {
    const hour = scheduledTime.getHours();
    const minute = scheduledTime.getMinutes();
    const dayOfWeek = scheduledTime.getDay();
    
    // Check time range
    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    if (timeString < constraints.timeRange.startTime || timeString > constraints.timeRange.endTime) {
      return false;
    }
    
    // Check days of week
    if (!constraints.daysOfWeek.includes(dayOfWeek)) {
      return false;
    }
    
    // Check platforms
    if (!constraints.platforms.includes(platform)) {
      return false;
    }
    
    return true;
  }

  private async optimizeScheduleForROI(schedule: OptimalSchedule[]): Promise<OptimalSchedule[]> {
    // Apply ML-based ROI optimization
    // This is a simplified version - in practice would use more sophisticated algorithms
    
    const optimized = schedule.map(item => ({
      ...item,
      expectedROI: item.expectedROI * (1 + (item.confidence - 50) / 100),
    }));
    
    return optimized.sort((a, b) => b.expectedROI - a.expectedROI);
  }

  private async storeSchedule(schedule: OptimalSchedule[]): Promise<void> {
    const batch = this.firestore.batch();
    
    schedule.forEach(item => {
      const docRef = this.firestore.collection('optimal_schedules').doc(item.id);
      batch.set(docRef, {
        ...item,
        createdAt: new Date(),
        status: 'scheduled',
      });
    });
    
    await batch.commit();
  }

  private async createSchedulerJobs(schedule: OptimalSchedule[]): Promise<void> {
    // Create Google Cloud Scheduler jobs for each scheduled post
    for (const item of schedule.slice(0, 10)) { // Limit to avoid quotas
      try {
        const jobName = `projects/${this.PROJECT_ID}/locations/asia-northeast1/jobs/post-${item.id}`;
        
        await this.scheduler.createJob({
          parent: `projects/${this.PROJECT_ID}/locations/asia-northeast1`,
          job: {
            name: jobName,
            schedule: this.toCronExpression(item.scheduledTime),
            timeZone: 'Asia/Tokyo',
            httpTarget: {
              uri: `${process.env.REPLIT_DOMAIN || 'https://localhost:5000'}/api/gcloud/automation/scheduled-post`,
              httpMethod: 'POST',
              body: Buffer.from(JSON.stringify({
                scheduleId: item.id,
                platform: item.platform,
                contentType: item.contentType,
              })),
              headers: {
                'Content-Type': 'application/json',
              },
            },
          },
        });
      } catch (error) {
        console.error(`Error creating scheduler job for ${item.id}:`, error);
      }
    }
  }

  private toCronExpression(date: Date): string {
    return `${date.getMinutes()} ${date.getHours()} ${date.getDate()} ${date.getMonth() + 1} *`;
  }

  private analyzeAudienceAvailability(platform: string, scheduledTime: Date): { score: number; activeUsers: number } {
    const hour = scheduledTime.getHours();
    const dayOfWeek = scheduledTime.getDay();
    
    // Mock audience analysis based on Japanese social media usage patterns
    let score = 50; // Base score
    let activeUsers = 10000; // Base active users
    
    // Peak hours adjustment
    if (hour >= 12 && hour <= 13) { // Lunch time
      score += 20;
      activeUsers *= 1.5;
    }
    if (hour >= 19 && hour <= 22) { // Evening
      score += 30;
      activeUsers *= 2;
    }
    
    // Weekend adjustment
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      score += 10;
      activeUsers *= 1.2;
    }
    
    // Platform-specific adjustments
    if (platform === 'tiktok' && hour >= 20 && hour <= 23) {
      score += 15;
    }
    
    return { score: Math.min(100, score), activeUsers: Math.round(activeUsers) };
  }

  private async analyzeCompetitionLevel(platform: string, scheduledTime: Date): Promise<{ intensity: number; competitorPosts: number }> {
    // Mock competition analysis
    const hour = scheduledTime.getHours();
    let intensity = 50; // Base competition level
    let competitorPosts = 20; // Posts per hour
    
    // Higher competition during peak hours
    if (hour >= 12 && hour <= 13 || hour >= 19 && hour <= 21) {
      intensity += 30;
      competitorPosts += 15;
    }
    
    return { intensity: Math.min(100, intensity), competitorPosts };
  }

  private getSeasonalFactors(scheduledTime: Date): { impact: number; description: string } {
    const month = scheduledTime.getMonth() + 1;
    const day = scheduledTime.getDate();
    
    // Japanese seasonal patterns
    if (month === 3 || month === 4) { // Spring/New fiscal year
      return { impact: 15, description: '新年度・春季キャンペーン効果' };
    }
    if (month === 12) { // Year-end
      return { impact: 20, description: '年末商戦・ボーナス時期効果' };
    }
    if (month === 7 || month === 8) { // Summer
      return { impact: -10, description: '夏季休暇・活動低下' };
    }
    
    return { impact: 0, description: '通常時期' };
  }

  private async getTrendingFactors(content: any, platform: string): Promise<{ impact: number; description: string }> {
    // Mock trending analysis - would integrate with social media APIs
    const trendingKeywords = ['MNP', '携帯乗換', '格安SIM', 'スマホ'];
    
    if (content.contentType === 'video' && platform === 'tiktok') {
      return { impact: 25, description: 'TikTok動画コンテンツのトレンド効果' };
    }
    
    return { impact: 5, description: '軽微なトレンド効果' };
  }

  private calculateBasePerformance(historicalData: any, content: any): any {
    // Calculate baseline performance from historical data
    const defaultMetrics = {
      reach: 1000,
      engagementRate: 3.5,
      clicks: 35,
      conversions: 3,
      revenue: 15000,
      cost: 5000,
    };
    
    if (historicalData.dataPoints > 0) {
      const relevantData = historicalData.data.find((d: any) => 
        d.platform === content.platform && d.content_type === content.contentType
      );
      
      if (relevantData) {
        return {
          reach: relevantData.avg_revenue * 10, // Mock calculation
          engagementRate: relevantData.avg_engagement || 3.5,
          clicks: relevantData.avg_revenue / 300,
          conversions: relevantData.avg_revenue / 5000,
          revenue: relevantData.avg_revenue,
          cost: relevantData.avg_revenue * 0.3,
        };
      }
    }
    
    return defaultMetrics;
  }

  private getFallbackPrediction(platform: string, contentType: string): ContentPerformancePredictor {
    return {
      platform,
      contentType,
      predictedMetrics: {
        reach: { min: 800, max: 1500, expected: 1000 },
        engagement: { rate: 3.5, total: 35 },
        clicks: 25,
        conversions: 2,
        revenue: 10000,
        cost: 3000,
        roi: 233,
      },
      confidence: 50,
      factors: [
        { name: 'Limited Data', impact: 0, description: '履歴データ不足のため予測精度が限定的' },
      ],
    };
  }

  private isTimeWithinConstraints(time: Date, constraints: SchedulingConstraints): boolean {
    return this.meetsConstraints(time, 'tiktok', constraints); // Use tiktok as default platform check
  }

  private calculateSchedulingScore(prediction: ContentPerformancePredictor, scheduledTime: Date, platform: string): number {
    let score = 0;
    
    // ROI weight (40%)
    score += Math.min(40, prediction.predictedMetrics.roi / 10);
    
    // Engagement weight (30%)
    score += Math.min(30, prediction.predictedMetrics.engagement.rate * 6);
    
    // Confidence weight (20%)
    score += prediction.confidence * 0.2;
    
    // Time appropriateness (10%)
    const timeScore = this.getTimeAppropriateness(scheduledTime, platform);
    score += timeScore * 0.1;
    
    return Math.min(100, Math.max(0, score));
  }

  private getTimeAppropriateness(time: Date, platform: string): number {
    const hour = time.getHours();
    const dayOfWeek = time.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    const platformTimes = (this.JAPANESE_OPTIMAL_TIMES as any)[platform];
    if (!platformTimes) return 50;
    
    const relevantTimes = isWeekend ? platformTimes.weekends : platformTimes.weekdays;
    
    // Find closest optimal time
    let bestScore = 0;
    for (const optimalTime of relevantTimes) {
      const timeDiff = Math.abs(hour - optimalTime.hour);
      if (timeDiff <= 1) { // Within 1 hour
        bestScore = Math.max(bestScore, optimalTime.score * (1 - timeDiff * 0.3));
      }
    }
    
    return bestScore;
  }

  private generateReasoningText(prediction: ContentPerformancePredictor, time: Date, platform: string): string {
    const reasons = [];
    
    if (prediction.predictedMetrics.roi > 200) {
      reasons.push('高ROI期待');
    }
    
    const timeScore = this.getTimeAppropriateness(time, platform);
    if (timeScore > 80) {
      reasons.push('最適投稿時間');
    }
    
    if (prediction.confidence > 80) {
      reasons.push('高信頼度予測');
    }
    
    return reasons.join('、') || '標準的な投稿タイミング';
  }

  private async getCurrentSchedule(): Promise<any[]> {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    const snapshot = await this.firestore
      .collection('optimal_schedules')
      .where('scheduledTime', '>=', now)
      .where('scheduledTime', '<=', tomorrow)
      .where('status', '==', 'scheduled')
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  private async checkPlatformSpecificOptimization(scheduledPost: any): Promise<any> {
    // Mock platform-specific optimization checks
    return {
      shouldOptimize: Math.random() > 0.8, // 20% chance of optimization
      action: 'adjust_timing',
      expectedImprovement: 50,
      reason: 'プラットフォーム固有の最適化機会を検出',
    };
  }

  private async applyOptimization(optimization: any): Promise<boolean> {
    try {
      // Update schedule in Firestore
      await this.firestore
        .collection('optimal_schedules')
        .doc(optimization.postId)
        .update({
          optimized: true,
          optimizedAt: new Date(),
          optimizationReason: optimization.action,
        });
      
      return true;
    } catch (error) {
      console.error('Error applying optimization:', error);
      return false;
    }
  }
}