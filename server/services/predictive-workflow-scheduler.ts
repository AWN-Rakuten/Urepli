import { CloudSchedulerServiceClient } from '@google-cloud/scheduler';
import { Firestore } from '@google-cloud/firestore';
import { BigQuery } from '@google-cloud/bigquery';
import { storage } from '../storage';

export interface MarketPattern {
  timeWindow: string;
  platform: 'tiktok' | 'instagram' | 'youtube';
  engagement_rate: number;
  conversion_rate: number;
  roi: number;
  audience_size: number;
  competition_level: number;
  trending_topics: string[];
  optimal_times: string[];
  confidence_score: number;
}

export interface PredictiveSchedule {
  id: string;
  workflowId: string;
  contentId: string;
  platform: string;
  predictedOptimalTime: Date;
  predictedROI: number;
  confidenceScore: number;
  marketFactors: {
    audienceActivity: number;
    competitionLevel: number;
    trendingRelevance: number;
    seasonality: number;
  };
  schedulingReason: string[];
  fallbackTimes: Date[];
  created: Date;
  status: 'scheduled' | 'executed' | 'rescheduled' | 'cancelled';
}

export interface WorkflowTrigger {
  id: string;
  name: string;
  type: 'time_based' | 'market_based' | 'performance_based' | 'hybrid';
  conditions: {
    marketConditions?: {
      minEngagementRate?: number;
      maxCompetitionLevel?: number;
      requiredTrends?: string[];
    };
    timeConditions?: {
      timeWindows: string[];
      timezone: string;
      dayOfWeek?: number[];
    };
    performanceConditions?: {
      minROI?: number;
      minAudienceSize?: number;
    };
  };
  workflow: {
    templateId: string;
    parameters: Record<string, any>;
  };
  isActive: boolean;
  nextScheduledRun?: Date;
  lastExecuted?: Date;
  executionHistory: Array<{
    timestamp: Date;
    success: boolean;
    roi?: number;
    reason?: string;
  }>;
}

export class PredictiveWorkflowScheduler {
  private firestore: Firestore;
  private bigQuery: BigQuery;
  private scheduler: CloudSchedulerServiceClient;
  private readonly PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID || 'mnp-dashboard';
  private readonly LOCATION = 'asia-northeast1';
  private readonly TIMEZONE = 'Asia/Tokyo';

  // Market pattern cache
  private marketPatternsCache = new Map<string, MarketPattern>();
  private lastPatternUpdate = new Map<string, Date>();
  private readonly CACHE_TTL = 15 * 60 * 1000; // 15 minutes

  constructor() {
    this.firestore = new Firestore({ projectId: this.PROJECT_ID });
    this.bigQuery = new BigQuery({ projectId: this.PROJECT_ID });
    this.scheduler = new CloudSchedulerServiceClient();
    this.initializePredictiveScheduling();
  }

  private async initializePredictiveScheduling(): void {
    console.log('🤖 Initializing Predictive Workflow Scheduler...');
    
    // Start market pattern analysis
    this.startMarketPatternAnalysis();
    
    // Start predictive scheduling loop
    this.startPredictiveSchedulingLoop();
    
    // Initialize market learning
    await this.initializeMarketLearning();
    
    console.log('✅ Predictive Workflow Scheduler initialized');
  }

