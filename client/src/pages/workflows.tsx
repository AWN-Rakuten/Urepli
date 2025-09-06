import { AdvancedOptimizationDashboard } from "@/components/AdvancedOptimizationDashboard";
import Sidebar from "@/components/Sidebar";

export default function WorkflowsPage() {
  return (
    <div className="min-h-screen gradient-bg">
      <Sidebar />
      <main className="ml-64 p-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Workflow Management</h1>
          <p className="text-muted-foreground mt-1">Advanced optimization and workflow automation</p>
        </header>
        <AdvancedOptimizationDashboard />
      </main>
    </div>
  );
}