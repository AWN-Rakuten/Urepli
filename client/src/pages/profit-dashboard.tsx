/**
 * Profit Control Dashboard
 * Main dashboard for monitoring KPIs, funnel performance, and budget optimization
 */

import React, { useState, useEffect } from 'react';
import { EventBadgeList } from '../components/EventBadge';

// Mock data interfaces (in real app these would come from API)
interface DashboardMetrics {
  summary: {
    views: number;
    clicks: number;
    conversions: number;
    revenue: number;
    spend: number;
    profit: number;
    ctr: number;
    cvr: number;
    rpc: number;
    roas: number;
    mer: number;
  };
  funnel: {
    views: { value: number; label: string };
    clicks: { value: number; label: string; rate: number };
    conversions: { value: number; label: string; rate: number };
  };
  platformBreakdown: Array<{
    platform: string;
    posts: number;
    views: number;
    revenue: number;
    revenueShare: number;
  }>;
  activeEvents: Array<{
    code: string;
    name: string;
    badge: string;
    urgency: string;
  }>;
}

interface CreativeLeaderboard {
  rank: number;
  id: string;
  title: string;
  platform: string;
  thumbnail?: string;
  thirtyMinMetrics: {
    views: number;
    revenue: number;
    rpm: number;
  };
  totalRevenue: number;
}

const ProfitDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [creativeLeaderboard, setCreativeLeaderboard] = useState<CreativeLeaderboard[]>([]);
  const [timeframe, setTimeframe] = useState('7d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [timeframe]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // In real implementation, these would be actual API calls
      // For demo, using mock data
      
      const mockMetrics: DashboardMetrics = {
        summary: {
          views: 125430,
          clicks: 3892,
          conversions: 89,
          revenue: 445200,
          spend: 133560,
          profit: 311640,
          ctr: 3.1,
          cvr: 2.3,
          rpc: 114,
          roas: 3.33,
          mer: 3.33
        },
        funnel: {
          views: { value: 125430, label: 'Views' },
          clicks: { value: 3892, label: 'Clicks', rate: 0.031 },
          conversions: { value: 89, label: 'Conversions', rate: 0.023 }
        },
        platformBreakdown: [
          { platform: 'TikTok', posts: 23, views: 67890, revenue: 245000, revenueShare: 0.55 },
          { platform: 'Instagram', posts: 18, views: 38940, revenue: 134500, revenueShare: 0.30 },
          { platform: 'YouTube', posts: 12, views: 18600, revenue: 65700, revenueShare: 0.15 }
        ],
        activeEvents: [
          { code: '5-0-day', name: '5と0の日', badge: '5と0の日', urgency: 'high' },
          { code: 'SPU', name: 'スーパーポイントアップ', badge: 'SPU', urgency: 'medium' }
        ]
      };

      const mockLeaderboard: CreativeLeaderboard[] = [
        {
          rank: 1,
          id: 'content-1',
          title: '最新iPhone比較レビュー',
          platform: 'TikTok',
          thirtyMinMetrics: { views: 1240, revenue: 8900, rpm: 7.18 },
          totalRevenue: 45600
        },
        {
          rank: 2,
          id: 'content-2',
          title: '美容液ランキングTOP5',
          platform: 'Instagram',
          thirtyMinMetrics: { views: 890, revenue: 5670, rpm: 6.37 },
          totalRevenue: 32400
        },
        {
          rank: 3,
          id: 'content-3',
          title: 'コスパ最強ガジェット紹介',
          platform: 'YouTube',
          thirtyMinMetrics: { views: 670, revenue: 3450, rpm: 5.15 },
          totalRevenue: 18900
        }
      ];

      setMetrics(mockMetrics);
      setCreativeLeaderboard(mockLeaderboard);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBoostNow = () => {
    alert('Boost campaign triggered! (In real app, this would call the auto-boost API)');
  };

  const handleShiftBudget = () => {
    alert('Budget reallocation started! (In real app, this would call the budget optimizer)');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700">データの読み込みに失敗しました</h2>
          <button 
            onClick={fetchDashboardData}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Profit Control Dashboard</h1>
              <p className="text-sm text-gray-500">リアルタイムパフォーマンス監視・最適化</p>
            </div>
            <div className="flex items-center space-x-4">
              <select 
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              >
                <option value="1d">過去24時間</option>
                <option value="7d">過去7日間</option>
                <option value="30d">過去30日間</option>
              </select>
              <button 
                onClick={handleBoostNow}
                className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700"
              >
                🚀 Boost Now
              </button>
              <button 
                onClick={handleShiftBudget}
                className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700"
              >
                💰 Shift Budget
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Active Events */}
        {metrics.activeEvents.length > 0 && (
          <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border border-red-200">
            <h3 className="text-lg font-semibold text-red-800 mb-2">🔥 Active Events</h3>
            <EventBadgeList 
              events={metrics.activeEvents.map(e => ({
                code: e.code,
                name: e.badge,
                urgencyLevel: e.urgency as any
              }))}
              size="lg"
            />
          </div>
        )}

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-bold">¥</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  ¥{metrics.summary.revenue.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold">📈</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">ROAS</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.summary.roas}x</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 font-bold">💰</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Profit</p>
                <p className="text-2xl font-bold text-gray-900">
                  ¥{metrics.summary.profit.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-orange-600 font-bold">🎯</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">CVR</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.summary.cvr}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Funnel Metrics */}
          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                📊 Conversion Funnel (Views→Clicks→Conversions)
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded">
                  <div>
                    <p className="font-medium text-blue-900">Views</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {metrics.funnel.views.value.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-blue-500">👀</div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-green-50 rounded">
                  <div>
                    <p className="font-medium text-green-900">
                      Clicks 
                      <span className="text-sm text-green-600 ml-2">
                        ({(metrics.funnel.clicks.rate * 100).toFixed(1)}% CTR)
                      </span>
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {metrics.funnel.clicks.value.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-green-500">👆</div>
                </div>

                <div className="flex items-center justify-between p-4 bg-purple-50 rounded">
                  <div>
                    <p className="font-medium text-purple-900">
                      Conversions 
                      <span className="text-sm text-purple-600 ml-2">
                        ({(metrics.funnel.conversions.rate * 100).toFixed(1)}% CVR)
                      </span>
                    </p>
                    <p className="text-2xl font-bold text-purple-600">
                      {metrics.funnel.conversions.value.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-purple-500">💰</div>
                </div>
              </div>
            </div>
          </div>

          {/* Platform Breakdown */}
          <div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                📱 Platform Performance
              </h3>
              <div className="space-y-3">
                {metrics.platformBreakdown.map((platform, index) => (
                  <div key={platform.platform} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        index === 0 ? 'bg-red-500' : 
                        index === 1 ? 'bg-pink-500' : 'bg-red-600'
                      }`}></div>
                      <div>
                        <p className="font-medium text-gray-900">{platform.platform}</p>
                        <p className="text-sm text-gray-500">{platform.posts} posts</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">
                        ¥{platform.revenue.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        {(platform.revenueShare * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Creative Leaderboard */}
        <div className="mt-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                🏆 Creative League Table (30-min Rolling RPM)
              </h3>
              <span className="text-sm text-gray-500">Revenue Per Mille (RPM)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Creative
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Platform
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      30m RPM
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Revenue
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {creativeLeaderboard.map((creative) => (
                    <tr key={creative.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                            creative.rank === 1 ? 'bg-yellow-100 text-yellow-800' :
                            creative.rank === 2 ? 'bg-gray-100 text-gray-800' :
                            creative.rank === 3 ? 'bg-orange-100 text-orange-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {creative.rank}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                          {creative.title}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {creative.platform}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-green-600">
                          ¥{creative.thirtyMinMetrics.rpm}
                        </div>
                        <div className="text-xs text-gray-500">
                          {creative.thirtyMinMetrics.views} views
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ¥{creative.totalRevenue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfitDashboard;