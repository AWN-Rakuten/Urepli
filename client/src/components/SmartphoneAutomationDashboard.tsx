import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Smartphone, 
  Play, 
  Pause, 
  Square, 
  Eye, 
  Upload, 
  Activity, 
  Battery, 
  Thermometer, 
  Wifi,
  Users,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface SmartphoneDevice {
  id: string;
  name: string;
  platform: 'android' | 'ios';
  status: 'available' | 'busy' | 'offline' | 'maintenance' | 'error';
  healthMetrics: {
    batteryLevel: number;
    temperature: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  statistics: {
    totalWatchTime: number;
    totalPosts: number;
    totalEngagements: number;
    successRate: number;
  };
  currentSession?: {
    platform: string;
    activity: string;
    startTime: string;
  };
}

interface WatchingSession {
  sessionId: string;
  deviceId: string;
  platform: 'tiktok' | 'instagram' | 'youtube';
  status: 'starting' | 'active' | 'paused' | 'completed' | 'failed';
  statistics: {
    videosWatched: number;
    totalWatchTime: number;
    engagements: {
      likes: number;
      follows: number;
      comments: number;
      shares: number;
    };
  };
}

interface Workflow {
  id: string;
  name: string;
  status: 'scheduled' | 'running' | 'paused' | 'completed' | 'failed';
  devices: string[];
  platforms: string[];
  statistics: {
    totalRuns: number;
    successfulRuns: number;
    totalWatchTime: number;
    totalPosts: number;
  };
}

interface DashboardData {
  devices: {
    total: number;
    available: number;
    busy: number;
    offline: number;
    averageBatteryLevel: number;
    averageSuccessRate: number;
  };
  watching: {
    activeSessions: number;
    totalWatchTime: number;
    totalEngagements: number;
  };
  workflows: {
    active: number;
    completed: number;
    failed: number;
  };
}

export default function SmartphoneAutomationDashboard() {
  const [devices, setDevices] = useState<SmartphoneDevice[]>([]);
  const [watchingSessions, setWatchingSessions] = useState<WatchingSession[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const [devicesRes, sessionsRes, workflowsRes, dashboardRes] = await Promise.all([
        fetch('/api/smartphone-automation/devices'),
        fetch('/api/smartphone-automation/watching/sessions'),
        fetch('/api/smartphone-automation/workflows'),
        fetch('/api/smartphone-automation/dashboard')
      ]);

      if (devicesRes.ok) {
        const devicesData = await devicesRes.json();
        setDevices(devicesData.devices || []);
      }

      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        setWatchingSessions(sessionsData.sessions || []);
      }

      if (workflowsRes.ok) {
        const workflowsData = await workflowsRes.json();
        setWorkflows(workflowsData.workflows || []);
      }

      if (dashboardRes.ok) {
        const dashboardResult = await dashboardRes.json();
        setDashboardData(dashboardResult.dashboard);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const startWatchingWorkflow = async () => {
    try {
      const response = await fetch('/api/smartphone-automation/workflows/watching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platforms: ['tiktok', 'instagram', 'youtube'],
          duration: 60, // 1 hour
          strategy: 'japanese_market_focus',
          profiles: {
            tiktok: 'japanese_business',
            instagram: 'lifestyle_fashion',
            youtube: 'educational'
          }
        })
      });

      if (response.ok) {
        await loadDashboardData();
      }
    } catch (err) {
      setError('Failed to start watching workflow');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'busy':
        return <Activity className="h-4 w-4 text-blue-500" />;
      case 'offline':
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
      case 'error':
      case 'maintenance':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Smartphone className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'busy':
        return 'bg-blue-100 text-blue-800';
      case 'offline':
        return 'bg-gray-100 text-gray-800';
      case 'error':
      case 'maintenance':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlatformIcon = (platform: string) => {
    // In a real implementation, you'd use actual platform icons
    return <div className="w-4 h-4 rounded bg-gray-300 flex items-center justify-center text-xs">
      {platform.charAt(0).toUpperCase()}
    </div>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Smartphone Automation Dashboard</h1>
        <Button onClick={startWatchingWorkflow} className="flex items-center gap-2">
          <Play className="h-4 w-4" />
          Start Watching Workflow
        </Button>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Overview Cards */}
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Devices</CardTitle>
              <Smartphone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData.devices.available}/{dashboardData.devices.total}
              </div>
              <p className="text-xs text-muted-foreground">
                {Math.round(dashboardData.devices.averageBatteryLevel)}% avg battery
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Watching Sessions</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.watching.activeSessions}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round(dashboardData.watching.totalWatchTime / 60)}h total time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.workflows.active}</div>
              <p className="text-xs text-muted-foreground">
                {dashboardData.workflows.completed} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Engagements</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.watching.totalEngagements}</div>
              <p className="text-xs text-muted-foreground">
                {dashboardData.totals.posts} posts created
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="devices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="sessions">Watching Sessions</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
        </TabsList>

        <TabsContent value="devices" className="space-y-4">
          <div className="grid gap-4">
            {devices.map((device) => (
              <Card key={device.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Smartphone className="h-5 w-5" />
                      <CardTitle className="text-lg">{device.name}</CardTitle>
                      <Badge className={getStatusColor(device.status)}>
                        {getStatusIcon(device.status)}
                        <span className="ml-1">{device.status}</span>
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Battery className="h-4 w-4" />
                        <span>{device.healthMetrics.batteryLevel}%</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Thermometer className="h-4 w-4" />
                        <span>{device.healthMetrics.temperature}°C</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Watch Time</div>
                      <div className="font-medium">
                        {Math.round(device.statistics.totalWatchTime / 60)}h
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Posts</div>
                      <div className="font-medium">{device.statistics.totalPosts}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Engagements</div>
                      <div className="font-medium">{device.statistics.totalEngagements}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Success Rate</div>
                      <div className="font-medium">{Math.round(device.statistics.successRate)}%</div>
                    </div>
                  </div>

                  {device.currentSession && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getPlatformIcon(device.currentSession.platform)}
                          <span className="text-sm font-medium">
                            {device.currentSession.activity} on {device.currentSession.platform}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Started {new Date(device.currentSession.startTime).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Memory Usage</span>
                      <span>{device.healthMetrics.memoryUsage}%</span>
                    </div>
                    <Progress value={device.healthMetrics.memoryUsage} className="h-2" />
                    
                    <div className="flex justify-between text-sm">
                      <span>CPU Usage</span>
                      <span>{device.healthMetrics.cpuUsage}%</span>
                    </div>
                    <Progress value={device.healthMetrics.cpuUsage} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <div className="grid gap-4">
            {watchingSessions.map((session) => (
              <Card key={session.sessionId}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getPlatformIcon(session.platform)}
                      <CardTitle className="text-lg">
                        {session.platform.charAt(0).toUpperCase() + session.platform.slice(1)} Session
                      </CardTitle>
                      <Badge className={getStatusColor(session.status)}>
                        {session.status}
                      </Badge>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Pause className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Square className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Videos Watched</div>
                      <div className="font-medium">{session.statistics.videosWatched}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Watch Time</div>
                      <div className="font-medium">
                        {Math.round(session.statistics.totalWatchTime / 60)}m
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Likes</div>
                      <div className="font-medium">{session.statistics.engagements.likes}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Follows</div>
                      <div className="font-medium">{session.statistics.engagements.follows}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-4">
          <div className="grid gap-4">
            {workflows.map((workflow) => (
              <Card key={workflow.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Activity className="h-5 w-5" />
                      <CardTitle className="text-lg">{workflow.name}</CardTitle>
                      <Badge className={getStatusColor(workflow.status)}>
                        {workflow.status}
                      </Badge>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Pause className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Square className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Devices</div>
                      <div className="font-medium">{workflow.devices.length}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Platforms</div>
                      <div className="font-medium">{workflow.platforms.length}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Total Runs</div>
                      <div className="font-medium">{workflow.statistics.totalRuns}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Success Rate</div>
                      <div className="font-medium">
                        {workflow.statistics.totalRuns > 0 
                          ? Math.round((workflow.statistics.successfulRuns / workflow.statistics.totalRuns) * 100)
                          : 0}%
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">Platforms:</span>
                      <div className="flex space-x-1">
                        {workflow.platforms.map((platform) => (
                          <Badge key={platform} variant="secondary" className="text-xs">
                            {platform}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}