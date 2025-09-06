import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Eye,
  Users,
  Target,
  Zap,
  BarChart3,
  Bell,
  Lightbulb
} from 'lucide-react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface AnalyticsMetric {
  id: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
  category: string;
  unit: string;
}

interface PerformanceAlert {
  id: string;
  type: 'warning' | 'critical' | 'info' | 'success';
  metric: string;
  message: string;
  actionRequired: boolean;
  suggestedActions: string[];
}

interface RealTimeInsight {
  id: string;
  type: 'opportunity' | 'risk' | 'optimization' | 'trend';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionRecommendation: string;
  confidence: number;
  estimatedValue: number;
}

interface CampaignPerformanceData {
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
  };
  hourlyData: Array<{
    hour: string;
    spend: number;
    revenue: number;
    roas: number;
  }>;
}

export function RealTimeAnalyticsDashboard() {
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch dashboard data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['/api/analytics/dashboard'],
    refetchInterval: autoRefresh ? 30000 : false // 30 seconds if auto-refresh enabled
  });

  // Fetch real-time metrics
  const { data: realtimeMetrics } = useQuery({
    queryKey: ['/api/analytics/realtime'],
    refetchInterval: autoRefresh ? 5000 : false // 5 seconds for real-time data
  });

  // Fetch alerts
  const { data: alerts = [] } = useQuery({
    queryKey: ['/api/analytics/alerts'],
    refetchInterval: 60000 // 1 minute
  });

  // Fetch insights
  const { data: insights = [] } = useQuery({
    queryKey: ['/api/analytics/insights'],
    refetchInterval: 120000 // 2 minutes
  });

  const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`;
  const formatNumber = (num: number) => num.toLocaleString();
  const formatPercentage = (value: number) => `${value.toFixed(2)}%`;

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <Bell className="h-4 w-4 text-blue-500" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      high: 'destructive',
      medium: 'default',
      low: 'secondary'
    } as const;
    return variants[priority as keyof typeof variants] || 'secondary';
  };

  // Chart configurations
  const getLineChartOptions = () => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0,0,0,0.1)'
        }
      },
      x: {
        grid: {
          color: 'rgba(0,0,0,0.1)'
        }
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      }
    }
  });

  const getHourlyChartData = (campaigns: CampaignPerformanceData[]) => {
    if (!campaigns || campaigns.length === 0) return null;

    const hours = campaigns[0]?.hourlyData?.map(d => d.hour) || [];
    
    return {
      labels: hours,
      datasets: campaigns.map((campaign, index) => ({
        label: campaign.campaignName,
        data: campaign.hourlyData?.map(d => d.revenue) || [],
        borderColor: index === 0 ? 'rgb(59, 130, 246)' : 'rgb(16, 185, 129)',
        backgroundColor: index === 0 ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4
      }))
    };
  };

  const getROASChartData = (campaigns: CampaignPerformanceData[]) => {
    if (!campaigns || campaigns.length === 0) return null;

    return {
      labels: campaigns.map(c => c.campaignName),
      datasets: [{
        label: 'ROAS',
        data: campaigns.map(c => c.metrics.roas),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)'
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
          'rgb(239, 68, 68)',
          'rgb(139, 92, 246)'
        ],
        borderWidth: 2
      }]
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Activity className="h-6 w-6 animate-spin mr-2" />
        <span>Loading real-time analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="realtime-analytics-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight" data-testid="title-analytics">Real-Time Analytics</h2>
          <p className="text-muted-foreground">
            Live performance monitoring with AI-powered insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            data-testid="button-auto-refresh"
          >
            <Activity className={`mr-2 h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh
          </Button>
        </div>
      </div>

      {/* Health Score */}
      {dashboardData && (
        <Card data-testid="card-health-score">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              System Health Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div className="text-3xl font-bold" data-testid="text-health-score">
                {dashboardData.healthScore}%
              </div>
              <Badge variant={
                dashboardData.healthScore >= 80 ? 'default' : 
                dashboardData.healthScore >= 60 ? 'secondary' : 'destructive'
              }>
                {dashboardData.healthScore >= 80 ? 'Excellent' : 
                 dashboardData.healthScore >= 60 ? 'Good' : 'Needs Attention'}
              </Badge>
            </div>
            <Progress value={dashboardData.healthScore} className="h-3" />
          </CardContent>
        </Card>
      )}

      {/* Key Metrics Overview */}
      {dashboardData?.overview && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card data-testid="card-total-revenue">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-revenue">
                {formatCurrency(dashboardData.overview.totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">
                Live tracking
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-total-spend">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ad Spend</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-spend">
                {formatCurrency(dashboardData.overview.totalSpend)}
              </div>
              <p className="text-xs text-muted-foreground">
                Daily total
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-avg-roas">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg ROAS</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-avg-roas">
                {dashboardData.overview.avgROAS.toFixed(2)}x
              </div>
              <p className="text-xs text-muted-foreground">
                Return on ad spend
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-engagement-rate">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Engagement</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-engagement-rate">
                {formatPercentage(dashboardData.overview.engagementRate)}
              </div>
              <p className="text-xs text-muted-foreground">
                Content engagement
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-automation-efficiency">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Automation</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-automation-efficiency">
                {formatPercentage(dashboardData.overview.automationEfficiency)}
              </div>
              <p className="text-xs text-muted-foreground">
                Efficiency score
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Real-time Alerts */}
      {alerts.length > 0 && (
        <Card data-testid="card-alerts">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.slice(0, 5).map((alert: PerformanceAlert) => (
                <Alert key={alert.id} className={
                  alert.type === 'critical' ? 'border-red-200 bg-red-50' :
                  alert.type === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                  alert.type === 'success' ? 'border-green-200 bg-green-50' :
                  'border-blue-200 bg-blue-50'
                } data-testid={`alert-${alert.id}`}>
                  <div className="flex items-start gap-3">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1">
                      <AlertDescription>
                        <div className="font-medium">{alert.message}</div>
                        {alert.actionRequired && alert.suggestedActions.length > 0 && (
                          <div className="mt-2 text-sm">
                            <div className="font-medium">Suggested Actions:</div>
                            <ul className="list-disc list-inside mt-1">
                              {alert.suggestedActions.map((action, index) => (
                                <li key={index}>{action}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Insights */}
      {insights.length > 0 && (
        <Card data-testid="card-insights">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              AI-Powered Insights
            </CardTitle>
            <CardDescription>
              Real-time opportunities and optimizations detected by AI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.slice(0, 3).map((insight: RealTimeInsight) => (
                <div key={insight.id} className="border rounded-lg p-4 space-y-3" data-testid={`insight-${insight.id}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={getPriorityBadge(insight.priority)}>
                          {insight.priority} priority
                        </Badge>
                        <Badge variant="outline">{insight.type}</Badge>
                      </div>
                      <h4 className="font-medium">{insight.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {insight.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        {formatCurrency(insight.estimatedValue)}
                      </div>
                      <div className="text-sm text-muted-foreground">Potential Value</div>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t">
                    <div className="text-sm font-medium">Recommendation:</div>
                    <div className="text-sm text-muted-foreground">{insight.actionRecommendation}</div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Confidence: {formatPercentage(insight.confidence * 100)}</span>
                    <span>Impact: {insight.estimatedValue > 10000 ? 'High' : insight.estimatedValue > 5000 ? 'Medium' : 'Low'}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts and Analytics */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Hourly Performance Chart */}
        {dashboardData?.campaigns && getHourlyChartData(dashboardData.campaigns) && (
          <Card data-testid="card-hourly-performance">
            <CardHeader>
              <CardTitle>Hourly Revenue Performance</CardTitle>
              <CardDescription>Real-time revenue tracking by hour</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <Line 
                  data={getHourlyChartData(dashboardData.campaigns)!} 
                  options={getLineChartOptions()} 
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* ROAS by Campaign */}
        {dashboardData?.campaigns && getROASChartData(dashboardData.campaigns) && (
          <Card data-testid="card-roas-comparison">
            <CardHeader>
              <CardTitle>ROAS by Campaign</CardTitle>
              <CardDescription>Return on ad spend comparison</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <Bar 
                  data={getROASChartData(dashboardData.campaigns)!} 
                  options={{
                    ...getLineChartOptions(),
                    indexAxis: 'y' as const,
                  }} 
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Real-time Activity Feed */}
      {realtimeMetrics && (
        <Card data-testid="card-realtime-activity">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 animate-pulse" />
              Live Activity Feed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="text-center p-3 bg-muted rounded">
                <div className="text-xl font-bold" data-testid="text-active-users">
                  {formatNumber(realtimeMetrics.activeUsers)}
                </div>
                <div className="text-sm text-muted-foreground">Active Users</div>
              </div>
              
              <div className="text-center p-3 bg-muted rounded">
                <div className="text-xl font-bold" data-testid="text-current-spend">
                  {formatCurrency(realtimeMetrics.currentSpend)}
                </div>
                <div className="text-sm text-muted-foreground">Current Spend/Hr</div>
              </div>
              
              <div className="text-center p-3 bg-muted rounded">
                <div className="text-xl font-bold" data-testid="text-conversions-hour">
                  {realtimeMetrics.conversionsThisHour}
                </div>
                <div className="text-sm text-muted-foreground">Conversions/Hr</div>
              </div>
              
              <div className="text-center p-3 bg-muted rounded">
                <div className="text-sm font-bold truncate" data-testid="text-top-campaign">
                  {realtimeMetrics.topPerformingCampaign}
                </div>
                <div className="text-sm text-muted-foreground">Top Campaign</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Metrics */}
      {dashboardData?.metrics && (
        <Card data-testid="card-detailed-metrics">
          <CardHeader>
            <CardTitle>Detailed Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.metrics.map((metric: AnalyticsMetric) => (
                <div key={metric.id} className="flex items-center justify-between p-3 border rounded" data-testid={`metric-${metric.id}`}>
                  <div className="flex items-center gap-3">
                    {getTrendIcon(metric.trend)}
                    <div>
                      <div className="font-medium">{metric.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {metric.unit === 'currency' ? formatCurrency(metric.value) :
                         metric.unit === 'percentage' ? formatPercentage(metric.value) :
                         formatNumber(metric.value)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`font-medium ${metric.changePercent > 0 ? 'text-green-600' : metric.changePercent < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                      {metric.changePercent > 0 ? '+' : ''}{formatPercentage(metric.changePercent)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      vs previous period
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}