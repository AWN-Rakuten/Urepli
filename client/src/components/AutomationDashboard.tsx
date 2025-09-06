import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Square, AlertTriangle, CheckCircle, Clock, DollarSign, Zap, Settings } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface AutomationMetrics {
  tasksCompleted: number;
  tasksInProgress: number;
  tasksFailed: number;
  totalRevenue: number;
  totalCost: number;
  roas: number;
  automationRate: number;
  avgProcessingTime: number;
  errorRate: number;
}

interface BudgetStatus {
  totalSpent: number;
  dailySpent: number;
  remainingBudget: number;
  platformSpend: Record<string, number>;
  roas: number;
  profitMargin: number;
  riskStatus: 'safe' | 'caution' | 'danger';
  recommendations: string[];
}

interface ApprovalRequest {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  impact: {
    financial: number;
    risk: string;
    platforms: string[];
    estimatedOutcome: string;
  };
  automatedRecommendation: 'approve' | 'reject' | 'modify';
  reasoning: string;
  createdAt: string;
}

export function AutomationDashboard() {
  const queryClient = useQueryClient();
  const [autoApprovalEnabled, setAutoApprovalEnabled] = useState(true);

  // Fetch automation metrics
  const { data: metrics } = useQuery<AutomationMetrics>({
    queryKey: ['/api/automation/metrics'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch budget status
  const { data: budgetStatus } = useQuery<BudgetStatus>({
    queryKey: ['/api/ad-spend/budget-status'],
    refetchInterval: 60000 // Refresh every minute
  });

  // Fetch pending approvals
  const { data: pendingApprovals = [] } = useQuery<ApprovalRequest[]>({
    queryKey: ['/api/approvals/pending'],
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  // Automation controls
  const triggerAutomation = useMutation({
    mutationFn: () => apiRequest('/api/automation/trigger', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/automation/metrics'] });
    }
  });

  const emergencyStop = useMutation({
    mutationFn: (reason: string) => apiRequest('/api/automation/emergency-stop', { 
      method: 'POST',
      body: { reason }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/automation/metrics'] });
    }
  });

  const resumeAutomation = useMutation({
    mutationFn: () => apiRequest('/api/automation/resume', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/automation/metrics'] });
    }
  });

  const approveRequest = useMutation({
    mutationFn: (requestId: string) => apiRequest(`/api/approvals/approve/${requestId}`, {
      method: 'POST',
      body: { approvedBy: 'dashboard_user' }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/approvals/pending'] });
    }
  });

  const rejectRequest = useMutation({
    mutationFn: (requestId: string) => apiRequest(`/api/approvals/reject/${requestId}`, {
      method: 'POST',
      body: { rejectedBy: 'dashboard_user' }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/approvals/pending'] });
    }
  });

  const toggleAutoApproval = useMutation({
    mutationFn: (enabled: boolean) => apiRequest(
      `/api/approvals/${enabled ? 'enable' : 'disable'}-auto`, 
      { method: 'POST' }
    ),
    onSuccess: () => {
      setAutoApprovalEnabled(!autoApprovalEnabled);
    }
  });

  const getRiskColor = (status: string) => {
    switch (status) {
      case 'safe': return 'text-green-600';
      case 'caution': return 'text-yellow-600';
      case 'danger': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Full Automation Pipeline
          </CardTitle>
          <CardDescription>
            Complete end-to-end automation with intelligent human-in-the-loop intervention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Button 
              onClick={() => triggerAutomation.mutate()}
              disabled={triggerAutomation.isPending}
              className="flex items-center gap-2"
              data-testid="button-trigger-automation"
            >
              <Play className="h-4 w-4" />
              {triggerAutomation.isPending ? 'Starting...' : 'Start Full Automation'}
            </Button>
            
            <Button 
              variant="destructive"
              onClick={() => emergencyStop.mutate('Manual emergency stop via dashboard')}
              disabled={emergencyStop.isPending}
              className="flex items-center gap-2"
              data-testid="button-emergency-stop"
            >
              <Square className="h-4 w-4" />
              Emergency Stop
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => resumeAutomation.mutate()}
              disabled={resumeAutomation.isPending}
              className="flex items-center gap-2"
              data-testid="button-resume-automation"
            >
              <Play className="h-4 w-4" />
              Resume
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span className="font-medium">Auto-Approval</span>
              <Badge variant={autoApprovalEnabled ? 'default' : 'secondary'}>
                {autoApprovalEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <Switch
              checked={autoApprovalEnabled}
              onCheckedChange={(checked) => toggleAutoApproval.mutate(checked)}
              data-testid="switch-auto-approval"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="metrics" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>

        {/* Automation Metrics */}
        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Completed Tasks</p>
                    <p className="text-2xl font-bold" data-testid="text-tasks-completed">
                      {metrics?.tasksCompleted || 0}
                    </p>
                  </div>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                    <p className="text-2xl font-bold" data-testid="text-tasks-in-progress">
                      {metrics?.tasksInProgress || 0}
                    </p>
                  </div>
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Automation Rate</p>
                    <p className="text-2xl font-bold" data-testid="text-automation-rate">
                      {metrics ? `${metrics.automationRate.toFixed(1)}%` : '0%'}
                    </p>
                  </div>
                  <Zap className="h-4 w-4 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">ROAS</p>
                    <p className="text-2xl font-bold" data-testid="text-automation-roas">
                      {metrics ? `${metrics.roas.toFixed(2)}x` : '0x'}
                    </p>
                  </div>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {metrics && (
            <Card>
              <CardHeader>
                <CardTitle>Performance Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Success Rate</span>
                    <span className="text-sm text-muted-foreground">
                      {(100 - metrics.errorRate).toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={100 - metrics.errorRate} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                    <p className="text-xl font-bold">${metrics.totalRevenue.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Cost</p>
                    <p className="text-xl font-bold">${metrics.totalCost.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Budget Status */}
        <TabsContent value="budget" className="space-y-4">
          {budgetStatus && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Budget Status
                    <Badge className={getRiskColor(budgetStatus.riskStatus)}>
                      {budgetStatus.riskStatus.toUpperCase()}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Daily Spent</p>
                      <p className="text-xl font-bold" data-testid="text-daily-spent">
                        ${budgetStatus.dailySpent.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Remaining Budget</p>
                      <p className="text-xl font-bold" data-testid="text-remaining-budget">
                        ${budgetStatus.remainingBudget.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Profit Margin</p>
                      <p className="text-xl font-bold" data-testid="text-profit-margin">
                        ${budgetStatus.profitMargin.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Platform Spend</h4>
                    <div className="space-y-2">
                      {Object.entries(budgetStatus.platformSpend).map(([platform, amount]) => (
                        <div key={platform} className="flex justify-between">
                          <span className="capitalize">{platform}</span>
                          <span className="font-medium">${amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {budgetStatus.recommendations.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Recommendations</h4>
                      <div className="space-y-2">
                        {budgetStatus.recommendations.map((rec, index) => (
                          <Alert key={index}>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{rec}</AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Pending Approvals */}
        <TabsContent value="approvals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Human Approvals ({pendingApprovals.length})</CardTitle>
              <CardDescription>
                Critical decisions requiring human intervention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingApprovals.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No pending approvals - automation is running smoothly!
                </p>
              ) : (
                <div className="space-y-4">
                  {pendingApprovals.map((request) => (
                    <Card key={request.id} className="border-l-4 border-l-orange-500">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <Badge className={getPriorityColor(request.priority)}>
                              {request.priority}
                            </Badge>
                            <h4 className="font-medium">{request.title}</h4>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => approveRequest.mutate(request.id)}
                              disabled={approveRequest.isPending}
                              data-testid={`button-approve-${request.id}`}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => rejectRequest.mutate(request.id)}
                              disabled={rejectRequest.isPending}
                              data-testid={`button-reject-${request.id}`}
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {request.description}
                        </p>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Financial Impact: </span>
                            ${request.impact.financial.toFixed(2)}
                          </div>
                          <div>
                            <span className="font-medium">Risk Level: </span>
                            <Badge variant="outline">{request.impact.risk}</Badge>
                          </div>
                          <div className="col-span-2">
                            <span className="font-medium">Reasoning: </span>
                            {request.reasoning}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks */}
        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Automation Tasks</CardTitle>
              <CardDescription>
                Real-time view of automation pipeline tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Task monitoring coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}