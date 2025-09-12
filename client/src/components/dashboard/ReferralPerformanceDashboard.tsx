/**
 * Feature 10: Real-time Performance Dashboard
 * Live analytics and optimization suggestions for referral campaigns
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Eye,
  MousePointer,
  Share2,
  Target,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  Lightbulb,
  RefreshCw,
  BarChart3,
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface DashboardData {
  overview: {
    totalRevenue: number;
    totalConversions: number;
    conversionRate: number;
    activeReferrers: number;
    revenueGrowth: number;
    conversionGrowth: number;
  };
  realTimeMetrics: {
    currentVisitors: number;
    todayConversions: number;
    todayRevenue: number;
    liveConversions: Array<{
      timestamp: Date;
      amount: number;
      source: string;
      referrer: string;
    }>;
  };
  campaignPerformance: Array<{
    id: string;
    name: string;
    revenue: number;
    conversions: number;
    roi: number;
    status: 'active' | 'paused' | 'completed';
    trend: 'up' | 'down' | 'stable';
  }>;
  contentPerformance: Array<{
    id: string;
    title: string;
    platform: string;
    views: number;
    clicks: number;
    conversions: number;
    revenue: number;
    engagement: number;
  }>;
  platformBreakdown: Array<{
    name: string;
    revenue: number;
    conversions: number;
    color: string;
  }>;
  timeSeriesData: Array<{
    date: string;
    revenue: number;
    conversions: number;
    clicks: number;
    views: number;
  }>;
  topReferrers: Array<{
    name: string;
    conversions: number;
    revenue: number;
    commissionEarned: number;
  }>;
  aiInsights: Array<{
    type: 'opportunity' | 'warning' | 'success';
    title: string;
    description: string;
    action: string;
    impact: 'high' | 'medium' | 'low';
  }>;
}

const ReferralPerformanceDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d');

  useEffect(() => {
    fetchDashboardData();
    
    // Set up real-time updates
    const interval = setInterval(() => {
      fetchRealTimeMetrics();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [selectedTimeframe]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockData: DashboardData = {
        overview: {
          totalRevenue: 1250000,
          totalConversions: 3420,
          conversionRate: 8.5,
          activeReferrers: 156,
          revenueGrowth: 23.5,
          conversionGrowth: 15.8
        },
        realTimeMetrics: {
          currentVisitors: 47,
          todayConversions: 23,
          todayRevenue: 85600,
          liveConversions: [
            { timestamp: new Date(), amount: 2500, source: 'tiktok', referrer: 'user123' },
            { timestamp: new Date(), amount: 1800, source: 'instagram', referrer: 'user456' },
            { timestamp: new Date(), amount: 3200, source: 'youtube', referrer: 'user789' }
          ]
        },
        campaignPerformance: [
          { id: '1', name: 'スマホMNPキャンペーン', revenue: 450000, conversions: 125, roi: 340, status: 'active', trend: 'up' },
          { id: '2', name: 'クレジットカード紹介', revenue: 380000, conversions: 89, roi: 280, status: 'active', trend: 'up' },
          { id: '3', name: 'オンライン学習', revenue: 210000, conversions: 67, roi: 195, status: 'active', trend: 'stable' },
          { id: '4', name: '投資アプリ', revenue: 180000, conversions: 45, roi: 160, status: 'paused', trend: 'down' }
        ],
        contentPerformance: [
          { id: '1', title: 'MNP最新キャンペーン解説', platform: 'tiktok', views: 125000, clicks: 8500, conversions: 156, revenue: 78000, engagement: 12.5 },
          { id: '2', title: 'お得なクレカ比較', platform: 'youtube', views: 89000, clicks: 6200, conversions: 89, revenue: 45000, engagement: 8.9 },
          { id: '3', title: 'プログラミング学習ガイド', platform: 'blog', views: 45000, clicks: 3200, conversions: 67, revenue: 33500, engagement: 15.2 }
        ],
        platformBreakdown: [
          { name: 'TikTok', revenue: 520000, conversions: 1234, color: '#ff0050' },
          { name: 'YouTube', revenue: 380000, conversions: 890, color: '#ff0000' },
          { name: 'Instagram', revenue: 210000, conversions: 567, color: '#e4405f' },
          { name: 'Blog', revenue: 140000, conversions: 729, color: '#1da1f2' }
        ],
        timeSeriesData: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          revenue: Math.floor(Math.random() * 50000) + 20000,
          conversions: Math.floor(Math.random() * 50) + 10,
          clicks: Math.floor(Math.random() * 500) + 100,
          views: Math.floor(Math.random() * 5000) + 1000
        })),
        topReferrers: [
          { name: 'influencer_taro', conversions: 89, revenue: 445000, commissionEarned: 44500 },
          { name: 'tech_reviewer', conversions: 67, revenue: 335000, commissionEarned: 33500 },
          { name: 'lifestyle_blogger', conversions: 56, revenue: 280000, commissionEarned: 28000 },
          { name: 'student_saver', conversions: 45, revenue: 225000, commissionEarned: 22500 }
        ],
        aiInsights: [
          {
            type: 'opportunity',
            title: 'TikTok パフォーマンス急上昇',
            description: 'TikTokでのエンゲージメント率が平均より40%高くなっています',
            action: 'TikTok投稿頻度を2倍に増やす',
            impact: 'high'
          },
          {
            type: 'warning',
            title: 'YouTube ROI低下傾向',
            description: 'YouTube経由のコンバージョン率が先週比で15%減少',
            action: 'コンテンツ戦略の見直しが必要',
            impact: 'medium'
          },
          {
            type: 'success',
            title: 'AIコンテンツ生成効果',
            description: 'AI生成コンテンツの平均ROIが従来の230%向上',
            action: 'AI生成コンテンツの比率を増やす',
            impact: 'high'
          }
        ]
      };

      setData(mockData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRealTimeMetrics = async () => {
    if (!data) return;
    
    setRefreshing(true);
    try {
      // Simulate real-time updates
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setData(prevData => ({
        ...prevData!,
        realTimeMetrics: {
          ...prevData!.realTimeMetrics,
          currentVisitors: Math.floor(Math.random() * 20) + 30,
          todayConversions: prevData!.realTimeMetrics.todayConversions + Math.floor(Math.random() * 3),
          todayRevenue: prevData!.realTimeMetrics.todayRevenue + Math.floor(Math.random() * 5000)
        }
      }));
    } catch (error) {
      console.error('Error fetching real-time metrics:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleOptimizationAction = (action: string) => {
    console.log(`Executing optimization action: ${action}`);
    // Implement optimization actions
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ja-JP').format(num);
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'opportunity': return 'border-green-200 bg-green-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      case 'success': return 'border-green-200 bg-green-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>ダッシュボードデータを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">紹介プログラム ダッシュボード</h1>
          <p className="text-gray-600 mt-1">リアルタイム分析と最適化提案</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={fetchRealTimeMetrics}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            更新
          </Button>
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="1d">今日</option>
            <option value="7d">過去7日</option>
            <option value="30d">過去30日</option>
            <option value="90d">過去90日</option>
          </select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">総収益</p>
                <p className="text-2xl font-bold">{formatCurrency(data.overview.totalRevenue)}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-600">+{data.overview.revenueGrowth}%</span>
                </div>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">総コンバージョン</p>
                <p className="text-2xl font-bold">{formatNumber(data.overview.totalConversions)}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-600">+{data.overview.conversionGrowth}%</span>
                </div>
              </div>
              <Target className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">コンバージョン率</p>
                <p className="text-2xl font-bold">{data.overview.conversionRate}%</p>
                <Progress value={data.overview.conversionRate} className="mt-2" />
              </div>
              <BarChart3 className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">アクティブ紹介者</p>
                <p className="text-2xl font-bold">{formatNumber(data.overview.activeReferrers)}</p>
                <Badge variant="secondary" className="mt-1">
                  今月: +23
                </Badge>
              </div>
              <Users className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            リアルタイム指標
          </CardTitle>
          <CardDescription>現在のライブ活動とコンバージョン</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">現在の訪問者</p>
              <p className="text-3xl font-bold text-green-600">{data.realTimeMetrics.currentVisitors}</p>
              <div className="flex justify-center mt-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">今日のコンバージョン</p>
              <p className="text-3xl font-bold text-blue-600">{data.realTimeMetrics.todayConversions}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">今日の収益</p>
              <p className="text-3xl font-bold text-purple-600">{formatCurrency(data.realTimeMetrics.todayRevenue)}</p>
            </div>
          </div>

          {/* Live Conversions Feed */}
          <div className="mt-6">
            <h4 className="font-medium mb-3">ライブコンバージョン</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {data.realTimeMetrics.liveConversions.map((conversion, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">{conversion.referrer}</span>
                    <Badge variant="outline">{conversion.source}</Badge>
                  </div>
                  <span className="font-medium">{formatCurrency(conversion.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance">パフォーマンス分析</TabsTrigger>
          <TabsTrigger value="campaigns">キャンペーン詳細</TabsTrigger>
          <TabsTrigger value="content">コンテンツ分析</TabsTrigger>
          <TabsTrigger value="insights">AI インサイト</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Revenue Trend */}
            <Card>
              <CardHeader>
                <CardTitle>収益トレンド</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Area type="monotone" dataKey="revenue" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Platform Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>プラットフォーム別収益</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.platformBreakdown}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="revenue"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {data.platformBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Conversion Funnel */}
          <Card>
            <CardHeader>
              <CardTitle>コンバージョンファネル</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="views" fill="#8884d8" name="ビュー" />
                  <Bar dataKey="clicks" fill="#82ca9d" name="クリック" />
                  <Bar dataKey="conversions" fill="#ffc658" name="コンバージョン" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>キャンペーン別パフォーマンス</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.campaignPerformance.map((campaign) => (
                  <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium">{campaign.name}</h4>
                        <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                          {campaign.status}
                        </Badge>
                        {campaign.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
                        {campaign.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
                      </div>
                      <div className="flex items-center gap-6 mt-2 text-sm text-gray-600">
                        <span>収益: {formatCurrency(campaign.revenue)}</span>
                        <span>コンバージョン: {campaign.conversions}</span>
                        <span>ROI: {campaign.roi}%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline">詳細</Button>
                      <Button size="sm" variant="outline">最適化</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>コンテンツパフォーマンス</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">タイトル</th>
                      <th className="text-left p-2">プラットフォーム</th>
                      <th className="text-left p-2">ビュー</th>
                      <th className="text-left p-2">クリック</th>
                      <th className="text-left p-2">コンバージョン</th>
                      <th className="text-left p-2">収益</th>
                      <th className="text-left p-2">エンゲージメント</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.contentPerformance.map((content) => (
                      <tr key={content.id} className="border-b">
                        <td className="p-2 font-medium">{content.title}</td>
                        <td className="p-2">
                          <Badge variant="outline">{content.platform}</Badge>
                        </td>
                        <td className="p-2">{formatNumber(content.views)}</td>
                        <td className="p-2">{formatNumber(content.clicks)}</td>
                        <td className="p-2">{formatNumber(content.conversions)}</td>
                        <td className="p-2">{formatCurrency(content.revenue)}</td>
                        <td className="p-2">{content.engagement}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid gap-4">
            {data.aiInsights.map((insight, index) => (
              <Alert key={index} className={getInsightColor(insight.type)}>
                <div className="flex items-start gap-3">
                  {getInsightIcon(insight.type)}
                  <div className="flex-1">
                    <AlertTitle className="flex items-center gap-2">
                      {insight.title}
                      <Badge variant={insight.impact === 'high' ? 'destructive' : insight.impact === 'medium' ? 'default' : 'secondary'}>
                        {insight.impact}
                      </Badge>
                    </AlertTitle>
                    <AlertDescription className="mt-1">
                      {insight.description}
                    </AlertDescription>
                    <div className="mt-3">
                      <Button
                        size="sm"
                        onClick={() => handleOptimizationAction(insight.action)}
                        className="flex items-center gap-1"
                      >
                        <Zap className="w-3 h-3" />
                        {insight.action}
                      </Button>
                    </div>
                  </div>
                </div>
              </Alert>
            ))}
          </div>

          {/* Top Referrers */}
          <Card>
            <CardHeader>
              <CardTitle>トップリファラー</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.topReferrers.map((referrer, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium">{referrer.name}</p>
                      <p className="text-sm text-gray-600">
                        {referrer.conversions} コンバージョン • 獲得コミッション: {formatCurrency(referrer.commissionEarned)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(referrer.revenue)}</p>
                      <p className="text-sm text-gray-600">総収益</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReferralPerformanceDashboard;