// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

// Advanced Optimization Types
export interface OptimizationInsights {
  insights: {
    totalArms: number;
    averageReward: number;
    optimalTimes: Array<{
      time: string;
      score: number;
      platform: string;
    }>;
    ensembles: Array<{
      id: string;
      name: string;
      performance: number;
      configuration: Record<string, any>;
    }>;
  };
}

// Campaign Types
export interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'completed';
  platform: string;
  budget: number;
  spent: number;
  conversions: number;
  roi: number;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignProvider {
  id: string;
  name: string;
  type: 'affiliate' | 'advertising';
  status: 'connected' | 'disconnected';
  apiKey?: string;
  credentials?: Record<string, any>;
}

// Video Generation Types
export interface VideoProvider {
  id: string;
  name: string;
  type: 'ai' | 'template' | 'manual';
  cost: number;
  speed: 'fast' | 'medium' | 'slow';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  available: boolean;
}

export interface CostAnalysis {
  totalCost: number;
  costPerMinute: number;
  breakdown: Array<{
    provider: string;
    cost: number;
    usage: number;
  }>;
}

// Affiliate Types
export interface AffiliateNetwork {
  id: string;
  name: 'rakuten' | 'yahoo' | 'amazon' | 'valuecommerce' | 'a8net';
  displayName: string;
  status: 'connected' | 'disconnected';
  apiKey?: string;
  commissionRate: number;
  payoutThreshold: number;
}

// Analytics Types
export interface RealTimeMetrics {
  activeUsers: number;
  currentSpend: number;
  conversionsThisHour: number;
  topPerformingCampaign: string;
  campaigns: Campaign[];
  metrics: {
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
  };
}

// Scheduling Types
export interface SchedulingData {
  patterns: Array<{
    id: string;
    name: string;
    timeSlots: string[];
    platforms: string[];
    performance: number;
  }>;
  schedules: Array<{
    id: string;
    contentId: string;
    scheduledTime: string;
    platform: string;
    status: 'pending' | 'published' | 'failed';
  }>;
  successRate: number;
  totalExecutions: number;
  successfulExecutions: number;
}

// Smartphone Automation Types
export interface SmartphoneData {
  totals: {
    devices: number;
    activeAccounts: number;
    dailyPosts: number;
    revenue: number;
  };
  devices: Array<{
    id: string;
    name: string;
    status: 'online' | 'offline' | 'busy';
    accounts: number;
    lastActivity: string;
  }>;
}

export interface DashboardData extends SmartphoneData {
  // Additional dashboard specific data
  performance: {
    engagement: number;
    reach: number;
    impressions: number;
  };
}

// Content Types extended
export interface ContentLibraryResponse {
  content: Content[];
  totalCount: number;
  pageSize: number;
  currentPage: number;
}

// Bandit Arm Types
export interface BanditArms {
  arms: BanditArm[];
  totalArms: number;
  averageReward: number;
}