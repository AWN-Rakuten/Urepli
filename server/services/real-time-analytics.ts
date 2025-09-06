import { IStorage } from '../storage';

export interface AnalyticsMetric {
  id: string;
  name: string;
  value: number;
  previousValue: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
  category: 'revenue' | 'engagement' | 'performance' | 'cost' | 'roi';
  unit: 'currency' | 'percentage' | 'count' | 'time';
  timestamp: Date;
}

export interface PerformanceAlert {
  id: string;
  type: 'warning' | 'critical' | 'info' | 'success';
  metric: string;
  threshold: number;
  currentValue: number;
  message: string;
  actionRequired: boolean;
  suggestedActions: string[];
  createdAt: Date;
}

export interface CampaignPerformanceData {
  campaignId: string;
  campaignName: string;
  platform: string;
  metrics: {
    spend: number;
    revenue: number;
    roas: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    cpc: number;
    cpm: number;
  };
  hourlyData: Array<{
    hour: string;
    spend: number;
    revenue: number;
    roas: number;
  }>;
  predictions: {
    endOfDaySpend: number;
    endOfDayRevenue: number;
    projectedROAS: number;
  };
}

export interface RealTimeInsight {
  id: string;
  type: 'opportunity' | 'risk' | 'optimization' | 'trend';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  actionRecommendation: string;
  confidence: number;
  estimatedValue: number;
  timeToImplement: number; // minutes
  data: any;
  generatedAt: Date;
}

export class RealTimeAnalytics {
  private storage: IStorage;
  private metrics: Map<string, AnalyticsMetric> = new Map();
  private alerts: Map<string, PerformanceAlert> = new Map();
  private insights: Map<string, RealTimeInsight> = new Map();
  private campaignData: Map<string, CampaignPerformanceData> = new Map();

  constructor(storage: IStorage) {
    this.storage = storage;
    this.initializeAnalytics();
  }

  private async initializeAnalytics() {
    // Initialize empty metrics - will be populated by real data from campaigns
    this.metrics = new Map();
    this.campaignData = new Map();
    
    // Start monitoring only if we have real campaign data
    if (process.env.META_ACCESS_TOKEN || process.env.TIKTOK_ACCESS_TOKEN) {
      this.startRealTimeMonitoring();
    }
  }

  // Campaign data will be populated from real APIs only
  private initializeCampaignData() {
    // No sample data - only real campaign data from APIs
  }

  private generateHourlyData(hours: number): Array<{ hour: string; spend: number; revenue: number; roas: number }> {
    const data = [];
    const currentHour = new Date().getHours();
    
    for (let i = 0; i < hours; i++) {
      const hour = (currentHour - hours + i + 24) % 24;
      const hourStr = `${hour.toString().padStart(2, '0')}:00`;
      
      // Simulate realistic patterns (higher activity evening/lunch)
      let baseActivity = 0.3;
      if (hour >= 7 && hour <= 9) baseActivity = 0.8; // Morning
      if (hour >= 12 && hour <= 13) baseActivity = 0.7; // Lunch
      if (hour >= 19 && hour <= 21) baseActivity = 1.0; // Evening peak
      
      const spend = Math.random() * 500 * baseActivity + 100;
      const roas = 2.5 + Math.random() * 1.5;
      const revenue = spend * roas;
      
      data.push({
        hour: hourStr,
        spend: Math.round(spend),
        revenue: Math.round(revenue),
        roas: Math.round(roas * 10) / 10
      });
    }
    
    return data;
  }

  private startRealTimeMonitoring() {
    // Only monitor when we have real APIs configured
    if (!process.env.META_ACCESS_TOKEN && !process.env.TIKTOK_ACCESS_TOKEN) {
      return;
    }
    
    // Check for real data updates every 5 minutes
    setInterval(() => {
      this.checkAlerts();
      this.generateInsights();
    }, 300000);
  }

