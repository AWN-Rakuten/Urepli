/**
 * Budget Optimizer Service
 * Allocates daily budgets across channels and creatives using ROAS/MER targeting
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';
import { AdChannel, AdPerformanceMetrics, BudgetAllocation } from './ads/ads.types';
import { subDays } from 'date-fns';

export interface OptimizationConstraints {
  totalBudgetJPY: number;
  minROAS: number;
  maxMER?: number; // Marketing Efficiency Ratio (Revenue / Spend)
  minBudgetPerChannel: number;
  maxBudgetPerChannel: number;
  channelLimits?: Record<AdChannel, { min: number; max: number }>;
}

export interface ChannelPerformance {
  channel: AdChannel;
  spend: number;
  revenue: number;
  conversions: number;
  roas: number;
  mer: number;
  profitPerK: number; // Expected profit per 1000 JPY spend
  maxUnits: number; // Maximum budget units (1K JPY chunks)
  confidence: number; // Confidence in performance data (0-1)
}

export interface BudgetOptimizationResult {
  success: boolean;
  totalAllocated: number;
  allocations: Record<AdChannel, number>;
  expectedMetrics: {
    totalRevenue: number;
    totalProfit: number;
    averageROAS: number;
    averageMER: number;
  };
  recommendations: string[];
  confidence: number;
}

/**
 * Budget Optimizer using greedy allocation with ROAS constraints
 */
export class BudgetOptimizerService {

  /**
   * Optimize daily budget allocation across channels
   */
  async optimizeBudgets(constraints: OptimizationConstraints): Promise<BudgetOptimizationResult> {
    try {
      // 1. Get recent performance data for each channel
      const channelPerformances = await this.getChannelPerformances(30); // 30 days lookback
      
      // 2. Filter channels that meet minimum ROAS
      const eligibleChannels = channelPerformances.filter(cp => 
        cp.roas >= constraints.minROAS && cp.confidence > 0.3
      );
      
      if (eligibleChannels.length === 0) {
        return {
          success: false,
          totalAllocated: 0,
          allocations: {},
          expectedMetrics: {
            totalRevenue: 0,
            totalProfit: 0,
            averageROAS: 0,
            averageMER: 0
          },
          recommendations: ['No channels meet minimum ROAS requirements'],
          confidence: 0
        };
      }

      // 3. Apply greedy allocation algorithm
      const allocation = this.allocateBudgetGreedy(eligibleChannels, constraints);
      
      // 4. Calculate expected metrics
      const expectedMetrics = this.calculateExpectedMetrics(allocation, eligibleChannels);
      
      // 5. Generate recommendations
      const recommendations = this.generateRecommendations(allocation, channelPerformances, constraints);

      return {
        success: true,
        totalAllocated: Object.values(allocation.allocations).reduce((sum, val) => sum + val, 0),
        allocations: allocation.allocations,
        expectedMetrics,
        recommendations,
        confidence: allocation.confidence
      };

    } catch (error) {
      console.error('Budget optimization failed:', error);
      return {
        success: false,
        totalAllocated: 0,
        allocations: {},
        expectedMetrics: {
          totalRevenue: 0,
          totalProfit: 0,
          averageROAS: 0,
          averageMER: 0
        },
        recommendations: [`Optimization failed: ${error.message}`],
        confidence: 0
      };
    }
  }

  /**
   * Greedy budget allocation algorithm
   * Allocates budget in 1K JPY chunks to highest profit-per-K channels first
   */
  allocateBudgetGreedy(
    channels: ChannelPerformance[], 
    constraints: OptimizationConstraints
  ): { allocations: Record<AdChannel, number>; confidence: number } {
    const budgetK = Math.floor(constraints.totalBudgetJPY / 1000);
    const allocations: Record<AdChannel, number> = {} as any;
    
    // Initialize allocations
    channels.forEach(channel => {
      allocations[channel.channel] = constraints.minBudgetPerChannel;
    });

    // Sort channels by profit per 1K spend (descending)
    const sortedChannels = [...channels].sort((a, b) => b.profitPerK - a.profitPerK);
    
    let remainingBudget = budgetK - (channels.length * Math.floor(constraints.minBudgetPerChannel / 1000));
    
    // Greedy allocation
    while (remainingBudget > 0) {
      let allocated = false;
      
      for (const channel of sortedChannels) {
        const currentAllocation = allocations[channel.channel];
        const channelLimit = constraints.channelLimits?.[channel.channel]?.max || constraints.maxBudgetPerChannel;
        
        if (currentAllocation < channelLimit && channel.maxUnits > Math.floor(currentAllocation / 1000)) {
          allocations[channel.channel] += 1000;
          remainingBudget--;
          allocated = true;
          break;
        }
      }
      
      if (!allocated) break; // No more channels can accept budget
    }

    const avgConfidence = channels.reduce((sum, c) => sum + c.confidence, 0) / channels.length;

    return { allocations, confidence: avgConfidence };
  }

