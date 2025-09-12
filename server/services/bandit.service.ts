import { db } from '../db';
import { linkVariants, variantMetricsDaily } from '../../shared/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import { subDays } from 'date-fns';

export interface VariantStats {
  id: string;
  variant_key: string;
  clicks: number;
  conversions: number;
  revenue: number;
  alpha: number; // Beta distribution alpha parameter
  beta: number;  // Beta distribution beta parameter
}

/**
 * Thompson Sampling for multi-armed bandit optimization
 * Uses Beta distribution to sample conversion rates
 */
export class ThompsonSamplingBandit {
  
  /**
   * Sample from Beta distribution (approximation using normal distribution for performance)
   */
  private betaSample(alpha: number, beta: number): number {
    // Simple approximation for Beta distribution
    // For large values, Beta(alpha, beta) ≈ Normal(mu, sigma²)
    const mu = alpha / (alpha + beta);
    const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
    const sigma = Math.sqrt(variance);
    
    // Box-Muller transform for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    
    let sample = mu + sigma * z;
    
    // Clamp to [0, 1] range
    sample = Math.max(0, Math.min(1, sample));
    
    return sample;
  }

  /**
   * Choose the best variant using Thompson Sampling
   */
  async chooseVariant(postId: string, days: number = 30): Promise<string | null> {
    const variants = await this.getVariantStats(postId, days);
    
    if (variants.length === 0) {
      return null;
    }
    
    if (variants.length === 1) {
      return variants[0].id;
    }
    
    let bestVariant: { id: string; score: number } | null = null;
    
    for (const variant of variants) {
      const sample = this.betaSample(variant.alpha, variant.beta);
      
      if (!bestVariant || sample > bestVariant.score) {
        bestVariant = { id: variant.id, score: sample };
      }
    }
    
    return bestVariant?.id || variants[0].id;
  }

  /**
   * Get variant statistics for Thompson Sampling
   */
  async getVariantStats(postId: string, days: number = 30): Promise<VariantStats[]> {
    const cutoffDate = subDays(new Date(), days);
    
    const stats = await db.select({
      id: linkVariants.id,
      variant_key: linkVariants.variant_key,
      total_clicks: sql<number>`COALESCE(sum(${variantMetricsDaily.clicks}), 0)`,
      total_conversions: sql<number>`COALESCE(sum(${variantMetricsDaily.conversions}), 0)`,
      total_revenue: sql<number>`COALESCE(sum(${variantMetricsDaily.revenue_jpy}), 0)`,
    })
    .from(linkVariants)
    .leftJoin(variantMetricsDaily, 
      and(
        eq(linkVariants.id, variantMetricsDaily.variant_id),
        gte(variantMetricsDaily.date, cutoffDate)
      )
    )
    .where(
      and(
        eq(linkVariants.post_id, postId),
        eq(linkVariants.enabled, true)
      )
    )
    .groupBy(linkVariants.id, linkVariants.variant_key);

    return stats.map(stat => ({
      id: stat.id,
      variant_key: stat.variant_key,
      clicks: Number(stat.total_clicks),
      conversions: Number(stat.total_conversions),
      revenue: Number(stat.total_revenue),
      // Beta distribution parameters: alpha = successes + 1, beta = failures + 1
      alpha: Number(stat.total_conversions) + 1,
      beta: Math.max(0, Number(stat.total_clicks) - Number(stat.total_conversions)) + 1
    }));
  }

  /**
   * Record a click for a variant
   */
  async recordClick(variantId: string, date: Date = new Date()): Promise<void> {
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    await db.insert(variantMetricsDaily)
      .values({
        variant_id: variantId,
        date: dayStart,
        impressions: 1,
        clicks: 1,
        conversions: 0,
        revenue_jpy: 0
      })
      .onConflictDoUpdate({
        target: [variantMetricsDaily.variant_id, variantMetricsDaily.date],
        set: {
          clicks: sql`${variantMetricsDaily.clicks} + 1`,
          impressions: sql`${variantMetricsDaily.impressions} + 1`
        }
      });
  }

  /**
   * Record a conversion for a variant
   */
  async recordConversion(variantId: string, revenueJpy: number = 0, date: Date = new Date()): Promise<void> {
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    await db.insert(variantMetricsDaily)
      .values({
        variant_id: variantId,
        date: dayStart,
        impressions: 0,
        clicks: 0,
        conversions: 1,
        revenue_jpy: revenueJpy
      })
      .onConflictDoUpdate({
        target: [variantMetricsDaily.variant_id, variantMetricsDaily.date],
        set: {
          conversions: sql`${variantMetricsDaily.conversions} + 1`,
          revenue_jpy: sql`${variantMetricsDaily.revenue_jpy} + ${revenueJpy}`
        }
      });
  }

  /**
   * Get performance report for variants
   */
  async getVariantPerformance(postId?: string, days: number = 30) {
    const cutoffDate = subDays(new Date(), days);
    
    const baseQuery = db.select({
      post_id: linkVariants.post_id,
      variant_id: linkVariants.id,
      variant_key: linkVariants.variant_key,
      total_clicks: sql<number>`COALESCE(sum(${variantMetricsDaily.clicks}), 0)`,
      total_conversions: sql<number>`COALESCE(sum(${variantMetricsDaily.conversions}), 0)`,
      total_revenue: sql<number>`COALESCE(sum(${variantMetricsDaily.revenue_jpy}), 0)`,
      avg_daily_clicks: sql<number>`COALESCE(avg(${variantMetricsDaily.clicks}), 0)`,
    })
    .from(linkVariants)
    .leftJoin(variantMetricsDaily, 
      and(
        eq(linkVariants.id, variantMetricsDaily.variant_id),
        gte(variantMetricsDaily.date, cutoffDate)
      )
    )
    .groupBy(linkVariants.id, linkVariants.variant_key, linkVariants.post_id);

    const results = postId 
      ? await baseQuery.where(eq(linkVariants.post_id, postId))
      : await baseQuery;
    
    return results.map(result => ({
      ...result,
      conversion_rate: Number(result.total_clicks) > 0 ? 
        Number(result.total_conversions) / Number(result.total_clicks) : 0,
      revenue_per_click: Number(result.total_clicks) > 0 ? 
        Number(result.total_revenue) / Number(result.total_clicks) : 0,
      total_clicks: Number(result.total_clicks),
      total_conversions: Number(result.total_conversions),
      total_revenue: Number(result.total_revenue),
    }));
  }
}

export const thompsonSamplingBandit = new ThompsonSamplingBandit();