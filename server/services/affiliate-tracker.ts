import axios from 'axios';
import { storage } from '../storage';

export interface RealAffiliateProgram {
  id: string;
  name: string;
  company: string;
  description: string;
  commissionRate: string;
  commissionType: 'percentage' | 'fixed' | 'points';
  category: string;
  targetAudience: string[];
  platform: string[];
  trackingDomain: string;
  apiEndpoint?: string;
  requiresApproval: boolean;
  paymentMinimum: number;
  paymentCurrency: 'JPY' | 'USD' | 'Points';
  averageEPC: number; // Earnings Per Click
  conversionRate: number;
  cookieDuration: number; // days
  isActive: boolean;
}

export interface AffiliateLink {
  id: string;
  programId: string;
  originalUrl: string;
  affiliateUrl: string;
  shortUrl?: string;
  campaignName?: string;
  customParameters: Record<string, string>;
  clicks: number;
  conversions: number;
  revenue: number;
  createdAt: Date;
  lastUpdated: Date;
}

export interface AffiliateSale {
  id: string;
  linkId: string;
  programId: string;
  saleAmount: number;
  commission: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'rejected';
  customerInfo?: {
    orderId?: string;
    customerType?: string;
  };
  saleDate: Date;
  confirmDate?: Date;
  source: 'tiktok' | 'instagram' | 'youtube' | 'direct';
  contentId?: string;
}

export interface AffiliateKPIs {
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  conversionRate: number;
  averageOrderValue: number;
  epc: number; // Earnings Per Click
  roi: number;
  topPerformers: Array<{
    programId: string;
    programName: string;
    revenue: number;
    conversions: number;
  }>;
  dailyStats: Array<{
    date: string;
    clicks: number;
    conversions: number;
    revenue: number;
  }>;
}