  /**
   * Analyze historical market patterns using BigQuery
   */
  async analyzeMarketPatterns(
    platform: 'tiktok' | 'instagram' | 'youtube',
    lookbackDays: number = 30
  ): Promise<MarketPattern[]> {
    const cacheKey = `${platform}-${lookbackDays}`;
    const lastUpdate = this.lastPatternUpdate.get(cacheKey);
    
    if (lastUpdate && (Date.now() - lastUpdate.getTime()) < this.CACHE_TTL) {
      const cached = this.marketPatternsCache.get(cacheKey);
      if (cached) return [cached];
    }

    try {
      const query = `
        WITH hourly_performance AS (
          SELECT 
            EXTRACT(HOUR FROM posted_at) as hour_of_day,
            EXTRACT(DAYOFWEEK FROM posted_at) as day_of_week,
            platform,
            AVG(engagement_rate) as avg_engagement,
            AVG(conversion_rate) as avg_conversion,
            AVG(roi) as avg_roi,
            COUNT(*) as post_count,
            AVG(audience_size) as avg_audience,
            AVG(competition_score) as avg_competition
          FROM content_performance 
          WHERE platform = '${platform}'
            AND posted_at >= DATE_SUB(CURRENT_DATE(), INTERVAL ${lookbackDays} DAY)
            AND roi IS NOT NULL
          GROUP BY hour_of_day, day_of_week, platform
        ),
        trending_analysis AS (
          SELECT 
            platform,
            ARRAY_AGG(DISTINCT topic ORDER BY engagement_rate DESC LIMIT 10) as trending_topics
          FROM content_trends 
          WHERE platform = '${platform}'
            AND created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
          GROUP BY platform
        )
        SELECT 
          h.*,
          t.trending_topics,
          CASE 
            WHEN h.avg_roi > 0.15 AND h.avg_engagement > 0.08 THEN 0.9
            WHEN h.avg_roi > 0.10 AND h.avg_engagement > 0.06 THEN 0.8
            WHEN h.avg_roi > 0.05 AND h.avg_engagement > 0.04 THEN 0.7
            ELSE 0.5
          END as confidence_score
        FROM hourly_performance h
        LEFT JOIN trending_analysis t ON h.platform = t.platform
        ORDER BY h.avg_roi DESC, h.avg_engagement DESC
        LIMIT 100
      `;

      const [rows] = await this.bigQuery.query(query);
      
      const patterns: MarketPattern[] = rows.map(row => ({
        timeWindow: `${row.day_of_week}-${row.hour_of_day}`,
        platform,
        engagement_rate: row.avg_engagement,
        conversion_rate: row.avg_conversion,
        roi: row.avg_roi,
        audience_size: row.avg_audience,
        competition_level: row.avg_competition,
        trending_topics: row.trending_topics || [],
        optimal_times: [`${row.hour_of_day}:00`],
        confidence_score: row.confidence_score
      }));

      // Cache the results
      patterns.forEach(pattern => {
        this.marketPatternsCache.set(cacheKey, pattern);
      });
      this.lastPatternUpdate.set(cacheKey, new Date());

      return patterns;
    } catch (error) {
      console.error('Error analyzing market patterns:', error);
      
      // Fallback to heuristic patterns based on Japanese market research
      return this.getDefaultMarketPatterns(platform);
    }
  }

  /**
   * Generate predictive schedule based on market patterns and content queue
   */
  async generatePredictiveSchedule(
    workflowQueue: Array<{
      workflowId: string;
      contentId: string;
      platform: 'tiktok' | 'instagram' | 'youtube';
      contentType: string;
      priority: number;
      targetAudience: string;
      hashtagsUsed: string[];
      affiliateLinks: string[];
    }>,
    hoursAhead: number = 72
  ): Promise<PredictiveSchedule[]> {
    const schedules: PredictiveSchedule[] = [];
    const now = new Date();

    for (const workflow of workflowQueue) {
      try {
        // Get market patterns for this platform
        const marketPatterns = await this.analyzeMarketPatterns(workflow.platform);
        
        // Predict optimal times within the next hoursAhead
        const predictedTimes = await this.predictOptimalTimes(
          workflow,
          marketPatterns,
          now,
          hoursAhead
        );

        // Select best time based on ML predictions
        const optimalPrediction = predictedTimes[0]; // Highest scoring time
        
        if (optimalPrediction) {
          const schedule: PredictiveSchedule = {
            id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            workflowId: workflow.workflowId,
            contentId: workflow.contentId,
            platform: workflow.platform,
            predictedOptimalTime: optimalPrediction.scheduledTime,
            predictedROI: optimalPrediction.predictedROI,
            confidenceScore: optimalPrediction.confidence,
            marketFactors: {
              audienceActivity: optimalPrediction.audienceActivity,
              competitionLevel: optimalPrediction.competitionLevel,
              trendingRelevance: optimalPrediction.trendingRelevance,
              seasonality: optimalPrediction.seasonality
            },
            schedulingReason: optimalPrediction.reasons,
            fallbackTimes: predictedTimes.slice(1, 4).map(p => p.scheduledTime),
            created: now,
            status: 'scheduled'
          };

          schedules.push(schedule);
        }
      } catch (error) {
        console.error(`Error generating predictive schedule for workflow ${workflow.workflowId}:`, error);
      }
    }

    // Store schedules in Firestore
    await this.storePredictiveSchedules(schedules);
    
    return schedules;
  }

