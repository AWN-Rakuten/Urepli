import { GoogleCloudAutomation, ConversionEvent } from './google-cloud-automation';
import { Firestore } from '@google-cloud/firestore';
import { BigQuery } from '@google-cloud/bigquery';

export interface AffiliateLink {
  id: string;
  originalUrl: string;
  trackingUrl: string;
  campaignId: string;
  postId: string;
  platform: string;
  linkType: 'mnp' | 'smartphone' | 'carrier' | 'savings' | 'plan';
  commission: {
    type: 'percentage' | 'fixed';
    value: number; // percentage (0-100) or fixed amount in JPY
  };
  status: 'active' | 'paused' | 'expired';
  createdAt: Date;
  expiresAt?: Date;
  metadata: {
    category: string;
    keywords: string[];
    targetAudience: string;
  };
}

export interface AffiliatePerformance {
  linkId: string;
  clicks: number;
  conversions: number;
  revenue: number;
  cost: number;
  roi: number;
  conversionRate: number;
  averageOrderValue: number;
  timeframe: {
    start: Date;
    end: Date;
  };
}

export interface ConversionTracking {
  id: string;
  linkId: string;
  clickId: string;
  userId?: string;
  sessionId: string;
  conversionValue: number;
  conversionType: 'purchase' | 'signup' | 'download' | 'subscription';
  timestamp: Date;
  attribution: {
    firstTouch: string;
    lastTouch: string;
    touchPoints: Array<{
      platform: string;
      timestamp: Date;
      action: string;
    }>;
  };
  customerData: {
    segment: string;
    ltv?: number; // Lifetime value
    deviceType: string;
    location: string;
  };
}

export class GoogleCloudAffiliateTracker {
  private cloudAutomation: GoogleCloudAutomation;
  private firestore: Firestore;
  private bigquery: BigQuery;
  
  private readonly PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID || 'mnp-dashboard';
  private readonly BASE_TRACKING_URL = 'https://track.mnpdashboard.com';
  
  // Real affiliate URLs for Japanese mobile market
  private readonly AFFILIATE_PROVIDERS = {
    mnp: {
      baseUrl: 'https://px.a8.net/svt/ejp?a8mat=3N9XYM+XXXX+4DKQ+5YJRM',
      commission: { type: 'fixed' as const, value: 8000 }, // 8,000 JPY per conversion
      category: 'Mobile Number Portability',
    },
    smartphone: {
      baseUrl: 'https://ck.jp.ap.valuecommerce.com/servlet/referral?sid=XXXX&pid=XXXX',
      commission: { type: 'percentage' as const, value: 3.5 }, // 3.5% commission
      category: 'Smartphone Sales',
    },
    carrier: {
      baseUrl: 'https://t.felmat.net/fmcl?ak=XXXX',
      commission: { type: 'fixed' as const, value: 12000 }, // 12,000 JPY for carrier switch
      category: 'Carrier Services',
    },
    savings: {
      baseUrl: 'https://link-ag.net/link.php?i=XXXX&m=XXXX',
      commission: { type: 'percentage' as const, value: 5.0 }, // 5% of savings amount
      category: 'Cost Savings Calculator',
    },
    plan: {
      baseUrl: 'https://www.accesstrade.net/at/c.html?rk=XXXX',
      commission: { type: 'fixed' as const, value: 5000 }, // 5,000 JPY per plan signup
      category: 'Mobile Plans',
    },
  };

  constructor() {
    this.cloudAutomation = new GoogleCloudAutomation();
    
    this.firestore = new Firestore({
      projectId: this.PROJECT_ID,
    });
    
    this.bigquery = new BigQuery({
      projectId: this.PROJECT_ID,
    });
  }

  /**
   * Generate affiliate tracking link
   */
  async generateTrackingLink(
    postId: string,
    platform: string,
    linkType: keyof typeof this.AFFILIATE_PROVIDERS,
    campaignId: string = 'default',
    customParams: Record<string, string> = {}
  ): Promise<AffiliateLink> {
    try {
      const provider = this.AFFILIATE_PROVIDERS[linkType];
      if (!provider) {
        throw new Error(`Unknown affiliate link type: ${linkType}`);
      }

      const linkId = `${linkType}_${postId}_${Date.now()}`;
      
      // Create tracking URL with UTM parameters
      const trackingParams = new URLSearchParams({
        utm_source: platform,
        utm_medium: 'social',
        utm_campaign: campaignId,
        utm_content: postId,
        utm_term: linkType,
        mnp_track: linkId,
        ...customParams,
      });

      const trackingUrl = `${this.BASE_TRACKING_URL}/track/${linkId}?${trackingParams.toString()}`;
      
      const affiliateLink: AffiliateLink = {
        id: linkId,
        originalUrl: provider.baseUrl,
        trackingUrl,
        campaignId,
        postId,
        platform,
        linkType,
        commission: provider.commission,
        status: 'active',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days expiry
        metadata: {
          category: provider.category,
          keywords: this.getKeywordsForLinkType(linkType),
          targetAudience: this.getTargetAudience(linkType),
        },
      };

      // Store in Firestore
      await this.firestore.collection('affiliate_links').doc(linkId).set(affiliateLink);
      
      // Set up click tracking
      await this.setupClickTracking(linkId);

      return affiliateLink;
    } catch (error) {
      console.error('Error generating tracking link:', error);
      throw new Error(`Failed to generate tracking link: ${error}`);
    }
  }

