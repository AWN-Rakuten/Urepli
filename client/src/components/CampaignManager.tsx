import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Play, Pause, Settings, BarChart3, Zap, Target, DollarSign } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface CampaignConfig {
  name: string;
  objective: string;
  budget: number;
  bidStrategy: string;
  targetAudience: {
    age_min?: number;
    age_max?: number;
    genders?: number[];
    geo_locations?: {
      countries?: string[];
      cities?: string[];
    };
    interests?: string[];
    behaviors?: string[];
  };
  placements: string[];
  schedule?: {
    start_time: string;
    end_time?: string;
  };
}

interface Campaign {
  campaign_id: string;
  adset_id?: string;
  ad_id?: string;
  platform: 'meta' | 'tiktok';
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  cpm: number;
  cpc: number;
  ctr: number;
  roas: number;
  created_time: string;
}

export function CampaignManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlatform, setSelectedPlatform] = useState<'meta' | 'tiktok'>('meta');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [campaignConfig, setCampaignConfig] = useState<CampaignConfig>({
    name: '',
    objective: 'CONVERSIONS',
    budget: 50,
    bidStrategy: 'LOWEST_COST_WITHOUT_CAP',
    targetAudience: {
      age_min: 18,
      age_max: 65,
      genders: [1, 2],
      geo_locations: { countries: ['JP'] },
      interests: [],
      behaviors: []
    },
    placements: ['instagram_feed', 'instagram_stories'],
    schedule: {
      start_time: new Date().toISOString()
    }
  });

  // Fetch active campaigns
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['/api/campaigns/active'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch campaign providers
  const { data: providers = {} } = useQuery({
    queryKey: ['/api/campaigns/providers']
  });

  // Create campaign mutation
  const createCampaignMutation = useMutation({
    mutationFn: async (data: { platform: string; config: CampaignConfig; videoUrl: string }) => {
      const response = await fetch('/api/campaigns/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Campaign creation failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Campaign Created",
        description: "Your campaign has been successfully created and is now active.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns/active'] });
      setShowCreateForm(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Campaign Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Pause campaign mutation
  const pauseCampaignMutation = useMutation({
    mutationFn: async (data: { id: string; platform: string }) => {
      const response = await fetch(`/api/campaigns/${data.id}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: data.platform })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Campaign pause failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Campaign Paused",
        description: "Campaign has been paused successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns/active'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Pause Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleCreateCampaign = () => {
    if (!campaignConfig.name || campaignConfig.budget <= 0) {
      toast({
        title: "Invalid Configuration",
        description: "Please provide a campaign name and budget greater than 0.",
        variant: "destructive",
      });
      return;
    }

    createCampaignMutation.mutate({
      platform: selectedPlatform,
      config: campaignConfig,
      videoUrl: 'https://example.com/video.mp4' // This would come from video generation
    });
  };

  const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`;
  const formatPercentage = (value: number) => `${(value * 100).toFixed(2)}%`;

  const totalSpend = campaigns.reduce((sum: number, campaign: Campaign) => sum + campaign.spend, 0);
  const totalROAS = campaigns.length > 0 
    ? campaigns.reduce((sum: number, campaign: Campaign) => sum + campaign.roas, 0) / campaigns.length
    : 0;

  return (
    <div className="space-y-6" data-testid="campaign-manager">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight" data-testid="title-campaign-manager">Campaign Management</h2>
          <p className="text-muted-foreground">
            Create and manage ad campaigns across Meta and TikTok platforms
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          data-testid="button-create-campaign"
        >
          <Play className="mr-2 h-4 w-4" />
          Create Campaign
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-total-campaigns">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-campaigns">{campaigns.length}</div>
            <p className="text-xs text-muted-foreground">
              Active across all platforms
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-spend">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-spend">{formatCurrency(totalSpend)}</div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-average-roas">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average ROAS</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-average-roas">{totalROAS.toFixed(2)}x</div>
            <p className="text-xs text-muted-foreground">
              Return on ad spend
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-api-status">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Status</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              <Badge variant={providers.meta?.available ? "default" : "secondary"} data-testid="badge-meta-status">
                Meta {providers.meta?.available ? "✓" : "✗"}
              </Badge>
              <Badge variant={providers.tiktok?.available ? "default" : "secondary"} data-testid="badge-tiktok-status">
                TikTok {providers.tiktok?.available ? "✓" : "✗"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Platform connections
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Create Campaign Form */}
      {showCreateForm && (
        <Card data-testid="card-create-campaign">
          <CardHeader>
            <CardTitle>Create New Campaign</CardTitle>
            <CardDescription>
              Configure a new ad campaign with advanced targeting and optimization settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs value={selectedPlatform} onValueChange={(value) => setSelectedPlatform(value as 'meta' | 'tiktok')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="meta" data-testid="tab-meta-platform">Meta (FB/IG)</TabsTrigger>
                <TabsTrigger value="tiktok" data-testid="tab-tiktok-platform">TikTok</TabsTrigger>
              </TabsList>

              <TabsContent value="meta" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="campaign-name">Campaign Name</Label>
                    <Input
                      id="campaign-name"
                      value={campaignConfig.name}
                      onChange={(e) => setCampaignConfig(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter campaign name"
                      data-testid="input-campaign-name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="budget">Daily Budget (¥)</Label>
                    <Input
                      id="budget"
                      type="number"
                      value={campaignConfig.budget}
                      onChange={(e) => setCampaignConfig(prev => ({ ...prev, budget: Number(e.target.value) }))}
                      placeholder="50"
                      data-testid="input-budget"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="objective">Campaign Objective</Label>
                    <Select value={campaignConfig.objective} onValueChange={(value) => setCampaignConfig(prev => ({ ...prev, objective: value }))}>
                      <SelectTrigger data-testid="select-objective">
                        <SelectValue placeholder="Select objective" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CONVERSIONS">Conversions</SelectItem>
                        <SelectItem value="TRAFFIC">Traffic</SelectItem>
                        <SelectItem value="REACH">Reach</SelectItem>
                        <SelectItem value="VIDEO_VIEWS">Video Views</SelectItem>
                        <SelectItem value="BRAND_AWARENESS">Brand Awareness</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bid-strategy">Bid Strategy</Label>
                    <Select value={campaignConfig.bidStrategy} onValueChange={(value) => setCampaignConfig(prev => ({ ...prev, bidStrategy: value }))}>
                      <SelectTrigger data-testid="select-bid-strategy">
                        <SelectValue placeholder="Select bid strategy" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOWEST_COST_WITHOUT_CAP">Lowest Cost</SelectItem>
                        <SelectItem value="LOWEST_COST_WITH_BID_CAP">Bid Cap</SelectItem>
                        <SelectItem value="TARGET_COST">Target Cost</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Audience Targeting</h4>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="age-min">Age Range</Label>
                      <div className="flex space-x-2">
                        <Input
                          id="age-min"
                          type="number"
                          value={campaignConfig.targetAudience.age_min || 18}
                          onChange={(e) => setCampaignConfig(prev => ({
                            ...prev,
                            targetAudience: { ...prev.targetAudience, age_min: Number(e.target.value) }
                          }))}
                          placeholder="18"
                          data-testid="input-age-min"
                        />
                        <span className="flex items-center">to</span>
                        <Input
                          type="number"
                          value={campaignConfig.targetAudience.age_max || 65}
                          onChange={(e) => setCampaignConfig(prev => ({
                            ...prev,
                            targetAudience: { ...prev.targetAudience, age_max: Number(e.target.value) }
                          }))}
                          placeholder="65"
                          data-testid="input-age-max"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="countries">Target Countries</Label>
                      <Input
                        id="countries"
                        value={campaignConfig.targetAudience.geo_locations?.countries?.join(', ') || 'JP'}
                        onChange={(e) => setCampaignConfig(prev => ({
                          ...prev,
                          targetAudience: {
                            ...prev.targetAudience,
                            geo_locations: { countries: e.target.value.split(', ') }
                          }
                        }))}
                        placeholder="JP, US, GB"
                        data-testid="input-countries"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="interests">Interests (comma-separated)</Label>
                    <Textarea
                      id="interests"
                      value={campaignConfig.targetAudience.interests?.join(', ') || ''}
                      onChange={(e) => setCampaignConfig(prev => ({
                        ...prev,
                        targetAudience: { ...prev.targetAudience, interests: e.target.value.split(', ').filter(Boolean) }
                      }))}
                      placeholder="mobile phones, technology, social media"
                      data-testid="textarea-interests"
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Placements</h4>
                  <div className="flex flex-wrap gap-2">
                    {['instagram_feed', 'instagram_stories', 'instagram_reels', 'facebook_feed', 'facebook_stories'].map((placement) => (
                      <div key={placement} className="flex items-center space-x-2">
                        <Switch
                          id={placement}
                          checked={campaignConfig.placements.includes(placement)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setCampaignConfig(prev => ({
                                ...prev,
                                placements: [...prev.placements, placement]
                              }));
                            } else {
                              setCampaignConfig(prev => ({
                                ...prev,
                                placements: prev.placements.filter(p => p !== placement)
                              }));
                            }
                          }}
                          data-testid={`switch-${placement}`}
                        />
                        <Label htmlFor={placement} className="text-sm capitalize">
                          {placement.replace(/_/g, ' ')}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="tiktok" className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    TikTok campaigns use similar configuration but with platform-specific targeting options.
                    Budget, objectives, and audience settings apply with TikTok's unique placement and optimization features.
                  </AlertDescription>
                </Alert>
                
                {/* Similar form structure but adapted for TikTok */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="tiktok-campaign-name">Campaign Name</Label>
                    <Input
                      id="tiktok-campaign-name"
                      value={campaignConfig.name}
                      onChange={(e) => setCampaignConfig(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="TikTok Campaign Name"
                      data-testid="input-tiktok-campaign-name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="tiktok-budget">Daily Budget (¥)</Label>
                    <Input
                      id="tiktok-budget"
                      type="number"
                      value={campaignConfig.budget}
                      onChange={(e) => setCampaignConfig(prev => ({ ...prev, budget: Number(e.target.value) }))}
                      placeholder="100"
                      data-testid="input-tiktok-budget"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowCreateForm(false)}
                data-testid="button-cancel-campaign"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateCampaign}
                disabled={createCampaignMutation.isPending}
                data-testid="button-submit-campaign"
              >
                {createCampaignMutation.isPending ? 'Creating...' : 'Create Campaign'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Campaigns */}
      <Card data-testid="card-active-campaigns">
        <CardHeader>
          <CardTitle>Active Campaigns</CardTitle>
          <CardDescription>
            Monitor and manage your running campaigns across all platforms
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-muted-foreground">Loading campaigns...</div>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center p-8">
              <div className="text-muted-foreground mb-4">No active campaigns</div>
              <Button onClick={() => setShowCreateForm(true)} data-testid="button-create-first-campaign">
                Create Your First Campaign
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign: Campaign) => (
                <div key={campaign.campaign_id} className="border rounded-lg p-4 space-y-4" data-testid={`campaign-${campaign.campaign_id}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline" data-testid={`badge-platform-${campaign.platform}`}>
                        {campaign.platform === 'meta' ? 'Meta' : 'TikTok'}
                      </Badge>
                      <h4 className="font-medium" data-testid={`text-campaign-name-${campaign.campaign_id}`}>
                        Campaign {campaign.campaign_id}
                      </h4>
                      <Badge variant={campaign.status === 'ACTIVE' ? 'default' : 'secondary'} data-testid={`badge-status-${campaign.campaign_id}`}>
                        {campaign.status}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => pauseCampaignMutation.mutate({ id: campaign.campaign_id, platform: campaign.platform })}
                        disabled={pauseCampaignMutation.isPending}
                        data-testid={`button-pause-${campaign.campaign_id}`}
                      >
                        <Pause className="h-4 w-4 mr-1" />
                        Pause
                      </Button>
                      <Button variant="outline" size="sm" data-testid={`button-settings-${campaign.campaign_id}`}>
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="text-center p-3 bg-muted rounded">
                      <div className="text-2xl font-bold" data-testid={`text-spend-${campaign.campaign_id}`}>{formatCurrency(campaign.spend)}</div>
                      <div className="text-sm text-muted-foreground">Spend</div>
                    </div>
                    
                    <div className="text-center p-3 bg-muted rounded">
                      <div className="text-2xl font-bold" data-testid={`text-impressions-${campaign.campaign_id}`}>{campaign.impressions.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">Impressions</div>
                    </div>
                    
                    <div className="text-center p-3 bg-muted rounded">
                      <div className="text-2xl font-bold" data-testid={`text-ctr-${campaign.campaign_id}`}>{formatPercentage(campaign.ctr)}</div>
                      <div className="text-sm text-muted-foreground">CTR</div>
                    </div>
                    
                    <div className="text-center p-3 bg-muted rounded">
                      <div className="text-2xl font-bold" data-testid={`text-roas-${campaign.campaign_id}`}>{campaign.roas.toFixed(2)}x</div>
                      <div className="text-sm text-muted-foreground">ROAS</div>
                    </div>
                  </div>
                  
                  {campaign.roas > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Performance Score</span>
                        <span>{Math.min(100, Math.round(campaign.roas * 20))}%</span>
                      </div>
                      <Progress value={Math.min(100, campaign.roas * 20)} className="h-2" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}