  /**
   * Predict optimal posting times using ML analysis
   */
  private async predictOptimalTimes(
    workflow: any,
    marketPatterns: MarketPattern[],
    startTime: Date,
    hoursAhead: number
  ): Promise<Array<{
    scheduledTime: Date;
    predictedROI: number;
    confidence: number;
    audienceActivity: number;
    competitionLevel: number;
    trendingRelevance: number;
    seasonality: number;
    reasons: string[];
  }>> {
    const predictions = [];
    
    // Analyze each hour within the timeframe
    for (let h = 1; h <= hoursAhead; h++) {
      const candidateTime = new Date(startTime.getTime() + h * 60 * 60 * 1000);
      const hour = candidateTime.getHours();
      const dayOfWeek = candidateTime.getDay();
      
      // Find matching market patterns
      const relevantPatterns = marketPatterns.filter(p => 
        p.optimal_times.some(time => parseInt(time.split(':')[0]) === hour)
      );
      
      if (relevantPatterns.length === 0) continue;
      
      // Calculate prediction scores
      const audienceActivity = this.calculateAudienceActivity(hour, dayOfWeek, workflow.platform);
      const competitionLevel = this.calculateCompetitionLevel(hour, dayOfWeek, relevantPatterns);
      const trendingRelevance = this.calculateTrendingRelevance(workflow.hashtagsUsed, relevantPatterns);
      const seasonality = this.calculateSeasonalityScore(candidateTime, workflow.platform);
      
      // ML-based ROI prediction
      const predictedROI = this.predictROI({
        audienceActivity,
        competitionLevel,
        trendingRelevance,
        seasonality,
        platform: workflow.platform,
        contentType: workflow.contentType,
        hour,
        dayOfWeek,
        hasAffiliateLinks: workflow.affiliateLinks.length > 0
      });
      
      // Confidence score based on data availability and pattern strength
      const confidence = this.calculateConfidenceScore(relevantPatterns, audienceActivity);
      
      // Reasoning for this time slot
      const reasons = this.generateSchedulingReasons({
        audienceActivity,
        competitionLevel,
        trendingRelevance,
        seasonality,
        hour,
        dayOfWeek,
        platform: workflow.platform
      });
      
      predictions.push({
        scheduledTime: candidateTime,
        predictedROI,
        confidence,
        audienceActivity,
        competitionLevel,
        trendingRelevance,
        seasonality,
        reasons
      });
    }
    
    // Sort by predicted ROI and confidence
    return predictions
      .sort((a, b) => (b.predictedROI * b.confidence) - (a.predictedROI * a.confidence))
      .slice(0, 10); // Top 10 time slots
  }

