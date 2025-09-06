import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import WorkflowsPage from "@/pages/workflows";
import ContentLibraryPage from "@/pages/content-library";
import VideoGenerationPage from "@/pages/video-generation";
import PerformancePage from "@/pages/performance";
import ConfigurationPage from "@/pages/configuration";
import AccountManagement from "@/pages/account-management";
import ApiSetupGuide from "@/pages/api-setup-guide";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/workflows" component={WorkflowsPage} />
      <Route path="/content" component={ContentLibraryPage} />
      <Route path="/video-generation" component={VideoGenerationPage} />
      <Route path="/performance" component={PerformancePage} />
      <Route path="/accounts" component={AccountManagement} />
      <Route path="/api-setup" component={ApiSetupGuide} />
      <Route path="/settings" component={ConfigurationPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="dark">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
