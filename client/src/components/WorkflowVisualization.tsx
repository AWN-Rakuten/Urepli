import { Clock, Bot, Mic, Video, Upload, Share2 } from "lucide-react";
import type { Workflow } from "@/types";

interface WorkflowVisualizationProps {
  workflows: Workflow[];
}

const workflowNodes = [
  { id: "trigger", name: "Schedule Trigger", icon: Clock, details: "Every 2 hours", color: "text-primary" },
  { id: "gemini", name: "Gemini API", icon: Bot, details: "Script Generation", color: "text-chart-1" },
  { id: "tts", name: "GCloud TTS", icon: Mic, details: "ja-JP-Wavenet-F", color: "text-chart-2" },
  { id: "assembly", name: "Video Assembly", icon: Video, details: "Cloud Storage", color: "text-chart-3" },
  { id: "upload", name: "Cloud Upload", icon: Upload, details: "MP4 Storage", color: "text-chart-4" },
  { id: "distribution", name: "Multi-Platform", icon: Share2, details: "TikTok 70% | IG 30%", color: "text-chart-5" },
];

export default function WorkflowVisualization({ workflows }: WorkflowVisualizationProps) {
  const activeWorkflow = workflows.find(w => w.status === 'running') || workflows[0];

  const formatTimeAgo = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 60) return `${diffMins} minutes ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${Math.floor(diffHours / 24)} days ago`;
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Active Workflow: JP Content Pipeline</h3>
        <div className="flex items-center space-x-2">
          <span className={`status-dot ${activeWorkflow?.status === 'running' ? 'status-active' : 'status-idle'}`}></span>
          <span className="text-sm text-muted-foreground" data-testid="workflow-status">
            {activeWorkflow?.status || 'Idle'}
          </span>
        </div>
      </div>
      
      <div className="workflow-visualization">
        {workflowNodes.map((node, index) => (
          <div key={node.id}>
            <div className="workflow-node" data-testid={`workflow-node-${node.id}`}>
              <node.icon className={`w-6 h-6 ${node.color} mb-2 mx-auto`} />
              <div className="text-sm font-medium">{node.name}</div>
              <div className="text-xs text-muted-foreground">{node.details}</div>
            </div>
            {index < workflowNodes.length - 1 && (
              <div className="workflow-connector"></div>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Last execution:</span>
          <span className="text-foreground" data-testid="workflow-last-execution">
            {formatTimeAgo(activeWorkflow?.lastExecution || null)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm mt-2">
          <span className="text-muted-foreground">Success rate:</span>
          <span className="text-chart-2" data-testid="workflow-success-rate">
            {activeWorkflow ? `${activeWorkflow.successRate}%` : "0%"}
          </span>
        </div>
      </div>
    </div>
  );
}
