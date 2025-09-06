export interface DashboardMetrics {
  totalRevenue: number;
  contentCount: number;
  roas: number;
  activeWorkflows: number;
}

export interface Workflow {
  id: string;
  name: string;
  template: any;
  status: string;
  lastExecution: string | null;
  successRate: number;
  createdAt: string;
}

export interface BanditArm {
  id: string;
  name: string;
  platform: string;
  hookType: string;
  score: number;
  allocation: number;
  profit: number;
  cost: number;
  updatedAt: string;
}

export interface Content {
  id: string;
  title: string;
  platform: string;
  status: string;
  views: number;
  revenue: number;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  armId: string | null;
  createdAt: string;
}

export interface AutomationLog {
  id: string;
  type: string;
  message: string;
  status: string;
  workflowId: string | null;
  metadata: any;
  createdAt: string;
}

export interface ApiConfiguration {
  hasGeminiKey: boolean;
  hasGoogleCredentials: boolean;
  googleCloudBucket: string | null;
  hasTiktokToken: boolean;
  hasInstagramToken: boolean;
  isConfigured: boolean;
  updatedAt: string;
}

export interface ContentScript {
  title: string;
  script: string;
  hooks: string[];
  targetAudience: string;
  estimatedEngagement: number;
}

export interface WorkflowOptimization {
  optimizations: string[];
  suggestedParameters: Record<string, any>;
  reasoning: string;
  expectedImprovement: number;
}

export interface N8nTemplate {
  id: string;
  name: string;
  description: string | null;
  template: any;
  version: number;
  performanceScore: number;
  isActive: boolean;
  optimizationHistory: any[];
  createdAt: string;
  updatedAt: string;
}

export interface OptimizationEvent {
  id: string;
  templateId: string;
  performanceData: any;
  geminiAnalysis: any;
  appliedChanges: any;
  performanceImprovement: number | null;
  status: string;
  createdAt: string;
}
