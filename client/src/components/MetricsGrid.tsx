import { JapaneseYen, Video, TrendingUp, Workflow } from "lucide-react";
import type { DashboardMetrics } from "@/types";

interface MetricsGridProps {
  metrics: DashboardMetrics;
}

export default function MetricsGrid({ metrics }: MetricsGridProps) {
  const metricCards = [
    {
      title: "Total Revenue (¥)",
      value: `¥${metrics.totalRevenue.toLocaleString()}`,
      change: "+23.5% from last week",
      icon: JapaneseYen,
      color: "text-chart-1",
      testId: "metric-revenue"
    },
    {
      title: "Content Generated",
      value: metrics.contentCount.toLocaleString(),
      change: "+18 today",
      icon: Video,
      color: "text-chart-2",
      testId: "metric-content"
    },
    {
      title: "ROAS",
      value: `${metrics.roas}x`,
      change: "Above 3.5x target",
      icon: TrendingUp,
      color: "text-chart-3",
      testId: "metric-roas"
    },
    {
      title: "Active Workflows",
      value: metrics.activeWorkflows.toString(),
      change: "3 optimizing",
      icon: Workflow,
      color: "text-chart-4",
      testId: "metric-workflows"
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {metricCards.map((metric) => (
        <div key={metric.title} className="metric-card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">{metric.title}</h3>
            <metric.icon className={`w-5 h-5 ${metric.color}`} />
          </div>
          <div className="text-2xl font-bold text-foreground" data-testid={`${metric.testId}-value`}>
            {metric.value}
          </div>
          <div className={`text-xs ${metric.color} mt-1`} data-testid={`${metric.testId}-change`}>
            {metric.change}
          </div>
        </div>
      ))}
    </div>
  );
}
