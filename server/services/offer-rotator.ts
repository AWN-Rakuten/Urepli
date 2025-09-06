import { IStorage } from '../storage.js';

export interface Offer {
  id: string;
  streamKey: string;
  title: string;
  description: string;
  affiliateUrl: string;
  merchant: string;
  commission: number;
  isActive: boolean;
  epc: number; // Earnings Per Click
  cvr: number; // Conversion Rate
  eligibilityHints: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OfferPerformance {
  offerId: string;
  clicks: number;
  conversions: number;
  revenue: number;
  cost: number;
  period: string; // '24h', '7d', '30d'
  updatedAt: Date;
}

export interface QuizAnswer {
  carrier?: string;
  budget?: string;
  device?: string;
  [key: string]: string | undefined;
}

export class OfferRotatorService {
  private storage: IStorage;
  private offers: Map<string, Offer[]> = new Map(); // streamKey -> offers
  private performance: Map<string, OfferPerformance> = new Map(); // offerId -> performance

  constructor(storage: IStorage) {
    this.storage = storage;
    this.initializeOffers();
  }

  private initializeOffers(): void {
    // Initialize real affiliate offers for each stream
    const offerData = [
      // MNP Stream
      {
        streamKey: 'mnp',
        offers: [
          {
            id: 'rakuten_mobile_mnp',
            title: '楽天モバイル乗り換えキャンペーン',
            description: '最大24,000円相当ポイント還元＋事務手数料無料',
            affiliateUrl: process.env.AFFILIATE_MNP_RAKUTEN || '',
            merchant: '楽天モバイル',
            commission: 3000,
            epc: 450,
            cvr: 0.15,
            eligibilityHints: ['docomo', 'au', 'softbank']
          },
          {
            id: 'linemo_mnp',
            title: 'LINEMO乗り換えキャンペーン',
            description: 'ミニプラン最大8ヶ月実質無料＋PayPayポイント還元',
            affiliateUrl: process.env.AFFILIATE_MNP_LINEMO || '',
            merchant: 'LINEMO',
            commission: 2500,
            epc: 380,
            cvr: 0.12,
            eligibilityHints: ['docomo', 'au', 'rakuten']
          }
        ]
      },
      // Credit Card Stream
      {
        streamKey: 'credit',
        offers: [
          {
            id: 'rakuten_card',
            title: '楽天カード新規入会キャンペーン',
            description: '新規入会＋利用で最大5,000ポイント獲得',
            affiliateUrl: process.env.AFFILIATE_CREDIT_RAKUTEN || '',
            merchant: '楽天カード',
            commission: 1200,
            epc: 240,
            cvr: 0.20,
            eligibilityHints: ['rakuten_user', 'point_collector']
          },
          {
            id: 'jcb_card_w',
            title: 'JCB CARD W 入会キャンペーン',
            description: '新規入会限定！最大15,000円キャッシュバック',
            affiliateUrl: process.env.AFFILIATE_CREDIT_JCB || '',
            merchant: 'JCB',
            commission: 1500,
            epc: 300,
            cvr: 0.18,
            eligibilityHints: ['young_adult', 'amazon_user']
          }
        ]
      },
      // Travel Stream
      {
        streamKey: 'travel',
        offers: [
          {
            id: 'jalan_travel',
            title: 'じゃらん特別プラン',
            description: '国内宿泊最大20%OFF＋Pontaポイント還元',
            affiliateUrl: process.env.AFFILIATE_TRAVEL_JALAN || '',
            merchant: 'じゃらん',
            commission: 800,
            epc: 120,
            cvr: 0.08,
            eligibilityHints: ['domestic_travel', 'point_user']
          },
          {
            id: 'booking_com',
            title: 'Booking.com 特別割引',
            description: '海外ホテル予約で最大25%OFF＋無料キャンセル',
            affiliateUrl: process.env.AFFILIATE_TRAVEL_BOOKING || '',
            merchant: 'Booking.com',
            commission: 1000,
            epc: 150,
            cvr: 0.06,
            eligibilityHints: ['international_travel']
          }
        ]
      }
    ];

    // Initialize offers in memory (in production, this would be from database)
    offerData.forEach(({ streamKey, offers }) => {
      const streamOffers = offers.map(offer => ({
        ...offer,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      this.offers.set(streamKey, streamOffers);
    });

    console.log(`Initialized ${offerData.length} offer streams with real affiliate links`);
  }

  getTopOfferForStream(streamKey: string, quizAnswers?: QuizAnswer): Offer | null {
    const streamOffers = this.offers.get(streamKey);
    if (!streamOffers || streamOffers.length === 0) return null;

    // Filter active offers
    let activeOffers = streamOffers.filter(offer => offer.isActive);
    
    // Apply quiz-based filtering if answers provided
    if (quizAnswers) {
      activeOffers = this.filterOffersByQuiz(activeOffers, quizAnswers);
    }

    // Sort by EPC (earnings per click) descending
    activeOffers.sort((a, b) => b.epc - a.epc);
    
    return activeOffers[0] || null;
  }

  private filterOffersByQuiz(offers: Offer[], answers: QuizAnswer): Offer[] {
    return offers.filter(offer => {
      // Check carrier compatibility for MNP offers
      if (answers.carrier && offer.eligibilityHints.includes(answers.carrier)) {
        return true;
      }
      
      // Check budget compatibility
      if (answers.budget) {
        const budgetNum = parseInt(answers.budget.replace(/[^\d]/g, ''));
        if (budgetNum && offer.commission <= budgetNum * 0.1) { // Commission should be reasonable vs budget
          return true;
        }
      }
      
      // Default: include if no specific eligibility hints
      return offer.eligibilityHints.length === 0;
    });
  }

  async updateOfferPerformance(offerId: string, clicks: number, conversions: number, revenue: number, cost: number): Promise<void> {
    const performance: OfferPerformance = {
      offerId,
      clicks,
      conversions,
      revenue,
      cost,
      period: '24h',
      updatedAt: new Date()
    };

    this.performance.set(offerId, performance);

    // Update EPC and CVR for the offer
    const offer = this.findOfferById(offerId);
    if (offer && clicks > 0) {
      offer.epc = revenue / clicks;
      offer.cvr = conversions / clicks;
      offer.updatedAt = new Date();
    }

    // Log performance update
    await this.storage.createAutomationLog({
      type: 'offer_performance_update',
      message: `Updated performance for offer ${offerId}: EPC ¥${Math.round(offer?.epc || 0)}, CVR ${Math.round((offer?.cvr || 0) * 100)}%`,
      status: 'success',
      workflowId: null,
      metadata: {
        offerId,
        clicks,
        conversions,
        revenue,
        cost,
        newEPC: offer?.epc,
        newCVR: offer?.cvr
      }
    });
  }

  private findOfferById(offerId: string): Offer | null {
    for (const streamOffers of this.offers.values()) {
      const offer = streamOffers.find(o => o.id === offerId);
      if (offer) return offer;
    }
    return null;
  }

  async handleAffiliatePostback(data: any): Promise<void> {
    // Handle real affiliate network postbacks (A8.net, ValueCommerce, Rakuten, etc.)
    const { offerId, transactionId, amount, status } = data;
    
    if (status === 'approved') {
      const performance = this.performance.get(offerId) || {
        offerId,
        clicks: 0,
        conversions: 0,
        revenue: 0,
        cost: 0,
        period: '24h',
        updatedAt: new Date()
      };

      performance.conversions += 1;
      performance.revenue += parseFloat(amount) || 0;
      performance.updatedAt = new Date();

      this.performance.set(offerId, performance);

      // Update offer EPC
      const offer = this.findOfferById(offerId);
      if (offer && performance.clicks > 0) {
        offer.epc = performance.revenue / performance.clicks;
        offer.cvr = performance.conversions / performance.clicks;
      }

      await this.storage.createAutomationLog({
        type: 'affiliate_conversion',
        message: `Conversion approved: ${offerId} - ¥${amount}`,
        status: 'success',
        workflowId: null,
        metadata: {
          offerId,
          transactionId,
          amount,
          newEPC: offer?.epc,
          totalRevenue: performance.revenue
        }
      });
    }
  }

  generateLandingPageUrl(streamKey: string, quizAnswers?: QuizAnswer): string {
    const baseUrl = process.env.LP_BASE_URL || 'https://your-domain.com';
    const quiz = quizAnswers ? `&${new URLSearchParams(quizAnswers as Record<string, string>).toString()}` : '';
    return `${baseUrl}/offers/${streamKey}?t=${Date.now()}${quiz}`;
  }

  getStreamPerformanceReport(streamKey: string): any {
    const streamOffers = this.offers.get(streamKey) || [];
    const totalPerformance = streamOffers.reduce((acc, offer) => {
      const perf = this.performance.get(offer.id);
      if (perf) {
        acc.clicks += perf.clicks;
        acc.conversions += perf.conversions;
        acc.revenue += perf.revenue;
        acc.cost += perf.cost;
      }
      return acc;
    }, { clicks: 0, conversions: 0, revenue: 0, cost: 0 });

    const avgEPC = totalPerformance.clicks > 0 ? totalPerformance.revenue / totalPerformance.clicks : 0;
    const cvr = totalPerformance.clicks > 0 ? totalPerformance.conversions / totalPerformance.clicks : 0;
    const roi = totalPerformance.cost > 0 ? (totalPerformance.revenue - totalPerformance.cost) / totalPerformance.cost : 0;

    return {
      streamKey,
      activeOffers: streamOffers.filter(o => o.isActive).length,
      totalOffers: streamOffers.length,
      performance: totalPerformance,
      metrics: {
        avgEPC: Math.round(avgEPC),
        cvr: Math.round(cvr * 10000) / 100, // Convert to percentage
        roi: Math.round(roi * 10000) / 100,
        profit: totalPerformance.revenue - totalPerformance.cost
      },
      topOffer: streamOffers.sort((a, b) => b.epc - a.epc)[0]
    };
  }

  getAllOffers(): Map<string, Offer[]> {
    return this.offers;
  }

  getPerformanceData(): Map<string, OfferPerformance> {
    return this.performance;
  }

  async checkAMBumpEligibility(): Promise<string[]> {
    // Check which offers are eligible for AM bump requests
    const eligibleOffers: string[] = [];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    for (const [offerId, performance] of this.performance.entries()) {
      const offer = this.findOfferById(offerId);
      if (!offer) continue;

      // Criteria: EPC > ¥300, conversions > 50, high performance
      if (performance.conversions >= 50 && offer.epc >= 300 && performance.revenue >= 15000) {
        eligibleOffers.push(offerId);
        
        // Log bump opportunity
        await this.storage.createAutomationLog({
          type: 'am_bump_eligible',
          message: `Offer ${offerId} eligible for AM bump: ${performance.conversions} conversions, ¥${Math.round(offer.epc)} EPC`,
          status: 'success',
          workflowId: null,
          metadata: {
            offerId,
            conversions: performance.conversions,
            epc: offer.epc,
            revenue: performance.revenue,
            merchant: offer.merchant
          }
        });
      }
    }

    return eligibleOffers;
  }
}