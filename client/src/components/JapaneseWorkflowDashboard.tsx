import { useState } from 'react';
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
  DollarSign
} from 'lucide-react';

interface JapaneseMarketContext {
  targetCarriers: string[];
  customerSegment: 'youth' | 'business' | 'senior' | 'family';
  region: string;
  conversionGoal: 'mnp_switch' | 'plan_upgrade' | 'device_purchase';
  budget: number;
  urgency: 'low' | 'medium' | 'high';
}

interface WorkflowTemplate {
  name: string;
  description: string;
  useCase: string;
  nodes: string[];
}

export function JapaneseWorkflowDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [workflowName, setWorkflowName] = useState('');
  const [marketContext, setMarketContext] = useState<JapaneseMarketContext>({
    targetCarriers: [],
    customerSegment: 'youth',
    region: '関東地方',
    conversionGoal: 'mnp_switch',
    budget: 50000,
    urgency: 'medium'
  });

  // Fetch Japanese workflow templates
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/n8n-japanese/templates'],
    retry: false
  });

  // Fetch market context suggestions
  const { data: contextSuggestions, isLoading: contextLoading } = useQuery({
    queryKey: ['/api/n8n-japanese/market-context-suggestions'],
    retry: false
  });

  // Create Japanese workflow mutation
  const createWorkflowMutation = useMutation({
    mutationFn: async (data: { workflowName: string; marketContext: JapaneseMarketContext }) => {
      return apiRequest('/api/n8n-japanese/create-japanese-workflow', 'POST', data);
    },
    onSuccess: (data) => {
      toast({
        title: "ワークフロー作成完了",
        description: `日本市場向けワークフロー "${workflowName}" が正常に作成されました。`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/n8n-japanese'] });
    },
    onError: (error: Error) => {
      toast({
        title: "エラー",
        description: `ワークフロー作成に失敗しました: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Deploy workflow mutation
  const deployWorkflowMutation = useMutation({
    mutationFn: async (workflow: any) => {
      return apiRequest('/api/n8n-japanese/deploy-workflow', 'POST', { workflow });
    },
    onSuccess: () => {
      toast({
        title: "デプロイ完了",
        description: "ワークフローがn8nインスタンスにデプロイされました。",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "デプロイエラー",
        description: `デプロイに失敗しました: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const handleCreateWorkflow = () => {
    if (!workflowName) {
      toast({
        title: "入力エラー",
        description: "ワークフロー名を入力してください。",
        variant: "destructive"
      });
      return;
    }

    createWorkflowMutation.mutate({
      workflowName,
      marketContext
    });
  };

  if (templatesLoading || contextLoading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2">日本市場向けワークフローを読み込み中...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="japanese-workflow-dashboard">
      <div className="flex items-center gap-2">
        <Globe className="w-6 h-6 text-red-500" />
        <h2 className="text-2xl font-bold">日本市場向けn8nワークフロー</h2>
        <Badge variant="secondary">MNP最適化</Badge>
      </div>

      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create" data-testid="tab-create">ワークフロー作成</TabsTrigger>
          <TabsTrigger value="templates" data-testid="tab-templates">テンプレート</TabsTrigger>
          <TabsTrigger value="nodes" data-testid="tab-nodes">ノード詳細</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Workflow Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  ワークフロー設定
                </CardTitle>
                <CardDescription>
                  日本市場に特化したワークフローを設定します
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="workflow-name">ワークフロー名</Label>
                  <Input
                    id="workflow-name"
                    placeholder="例: MNP乗換キャンペーン_2025"
                    value={workflowName}
                    onChange={(e) => setWorkflowName(e.target.value)}
                    data-testid="input-workflow-name"
                  />
                </div>

                <div>
                  <Label htmlFor="customer-segment">ターゲット層</Label>
                  <Select
                    value={marketContext.customerSegment}
                    onValueChange={(value: any) => 
                      setMarketContext({...marketContext, customerSegment: value})
                    }
                  >
                    <SelectTrigger data-testid="select-customer-segment">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(contextSuggestions as any)?.suggestions?.customerSegments?.map((segment: any) => (
                        <SelectItem key={segment.id} value={segment.id}>
                          {segment.name} - {segment.description}
                        </SelectItem>
                      )) || []}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="conversion-goal">コンバージョン目標</Label>
                  <Select
                    value={marketContext.conversionGoal}
                    onValueChange={(value: any) => 
                      setMarketContext({...marketContext, conversionGoal: value})
                    }
                  >
                    <SelectTrigger data-testid="select-conversion-goal">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(contextSuggestions as any)?.suggestions?.conversionGoals?.map((goal: any) => (
                        <SelectItem key={goal.id} value={goal.id}>
                          {goal.name} - {goal.description}
                        </SelectItem>
                      )) || []}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="budget">予算 (円)</Label>
                  <Input
                    id="budget"
                    type="number"
                    min="1000"
                    value={marketContext.budget}
                    onChange={(e) => 
                      setMarketContext({...marketContext, budget: parseInt(e.target.value) || 0})
                    }
                    data-testid="input-budget"
                  />
                </div>

                <div>
                  <Label htmlFor="region">地域</Label>
                  <Select
                    value={marketContext.region}
                    onValueChange={(value) => 
                      setMarketContext({...marketContext, region: value})
                    }
                  >
                    <SelectTrigger data-testid="select-region">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(contextSuggestions as any)?.suggestions?.regions?.map((region: string) => (
                        <SelectItem key={region} value={region}>
                          {region}
                        </SelectItem>
                      )) || []}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleCreateWorkflow}
                  disabled={createWorkflowMutation.isPending}
                  className="w-full"
                  data-testid="button-create-workflow"
                >
                  {createWorkflowMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      作成中...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      ワークフロー作成
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Market Context Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  マーケットコンテキスト
                </CardTitle>
                <CardDescription>
                  設定された日本市場パラメータの概要
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">ターゲット層</p>
                      <p className="text-xs text-muted-foreground">
                        {(contextSuggestions as any)?.suggestions?.customerSegments?.find(
                          (s: any) => s.id === marketContext.customerSegment
                        )?.name || marketContext.customerSegment}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-green-500" />
                    <div>
                      <p className="text-sm font-medium">コンバージョン</p>
                      <p className="text-xs text-muted-foreground">
                        {(contextSuggestions as any)?.suggestions?.conversionGoals?.find(
                          (g: any) => g.id === marketContext.conversionGoal
                        )?.name || marketContext.conversionGoal}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-yellow-500" />
                    <div>
                      <p className="text-sm font-medium">予算</p>
                      <p className="text-xs text-muted-foreground">
                        ¥{marketContext.budget.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-red-500" />
                    <div>
                      <p className="text-sm font-medium">地域</p>
                      <p className="text-xs text-muted-foreground">
                        {marketContext.region}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">対象キャリア</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {((contextSuggestions as any)?.suggestions?.targetCarriers || []).map((carrier: any) => (
                      <Badge 
                        key={carrier.id} 
                        variant={marketContext.targetCarriers.includes(carrier.id) ? "default" : "outline"}
                        className="cursor-pointer text-xs"
                        onClick={() => {
                          const carriers = marketContext.targetCarriers.includes(carrier.id)
                            ? marketContext.targetCarriers.filter(c => c !== carrier.id)
                            : [...marketContext.targetCarriers, carrier.id];
                          setMarketContext({...marketContext, targetCarriers: carriers});
                        }}
                      >
                        {carrier.name} ({carrier.marketShare}%)
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {((templates as any)?.templates || []).map((template: WorkflowTemplate, index: number) => (
              <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm"><strong>用途:</strong> {template.useCase}</p>
                    <div>
                      <p className="text-sm font-medium mb-1">含まれるノード:</p>
                      <div className="flex flex-wrap gap-1">
                        {template.nodes.map((node, nodeIndex) => (
                          <Badge key={nodeIndex} variant="secondary" className="text-xs">
                            {node}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    className="w-full mt-4"
                    onClick={() => {
                      setSelectedTemplate(template.name);
                      setWorkflowName(template.name);
                    }}
                    data-testid={`button-select-template-${index}`}
                  >
                    テンプレート使用
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="nodes" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  日本語コンテンツローカライザー
                </CardTitle>
                <CardDescription>
                  日本の文化に適応したコンテンツ変換
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1">
                  <li>• 敬語レベル自動調整</li>
                  <li>• MNP専門用語の日本語化</li>
                  <li>• ターゲット層に応じた表現変更</li>
                  <li>• 文化的適応機能</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  MNPキャリア比較
                </CardTitle>
                <CardDescription>
                  日本の携帯キャリア乗換分析
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1">
                  <li>• 4大キャリア+MVNO分析</li>
                  <li>• セグメント別推奨キャリア</li>
                  <li>• キャッシュバック計算</li>
                  <li>• 乗換メリット算出</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  日本タイミング最適化
                </CardTitle>
                <CardDescription>
                  日本市場向け投稿タイミング
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1">
                  <li>• 通勤時間帯の最適化</li>
                  <li>• 平日/休日パターン分析</li>
                  <li>• 文化的イベント考慮</li>
                  <li>• プラットフォーム別調整</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hash className="w-5 h-5" />
                  日本語ハッシュタグ生成
                </CardTitle>
                <CardDescription>
                  MNP特化ハッシュタグ生成
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1">
                  <li>• MNPコアハッシュタグ</li>
                  <li>• キャリア固有タグ</li>
                  <li>• 季節・文化考慮</li>
                  <li>• リーチ予測機能</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}