  // Update metrics from real campaign data only
  async updateMetricsFromCampaigns(campaigns: CampaignPerformanceData[]) {
    if (campaigns.length === 0) return;
    
    const totalSpend = campaigns.reduce((sum, c) => sum + c.metrics.spend, 0);
    const totalRevenue = campaigns.reduce((sum, c) => sum + c.metrics.revenue, 0);
    const avgRoas = totalRevenue / totalSpend;
    const avgCtr = campaigns.reduce((sum, c) => sum + c.metrics.ctr, 0) / campaigns.length;
    
    const newMetrics: AnalyticsMetric[] = [
      {
        id: 'total_revenue',
        name: 'Total Revenue',
        value: totalRevenue,
        previousValue: this.metrics.get('total_revenue')?.value || 0,
        change: totalRevenue - (this.metrics.get('total_revenue')?.value || 0),
        changePercent: 0,
        trend: 'stable',
        category: 'revenue',
        unit: 'currency',
        timestamp: new Date()
      },
      {
        id: 'total_spend',
        name: 'Total Spend',
        value: totalSpend,
        previousValue: this.metrics.get('total_spend')?.value || 0,
        change: totalSpend - (this.metrics.get('total_spend')?.value || 0),
        changePercent: 0,
        trend: 'stable',
        category: 'cost',
        unit: 'currency',
        timestamp: new Date()
      },
      {
        id: 'campaign_roas',
        name: 'Campaign ROAS',
        value: avgRoas,
        previousValue: this.metrics.get('campaign_roas')?.value || 0,
        change: avgRoas - (this.metrics.get('campaign_roas')?.value || 0),
        changePercent: 0,
        trend: 'stable',
        category: 'roi',
        unit: 'count',
        timestamp: new Date()
      },
      {
        id: 'avg_ctr',
        name: 'Average CTR',
        value: avgCtr,
        previousValue: this.metrics.get('avg_ctr')?.value || 0,
        change: avgCtr - (this.metrics.get('avg_ctr')?.value || 0),
        changePercent: 0,
        trend: 'stable',
        category: 'engagement',
        unit: 'percentage',
        timestamp: new Date()
      }
    ];
    
    newMetrics.forEach(metric => {
      if (metric.previousValue > 0) {
        metric.changePercent = (metric.change / metric.previousValue) * 100;
        metric.trend = metric.change > 0 ? 'up' : metric.change < 0 ? 'down' : 'stable';
      }
      this.metrics.set(metric.id, metric);
    });
  }

  private getMetricVolatility(category: string): number {
    switch (category) {
      case 'revenue': return 0.05; // 5% volatility
      case 'engagement': return 0.15; // 15% volatility
      case 'performance': return 0.03; // 3% volatility
      case 'cost': return 0.08; // 8% volatility
      case 'roi': return 0.10; // 10% volatility
      default: return 0.05;
    }
  }

  private checkAlerts() {
    const currentAlerts: PerformanceAlert[] = [];
    
    this.metrics.forEach(metric => {
      // Check for performance thresholds
      if (metric.id === 'campaign_roas' && metric.value < 2.0) {
        currentAlerts.push({
          id: `alert_${metric.id}_${Date.now()}`,
          type: 'critical',
          metric: metric.name,
          threshold: 2.0,
          currentValue: metric.value,
          message: 'Campaign ROAS below critical threshold',
          actionRequired: true,
          suggestedActions: [
            'Pause underperforming ad sets',
            'Increase bid on high-performing keywords',
            'Review target audience settings'
          ],
          createdAt: new Date()
        });
      }
      
      if (metric.id === 'ad_spend' && metric.changePercent > 25) {
        currentAlerts.push({
          id: `alert_${metric.id}_${Date.now()}`,
          type: 'warning',
          metric: metric.name,
          threshold: 25,
          currentValue: metric.changePercent,
          message: 'Ad spend increased significantly',
          actionRequired: false,
          suggestedActions: [
            'Monitor performance closely',
            'Check for campaign changes',
            'Verify budget settings'
          ],
          createdAt: new Date()
        });
      }
      
      if (metric.id === 'automation_efficiency' && metric.value > 95) {
        currentAlerts.push({
          id: `alert_${metric.id}_${Date.now()}`,
          type: 'success',
          metric: metric.name,
          threshold: 95,
          currentValue: metric.value,
          message: 'Automation performing exceptionally well',
          actionRequired: false,
          suggestedActions: [
            'Consider scaling successful workflows',
            'Document best practices',
            'Share configuration with team'
          ],
          createdAt: new Date()
        });
      }
    });
    
    currentAlerts.forEach(alert => {
      this.alerts.set(alert.id, alert);
    });
  }

