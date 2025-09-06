import { VideoGeneration } from "@/components/VideoGeneration";
import { VideoGenerator } from "@/components/VideoGenerator";
import Sidebar from "@/components/Sidebar";

export default function VideoGenerationPage() {
  return (
    <div className="min-h-screen gradient-bg">
      <Sidebar />
      <main className="ml-64 p-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Video Generation</h1>
          <p className="text-muted-foreground mt-1">AI-powered video creation and management</p>
        </header>
        
        <div className="space-y-8">
          <VideoGenerator />
          <VideoGeneration />
        </div>
      </main>
    </div>
  );
}