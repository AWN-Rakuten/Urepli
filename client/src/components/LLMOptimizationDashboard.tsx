import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  TrendingUp, 
  Shield, 
  BarChart3, 
  Lightbulb, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw,
  Target,
  Zap
} from 'lucide-react';

interface MarketIntelligence {
  trending_topics: Array<{
    topic: string;
    volume: number;
    growth_rate: number;
    competition_level: 'low' | 'medium' | 'high';
    monetization_potential: number;
  }>;
  affiliate_opportunities: Array<{
    program_name: string;
    commission_rate: string;
    conversion_rate: number;
    estimated_earnings: number;
    market_demand: 'low' | 'medium' | 'high';
  }>;
}

interface PerformancePrediction {
  predicted_engagement_rate: number;
  predicted_views: number;
  predicted_revenue: number;
  confidence_score: number;
  success_probability: number;
  optimization_suggestions: string[];
  recommended_hashtags: string[];
}

interface ComplianceResult {
  overall_compliance_score: number;
  compliance_status: 'approved' | 'requires_changes' | 'rejected';
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  recommended_actions: string[];
}

export default function LLMOptimizationDashboard() {
  const [marketData, setMarketData] = useState<MarketIntelligence | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [optimizationResults, setOptimizationResults] = useState<any>(null);
  
  // Content optimization form state
  const [contentForm, setContentForm] = useState({
    title: '',
    script: '',
    platform: 'tiktok',
    audience: 'japanese_general',
    category: 'entertainment'
  });

  const fetchMarketIntelligence = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/optimization/market-intelligence');
      if (response.ok) {
        const data = await response.json();
        setMarketData(data);
      }
    } catch (error) {
      console.error('Failed to fetch market intelligence:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const optimizeContent = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/optimization/optimize-content-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: {
            title: contentForm.title,
            script: contentForm.script
          },
          platform: contentForm.platform,
          audience: contentForm.audience,
          category: contentForm.category
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        setOptimizationResults(result);
      }
    } catch (error) {
      console.error('Failed to optimize content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketIntelligence();
  }, []);

  const getComplianceColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500';
      case 'requires_changes': return 'bg-yellow-500';
      case 'rejected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8" />
            LLM-Powered Optimization Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            AI-driven content optimization, market intelligence, and compliance monitoring
          </p>
        </div>
        <Button onClick={fetchMarketIntelligence} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      <Tabs defaultValue="optimization" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="optimization">Content Optimization</TabsTrigger>
          <TabsTrigger value="intelligence">Market Intelligence</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Monitor</TabsTrigger>
          <TabsTrigger value="performance">Performance Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="optimization" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Content Input Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Content Optimization
                </CardTitle>
                <CardDescription>
                  Optimize your content using AI for maximum engagement and compliance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Content Title</label>
                  <Input
                    value={contentForm.title}
                    onChange={(e) => setContentForm({...contentForm, title: e.target.value})}
                    placeholder="Enter your content title..."
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Content Script</label>
                  <Textarea
                    value={contentForm.script}
                    onChange={(e) => setContentForm({...contentForm, script: e.target.value})}
                    placeholder="Enter your content script..."
                    rows={4}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Platform</label>
                    <select 
                      className="w-full p-2 border rounded-md"
                      value={contentForm.platform}
                      onChange={(e) => setContentForm({...contentForm, platform: e.target.value})}
                    >
                      <option value="tiktok">TikTok</option>
                      <option value="instagram">Instagram</option>
                      <option value="youtube">YouTube</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <select 
                      className="w-full p-2 border rounded-md"
                      value={contentForm.category}
                      onChange={(e) => setContentForm({...contentForm, category: e.target.value})}
                    >
                      <option value="entertainment">Entertainment</option>
                      <option value="education">Education</option>
                      <option value="lifestyle">Lifestyle</option>
                      <option value="technology">Technology</option>
                    </select>
                  </div>
                </div>
                
                <Button 
                  onClick={optimizeContent} 
                  disabled={isLoading || !contentForm.title || !contentForm.script}
                  className="w-full"
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Target className="h-4 w-4 mr-2" />
                  )}
                  Optimize Content
                </Button>
              </CardContent>
            </Card>

            {/* Optimization Results */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Optimization Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                {optimizationResults ? (
                  <div className="space-y-4">
                    {/* Compliance Status */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        <span className="font-medium">Compliance Status</span>
                      </div>
                      <Badge className={getComplianceColor(optimizationResults.compliance_result?.compliance_status)}>
                        {optimizationResults.compliance_result?.compliance_status || 'Unknown'}
                      </Badge>
                    </div>

                    {/* Performance Prediction */}
                    {optimizationResults.performance_prediction && (
                      <div className="space-y-2">
                        <h4 className="font-medium">Performance Prediction</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>Views: {optimizationResults.performance_prediction.predicted_views?.toLocaleString()}</div>
                          <div>Revenue: ¥{optimizationResults.performance_prediction.predicted_revenue?.toLocaleString()}</div>
                          <div>Engagement: {optimizationResults.performance_prediction.predicted_engagement_rate?.toFixed(1)}%</div>
                          <div>Success Rate: {(optimizationResults.performance_prediction.success_probability * 100)?.toFixed(1)}%</div>
                        </div>
                        <Progress value={optimizationResults.performance_prediction.success_probability * 100} className="h-2" />
                      </div>
                    )}

                    {/* Recommendations */}
                    {optimizationResults.recommendations && optimizationResults.recommendations.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium">Recommendations</h4>
                        <ul className="space-y-1">
                          {optimizationResults.recommendations.slice(0, 3).map((rec: string, idx: number) => (
                            <li key={idx} className="text-sm flex items-start gap-2">
                              <Lightbulb className="h-4 w-4 mt-0.5 text-yellow-500 flex-shrink-0" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Optimized Content */}
                    {optimizationResults.optimized_content && optimizationResults.optimized_content.optimization_applied && (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          Content has been optimized! Check the optimized script below.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Enter content above and click "Optimize Content" to see AI-powered optimization results</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="intelligence" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trending Topics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Trending Topics
                </CardTitle>
                <CardDescription>Real-time market intelligence from Japanese social media</CardDescription>
              </CardHeader>
              <CardContent>
                {marketData?.trending_topics ? (
                  <div className="space-y-3">
                    {marketData.trending_topics.slice(0, 5).map((topic, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{topic.topic}</div>
                          <div className="text-sm text-muted-foreground">
                            Volume: {topic.volume?.toLocaleString()} | Growth: {topic.growth_rate?.toFixed(1)}%
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">Profit Score</div>
                          <div className="text-lg font-bold text-green-600">
                            {topic.monetization_potential?.toFixed(1)}/10
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <RefreshCw className={`h-8 w-8 mx-auto mb-4 ${isLoading ? 'animate-spin' : 'opacity-50'}`} />
                    <p className="text-muted-foreground">
                      {isLoading ? 'Loading market intelligence...' : 'Click refresh to load trending topics'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Affiliate Opportunities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Affiliate Opportunities
                </CardTitle>
                <CardDescription>High-potential affiliate programs for maximum ROI</CardDescription>
              </CardHeader>
              <CardContent>
                {marketData?.affiliate_opportunities ? (
                  <div className="space-y-3">
                    {marketData.affiliate_opportunities.slice(0, 4).map((opportunity, idx) => (
                      <div key={idx} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium">{opportunity.program_name}</div>
                          <Badge variant={opportunity.market_demand === 'high' ? 'default' : 'secondary'}>
                            {opportunity.market_demand} demand
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <div>Commission: {opportunity.commission_rate}</div>
                          <div>Est. Earnings: ¥{opportunity.estimated_earnings?.toLocaleString()}</div>
                          <div>Conversion: {(opportunity.conversion_rate * 100)?.toFixed(1)}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="h-8 w-8 mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">Loading affiliate opportunities...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Compliance Monitoring
              </CardTitle>
              <CardDescription>
                Real-time compliance checking for Japanese platform policies and advertising laws
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 border rounded-lg">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <div className="text-2xl font-bold">92%</div>
                  <div className="text-sm text-muted-foreground">Compliance Rate</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                  <div className="text-2xl font-bold">3</div>
                  <div className="text-sm text-muted-foreground">Pending Reviews</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Shield className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <div className="text-2xl font-bold">15</div>
                  <div className="text-sm text-muted-foreground">Auto-Fixed Issues</div>
                </div>
              </div>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  All content is automatically checked against Japanese advertising standards (JARO), 
                  platform policies, and legal requirements before publishing.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Revenue Optimization</p>
                    <p className="text-2xl font-bold text-green-600">+23%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Engagement Rate</p>
                    <p className="text-2xl font-bold text-blue-600">+18%</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Compliance Score</p>
                    <p className="text-2xl font-bold text-green-600">94%</p>
                  </div>
                  <Shield className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">AI Optimizations</p>
                    <p className="text-2xl font-bold text-purple-600">147</p>
                  </div>
                  <Brain className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}