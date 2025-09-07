import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Brain, 
  Clock, 
  TrendingUp, 
  BarChart3, 
  Calendar, 
  Zap,
  Target,
  RefreshCw,
  Activity,
  AlertCircle,
  CheckCircle,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface MarketPattern {
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

interface PredictiveSchedule {
  id: string;
  workflowId: string;
  platform: string;
  predictedOptimalTime: string;
  predictedROI: number;
  confidenceScore: number;
  schedulingReason: string[];
  fallbackTimes: string[];
  status: 'scheduled' | 'executed' | 'rescheduled' | 'cancelled';
}

export default function PredictiveSchedulingDashboard() {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('tiktok');
  const [timeframe, setTimeframe] = useState<string>('24');
  const queryClient = useQueryClient();

  // Get market patterns
  const { data: marketData, isLoading: patternsLoading } = useQuery({
    queryKey: [`/api/predictive/market-patterns/${selectedPlatform}`],
    refetchInterval: 30 * 60 * 1000 // Refresh every 30 minutes
  });

  // Get current schedules
  const { data: schedulesData, isLoading: schedulesLoading } = useQuery({
    queryKey: ['/api/predictive/schedules'],
    refetchInterval: 5 * 60 * 1000 // Refresh every 5 minutes
  });

  // Get insights
  const { data: insightsData, isLoading: insightsLoading } = useQuery({
    queryKey: ['/api/predictive/insights', { hours: timeframe, platform: selectedPlatform }],
    refetchInterval: 15 * 60 * 1000 // Refresh every 15 minutes
  });

  // Generate schedule mutation
  const generateScheduleMutation = useMutation({
    mutationFn: async (workflowQueue: any[]) => {
      return apiRequest('POST', '/api/predictive/generate-schedule', { workflowQueue });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/predictive/schedules'] });
      toast({
        title: '予測スケジュール生成完了',
        description: 'AIが最適なスケジュールを生成しました'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'スケジュール生成エラー',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Trigger analysis mutation
  const analysisMutation = useMutation({
    mutationFn: async (platform: string) => {
      return apiRequest('POST', `/api/predictive/analyze/${platform}`, { forceRefresh: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/predictive/market-patterns/${selectedPlatform}`] });
      toast({
        title: 'マーケット分析完了',
        description: `${selectedPlatform}の最新パターンを分析しました`
      });
    },
    onError: (error: any) => {
      toast({
        title: '分析エラー',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const marketPatterns: MarketPattern[] = marketData?.patterns || [];
  const schedules: PredictiveSchedule[] = schedulesData?.schedules || [];

  const handleGenerateSampleSchedule = () => {
    const sampleWorkflows = [
      {
        workflowId: 'sample_workflow_1',
        contentId: 'content_1',
        platform: selectedPlatform,
        contentType: 'promotional',
        priority: 1,
        targetAudience: 'young_adults',
        hashtagsUsed: ['携帯乗換', 'MNP', 'スマホ'],
        affiliateLinks: ['https://example.com/mnp-offer']
      }
    ];
    
    generateScheduleMutation.mutate(sampleWorkflows);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">予測ワークフロースケジューリング</h1>
          <p className="text-muted-foreground">
            AIがマーケットパターンを分析して最適なコンテンツ投稿時間を予測します
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tiktok">TikTok</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="youtube">YouTube</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => analysisMutation.mutate(selectedPlatform)}
            disabled={analysisMutation.isPending}
            size="sm"
          >
            {analysisMutation.isPending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Brain className="w-4 h-4" />
            )}
            分析実行
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">概要</TabsTrigger>
          <TabsTrigger value="patterns">マーケットパターン</TabsTrigger>
          <TabsTrigger value="schedules">予測スケジュール</TabsTrigger>
          <TabsTrigger value="insights">インサイト</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">予測精度</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {marketPatterns.length > 0 
                    ? `${Math.round(marketPatterns[0].confidence_score * 100)}%`
                    : '---'
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  AIモデルの信頼度
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">アクティブスケジュール</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {schedules.filter(s => s.status === 'scheduled').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  実行待ち
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">予測ROI</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {schedules.length > 0
                    ? `${(schedules.reduce((sum, s) => sum + s.predictedROI, 0) / schedules.length * 100).toFixed(1)}%`
                    : '---'
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  平均期待値
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">成功率</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {insightsData?.successRate 
                    ? `${Math.round(insightsData.successRate * 100)}%`
                    : '---'
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  過去{timeframe}時間
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  マーケットインサイト
                </CardTitle>
                <CardDescription>
                  AIが分析した{selectedPlatform.toUpperCase()}の市場動向
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {patternsLoading ? (
                  <div className="flex items-center space-x-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="text-sm">パターン分析中...</span>
                  </div>
                ) : marketPatterns.length > 0 ? (
                  <div className="space-y-3">
                    {marketPatterns.slice(0, 3).map((pattern, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">時間帯: {pattern.optimal_times[0]}</div>
                          <div className="text-sm text-muted-foreground">
                            エンゲージメント率: {(pattern.engagement_rate * 100).toFixed(1)}%
                          </div>
                        </div>
                        <Badge variant={pattern.roi > 0.12 ? "default" : "secondary"}>
                          ROI {(pattern.roi * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    分析データがありません
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  次回予測スケジュール
                </CardTitle>
                <CardDescription>
                  AIが予測する最適な投稿時間
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {schedulesLoading ? (
                  <div className="flex items-center space-x-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="text-sm">スケジュール取得中...</span>
                  </div>
                ) : schedules.length > 0 ? (
                  <div className="space-y-3">
                    {schedules
                      .filter(s => s.status === 'scheduled')
                      .slice(0, 3)
                      .map((schedule) => (
                        <div key={schedule.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium">
                              {new Date(schedule.predictedOptimalTime).toLocaleDateString('ja-JP')} {' '}
                              {new Date(schedule.predictedOptimalTime).toLocaleTimeString('ja-JP', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {schedule.platform.toUpperCase()} • 信頼度 {Math.round(schedule.confidenceScore * 100)}%
                            </div>
                          </div>
                          <Badge variant="outline">
                            {(schedule.predictedROI * 100).toFixed(1)}% ROI
                          </Badge>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-4 space-y-2">
                    <div className="text-muted-foreground">スケジュールがありません</div>
                    <Button onClick={handleGenerateSampleSchedule} size="sm" variant="outline">
                      サンプルスケジュール生成
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>マーケットパターン分析</CardTitle>
              <CardDescription>
                {selectedPlatform.toUpperCase()}の過去30日間のデータに基づく分析結果
              </CardDescription>
            </CardHeader>
            <CardContent>
              {patternsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                  パターン分析中...
                </div>
              ) : marketPatterns.length > 0 ? (
                <div className="space-y-4">
                  {marketPatterns.map((pattern, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium">時間枠: {pattern.timeWindow}</h3>
                        <div className="flex items-center space-x-2">
                          <Badge variant={pattern.confidence_score > 0.8 ? "default" : "secondary"}>
                            信頼度 {Math.round(pattern.confidence_score * 100)}%
                          </Badge>
                          <Badge variant={pattern.roi > 0.12 ? "default" : "outline"}>
                            ROI {(pattern.roi * 100).toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">エンゲージメント率</div>
                          <div className="font-medium">{(pattern.engagement_rate * 100).toFixed(1)}%</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">コンバージョン率</div>
                          <div className="font-medium">{(pattern.conversion_rate * 100).toFixed(1)}%</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">オーディエンスサイズ</div>
                          <div className="font-medium">{pattern.audience_size.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">競合レベル</div>
                          <div className="font-medium">{(pattern.competition_level * 100).toFixed(0)}%</div>
                        </div>
                      </div>
                      
                      {pattern.trending_topics.length > 0 && (
                        <div className="mt-3">
                          <div className="text-sm text-muted-foreground mb-2">トレンドトピック</div>
                          <div className="flex flex-wrap gap-1">
                            {pattern.trending_topics.slice(0, 5).map((topic, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {topic}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                  マーケットパターンデータがありません
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>予測スケジュール一覧</CardTitle>
              <CardDescription>
                AIが生成した最適化スケジュール
              </CardDescription>
            </CardHeader>
            <CardContent>
              {schedulesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                  スケジュール取得中...
                </div>
              ) : schedules.length > 0 ? (
                <div className="space-y-4">
                  {schedules.map((schedule) => (
                    <div key={schedule.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-medium">ワークフロー: {schedule.workflowId}</h3>
                          <div className="text-sm text-muted-foreground">
                            プラットフォーム: {schedule.platform.toUpperCase()}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={
                            schedule.status === 'scheduled' ? 'default' :
                            schedule.status === 'executed' ? 'secondary' : 'outline'
                          }>
                            {schedule.status === 'scheduled' ? '実行予定' :
                             schedule.status === 'executed' ? '実行済み' : schedule.status}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">予測実行時間</div>
                          <div className="font-medium">
                            {new Date(schedule.predictedOptimalTime).toLocaleDateString('ja-JP')} {' '}
                            {new Date(schedule.predictedOptimalTime).toLocaleTimeString('ja-JP', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">予測ROI</div>
                          <div className="font-medium">{(schedule.predictedROI * 100).toFixed(1)}%</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">信頼度</div>
                          <div className="font-medium">{Math.round(schedule.confidenceScore * 100)}%</div>
                        </div>
                      </div>
                      
                      {schedule.schedulingReason.length > 0 && (
                        <div className="mt-3">
                          <div className="text-sm text-muted-foreground mb-2">スケジューリング理由</div>
                          <div className="space-y-1">
                            {schedule.schedulingReason.map((reason, i) => (
                              <div key={i} className="text-sm flex items-center">
                                <CheckCircle className="w-3 h-3 mr-2 text-green-500" />
                                {reason}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 space-y-4">
                  <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground" />
                  <div className="text-muted-foreground">予測スケジュールがありません</div>
                  <Button onClick={handleGenerateSampleSchedule} disabled={generateScheduleMutation.isPending}>
                    {generateScheduleMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4 mr-2" />
                    )}
                    サンプルスケジュール生成
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="flex items-center space-x-2 mb-4">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24">過去24時間</SelectItem>
                <SelectItem value="48">過去48時間</SelectItem>
                <SelectItem value="168">過去7日間</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>パフォーマンスインサイト</CardTitle>
                <CardDescription>
                  予測スケジューリングの実行結果分析
                </CardDescription>
              </CardHeader>
              <CardContent>
                {insightsLoading ? (
                  <div className="flex items-center space-x-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="text-sm">分析中...</span>
                  </div>
                ) : insightsData ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">総実行数</div>
                        <div className="text-2xl font-bold">{insightsData.totalExecutions}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">成功実行数</div>
                        <div className="text-2xl font-bold text-green-600">{insightsData.successfulExecutions}</div>
                      </div>
                    </div>
                    
                    {insightsData.averageROI > 0 && (
                      <div>
                        <div className="text-muted-foreground text-sm">平均ROI</div>
                        <div className="text-xl font-bold">{(insightsData.averageROI * 100).toFixed(1)}%</div>
                        <Progress value={insightsData.averageROI * 400} className="mt-2" />
                      </div>
                    )}
                    
                    {insightsData.insights && (
                      <div className="space-y-2">
                        {insightsData.insights.map((insight: string, i: number) => (
                          <div key={i} className="text-sm flex items-center">
                            <TrendingUp className="w-3 h-3 mr-2 text-blue-500" />
                            {insight}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    インサイトデータがありません
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>プラットフォーム別パフォーマンス</CardTitle>
                <CardDescription>
                  各プラットフォームの実行結果比較
                </CardDescription>
              </CardHeader>
              <CardContent>
                {insightsData?.platformStats && insightsData.platformStats.length > 0 ? (
                  <div className="space-y-4">
                    {insightsData.platformStats.map((stat: any) => (
                      <div key={stat.platform} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium capitalize">{stat.platform}</h3>
                          <Badge variant="outline">{stat.executions}回実行</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">成功率</div>
                            <div className="font-medium">{Math.round(stat.successRate * 100)}%</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">平均ROI</div>
                            <div className="font-medium">{(stat.averageROI * 100).toFixed(1)}%</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    プラットフォーム別データがありません
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}