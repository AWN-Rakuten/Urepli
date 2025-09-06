import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ConfigurationModal from "@/components/ConfigurationModal";
import { AutomationDashboard } from "@/components/AutomationDashboard";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import type { ApiConfiguration } from "@/types";

export default function ConfigurationPage() {
  const [showConfigModal, setShowConfigModal] = useState(false);

  const { data: configData, refetch } = useQuery<ApiConfiguration>({
    queryKey: ["/api/configuration"],
  });

  return (
    <div className="min-h-screen gradient-bg">
      <Sidebar />
      <main className="ml-64 p-6">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Configuration</h1>
            <p className="text-muted-foreground mt-1">System settings and automation management</p>
          </div>
          <Button 
            onClick={() => setShowConfigModal(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Settings className="w-4 h-4 mr-2" />
            API Configuration
          </Button>
        </header>
        
        <div className="space-y-8">
          <AutomationDashboard />
        </div>

        <ConfigurationModal 
          isOpen={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          currentConfig={configData}
          onConfigUpdate={() => {
            refetch();
            setShowConfigModal(false);
          }}
        />
      </main>
    </div>
  );
}