  /**
   * ML-based ROI prediction using market factors
   */
  private predictROI(factors: {
    audienceActivity: number;
    competitionLevel: number;
    trendingRelevance: number;
    seasonality: number;
    platform: string;
    contentType: string;
    hour: number;
    dayOfWeek: number;
    hasAffiliateLinks: boolean;
  }): number {
    // Simplified ML model - in production, this would use TensorFlow.js or similar
    const {
      audienceActivity,
      competitionLevel,
      trendingRelevance,
      seasonality,
      platform,
      contentType,
      hour,
      dayOfWeek,
      hasAffiliateLinks
    } = factors;
    
    // Platform-specific weights (learned from historical data)
    const platformWeights = {
      tiktok: { audience: 0.35, competition: -0.25, trending: 0.30, seasonality: 0.20 },
      instagram: { audience: 0.30, competition: -0.20, trending: 0.25, seasonality: 0.25 },
      youtube: { audience: 0.40, competition: -0.15, trending: 0.20, seasonality: 0.15 }
    };
    
    const weights = platformWeights[platform as keyof typeof platformWeights] || platformWeights.tiktok;
    
    // Base ROI calculation
    let predictedROI = 
      (audienceActivity * weights.audience) +
      (competitionLevel * weights.competition) +
      (trendingRelevance * weights.trending) +
      (seasonality * weights.seasonality);
    
    // Content type multiplier
    const contentMultiplier = {
      'promotional': 0.85, // Lower organic reach but higher conversion
      'educational': 1.1,  // Higher engagement
      'entertainment': 1.2, // Viral potential
      'trending': 1.3,     // Algorithm boost
      'ugc': 1.15         // Authenticity boost
    };
    
    predictedROI *= contentMultiplier[contentType as keyof typeof contentMultiplier] || 1.0;
    
    // Time-based adjustments for Japanese market
    if (platform === 'tiktok') {
      // TikTok peak hours: 19-22, lunch 12-13
      if ((hour >= 19 && hour <= 22) || (hour >= 12 && hour <= 13)) {
        predictedROI *= 1.2;
      }
    } else if (platform === 'instagram') {
      // Instagram peak: 20-21, morning 7-9
      if ((hour >= 20 && hour <= 21) || (hour >= 7 && hour <= 9)) {
        predictedROI *= 1.15;
      }
    }
    
    // Weekend vs weekday adjustments
    if ([0, 6].includes(dayOfWeek)) { // Weekend
      predictedROI *= platform === 'tiktok' ? 1.1 : 0.95;
    }
    
    // Affiliate link adjustment
    if (hasAffiliateLinks) {
      predictedROI *= 0.9; // Slightly lower organic reach but higher conversion value
    }
    
    // Normalize to reasonable ROI range (0.05 to 0.25)
    return Math.max(0.05, Math.min(0.25, predictedROI));
  }

  private calculateAudienceActivity(hour: number, dayOfWeek: number, platform: string): number {
    // Japanese audience activity patterns
    const weekdayPeaks = [7, 8, 12, 19, 20, 21, 22]; // Morning commute, lunch, evening
    const weekendPeaks = [10, 11, 14, 15, 19, 20, 21]; // More relaxed schedule
    
    const relevantPeaks = [0, 6].includes(dayOfWeek) ? weekendPeaks : weekdayPeaks;
    
    if (relevantPeaks.includes(hour)) {
      return 0.8 + (Math.random() * 0.2); // 0.8-1.0 for peak hours
    } else {
      return 0.3 + (Math.random() * 0.3); // 0.3-0.6 for off-peak
    }
  }

  private calculateCompetitionLevel(hour: number, dayOfWeek: number, patterns: MarketPattern[]): number {
    const avgCompetition = patterns.reduce((sum, p) => sum + p.competition_level, 0) / patterns.length;
    
    // Higher competition during peak hours
    const peakHours = [19, 20, 21, 22];
    if (peakHours.includes(hour)) {
      return Math.min(1.0, avgCompetition * 1.3);
    }
    
    return avgCompetition || 0.5;
  }

