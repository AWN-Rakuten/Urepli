import { RealTimeAnalyticsDashboard } from "@/components/RealTimeAnalyticsDashboard";
import { CampaignManager } from "@/components/CampaignManager";
import Sidebar from "@/components/Sidebar";

export default function PerformancePage() {
  return (
    <div className="min-h-screen gradient-bg">
      <Sidebar />
      <main className="ml-64 p-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Performance Analytics</h1>
          <p className="text-muted-foreground mt-1">Real-time monitoring and campaign management</p>
        </header>
        
        <div className="space-y-8">
          <RealTimeAnalyticsDashboard />
          <CampaignManager />
        </div>
      </main>
    </div>
  );
}