import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Pause, 
  StopCircle, 
  Settings, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Video,
  Zap,
  Target,
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';

interface AutomationTask {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  createdAt: string;
  completedAt?: string;
  hasResults: boolean;
  hasError: boolean;
}

interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  config: any;
}

interface AutomationCapabilities {
  videoGeneration: Record<string, boolean>;
  socialMediaAutomation: Record<string, boolean>;
  affiliateNetworks: Record<string, boolean>;
  advertisingPlatforms: Record<string, boolean>;
  aiServices: Record<string, boolean>;
  supportedPlatforms: string[];
}

interface AutomationAnalytics {
  totalTasks: number;
  successfulTasks: number;
  failedTasks: number;
  totalRevenue: number;
  totalAdSpend: number;
  netProfit: number;
  averageROAS: number;
  topPerformingPlatforms: Array<{
    platform: string;
    posts: number;
    revenue: number;
  }>;
}

export default function HyperAutomationDashboard() {
  const [currentTask, setCurrentTask] = useState<AutomationTask | null>(null);
  const [activeTasks, setActiveTasks] = useState<AutomationTask[]>([]);
  const [templates, setTemplates] = useState<AutomationTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [capabilities, setCapabilities] = useState<AutomationCapabilities | null>(null);
  const [analytics, setAnalytics] = useState<AutomationAnalytics | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [customConfig, setCustomConfig] = useState({
    contentTheme: '',
    targetAudience: '',
    platforms: [] as string[],
    budgetPerPlatform: 10000,
    targetROAS: 3.0
  });
  // Polling interval state for exponential backoff
  const DEFAULT_POLL_INTERVAL = 10000;
  const MAX_POLL_INTERVAL = 120000; // 2 minutes
  const [pollInterval, setPollInterval] = useState(DEFAULT_POLL_INTERVAL);

  useEffect(() => {
    loadTemplates();
    loadCapabilities();
    loadAnalytics();
    loadActiveTasks();
  }, []);

  useEffect(() => {
    // Adjust polling interval based on currentTask status
    let intervalId: NodeJS.Timeout;
    function poll() {
      loadActiveTasks();
      if (currentTask) {
        checkTaskStatus(currentTask.id);
      }
    }
    poll(); // Initial poll
    intervalId = setInterval(poll, pollInterval);
    return () => clearInterval(intervalId);
  }, [currentTask?.id, pollInterval]);

  useEffect(() => {
    // Exponential backoff for completed/failed tasks
    if (!currentTask) {
      setPollInterval(DEFAULT_POLL_INTERVAL);
      return;
    }
    if (currentTask.status === 'completed' || currentTask.status === 'failed') {
      setPollInterval(prev => Math.min(prev * 2, MAX_POLL_INTERVAL));
    } else {
      setPollInterval(DEFAULT_POLL_INTERVAL);
    }
  }, [currentTask?.status]);

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/automation/templates');
      const data = await response.json();
      if (data.success) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const loadCapabilities = async () => {
    try {
      const response = await fetch('/api/automation/capabilities');
      const data = await response.json();
      if (data.success) {
        setCapabilities(data.capabilities);
      }
    } catch (error) {
      console.error('Failed to load capabilities:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await fetch('/api/automation/analytics');
      const data = await response.json();
      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  const loadActiveTasks = async () => {
    try {
      const response = await fetch('/api/automation/tasks');
      const data = await response.json();
      if (data.success) {
        setActiveTasks(data.tasks);
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const checkTaskStatus = async (taskId: string) => {
    try {
      const response = await fetch(`/api/automation/status/${taskId}`);
      const data = await response.json();
      if (data.success) {
        setCurrentTask(data.task);
      }
    } catch (error) {
      console.error('Failed to check task status:', error);
    }
  };

  const startAutomation = async (config: any) => {
    setIsStarting(true);
    try {
      const response = await fetch('/api/automation/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const data = await response.json();
      if (data.success) {
        setCurrentTask({
          id: data.taskId,
          type: 'content_generation',
          status: data.status,
          progress: 0,
          createdAt: new Date().toISOString(),
          hasResults: false,
          hasError: false
        });
        
        // Start polling for updates
        setTimeout(() => checkTaskStatus(data.taskId), 2000);
      } else {
        console.error('Failed to start automation:', data.error);
      }
    } catch (error) {
      console.error('Failed to start automation:', error);
    } finally {
      setIsStarting(false);
    }
  };

  const startWithTemplate = async () => {
    if (!selectedTemplate) return;
    
    const template = templates.find(t => t.id === selectedTemplate);
    if (template) {
      await startAutomation(template.config);
    }
  };

  const startWithCustomConfig = async () => {
    if (!customConfig.contentTheme || !customConfig.targetAudience) {
      return;
    }

    const config = {
      ...customConfig,
      japaneseMarketFocus: true,
      affiliateCategories: [customConfig.contentTheme],
      postingSchedule: {
        frequency: 'daily' as const,
        times: ['09:00', '12:00', '18:00', '21:00']
      },
      videoProcessing: {
        useComfyUI: capabilities?.videoGeneration.comfyUI || false,
        copyrightSafeTransformation: true,
        style: 'professional' as const
      }
    };

    await startAutomation(config);
  };

  const cancelTask = async (taskId: string) => {
    try {
      await fetch(`/api/automation/cancel/${taskId}`, { method: 'POST' });
      setCurrentTask(null);
      loadActiveTasks();
    } catch (error) {
      console.error('Failed to cancel task:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Hyper Automation Dashboard</h1>
          <p className="text-muted-foreground">One-click social media automation for Japanese market</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center space-x-1">
            <Zap className="h-3 w-3" />
            <span>AI-Powered</span>
          </Badge>
          <Badge variant="outline" className="flex items-center space-x-1">
            <Target className="h-3 w-3" />
            <span>Japan Focused</span>
          </Badge>
        </div>
      </div>

      {/* Analytics Overview */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">¥{analytics.totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Net profit: ¥{analytics.netProfit.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average ROAS</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.averageROAS.toFixed(1)}x</div>
              <p className="text-xs text-muted-foreground">
                Target: 3.0x
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round((analytics.successfulTasks / analytics.totalTasks) * 100)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.successfulTasks} of {analytics.totalTasks} tasks
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeTasks.length}</div>
              <p className="text-xs text-muted-foreground">
                Running automations
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="automation" className="space-y-4">
        <TabsList>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="tasks">Active Tasks</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
        </TabsList>

        <TabsContent value="automation" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Template-based Automation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Quick Start Templates</span>
                </CardTitle>
                <CardDescription>
                  Pre-configured automation templates for Japanese market
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="template-select">Select Template</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose automation template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedTemplate && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm">
                      {templates.find(t => t.id === selectedTemplate)?.description}
                    </p>
                  </div>
                )}

                <Button 
                  onClick={startWithTemplate} 
                  disabled={!selectedTemplate || isStarting}
                  className="w-full"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {isStarting ? 'Starting...' : 'Start Automation'}
                </Button>
              </CardContent>
            </Card>

            {/* Custom Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Video className="h-5 w-5" />
                  <span>Custom Automation</span>
                </CardTitle>
                <CardDescription>
                  Create custom automation with your settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="content-theme">Content Theme</Label>
                  <Input
                    id="content-theme"
                    placeholder="e.g., mobile, finance, tech"
                    value={customConfig.contentTheme}
                    onChange={(e) => setCustomConfig(prev => ({
                      ...prev,
                      contentTheme: e.target.value
                    }))}
                  />
                </div>

                <div>
                  <Label htmlFor="target-audience">Target Audience</Label>
                  <Textarea
                    id="target-audience"
                    placeholder="Describe your target audience in Japanese market"
                    value={customConfig.targetAudience}
                    onChange={(e) => setCustomConfig(prev => ({
                      ...prev,
                      targetAudience: e.target.value
                    }))}
                  />
                </div>

                <div>
                  <Label htmlFor="budget">Budget per Platform (¥)</Label>
                  <Input
                    id="budget"
                    type="number"
                    min="1000"
                    max="100000"
                    step="1000"
                    value={customConfig.budgetPerPlatform}
                    onChange={(e) => setCustomConfig(prev => ({
                      ...prev,
                      budgetPerPlatform: parseInt(e.target.value) || 10000
                    }))}
                  />
                </div>

                <Button 
                  onClick={startWithCustomConfig} 
                  disabled={!customConfig.contentTheme || !customConfig.targetAudience || isStarting}
                  className="w-full"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {isStarting ? 'Starting...' : 'Start Custom Automation'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Current Task Status */}
          {currentTask && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(currentTask.status)}
                    <span>Current Automation Task</span>
                  </div>
                  <Badge className={getStatusColor(currentTask.status)}>
                    {currentTask.status.toUpperCase()}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Progress</span>
                    <span>{Math.round(currentTask.progress)}%</span>
                  </div>
                  <Progress value={currentTask.progress} className="w-full" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Started: {new Date(currentTask.createdAt).toLocaleString()}
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => cancelTask(currentTask.id)}
                    disabled={currentTask.status !== 'running'}
                  >
                    <StopCircle className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Automation Tasks</CardTitle>
              <CardDescription>
                Monitor all running and recent automation tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeTasks.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No active tasks</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeTasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(task.status)}
                        <div>
                          <div className="font-medium">Task {task.id.slice(-8)}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(task.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge className={getStatusColor(task.status)}>
                          {task.status}
                        </Badge>
                        <div className="text-right">
                          <div className="text-sm font-medium">{Math.round(task.progress)}%</div>
                          <Progress value={task.progress} className="w-20" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {analytics && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Platform Performance</CardTitle>
                  <CardDescription>Revenue and post metrics by platform</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.topPerformingPlatforms.map((platform) => (
                      <div key={platform.platform} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          <span className="font-medium capitalize">{platform.platform}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">¥{platform.revenue.toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">{platform.posts} posts</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="capabilities" className="space-y-4">
          {capabilities && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Available Services</CardTitle>
                  <CardDescription>Current automation capabilities</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Video Generation</h4>
                    <div className="space-y-1">
                      {Object.entries(capabilities.videoGeneration).map(([service, available]) => (
                        <div key={service} className="flex items-center justify-between">
                          <span className="text-sm">{service}</span>
                          <Badge variant={available ? "default" : "secondary"}>
                            {available ? "Available" : "Unavailable"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Affiliate Networks</h4>
                    <div className="space-y-1">
                      {Object.entries(capabilities.affiliateNetworks).map(([network, available]) => (
                        <div key={network} className="flex items-center justify-between">
                          <span className="text-sm">{network}</span>
                          <Badge variant={available ? "default" : "secondary"}>
                            {available ? "Connected" : "Not Connected"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Supported Platforms</CardTitle>
                  <CardDescription>Social media platforms for automation</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {capabilities.supportedPlatforms.map((platform) => (
                      <div key={platform} className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span className="text-sm capitalize">{platform}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}