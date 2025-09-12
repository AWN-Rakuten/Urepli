/**
 * Attribution & Learning Service
 * Tracks conversions, updates bandit priors, and learns from performance data
 */

import { db } from '../db';
import { 
  affiliateNetworks, 
  offers, 
  linkVariants, 
  variantMetricsDaily,
  affiliateSales 
} from '../../shared/schema';
import { eq, gte, sql, and } from 'drizzle-orm';
import { subDays } from 'date-fns';
import { thompsonSamplingBandit } from './bandit.service';
import { updateNetworkCVRProxy } from './erpc.service';

export interface ConversionData {
  variantId: string;
  postId: string;
  offerId: string;
  networkId: string;
  saleAmount: number;
  commission: number;
  currency: string;
  customerInfo?: any;
  source: string;
  timestamp: Date;
}

export interface LearningMetrics {
  totalConversions: number;
  totalRevenue: number;
  averageCVR: number;
  topPerformingVariants: Array<{
    variantId: string;
    conversions: number;
    revenue: number;
    cvr: number;
  }>;
  networkPerformance: Array<{
    networkName: string;
    conversions: number;
    revenue: number;
    updatedCVR: number;
  }>;
}

/**
 * Attribution & Learning Service
 */
export class AttributionLearningService {
  private readonly LEARNING_DECAY = 0.8; // Lambda for exponential decay

  /**
   * Process nightly conversion data from affiliate networks
   */
  async ingestConversions(): Promise<LearningMetrics> {
    console.log('📈 Starting conversion data ingestion...');

    try {
      // 1. Pull conversions from A8.net
      const a8Conversions = await this.pullA8Conversions();
      
      // 2. Pull conversions from ValueCommerce
      const vcConversions = await this.pullValueCommerceConversions();
      
      // 3. Pull conversions from Amazon Associates
      const amazonConversions = await this.pullAmazonConversions();
      
      // 4. Combine all conversions
      const allConversions = [...a8Conversions, ...vcConversions, ...amazonConversions];
      
      console.log(`📊 Ingested ${allConversions.length} conversions`);

      // 5. Update variant metrics
      await this.updateVariantMetrics(allConversions);
      
      // 6. Update network CVR proxies
      await this.updateNetworkCVRs();
      
      // 7. Retrain bandit priors
      await this.retrainBanditPriors();
      
      // 8. Generate learning metrics
      const metrics = await this.generateLearningMetrics();
      
      console.log('✅ Conversion ingestion completed');
      return metrics;

    } catch (error) {
      console.error('❌ Conversion ingestion failed:', error);
      throw error;
    }
  }

  /**
   * Update variant performance metrics with decay
   */
  private async updateVariantMetrics(conversions: ConversionData[]): Promise<void> {
    const today = new Date();
    const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // Group conversions by variant
    const variantConversions = new Map<string, ConversionData[]>();
    conversions.forEach(conv => {
      if (!variantConversions.has(conv.variantId)) {
        variantConversions.set(conv.variantId, []);
      }
      variantConversions.get(conv.variantId)!.push(conv);
    });

    // Update metrics for each variant
    for (const [variantId, convs] of variantConversions) {
      const totalRevenue = convs.reduce((sum, c) => sum + c.saleAmount, 0);
      const totalConversions = convs.length;

      await db.insert(variantMetricsDaily)
        .values({
          variant_id: variantId,
          date: dayStart,
          impressions: 0,
          clicks: 0,
          conversions: totalConversions,
          revenue_jpy: totalRevenue
        })
        .onConflictDoUpdate({
          target: [variantMetricsDaily.variant_id, variantMetricsDaily.date],
          set: {
            conversions: sql`${variantMetricsDaily.conversions} + ${totalConversions}`,
            revenue_jpy: sql`${variantMetricsDaily.revenue_jpy} + ${totalRevenue}`
          }
        });

      // Record bandit conversion for Thompson Sampling
      for (const conv of convs) {
        await thompsonSamplingBandit.recordConversion(variantId, conv.saleAmount);
      }
    }
  }

  /**
   * Update network CVR proxies with decay
   */
  private async updateNetworkCVRs(): Promise<void> {
    const networks = await db.select().from(affiliateNetworks).where(eq(affiliateNetworks.enabled, true));

    for (const network of networks) {
      try {
        const newCVR = await updateNetworkCVRProxy(network.id, 30);
        
        if (newCVR !== null) {
          // Apply exponential decay to smooth learning
          const oldCVR = network.cvr_proxy || 0.03;
          const decayedCVR = (this.LEARNING_DECAY * oldCVR) + ((1 - this.LEARNING_DECAY) * newCVR);
          
          await db.update(affiliateNetworks)
            .set({ 
              cvr_proxy: decayedCVR,
              updated_at: new Date()
            })
            .where(eq(affiliateNetworks.id, network.id));

          console.log(`📊 Updated ${network.name} CVR: ${oldCVR.toFixed(4)} → ${decayedCVR.toFixed(4)}`);
        }
      } catch (error) {
        console.error(`Failed to update CVR for ${network.name}:`, error);
      }
    }
  }

