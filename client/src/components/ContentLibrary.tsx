import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Content } from "@/types";

interface ContentLibraryProps {
  content: Content[];
}

export default function ContentLibrary({ content }: ContentLibraryProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published": return "status-active";
      case "processing": return "status-warning";
      case "failed": return "status-error";
      default: return "status-idle";
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "tiktok": return "text-chart-1 bg-chart-1/10";
      case "instagram": return "text-chart-2 bg-chart-2/10";
      case "youtube": return "text-chart-3 bg-chart-3/10";
      default: return "text-chart-4 bg-chart-4/10";
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const handleGenerateContent = async () => {
    setIsGenerating(true);
    try {
      // Generate new content
      const scriptResponse = await fetch("/api/content/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche: "investment_tips",
          platform: "TikTok",
          hookType: "kawaii_hook_b"
        })
      });

      if (scriptResponse.ok) {
        const script = await scriptResponse.json();
        
        // Create content
        await fetch("/api/content/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: script.title,
            platform: "TikTok",
            armId: null,
            script: script.script
          })
        });
      }
    } catch (error) {
      console.error("Failed to generate content:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Recent Generated Content</h3>
        <Button 
          onClick={handleGenerateContent}
          disabled={isGenerating}
          variant="outline"
          size="sm"
          data-testid="button-generate-content"
        >
          {isGenerating ? "Generating..." : "Generate New"}
        </Button>
      </div>
      
      {content.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <div className="text-lg font-medium mb-2">No content generated yet</div>
          <div className="text-sm">Click "Generate New" to create your first piece of content</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {content.slice(0, 6).map((item) => (
            <div 
              key={item.id} 
              className="bg-muted rounded-lg p-4 hover:bg-muted/80 transition-colors cursor-pointer"
              data-testid={`content-item-${item.id}`}
            >
              {item.thumbnailUrl && (
                <img 
                  src={item.thumbnailUrl} 
                  alt="Generated video thumbnail" 
                  className="w-full h-32 object-cover rounded-lg mb-3" 
                />
              )}
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-foreground" data-testid={`content-title-${item.id}`}>
                  {item.title}
                </h4>
                <span className={`text-xs px-2 py-1 rounded ${getPlatformColor(item.platform)}`}>
                  {item.platform}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span data-testid={`content-views-${item.id}`}>
                  {item.views.toLocaleString()} views
                </span>
                <span data-testid={`content-revenue-${item.id}`}>
                  ¥{item.revenue.toLocaleString()}
                </span>
              </div>
              <div className="mt-2">
                <div className="flex items-center space-x-2 text-xs">
                  <span className={`status-dot ${getStatusColor(item.status)}`}></span>
                  <span className="text-muted-foreground" data-testid={`content-status-${item.id}`}>
                    {item.status}
                  </span>
                  <span className="text-muted-foreground">
                    • {formatTimeAgo(item.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
