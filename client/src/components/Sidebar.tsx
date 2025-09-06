import { Bot, BarChart3, Workflow, Video, TrendingUp, Settings, Clapperboard, Users } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

const navItems = [
  { id: "overview", path: "/", icon: BarChart3, label: "Overview" },
  { id: "workflows", path: "/workflows", icon: Workflow, label: "Workflows" },
  { id: "content", path: "/content", icon: Video, label: "Content Library" },
  { id: "video-generation", path: "/video-generation", icon: Clapperboard, label: "Video Generation" },
  { id: "performance", path: "/performance", icon: TrendingUp, label: "Performance" },
  { id: "accounts", path: "/accounts", icon: Users, label: "Accounts" },
  { id: "settings", path: "/settings", icon: Settings, label: "Configuration" },
];

export default function Sidebar() {
  const [location] = useLocation();
  
  // Get real-time system status
  const { data: providers } = useQuery({
    queryKey: ['/api/campaigns/providers'],
    refetchInterval: 60000
  });

  const getSystemStatus = () => {
    if (!providers) return [];
    
    return [
      { 
        name: "Gemini API", 
        status: providers.gemini?.available ? "active" : "error" 
      },
      { 
        name: "Meta Ads API", 
        status: providers.meta?.available ? "active" : "error" 
      },
      { 
        name: "TikTok Ads API", 
        status: providers.tiktok?.available ? "active" : "error" 
      },
      { 
        name: "Optimization Engine", 
        status: providers.optimization?.available ? "active" : "error" 
      },
    ];
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border z-50">
      <div className="p-6">
        {/* Logo */}
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Bot className="text-primary-foreground text-lg" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground" data-testid="text-app-title">MNP Dashboard</h1>
            <p className="text-xs text-muted-foreground">AI Content Automation</p>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.path;
            return (
              <Link key={item.id} href={item.path}>
                <button
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive 
                      ? "bg-accent text-accent-foreground" 
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                  data-testid={`nav-${item.id}`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              </Link>
            );
          })}
        </nav>
        
        {/* Real System Status */}
        <div className="mt-8 p-4 bg-muted rounded-lg">
          <h3 className="text-sm font-medium text-foreground mb-2">System Status</h3>
          <div className="space-y-2 text-sm">
            {getSystemStatus().map((service) => (
              <div key={service.name} className="flex items-center">
                <span className={`status-dot status-${service.status}`}></span>
                <span className="text-muted-foreground" data-testid={`status-${service.name.toLowerCase().replace(/\s+/g, '-')}`}>
                  {service.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
