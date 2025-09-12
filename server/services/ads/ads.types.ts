/**
 * Ads Service Types
 * Unified types for multi-platform ad management
 */

export type AdChannel = 'tiktok' | 'meta' | 'google';

export interface BoostTrigger {
  postId: string;
  views60m: number;
  ctr: number;
  platform: string;
  creativeId: string;
  videoUrl?: string;
  thumbnailUrl?: string;
}

export interface BoostPlan {
  channel: AdChannel;
  dailyBudgetJPY: number;
  ctaUrl: string;
  creativeId: string;
  campaignName: string;
  audience?: {
    locations?: string[];
    ages?: any;
    interests?: string[];
  };
  priority: number; // 1-10, higher = more priority
  expectedROAS?: number;
  forecastMetrics?: {
    estimatedClicks: number;
    estimatedConversions: number;
    estimatedRevenue: number;
  };
}

export interface AdCampaignResult {
  success: boolean;
  channel: AdChannel;
  campaignId?: string;
  adGroupId?: string;
  adId?: string;
  error?: string;
  metrics?: {
    budgetSet: number;
    targeting: any;
    creativeUsed: string;
  };
}

export interface AdPerformanceMetrics {
  campaignId: string;
  channel: AdChannel;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpa?: number;
  roas?: number;
  date: string;
}

export interface BudgetAllocation {
  channel: AdChannel;
  currentBudget: number;
  recommendedBudget: number;
  performance: {
    roas: number;
    cpa: number;
    conversionRate: number;
  };
  confidence: number; // 0-1, confidence in recommendation
}

export interface AdCreativeAsset {
  id: string;
  type: 'video' | 'image' | 'carousel';
  url: string;
  thumbnailUrl?: string;
  duration?: number; // for videos
  format: string;
  platform: string;
  performance?: {
    ctr: number;
    conversionRate: number;
    engagementRate: number;
  };
}

export interface CampaignConfig {
  // Common fields
  campaignName: string;
  dailyBudget: number;
  targetUrl: string;
  creative: AdCreativeAsset;
  
  // TikTok specific
  tiktok?: {
    advertiserId: string;
    accessToken: string;
    audience?: {
      locations?: string[];
      ages?: string[];
      interests?: string[];
    };
  };
  
  // Meta specific
  meta?: {
    accountId: string;
    accessToken: string;
    pixelId?: string;
    audience?: {
      locations?: string[];
      ages?: { min: number; max: number };
      interests?: string[];
    };
  };
  
  // Google specific
  google?: {
    customerId: string;
    developerToken: string;
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    campaignType: 'PERFORMANCE_MAX' | 'VIDEO_ACTION';
  };
}

export interface AdChannelCapabilities {
  channel: AdChannel;
  supportedFormats: string[];
  minBudget: number;
  maxBudget: number;
  targetingOptions: {
    demographics: boolean;
    interests: boolean;
    behaviors: boolean;
    lookalike: boolean;
    custom: boolean;
  };
  reportingMetrics: string[];
  apiLimits: {
    requestsPerHour: number;
    requestsPerDay: number;
    burstLimit: number;
  };
}

export interface AdSchedule {
  channel: AdChannel;
  campaignId: string;
  startTime: Date;
  endTime?: Date;
  dayparting?: {
    monday?: { start: string; end: string }[];
    tuesday?: { start: string; end: string }[];
    wednesday?: { start: string; end: string }[];
    thursday?: { start: string; end: string }[];
    friday?: { start: string; end: string }[];
    saturday?: { start: string; end: string }[];
    sunday?: { start: string; end: string }[];
  };
  timezone: string;
}

export interface BidStrategy {
  type: 'manual' | 'auto' | 'target_cpa' | 'target_roas' | 'maximize_conversions';
  target?: number;
  maxBid?: number;
  minBid?: number;
}

export interface AdTestResult {
  testId: string;
  channel: AdChannel;
  variants: {
    controlId: string;
    testId: string;
    winner?: string;
    confidence: number;
    lift: number;
  };
  metrics: {
    [key: string]: {
      control: number;
      test: number;
      significance: number;
    };
  };
  recommendation: string;
}

// Rate limiting and API management types
export interface ApiRateLimit {
  channel: AdChannel;
  endpoint: string;
  limit: number;
  remaining: number;
  resetTime: Date;
  bucType?: 'BUC' | 'APP' | 'USER'; // For Meta
}

export interface AdApiError {
  channel: AdChannel;
  errorCode: string;
  message: string;
  isRetryable: boolean;
  retryAfter?: number;
  details?: any;
}