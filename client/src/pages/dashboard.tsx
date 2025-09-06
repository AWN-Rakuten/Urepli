import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/Sidebar";
import MetricsGrid from "@/components/MetricsGrid";
import WorkflowVisualization from "@/components/WorkflowVisualization";
import BanditOptimization from "@/components/BanditOptimization";
import ContentLibrary from "@/components/ContentLibrary";
import AutomationLogs from "@/components/AutomationLogs";
import ConfigurationModal from "@/components/ConfigurationModal";
import N8nTemplates from "@/components/N8nTemplates";
import RSSStreamViewer from "@/components/RSSStreamViewer";
import { VideoGeneration } from "@/components/VideoGeneration";
import { AutomationDashboard } from "@/components/AutomationDashboard";
import { CampaignManager } from "@/components/CampaignManager";
import { VideoGenerator } from "@/components/VideoGenerator";
import { Button } from "@/components/ui/button";
import { Plus, Play, Settings } from "lucide-react";
import type { DashboardMetrics, Workflow, BanditArm, Content, AutomationLog, ApiConfiguration } from "@/types";

interface DashboardData {
  metrics: DashboardMetrics;
  workflows: Workflow[];
  banditArms: BanditArm[];
  content: Content[];
  logs: AutomationLog[];
  isConfigured: boolean;
}

export default function Dashboard() {
  const [showConfigModal, setShowConfigModal] = useState(false);

  const { data: dashboardData, isLoading, refetch } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: configData } = useQuery<ApiConfiguration>({
    queryKey: ["/api/configuration"],
  });

  const handleGenerateContent = async () => {
    try {
      // This would typically trigger a workflow execution
      const response = await fetch("/api/workflows/jp_content_pipeline/execute", {
        method: "POST",
      });
      
      if (response.ok) {
        refetch();
      }
    } catch (error) {
      console.error("Failed to generate content:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg">
      <Sidebar />
      
      <main className="ml-64 p-6">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-foreground">AI Content Automation Dashboard</h2>
            <p className="text-muted-foreground mt-1">Japanese Market Optimization • Returns-First Algorithm</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              onClick={() => setShowConfigModal(true)}
              variant="outline"
              size="sm"
              data-testid="button-config"
            >
              <Settings className="w-4 h-4 mr-2" />
              Configuration
            </Button>
            <Button 
              onClick={handleGenerateContent}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="button-generate"
            >
              <Play className="w-4 h-4 mr-2" />
              Generate Content
            </Button>
          </div>
        </header>

        {/* Show configuration warning if not configured */}
        {!dashboardData?.isConfigured && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-destructive rounded-full"></div>
              <span className="text-destructive font-medium">Configuration Required</span>
            </div>
            <p className="text-destructive/80 text-sm mt-1">
              Please configure your API keys to enable content generation and automation.
            </p>
          </div>
        )}

        {/* Metrics Grid */}
        {dashboardData && <MetricsGrid metrics={dashboardData.metrics} />}

        {/* Workflow and Bandit Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {dashboardData && (
            <>
              <WorkflowVisualization workflows={dashboardData.workflows} />
              <BanditOptimization banditArms={dashboardData.banditArms} />
            </>
          )}
        </div>

        {/* Real RSS Content Streams */}
        <div className="mb-8">
          <RSSStreamViewer />
        </div>

        {/* N8n Templates Section */}
        <div className="mb-8">
          <N8nTemplates />
        </div>

        {/* Video Generation Section */}
        <div className="mb-8">
          <VideoGeneration />
        </div>

        {/* Full Automation Pipeline */}
        <div className="mb-8">
          <AutomationDashboard />
        </div>

        {/* AI Video Generator with Thinking */}
        <div className="mb-8">
          <VideoGenerator />
        </div>

        {/* Campaign Management */}
        <div className="mb-8">
          <CampaignManager />
        </div>

        {/* Content and Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {dashboardData && (
            <>
              <div className="lg:col-span-2">
                <ContentLibrary content={dashboardData.content} />
              </div>
              <AutomationLogs logs={dashboardData.logs} />
            </>
          )}
        </div>
      </main>

      {/* Configuration Modal */}
      <ConfigurationModal 
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        currentConfig={configData}
        onConfigUpdate={() => {
          refetch();
          setShowConfigModal(false);
        }}
      />
    </div>
  );
}
