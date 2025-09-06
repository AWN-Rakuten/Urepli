import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  TrendingUp, 
  Brain, 
  Target, 
  Zap, 
  Clock, 
  DollarSign, 
  BarChart3, 
  AlertTriangle,
  CheckCircle,
  Activity,
  Lightbulb
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OptimizationArm {
  id: string;
  name: string;
  platform: string;
  strategy: string;
  expectedReward: number;
  confidence: number;
  metadata: {
    contentType: string;
    targetAudience: string;
    timeOfDay: string;
  };
}

interface OptimizationInsight {
  insights: string[];
  totalArms: number;
  averageReward: number;
  lastOptimization: string;
}

interface BudgetAllocation {
  totalBudget: number;
  allocations: Record<string, {
    armName: string;
    allocation: number;
    confidence: number;
    expectedROAS: number;
    reasoning: string;
  }>;
  optimizationStrategy: string;
  confidence: number;
}

interface SchedulePrediction {
  workflowId: string;
  targetAudience: string;
  optimalTimes: Array<{
    timeSlot: string;
    score: number;
    recommendation: string;
  }>;
}

export function AdvancedOptimizationDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [budgetAmount, setBudgetAmount] = useState(50000);
  const [selectedWorkflow, setSelectedWorkflow] = useState('');
  const [targetAudience, setTargetAudience] = useState('20-30代');

  // Fetch optimization state
  const { data: optimizationState, isLoading: stateLoading } = useQuery({
    queryKey: ['/api/optimization/state'],
    refetchInterval: 30000
  });

  // Fetch optimization insights
  const { data: insights } = useQuery({
    queryKey: ['/api/optimization/insights'],
    refetchInterval: 60000
  });

  // Budget optimization mutation
  const budgetOptimizationMutation = useMutation({
    mutationFn: async (data: { totalBudget: number; constraints?: any }) => {
      const response = await fetch('/api/optimization/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Budget optimization failed');
      }
      
      return response.json();
    },
    onSuccess: (result: BudgetAllocation) => {
      toast({
        title: "Budget Optimized",
        description: `Allocated ¥${result.totalBudget.toLocaleString()} across ${Object.keys(result.allocations).length} strategies`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Optimization Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Schedule prediction query
  const { data: schedulePrediction } = useQuery({
    queryKey: ['/api/optimization/schedule', selectedWorkflow, targetAudience],
    enabled: !!selectedWorkflow && !!targetAudience,
    refetchInterval: 300000 // 5 minutes
  });

  const handleBudgetOptimization = () => {
    if (budgetAmount <= 0) {
      toast({
        title: "Invalid Budget",
        description: "Please enter a valid budget amount",
        variant: "destructive",
      });
      return;
    }

    budgetOptimizationMutation.mutate({
      totalBudget: budgetAmount,
      constraints: {
        maxDailyChange: 0.2,
        minAllocation: 1000
      }
    });
  };

  const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`;
  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

  return (
    <div className="space-y-6" data-testid="advanced-optimization-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight" data-testid="title-optimization">Advanced Optimization Engine</h2>
          <p className="text-muted-foreground">
            AI-powered multi-armed bandit optimization with Thompson sampling
          </p>
        </div>
        <Badge variant="secondary" className="ml-auto" data-testid="badge-ai-powered">
          <Brain className="mr-1 h-3 w-3" />
          Thompson Sampling
        </Badge>
      </div>

      {/* Key Insights */}
      {insights && (
        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <Lightbulb className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-2">AI Optimization Insights</div>
            <div className="grid gap-2 text-sm">
              {insights.insights.slice(0, 3).map((insight: string, index: number) => (
                <div key={index} className="flex items-start gap-2" data-testid={`insight-${index}`}>
                  <div className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>{insight}</span>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Optimization Tabs */}
      <Tabs defaultValue="budget" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="budget" data-testid="tab-budget-optimization">Budget Optimization</TabsTrigger>
          <TabsTrigger value="scheduling" data-testid="tab-predictive-scheduling">Predictive Scheduling</TabsTrigger>
          <TabsTrigger value="arms" data-testid="tab-bandit-arms">Bandit Arms</TabsTrigger>
          <TabsTrigger value="ensemble" data-testid="tab-workflow-ensemble">Workflow Ensemble</TabsTrigger>
        </TabsList>

        {/* Budget Optimization */}
        <TabsContent value="budget" className="space-y-6">
          <Card data-testid="card-budget-optimizer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Multi-Armed Bandit Budget Allocation
              </CardTitle>
              <CardDescription>
                Optimize budget allocation using Thompson sampling across performance strategies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="budget">Total Budget (¥)</Label>
                  <Input
                    id="budget"
                    type="number"
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(Number(e.target.value))}
                    placeholder="50000"
                    data-testid="input-budget-amount"
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handleBudgetOptimization}
                    disabled={budgetOptimizationMutation.isPending}
                    className="w-full"
                    data-testid="button-optimize-budget"
                  >
                    {budgetOptimizationMutation.isPending ? (
                      <>
                        <Activity className="mr-2 h-4 w-4 animate-spin" />
                        Optimizing...
                      </>
                    ) : (
                      <>
                        <Target className="mr-2 h-4 w-4" />
                        Optimize Budget
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Budget Allocation Results */}
              {budgetOptimizationMutation.data && (
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3">Optimized Allocation</h4>
                    <div className="grid gap-3">
                      {Object.entries(budgetOptimizationMutation.data.allocations).map(([armId, allocation]) => (
                        <div key={armId} className="flex items-center justify-between p-3 bg-muted rounded" data-testid={`allocation-${armId}`}>
                          <div>
                            <div className="font-medium">{allocation.armName}</div>
                            <div className="text-sm text-muted-foreground">{allocation.reasoning}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{formatCurrency(allocation.allocation)}</div>
                            <div className="text-sm text-muted-foreground">
                              ROAS: {allocation.expectedROAS.toFixed(2)}x
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Predictive Scheduling */}
        <TabsContent value="scheduling" className="space-y-6">
          <Card data-testid="card-predictive-scheduling">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Predictive Workflow Scheduling
              </CardTitle>
              <CardDescription>
                AI-powered optimal timing prediction based on market patterns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="workflow">Workflow ID</Label>
                  <Input
                    id="workflow"
                    value={selectedWorkflow}
                    onChange={(e) => setSelectedWorkflow(e.target.value)}
                    placeholder="workflow_id"
                    data-testid="input-workflow-id"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="audience">Target Audience</Label>
                  <Input
                    id="audience"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="20-30代"
                    data-testid="input-target-audience"
                  />
                </div>
              </div>

              {/* Schedule Predictions */}
              {schedulePrediction && (
                <div className="space-y-4">
                  <h4 className="font-medium">Optimal Scheduling Recommendations</h4>
                  <div className="grid gap-3">
                    {schedulePrediction.optimalTimes.map((time, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded" data-testid={`schedule-recommendation-${index}`}>
                        <div>
                          <div className="font-medium">{time.timeSlot}</div>
                          <Badge variant={
                            time.recommendation === 'optimal' ? 'default' : 
                            time.recommendation === 'good' ? 'secondary' : 'outline'
                          }>
                            {time.recommendation}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{(time.score * 100).toFixed(0)}%</div>
                          <div className="text-sm text-muted-foreground">Score</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bandit Arms */}
        <TabsContent value="arms" className="space-y-6">
          <Card data-testid="card-bandit-arms">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Multi-Armed Bandit Arms
              </CardTitle>
              <CardDescription>
                Performance tracking of optimization strategies with confidence intervals
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stateLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Activity className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading optimization state...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {optimizationState?.arms?.map((arm: OptimizationArm) => (
                    <div key={arm.id} className="border rounded-lg p-4 space-y-3" data-testid={`arm-${arm.id}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{arm.name}</h4>
                          <Badge variant="outline">{arm.platform}</Badge>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600" data-testid={`arm-reward-${arm.id}`}>
                            {formatPercentage(arm.expectedReward)}
                          </div>
                          <div className="text-sm text-muted-foreground">Expected Reward</div>
                        </div>
                      </div>
                      
                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <div className="text-sm text-muted-foreground">Strategy</div>
                          <div className="font-medium">{arm.strategy}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Target Audience</div>
                          <div className="font-medium">{arm.metadata.targetAudience}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Optimal Time</div>
                          <div className="font-medium">{arm.metadata.timeOfDay}</div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Confidence</span>
                          <span>{formatPercentage(1 - arm.confidence)}</span>
                        </div>
                        <Progress value={(1 - arm.confidence) * 100} className="h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workflow Ensemble */}
        <TabsContent value="ensemble" className="space-y-6">
          <Card data-testid="card-workflow-ensemble">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Workflow Ensemble Optimization
              </CardTitle>
              <CardDescription>
                Multi-workflow ensemble with weighted voting and stacking strategies
              </CardDescription>
            </CardHeader>
            <CardContent>
              {optimizationState?.ensembles?.map((ensemble: any) => (
                <div key={ensemble.id} className="border rounded-lg p-4 space-y-4" data-testid={`ensemble-${ensemble.id}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{ensemble.name}</h4>
                      <Badge variant="secondary">{ensemble.ensembleStrategy}</Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600" data-testid={`ensemble-performance-${ensemble.id}`}>
                        {(ensemble.performance * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Performance</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-medium">Workflow Weights</div>
                    {ensemble.workflows.map((workflowId: string, index: number) => (
                      <div key={workflowId} className="flex items-center justify-between">
                        <span className="text-sm">{workflowId}</span>
                        <div className="flex items-center gap-2">
                          <Progress value={ensemble.weights[index] * 100} className="w-24 h-2" />
                          <span className="text-sm font-medium w-12 text-right">
                            {(ensemble.weights[index] * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Last optimized: {new Date(ensemble.lastOptimized).toLocaleString()}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Performance Summary */}
      {insights && (
        <Card data-testid="card-performance-summary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Optimization Performance Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 bg-muted rounded">
                <div className="text-2xl font-bold" data-testid="text-total-arms">{insights.totalArms}</div>
                <div className="text-sm text-muted-foreground">Active Arms</div>
              </div>
              
              <div className="text-center p-4 bg-muted rounded">
                <div className="text-2xl font-bold" data-testid="text-average-reward">
                  {formatPercentage(insights.averageReward)}
                </div>
                <div className="text-sm text-muted-foreground">Average Reward</div>
              </div>
              
              <div className="text-center p-4 bg-muted rounded">
                <div className="text-2xl font-bold text-green-600" data-testid="text-status">
                  <CheckCircle className="h-6 w-6 mx-auto" />
                </div>
                <div className="text-sm text-muted-foreground">Optimized</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}