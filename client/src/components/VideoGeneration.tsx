import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Play, DollarSign, Clock, Monitor, Zap, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VideoGeneration {
  id: string;
  provider: string;
  prompt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
  cost: number;
  duration?: number;
  resolution?: string;
  createdAt: string;
  completedAt?: string;
  metadata?: any;
}

interface ProviderInfo {
  name: string;
  cost_per_video: number;
  max_duration: number;
  resolution: string;
  features: string[];
  available: boolean;
  estimatedTime?: string;
}

interface CostAnalysis {
  cheapest: {
    provider: string;
    cost: number;
    savings_vs_most_expensive: number;
  };
  monthly_estimate: {
    videos_per_day: number;
    monthly_videos: number;
    mochi_monthly_cost: number;
    luma_monthly_cost: number;
    savings_with_mochi: number;
  };
  break_even_analysis: {
    revenue_per_video_needed: number;
    affiliate_commission_rate: number;
    min_sale_value_needed: number;
  };
}

export function VideoGeneration() {
  const [prompt, setPrompt] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('auto');
  const [aspectRatio, setAspectRatio] = useState<string>('16:9');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch provider information and cost analysis
  const { data: providerData } = useQuery({
    queryKey: ['/api/video/providers'],
    refetchInterval: 30000
  });

  // Fetch recent video generations
  const { data: generations } = useQuery({
    queryKey: ['/api/video/generations'],
    refetchInterval: 5000 // Refresh every 5 seconds to track progress
  });

  const generateVideoMutation = useMutation({
    mutationFn: async (videoRequest: any) => {
      const response = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(videoRequest)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to generate video');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Video Generation Started',
        description: 'Your video is being generated. Check the status below.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/video/generations'] });
      setPrompt('');
      setIsGenerating(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Generation Failed',
        description: error.message,
        variant: 'destructive',
      });
      setIsGenerating(false);
    }
  });

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast({
        title: 'Prompt Required',
        description: 'Please enter a video prompt.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    generateVideoMutation.mutate({
      prompt: prompt.trim(),
      provider: selectedProvider,
      aspect_ratio: aspectRatio
    });
  };

  const providers = providerData?.providers || {};
  const costAnalysis: CostAnalysis = providerData?.costAnalysis || {};

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'processing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Video Generation</h2>
          <p className="text-muted-foreground">
            Generate high-quality videos using AI with cost-effective API providers
          </p>
        </div>
      </div>

      {/* Cost Analysis Cards */}
      {costAnalysis.cheapest && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cheapest Provider</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${costAnalysis.cheapest.cost.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                {costAnalysis.cheapest.provider} • Save ${costAnalysis.cheapest.savings_vs_most_expensive.toFixed(2)}/video
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Estimate</CardTitle>
              <Monitor className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${costAnalysis.monthly_estimate.mochi_monthly_cost.toFixed(0)}</div>
              <p className="text-xs text-muted-foreground">
                {costAnalysis.monthly_estimate.monthly_videos} videos/month with Mochi
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Break-even Sales</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${costAnalysis.break_even_analysis.min_sale_value_needed.toFixed(0)}</div>
              <p className="text-xs text-muted-foreground">
                Minimum sale value needed per video
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Video Generation Form */}
      <Card>
        <CardHeader>
          <CardTitle>Generate New Video</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">Video Prompt</Label>
            <Textarea
              id="prompt"
              placeholder="Describe the video you want to generate (e.g., 'A majestic eagle soaring through mountain peaks at golden hour with smooth camera movement')"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px]"
              data-testid="input-video-prompt"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger data-testid="select-provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(providers).map(([key, provider]: [string, any]) => (
                    <SelectItem key={key} value={key}>
                      {provider.name} - ${provider.cost_per_video.toFixed(2)}/video
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="aspect-ratio">Aspect Ratio</Label>
              <Select value={aspectRatio} onValueChange={setAspectRatio}>
                <SelectTrigger data-testid="select-aspect-ratio">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                  <SelectItem value="1:1">1:1 (Square)</SelectItem>
                  <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating || !prompt.trim()}
            className="w-full"
            data-testid="button-generate-video"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Generate Video
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Provider Information */}
      <Card>
        <CardHeader>
          <CardTitle>Available Providers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(providers).map(([key, provider]: [string, any]) => (
              <div
                key={key}
                className={`p-4 border rounded-lg ${
                  provider.available 
                    ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950' 
                    : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{provider.name}</h4>
                  <Badge variant={provider.available ? 'default' : 'destructive'}>
                    {provider.available ? 'Available' : 'Unavailable'}
                  </Badge>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div>${provider.cost_per_video.toFixed(2)}/video</div>
                  <div>{provider.resolution} • {provider.max_duration}s max</div>
                  <div>{provider.estimatedTime}</div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {provider.features.slice(0, 2).map((feature: string) => (
                    <Badge key={feature} variant="secondary" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Generations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Video Generations</CardTitle>
        </CardHeader>
        <CardContent>
          {generations && generations.length > 0 ? (
            <div className="space-y-4">
              {(generations as VideoGeneration[]).slice(0, 10).map((generation) => (
                <div
                  key={generation.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                  data-testid={`generation-${generation.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(generation.status)}
                      <span className="font-medium">{generation.provider.toUpperCase()}</span>
                      <Badge className={getStatusColor(generation.status)}>
                        {generation.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {generation.prompt.length > 100 
                        ? `${generation.prompt.substring(0, 100)}...` 
                        : generation.prompt}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>${generation.cost.toFixed(2)}</span>
                      {generation.resolution && <span>{generation.resolution}</span>}
                      {generation.duration && <span>{generation.duration}s</span>}
                      <span>{new Date(generation.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  {generation.status === 'completed' && generation.videoUrl && (
                    <Button
                      size="sm"
                      onClick={() => window.open(generation.videoUrl, '_blank')}
                      data-testid={`button-view-video-${generation.id}`}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      View Video
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Play className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No video generations yet. Create your first video above!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}