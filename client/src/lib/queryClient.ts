import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

// Enhanced API request function with better error handling
export async function apiRequestWithFallback<T>(
  method: string,
  url: string,
  data?: unknown,
  fallback?: T
): Promise<T> {
  try {
    const res = await apiRequest(method, url, data);
    return await res.json();
  } catch (error) {
    console.warn(`API request failed for ${url}:`, error);
    if (fallback !== undefined) {
      return fallback;
    }
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const res = await fetch(queryKey.join("/") as string, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      console.warn(`Query failed for ${queryKey.join("/")}:`, error);
      // Return fallback data structure to prevent component crashes
      if (queryKey.includes("optimization")) {
        return {
          insights: {
            totalArms: 0,
            averageReward: 0,
            optimalTimes: [],
            ensembles: []
          }
        } as T;
      }
      if (queryKey.includes("campaigns")) {
        return [] as T;
      }
      if (queryKey.includes("analytics")) {
        return {
          activeUsers: 0,
          currentSpend: 0,
          conversionsThisHour: 0,
          topPerformingCampaign: '',
          campaigns: [],
          metrics: { impressions: 0, clicks: 0, conversions: 0, revenue: 0 },
          healthScore: 75
        } as T;
      }
      if (queryKey.includes("scheduling")) {
        return {
          patterns: [],
          schedules: [],
          successRate: 0,
          totalExecutions: 0,
          successfulExecutions: 0,
          averageROI: 0,
          insights: [],
          platformStats: []
        } as T;
      }
      if (queryKey.includes("dashboard") || queryKey.includes("smartphone")) {
        return {
          totals: { devices: 0, activeAccounts: 0, dailyPosts: 0, revenue: 0 },
          devices: [],
          performance: { engagement: 0, reach: 0, impressions: 0 }
        } as T;
      }
      if (queryKey.includes("video")) {
        return {
          providers: [],
          costAnalysis: { totalCost: 0, costPerMinute: 0, breakdown: [] },
          length: 0
        } as T;
      }
      if (queryKey.includes("content")) {
        return {
          content: [],
          totalCount: 0,
          pageSize: 0,
          currentPage: 0
        } as T;
      }
      if (queryKey.includes("bandit")) {
        return {
          arms: [],
          totalArms: 0,
          averageReward: 0
        } as T;
      }
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes instead of Infinity
      retry: 1, // Allow 1 retry instead of false
      retryDelay: 1000,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});
