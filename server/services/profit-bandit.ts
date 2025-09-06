import { IStorage } from '../storage.js';

export interface ProfitArm {
  id: string;
  streamKey: string;
  platform: string;
  hookType: string;
  templateStyle: string;
  clicks: number;
  conversions: number;
  revenue: number;
  adSpend: number;
  profit: number;
  allocation: number;
  alpha: number; // Beta distribution parameter
  beta: number;  // Beta distribution parameter
  lastUpdated: Date;
}

export interface ProfitWindow {
  windowStart: Date;
  windowEnd: Date;
  totalProfit: number;
  totalSpend: number;
  roi: number;
}

export class ProfitBanditService {
  private storage: IStorage;
  private arms: Map<string, ProfitArm> = new Map();
  private profitWindows: ProfitWindow[] = [];
  private explorationRate: number = 0.15; // 15% exploration budget
  private windowSizeMinutes: number = 30; // 30-minute profit optimization windows

  constructor(storage: IStorage) {
    this.storage = storage;
    this.initializeArms();
  }

  private initializeArms(): void {
    // Initialize profit-optimized arms for each stream/platform combination
    const streamKeys = ['mnp', 'credit', 'tech', 'anime', 'travel', 'fashion', 'food', 'hacks', 'jobs', 'cute'];
    const platforms = ['tiktok', 'instagram'];
    const hookTypes = ['numeric', 'question', 'limited', 'benefit'];
    const templateStyles = ['minimal', 'dynamic', 'business'];

    streamKeys.forEach(streamKey => {
      platforms.forEach(platform => {
        hookTypes.forEach(hookType => {
          templateStyles.forEach(templateStyle => {
            const armId = `${streamKey}_${platform}_${hookType}_${templateStyle}`;
            
            this.arms.set(armId, {
              id: armId,
              streamKey,
              platform,
              hookType,
              templateStyle,
              clicks: 0,
              conversions: 0,
              revenue: 0,
              adSpend: 0,
              profit: 0,
              allocation: 1.0 / (streamKeys.length * platforms.length * hookTypes.length * templateStyles.length),
              alpha: 1, // Prior belief: uniform
              beta: 1,
              lastUpdated: new Date()
            });
          });
        });
      });
    });

    console.log(`Initialized ${this.arms.size} profit-optimized arms`);
  }

  async updateArmProfit(armId: string, revenue: number, adSpend: number, clicks: number = 1, conversions: number = 0): Promise<void> {
    const arm = this.arms.get(armId);
    if (!arm) {
      console.error(`Arm not found: ${armId}`);
      return;
    }

    // Update cumulative metrics
    arm.clicks += clicks;
    arm.conversions += conversions;
    arm.revenue += revenue;
    arm.adSpend += adSpend;
    arm.profit = arm.revenue - arm.adSpend;
    arm.lastUpdated = new Date();

    // Update Beta distribution parameters based on profit
    // Positive profit = success, negative profit = failure
    if (arm.profit > 0) {
      arm.alpha += 1; // Success
    } else {
      arm.beta += 1; // Failure
    }

    this.arms.set(armId, arm);

    // Log profit update
    await this.storage.createAutomationLog({
      type: 'profit_arm_update',
      message: `Arm ${armId} updated: Profit ¥${Math.round(arm.profit)}, ROI ${Math.round((arm.profit / Math.max(arm.adSpend, 1)) * 100)}%`,
      status: 'success',
      workflowId: null,
      metadata: {
        armId,
        revenue,
        adSpend,
        totalProfit: arm.profit,
        roi: arm.adSpend > 0 ? arm.profit / arm.adSpend : 0,
        alpha: arm.alpha,
        beta: arm.beta
      }
    });
  }

  selectOptimalArms(count: number = 10): ProfitArm[] {
    const armList = Array.from(this.arms.values());
    
    // Calculate Thompson Sampling scores for profit optimization
    const scoredArms = armList.map(arm => {
      // Thompson Sampling with Beta distribution
      const score = this.betaRandom(arm.alpha, arm.beta);
      
      // Apply profit penalty for negative performers
      const profitMultiplier = arm.profit >= 0 ? 1 : 0.1;
      
      return {
        arm,
        score: score * profitMultiplier
      };
    });

    // Sort by score and select top performers
    scoredArms.sort((a, b) => b.score - a.score);
    
    // Ensure exploration: reserve some slots for exploration
    const explorationCount = Math.ceil(count * this.explorationRate);
    const exploitationCount = count - explorationCount;
    
    const topArms = scoredArms.slice(0, exploitationCount).map(sa => sa.arm);
    const explorationArms = this.selectExplorationArms(explorationCount);
    
    return [...topArms, ...explorationArms];
  }

