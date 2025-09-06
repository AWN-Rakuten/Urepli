import { Bot, BarChart3, Workflow, Video, TrendingUp, Settings } from "lucide-react";

const navItems = [
  { id: "overview", icon: BarChart3, label: "Overview", active: true },
  { id: "workflows", icon: Workflow, label: "Workflows" },
  { id: "content", icon: Video, label: "Content Library" },
  { id: "performance", icon: TrendingUp, label: "Performance" },
  { id: "settings", icon: Settings, label: "Configuration" },
];

const systemStatus = [
  { name: "Gemini API", status: "active" },
  { name: "Google Cloud TTS", status: "active" },
  { name: "n8n Workflows", status: "warning" },
  { name: "TikTok API", status: "active" },
];

export default function Sidebar() {
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
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                item.active 
                  ? "bg-accent text-accent-foreground" 
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
              data-testid={`nav-${item.id}`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        
        {/* System Status */}
        <div className="mt-8 p-4 bg-muted rounded-lg">
          <h3 className="text-sm font-medium text-foreground mb-2">System Status</h3>
          <div className="space-y-2 text-sm">
            {systemStatus.map((service) => (
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