  /**
   * Retrain Thompson Sampling bandit priors
   */
  private async retrainBanditPriors(): Promise<void> {
    // Get all variants that have recent performance data
    const cutoffDate = subDays(new Date(), 30);
    
    const variants = await db.select({
      id: linkVariants.id,
      post_id: linkVariants.post_id,
      total_conversions: sql<number>`COALESCE(SUM(${variantMetricsDaily.conversions}), 0)`,
      total_clicks: sql<number>`COALESCE(SUM(${variantMetricsDaily.clicks}), 0)`
    })
    .from(linkVariants)
    .leftJoin(variantMetricsDaily, eq(linkVariants.id, variantMetricsDaily.variant_id))
    .where(gte(variantMetricsDaily.date, cutoffDate))
    .groupBy(linkVariants.id, linkVariants.post_id);

    console.log(`🧠 Retraining bandit priors for ${variants.length} variants`);

    // The Thompson Sampling service already handles Bayesian updating
    // through recordClick and recordConversion methods
    // Here we could implement more sophisticated prior updating if needed
    
    for (const variant of variants) {
      const conversions = Number(variant.total_conversions);
      const clicks = Number(variant.total_clicks);
      
      if (clicks > 0) {
        const cvr = conversions / clicks;
        console.log(`📊 Variant ${variant.id}: ${conversions}/${clicks} CVR = ${(cvr * 100).toFixed(2)}%`);
      }
    }
  }

  /**
   * Generate learning metrics summary
   */
  private async generateLearningMetrics(): Promise<LearningMetrics> {
    const cutoffDate = subDays(new Date(), 7); // Last 7 days

    // Get overall conversion metrics
    const overallMetrics = await db.select({
      totalConversions: sql<number>`COALESCE(SUM(${variantMetricsDaily.conversions}), 0)`,
      totalRevenue: sql<number>`COALESCE(SUM(${variantMetricsDaily.revenue_jpy}), 0)`,
      totalClicks: sql<number>`COALESCE(SUM(${variantMetricsDaily.clicks}), 0)`
    })
    .from(variantMetricsDaily)
    .where(gte(variantMetricsDaily.date, cutoffDate));

    const overall = overallMetrics[0];
    const averageCVR = Number(overall.totalClicks) > 0 ? 
      Number(overall.totalConversions) / Number(overall.totalClicks) : 0;

    // Get top performing variants
    const topVariants = await db.select({
      variantId: linkVariants.id,
      conversions: sql<number>`COALESCE(SUM(${variantMetricsDaily.conversions}), 0)`,
      revenue: sql<number>`COALESCE(SUM(${variantMetricsDaily.revenue_jpy}), 0)`,
      clicks: sql<number>`COALESCE(SUM(${variantMetricsDaily.clicks}), 0)`
    })
    .from(linkVariants)
    .leftJoin(variantMetricsDaily, eq(linkVariants.id, variantMetricsDaily.variant_id))
    .where(gte(variantMetricsDaily.date, cutoffDate))
    .groupBy(linkVariants.id)
    .orderBy(sql`COALESCE(SUM(${variantMetricsDaily.revenue_jpy}), 0) DESC`)
    .limit(10);

    // Get network performance
    const networkPerf = await db.select({
      networkName: affiliateNetworks.name,
      conversions: sql<number>`COALESCE(SUM(${variantMetricsDaily.conversions}), 0)`,
      revenue: sql<number>`COALESCE(SUM(${variantMetricsDaily.revenue_jpy}), 0)`,
      updatedCVR: affiliateNetworks.cvr_proxy
    })
    .from(affiliateNetworks)
    .leftJoin(offers, eq(affiliateNetworks.id, offers.network_id))
    .leftJoin(linkVariants, eq(offers.id, linkVariants.offer_id))
    .leftJoin(variantMetricsDaily, eq(linkVariants.id, variantMetricsDaily.variant_id))
    .where(gte(variantMetricsDaily.date, cutoffDate))
    .groupBy(affiliateNetworks.id, affiliateNetworks.name, affiliateNetworks.cvr_proxy);

    return {
      totalConversions: Number(overall.totalConversions),
      totalRevenue: Number(overall.totalRevenue),
      averageCVR,
      topPerformingVariants: topVariants.map(v => ({
        variantId: v.variantId,
        conversions: Number(v.conversions),
        revenue: Number(v.revenue),
        cvr: Number(v.clicks) > 0 ? Number(v.conversions) / Number(v.clicks) : 0
      })),
      networkPerformance: networkPerf.map(n => ({
        networkName: n.networkName,
        conversions: Number(n.conversions),
        revenue: Number(n.revenue),
        updatedCVR: n.updatedCVR || 0
      }))
    };
  }

  /**
   * Affiliate network conversion pulling methods
   */
  private async pullA8Conversions(): Promise<ConversionData[]> {
    // Implementation would use A8.net API to pull conversion data
    // For now, return mock data
    console.log('📡 Pulling A8.net conversions...');
    return [];
  }

  private async pullValueCommerceConversions(): Promise<ConversionData[]> {
    // Implementation would use ValueCommerce API
    console.log('📡 Pulling ValueCommerce conversions...');
    return [];
  }

  private async pullAmazonConversions(): Promise<ConversionData[]> {
    // Implementation would use Amazon Associates API
    console.log('📡 Pulling Amazon conversions...');
    return [];
  }

  /**
   * Manual trigger for testing
   */
  async runLearningCycleNow(): Promise<LearningMetrics> {
    console.log('🚀 Manual learning cycle started...');
    return this.ingestConversions();
  }
}

export const attributionLearning = new AttributionLearningService();