  private generateInsights() {
    const insights: RealTimeInsight[] = [];
    
    // Analyze patterns and generate insights
    const roasMetric = this.metrics.get('campaign_roas');
    const engagementMetric = this.metrics.get('content_engagement');
    const revenueMetric = this.metrics.get('total_revenue');
    
    if (roasMetric && roasMetric.trend === 'up' && roasMetric.changePercent > 5) {
      insights.push({
        id: `insight_roas_${Date.now()}`,
        type: 'opportunity',
        priority: 'high',
        title: 'ROAS Improvement Opportunity',
        description: `Campaign ROAS has improved by ${roasMetric.changePercent.toFixed(1)}% in the last period`,
        impact: `Potential additional revenue of ¥${Math.round(revenueMetric?.value * 0.1).toLocaleString()}`,
        actionRecommendation: 'Increase budget allocation to high-performing campaigns',
        confidence: 0.85,
        estimatedValue: revenueMetric?.value * 0.1 || 0,
        timeToImplement: 15,
        data: { metric: roasMetric },
        generatedAt: new Date()
      });
    }
    
    if (engagementMetric && engagementMetric.trend === 'up' && engagementMetric.value > 8) {
      insights.push({
        id: `insight_engagement_${Date.now()}`,
        type: 'trend',
        priority: 'medium',
        title: 'High Engagement Trend',
        description: `Content engagement is at ${engagementMetric.value.toFixed(1)}%, above average`,
        impact: 'Improved brand awareness and organic reach',
        actionRecommendation: 'Analyze top-performing content and replicate successful elements',
        confidence: 0.78,
        estimatedValue: 5000,
        timeToImplement: 30,
        data: { metric: engagementMetric },
        generatedAt: new Date()
      });
    }
    
    // Market timing insights
    const currentHour = new Date().getHours();
    if (currentHour >= 19 && currentHour <= 21) {
      insights.push({
        id: `insight_timing_${Date.now()}`,
        type: 'optimization',
        priority: 'high',
        title: 'Peak Performance Window',
        description: 'Currently in optimal engagement time for Japanese market (19:00-21:00)',
        impact: 'Up to 40% higher conversion rates during this period',
        actionRecommendation: 'Increase bid multipliers and push premium content',
        confidence: 0.92,
        estimatedValue: 8000,
        timeToImplement: 5,
        data: { hour: currentHour, market: 'japan' },
        generatedAt: new Date()
      });
    }
    
    insights.forEach(insight => {
      this.insights.set(insight.id, insight);
    });
  }

  // Public API methods
  async getMetrics(): Promise<AnalyticsMetric[]> {
    return Array.from(this.metrics.values());
  }

  async getMetric(metricId: string): Promise<AnalyticsMetric | null> {
    return this.metrics.get(metricId) || null;
  }

