import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, TrendingUp, Brain, Shield, BarChart3, Zap, Play, Square } from 'lucide-react';

interface SystemStatus {
  isRunning: boolean;
  activeAgents: number;
  totalEvents: number;
  recentErrors: string[];
  lastActivity: string;
  performanceMetrics: {
    strategiesGenerated: number;
    factorsDiscovered: number;
    riskAssessments: number;
    regimeChanges: number;
  };
}

interface Agent {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'error' | 'stopped';
  metrics: {
    tasksCompleted: number;
    successRate: number;
    averageResponseTime: number;
    errorCount: number;
    lastActive: string;
  };
}

interface Strategy {
  id: string;
  name: string;
  confidence?: number;
  innovationDistance?: number;
  riskScore?: number;
  targetRegimes?: string[];
  createdAt: string;
}

interface Factor {
  id: string;
  name: string;
  type: string;
  zScore?: number;
  noveltyScore?: number;
  crowdingRisk?: number;
  halfLife?: number;
  createdAt: string;
}

interface DashboardData {
  systemStatus: SystemStatus;
  agents: Agent[];
  recentStrategies: Strategy[];
  recentFactors: Factor[];
  knowledgeGraphStats: {
    entityCount: number;
    relationCount: number;
    entityTypeBreakdown: Record<string, number>;
    relationTypeBreakdown: Record<string, number>;
  };
  recentEvents: any[];
}