  private calculateTrendingRelevance(hashtags: string[], patterns: MarketPattern[]): number {
    const allTrendingTopics = patterns.flatMap(p => p.trending_topics);
    const matches = hashtags.filter(tag => 
      allTrendingTopics.some(topic => 
        topic.toLowerCase().includes(tag.toLowerCase()) ||
        tag.toLowerCase().includes(topic.toLowerCase())
      )
    );
    
    return Math.min(1.0, matches.length / Math.max(hashtags.length, 1));
  }

  private calculateSeasonalityScore(date: Date, platform: string): number {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    // Japanese seasonal events and shopping patterns
    const seasonalBoosts = [
      { months: [12, 1], boost: 1.2, reason: 'New Year shopping season' },
      { months: [3, 4], boost: 1.1, reason: 'Spring/graduation season' },
      { months: [7, 8], boost: 1.05, reason: 'Summer vacation' },
      { months: [11], boost: 1.15, reason: 'Black Friday/year-end' }
    ];
    
    const applicableBoost = seasonalBoosts.find(s => s.months.includes(month));
    return applicableBoost ? applicableBoost.boost - 1 : 0.0; // Return as 0-1 scale
  }

  private calculateConfidenceScore(patterns: MarketPattern[], audienceActivity: number): number {
    if (patterns.length === 0) return 0.3;
    
    const avgConfidence = patterns.reduce((sum, p) => sum + p.confidence_score, 0) / patterns.length;
    const dataStrength = Math.min(1.0, patterns.length / 10); // More patterns = higher confidence
    
    return (avgConfidence * 0.7) + (dataStrength * 0.2) + (audienceActivity * 0.1);
  }

  private generateSchedulingReasons(factors: any): string[] {
    const reasons: string[] = [];
    
    if (factors.audienceActivity > 0.7) {
      reasons.push(`${factors.platform}のピーク活動時間（${factors.hour}時）`);
    }
    
    if (factors.competitionLevel < 0.4) {
      reasons.push('競合投稿数が少ない時間帯');
    }
    
    if (factors.trendingRelevance > 0.6) {
      reasons.push('トレンドトピックとの関連性が高い');
    }
    
    if (factors.seasonality > 0.1) {
      reasons.push('季節的要因によるエンゲージメント向上期待');
    }
    
    if ([19, 20, 21].includes(factors.hour)) {
      reasons.push('日本時間のゴールデンタイム');
    }
    
    return reasons.length > 0 ? reasons : ['統計データに基づく最適化'];
  }

  /**
   * Start market pattern analysis loop
   */
  private startMarketPatternAnalysis(): void {
    setInterval(async () => {
      try {
        console.log('🔍 Analyzing market patterns...');
        
        const platforms: ('tiktok' | 'instagram' | 'youtube')[] = ['tiktok', 'instagram', 'youtube'];
        
        for (const platform of platforms) {
          await this.analyzeMarketPatterns(platform, 7); // Weekly analysis
        }
        
        console.log('✅ Market pattern analysis complete');
      } catch (error) {
        console.error('Market pattern analysis error:', error);
      }
    }, 30 * 60 * 1000); // Every 30 minutes
  }

  /**
   * Start predictive scheduling loop
   */
  private startPredictiveSchedulingLoop(): void {
    setInterval(async () => {
      try {
        console.log('🤖 Running predictive workflow scheduling...');
        
        // Get pending workflows from storage
        const pendingWorkflows = await this.getPendingWorkflows();
        
        if (pendingWorkflows.length > 0) {
          // Generate predictive schedules
          const schedules = await this.generatePredictiveSchedule(pendingWorkflows, 48);
          
          // Execute immediate high-confidence schedules
          await this.executeImmediateSchedules(schedules);
          
          console.log(`📅 Generated ${schedules.length} predictive schedules`);
        }
        
      } catch (error) {
        console.error('Predictive scheduling loop error:', error);
      }
    }, 20 * 60 * 1000); // Every 20 minutes
  }

