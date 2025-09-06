import { BanditArm } from "@shared/schema";

export interface BanditUpdate {
  armId: string;
  reward: number;
  context?: Record<string, any>;
}

export interface AllocationResult {
  armId: string;
  allocation: number;
  confidence: number;
}

export class BanditAlgorithmService {
  private alpha: number = 1;
  private beta: number = 1;
  private explorationRate: number = 0.1;

  constructor() {}

  calculateThompsonSampling(arms: BanditArm[]): AllocationResult[] {
    const samples = arms.map(arm => {
      // Convert profit to success rate (simplified)
      const successRate = Math.max(0, Math.min(1, arm.score / 100));
      const failures = Math.max(1, 100 - arm.score);
      
      // Thompson sampling with Beta distribution
      const sample = this.betaSample(this.alpha + arm.score, this.beta + failures);
      
      return {
        armId: arm.id,
        sample,
        currentAllocation: arm.allocation
      };
    });

    // Sort by sample value (higher is better)
    samples.sort((a, b) => b.sample - a.sample);

    // Calculate new allocations based on Thompson sampling
    const totalBudget = 100;
    let remainingBudget = totalBudget;
    
    const results: AllocationResult[] = samples.map((sample, index) => {
      let allocation: number;
      
      if (index === samples.length - 1) {
        // Last arm gets remaining budget
        allocation = remainingBudget;
      } else {
        // Higher-performing arms get exponentially more allocation
        const baseAllocation = Math.max(5, totalBudget * Math.pow(0.7, index));
        allocation = Math.min(baseAllocation, remainingBudget - (samples.length - index - 1) * 5);
      }
      
      remainingBudget -= allocation;
      
      return {
        armId: sample.armId,
        allocation: Math.round(allocation),
        confidence: sample.sample
      };
    });

    return results;
  }

  updateArmsWithProfitData(
    arms: BanditArm[], 
    profitUpdates: Array<{ armId: string; profit: number; cost: number }>
  ): BanditArm[] {
    const armMap = new Map(arms.map(arm => [arm.id, { ...arm }]));

    profitUpdates.forEach(update => {
      const arm = armMap.get(update.armId);
      if (arm) {
        // Update profit and cost
        arm.profit = update.profit;
        arm.cost = update.cost;
        
        // Calculate new score based on ROAS and profit margin
        const roas = update.cost > 0 ? update.profit / update.cost : 0;
        const profitMargin = update.profit - update.cost;
        
        // Score formula: weighted combination of ROAS and absolute profit
        arm.score = Math.min(100, Math.max(0, (roas * 30) + (profitMargin / 1000 * 20)));
        
        arm.updatedAt = new Date();
      }
    });

    return Array.from(armMap.values());
  }

  optimizeScheduleTiming(currentPerformance: Record<string, number>): {
    recommendedSchedule: string;
    reasoning: string;
  } {
    // Analyze performance by hour to optimize schedule
    const performanceByHour = Object.entries(currentPerformance);
    
    // Find peak performance hours for Japanese market
    const peakHours = performanceByHour
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    // Generate cron schedule for peak hours
    const cronHours = peakHours.join(',');
    const recommendedSchedule = `0 ${cronHours} * * *`;

    const reasoning = `Optimized schedule based on performance data. Peak performance hours: ${peakHours.join(', ')}. Japanese market typically shows higher engagement during ${peakHours[0]}:00-${peakHours[0] + 2}:00 JST.`;

    return {
      recommendedSchedule,
      reasoning
    };
  }

  private betaSample(alpha: number, beta: number): number {
    // Simplified Beta distribution sampling using rejection sampling
    // In production, use a proper statistical library
    let x, y;
    do {
      x = Math.random();
      y = Math.random();
    } while (y > Math.pow(x, alpha - 1) * Math.pow(1 - x, beta - 1));
    
    return x;
  }

  calculateExpectedValue(arm: BanditArm): number {
    if (arm.cost === 0) return 0;
    
    const roas = arm.profit / arm.cost;
    const confidenceInterval = this.calculateConfidenceInterval(arm);
    
    // Expected value considers both current performance and uncertainty
    return roas * (1 - confidenceInterval.uncertainty);
  }

  private calculateConfidenceInterval(arm: BanditArm): {
    lower: number;
    upper: number;
    uncertainty: number;
  } {
    // Simplified confidence interval calculation
    const variance = arm.score * (100 - arm.score) / 100;
    const standardError = Math.sqrt(variance / Math.max(1, arm.profit / 1000));
    
    const margin = 1.96 * standardError; // 95% confidence interval
    
    return {
      lower: Math.max(0, arm.score - margin),
      upper: Math.min(100, arm.score + margin),
      uncertainty: margin / 100
    };
  }
}
