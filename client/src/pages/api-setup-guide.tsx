import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, ExternalLink, Copy, Key, Zap, Globe, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ApiSetupGuide = () => {
  const [copiedText, setCopiedText] = useState<string>("");
  const { toast } = useToast();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
    setTimeout(() => setCopiedText(""), 2000);
  };

  const apiIntegrations = {
    affiliate: {
      title: "Affiliate Programs",
      description: "Real Japanese affiliate programs with high ROI potential",
      icon: TrendingUp,
      color: "bg-green-500",
      programs: [
        {
          name: "Rakuten Mobile",
          description: "Up to 10,000 points per referral",
          status: "ready",
          setupUrl: "https://network.mobile.rakuten.co.jp/en/campaign/referral/",
          commission: "¥10,000 equivalent",
          approval: "Instant"
        },
        {
          name: "A8.net Network",
          description: "Japan's largest affiliate network",
          status: "ready", 
          setupUrl: "https://pub.a8.net/",
          commission: "¥3,000-¥100,000+",
          approval: "Required"
        },
        {
          name: "Amazon Japan",
          description: "Variable commission on diverse products",
          status: "ready",
          setupUrl: "https://affiliate.amazon.co.jp/",
          commission: "2-20%",
          approval: "Required"
        },
        {
          name: "YesStyle",
          description: "Beauty & fashion affiliate program",
          status: "ready",
          setupUrl: "https://www.yesstyle.com/en/affiliate-program.html",
          commission: "Up to 15%",
          approval: "Required"
        }
      ]
    },
    social: {
      title: "Social Media Platforms",
      description: "Connect and manage TikTok, Instagram & YouTube accounts",
      icon: Globe,
      color: "bg-purple-500",
      platforms: [
        {
          name: "TikTok",
          description: "Video content and user management",
          status: process.env.VITE_TIKTOK_CLIENT_KEY ? "configured" : "needs_setup",
          envVars: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET", "TIKTOK_REDIRECT_URI"],
          setupSteps: [
            "Go to TikTok for Developers",
            "Create a new app",
            "Get Client Key and Client Secret",
            "Set redirect URI to your domain/api/social/connect/callback",
            "Add environment variables to your system"
          ],
          scopes: ["user.info.basic", "video.list", "video.upload"],
          limits: "10 posts/day, 3 posts/hour"
        },
        {
          name: "Instagram",
          description: "Photo/video posts, stories, and reels",
          status: process.env.VITE_INSTAGRAM_CLIENT_ID ? "configured" : "needs_setup",
          envVars: ["INSTAGRAM_CLIENT_ID", "INSTAGRAM_CLIENT_SECRET", "INSTAGRAM_REDIRECT_URI"],
          setupSteps: [
            "Go to Facebook for Developers",
            "Create a new app with Instagram Basic Display",
            "Get App ID and App Secret",
            "Add Instagram Basic Display product",
            "Set redirect URI and configure permissions"
          ],
          scopes: ["instagram_basic", "instagram_content_publish"],
          limits: "25 posts/day, 6 posts/hour"
        }
      ]
    },
    ai: {
      title: "AI & Content Generation",
      description: "Configure Gemini AI and video generation services",
      icon: Zap,
      color: "bg-blue-500",
      services: [
        {
          name: "Google Gemini",
          description: "Japanese content generation and optimization",
          status: process.env.VITE_GEMINI_API_KEY ? "configured" : "needs_setup",
          envVar: "GEMINI_API_KEY",
          setupSteps: [
            "Go to Google AI Studio",
            "Create a new API key",
            "Enable Gemini API access",
            "Add the API key to your environment"
          ],
          features: ["Japanese script generation", "Content optimization", "Seed management"]
        },
        {
          name: "Mochi Video AI",
          description: "Advanced video generation service",
          status: process.env.VITE_MOCHI_API_KEY ? "configured" : "needs_setup",
          envVar: "MOCHI_API_KEY",
          setupSteps: [
            "Sign up for Mochi AI",
            "Get your API key from dashboard",
            "Add API key to environment variables"
          ],
          features: ["High-quality video generation", "Japanese market optimization"]
        },
        {
          name: "Luma Dream Machine",
          description: "Alternative video generation service",
          status: process.env.VITE_LUMA_API_KEY ? "configured" : "needs_setup",
          envVar: "LUMA_API_KEY",
          setupSteps: [
            "Sign up for Luma AI",
            "Access API section",
            "Generate API key",
            "Configure in environment"
          ],
          features: ["Creative video generation", "Multiple styles support"]
        }
      ]
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "configured":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "ready":
        return <CheckCircle2 className="h-5 w-5 text-blue-500" />;
      default:
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      configured: "bg-green-100 text-green-800",
      ready: "bg-blue-100 text-blue-800", 
      needs_setup: "bg-red-100 text-red-800"
    };
    
    return (
      <Badge className={variants[status as keyof typeof variants] || variants.needs_setup}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            API Integration Setup Guide
          </h1>
          <p className="text-slate-600 dark:text-slate-300">
            Complete guide to setting up all external API integrations for maximum revenue optimization
          </p>
        </div>

        <Tabs defaultValue="affiliate" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            {Object.entries(apiIntegrations).map(([key, integration]) => {
              const Icon = integration.icon;
              return (
                <TabsTrigger key={key} value={key} className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {integration.title}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Affiliate Programs Tab */}
          <TabsContent value="affiliate" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Real Japanese Affiliate Programs
                </CardTitle>
                <CardDescription>
                  High-converting affiliate programs specifically selected for the Japanese market.
                  No mock data - these are real programs with proven ROI.
                </CardDescription>
              </CardHeader>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {apiIntegrations.affiliate.programs.map((program) => (
                <Card key={program.name} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{program.name}</CardTitle>
                      {getStatusIcon(program.status)}
                    </div>
                    <CardDescription>{program.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Commission</p>
                        <p className="text-sm font-bold text-green-600">{program.commission}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Approval</p>
                        <p className="text-sm">{program.approval}</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => window.open(program.setupUrl, '_blank')}
                        data-testid={`button-setup-${program.name.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Setup Account
                      </Button>
                      {getStatusBadge(program.status)}
                    </div>

                    <Alert>
                      <Key className="h-4 w-4" />
                      <AlertDescription>
                        After signup, use our affiliate tracking system to create optimized links and monitor KPIs automatically.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
              <CardHeader>
                <CardTitle className="text-green-800 dark:text-green-100">Integration Benefits</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-green-700 dark:text-green-200">Real Revenue Tracking</h4>
                    <p className="text-sm text-green-600 dark:text-green-300">Track actual sales and commissions, not estimates</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-700 dark:text-green-200">Automatic Optimization</h4>
                    <p className="text-sm text-green-600 dark:text-green-300">AI-powered link placement and content optimization</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-700 dark:text-green-200">KPI Monitoring</h4>
                    <p className="text-sm text-green-600 dark:text-green-300">Real-time conversion rates, clicks, and revenue data</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-700 dark:text-green-200">Japanese Market Focus</h4>
                    <p className="text-sm text-green-600 dark:text-green-300">Programs specifically selected for Japanese audiences</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Social Media Tab */}
          <TabsContent value="social" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-purple-500" />
                  Social Media Platform Integration
                </CardTitle>
                <CardDescription>
                  Connect your TikTok and Instagram accounts for automated posting and account management.
                </CardDescription>
              </CardHeader>
            </Card>

            <div className="space-y-6">
              {apiIntegrations.social.platforms.map((platform) => (
                <Card key={platform.name} className="relative">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">{platform.name}</CardTitle>
                        <CardDescription>{platform.description}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(platform.status)}
                        {getStatusBadge(platform.status)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-3">Environment Variables</h4>
                        <div className="space-y-2">
                          {platform.envVars.map((envVar) => (
                            <div key={envVar} className="flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-800 rounded-md">
                              <code className="text-sm">{envVar}</code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(envVar, envVar)}
                                data-testid={`button-copy-${envVar.toLowerCase()}`}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-3">Setup Steps</h4>
                        <ol className="space-y-2">
                          {platform.setupSteps.map((step, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="flex-shrink-0 w-5 h-5 bg-purple-100 text-purple-600 rounded-full text-xs flex items-center justify-center mt-0.5">
                                {index + 1}
                              </span>
                              <span className="text-sm">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <h5 className="font-medium text-slate-600 dark:text-slate-300">Required Scopes</h5>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {platform.scopes.map((scope) => (
                            <Badge key={scope} variant="secondary" className="text-xs">
                              {scope}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h5 className="font-medium text-slate-600 dark:text-slate-300">Posting Limits</h5>
                        <p className="text-sm mt-1">{platform.limits}</p>
                      </div>
                    </div>

                    {platform.status === "needs_setup" && (
                      <Alert>
                        <Key className="h-4 w-4" />
                        <AlertDescription>
                          {platform.name} integration is not configured. Follow the setup steps above to enable automated posting.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* AI Services Tab */}
          <TabsContent value="ai" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-blue-500" />
                  AI & Content Generation Services
                </CardTitle>
                <CardDescription>
                  Configure AI services for Japanese content generation and video creation.
                </CardDescription>
              </CardHeader>
            </Card>

            <div className="space-y-6">
              {apiIntegrations.ai.services.map((service) => (
                <Card key={service.name} className="relative">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">{service.name}</CardTitle>
                        <CardDescription>{service.description}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(service.status)}
                        {getStatusBadge(service.status)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-3">Environment Variable</h4>
                        <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-md">
                          <code className="text-sm font-mono">{service.envVar}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(service.envVar, service.envVar)}
                            data-testid={`button-copy-${service.envVar.toLowerCase()}`}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-3">Features</h4>
                        <ul className="space-y-1">
                          {service.features.map((feature, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                              <span className="text-sm">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3">Setup Instructions</h4>
                      <ol className="space-y-2">
                        {service.setupSteps.map((step, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs flex items-center justify-center mt-0.5">
                              {index + 1}
                            </span>
                            <span className="text-sm">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {service.status === "needs_setup" && (
                      <Alert>
                        <Key className="h-4 w-4" />
                        <AlertDescription>
                          {service.name} is not configured. This service is required for optimal content generation.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ApiSetupGuide;