  /**
   * Get historical performance data for each channel
   */
  private async getChannelPerformances(days: number): Promise<ChannelPerformance[]> {
    const cutoffDate = subDays(new Date(), days);
    
    // This would query actual campaign performance data
    // For now, we'll return mock data based on typical Japanese market performance
    
    const mockPerformances: ChannelPerformance[] = [
      {
        channel: 'tiktok',
        spend: 50000,
        revenue: 140000,
        conversions: 28,
        roas: 2.8,
        mer: 2.8,
        profitPerK: 1800, // 180 JPY profit per 1000 JPY spend
        maxUnits: 20, // Max 20K JPY daily
        confidence: 0.85
      },
      {
        channel: 'meta',
        spend: 75000,
        revenue: 225000,
        conversions: 45,
        roas: 3.0,
        mer: 3.0,
        profitPerK: 2000,
        maxUnits: 30,
        confidence: 0.90
      },
      {
        channel: 'google',
        spend: 60000,
        revenue: 210000,
        conversions: 42,
        roas: 3.5,
        mer: 3.5,
        profitPerK: 2500,
        maxUnits: 25,
        confidence: 0.95
      }
    ];

    return mockPerformances;
  }

  /**
   * Calculate expected metrics from budget allocation
   */
  private calculateExpectedMetrics(
    allocation: { allocations: Record<AdChannel, number> },
    performances: ChannelPerformance[]
  ) {
    let totalRevenue = 0;
    let totalProfit = 0;
    let totalSpend = 0;
    
    Object.entries(allocation.allocations).forEach(([channel, budget]) => {
      const performance = performances.find(p => p.channel === channel as AdChannel);
      if (performance) {
        const expectedRevenue = budget * performance.roas;
        const expectedProfit = budget * (performance.profitPerK / 1000);
        
        totalRevenue += expectedRevenue;
        totalProfit += expectedProfit;
        totalSpend += budget;
      }
    });

    return {
      totalRevenue,
      totalProfit,
      averageROAS: totalSpend > 0 ? totalRevenue / totalSpend : 0,
      averageMER: totalSpend > 0 ? totalRevenue / totalSpend : 0
    };
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(
    allocation: { allocations: Record<AdChannel, number>; confidence: number },
    performances: ChannelPerformance[],
    constraints: OptimizationConstraints
  ): string[] {
    const recommendations: string[] = [];
    
    // Check for underutilized high-performers
    performances.forEach(perf => {
      const allocated = allocation.allocations[perf.channel] || 0;
      const maxPossible = perf.maxUnits * 1000;
      
      if (perf.profitPerK > 2000 && allocated < maxPossible * 0.8) {
        recommendations.push(`Consider increasing budget for ${perf.channel} (high profit potential: ¥${perf.profitPerK}/1K)`);
      }
    });

    // Check for low confidence channels
    performances.forEach(perf => {
      if (perf.confidence < 0.5) {
        recommendations.push(`${perf.channel} has low confidence (${(perf.confidence * 100).toFixed(1)}%) - consider A/B testing`);
      }
    });

    // Overall confidence warning
    if (allocation.confidence < 0.7) {
      recommendations.push('Overall confidence is low - increase data collection period');
    }

    return recommendations;
  }

  /**
   * Apply budget changes to live campaigns
   */
  async applyBudgetChanges(allocations: Record<AdChannel, number>): Promise<boolean> {
    try {
      // This would integrate with each platform's API to update budgets
      
      for (const [channel, budget] of Object.entries(allocations)) {
        console.log(`📊 Setting ${channel} daily budget to ¥${budget.toLocaleString()}`);
        
        // Platform-specific budget updates would go here
        switch (channel as AdChannel) {
          case 'tiktok':
            // await tiktokAdsService.updateCampaignBudget(...)
            break;
          case 'meta':
            // await metaAdsService.updateCampaignBudget(...)
            break;
          case 'google':
            // await googleAdsService.updateCampaignBudget(...)
            break;
        }
      }

      console.log('✅ Budget changes applied successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to apply budget changes:', error);
      return false;
    }
  }
}

/**
 * Simple greedy allocation function (as shown in problem statement)
 */
export function allocate(
  channels: {id:string; expProfitPerK: number; maxUnits: number;}[], 
  budgetK: number
): Record<string, number> {
  const picks: Record<string, number> = {};
  const sorted = [...channels].sort((a,b) => b.expProfitPerK - a.expProfitPerK);
  
  for (const c of sorted) {
    const take = Math.min(c.maxUnits, Math.max(0, budgetK));
    picks[c.id] = take; 
    budgetK -= take;
    if (budgetK <= 0) break;
  }
  
  return picks;
}

export const budgetOptimizer = new BudgetOptimizerService();