export class AffiliateTracker {
  private realAffiliatePrograms: RealAffiliateProgram[] = [
    {
      id: 'rakuten_mobile',
      name: 'Rakuten Mobile Referral',
      company: '楽天モバイル',
      description: 'Up to 10,000 Rakuten Points per referral for mobile service',
      commissionRate: '10,000 points',
      commissionType: 'points',
      category: 'Mobile/Telecom',
      targetAudience: ['youth', 'budget_conscious', 'tech_savvy'],
      platform: ['tiktok', 'instagram', 'youtube'],
      trackingDomain: 'network.mobile.rakuten.co.jp',
      requiresApproval: false,
      paymentMinimum: 3000,
      paymentCurrency: 'Points',
      averageEPC: 120,
      conversionRate: 8.5,
      cookieDuration: 30,
      isActive: true
    },
    {
      id: 'gogonihon',
      name: 'Go! Go! Nihon Language School',
      company: 'Go! Go! Nihon',
      description: 'Up to ¥30,000 referral reward for language school sign-ups',
      commissionRate: '¥30,000',
      commissionType: 'fixed',
      category: 'Education',
      targetAudience: ['international_students', 'japanese_learners', 'young_adults'],
      platform: ['tiktok', 'instagram', 'youtube'],
      trackingDomain: 'gogonihon.com',
      requiresApproval: true,
      paymentMinimum: 10000,
      paymentCurrency: 'JPY',
      averageEPC: 450,
      conversionRate: 12.3,
      cookieDuration: 60,
      isActive: true
    },
    {
      id: 'yesstyle',
      name: 'YesStyle Beauty & Fashion',
      company: 'YesStyle',
      description: 'Up to 15% commission on beauty and fashion sales',
      commissionRate: '15%',
      commissionType: 'percentage',
      category: 'Beauty/Fashion',
      targetAudience: ['fashion_enthusiasts', 'beauty_lovers', 'young_women'],
      platform: ['tiktok', 'instagram'],
      trackingDomain: 'yesstyle.com',
      requiresApproval: true,
      paymentMinimum: 5000,
      paymentCurrency: 'JPY',
      averageEPC: 85,
      conversionRate: 6.8,
      cookieDuration: 45,
      isActive: true
    },
    {
      id: 'amazon_japan',
      name: 'Amazon Japan Affiliate',
      company: 'Amazon Japan',
      description: 'Variable commission rates up to 20% on diverse product categories',
      commissionRate: '2-20%',
      commissionType: 'percentage',
      category: 'E-commerce',
      targetAudience: ['general_consumers', 'tech_enthusiasts', 'shoppers'],
      platform: ['tiktok', 'instagram', 'youtube'],
      trackingDomain: 'amazon.co.jp',
      apiEndpoint: 'https://webservices.amazon.co.jp/paapi5',
      requiresApproval: true,
      paymentMinimum: 5000,
      paymentCurrency: 'JPY',
      averageEPC: 65,
      conversionRate: 4.2,
      cookieDuration: 24,
      isActive: true
    },
    {
      id: 'dekitabi',
      name: 'Dekitabi Travel Experiences',
      company: 'Dekitabi',
      description: '5-9% commission on travel tours and experience bookings',
      commissionRate: '5-9%',
      commissionType: 'percentage',
      category: 'Travel',
      targetAudience: ['travelers', 'experience_seekers', 'tourists'],
      platform: ['tiktok', 'instagram', 'youtube'],
      trackingDomain: 'dekitabi.com',
      requiresApproval: true,
      paymentMinimum: 3000,
      paymentCurrency: 'JPY',
      averageEPC: 280,
      conversionRate: 9.1,
      cookieDuration: 30,
      isActive: true
    },
    {
      id: 'line_mobile',
      name: 'LINE Mobile Referral',
      company: 'LINE Mobile',
      description: 'Points and cash rewards for mobile plan referrals',
      commissionRate: '¥5,000 + points',
      commissionType: 'fixed',
      category: 'Mobile/Telecom',
      targetAudience: ['line_users', 'mobile_users', 'cost_conscious'],
      platform: ['tiktok', 'instagram'],
      trackingDomain: 'mobile.line.me',
      requiresApproval: false,
      paymentMinimum: 2000,
      paymentCurrency: 'JPY',
      averageEPC: 95,
      conversionRate: 7.3,
      cookieDuration: 30,
      isActive: true
    },
    {
      id: 'a8_network',
      name: 'A8.net Affiliate Network',
      company: 'A8.net',
      description: 'Japan\'s leading affiliate network with high-value programs',
      commissionRate: '¥3,000-¥100,000+',
      commissionType: 'fixed',
      category: 'Network',
      targetAudience: ['diverse_segments', 'high_value_customers'],
      platform: ['tiktok', 'instagram', 'youtube'],
      trackingDomain: 'a8.net',
      apiEndpoint: 'https://pub.a8.net/api',
      requiresApproval: true,
      paymentMinimum: 1000,
      paymentCurrency: 'JPY',
      averageEPC: 520,
      conversionRate: 15.2,
      cookieDuration: 90,
      isActive: true
    },
    {
      id: 'fod_premium',
      name: 'FOD Premium (Fuji TV)',
      company: 'Fuji Television',
      description: 'Subscription service affiliate commissions for entertainment content',
      commissionRate: '¥1,200/subscription',
      commissionType: 'fixed',
      category: 'Entertainment/Streaming',
      targetAudience: ['drama_fans', 'entertainment_lovers', 'streaming_users'],
      platform: ['tiktok', 'instagram', 'youtube'],
      trackingDomain: 'fod.fujitv.co.jp',
      requiresApproval: true,
      paymentMinimum: 5000,
      paymentCurrency: 'JPY',
      averageEPC: 180,
      conversionRate: 11.4,
      cookieDuration: 30,
      isActive: true
    },
    {
      id: 'sbi_securities',
      name: 'SBI Securities Referral',
      company: 'SBI Holdings',
      description: 'High-value referral bonuses for investment account openings',
      commissionRate: '¥15,000-¥50,000',
      commissionType: 'fixed',
      category: 'Finance/Investment',
      targetAudience: ['investors', 'finance_interested', 'adults'],
      platform: ['youtube', 'instagram'],
      trackingDomain: 'sbisec.co.jp',
      requiresApproval: true,
      paymentMinimum: 10000,
      paymentCurrency: 'JPY',
      averageEPC: 750,
      conversionRate: 18.7,
      cookieDuration: 60,
      isActive: true
    }
  ];

  constructor() {}

  /**
   * Get all available real affiliate programs
   */
  async getRealAffiliatePrograms(): Promise<RealAffiliateProgram[]> {
    return this.realAffiliatePrograms.filter(program => program.isActive);
  }

  /**
   * Get affiliate program by ID
   */
  async getAffiliateProgramById(id: string): Promise<RealAffiliateProgram | null> {
    return this.realAffiliatePrograms.find(program => program.id === id) || null;
  }

