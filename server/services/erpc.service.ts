import { db } from '../db';
import { offers, affiliateNetworks, variantMetricsDaily, linkVariants } from '../../shared/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import { subDays } from 'date-fns';

export interface ERPCInput {
  price_jpy: number;
  commission_bps: number;
  cvr_proxy: number;
}

export interface ERPCResult {
  eRPC: number;
  commission: number;
  expectedRevenue: number;
}

/**
 * Calculate Expected Revenue per Click (eRPC)
 * Formula: eRPC = price_jpy * (commission_bps / 10000) * cvr_proxy
 */
export function calculateERPC({ price_jpy, commission_bps, cvr_proxy }: ERPCInput): ERPCResult {
  const commission = price_jpy * (commission_bps / 10000);
  const expectedRevenue = commission * cvr_proxy;
  
  return {
    eRPC: expectedRevenue,
    commission,
    expectedRevenue
  };
}

/**
 * Get the best offer based on eRPC calculation across networks
 */
export async function getBestOfferByERPC(keyword: string, limit: number = 5) {
  // Get all networks with their CVR proxies
  const networks = await db.select().from(affiliateNetworks).where(eq(affiliateNetworks.enabled, true));
  
  if (networks.length === 0) {
    throw new Error('No enabled affiliate networks found');
  }

  // Search for offers matching the keyword across networks
  const allOffers = await db.select({
    id: offers.id,
    network_id: offers.network_id,
    external_id: offers.external_id,
    title: offers.title,
    price_jpy: offers.price_jpy,
    commission_bps: offers.commission_bps,
    affiliate_url: offers.affiliate_url,
    product_url: offers.product_url,
    image_url: offers.image_url,
    shop_name: offers.shop_name,
    network_name: affiliateNetworks.name,
    cvr_proxy: affiliateNetworks.cvr_proxy,
  })
  .from(offers)
  .innerJoin(affiliateNetworks, eq(offers.network_id, affiliateNetworks.id))
  .where(
    and(
      sql`lower(${offers.title}) LIKE lower(${`%${keyword}%`})`,
      eq(affiliateNetworks.enabled, true)
    )
  )
  .limit(50); // Get more to sort by eRPC

  // Calculate eRPC for each offer and sort
  const offersWithERPC = allOffers
    .filter(offer => offer.commission_bps && offer.cvr_proxy)
    .map(offer => {
      const erpc = calculateERPC({
        price_jpy: offer.price_jpy,
        commission_bps: offer.commission_bps!,
        cvr_proxy: offer.cvr_proxy!
      });
      
      return {
        ...offer,
        ...erpc
      };
    })
    .sort((a, b) => b.eRPC - a.eRPC)
    .slice(0, limit);

  return offersWithERPC;
}

/**
 * Update CVR proxy for a network based on recent performance
 */
export async function updateNetworkCVRProxy(networkId: string, days: number = 30) {
  const cutoffDate = subDays(new Date(), days);
  
  // Calculate actual CVR from recent metrics
  const metrics = await db.select({
    total_clicks: sql<number>`sum(${variantMetricsDaily.clicks})`,
    total_conversions: sql<number>`sum(${variantMetricsDaily.conversions})`,
  })
  .from(variantMetricsDaily)
  .innerJoin(linkVariants, eq(variantMetricsDaily.variant_id, linkVariants.id))
  .innerJoin(offers, eq(linkVariants.offer_id, offers.id))
  .where(
    and(
      eq(offers.network_id, networkId),
      gte(variantMetricsDaily.date, cutoffDate)
    )
  );

  const result = metrics[0];
  if (result && result.total_clicks > 0) {
    const actualCVR = Number(result.total_conversions) / Number(result.total_clicks);
    
    // Update network CVR proxy
    await db.update(affiliateNetworks)
      .set({ 
        cvr_proxy: actualCVR,
        updated_at: new Date()
      })
      .where(eq(affiliateNetworks.id, networkId));
    
    return actualCVR;
  }
  
  return null;
}

/**
 * Get network performance summary
 */
export async function getNetworkPerformance(days: number = 30) {
  const cutoffDate = subDays(new Date(), days);
  
  const performance = await db.select({
    network_id: affiliateNetworks.id,
    network_name: affiliateNetworks.name,
    cvr_proxy: affiliateNetworks.cvr_proxy,
    total_clicks: sql<number>`COALESCE(sum(${variantMetricsDaily.clicks}), 0)`,
    total_conversions: sql<number>`COALESCE(sum(${variantMetricsDaily.conversions}), 0)`,
    total_revenue: sql<number>`COALESCE(sum(${variantMetricsDaily.revenue_jpy}), 0)`,
  })
  .from(affiliateNetworks)
  .leftJoin(offers, eq(affiliateNetworks.id, offers.network_id))
  .leftJoin(linkVariants, eq(offers.id, linkVariants.offer_id))
  .leftJoin(variantMetricsDaily, 
    and(
      eq(linkVariants.id, variantMetricsDaily.variant_id),
      gte(variantMetricsDaily.date, cutoffDate)
    )
  )
  .where(eq(affiliateNetworks.enabled, true))
  .groupBy(affiliateNetworks.id, affiliateNetworks.name, affiliateNetworks.cvr_proxy);

  return performance.map(p => ({
    ...p,
    actual_cvr: Number(p.total_clicks) > 0 ? Number(p.total_conversions) / Number(p.total_clicks) : 0,
    avg_revenue_per_click: Number(p.total_clicks) > 0 ? Number(p.total_revenue) / Number(p.total_clicks) : 0
  }));
}