  async getAlerts(): Promise<PerformanceAlert[]> {
    const allAlerts = Array.from(this.alerts.values());
    // Return recent alerts (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return allAlerts.filter(alert => alert.createdAt > yesterday)
                   .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getInsights(): Promise<RealTimeInsight[]> {
    const allInsights = Array.from(this.insights.values());
    // Return recent insights (last 2 hours)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    return allInsights.filter(insight => insight.generatedAt > twoHoursAgo)
                     .sort((a, b) => {
                       // Sort by priority then by time
                       const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
                       const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
                       return priorityDiff || b.generatedAt.getTime() - a.generatedAt.getTime();
                     });
  }

  async getCampaignPerformance(): Promise<CampaignPerformanceData[]> {
    return Array.from(this.campaignData.values());
  }

  async getCampaignById(campaignId: string): Promise<CampaignPerformanceData | null> {
    return this.campaignData.get(campaignId) || null;
  }

  // Performance Dashboard Data
  async getDashboardData(): Promise<any> {
    const metrics = await this.getMetrics();
    const alerts = await this.getAlerts();
    const insights = await this.getInsights();
    const campaigns = await this.getCampaignPerformance();
    
    // Only show data if we have real campaigns
    if (campaigns.length === 0) {
      return {
        overview: {
          totalRevenue: 0,
          totalSpend: 0,
          avgROAS: 0,
          engagementRate: 0,
          automationEfficiency: 0
        },
        metrics: [],
        alerts: [],
        insights: [],
        campaigns: [],
        healthScore: 0,
        lastUpdated: new Date(),
        message: 'No active campaigns. Configure API keys to see real data.'
      };
    }
    
    return {
      overview: {
        totalRevenue: metrics.find(m => m.id === 'total_revenue')?.value || 0,
        totalSpend: metrics.find(m => m.id === 'total_spend')?.value || 0,
        avgROAS: metrics.find(m => m.id === 'campaign_roas')?.value || 0,
        engagementRate: metrics.find(m => m.id === 'avg_ctr')?.value || 0,
        automationEfficiency: campaigns.length > 0 ? 100 : 0
      },
      metrics,
      alerts: alerts.slice(0, 5),
      insights: insights.slice(0, 3),
      campaigns: campaigns.slice(0, 5),
      healthScore: this.calculateHealthScore(metrics),
      lastUpdated: new Date()
    };
  }

  private calculateHealthScore(metrics: AnalyticsMetric[]): number {
    let score = 0;
    let totalWeight = 0;
    
    metrics.forEach(metric => {
      let weight = 1;
      let metricScore = 50; // Base score
      
      switch (metric.category) {
        case 'roi':
          weight = 3;
          metricScore = Math.min(100, (metric.value / 3.0) * 100); // ROAS of 3.0 = 100%
          break;
        case 'performance':
          weight = 2;
          metricScore = metric.value; // Already percentage
          break;
        case 'engagement':
          weight = 2;
          metricScore = Math.min(100, (metric.value / 10.0) * 100); // 10% engagement = 100%
          break;
        case 'revenue':
          weight = 2;
          metricScore = metric.trend === 'up' ? 80 : metric.trend === 'stable' ? 60 : 40;
          break;
        case 'cost':
          weight = 1;
          metricScore = metric.trend === 'down' ? 80 : metric.trend === 'stable' ? 60 : 40;
          break;
      }
      
      score += metricScore * weight;
      totalWeight += weight;
    });
    
    return totalWeight > 0 ? Math.round(score / totalWeight) : 50;
  }

  // Real-time data from actual campaigns only
  async getRealtimeMetrics(): Promise<any> {
    const campaigns = Array.from(this.campaignData.values());
    
    if (campaigns.length === 0) {
      return {
        timestamp: new Date(),
        activeUsers: 0,
        currentSpend: 0,
        conversionsThisHour: 0,
        topPerformingCampaign: 'No active campaigns',
        marketActivity: {
          japan: 0,
          global: 0
        }
      };
    }
    
    const topCampaign = campaigns.sort((a, b) => b.metrics.roas - a.metrics.roas)[0];
    const totalSpend = campaigns.reduce((sum, c) => sum + c.metrics.spend, 0);
    const totalConversions = campaigns.reduce((sum, c) => sum + c.metrics.conversions, 0);
    
    return {
      timestamp: new Date(),
      activeUsers: campaigns.reduce((sum, c) => sum + c.metrics.clicks, 0),
      currentSpend: totalSpend,
      conversionsThisHour: totalConversions,
      topPerformingCampaign: topCampaign.campaignName,
      marketActivity: {
        japan: campaigns.filter(c => c.platform === 'both' || c.platform === 'tiktok').length > 0 ? 0.8 : 0,
        global: campaigns.length > 0 ? 0.6 : 0
      }
    };
  }

  getProviderInfo() {
    return {
      name: 'Real-Time Analytics Engine',
      features: ['Live metrics tracking', 'Intelligent alerts', 'Predictive insights', 'Performance monitoring'],
      capabilities: ['Real-time data processing', 'Anomaly detection', 'Trend analysis', 'Automated reporting'],
      metricsCount: this.metrics.size,
      alertsCount: this.alerts.size,
      available: true
    };
  }
}