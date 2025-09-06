import { IStorage } from '../storage';
import { BanditArm } from '../../shared/schema';

export interface AdSpendConfig {
  dailyBudget: number;
  maxCostPerVideo: number;
  maxCostPerClick: number;
  emergencyStopThreshold: number; // Percentage loss threshold
  humanApprovalThreshold: number; // Spend amount requiring approval
  autoOptimizationEnabled: boolean;
  platformLimits: Record<string, number>; // Platform-specific daily limits
}

export interface SpendDecision {
  id: string;
  type: 'automatic' | 'requires_approval' | 'emergency_stop';
  amount: number;
  armId: string;
  platform: string;
  reasoning: string;
  approvalRequired: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  expectedROI: number;
  createdAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
}

export interface BudgetStatus {
  totalSpent: number;
  dailySpent: number;
  remainingBudget: number;
  platformSpend: Record<string, number>;
  roas: number;
  profitMargin: number;
  riskStatus: 'safe' | 'caution' | 'danger';
  recommendations: string[];
}

export class AdSpendManager {
  private storage: IStorage;
  private config: AdSpendConfig;
  private pendingDecisions: Map<string, SpendDecision> = new Map();
  private dailySpend: number = 0;
  private lastResetDate: string = new Date().toDateString();

  constructor(storage: IStorage, config?: Partial<AdSpendConfig>) {
    this.storage = storage;
    this.config = {
      dailyBudget: 100, // $100/day default
      maxCostPerVideo: 1.50, // Max $1.50 per video
      maxCostPerClick: 0.50, // Max $0.50 per click
      emergencyStopThreshold: 20, // Stop if 20% loss
      humanApprovalThreshold: 50, // Require approval for $50+ decisions
      autoOptimizationEnabled: true,
      platformLimits: {
        tiktok: 60, // $60/day on TikTok
        instagram: 40, // $40/day on Instagram
        youtube: 30  // $30/day on YouTube
      },
      ...config
    };
    
    this.resetDailyBudgetIfNeeded();
  }

  private resetDailyBudgetIfNeeded(): void {
    const today = new Date().toDateString();
    if (this.lastResetDate !== today) {
      this.dailySpend = 0;
      this.lastResetDate = today;
      console.log('🔄 Daily budget reset for new day');
    }
  }