  /**
   * Track click event
   */
  async trackClick(
    linkId: string,
    userAgent: string,
    referrer: string,
    ipAddress: string,
    sessionId: string
  ): Promise<string> {
    try {
      const clickId = `click_${linkId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const clickEvent = {
        id: clickId,
        linkId,
        timestamp: new Date(),
        userAgent,
        referrer,
        ipAddress,
        sessionId,
        deviceType: this.detectDeviceType(userAgent),
        location: await this.getLocationFromIP(ipAddress),
      };

      // Store click in Firestore
      await this.firestore.collection('affiliate_clicks').doc(clickId).set(clickEvent);
      
      // Stream to BigQuery for analytics
      await this.bigquery.dataset('mnp_analytics').table('affiliate_clicks').insert([{
        click_id: clickId,
        link_id: linkId,
        timestamp: clickEvent.timestamp.toISOString(),
        user_agent: userAgent,
        referrer: referrer,
        ip_address: ipAddress,
        session_id: sessionId,
        device_type: clickEvent.deviceType,
        location: clickEvent.location,
      }]);

      console.log(`Tracked click: ${clickId} for link: ${linkId}`);
      return clickId;
    } catch (error) {
      console.error('Error tracking click:', error);
      throw new Error(`Failed to track click: ${error}`);
    }
  }

  /**
   * Track conversion event
   */
  async trackConversion(
    linkId: string,
    clickId: string,
    conversionValue: number,
    conversionType: ConversionTracking['conversionType'] = 'purchase',
    customerData: Partial<ConversionTracking['customerData']> = {}
  ): Promise<void> {
    try {
      // Get affiliate link details
      const linkDoc = await this.firestore.collection('affiliate_links').doc(linkId).get();
      if (!linkDoc.exists) {
        throw new Error(`Affiliate link ${linkId} not found`);
      }

      const affiliateLink = linkDoc.data() as AffiliateLink;
      
      // Calculate commission
      let commissionAmount = 0;
      if (affiliateLink.commission.type === 'percentage') {
        commissionAmount = (conversionValue * affiliateLink.commission.value) / 100;
      } else {
        commissionAmount = affiliateLink.commission.value;
      }

      const conversionTracking: ConversionTracking = {
        id: `conv_${linkId}_${Date.now()}`,
        linkId,
        clickId,
        sessionId: `session_${Date.now()}`,
        conversionValue,
        conversionType,
        timestamp: new Date(),
        attribution: {
          firstTouch: affiliateLink.platform,
          lastTouch: affiliateLink.platform,
          touchPoints: [{
            platform: affiliateLink.platform,
            timestamp: new Date(),
            action: 'conversion',
          }],
        },
        customerData: {
          segment: this.getCustomerSegment(conversionValue),
          deviceType: 'unknown',
          location: 'Japan',
          ...customerData,
        },
      };

      // Store conversion tracking
      await this.firestore.collection('affiliate_conversions').doc(conversionTracking.id).set(conversionTracking);
      
      // Track via cloud automation system
      await this.cloudAutomation.trackConversion({
        affiliateLink: affiliateLink.trackingUrl,
        platform: affiliateLink.platform,
        postId: affiliateLink.postId,
        conversionValue: commissionAmount, // Use commission amount for ROI calculation
        metadata: {
          userAgent: 'affiliate_tracker',
          referrer: affiliateLink.trackingUrl,
          location: customerData.location || 'Japan',
          deviceType: customerData.deviceType || 'unknown',
        },
      });

      console.log(`Tracked conversion: ${conversionTracking.id} - ¥${conversionValue} (commission: ¥${commissionAmount})`);
    } catch (error) {
      console.error('Error tracking conversion:', error);
      throw new Error(`Failed to track conversion: ${error}`);
    }
  }

  /**
   * Get affiliate performance analytics
   */
  async getAffiliatePerformance(
    linkId?: string,
    timeframe: { start: Date; end: Date } = {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      end: new Date(),
    }
  ): Promise<AffiliatePerformance[]> {
    try {
      let query = `
        SELECT 
          link_id,
          COUNT(DISTINCT c.click_id) as clicks,
          COUNT(DISTINCT conv.conversion_id) as conversions,
          SUM(IFNULL(conv.conversion_value, 0)) as revenue,
          COUNT(DISTINCT c.click_id) * 50 as estimated_cost, -- Estimate ¥50 per click
          SAFE_DIVIDE(COUNT(DISTINCT conv.conversion_id), COUNT(DISTINCT c.click_id)) * 100 as conversion_rate,
          SAFE_DIVIDE(SUM(IFNULL(conv.conversion_value, 0)), COUNT(DISTINCT conv.conversion_id)) as avg_order_value
        FROM \`${this.PROJECT_ID}.mnp_analytics.affiliate_clicks\` c
        LEFT JOIN \`${this.PROJECT_ID}.mnp_analytics.conversions\` conv 
          ON c.click_id = conv.click_id
        WHERE c.timestamp BETWEEN @start_date AND @end_date
      `;

      const queryParams: any = {
        start_date: timeframe.start.toISOString(),
        end_date: timeframe.end.toISOString(),
      };

      if (linkId) {
        query += ' AND c.link_id = @link_id';
        queryParams.link_id = linkId;
      }

      query += ' GROUP BY link_id ORDER BY revenue DESC';

      const [rows] = await this.bigquery.query({
        query,
        params: queryParams,
      });

      const performances: AffiliatePerformance[] = rows.map((row: any) => {
        const revenue = parseFloat(row.revenue || 0);
        const cost = parseFloat(row.estimated_cost || 0);
        const roi = cost > 0 ? ((revenue - cost) / cost) * 100 : 0;

        return {
          linkId: row.link_id,
          clicks: parseInt(row.clicks || 0),
          conversions: parseInt(row.conversions || 0),
          revenue,
          cost,
          roi,
          conversionRate: parseFloat(row.conversion_rate || 0),
          averageOrderValue: parseFloat(row.avg_order_value || 0),
          timeframe,
        };
      });

      return performances;
    } catch (error) {
      console.error('Error getting affiliate performance:', error);
      return [];
    }
  }

