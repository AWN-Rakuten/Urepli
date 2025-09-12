/**
 * Feature 8: Step-by-Step User Onboarding Guide
 * Interactive GUI with tooltips and comprehensive guidance
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  Circle, 
  ArrowRight, 
  ArrowLeft, 
  Lightbulb,
  Target,
  Zap,
  TrendingUp,
  Users,
  DollarSign,
  PlayCircle,
  BookOpen
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<any>;
  completed: boolean;
  optional?: boolean;
  estimatedTime: string;
  difficulty: 'easy' | 'medium' | 'advanced';
  tips: string[];
  resources: { title: string; url: string; type: 'video' | 'article' | 'tool' }[];
}

const ReferralOnboardingGuide: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [showTips, setShowTips] = useState<boolean>(true);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: '🚀 Ultimate Referral System へようこそ',
      description: 'あなたの紹介プログラムを最強のマネー製造マシンに変える旅を始めましょう',
      component: WelcomeStep,
      completed: false,
      estimatedTime: '3分',
      difficulty: 'easy',
      tips: [
        'このシステムはAIを活用して自動的に高収益な紹介コンテンツを生成します',
        '日本市場に最適化されており、A8.net や楽天アフィリエイトと完全統合されています',
        'n8n ワークフローで完全自動化が可能です'
      ],
      resources: [
        { title: '紹介マーケティング基礎', url: '#', type: 'video' },
        { title: 'AI活用ガイド', url: '#', type: 'article' }
      ]
    },
    {
      id: 'api-setup',
      title: '🔑 API設定と統合',
      description: 'Google Gemini、n8n、アフィリエイトAPIを設定',
      component: ApiSetupStep,
      completed: false,
      estimatedTime: '10分',
      difficulty: 'medium',
      tips: [
        'Google Gemini APIキーは content generation の心臓部です',
        'n8n統合により完全自動化が実現されます',
        'A8.net APIは日本最大のアフィリエイトネットワークです'
      ],
      resources: [
        { title: 'API設定チュートリアル', url: '#', type: 'video' },
        { title: 'セキュリティベストプラクティス', url: '#', type: 'article' }
      ]
    },
    {
      id: 'referral-campaign',
      title: '📊 紹介キャンペーン作成',
      description: 'AIを使用した高収益紹介キャンペーンの設計',
      component: CampaignSetupStep,
      completed: false,
      estimatedTime: '15分',
      difficulty: 'medium',
      tips: [
        'ターゲットオーディエンスを明確に定義することが成功の鍵です',
        '複数プラットフォームでの同時展開で reach を最大化',
        'リワード構造は心理学的に最適化されています'
      ],
      resources: [
        { title: 'キャンペーン戦略ガイド', url: '#', type: 'article' },
        { title: '成功事例集', url: '#', type: 'video' }
      ]
    },
    {
      id: 'content-generation',
      title: '✨ AIコンテンツ生成',
      description: 'バイラルな紹介コンテンツを自動生成',
      component: ContentGenerationStep,
      completed: false,
      estimatedTime: '8分',
      difficulty: 'easy',
      tips: [
        'AIは心理学的トリガーを活用してコンバージョンを最大化します',
        '日本文化に最適化されたコンテンツが生成されます',
        'プラットフォーム別に自動最適化されます'
      ],
      resources: [
        { title: 'コンテンツ最適化テクニック', url: '#', type: 'video' },
        { title: 'バイラルコンテンツの科学', url: '#', type: 'article' }
      ]
    },
    {
      id: 'automation-setup',
      title: '🤖 自動化ワークフロー設定',
      description: 'n8nワークフローで完全自動化を実現',
      component: AutomationSetupStep,
      completed: false,
      estimatedTime: '20分',
      difficulty: 'advanced',
      tips: [
        'ワークフローは24/7稼働し続けます',
        '複数のプラットフォームに同時投稿可能',
        'パフォーマンスに基づいて自動最適化'
      ],
      resources: [
        { title: 'n8n完全ガイド', url: '#', type: 'video' },
        { title: '自動化ベストプラクティス', url: '#', type: 'article' }
      ]
    },
    {
      id: 'youtube-integration',
      title: '🎥 YouTube統合強化',
      description: '動画投稿とクリエイター経済の活用',
      component: YouTubeIntegrationStep,
      completed: false,
      estimatedTime: '12分',
      difficulty: 'medium',
      tips: [
        'YouTube Shorts は最高の viral potential を持っています',
        'AI生成された動画スクリプトで engagement 最大化',
        '自動サムネイル生成でクリック率向上'
      ],
      resources: [
        { title: 'YouTube収益化戦略', url: '#', type: 'video' },
        { title: '動画SEO最適化', url: '#', type: 'article' }
      ]
    },
    {
      id: 'analytics-dashboard',
      title: '📈 リアルタイム分析ダッシュボード',
      description: 'パフォーマンス追跡と最適化',
      component: AnalyticsDashboardStep,
      completed: false,
      estimatedTime: '5分',
      difficulty: 'easy',
      tips: [
        'リアルタイム ROI トラッキング',
        '多点タッチアトリビューション分析',
        '予測分析による future performance insights'
      ],
      resources: [
        { title: 'データ分析基礎', url: '#', type: 'article' },
        { title: 'ROI最大化テクニック', url: '#', type: 'video' }
      ]
    },
    {
      id: 'optimization',
      title: '🎯 継続的最適化',
      description: 'AIによる自動最適化と収益向上',
      component: OptimizationStep,
      completed: false,
      estimatedTime: '10分',
      difficulty: 'medium',
      tips: [
        'AIが継続的にパフォーマンスを分析し改善提案',
        'A/Bテスト自動実行',
        '市場トレンドに基づく戦略調整'
      ],
      resources: [
        { title: 'パフォーマンス最適化', url: '#', type: 'video' },
        { title: 'AI活用戦略', url: '#', type: 'article' }
      ]
    }
  ];

  const currentStepData = steps[currentStep];
  const progressPercentage = (completedSteps.size / steps.length) * 100;

  const handleStepComplete = (stepId: string) => {
    setCompletedSteps(prev => new Set([...prev, stepId]));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '🟢';
      case 'medium': return '🟡';
      case 'advanced': return '🔴';
      default: return '⚪';
    }
  };

  return (
    <TooltipProvider>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
          <CardHeader>
            <CardTitle className="text-3xl font-bold flex items-center gap-2">
              <Target className="w-8 h-8" />
              Ultimate Referral Generation System
            </CardTitle>
            <CardDescription className="text-purple-100 text-lg">
              AIとオートメーションで最強の紹介プログラムを構築
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <Progress value={progressPercentage} className="flex-1" />
              <Badge variant="secondary">
                {completedSteps.size}/{steps.length} 完了
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-purple-100">
              <Zap className="w-4 h-4" />
              予想収益増加: +300-500% | 自動化率: 95% | ROI向上: +250%
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Step Navigation */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                ステップ一覧
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                    currentStep === index
                      ? 'bg-blue-100 border-2 border-blue-500'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                  onClick={() => setCurrentStep(index)}
                >
                  <div className="flex items-center gap-2">
                    {completedSteps.has(step.id) ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-400" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-sm">{step.title}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <span>{getDifficultyIcon(step.difficulty)}</span>
                        <span>{step.estimatedTime}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Main Content */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">{currentStepData.title}</CardTitle>
                  <CardDescription className="mt-1">
                    {currentStepData.description}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getDifficultyColor(currentStepData.difficulty)}>
                    {getDifficultyIcon(currentStepData.difficulty)} {currentStepData.difficulty}
                  </Badge>
                  <Badge variant="outline">{currentStepData.estimatedTime}</Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Tips Section */}
              {showTips && (
                <Alert>
                  <Lightbulb className="h-4 w-4" />
                  <AlertTitle>💡 プロのヒント</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      {currentStepData.tips.map((tip, index) => (
                        <li key={index} className="text-sm">{tip}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Step Component */}
              <div className="bg-gray-50 rounded-lg p-6">
                <currentStepData.component
                  onComplete={() => handleStepComplete(currentStepData.id)}
                  isCompleted={completedSteps.has(currentStepData.id)}
                />
              </div>

              {/* Resources */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  参考リソース
                </h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  {currentStepData.resources.map((resource, index) => (
                    <a
                      key={index}
                      href={resource.url}
                      className="flex items-center gap-2 p-3 bg-white rounded-lg border hover:border-blue-300 transition-colors"
                    >
                      {resource.type === 'video' && <PlayCircle className="w-4 h-4 text-red-500" />}
                      {resource.type === 'article' && <BookOpen className="w-4 h-4 text-blue-500" />}
                      <span className="text-sm font-medium">{resource.title}</span>
                    </a>
                  ))}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  前のステップ
                </Button>

                <div className="flex items-center gap-2">
                  {!completedSteps.has(currentStepData.id) && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          onClick={() => handleStepComplete(currentStepData.id)}
                          className="flex items-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          完了マーク
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>このステップを完了としてマークします</p>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  <Button
                    onClick={handleNext}
                    disabled={currentStep === steps.length - 1}
                    className="flex items-center gap-2"
                  >
                    次のステップ
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Success Message */}
        {completedSteps.size === steps.length && (
          <Card className="bg-gradient-to-r from-green-500 to-blue-500 text-white">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-4xl mb-4">🎉</div>
                <h2 className="text-2xl font-bold mb-2">おめでとうございます！</h2>
                <p className="text-lg mb-4">
                  Ultimate Referral Generation System のセットアップが完了しました！
                </p>
                <div className="flex justify-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    収益向上準備完了
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    紹介システム稼働
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    自動収益化開始
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
};

// Step Components
const WelcomeStep: React.FC<{ onComplete: () => void; isCompleted: boolean }> = ({
  onComplete,
  isCompleted
}) => (
  <div className="space-y-4">
    <h3 className="text-xl font-semibold">システム概要</h3>
    <div className="grid sm:grid-cols-2 gap-4">
      <div className="p-4 bg-white rounded-lg border">
        <h4 className="font-medium flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-yellow-500" />
          AI駆動コンテンツ生成
        </h4>
        <p className="text-sm text-gray-600">
          Google Gemini を活用した高コンバージョン紹介コンテンツの自動生成
        </p>
      </div>
      <div className="p-4 bg-white rounded-lg border">
        <h4 className="font-medium flex items-center gap-2 mb-2">
          <Target className="w-4 h-4 text-blue-500" />
          マルチプラットフォーム展開
        </h4>
        <p className="text-sm text-gray-600">
          TikTok、Instagram、YouTube、ブログへの同時自動投稿
        </p>
      </div>
    </div>
    {!isCompleted && (
      <Button onClick={onComplete} className="w-full">
        システムを理解しました！次へ進む
      </Button>
    )}
  </div>
);

const ApiSetupStep: React.FC<{ onComplete: () => void; isCompleted: boolean }> = ({
  onComplete,
  isCompleted
}) => (
  <div className="space-y-4">
    <h3 className="text-xl font-semibold">API設定チェックリスト</h3>
    <div className="space-y-3">
      {[
        'Google Gemini API キー',
        'n8n インスタンス URL',
        'A8.net API 認証情報',
        '楽天アフィリエイト API',
        'YouTube Data API v3',
        'Instagram Graph API'
      ].map((api, index) => (
        <div key={index} className="flex items-center gap-3 p-3 bg-white rounded border">
          <Circle className="w-4 h-4 text-gray-400" />
          <span className="flex-1">{api}</span>
          <Button size="sm" variant="outline">設定</Button>
        </div>
      ))}
    </div>
    {!isCompleted && (
      <Button onClick={onComplete} className="w-full">
        API設定完了
      </Button>
    )}
  </div>
);

const CampaignSetupStep: React.FC<{ onComplete: () => void; isCompleted: boolean }> = ({
  onComplete,
  isCompleted
}) => (
  <div className="space-y-4">
    <h3 className="text-xl font-semibold">紹介キャンペーン設計</h3>
    <div className="grid gap-4">
      <div className="p-4 bg-white rounded-lg border">
        <label className="block text-sm font-medium mb-2">キャンペーン目標</label>
        <select className="w-full p-2 border rounded">
          <option>月間紹介収益 100万円達成</option>
          <option>紹介者数 1000人突破</option>
          <option>コンバージョン率 15% 達成</option>
        </select>
      </div>
      <div className="p-4 bg-white rounded-lg border">
        <label className="block text-sm font-medium mb-2">ターゲットオーディエンス</label>
        <div className="grid grid-cols-2 gap-2">
          <select className="p-2 border rounded">
            <option>20-30代</option>
            <option>30-40代</option>
            <option>40代以上</option>
          </select>
          <select className="p-2 border rounded">
            <option>テック関心者</option>
            <option>ライフスタイル</option>
            <option>ビジネス層</option>
          </select>
        </div>
      </div>
    </div>
    {!isCompleted && (
      <Button onClick={onComplete} className="w-full">
        キャンペーン設定完了
      </Button>
    )}
  </div>
);

const ContentGenerationStep: React.FC<{ onComplete: () => void; isCompleted: boolean }> = ({
  onComplete,
  isCompleted
}) => (
  <div className="space-y-4">
    <h3 className="text-xl font-semibold">AIコンテンツ生成テスト</h3>
    <div className="p-4 bg-white rounded-lg border">
      <label className="block text-sm font-medium mb-2">テーマを選択</label>
      <select className="w-full p-2 border rounded mb-3">
        <option>スマートフォン MNP キャンペーン</option>
        <option>クレジットカード紹介</option>
        <option>オンライン学習プラットフォーム</option>
      </select>
      <Button variant="outline" className="w-full mb-3">
        AIコンテンツ生成実行
      </Button>
      <div className="p-3 bg-gray-50 rounded text-sm">
        <strong>生成例:</strong> 「🔥 今だけ特別！MNP で最大30,000円キャッシュバック！お友達紹介でさらに+5,000円！」
      </div>
    </div>
    {!isCompleted && (
      <Button onClick={onComplete} className="w-full">
        コンテンツ生成テスト完了
      </Button>
    )}
  </div>
);

const AutomationSetupStep: React.FC<{ onComplete: () => void; isCompleted: boolean }> = ({
  onComplete,
  isCompleted
}) => (
  <div className="space-y-4">
    <h3 className="text-xl font-semibold">n8n自動化ワークフロー</h3>
    <div className="space-y-3">
      {[
        '📝 コンテンツ生成ワークフロー',
        '📱 マルチプラットフォーム投稿',
        '📊 パフォーマンス追跡',
        '🔄 自動最適化ループ'
      ].map((workflow, index) => (
        <div key={index} className="flex items-center justify-between p-3 bg-white rounded border">
          <span>{workflow}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline">設定</Button>
            <Button size="sm" variant="outline">テスト</Button>
          </div>
        </div>
      ))}
    </div>
    {!isCompleted && (
      <Button onClick={onComplete} className="w-full">
        ワークフロー設定完了
      </Button>
    )}
  </div>
);

const YouTubeIntegrationStep: React.FC<{ onComplete: () => void; isCompleted: boolean }> = ({
  onComplete,
  isCompleted
}) => (
  <div className="space-y-4">
    <h3 className="text-xl font-semibold">YouTube統合強化</h3>
    <div className="grid gap-4">
      <div className="p-4 bg-white rounded-lg border">
        <h4 className="font-medium mb-2">🎬 動画コンテンツ戦略</h4>
        <ul className="text-sm space-y-1 text-gray-600">
          <li>• Shorts用縦型動画自動生成</li>
          <li>• AIサムネイル最適化</li>
          <li>• 紹介リンク自然挿入</li>
        </ul>
      </div>
      <div className="p-4 bg-white rounded-lg border">
        <h4 className="font-medium mb-2">📈 収益化設定</h4>
        <ul className="text-sm space-y-1 text-gray-600">
          <li>• YouTube Partner Program</li>
          <li>• アフィリエイトリンク統合</li>
          <li>• 視聴者誘導最適化</li>
        </ul>
      </div>
    </div>
    {!isCompleted && (
      <Button onClick={onComplete} className="w-full">
        YouTube統合完了
      </Button>
    )}
  </div>
);

const AnalyticsDashboardStep: React.FC<{ onComplete: () => void; isCompleted: boolean }> = ({
  onComplete,
  isCompleted
}) => (
  <div className="space-y-4">
    <h3 className="text-xl font-semibold">分析ダッシュボード設定</h3>
    <div className="grid sm:grid-cols-3 gap-4">
      <div className="p-4 bg-white rounded-lg border text-center">
        <div className="text-2xl font-bold text-green-600">¥0</div>
        <div className="text-sm text-gray-600">今日の紹介収益</div>
      </div>
      <div className="p-4 bg-white rounded-lg border text-center">
        <div className="text-2xl font-bold text-blue-600">0</div>
        <div className="text-sm text-gray-600">今日の紹介数</div>
      </div>
      <div className="p-4 bg-white rounded-lg border text-center">
        <div className="text-2xl font-bold text-purple-600">0%</div>
        <div className="text-sm text-gray-600">コンバージョン率</div>
      </div>
    </div>
    {!isCompleted && (
      <Button onClick={onComplete} className="w-full">
        ダッシュボード確認完了
      </Button>
    )}
  </div>
);

const OptimizationStep: React.FC<{ onComplete: () => void; isCompleted: boolean }> = ({
  onComplete,
  isCompleted
}) => (
  <div className="space-y-4">
    <h3 className="text-xl font-semibold">継続的最適化設定</h3>
    <div className="space-y-3">
      <div className="p-4 bg-white rounded-lg border">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium">🤖 AI自動最適化</span>
          <Badge className="bg-green-100 text-green-800">有効</Badge>
        </div>
        <p className="text-sm text-gray-600">
          パフォーマンスデータを基にコンテンツとタイミングを自動調整
        </p>
      </div>
      <div className="p-4 bg-white rounded-lg border">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium">📊 A/Bテスト自動実行</span>
          <Badge className="bg-green-100 text-green-800">有効</Badge>
        </div>
        <p className="text-sm text-gray-600">
          複数のコンテンツバリエーションを同時テストして最適解を発見
        </p>
      </div>
    </div>
    {!isCompleted && (
      <Button onClick={onComplete} className="w-full">
        最適化設定完了
      </Button>
    )}
  </div>
);

export default ReferralOnboardingGuide;