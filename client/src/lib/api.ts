// Enhanced API client with proper typing
import type { 
  ApiResponse, 
  OptimizationInsights,
  Campaign,
  VideoProvider,
  CostAnalysis,
  RealTimeMetrics,
  SchedulingData,
  DashboardData,
  ContentLibraryResponse,
  BanditArms
} from '@/types/api';

class ApiClient {
  private baseUrl: string;
  
  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    url: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${url}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error(`API Error for ${url}:`, error);
      return {
        success: false,
        data: {} as T,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async get<T>(url: string): Promise<ApiResponse<T>> {
    return this.request<T>(url, { method: 'GET' });
  }

  async post<T>(url: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(url: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(url: string): Promise<ApiResponse<T>> {
    return this.request<T>(url, { method: 'DELETE' });
  }

  // Specific API methods with proper typing
  async getOptimizationInsights(): Promise<OptimizationInsights> {
    const response = await this.get<OptimizationInsights>('/optimization/insights');
    return response.data || {
      insights: {
        totalArms: 0,
        averageReward: 0,
        optimalTimes: [],
        ensembles: []
      }
    };
  }

  async getCampaigns(): Promise<Campaign[]> {
    const response = await this.get<Campaign[]>('/campaigns');
    return response.data || [];
  }

  async getVideoProviders(): Promise<VideoProvider[]> {
    const response = await this.get<VideoProvider[]>('/video/providers');
    return response.data || [];
  }

  async getCostAnalysis(): Promise<CostAnalysis> {
    const response = await this.get<CostAnalysis>('/video/cost-analysis');
    return response.data || {
      totalCost: 0,
      costPerMinute: 0,
      breakdown: []
    };
  }

  async getRealTimeMetrics(): Promise<RealTimeMetrics> {
    const response = await this.get<RealTimeMetrics>('/analytics/real-time');
    return response.data || {
      activeUsers: 0,
      currentSpend: 0,
      conversionsThisHour: 0,
      topPerformingCampaign: '',
      campaigns: [],
      metrics: {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        revenue: 0
      }
    };
  }

  async getSchedulingData(): Promise<SchedulingData> {
    const response = await this.get<SchedulingData>('/scheduling/data');
    return response.data || {
      patterns: [],
      schedules: [],
      successRate: 0,
      totalExecutions: 0,
      successfulExecutions: 0
    };
  }

  async getDashboardData(): Promise<DashboardData> {
    const response = await this.get<DashboardData>('/dashboard/data');
    return response.data || {
      totals: {
        devices: 0,
        activeAccounts: 0,
        dailyPosts: 0,
        revenue: 0
      },
      devices: [],
      performance: {
        engagement: 0,
        reach: 0,
        impressions: 0
      }
    };
  }

  async getContentLibrary(): Promise<ContentLibraryResponse> {
    const response = await this.get<ContentLibraryResponse>('/content');
    return response.data || {
      content: [],
      totalCount: 0,
      pageSize: 0,
      currentPage: 0
    };
  }

  async getBanditArms(): Promise<BanditArms> {
    const response = await this.get<BanditArms>('/bandit/arms');
    return response.data || {
      arms: [],
      totalArms: 0,
      averageReward: 0
    };
  }
}

export const apiClient = new ApiClient();
export default apiClient;