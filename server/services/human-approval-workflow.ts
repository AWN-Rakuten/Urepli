import { IStorage } from '../storage';

export interface ApprovalRequest {
  id: string;
  type: 'ad_spend' | 'content_publish' | 'budget_increase' | 'compliance_override' | 'emergency_action';
  title: string;
  description: string;
  requestedBy: 'system' | 'automation' | string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  data: any; // Context-specific data
  automatedRecommendation: 'approve' | 'reject' | 'modify';
  reasoning: string;
  impact: {
    financial: number; // Dollar impact
    risk: 'low' | 'medium' | 'high';
    platforms: string[];
    estimatedOutcome: string;
  };
  timeout: Date; // Auto-action if not responded to
  fallbackAction: 'approve' | 'reject' | 'pause';
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'auto_actioned';
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  comments?: string;
}

export interface AutomationOverride {
  condition: string;
  action: 'bypass_approval' | 'require_approval' | 'emergency_stop';
  threshold: any;
  enabled: boolean;
}

export class HumanApprovalWorkflow {
  private storage: IStorage;
  private pendingRequests: Map<string, ApprovalRequest> = new Map();
  private automationOverrides: AutomationOverride[] = [];
  private autoApprovalEnabled: boolean = true;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.initializeDefaultOverrides();
    this.startTimeoutChecker();
  }

  private initializeDefaultOverrides(): void {
    this.automationOverrides = [
      {
        condition: 'ad_spend_under_10',
        action: 'bypass_approval',
        threshold: { amount: 10 },
        enabled: true
      },
      {
        condition: 'roas_above_3',
        action: 'bypass_approval', 
        threshold: { roas: 3.0 },
        enabled: true
      },
      {
        condition: 'daily_loss_over_20_percent',
        action: 'emergency_stop',
        threshold: { lossPercentage: 20 },
        enabled: true
      },
      {
        condition: 'budget_increase_over_500',
        action: 'require_approval',
        threshold: { amount: 500 },
        enabled: true
      }
    ];
  }

  async createApprovalRequest(
    type: ApprovalRequest['type'],
    title: string,
    description: string,
    data: any,
    impact: ApprovalRequest['impact'],
    timeoutMinutes: number = 60
  ): Promise<ApprovalRequest> {
    
    const request: ApprovalRequest = {
      id: `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      description,
      requestedBy: 'automation',
      priority: this.calculatePriority(type, impact),
      data,
      automatedRecommendation: this.generateAutomatedRecommendation(type, data, impact),
      reasoning: this.generateReasoning(type, data, impact),
      impact,
      timeout: new Date(Date.now() + timeoutMinutes * 60 * 1000),
      fallbackAction: this.determineFallbackAction(type, impact),
      status: 'pending',
      createdAt: new Date()
    };

    // Check if automation overrides apply
    if (this.shouldBypassApproval(request)) {
      request.status = 'auto_actioned';
      request.reviewedAt = new Date();
      request.reviewedBy = 'system_automation';
      request.comments = 'Auto-approved by automation rules';
      
      await this.executeApproval(request, true);
      return request;
    }

    // Store pending request
    this.pendingRequests.set(request.id, request);
    
    // Log for human review
    await this.storage.createAutomationLog({
      type: 'approval_request',
      message: `Human approval required: ${title}`,
      status: 'pending',
      metadata: {
        requestId: request.id,
        type: request.type,
        priority: request.priority,
        impact: request.impact
      }
    });

    console.log(`👤 Human approval required: ${title} (Priority: ${request.priority})`);
    return request;
  }

  private calculatePriority(type: ApprovalRequest['type'], impact: ApprovalRequest['impact']): ApprovalRequest['priority'] {
    if (impact.financial > 200 || impact.risk === 'high') return 'critical';
    if (impact.financial > 50 || impact.risk === 'medium') return 'high';
    if (impact.financial > 10) return 'medium';
    return 'low';
  }

  private generateAutomatedRecommendation(
    type: ApprovalRequest['type'], 
    data: any, 
    impact: ApprovalRequest['impact']
  ): 'approve' | 'reject' | 'modify' {
    
    switch (type) {
      case 'ad_spend':
        const expectedROI = data.expectedROI || 0;
        if (expectedROI > 2.0 && impact.risk === 'low') return 'approve';
        if (expectedROI < 1.2) return 'reject';
        return 'modify';
        
      case 'content_publish':
        if (data.complianceScore > 0.8) return 'approve';
        if (data.complianceScore < 0.5) return 'reject';
        return 'modify';
        
      case 'budget_increase':
        if (data.currentROAS > 2.5 && impact.financial < 100) return 'approve';
        return 'modify';
        
      default:
        return 'modify';
    }
  }

  private generateReasoning(type: ApprovalRequest['type'], data: any, impact: ApprovalRequest['impact']): string {
    const reasons = [];
    
    reasons.push(`Financial impact: $${impact.financial}`);
    reasons.push(`Risk level: ${impact.risk}`);
    reasons.push(`Platforms affected: ${impact.platforms.join(', ')}`);
    
    if (type === 'ad_spend') {
      reasons.push(`Expected ROI: ${data.expectedROI?.toFixed(2) || 'unknown'}x`);
    }
    
    if (data.complianceScore) {
      reasons.push(`Compliance score: ${(data.complianceScore * 100).toFixed(0)}%`);
    }
    
    if (data.currentROAS) {
      reasons.push(`Current ROAS: ${data.currentROAS.toFixed(2)}x`);
    }

    return reasons.join(' • ');
  }

  private determineFallbackAction(type: ApprovalRequest['type'], impact: ApprovalRequest['impact']): 'approve' | 'reject' | 'pause' {
    if (impact.risk === 'high' || impact.financial > 100) {
      return 'reject'; // Conservative fallback
    }
    
    if (type === 'ad_spend' || type === 'budget_increase') {
      return 'pause'; // Safe middle ground
    }
    
    return 'reject'; // Default to safe
  }

  private shouldBypassApproval(request: ApprovalRequest): boolean {
    if (!this.autoApprovalEnabled) return false;
    
    for (const override of this.automationOverrides) {
      if (!override.enabled) continue;
      
      if (this.matchesOverrideCondition(request, override)) {
        if (override.action === 'bypass_approval') {
          console.log(`🤖 Auto-bypassing approval: ${override.condition}`);
          return true;
        }
        
        if (override.action === 'emergency_stop') {
          console.log(`🚨 Emergency stop triggered: ${override.condition}`);
          // Trigger emergency procedures
          return false; // Don't bypass, need human intervention
        }
      }
    }
    
    return false;
  }

  private matchesOverrideCondition(request: ApprovalRequest, override: AutomationOverride): boolean {
    const { condition, threshold } = override;
    const { data, impact } = request;
    
    switch (condition) {
      case 'ad_spend_under_10':
        return request.type === 'ad_spend' && impact.financial <= threshold.amount;
        
      case 'roas_above_3':
        return data.expectedROI >= threshold.roas;
        
      case 'daily_loss_over_20_percent':
        return data.lossPercentage >= threshold.lossPercentage;
        
      case 'budget_increase_over_500':
        return request.type === 'budget_increase' && impact.financial >= threshold.amount;
        
      default:
        return false;
    }
  }

  async approveRequest(requestId: string, approvedBy: string, comments?: string): Promise<void> {
    const request = this.pendingRequests.get(requestId);
    if (!request) {
      throw new Error(`Approval request not found: ${requestId}`);
    }

    request.status = 'approved';
    request.reviewedAt = new Date();
    request.reviewedBy = approvedBy;
    request.comments = comments;

    await this.executeApproval(request, true);
    this.pendingRequests.delete(requestId);

    console.log(`✅ Request approved: ${request.title} by ${approvedBy}`);
  }

  async rejectRequest(requestId: string, rejectedBy: string, comments?: string): Promise<void> {
    const request = this.pendingRequests.get(requestId);
    if (!request) {
      throw new Error(`Approval request not found: ${requestId}`);
    }

    request.status = 'rejected';
    request.reviewedAt = new Date();
    request.reviewedBy = rejectedBy;
    request.comments = comments;

    await this.executeApproval(request, false);
    this.pendingRequests.delete(requestId);

    console.log(`❌ Request rejected: ${request.title} by ${rejectedBy}`);
  }

  private async executeApproval(request: ApprovalRequest, approved: boolean): Promise<void> {
    // Log the decision
    await this.storage.createAutomationLog({
      type: 'approval_decision',
      message: `Approval ${approved ? 'granted' : 'denied'}: ${request.title}`,
      status: approved ? 'success' : 'info',
      metadata: {
        requestId: request.id,
        type: request.type,
        approved,
        reviewedBy: request.reviewedBy,
        impact: request.impact
      }
    });

    // Execute the appropriate action based on request type
    if (approved) {
      await this.executeApprovedAction(request);
    } else {
      await this.executeRejectedAction(request);
    }
  }

  private async executeApprovedAction(request: ApprovalRequest): Promise<void> {
    switch (request.type) {
      case 'ad_spend':
        // Execute the ad spend through AdSpendManager
        console.log(`💰 Executing approved ad spend: $${request.impact.financial}`);
        break;
        
      case 'content_publish':
        // Publish the content
        console.log(`📢 Publishing approved content to ${request.impact.platforms.join(', ')}`);
        break;
        
      case 'budget_increase':
        // Increase budget limits
        console.log(`📈 Increasing budget by $${request.impact.financial}`);
        break;
        
      case 'compliance_override':
        // Override compliance check
        console.log(`⚠️ Compliance override approved for ${request.data.contentId}`);
        break;
        
      case 'emergency_action':
        // Execute emergency action
        console.log(`🚨 Emergency action executed: ${request.data.action}`);
        break;
    }
  }

  private async executeRejectedAction(request: ApprovalRequest): Promise<void> {
    switch (request.type) {
      case 'ad_spend':
        console.log(`🛑 Ad spend rejected, pausing campaign`);
        break;
        
      case 'content_publish':
        console.log(`🛑 Content publication blocked`);
        break;
        
      case 'budget_increase':
        console.log(`🛑 Budget increase denied`);
        break;
    }
  }

  private startTimeoutChecker(): void {
    setInterval(async () => {
      const now = new Date();
      
      for (const [id, request] of this.pendingRequests.entries()) {
        if (request.timeout <= now && request.status === 'pending') {
          console.log(`⏰ Request timeout: ${request.title}, executing fallback action: ${request.fallbackAction}`);
          
          request.status = 'expired';
          request.reviewedAt = new Date();
          request.reviewedBy = 'system_timeout';
          request.comments = `Auto-actioned due to timeout: ${request.fallbackAction}`;
          
          const approved = request.fallbackAction === 'approve';
          await this.executeApproval(request, approved);
          
          this.pendingRequests.delete(id);
        }
      }
    }, 60000); // Check every minute
  }

  getPendingRequests(): ApprovalRequest[] {
    return Array.from(this.pendingRequests.values())
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
  }

  getRequestById(id: string): ApprovalRequest | undefined {
    return this.pendingRequests.get(id);
  }

  enableAutoApproval(): void {
    this.autoApprovalEnabled = true;
    console.log('🤖 Auto-approval enabled');
  }

  disableAutoApproval(): void {
    this.autoApprovalEnabled = false;
    console.log('👤 Auto-approval disabled - all requests require human review');
  }

  updateOverride(condition: string, override: Partial<AutomationOverride>): void {
    const index = this.automationOverrides.findIndex(o => o.condition === condition);
    if (index >= 0) {
      this.automationOverrides[index] = { ...this.automationOverrides[index], ...override };
    }
  }

  getStats() {
    const pending = this.getPendingRequests();
    return {
      pendingCount: pending.length,
      criticalCount: pending.filter(r => r.priority === 'critical').length,
      autoApprovalEnabled: this.autoApprovalEnabled,
      overridesEnabled: this.automationOverrides.filter(o => o.enabled).length
    };
  }
}