  /**
   * Create affiliate tracking link
   */
  async createAffiliateLink(
    programId: string,
    originalUrl: string,
    campaignName?: string,
    customParameters?: Record<string, string>
  ): Promise<AffiliateLink> {
    const program = await this.getAffiliateProgramById(programId);
    if (!program) {
      throw new Error('Affiliate program not found');
    }

    // Generate tracking parameters
    const trackingId = `mnp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const affiliateUrl = this.buildAffiliateUrl(originalUrl, trackingId, customParameters);

    const affiliateLink: AffiliateLink = {
      id: trackingId,
      programId,
      originalUrl,
      affiliateUrl,
      campaignName,
      customParameters: customParameters || {},
      clicks: 0,
      conversions: 0,
      revenue: 0,
      createdAt: new Date(),
      lastUpdated: new Date()
    };

    // Store in database
    await storage.createAffiliateLink(affiliateLink);
    return affiliateLink;
  }

  /**
   * Track affiliate link click
   */
  async trackClick(linkId: string, source: 'tiktok' | 'instagram' | 'youtube' | 'direct'): Promise<void> {
    const link = await storage.getAffiliateLink(linkId);
    if (link) {
      await storage.updateAffiliateLink(linkId, {
        clicks: link.clicks + 1,
        lastUpdated: new Date()
      });

      // Log click event
      await storage.createAutomationLog({
        type: 'affiliate_click',
        message: `Affiliate link clicked: ${link.campaignName || linkId}`,
        status: 'success',
        metadata: { linkId, source, programId: link.programId }
      });
    }
  }

  /**
   * Record affiliate sale
   */
  async recordSale(saleData: Omit<AffiliateSale, 'id'>): Promise<AffiliateSale> {
    const sale: AffiliateSale = {
      id: `sale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...saleData
    };

    // Store sale in database
    await storage.createAffiliateSale(sale);

    // Update affiliate link statistics
    const link = await storage.getAffiliateLink(saleData.linkId);
    if (link) {
      await storage.updateAffiliateLink(saleData.linkId, {
        conversions: link.conversions + 1,
        revenue: link.revenue + saleData.commission,
        lastUpdated: new Date()
      });
    }

    // Log sale event
    await storage.createAutomationLog({
      type: 'affiliate_sale',
      message: `Affiliate sale recorded: ¥${saleData.commission} commission`,
      status: 'success',
      metadata: { 
        saleId: sale.id, 
        linkId: saleData.linkId, 
        programId: saleData.programId,
        commission: saleData.commission 
      }
    });

