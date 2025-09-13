import { useQuery as useTanstackQuery, UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { 
  OptimizationInsights,
  Campaign,
  VideoProvider,
  CostAnalysis,
  RealTimeMetrics,
  SchedulingData,
  DashboardData,
  ContentLibraryResponse,
  BanditArms
} from '@/types';

// Custom hooks for API calls with proper typing
export function useOptimizationInsights(): UseQueryResult<OptimizationInsights, Error> {
  return useTanstackQuery({
    queryKey: ['optimization', 'insights'],
    queryFn: () => apiClient.getOptimizationInsights(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 30 * 1000, // 30 seconds
  });
}

export function useCampaigns(): UseQueryResult<Campaign[], Error> {
  return useTanstackQuery({
    queryKey: ['campaigns'],
    queryFn: () => apiClient.getCampaigns(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useVideoProviders(): UseQueryResult<VideoProvider[], Error> {
  return useTanstackQuery({
    queryKey: ['video', 'providers'],
    queryFn: () => apiClient.getVideoProviders(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useCostAnalysis(): UseQueryResult<CostAnalysis, Error> {
  return useTanstackQuery({
    queryKey: ['video', 'cost-analysis'],
    queryFn: () => apiClient.getCostAnalysis(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useRealTimeMetrics(): UseQueryResult<RealTimeMetrics, Error> {
  return useTanstackQuery({
    queryKey: ['analytics', 'real-time'],
    queryFn: () => apiClient.getRealTimeMetrics(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 15 * 1000, // 15 seconds
  });
}

export function useSchedulingData(): UseQueryResult<SchedulingData, Error> {
  return useTanstackQuery({
    queryKey: ['scheduling', 'data'],
    queryFn: () => apiClient.getSchedulingData(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useDashboardData(): UseQueryResult<DashboardData, Error> {
  return useTanstackQuery({
    queryKey: ['dashboard', 'data'],
    queryFn: () => apiClient.getDashboardData(),
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 30 * 1000, // 30 seconds
  });
}

export function useContentLibrary(): UseQueryResult<ContentLibraryResponse, Error> {
  return useTanstackQuery({
    queryKey: ['content', 'library'],
    queryFn: () => apiClient.getContentLibrary(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useBanditArms(): UseQueryResult<BanditArms, Error> {
  return useTanstackQuery({
    queryKey: ['bandit', 'arms'],
    queryFn: () => apiClient.getBanditArms(),
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 30 * 1000, // 30 seconds
  });
}

// Generic mutation hook for POST/PUT operations
export function useMutation() {
  return useTanstackQuery;
}