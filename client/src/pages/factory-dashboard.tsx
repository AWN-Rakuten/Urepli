import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  Factory, 
  BookOpen, 
  Video, 
  Globe,
  BarChart3,
  Settings,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';

interface Site {
  id: string;
  domain: string;
  niche: string;
  status: 'active' | 'building' | 'error';
  articles: number;
  videos: number;
  revenue: number;
}

interface BlogDraft {
  id: string;
  title: string;
  niche: string;
  status: 'draft' | 'ready' | 'published';
  wordCount: number;
  seoScore: number;
  createdAt: string;
}

interface VideoQueue {
  id: string;
  script: string;
  status: 'pending' | 'processing' | 'ready' | 'published';
  duration: number;
  platform: string;
}

export function FactoryDashboard() {
  const [sites, setSites] = useState<Site[]>([]);
  const [blogDrafts, setBlogDrafts] = useState<BlogDraft[]>([]);
  const [videoQueue, setVideoQueue] = useState<VideoQueue[]>([]);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [loading, setLoading] = useState(false);

  // Mock data for demonstration
  useEffect(() => {
    setSites([
      {
        id: '1',
        domain: 'beauty-trends.jp',
        niche: '美容',
        status: 'active',
        articles: 47,
        videos: 23,
        revenue: 186500
      },
      {
        id: '2', 
        domain: 'tech-reviews.jp',
        niche: 'テクノロジー',
        status: 'building',
        articles: 12,
        videos: 8,
        revenue: 45200
      }
    ]);

    setBlogDrafts([
      {
        id: '1',
        title: '2024年最新美容液おすすめランキング',
        niche: '美容',
        status: 'ready',
        wordCount: 2300,
        seoScore: 92,
        createdAt: '2024-01-15T10:30:00Z'
      },
      {
        id: '2',
        title: 'iPhone 15 Pro Max 完全レビュー',
        niche: 'テクノロジー',
        status: 'draft',
        wordCount: 1850,
        seoScore: 78,
        createdAt: '2024-01-15T09:15:00Z'
      }
    ]);

    setVideoQueue([
      {
        id: '1',
        script: '今話題の美容液を試してみました！驚きの効果とは...',
        status: 'processing',
        duration: 30,
        platform: 'TikTok'
      },
      {
        id: '2',
        script: 'iPhone 15の隠れた便利機能5選',
        status: 'ready',
        duration: 45,
        platform: 'YouTube Shorts'
      }
    ]);
  }, []);

  const handleCreateSite = async () => {
    setLoading(true);
    try {
      // Mock site creation
      setTimeout(() => {
        const newSite: Site = {
          id: Date.now().toString(),
          domain: 'new-niche-site.jp',
          niche: 'ライフスタイル',
          status: 'building',
          articles: 0,
          videos: 0,
          revenue: 0
        };
        setSites(prev => [...prev, newSite]);
        setLoading(false);
      }, 2000);
    } catch (error) {
      setLoading(false);
    }
  };

  const handleGenerateBlog = async () => {
    setLoading(true);
    try {
      // Mock blog generation
      setTimeout(() => {
        const newBlog: BlogDraft = {
          id: Date.now().toString(),
          title: 'AI生成：最新トレンド解析記事',
          niche: 'AI・テクノロジー',
          status: 'draft',
          wordCount: 2100,
          seoScore: 85,
          createdAt: new Date().toISOString()
        };
        setBlogDrafts(prev => [...prev, newBlog]);
        setLoading(false);
      }, 3000);
    } catch (error) {
      setLoading(false);
    }
  };

  const handleGenerateVideo = async () => {
    setLoading(true);
    try {
      // Mock video generation
      setTimeout(() => {
        const newVideo: VideoQueue = {
          id: Date.now().toString(),
          script: 'AI生成：トレンド解説動画スクリプト',
          status: 'pending',
          duration: 60,
          platform: 'YouTube Shorts'
        };
        setVideoQueue(prev => [...prev, newVideo]);
        setLoading(false);
      }, 4000);
    } catch (error) {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'ready':
      case 'published':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing':
      case 'building':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'draft':
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'ready':
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'processing':
      case 'building':
        return 'bg-yellow-100 text-yellow-800';
      case 'draft':
      case 'pending':
        return 'bg-orange-100 text-orange-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Factory className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">Video + Blog Factory</h1>
            <p className="text-gray-600">完全自動コンテンツ生成システム</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant={isAutoMode ? "default" : "secondary"} className="px-3 py-1">
            {isAutoMode ? '自動運転中' : '手動モード'}
          </Badge>
          <Button
            onClick={() => setIsAutoMode(!isAutoMode)}
            variant={isAutoMode ? "destructive" : "default"}
            className="flex items-center gap-2"
          >
            {isAutoMode ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isAutoMode ? '一時停止' : '自動開始'}
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">運営サイト数</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sites.length}</div>
            <p className="text-xs text-muted-foreground">+1 今月新規</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">記事数</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sites.reduce((sum, site) => sum + site.articles, 0)}
            </div>
            <p className="text-xs text-muted-foreground">+12 今週新規</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">動画数</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sites.reduce((sum, site) => sum + site.videos, 0)}
            </div>
            <p className="text-xs text-muted-foreground">+8 今週新規</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">収益</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ¥{sites.reduce((sum, site) => sum + site.revenue, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">+18% 前月比</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="sites" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="sites">サイト管理</TabsTrigger>
          <TabsTrigger value="blogs">ブログ記事</TabsTrigger>
          <TabsTrigger value="videos">動画生成</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="sites" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">運営サイト</h2>
            <Button onClick={handleCreateSite} disabled={loading}>
              {loading ? '作成中...' : '新サイト作成'}
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sites.map((site) => (
              <Card key={site.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{site.domain}</CardTitle>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(site.status)}
                      <Badge className={getStatusColor(site.status)}>
                        {site.status === 'active' ? '運営中' : 
                         site.status === 'building' ? '構築中' : 'エラー'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>ニッチ:</span>
                    <span className="font-medium">{site.niche}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>記事数:</span>
                    <span className="font-medium">{site.articles}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>動画数:</span>
                    <span className="font-medium">{site.videos}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>収益:</span>
                    <span className="font-medium text-green-600">
                      ¥{site.revenue.toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="blogs" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">ブログ記事</h2>
            <Button onClick={handleGenerateBlog} disabled={loading}>
              {loading ? '生成中...' : 'AI記事生成'}
            </Button>
          </div>
          
          <div className="space-y-3">
            {blogDrafts.map((blog) => (
              <Card key={blog.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{blog.title}</h3>
                        <Badge className={getStatusColor(blog.status)}>
                          {blog.status === 'ready' ? '公開準備完了' :
                           blog.status === 'draft' ? '下書き' : '公開済み'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>ニッチ: {blog.niche}</span>
                        <span>文字数: {blog.wordCount.toLocaleString()}</span>
                        <span>SEOスコア: {blog.seoScore}/100</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={blog.seoScore} className="w-20" />
                      <Button size="sm" variant="outline">編集</Button>
                      <Button size="sm">公開</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="videos" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">動画生成キュー</h2>
            <Button onClick={handleGenerateVideo} disabled={loading}>
              {loading ? '生成中...' : 'AI動画生成'}
            </Button>
          </div>
          
          <div className="space-y-3">
            {videoQueue.map((video) => (
              <Card key={video.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Video className="w-4 h-4" />
                        <span className="font-medium">{video.script.slice(0, 50)}...</span>
                        <Badge className={getStatusColor(video.status)}>
                          {video.status === 'ready' ? '完了' :
                           video.status === 'processing' ? '処理中' :
                           video.status === 'pending' ? '待機中' : '公開済み'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>長さ: {video.duration}秒</span>
                        <span>プラットフォーム: {video.platform}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(video.status)}
                      <Button size="sm" variant="outline">プレビュー</Button>
                      <Button size="sm">投稿</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <h2 className="text-xl font-semibold">パフォーマンス分析</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>月間パフォーマンス</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>記事公開数:</span>
                    <span className="font-semibold">28記事</span>
                  </div>
                  <div className="flex justify-between">
                    <span>動画公開数:</span>
                    <span className="font-semibold">15動画</span>
                  </div>
                  <div className="flex justify-between">
                    <span>平均CTR:</span>
                    <span className="font-semibold text-green-600">3.2%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>コンバージョン率:</span>
                    <span className="font-semibold text-green-600">2.8%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>AI最適化状況</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>SEO最適化:</span>
                      <span>92%</span>
                    </div>
                    <Progress value={92} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>内部リンク:</span>
                      <span>87%</span>
                    </div>
                    <Progress value={87} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>コンプライアンス:</span>
                      <span>100%</span>
                    </div>
                    <Progress value={100} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <h2 className="text-xl font-semibold">システム設定</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>自動生成設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="dailyArticles">1日の記事生成数</Label>
                  <Input id="dailyArticles" type="number" defaultValue="3" />
                </div>
                <div>
                  <Label htmlFor="dailyVideos">1日の動画生成数</Label>
                  <Input id="dailyVideos" type="number" defaultValue="2" />
                </div>
                <div>
                  <Label htmlFor="autoPublish">自動公開</Label>
                  <Select defaultValue="manual">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">自動公開</SelectItem>
                      <SelectItem value="manual">手動承認</SelectItem>
                      <SelectItem value="scheduled">スケジュール公開</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>品質設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="minSeoScore">最小SEOスコア</Label>
                  <Input id="minSeoScore" type="number" defaultValue="80" />
                </div>
                <div>
                  <Label htmlFor="minWordCount">最小文字数</Label>
                  <Input id="minWordCount" type="number" defaultValue="1500" />
                </div>
                <div>
                  <Label htmlFor="complianceCheck">コンプライアンスチェック</Label>
                  <Select defaultValue="strict">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="strict">厳格</SelectItem>
                      <SelectItem value="normal">標準</SelectItem>
                      <SelectItem value="relaxed">緩和</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}