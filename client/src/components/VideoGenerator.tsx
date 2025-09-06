import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Brain, Video, Zap, Target, TrendingUp, Clock, DollarSign } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface VideoRequest {
  topic: string;
  platform: 'tiktok' | 'instagram';
  style: 'kawaii' | 'tech' | 'lifestyle' | 'business';
  duration: number;
  targetAudience: string;
  callToAction?: string;
  keywords?: string[];
}

interface VideoThinking {
  contentAnalysis: {
    topicRelevance: number;
    viralPotential: number;
    audienceAlignment: number;
    competitorAnalysis: string[];
    trendAlignment: string[];
  };
  strategicDecisions: {
    hookStrategy: string;
    emotionalTriggers: string[];
    visualStyle: string;
    musicMood: string;
    timingStrategy: string;
  };
  optimizationRecommendations: {
    titleSuggestions: string[];
    hashtagStrategy: string[];
    postingTime: string;
    expectedPerformance: {
      views: number;
      engagement: number;
      conversionRate: number;
    };
  };
  budgetAllocation: {
    organicPotential: number;
    recommendedAdSpend: number;
    expectedROAS: number;
    platformAllocation: {
      tiktok: number;
      instagram: number;
    };
  };
}

interface VideoPlan {
  thinking: VideoThinking;
  script: {
    hook: string;
    mainContent: string;
    callToAction: string;
    voiceover: string;
  };
  visual: {
    scenes: Array<{
      timestamp: string;
      description: string;
      visualElements: string[];
      textOverlay?: string;
    }>;
    style: string;
    colorPalette: string[];
    animations: string[];
  };
  audio: {
    musicGenre: string;
    voiceStyle: string;
    soundEffects: string[];
  };
  metadata: {
    title: string;
    description: string;
    hashtags: string[];
    thumbnail: string;
  };
}