  /**
   * Auto-inject affiliate links into content
   */
  async autoInjectLinks(
    content: string,
    postId: string,
    platform: string,
    campaignId: string = 'auto_inject'
  ): Promise<{
    modifiedContent: string;
    injectedLinks: AffiliateLink[];
  }> {
    try {
      const injectedLinks: AffiliateLink[] = [];
      let modifiedContent = content;

      // Define injection patterns and corresponding link types
      const injectionPatterns: Array<{
        regex: RegExp;
        linkType: keyof typeof this.AFFILIATE_PROVIDERS;
        replacement: string;
      }> = [
        {
          regex: /乗り換え|MNP|キャリア変更/gi,
          linkType: 'mnp',
          replacement: 'MNPキャリア乗り換え',
        },
        {
          regex: /スマホ|スマートフォン|iPhone|Android/gi,
          linkType: 'smartphone',
          replacement: 'スマートフォン',
        },
        {
          regex: /料金|プラン|割引|安く/gi,
          linkType: 'plan',
          replacement: '料金プラン',
        },
        {
          regex: /節約|お得|安い|削減/gi,
          linkType: 'savings',
          replacement: 'お得な節約',
        },
      ];

      // Process each pattern
      for (const pattern of injectionPatterns) {
        const matches = content.match(pattern.regex);
        if (matches && matches.length > 0) {
          // Generate affiliate link
          const affiliateLink = await this.generateTrackingLink(
            postId,
            platform,
            pattern.linkType as keyof typeof this.AFFILIATE_PROVIDERS,
            campaignId
          );
          
          injectedLinks.push(affiliateLink);

          // Replace first occurrence with linked version
          modifiedContent = modifiedContent.replace(
            pattern.regex,
            `${pattern.replacement} ${affiliateLink.trackingUrl}`
          );
        }
      }

      // Add footer with primary MNP link if no links were injected
      if (injectedLinks.length === 0) {
        const mnpLink = await this.generateTrackingLink(postId, platform, 'mnp', campaignId);
        injectedLinks.push(mnpLink);
        modifiedContent += `\n\n🔗 お得なキャリア乗り換えはこちら: ${mnpLink.trackingUrl}`;
      }

      return {
        modifiedContent,
        injectedLinks,
      };
    } catch (error) {
      console.error('Error auto-injecting links:', error);
      return {
        modifiedContent: content,
        injectedLinks: [],
      };
    }
  }