  async evaluateSpendDecision(
    armId: string, 
    proposedSpend: number, 
    expectedRevenue: number,
    platform: string
  ): Promise<SpendDecision> {
    this.resetDailyBudgetIfNeeded();
    
    const arm = await this.storage.getBanditArm(armId);
    if (!arm) {
      throw new Error(`Bandit arm not found: ${armId}`);
    }

    const expectedROI = expectedRevenue / proposedSpend;
    const riskLevel = this.calculateRiskLevel(proposedSpend, expectedROI, platform);
    
    const decision: SpendDecision = {
      id: `spend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: this.determineDecisionType(proposedSpend, expectedROI, riskLevel),
      amount: proposedSpend,
      armId,
      platform,
      reasoning: this.generateReasoning(proposedSpend, expectedROI, arm, platform),
      approvalRequired: proposedSpend >= this.config.humanApprovalThreshold || riskLevel === 'high',
      riskLevel,
      expectedROI,
      createdAt: new Date(),
      status: 'pending'
    };

    // Auto-approve low-risk decisions within budget
    if (decision.type === 'automatic' && !decision.approvalRequired) {
      decision.status = 'approved';
      decision.approvedAt = new Date();
      decision.approvedBy = 'system_auto';
      
      await this.executeSpend(decision);
    } else {
      // Store for human approval
      this.pendingDecisions.set(decision.id, decision);
      console.log(`💰 Spend decision requires approval: $${proposedSpend} for ${platform}`);
    }

    return decision;
  }

  private calculateRiskLevel(spend: number, expectedROI: number, platform: string): 'low' | 'medium' | 'high' {
    const platformLimit = this.config.platformLimits[platform.toLowerCase()] || 50;
    const budgetRatio = spend / this.config.dailyBudget;
    const platformRatio = spend / platformLimit;

    if (expectedROI < 1.2 || budgetRatio > 0.3 || platformRatio > 0.5) {
      return 'high';
    }
    if (expectedROI < 2.0 || budgetRatio > 0.15 || platformRatio > 0.25) {
      return 'medium';
    }
    return 'low';
  }

  private determineDecisionType(spend: number, expectedROI: number, riskLevel: 'low' | 'medium' | 'high'): SpendDecision['type'] {
    if (riskLevel === 'high' || expectedROI < 1.0) {
      return 'emergency_stop';
    }
    if (spend >= this.config.humanApprovalThreshold || riskLevel === 'medium') {
      return 'requires_approval';
    }
    return 'automatic';
  }

  private generateReasoning(spend: number, expectedROI: number, arm: BanditArm, platform: string): string {
    const reasons = [];
    
    reasons.push(`Expected ROI: ${expectedROI.toFixed(2)}x`);
    reasons.push(`Arm performance: ${arm.score?.toFixed(1) || 0} score`);
    reasons.push(`Platform: ${platform}`);
    
    if (spend >= this.config.humanApprovalThreshold) {
      reasons.push(`High spend amount: $${spend}`);
    }
    
    if (expectedROI < 1.5) {
      reasons.push(`Low ROI warning`);
    }
    
    if (arm.profit / Math.max(arm.cost, 1) > 2) {
      reasons.push(`High-performing arm`);
    }

    return reasons.join(' • ');
  }

  async executeSpend(decision: SpendDecision): Promise<void> {
    if (decision.status !== 'approved') {
      throw new Error('Cannot execute unapproved spend decision');
    }

    // Update daily spend tracking
    this.dailySpend += decision.amount;
    
    // Update arm costs
    const arm = await this.storage.getBanditArm(decision.armId);
    if (arm) {
      await this.storage.updateBanditArm(decision.armId, {
        cost: arm.cost + decision.amount
      });
    }

    decision.status = 'executed';
    console.log(`✅ Executed spend: $${decision.amount} for ${decision.platform}`);
    
    // Log automation event
    await this.storage.createAutomationLog({
      type: 'ad_spend',
      message: `Automated spend execution: $${decision.amount}`,
      status: 'success',
      metadata: {
        decisionId: decision.id,
        platform: decision.platform,
        amount: decision.amount,
        expectedROI: decision.expectedROI
      }
    });
  }

  async approveSpendDecision(decisionId: string, approvedBy: string): Promise<void> {
    const decision = this.pendingDecisions.get(decisionId);
    if (!decision) {
      throw new Error(`Spend decision not found: ${decisionId}`);
    }

    decision.status = 'approved';
    decision.approvedAt = new Date();
    decision.approvedBy = approvedBy;

    await this.executeSpend(decision);
    this.pendingDecisions.delete(decisionId);
  }

  async rejectSpendDecision(decisionId: string, rejectedBy: string): Promise<void> {
    const decision = this.pendingDecisions.get(decisionId);
    if (!decision) {
      throw new Error(`Spend decision not found: ${decisionId}`);
    }

    decision.status = 'rejected';
    this.pendingDecisions.delete(decisionId);
    
    console.log(`❌ Spend decision rejected: $${decision.amount} by ${rejectedBy}`);
  }

  async getBudgetStatus(): Promise<BudgetStatus> {
    this.resetDailyBudgetIfNeeded();
    
    const arms = await this.storage.getBanditArms();
    const totalProfit = arms.reduce((sum, arm) => sum + arm.profit, 0);
    const totalCost = arms.reduce((sum, arm) => sum + arm.cost, 0);
    
    // Calculate platform-specific spend (simplified)
    const platformSpend: Record<string, number> = {};
    for (const platform of ['tiktok', 'instagram', 'youtube']) {
      const platformArms = arms.filter(arm => arm.platform.toLowerCase() === platform);
      platformSpend[platform] = platformArms.reduce((sum, arm) => sum + arm.cost, 0);
    }

    const roas = totalCost > 0 ? totalProfit / totalCost : 0;
    const profitMargin = totalProfit - totalCost;
    
    let riskStatus: 'safe' | 'caution' | 'danger' = 'safe';
    if (roas < 1.2) riskStatus = 'danger';
    else if (roas < 2.0) riskStatus = 'caution';

    const recommendations = this.generateRecommendations(roas, this.dailySpend, platformSpend);

    return {
      totalSpent: totalCost,
      dailySpent: this.dailySpend,
      remainingBudget: this.config.dailyBudget - this.dailySpend,
      platformSpend,
      roas,
      profitMargin,
      riskStatus,
      recommendations
    };
  }

  private generateRecommendations(roas: number, dailySpend: number, platformSpend: Record<string, number>): string[] {
    const recommendations = [];

    if (roas < 1.5) {
      recommendations.push('⚠️ Low ROAS detected - Consider pausing underperforming arms');
    }
    
    if (dailySpend > this.config.dailyBudget * 0.8) {
      recommendations.push('💰 Approaching daily budget limit');
    }
    
    const bestPlatform = Object.entries(platformSpend).reduce((a, b) => a[1] > b[1] ? a : b)[0];
    recommendations.push(`📈 ${bestPlatform} showing highest spend - monitor performance`);
    
    if (roas > 3.0) {
      recommendations.push('🚀 High ROAS - Consider increasing budget allocation');
    }

    return recommendations;
  }

  getPendingDecisions(): SpendDecision[] {
    return Array.from(this.pendingDecisions.values());
  }

  async emergencyStop(reason: string): Promise<void> {
    console.log(`🚨 EMERGENCY STOP triggered: ${reason}`);
    
    // Clear all pending decisions
    this.pendingDecisions.clear();
    
    // Log emergency stop
    await this.storage.createAutomationLog({
      type: 'emergency_stop',
      message: `Emergency stop activated: ${reason}`,
      status: 'warning',
      metadata: {
        dailySpend: this.dailySpend,
        reason,
        timestamp: new Date().toISOString()
      }
    });
    
    // Disable auto-optimization
    this.config.autoOptimizationEnabled = false;
  }

  updateConfig(newConfig: Partial<AdSpendConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('💰 Ad spend configuration updated');
  }

  getConfig(): AdSpendConfig {
    return { ...this.config };
  }
}