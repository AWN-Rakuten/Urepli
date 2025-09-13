import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Smartphone, 
  Globe, 
  TrendingUp, 
  Clock, 
  Hash, 
  Zap,
  Settings,
  Target,
  Users,
  MapPin,
  DollarSign,
  Shield,
  Heart,
  Briefcase,
  FileText,
  Video,
  BarChart3,
  CreditCard,
  MessageSquare,
  CheckCircle
} from 'lucide-react';

interface AppSpec {
  id: string;
  name: string;
  problem: string;
  solution: string;
  targetUsers: string[];
  culturalFit: number;
  monetizationPotential: number;
  complianceLevel: number;
  features: string[];
  status: 'planning' | 'development' | 'testing' | 'published';
}

interface JapaneseMarketContext {
  targetCarriers: string[];
  customerSegment: 'youth' | 'business' | 'senior' | 'family';
  region: string;
  conversionGoal: string;
  budget: number;
  urgency: 'low' | 'medium' | 'high';
}

interface AIRole {
  name: string;
  icon: React.ComponentType<any>;
  description: string;
  active: boolean;
  insights: string[];
}

export function JapaneseMobileAppDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSpec, setSelectedSpec] = useState<string>('');
  const [marketContext, setMarketContext] = useState<JapaneseMarketContext>({
    targetCarriers: [],
    customerSegment: 'youth',
    region: '関東地方',
    conversionGoal: 'app_download',
    budget: 100000,
    urgency: 'medium'
  });

  // AI Roles Configuration
  const [aiRoles] = useState<AIRole[]>([
    {
      name: 'Junior Developer',
      icon: Smartphone,
      description: '技術仕様とコード生成を担当',
      active: true,
      insights: ['Swift/Kotlin対応', 'React Native推奨', 'Firebase連携']
    },
    {
      name: 'Market Researcher',
      icon: Target,
      description: '日本市場データとトレンド分析',
      active: true,
      insights: ['都市部集中戦略', 'モバイル決済必須', 'LINE連携効果大']
    },
    {
      name: 'Product Manager',
      icon: Briefcase,
      description: '機能優先度と文化適応',
      active: true,
      insights: ['QRコード重要', '電車内利用想定', 'オフライン対応']
    },
    {
      name: 'Compliance Officer',
      icon: Shield,
      description: 'APPI・ステマ規制対応',
      active: true,
      insights: ['個人情報保護法対応', 'ステマ規制クリア', 'App Store審査']
    },
    {
      name: 'Growth Hacker',
      icon: TrendingUp,
      description: 'バイラリティ・収益化設計',
      active: true,
      insights: ['TikTok連携', '紹介キャンペーン', 'アフィリエイト最適化']
    }
  ]);

  // Fetch app specifications
  const { data: appSpecs, isLoading: specsLoading } = useQuery({
    queryKey: ['/api/japanese-mobile/specs'],
    queryFn: () => apiRequest('/api/japanese-mobile/specs'),
    retry: false
  });

  // Fetch Japanese market insights
  const { data: marketInsights, isLoading: insightsLoading } = useQuery({
    queryKey: ['/api/japanese-mobile/market-insights'],
    queryFn: () => apiRequest('/api/japanese-mobile/market-insights'),
    retry: false
  });

  // Fetch payment methods
  const { data: paymentMethods, isLoading: paymentsLoading } = useQuery({
    queryKey: ['/api/mobile-japan/payment-methods'],
    queryFn: () => apiRequest('/api/japanese-mobile/payment-methods'),
    retry: false
  });

  // Create app specification mutation
  const createAppSpecMutation = useMutation({
    mutationFn: (spec: Partial<AppSpec>) => 
      apiRequest('/api/japanese-mobile/specs', {
        method: 'POST',
        body: spec
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/japanese-mobile/specs'] });
      toast({
        title: "App仕様作成完了",
        description: "新しいモバイルアプリ仕様が作成されました。",
      });
    },
    onError: (error) => {
      toast({
        title: "エラー",
        description: "App仕様の作成に失敗しました。",
        variant: "destructive",
      });
    },
  });

  // Generate comprehensive plan mutation
  const generatePlanMutation = useMutation({
    mutationFn: (data: { specId: string; context: JapaneseMarketContext }) =>
      apiRequest('/api/japanese-mobile/generate-plan', {
        method: 'POST',
        body: data
      }),
    onSuccess: (data) => {
      toast({
        title: "開発計画生成完了",
        description: `${data.estimatedDuration}の開発計画が生成されました。`,
      });
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white flex items-center justify-center gap-3">
            <Smartphone className="w-10 h-10 text-blue-600" />
            日本市場向けモバイルアプリ開発システム
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            AI駆動の包括的なモバイルアプリ開発・収益化プラットフォーム
          </p>
        </div>

        {/* AI Roles Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              AI開発チーム状況
            </CardTitle>
            <CardDescription>
              多層AI役割システムによる開発支援
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {aiRoles.map((role) => (
                <Card key={role.name} className={`border-2 ${role.active ? 'border-green-500' : 'border-gray-300'}`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center space-y-2">
                      <role.icon className={`w-8 h-8 ${role.active ? 'text-green-600' : 'text-gray-400'}`} />
                      <div className="text-sm font-medium text-center">{role.name}</div>
                      <div className="text-xs text-gray-500 text-center">{role.description}</div>
                      {role.active && (
                        <Badge variant="secondary" className="text-xs">
                          アクティブ
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="specs" className="space-y-6">
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="specs">App仕様</TabsTrigger>
            <TabsTrigger value="localization">ローカライゼーション</TabsTrigger>
            <TabsTrigger value="compliance">コンプライアンス</TabsTrigger>
            <TabsTrigger value="monetization">収益化</TabsTrigger>
            <TabsTrigger value="automation">自動化</TabsTrigger>
            <TabsTrigger value="analytics">分析・KPI</TabsTrigger>
          </TabsList>

          {/* App Specifications Tab */}
          <TabsContent value="specs" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* App Specs List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    アプリ仕様一覧
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {specsLoading ? (
                    <div>読み込み中...</div>
                  ) : appSpecs && appSpecs.length > 0 ? (
                    appSpecs.map((spec: AppSpec) => (
                      <Card key={spec.id} className="border hover:border-blue-500 cursor-pointer">
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h3 className="font-medium">{spec.name}</h3>
                              <Badge variant={
                                spec.status === 'published' ? 'default' :
                                spec.status === 'testing' ? 'secondary' :
                                spec.status === 'development' ? 'outline' : 'destructive'
                              }>
                                {spec.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">{spec.problem}</p>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="flex items-center gap-1">
                                <Heart className="w-4 h-4" />
                                文化適合: {spec.culturalFit}%
                              </span>
                              <span className="flex items-center gap-1">
                                <DollarSign className="w-4 h-4" />
                                収益性: {spec.monetizationPotential}%
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      アプリ仕様がありません
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* New Spec Creation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    新規App仕様生成
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <Label>アプリ名</Label>
                      <Input placeholder="例: MNP比較アプリ" />
                    </div>
                    <div>
                      <Label>解決する問題</Label>
                      <Textarea placeholder="日本のユーザーが抱える具体的な問題..." />
                    </div>
                    <div>
                      <Label>ターゲットユーザー</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="選択してください" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="youth">若年層 (18-30歳)</SelectItem>
                          <SelectItem value="business">ビジネス層 (30-50歳)</SelectItem>
                          <SelectItem value="senior">シニア層 (50歳以上)</SelectItem>
                          <SelectItem value="family">ファミリー層</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={() => createAppSpecMutation.mutate({
                        name: 'サンプルアプリ',
                        problem: '課題定義',
                        solution: 'ソリューション',
                        targetUsers: ['youth'],
                        culturalFit: 85,
                        monetizationPotential: 75,
                        complianceLevel: 90,
                        features: ['基本機能'],
                        status: 'planning'
                      })}
                      disabled={createAppSpecMutation.isPending}
                    >
                      {createAppSpecMutation.isPending ? '生成中...' : 'AI仕様生成'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Comprehensive Development Plan */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  包括的開発計画生成
                </CardTitle>
                <CardDescription>
                  選択したアプリ仕様に基づいて14段階の詳細開発計画を生成
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>アプリ仕様選択</Label>
                    <Select value={selectedSpec} onValueChange={setSelectedSpec}>
                      <SelectTrigger>
                        <SelectValue placeholder="仕様を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {appSpecs?.map((spec: AppSpec) => (
                          <SelectItem key={spec.id} value={spec.id}>
                            {spec.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>予算 (円)</Label>
                    <Input 
                      type="number"
                      value={marketContext.budget}
                      onChange={(e) => setMarketContext(prev => ({
                        ...prev,
                        budget: parseInt(e.target.value)
                      }))}
                    />
                  </div>
                </div>
                <Button 
                  className="w-full"
                  onClick={() => selectedSpec && generatePlanMutation.mutate({
                    specId: selectedSpec,
                    context: marketContext
                  })}
                  disabled={!selectedSpec || generatePlanMutation.isPending}
                >
                  {generatePlanMutation.isPending ? '計画生成中...' : '14段階開発計画生成'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Localization Tab */}
          <TabsContent value="localization" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    日本語ローカライゼーション
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">フォント設定</div>
                        <div className="text-sm text-gray-500">Noto Sans JP / UD Digi Kyokasho</div>
                      </div>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">敬語レベル設定</div>
                        <div className="text-sm text-gray-500">カジュアル / 敬語 / 丁寧語</div>
                      </div>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">日時フォーマット</div>
                        <div className="text-sm text-gray-500">24時間制 / 年月日表記</div>
                      </div>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    日本の決済システム
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {paymentsLoading ? (
                    <div>読み込み中...</div>
                  ) : paymentMethods ? (
                    <div className="space-y-3">
                      {paymentMethods.supportedMethods?.map((method: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium">{method.method}</div>
                            <div className="text-sm text-gray-500">
                              導入率: {method.userAdoption}% | 
                              コンバージョン影響: +{method.conversionImpact}%
                            </div>
                          </div>
                          <Badge variant={method.integrationComplexity === 'low' ? 'default' : 'secondary'}>
                            {method.integrationComplexity}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div>決済情報を取得できませんでした</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Compliance Tab */}
          <TabsContent value="compliance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    APPI個人情報保護法対応
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-sm">
                    <li>• データ収集の明示的同意取得</li>
                    <li>• 利用目的の具体的説明</li>
                    <li>• 第三者提供の事前同意</li>
                    <li>• データ削除権の実装</li>
                    <li>• 未成年者データの特別保護</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    ステルスマーケティング規制
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-sm">
                    <li>• 広告表示義務の自動挿入</li>
                    <li>• プラットフォーム別表示要件</li>
                    <li>• アフィリエイトリンクの明示</li>
                    <li>• PR投稿の適切なハッシュタグ</li>
                    <li>• コンテンツ審査の自動化</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Monetization Tab */}
          <TabsContent value="monetization" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    アフィリエイト収益
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-1">
                    <li>• A8.net統合</li>
                    <li>• Rakuten Affiliate</li>
                    <li>• Amazon Associate JP</li>
                    <li>• ValueCommerce</li>
                    <li>• 自動最適化</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    バイラル成長
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-1">
                    <li>• TikTokトレンド連動</li>
                    <li>• LINEステッカー</li>
                    <li>• 紹介キャンペーン</li>
                    <li>• SNSクロスポスト</li>
                    <li>• インフルエンサー連携</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    広告オーケストレーション
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-1">
                    <li>• Google Ads自動化</li>
                    <li>• TikTok Ads連携</li>
                    <li>• Meta広告最適化</li>
                    <li>• 予算配分AI</li>
                    <li>• ROAS最大化</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Automation Tab */}
          <TabsContent value="automation" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    n8nワークフロー自動化
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="text-sm space-y-1">
                    <li>• 日本語コンテンツ自動生成</li>
                    <li>• マルチプラットフォーム投稿</li>
                    <li>• アフィリエイト最適化</li>
                    <li>• コンプライアンス自動チェック</li>
                    <li>• パフォーマンス分析</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="w-5 h-5" />
                    動画・ブログ自動生成
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="text-sm space-y-1">
                    <li>• AIスクリプト生成</li>
                    <li>• TTS音声合成</li>
                    <li>• 字幕自動生成</li>
                    <li>• SEO最適化</li>
                    <li>• 自動公開スケジュール</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">CTR</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">3.2%</div>
                  <div className="text-sm text-green-600">+0.8%</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">CVR</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">2.1%</div>
                  <div className="text-sm text-green-600">+0.3%</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">ROAS</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">4.5x</div>
                  <div className="text-sm text-green-600">+1.2x</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">eRPC</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">¥85</div>
                  <div className="text-sm text-green-600">+¥12</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}