  /**
   * Get top performing affiliate links
   */
  async getTopPerformingLinks(
    limit: number = 10,
    timeframe: 'day' | 'week' | 'month' = 'week'
  ): Promise<Array<AffiliateLink & { performance: AffiliatePerformance }>> {
    const days = timeframe === 'day' ? 1 : timeframe === 'week' ? 7 : 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    const performances = await this.getAffiliatePerformance(undefined, {
      start: startDate,
      end: endDate,
    });

    // Sort by ROI and get top performers
    const topPerformers = performances
      .sort((a, b) => b.roi - a.roi)
      .slice(0, limit);

    // Get full affiliate link data
    const results: Array<AffiliateLink & { performance: AffiliatePerformance }> = [];
    
    for (const performance of topPerformers) {
      try {
        const linkDoc = await this.firestore.collection('affiliate_links').doc(performance.linkId).get();
        if (linkDoc.exists) {
          const affiliateLink = linkDoc.data() as AffiliateLink;
          results.push({
            ...affiliateLink,
            performance,
          });
        }
      } catch (error) {
        console.error(`Error fetching link ${performance.linkId}:`, error);
      }
    }

    return results;
  }

  // Private helper methods

  private getKeywordsForLinkType(linkType: keyof typeof this.AFFILIATE_PROVIDERS): string[] {
    const keywords: Record<string, string[]> = {
      mnp: ['乗り換え', 'MNP', 'キャリア変更', 'mobile portability'],
      smartphone: ['スマホ', 'iPhone', 'Android', 'smartphone'],
      carrier: ['docomo', 'au', 'softbank', 'rakuten mobile'],
      savings: ['節約', '安い', '割引', 'savings'],
      plan: ['料金プラン', '格安SIM', 'mobile plan'],
    };
    return keywords[linkType] || [];
  }

  private getTargetAudience(linkType: keyof typeof this.AFFILIATE_PROVIDERS): string {
    const audiences: Record<string, string> = {
      mnp: '20-45歳のスマホユーザー、料金を見直したい人',
      smartphone: '新しいスマホを探している20-50歳',
      carrier: '通信費を節約したい家族層',
      savings: '家計を見直したい主婦・主夫層',
      plan: '格安プランに興味がある若年層',
    };
    return audiences[linkType] || 'スマホユーザー全般';
  }

  private detectDeviceType(userAgent: string): string {
    if (/Mobile|Android|iPhone|iPad/i.test(userAgent)) {
      return 'mobile';
    } else if (/Tablet/i.test(userAgent)) {
      return 'tablet';
    }
    return 'desktop';
  }

  private async getLocationFromIP(ipAddress: string): Promise<string> {
    // In a real implementation, you would use a geolocation service
    // For now, assume Japanese users
    return 'Japan';
  }

  private getCustomerSegment(conversionValue: number): string {
    if (conversionValue >= 50000) return 'premium';
    if (conversionValue >= 20000) return 'high_value';
    if (conversionValue >= 5000) return 'medium_value';
    return 'budget_conscious';
  }

  private async setupClickTracking(linkId: string): Promise<void> {
    // Set up BigQuery tables if they don't exist
    try {
      const clicksTableSchema = [
        { name: 'click_id', type: 'STRING', mode: 'REQUIRED' },
        { name: 'link_id', type: 'STRING', mode: 'REQUIRED' },
        { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
        { name: 'user_agent', type: 'STRING', mode: 'NULLABLE' },
        { name: 'referrer', type: 'STRING', mode: 'NULLABLE' },
        { name: 'ip_address', type: 'STRING', mode: 'NULLABLE' },
        { name: 'session_id', type: 'STRING', mode: 'NULLABLE' },
        { name: 'device_type', type: 'STRING', mode: 'NULLABLE' },
        { name: 'location', type: 'STRING', mode: 'NULLABLE' },
      ];

      const table = this.bigquery.dataset('mnp_analytics').table('affiliate_clicks');
      const [exists] = await table.exists();
      
      if (!exists) {
        await table.create({
          schema: clicksTableSchema,
          timePartitioning: {
            type: 'DAY',
            field: 'timestamp',
          },
          clustering: {
            fields: ['link_id', 'device_type'],
          },
        });
        console.log('Created affiliate_clicks table in BigQuery');
      }
    } catch (error) {
      console.log('Click tracking setup completed (table may already exist)');
    }
  }
}