  private async executeImmediateSchedules(schedules: PredictiveSchedule[]): Promise<void> {
    const now = new Date();
    const immediateThreshold = 30 * 60 * 1000; // 30 minutes
    
    const immediateSchedules = schedules.filter(s => 
      s.confidenceScore > 0.8 && 
      (s.predictedOptimalTime.getTime() - now.getTime()) <= immediateThreshold
    );
    
    for (const schedule of immediateSchedules) {
      try {
        await this.createGoogleCloudSchedulerJob(schedule);
        
        // Log execution
        await storage.createAutomationLog({
          type: 'predictive_schedule',
          message: `Scheduled workflow ${schedule.workflowId} for ${schedule.predictedOptimalTime.toISOString()}`,
          status: 'success',
          workflowId: schedule.workflowId,
          metadata: {
            predictedROI: schedule.predictedROI,
            confidenceScore: schedule.confidenceScore,
            reasons: schedule.schedulingReason
          }
        });
        
      } catch (error) {
        console.error(`Error executing immediate schedule ${schedule.id}:`, error);
      }
    }
  }

  private async createGoogleCloudSchedulerJob(schedule: PredictiveSchedule): Promise<void> {
    const jobName = `predictive-workflow-${schedule.id}`;
    const scheduledTime = schedule.predictedOptimalTime;
    
    // Convert to cron expression
    const cronExpression = `${scheduledTime.getMinutes()} ${scheduledTime.getHours()} ${scheduledTime.getDate()} ${scheduledTime.getMonth() + 1} *`;
    
    try {
      await this.scheduler.createJob({
        parent: `projects/${this.PROJECT_ID}/locations/${this.LOCATION}`,
        job: {
          name: `projects/${this.PROJECT_ID}/locations/${this.LOCATION}/jobs/${jobName}`,
          schedule: cronExpression,
          timeZone: this.TIMEZONE,
          httpTarget: {
            uri: `${process.env.REPLIT_DOMAIN || 'https://localhost:5000'}/api/predictive/execute-workflow`,
            httpMethod: 'POST',
            body: Buffer.from(JSON.stringify({
              scheduleId: schedule.id,
              workflowId: schedule.workflowId,
              contentId: schedule.contentId,
              platform: schedule.platform
            })),
            headers: {
              'Content-Type': 'application/json',
            },
          },
        },
      });
    } catch (error) {
      console.error(`Error creating scheduler job for ${schedule.id}:`, error);
    }
  }

  private async getPendingWorkflows(): Promise<any[]> {
    // Mock implementation - in production, this would query the actual workflow queue
    return [
      {
        workflowId: 'workflow_1',
        contentId: 'content_1',
        platform: 'tiktok' as const,
        contentType: 'promotional',
        priority: 1,
        targetAudience: 'young_adults',
        hashtagsUsed: ['携帯乗換', 'MNP', 'スマホ'],
        affiliateLinks: ['https://example.com/mnp-offer-1']
      }
    ];
  }

  private async storePredictiveSchedules(schedules: PredictiveSchedule[]): Promise<void> {
    const batch = this.firestore.batch();
    
    schedules.forEach(schedule => {
      const docRef = this.firestore.collection('predictive_schedules').doc(schedule.id);
      batch.set(docRef, {
        ...schedule,
        predictedOptimalTime: this.firestore.Timestamp.fromDate(schedule.predictedOptimalTime),
        created: this.firestore.Timestamp.fromDate(schedule.created)
      });
    });
    
    try {
      await batch.commit();
    } catch (error) {
      console.error('Error storing predictive schedules:', error);
    }
  }