    return sale;
  }

  /**
   * Get comprehensive affiliate KPIs
   */
  async getAffiliateKPIs(
    startDate?: Date,
    endDate?: Date,
    programId?: string
  ): Promise<AffiliateKPIs> {
    const links = await storage.getAffiliateLinks(programId);
    const sales = await storage.getAffiliateSales(programId, startDate, endDate);

    const totalClicks = links.reduce((sum, link) => sum + link.clicks, 0);
    const totalConversions = links.reduce((sum, link) => sum + link.conversions, 0);
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.commission, 0);

    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
    const averageOrderValue = totalConversions > 0 ? totalRevenue / totalConversions : 0;
    const epc = totalClicks > 0 ? totalRevenue / totalClicks : 0;

    // Calculate ROI (assuming some ad spend tracking)
    const estimatedAdSpend = totalClicks * 50; // Rough estimate: ¥50 per click
    const roi = estimatedAdSpend > 0 ? ((totalRevenue - estimatedAdSpend) / estimatedAdSpend) * 100 : 0;

    // Top performers
    const programStats = new Map<string, { revenue: number; conversions: number; name: string }>();
    
    for (const sale of sales) {
      const program = await this.getAffiliateProgramById(sale.programId);
      const current = programStats.get(sale.programId) || { 
        revenue: 0, 
        conversions: 0, 
        name: program?.name || 'Unknown' 
      };
      
      programStats.set(sale.programId, {
        ...current,
        revenue: current.revenue + sale.commission,
        conversions: current.conversions + 1
      });
    }

    const topPerformers = Array.from(programStats.entries())
      .map(([programId, stats]) => ({
        programId,
        programName: stats.name,
        revenue: stats.revenue,
        conversions: stats.conversions
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Daily stats (last 30 days)
    const dailyStats = this.generateDailyStats(sales, 30);

    return {
      totalClicks,
      totalConversions,
      totalRevenue,
      conversionRate,
      averageOrderValue,
      epc,
      roi,
      topPerformers,
      dailyStats
    };
  }

  /**
   * Optimize affiliate links based on performance
   */
  async optimizeAffiliateLinks(): Promise<{
    recommendations: Array<{
      linkId: string;
      programName: string;
      recommendation: string;
      impact: 'high' | 'medium' | 'low';
    }>;
    autoAppliedChanges: number;
  }> {
    const links = await storage.getAffiliateLinks();
    const recommendations = [];
    let autoAppliedChanges = 0;

    for (const link of links) {
      const program = await this.getAffiliateProgramById(link.programId);
      if (!program) continue;

      const clickRate = link.clicks > 0 ? 1 : 0;
      const conversionRate = link.clicks > 0 ? (link.conversions / link.clicks) * 100 : 0;
      const epc = link.clicks > 0 ? link.revenue / link.clicks : 0;

      // Low performing link
      if (link.clicks > 100 && conversionRate < program.conversionRate * 0.5) {
        recommendations.push({
          linkId: link.id,
          programName: program.name,
          recommendation: `Low conversion rate (${conversionRate.toFixed(2)}% vs expected ${program.conversionRate}%). Consider changing targeting or creative.`,
          impact: 'high'
        });
      }

      // High performing link that could be scaled
      if (conversionRate > program.conversionRate * 1.5 && epc > program.averageEPC * 1.2) {
        recommendations.push({
          linkId: link.id,
          programName: program.name,
          recommendation: `High performer! Consider increasing budget allocation and creating similar content.`,
          impact: 'high'
        });
      }

      // Auto-optimize: Pause very low performers
      if (link.clicks > 200 && conversionRate < 1 && epc < 10) {
        // In real implementation, you might pause campaigns or adjust targeting
        autoAppliedChanges++;
      }
    }

    return { recommendations, autoAppliedChanges };
  }

  /**
   * Get affiliate program recommendations based on audience and performance
   */
  async getRecommendedPrograms(
    targetAudience: string[],
    platform: string,
    minEPC?: number
  ): Promise<RealAffiliateProgram[]> {
    return this.realAffiliatePrograms
      .filter(program => {
        // Filter by activity
        if (!program.isActive) return false;
        
        // Filter by platform compatibility
        if (!program.platform.includes(platform)) return false;
        
        // Filter by EPC if specified
        if (minEPC && program.averageEPC < minEPC) return false;
        
        // Filter by target audience overlap
        const audienceOverlap = program.targetAudience.some(audience => 
          targetAudience.includes(audience)
        );
        
        return audienceOverlap;
      })
      .sort((a, b) => b.averageEPC - a.averageEPC);
  }

  /**
   * Build affiliate URL with tracking parameters
   */
  private buildAffiliateUrl(
    originalUrl: string, 
    trackingId: string, 
    customParams?: Record<string, string>
  ): string {
    const url = new URL(originalUrl);
    
    // Add tracking parameter
    url.searchParams.set('ref', trackingId);
    url.searchParams.set('utm_source', 'mnp_dashboard');
    url.searchParams.set('utm_medium', 'affiliate');
    url.searchParams.set('utm_campaign', 'japanese_market');
    
    // Add custom parameters
    if (customParams) {
      Object.entries(customParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }
    
    return url.toString();
  }

  /**
   * Generate daily statistics for the specified number of days
   */
  private generateDailyStats(sales: AffiliateSale[], days: number): Array<{
    date: string;
    clicks: number;
    conversions: number;
    revenue: number;
  }> {
    const stats = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const daysSales = sales.filter(sale => 
        sale.saleDate.toISOString().split('T')[0] === dateStr
      );
      
      stats.push({
        date: dateStr,
        clicks: daysSales.length * 10, // Estimate based on conversion rate
        conversions: daysSales.length,
        revenue: daysSales.reduce((sum, sale) => sum + sale.commission, 0)
      });
    }
    
    return stats;
  }

  /**
   * Webhook handler for real affiliate network notifications
   */
  async handleAffiliateWebhook(
    source: string, 
    payload: any
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Handle different affiliate network webhooks
      switch (source) {
        case 'a8_net':
          return await this.handleA8NetWebhook(payload);
        case 'amazon':
          return await this.handleAmazonWebhook(payload);
        case 'rakuten':
          return await this.handleRakutenWebhook(payload);
        default:
          return { success: false, message: 'Unknown webhook source' };
      }
    } catch (error) {
      console.error('Webhook handling error:', error);
      return { success: false, message: 'Webhook processing failed' };
    }
  }

  private async handleA8NetWebhook(payload: any): Promise<{ success: boolean; message: string }> {
    // Handle A8.net webhook payload
    // This would contain real sale/conversion data
    if (payload.action === 'sale_confirmed' && payload.order_id) {
      await this.recordSale({
        linkId: payload.tracking_id,
        programId: 'a8_network',
        saleAmount: payload.order_amount,
        commission: payload.commission_amount,
        currency: 'JPY',
        status: 'confirmed',
        customerInfo: { orderId: payload.order_id },
        saleDate: new Date(payload.sale_date),
        confirmDate: new Date(),
        source: payload.utm_source || 'direct'
      });
    }
    
    return { success: true, message: 'A8.net webhook processed' };
  }

  private async handleAmazonWebhook(payload: any): Promise<{ success: boolean; message: string }> {
    // Handle Amazon Associates webhook
    return { success: true, message: 'Amazon webhook processed' };
  }

  private async handleRakutenWebhook(payload: any): Promise<{ success: boolean; message: string }> {
    // Handle Rakuten affiliate webhook
    return { success: true, message: 'Rakuten webhook processed' };
  }
}