  private selectExplorationArms(count: number): ProfitArm[] {
    const armList = Array.from(this.arms.values());
    
    // Prefer arms with less data (higher uncertainty)
    const underexploredArms = armList
      .filter(arm => arm.clicks < 50) // Arms with limited data
      .sort((a, b) => a.clicks - b.clicks); // Least explored first
    
    return underexploredArms.slice(0, count);
  }

  private betaRandom(alpha: number, beta: number): number {
    // Simple Beta distribution sampling using transformation
    const x = this.gammaRandom(alpha);
    const y = this.gammaRandom(beta);
    return x / (x + y);
  }

  private gammaRandom(shape: number): number {
    // Simplified Gamma distribution (Marsaglia and Tsang method)
    if (shape < 1) {
      return this.gammaRandom(shape + 1) * Math.pow(Math.random(), 1 / shape);
    }
    
    const d = shape - 1/3;
    const c = 1 / Math.sqrt(9 * d);
    
    while (true) {
      let x, v;
      do {
        x = this.normalRandom();
        v = 1 + c * x;
      } while (v <= 0);
      
      v = v * v * v;
      const u = Math.random();
      
      if (u < 1 - 0.0331 * x * x * x * x) {
        return d * v;
      }
      
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
        return d * v;
      }
    }
  }

  private normalRandom(): number {
    // Box-Muller transform for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  async rebalanceAllocations(): Promise<void> {
    const armList = Array.from(this.arms.values());
    const totalProfit = armList.reduce((sum, arm) => sum + Math.max(arm.profit, 0), 0);
    
    if (totalProfit === 0) {
      // Equal allocation if no profitable arms
      const equalAllocation = 1.0 / armList.length;
      armList.forEach(arm => {
        arm.allocation = equalAllocation;
      });
    } else {
      // Allocate based on profit contribution
      armList.forEach(arm => {
        const profitContribution = Math.max(arm.profit, 0) / totalProfit;
        const baseAllocation = 0.1 / armList.length; // Minimum allocation
        arm.allocation = baseAllocation + (profitContribution * 0.9);
      });
    }

    // Normalize allocations to sum to 1
    const totalAllocation = armList.reduce((sum, arm) => sum + arm.allocation, 0);
    armList.forEach(arm => {
      arm.allocation = arm.allocation / totalAllocation;
      this.arms.set(arm.id, arm);
    });

    await this.storage.createAutomationLog({
      type: 'allocation_rebalance',
      message: `Rebalanced allocations based on profit: ${armList.filter(a => a.profit > 0).length} profitable arms`,
      status: 'success',
      workflowId: null,
      metadata: {
        totalProfit,
        profitableArms: armList.filter(a => a.profit > 0).length,
        topArm: armList.sort((a, b) => b.profit - a.profit)[0]?.id
      }
    });
  }

  async addProfitWindow(): Promise<void> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - this.windowSizeMinutes * 60 * 1000);
    
    const armList = Array.from(this.arms.values());
    const windowProfit = armList.reduce((sum, arm) => sum + arm.profit, 0);
    const windowSpend = armList.reduce((sum, arm) => sum + arm.adSpend, 0);
    const roi = windowSpend > 0 ? windowProfit / windowSpend : 0;

    const profitWindow: ProfitWindow = {
      windowStart,
      windowEnd: now,
      totalProfit: windowProfit,
      totalSpend: windowSpend,
      roi
    };

    this.profitWindows.push(profitWindow);
    
    // Keep only last 48 windows (24 hours at 30-min intervals)
    if (this.profitWindows.length > 48) {
      this.profitWindows = this.profitWindows.slice(-48);
    }

    await this.storage.createAutomationLog({
      type: 'profit_window',
      message: `Profit window: ¥${Math.round(windowProfit)} profit, ${Math.round(roi * 100)}% ROI`,
      status: 'success',
      workflowId: null,
      metadata: {
        windowProfit,
        windowSpend,
        roi,
        windowStart: windowStart.toISOString(),
        windowEnd: now.toISOString()
      }
    });
  }

  getProfitReport(hours: number = 24): any {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const recentWindows = this.profitWindows.filter(w => w.windowEnd > cutoff);
    
    const totalProfit = recentWindows.reduce((sum, w) => sum + w.totalProfit, 0);
    const totalSpend = recentWindows.reduce((sum, w) => sum + w.totalSpend, 0);
    const avgROI = recentWindows.length > 0 ? 
      recentWindows.reduce((sum, w) => sum + w.roi, 0) / recentWindows.length : 0;

    const armList = Array.from(this.arms.values());
    const topProfitArms = armList
      .filter(arm => arm.profit > 0)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10);

    const streamPerformance = this.getStreamPerformance(cutoff);

    return {
      period: `${hours} hours`,
      summary: {
        totalProfit: Math.round(totalProfit),
        totalSpend: Math.round(totalSpend),
        roi: Math.round(avgROI * 100),
        profitableArms: armList.filter(a => a.profit > 0).length,
        totalArms: armList.length
      },
      topArms: topProfitArms.map(arm => ({
        id: arm.id,
        profit: Math.round(arm.profit),
        roi: arm.adSpend > 0 ? Math.round((arm.profit / arm.adSpend) * 100) : 0,
        allocation: Math.round(arm.allocation * 100),
        clicks: arm.clicks,
        conversions: arm.conversions
      })),
      streamPerformance,
      profitTrend: recentWindows.map(w => ({
        timestamp: w.windowEnd.toISOString(),
        profit: Math.round(w.totalProfit),
        roi: Math.round(w.roi * 100)
      }))
    };
  }

  private getStreamPerformance(cutoff: Date): any {
    const streamKeys = ['mnp', 'credit', 'tech', 'anime', 'travel', 'fashion', 'food', 'hacks', 'jobs', 'cute'];
    
    return streamKeys.reduce((acc, streamKey) => {
      const streamArms = Array.from(this.arms.values()).filter(arm => 
        arm.streamKey === streamKey && arm.lastUpdated > cutoff
      );
      
      const streamProfit = streamArms.reduce((sum, arm) => sum + arm.profit, 0);
      const streamSpend = streamArms.reduce((sum, arm) => sum + arm.adSpend, 0);
      const streamROI = streamSpend > 0 ? streamProfit / streamSpend : 0;
      
      acc[streamKey] = {
        profit: Math.round(streamProfit),
        spend: Math.round(streamSpend),
        roi: Math.round(streamROI * 100),
        arms: streamArms.length
      };
      
      return acc;
    }, {} as any);
  }

  async pruneNegativeArms(): Promise<void> {
    const armList = Array.from(this.arms.values());
    const pruneThreshold = -1000; // Remove arms with profit < -¥1000
    const minClicks = 100; // Only prune arms with sufficient data
    
    let prunedCount = 0;
    
    for (const arm of armList) {
      if (arm.profit < pruneThreshold && arm.clicks >= minClicks) {
        this.arms.delete(arm.id);
        prunedCount++;
        
        await this.storage.createAutomationLog({
          type: 'arm_pruned',
          message: `Pruned negative arm ${arm.id}: Profit ¥${Math.round(arm.profit)}`,
          status: 'success',
          workflowId: null,
          metadata: {
            armId: arm.id,
            profit: arm.profit,
            clicks: arm.clicks,
            roi: arm.adSpend > 0 ? arm.profit / arm.adSpend : 0
          }
        });
      }
    }

    if (prunedCount > 0) {
      await this.rebalanceAllocations();
      console.log(`Pruned ${prunedCount} negative-performing arms`);
    }
  }

  getArms(): Map<string, ProfitArm> {
    return this.arms;
  }

  async setExplorationRate(rate: number): Promise<void> {
    this.explorationRate = Math.max(0.05, Math.min(0.5, rate)); // Clamp between 5-50%
    
    await this.storage.createAutomationLog({
      type: 'exploration_rate_update',
      message: `Exploration rate updated to ${Math.round(this.explorationRate * 100)}%`,
      status: 'success',
      workflowId: null,
      metadata: { explorationRate: this.explorationRate }
    });
  }
}