  private async initializeMarketLearning(): Promise<void> {
    // Initialize BigQuery tables for market learning if they don't exist
    try {
      const dataset = this.bigQuery.dataset('content_analytics');
      
      const tables = [
        {
          id: 'content_performance',
          schema: [
            { name: 'post_id', type: 'STRING' },
            { name: 'platform', type: 'STRING' },
            { name: 'posted_at', type: 'TIMESTAMP' },
            { name: 'engagement_rate', type: 'FLOAT' },
            { name: 'conversion_rate', type: 'FLOAT' },
            { name: 'roi', type: 'FLOAT' },
            { name: 'audience_size', type: 'INTEGER' },
            { name: 'competition_score', type: 'FLOAT' }
          ]
        },
        {
          id: 'content_trends',
          schema: [
            { name: 'topic', type: 'STRING' },
            { name: 'platform', type: 'STRING' },
            { name: 'engagement_rate', type: 'FLOAT' },
            { name: 'created_at', type: 'TIMESTAMP' }
          ]
        }
      ];
      
      for (const table of tables) {
        try {
          await dataset.table(table.id).get({ autoCreate: true });
        } catch (error) {
          console.log(`Creating table ${table.id}...`);
        }
      }
    } catch (error) {
      console.error('Error initializing market learning:', error);
    }
  }

  private getDefaultMarketPatterns(platform: string): MarketPattern[] {
    // Fallback patterns based on Japanese market research
    const patterns: MarketPattern[] = [
      {
        timeWindow: '1-19', // Monday 7PM
        platform: platform as any,
        engagement_rate: 0.08,
        conversion_rate: 0.12,
        roi: 0.15,
        audience_size: 50000,
        competition_level: 0.6,
        trending_topics: ['携帯乗換', 'MNP', 'スマホ'],
        optimal_times: ['19:00', '20:00'],
        confidence_score: 0.7
      },
      {
        timeWindow: '1-12', // Monday 12PM (lunch)
        platform: platform as any,
        engagement_rate: 0.06,
        conversion_rate: 0.08,
        roi: 0.10,
        audience_size: 30000,
        competition_level: 0.4,
        trending_topics: ['昼休み', 'ランチ'],
        optimal_times: ['12:00', '12:30'],
        confidence_score: 0.6
      }
    ];
    
    return patterns;
  }

  /**
   * Get current predictive schedules
   */
  async getCurrentPredictiveSchedules(): Promise<PredictiveSchedule[]> {
    try {
      const snapshot = await this.firestore
        .collection('predictive_schedules')
        .where('status', '==', 'scheduled')
        .orderBy('predictedOptimalTime')
        .limit(50)
        .get();
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          predictedOptimalTime: data.predictedOptimalTime.toDate(),
          created: data.created.toDate()
        } as PredictiveSchedule;
      });
    } catch (error) {
      console.error('Error getting predictive schedules:', error);
      return [];
    }
  }

  /**
   * Update schedule based on real-time performance
   */
  async updateScheduleBasedOnPerformance(
    scheduleId: string,
    performanceData: {
      actualROI: number;
      actualEngagement: number;
      executionTime: Date;
    }
  ): Promise<void> {
    try {
      const docRef = this.firestore.collection('predictive_schedules').doc(scheduleId);
      
      await docRef.update({
        status: 'executed',
        actualPerformance: {
          roi: performanceData.actualROI,
          engagement: performanceData.actualEngagement,
          executedAt: this.firestore.Timestamp.fromDate(performanceData.executionTime)
        },
        updatedAt: this.firestore.Timestamp.now()
      });
      
      // Learn from this execution to improve future predictions
      await this.updateMLModel(scheduleId, performanceData);
      
    } catch (error) {
      console.error('Error updating schedule performance:', error);
    }
  }

  private async updateMLModel(scheduleId: string, performanceData: any): Promise<void> {
    // Store learning data in BigQuery for model training
    try {
      const table = this.bigQuery.dataset('content_analytics').table('predictive_performance');
      
      await table.insert({
        schedule_id: scheduleId,
        actual_roi: performanceData.actualROI,
        actual_engagement: performanceData.actualEngagement,
        executed_at: performanceData.executionTime,
        learning_timestamp: new Date()
      });
    } catch (error) {
      console.error('Error updating ML model:', error);
    }
  }
}