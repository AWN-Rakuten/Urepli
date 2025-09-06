import { useQuery } from "@tanstack/react-query";
import ContentLibrary from "@/components/ContentLibrary";
import Sidebar from "@/components/Sidebar";

export default function ContentLibraryPage() {
  const { data: dashboardData } = useQuery({
    queryKey: ["/api/dashboard"],
  });

  return (
    <div className="min-h-screen gradient-bg">
      <Sidebar />
      <main className="ml-64 p-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Content Library</h1>
          <p className="text-muted-foreground mt-1">Manage and organize your automated content</p>
        </header>
        <ContentLibrary content={dashboardData?.content || []} />
      </main>
    </div>
  );
}