export default function QuantAgentsDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/quant-agents/dashboard');
      const result = await response.json();
      
      if (result.success) {
        setDashboardData(result.dashboard);
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch dashboard data');
      }
    } catch (err) {
      setError('Network error fetching dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const initializeSystem = async () => {
    setIsInitializing(true);
    try {
      const response = await fetch('/api/quant-agents/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();
      
      if (result.success) {
        await fetchDashboardData();
      } else {
        setError(result.error || 'Failed to initialize system');
      }
    } catch (err) {
      setError('Network error initializing system');
    } finally {
      setIsInitializing(false);
    }
  };

  const triggerAnalysis = async () => {
    try {
      const response = await fetch('/api/quant-agents/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();
      
      if (!result.success) {
        setError(result.error || 'Failed to trigger analysis');
      }
    } catch (err) {
      setError('Network error triggering analysis');
    }
  };

  const stopSystem = async () => {
    try {
      const response = await fetch('/api/quant-agents/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();
      
      if (result.success) {
        await fetchDashboardData();
      } else {
        setError(result.error || 'Failed to stop system');
      }
    } catch (err) {
      setError('Network error stopping system');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const systemStatus = dashboardData?.systemStatus;
  const isRunning = systemStatus?.isRunning || false;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Quant Agents System</h1>
          <p className="text-muted-foreground">Multi-agent quantitative trading research platform</p>
        </div>
        <div className="flex gap-2">
          {!isRunning ? (
            <Button 
              onClick={initializeSystem} 
              disabled={isInitializing}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="w-4 h-4 mr-2" />
              {isInitializing ? 'Starting...' : 'Start System'}
            </Button>
          ) : (
            <>
              <Button onClick={triggerAnalysis} variant="outline">
                <Zap className="w-4 h-4 mr-2" />
                Trigger Analysis
              </Button>
              <Button onClick={stopSystem} variant="destructive">
                <Square className="w-4 h-4 mr-2" />
                Stop System
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">System Status</p>
                <p className="text-lg font-semibold">
                  {isRunning ? 'Running' : 'Stopped'}
                </p>
              </div>
              <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Agents</p>
                <p className="text-lg font-semibold">{systemStatus?.activeAgents || 0}</p>
              </div>
              <Brain className="w-5 h-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Strategies Generated</p>
                <p className="text-lg font-semibold">{systemStatus?.performanceMetrics.strategiesGenerated || 0}</p>
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Factors Discovered</p>
                <p className="text-lg font-semibold">{systemStatus?.performanceMetrics.factorsDiscovered || 0}</p>
              </div>
              <BarChart3 className="w-5 h-5 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="strategies" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="strategies">Strategies</TabsTrigger>
          <TabsTrigger value="factors">Factors</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge Graph</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
        </TabsList>

        <TabsContent value="strategies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Recent Strategy Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData?.recentStrategies.length ? (
                <div className="space-y-3">
                  {dashboardData.recentStrategies.slice(0, 10).map((strategy) => (
                    <div key={strategy.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{strategy.name}</h4>
                          <div className="flex gap-2 mt-1">
                            {strategy.confidence && (
                              <Badge variant="outline">
                                Confidence: {(strategy.confidence * 100).toFixed(1)}%
                              </Badge>
                            )}
                            {strategy.innovationDistance && (
                              <Badge variant="outline">
                                Innovation: {(strategy.innovationDistance * 100).toFixed(1)}%
                              </Badge>
                            )}
                            {strategy.riskScore && (
                              <Badge variant="outline">
                                Risk: {strategy.riskScore.toFixed(1)}
                              </Badge>
                            )}
                          </div>
                          {strategy.targetRegimes && (
                            <div className="text-sm text-muted-foreground mt-1">
                              Target Regimes: {strategy.targetRegimes.join(', ')}
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(strategy.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No strategies generated yet. Try triggering an analysis cycle.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="factors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Factor Discoveries
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData?.recentFactors.length ? (
                <div className="space-y-3">
                  {dashboardData.recentFactors.slice(0, 10).map((factor) => (
                    <div key={factor.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{factor.name}</h4>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline">{factor.type}</Badge>
                            {factor.noveltyScore && (
                              <Badge variant="outline">
                                Novelty: {(factor.noveltyScore * 100).toFixed(1)}%
                              </Badge>
                            )}
                            {factor.zScore && (
                              <Badge variant="outline">
                                Z-Score: {factor.zScore.toFixed(2)}
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                            {factor.crowdingRisk && (
                              <span>Crowding Risk: {(factor.crowdingRisk * 100).toFixed(1)}%</span>
                            )}
                            {factor.halfLife && (
                              <span>Half-Life: {factor.halfLife}d</span>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(factor.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No factors discovered yet. System will discover factors as market data is ingested.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Agent Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData?.agents.length ? (
                <div className="space-y-3">
                  {dashboardData.agents.map((agent) => (
                    <div key={agent.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{agent.name}</h4>
                            <Badge 
                              variant={agent.status === 'active' ? 'default' : 
                                       agent.status === 'error' ? 'destructive' : 'secondary'}
                            >
                              {agent.status}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Tasks: </span>
                              <span className="font-medium">{agent.metrics.tasksCompleted}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Success Rate: </span>
                              <span className="font-medium">{(agent.metrics.successRate * 100).toFixed(1)}%</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Avg Response: </span>
                              <span className="font-medium">{agent.metrics.averageResponseTime.toFixed(0)}ms</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Errors: </span>
                              <span className="font-medium">{agent.metrics.errorCount}</span>
                            </div>
                          </div>
                          {agent.metrics.successRate > 0 && (
                            <Progress 
                              value={agent.metrics.successRate * 100} 
                              className="mt-2 h-2" 
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No agents initialized. Start the system to see agent status.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="knowledge" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Knowledge Graph Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Entities</p>
                  <p className="text-2xl font-bold">{dashboardData?.knowledgeGraphStats.entityCount || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Relations</p>
                  <p className="text-2xl font-bold">{dashboardData?.knowledgeGraphStats.relationCount || 0}</p>
                </div>
              </div>
              
              {dashboardData?.knowledgeGraphStats.entityTypeBreakdown && (
                <div className="mt-6">
                  <h4 className="font-medium mb-3">Entity Types</h4>
                  <div className="space-y-2">
                    {Object.entries(dashboardData.knowledgeGraphStats.entityTypeBreakdown).map(([type, count]) => (
                      <div key={type} className="flex justify-between items-center">
                        <span className="capitalize">{type.replace('_', ' ')}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent System Events</CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData?.recentEvents.length ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {dashboardData.recentEvents.map((event, index) => (
                    <div key={index} className="border-l-2 border-gray-200 pl-3 py-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-mono text-sm text-blue-600">{event.type}</span>
                          <p className="text-sm text-muted-foreground mt-1">
                            Agent: {event.agentId}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No events recorded yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}