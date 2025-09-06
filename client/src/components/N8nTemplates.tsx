import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Bot, Zap, TrendingUp, Clock, Settings, Play, BarChart3 } from "lucide-react";
import type { N8nTemplate, OptimizationEvent } from "@/types";

export default function N8nTemplates() {
  const [activeTab, setActiveTab] = useState("templates");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading: templatesLoading } = useQuery<N8nTemplate[]>({
    queryKey: ["/api/n8n-templates"],
    refetchInterval: 30000,
  });

  const { data: optimizationEvents = [] } = useQuery<OptimizationEvent[]>({
    queryKey: ["/api/optimization-events"],
    refetchInterval: 30000,
  });

  const optimizeTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      return apiRequest("POST", `/api/n8n-templates/${templateId}/optimize`, {});
    },
    onSuccess: (data: any) => {
      toast({
        title: "Template optimized successfully",
        description: `Expected improvement: ${data.performanceImprovement}%`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/n8n-templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/optimization-events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
    onError: (error: any) => {
      toast({
        title: "Optimization failed",
        description: error.message || "Failed to optimize template",
        variant: "destructive",
      });
    },
  });

  const analyzePerformanceMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/n8n-templates/analyze-performance", {});
    },
    onSuccess: () => {
      toast({
        title: "Performance analysis complete",
        description: "Check automation logs for detailed insights",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
  });

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return "text-chart-1";
    if (score >= 75) return "text-chart-2";
    if (score >= 60) return "text-chart-3";
    return "text-chart-4";
  };

  const activeTemplate = templates.find(t => t.isActive) || templates[0];

  if (templatesLoading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="text-foreground">Loading n8n templates...</div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center">
            <Bot className="w-5 h-5 mr-2 text-primary" />
            n8n Template Management
          </h3>
          <p className="text-sm text-muted-foreground">
            AI-powered workflow templates with Gemini optimization
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => analyzePerformanceMutation.mutate()}
            disabled={analyzePerformanceMutation.isPending}
            variant="outline"
            size="sm"
            data-testid="button-analyze-performance"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            {analyzePerformanceMutation.isPending ? "Analyzing..." : "Analyze Performance"}
          </Button>
          {activeTemplate && (
            <Button
              onClick={() => optimizeTemplateMutation.mutate(activeTemplate.id)}
              disabled={optimizeTemplateMutation.isPending}
              size="sm"
              data-testid="button-optimize-template"
            >
              <Zap className="w-4 h-4 mr-2" />
              {optimizeTemplateMutation.isPending ? "Optimizing..." : "Optimize with Gemini"}
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates" data-testid="tab-templates">Templates</TabsTrigger>
          <TabsTrigger value="optimization" data-testid="tab-optimization">Optimization</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {templates.map((template) => (
              <Card key={template.id} className="relative" data-testid={`template-card-${template.id}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center">
                        {template.name}
                        {template.isActive && (
                          <Badge variant="default" className="ml-2">Active</Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {template.description || "Advanced Japanese content automation"}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${getPerformanceColor(template.performanceScore)}`}>
                        {template.performanceScore.toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground">Performance</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Performance Score</span>
                        <span className={getPerformanceColor(template.performanceScore)}>
                          {template.performanceScore.toFixed(1)}%
                        </span>
                      </div>
                      <Progress 
                        value={template.performanceScore} 
                        className="h-2"
                        data-testid={`template-progress-${template.id}`}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Version</div>
                        <div className="font-medium" data-testid={`template-version-${template.id}`}>
                          v{template.version}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Nodes</div>
                        <div className="font-medium" data-testid={`template-nodes-${template.id}`}>
                          {template.template?.nodes?.length || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Last Updated</div>
                        <div className="font-medium" data-testid={`template-updated-${template.id}`}>
                          {formatTimeAgo(template.updatedAt)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Optimizations</div>
                        <div className="font-medium" data-testid={`template-optimizations-${template.id}`}>
                          {template.optimizationHistory?.length || 0}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <div className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          JST Timezone
                        </div>
                        <div className="flex items-center">
                          <Settings className="w-3 h-3 mr-1" />
                          Auto-Optimized
                        </div>
                      </div>
                      <Button
                        onClick={() => optimizeTemplateMutation.mutate(template.id)}
                        disabled={optimizeTemplateMutation.isPending}
                        size="sm"
                        variant="outline"
                        data-testid={`button-optimize-${template.id}`}
                      >
                        <Zap className="w-3 h-3 mr-1" />
                        Optimize
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="optimization" className="mt-6">
          {activeTemplate ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Active Template: {activeTemplate.name}
                </CardTitle>
                <CardDescription>
                  Gemini AI-powered optimization insights and recommendations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-muted rounded-lg p-4">
                    <div className="text-2xl font-bold text-chart-1">
                      {activeTemplate.performanceScore.toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Current Performance</div>
                  </div>
                  <div className="bg-muted rounded-lg p-4">
                    <div className="text-2xl font-bold text-chart-2">
                      v{activeTemplate.version}
                    </div>
                    <div className="text-sm text-muted-foreground">Template Version</div>
                  </div>
                  <div className="bg-muted rounded-lg p-4">
                    <div className="text-2xl font-bold text-chart-3">
                      {activeTemplate.optimizationHistory?.length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Optimizations</div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-3">Recent Optimization History</h4>
                  {activeTemplate.optimizationHistory && activeTemplate.optimizationHistory.length > 0 ? (
                    <div className="space-y-3">
                      {activeTemplate.optimizationHistory.slice(-3).map((optimization: any, index: number) => (
                        <div key={index} className="border rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-medium">Version {optimization.version}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatTimeAgo(optimization.timestamp)}
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground mb-2">
                            Expected improvement: {optimization.performanceImprovement}%
                          </div>
                          <div className="space-y-1">
                            {optimization.changes?.map((change: string, changeIndex: number) => (
                              <div key={changeIndex} className="text-xs bg-muted px-2 py-1 rounded">
                                {change}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <div className="text-sm">No optimizations yet</div>
                      <div className="text-xs mt-1">Click "Optimize with Gemini" to start AI-driven improvements</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <div className="text-lg font-medium mb-2">No active template</div>
              <div className="text-sm">Create or activate a template to view optimization details</div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Optimization Events</CardTitle>
              <CardDescription>
                Complete history of Gemini AI optimizations across all templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {optimizationEvents.length > 0 ? (
                <div className="space-y-4">
                  {optimizationEvents.slice(0, 10).map((event) => (
                    <div 
                      key={event.id} 
                      className="border rounded-lg p-4"
                      data-testid={`optimization-event-${event.id}`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-medium">
                            Template: {templates.find(t => t.id === event.templateId)?.name || "Unknown"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatTimeAgo(event.createdAt)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-chart-1">
                            +{event.performanceImprovement}%
                          </div>
                          <div className="text-xs text-muted-foreground">Improvement</div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Applied Changes:</div>
                        <div className="grid gap-1">
                          {Array.isArray(event.appliedChanges) ? event.appliedChanges.map((change: string, index: number) => (
                            <div key={index} className="text-xs bg-muted px-2 py-1 rounded">
                              {change}
                            </div>
                          )) : (
                            <div className="text-xs text-muted-foreground">No changes recorded</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="text-lg font-medium mb-2">No optimization events</div>
                  <div className="text-sm">Optimization events will appear here as templates are improved</div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}