export function VideoGenerator() {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<'configure' | 'thinking' | 'generating' | 'complete'>('configure');
  const [videoPlan, setVideoPlan] = useState<VideoPlan | null>(null);
  const [videoRequest, setVideoRequest] = useState<VideoRequest>({
    topic: '',
    platform: 'tiktok',
    style: 'kawaii',
    duration: 15,
    targetAudience: '',
    callToAction: '',
    keywords: []
  });

  // Fetch video providers
  const { data: providers = {} } = useQuery({
    queryKey: ['/api/video/providers']
  });

  // Generate video plan with thinking
  const generatePlanMutation = useMutation({
    mutationFn: async (request: VideoRequest) => {
      const response = await fetch('/api/video/generate-with-thinking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Video planning failed');
      }
      
      return response.json();
    },
    onSuccess: (plan: VideoPlan) => {
      setVideoPlan(plan);
      setCurrentStep('thinking');
      toast({
        title: "AI Analysis Complete",
        description: "Strategic video plan generated with performance predictions.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Planning Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Create video from plan
  const createVideoMutation = useMutation({
    mutationFn: async (data: { plan: VideoPlan; provider: string }) => {
      const response = await fetch('/api/video/create-from-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Video creation failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setCurrentStep('complete');
      toast({
        title: "Video Created",
        description: "Your video has been generated successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Video Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleGeneratePlan = () => {
    if (!videoRequest.topic || !videoRequest.targetAudience) {
      toast({
        title: "Missing Information",
        description: "Please provide topic and target audience.",
        variant: "destructive",
      });
      return;
    }

    generatePlanMutation.mutate(videoRequest);
  };

  const handleCreateVideo = (provider: string) => {
    if (!videoPlan) return;
    
    setCurrentStep('generating');
    createVideoMutation.mutate({ plan: videoPlan, provider });
  };

  const formatNumber = (num: number) => num.toLocaleString();
  const formatPercentage = (num: number) => `${(num * 100).toFixed(1)}%`;
  const formatCurrency = (num: number) => `¥${num.toLocaleString()}`;

  return (
    <div className="space-y-6" data-testid="video-generator">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight" data-testid="title-video-generator">AI Video Generator</h2>
          <p className="text-muted-foreground">
            Create strategic video content with AI-powered thinking and optimization
          </p>
        </div>
        <Badge variant="secondary" className="ml-auto" data-testid="badge-ai-powered">
          <Brain className="mr-1 h-3 w-3" />
          AI-Powered
        </Badge>
      </div>

      {/* Progress Indicator */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Progress</span>
          <span>
            {currentStep === 'configure' && '1/4'}
            {currentStep === 'thinking' && '2/4'}
            {currentStep === 'generating' && '3/4'}
            {currentStep === 'complete' && '4/4'}
          </span>
        </div>
        <Progress 
          value={
            currentStep === 'configure' ? 25 :
            currentStep === 'thinking' ? 50 :
            currentStep === 'generating' ? 75 : 100
          } 
          className="h-2"
          data-testid="progress-video-generation"
        />
      </div>

      {/* Step 1: Configuration */}
      {currentStep === 'configure' && (
        <Card data-testid="card-video-configuration">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Video Configuration
            </CardTitle>
            <CardDescription>
              Define your video content strategy and target audience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="topic">Topic / Theme</Label>
                <Input
                  id="topic"
                  value={videoRequest.topic}
                  onChange={(e) => setVideoRequest(prev => ({ ...prev, topic: e.target.value }))}
                  placeholder="e.g., MNP乗り換えキャンペーン"
                  data-testid="input-video-topic"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="target-audience">Target Audience</Label>
                <Input
                  id="target-audience"
                  value={videoRequest.targetAudience}
                  onChange={(e) => setVideoRequest(prev => ({ ...prev, targetAudience: e.target.value }))}
                  placeholder="e.g., 20-30代 携帯料金に悩む会社員"
                  data-testid="input-target-audience"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="platform">Platform</Label>
                <Select value={videoRequest.platform} onValueChange={(value: 'tiktok' | 'instagram') => setVideoRequest(prev => ({ ...prev, platform: value }))}>
                  <SelectTrigger data-testid="select-platform">
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="instagram">Instagram Reels</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="style">Visual Style</Label>
                <Select value={videoRequest.style} onValueChange={(value: any) => setVideoRequest(prev => ({ ...prev, style: value }))}>
                  <SelectTrigger data-testid="select-style">
                    <SelectValue placeholder="Select style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kawaii">Kawaii (Cute)</SelectItem>
                    <SelectItem value="tech">Tech/Modern</SelectItem>
                    <SelectItem value="lifestyle">Lifestyle</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="keywords">Keywords (comma-separated)</Label>
              <Textarea
                id="keywords"
                value={videoRequest.keywords?.join(', ') || ''}
                onChange={(e) => setVideoRequest(prev => ({ 
                  ...prev, 
                  keywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean)
                }))}
                placeholder="MNP, 携帯乗り換え, キャッシュバック, お得"
                data-testid="textarea-keywords"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cta">Call to Action</Label>
              <Input
                id="cta"
                value={videoRequest.callToAction || ''}
                onChange={(e) => setVideoRequest(prev => ({ ...prev, callToAction: e.target.value }))}
                placeholder="今すぐMNP相談！"
                data-testid="input-cta"
              />
            </div>

            <Button 
              onClick={handleGeneratePlan} 
              disabled={generatePlanMutation.isPending}
              className="w-full"
              data-testid="button-generate-plan"
            >
              {generatePlanMutation.isPending ? (
                <>
                  <Brain className="mr-2 h-4 w-4 animate-spin" />
                  AI Analyzing...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  Generate AI Strategy
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: AI Thinking Results */}
      {currentStep === 'thinking' && videoPlan && (
        <div className="space-y-6">
          <Card data-testid="card-ai-analysis">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI Strategic Analysis
              </CardTitle>
              <CardDescription>
                Deep analysis and strategic recommendations for your video content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="analysis" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="analysis" data-testid="tab-analysis">Analysis</TabsTrigger>
                  <TabsTrigger value="strategy" data-testid="tab-strategy">Strategy</TabsTrigger>
                  <TabsTrigger value="optimization" data-testid="tab-optimization">Optimization</TabsTrigger>
                  <TabsTrigger value="budget" data-testid="tab-budget">Budget</TabsTrigger>
                </TabsList>

                <TabsContent value="analysis" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-green-600" data-testid="text-topic-relevance">
                        {videoPlan.thinking.contentAnalysis.topicRelevance}%
                      </div>
                      <div className="text-sm text-muted-foreground">Topic Relevance</div>
                    </div>
                    
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-blue-600" data-testid="text-viral-potential">
                        {videoPlan.thinking.contentAnalysis.viralPotential}%
                      </div>
                      <div className="text-sm text-muted-foreground">Viral Potential</div>
                    </div>
                    
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-purple-600" data-testid="text-audience-alignment">
                        {videoPlan.thinking.contentAnalysis.audienceAlignment}%
                      </div>
                      <div className="text-sm text-muted-foreground">Audience Alignment</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Trend Alignment</Label>
                    <div className="flex flex-wrap gap-2">
                      {videoPlan.thinking.contentAnalysis.trendAlignment.map((trend, index) => (
                        <Badge key={index} variant="outline" data-testid={`badge-trend-${index}`}>
                          {trend}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="strategy" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <Label>Hook Strategy</Label>
                      <p className="text-sm bg-muted p-3 rounded" data-testid="text-hook-strategy">
                        {videoPlan.thinking.strategicDecisions.hookStrategy}
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <Label>Visual Style</Label>
                      <p className="text-sm bg-muted p-3 rounded" data-testid="text-visual-style">
                        {videoPlan.thinking.strategicDecisions.visualStyle}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Emotional Triggers</Label>
                    <div className="flex flex-wrap gap-2">
                      {videoPlan.thinking.strategicDecisions.emotionalTriggers.map((trigger, index) => (
                        <Badge key={index} variant="default" data-testid={`badge-trigger-${index}`}>
                          {trigger}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="optimization" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <Label>Title Suggestions</Label>
                      <div className="space-y-2">
                        {videoPlan.thinking.optimizationRecommendations.titleSuggestions.map((title, index) => (
                          <div key={index} className="text-sm bg-muted p-2 rounded" data-testid={`text-title-${index}`}>
                            {title}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <Label>Performance Predictions</Label>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Expected Views:</span>
                          <span className="font-medium" data-testid="text-expected-views">
                            {formatNumber(videoPlan.thinking.optimizationRecommendations.expectedPerformance.views)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Engagement Rate:</span>
                          <span className="font-medium" data-testid="text-expected-engagement">
                            {formatPercentage(videoPlan.thinking.optimizationRecommendations.expectedPerformance.engagement)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Conversion Rate:</span>
                          <span className="font-medium" data-testid="text-expected-conversion">
                            {formatPercentage(videoPlan.thinking.optimizationRecommendations.expectedPerformance.conversionRate)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Hashtag Strategy</Label>
                    <div className="flex flex-wrap gap-2">
                      {videoPlan.thinking.optimizationRecommendations.hashtagStrategy.slice(0, 10).map((hashtag, index) => (
                        <Badge key={index} variant="secondary" data-testid={`badge-hashtag-${index}`}>
                          #{hashtag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="budget" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <Label>Budget Recommendations</Label>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Organic Potential:</span>
                          <span className="font-medium" data-testid="text-organic-potential">
                            {videoPlan.thinking.budgetAllocation.organicPotential}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Recommended Ad Spend:</span>
                          <span className="font-medium" data-testid="text-recommended-spend">
                            {formatCurrency(videoPlan.thinking.budgetAllocation.recommendedAdSpend)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Expected ROAS:</span>
                          <span className="font-medium" data-testid="text-expected-roas">
                            {videoPlan.thinking.budgetAllocation.expectedROAS}x
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <Label>Platform Allocation</Label>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>TikTok:</span>
                          <span className="font-medium" data-testid="text-tiktok-allocation">
                            {videoPlan.thinking.budgetAllocation.platformAllocation.tiktok}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Instagram:</span>
                          <span className="font-medium" data-testid="text-instagram-allocation">
                            {videoPlan.thinking.budgetAllocation.platformAllocation.instagram}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Video Generation Options */}
          <Card data-testid="card-video-generation">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Generate Video
              </CardTitle>
              <CardDescription>
                Choose a video generation provider to create your content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {providers.mochi?.available && (
                  <Button 
                    onClick={() => handleCreateVideo('mochi')}
                    variant="outline"
                    className="h-20 flex-col"
                    data-testid="button-create-mochi"
                  >
                    <div className="font-medium">Mochi 1</div>
                    <div className="text-sm text-muted-foreground">Fast & Cost-effective</div>
                    <div className="text-xs">¥29/video</div>
                  </Button>
                )}
                
                {providers.luma?.available && (
                  <Button 
                    onClick={() => handleCreateVideo('luma')}
                    variant="outline"
                    className="h-20 flex-col"
                    data-testid="button-create-luma"
                  >
                    <div className="font-medium">Luma Dream</div>
                    <div className="text-sm text-muted-foreground">High Quality</div>
                    <div className="text-xs">¥150/video</div>
                  </Button>
                )}
              </div>
              
              {(!providers.mochi?.available && !providers.luma?.available) && (
                <Alert>
                  <AlertDescription>
                    No video generation providers are currently available. Please configure API keys for Mochi or Luma.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Generating */}
      {currentStep === 'generating' && (
        <Card data-testid="card-generating">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 animate-pulse" />
              Generating Video
            </CardTitle>
            <CardDescription>
              AI is creating your video content based on the strategic plan
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-8">
            <div className="space-y-4">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
              <div className="text-lg font-medium">Creating your video...</div>
              <div className="text-sm text-muted-foreground">
                This may take 1-3 minutes depending on the provider
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Complete */}
      {currentStep === 'complete' && (
        <Card data-testid="card-complete">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Video Generation Complete
            </CardTitle>
            <CardDescription>
              Your video has been generated and is ready for review
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-8">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
                <Video className="h-8 w-8 text-green-600" />
              </div>
              <div className="text-lg font-medium">Video successfully created!</div>
              <div className="text-sm text-muted-foreground">
                Check the Content Library to review and publish your video
              </div>
              <Button onClick={() => setCurrentStep('configure')} data-testid="button-create-another">
                Create Another Video
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}