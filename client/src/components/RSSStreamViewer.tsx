import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Rss, ExternalLink, Play, BarChart3, Zap } from "lucide-react";

interface StreamConfig {
  key: string;
  display: string;
  style_primary: string;
  has_affiliate: boolean;
  keywords: string[];
  sources_rss: string[];
}

interface RSSItem {
  id: string;
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  stream: string;
  score: number;
}

export default function RSSStreamViewer() {
  const [selectedStream, setSelectedStream] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: streams = [], isLoading: streamsLoading } = useQuery<StreamConfig[]>({
    queryKey: ["/api/rss/streams"],
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: streamContent = [], isLoading: contentLoading } = useQuery<RSSItem[]>({
    queryKey: ["/api/rss/content", selectedStream],
    enabled: !!selectedStream,
    refetchInterval: 30000,
  });

  const generateContentMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/content/auto-generate", {});
    },
    onSuccess: () => {
      toast({
        title: "Content generation started",
        description: "RSS-based content generation is now running",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
    onError: (error: any) => {
      toast({
        title: "Generation failed",
        description: error.message || "Failed to start content generation",
        variant: "destructive",
      });
    },
  });

  const updateAnalyticsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/content/update-analytics", {});
    },
    onSuccess: () => {
      toast({
        title: "Analytics updated",
        description: "Content analytics have been refreshed",
      });
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

  if (streamsLoading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="text-foreground">Loading RSS streams...</div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center">
            <Rss className="w-5 h-5 mr-2 text-primary" />
            Real RSS Content Streams
          </h3>
          <p className="text-sm text-muted-foreground">
            Live Japanese news feeds across 10 content categories
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => updateAnalyticsMutation.mutate()}
            disabled={updateAnalyticsMutation.isPending}
            variant="outline"
            size="sm"
            data-testid="button-update-analytics"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            {updateAnalyticsMutation.isPending ? "Updating..." : "Update Analytics"}
          </Button>
          <Button
            onClick={() => generateContentMutation.mutate()}
            disabled={generateContentMutation.isPending}
            size="sm"
            data-testid="button-generate-content"
          >
            <Zap className="w-4 h-4 mr-2" />
            {generateContentMutation.isPending ? "Generating..." : "Generate Content"}
          </Button>
        </div>
      </div>

      <Tabs value={selectedStream || streams[0]?.key} onValueChange={setSelectedStream}>
        <TabsList className="grid w-full grid-cols-5 mb-6">
          {streams.slice(0, 5).map((stream) => (
            <TabsTrigger 
              key={stream.key} 
              value={stream.key}
              data-testid={`tab-stream-${stream.key}`}
            >
              {stream.display.split('/')[0]}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {streams.map((stream) => (
            <Card 
              key={stream.key} 
              className={`cursor-pointer transition-colors ${
                selectedStream === stream.key ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedStream(stream.key)}
              data-testid={`stream-card-${stream.key}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{stream.display}</CardTitle>
                  {stream.has_affiliate && (
                    <Badge variant="secondary" className="text-xs">Affiliate</Badge>
                  )}
                </div>
                <CardDescription className="text-sm">
                  Style: {stream.style_primary} • Keywords: {stream.keywords.length}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xs text-muted-foreground">
                  Sources: {stream.sources_rss.length} RSS feeds
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {stream.keywords.slice(0, 3).map((keyword, idx) => (
                    <span 
                      key={idx}
                      className="text-xs bg-muted px-1 py-0.5 rounded"
                    >
                      {keyword}
                    </span>
                  ))}
                  {stream.keywords.length > 3 && (
                    <span className="text-xs text-muted-foreground">
                      +{stream.keywords.length - 3} more
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {streams.map((stream) => (
          <TabsContent key={stream.key} value={stream.key}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Rss className="w-5 h-5 mr-2" />
                  {stream.display} - Latest Content
                </CardTitle>
                <CardDescription>
                  Live RSS feed content ranked by relevance and engagement potential
                </CardDescription>
              </CardHeader>
              <CardContent>
                {contentLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading content...
                  </div>
                ) : streamContent.length > 0 ? (
                  <div className="space-y-4">
                    {streamContent.map((item, index) => (
                      <div 
                        key={item.id} 
                        className="border rounded-lg p-4"
                        data-testid={`rss-item-${index}`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h4 className="font-medium text-foreground mb-1">
                              {item.title}
                            </h4>
                            <div className="flex items-center text-sm text-muted-foreground space-x-4">
                              <span>Source: {item.source}</span>
                              <span>Score: {item.score}</span>
                              <span>{formatTimeAgo(item.publishedAt)}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <Badge 
                              variant={item.score > 3 ? "default" : "secondary"}
                              className="text-xs"
                            >
                              Score: {item.score}
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(item.link, '_blank')}
                              data-testid={`button-view-${index}`}
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              View
                            </Button>
                          </div>
                        </div>
                        
                        <Separator className="my-3" />
                        
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Stream: {item.stream}</span>
                          <span>Published: {new Date(item.publishedAt).toLocaleDateString('ja-JP')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="text-lg font-medium mb-2">No content available</div>
                    <div className="text-sm">Check RSS sources or try refreshing</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}