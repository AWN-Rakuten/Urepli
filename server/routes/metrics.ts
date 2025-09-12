/**
 * Metrics API Routes
 * Profit control dashboard data endpoints
 */

import { Router } from 'express';
import { db } from '../db';
import { 
  content, 
  variantMetricsDaily, 
  linkVariants, 
  offers, 
  affiliateNetworks,
  eventsCalendar 
} from '../../shared/schema';
import { eq, gte, lte, sql, and, desc } from 'drizzle-orm';
import { subDays, format } from 'date-fns';
import { eventsService } from '../services/events';
import { getNetworkPerformance } from '../services/erpc.service';

const router = Router();

/**
 * GET /api/metrics/dashboard
 * Main dashboard KPI rollup
 */
router.get('/dashboard', async (req, res) => {
  try {
    const { timeframe = '7d' } = req.query;
    const days = parseInt(timeframe.toString().replace('d', ''));
    const cutoffDate = subDays(new Date(), days);

    // Get funnel metrics (Views → Clicks → Conversions)
    const funnelMetrics = await db.select({
      totalViews: sql<number>`COALESCE(SUM(${variantMetricsDaily.impressions}), 0)`,
      totalClicks: sql<number>`COALESCE(SUM(${variantMetricsDaily.clicks}), 0)`,
      totalConversions: sql<number>`COALESCE(SUM(${variantMetricsDaily.conversions}), 0)`,
      totalRevenue: sql<number>`COALESCE(SUM(${variantMetricsDaily.revenue_jpy}), 0)`
    })
    .from(variantMetricsDaily)
    .where(gte(variantMetricsDaily.date, cutoffDate));

    const funnel = funnelMetrics[0];
    const views = Number(funnel.totalViews);
    const clicks = Number(funnel.totalClicks);
    const conversions = Number(funnel.totalConversions);
    const revenue = Number(funnel.totalRevenue);

    // Calculate key metrics
    const ctr = views > 0 ? clicks / views : 0;
    const cvr = clicks > 0 ? conversions / clicks : 0;
    const rpc = clicks > 0 ? revenue / clicks : 0;
    
    // Get spend data (this would come from ads APIs in real implementation)
    const estimatedSpend = revenue * 0.3; // Estimate 30% of revenue as spend
    const roas = estimatedSpend > 0 ? revenue / estimatedSpend : 0;
    const mer = roas; // For simplicity, using ROAS as MER
    const profit = revenue - estimatedSpend;

    // Get performance by platform
    const platformMetrics = await db.select({
      platform: content.platform,
      posts: sql<number>`COUNT(${content.id})`,
      totalViews: sql<number>`COALESCE(SUM(${variantMetricsDaily.impressions}), 0)`,
      totalRevenue: sql<number>`COALESCE(SUM(${variantMetricsDaily.revenue_jpy}), 0)`
    })
    .from(content)
    .leftJoin(linkVariants, eq(content.id, linkVariants.post_id))
    .leftJoin(variantMetricsDaily, eq(linkVariants.id, variantMetricsDaily.variant_id))
    .where(gte(variantMetricsDaily.date, cutoffDate))
    .groupBy(content.platform);

    // Get active events overlay
    const activeEvents = await eventsService.getActiveEvents();

    res.json({
      success: true,
      data: {
        timeframe,
        summary: {
          views,
          clicks,
          conversions,
          revenue,
          spend: estimatedSpend,
          profit,
          ctr: Number((ctr * 100).toFixed(2)),
          cvr: Number((cvr * 100).toFixed(2)),
          rpc: Number(rpc.toFixed(0)),
          roas: Number(roas.toFixed(2)),
          mer: Number(mer.toFixed(2))
        },
        funnel: {
          views: { value: views, label: 'Views' },
          clicks: { value: clicks, label: 'Clicks', rate: ctr },
          conversions: { value: conversions, label: 'Conversions', rate: cvr }
        },
        platformBreakdown: platformMetrics.map(p => ({
          platform: p.platform,
          posts: Number(p.posts),
          views: Number(p.totalViews),
          revenue: Number(p.totalRevenue),
          revenueShare: revenue > 0 ? Number(p.totalRevenue) / revenue : 0
        })),
        activeEvents: activeEvents.map(event => ({
          code: event.code,
          name: event.name,
          badge: event.metadata.badge,
          urgency: event.metadata.urgencyLevel
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard metrics'
    });
  }
});

/**
 * GET /api/metrics/offers
 * Offer breakdown with eRPC analysis
 */
router.get('/offers', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const cutoffDate = subDays(new Date(), Number(days));

    const offerMetrics = await db.select({
      offerId: offers.id,
      title: offers.title,
      price: offers.price_jpy,
      commissionBps: offers.commission_bps,
      networkName: affiliateNetworks.name,
      shopName: offers.shop_name,
      clicks: sql<number>`COALESCE(SUM(${variantMetricsDaily.clicks}), 0)`,
      conversions: sql<number>`COALESCE(SUM(${variantMetricsDaily.conversions}), 0)`,
      revenue: sql<number>`COALESCE(SUM(${variantMetricsDaily.revenue_jpy}), 0)`
    })
    .from(offers)
    .innerJoin(affiliateNetworks, eq(offers.network_id, affiliateNetworks.id))
    .leftJoin(linkVariants, eq(offers.id, linkVariants.offer_id))
    .leftJoin(variantMetricsDaily, eq(linkVariants.id, variantMetricsDaily.variant_id))
    .where(gte(variantMetricsDaily.date, cutoffDate))
    .groupBy(
      offers.id, offers.title, offers.price_jpy, offers.commission_bps,
      affiliateNetworks.name, offers.shop_name
    )
    .orderBy(desc(sql`COALESCE(SUM(${variantMetricsDaily.revenue_jpy}), 0)`))
    .limit(20);

    const enrichedOffers = offerMetrics.map(offer => {
      const clicks = Number(offer.clicks);
      const conversions = Number(offer.conversions);
      const revenue = Number(offer.revenue);
      const commission = offer.price * (offer.commissionBps || 200) / 10000;
      
      return {
        id: offer.offerId,
        title: offer.title,
        price: offer.price,
        network: offer.networkName,
        shop: offer.shopName,
        performance: {
          clicks,
          conversions,
          revenue,
          cvr: clicks > 0 ? conversions / clicks : 0,
          rpc: clicks > 0 ? revenue / clicks : 0,
          eRPC: commission * (conversions / Math.max(clicks, 1)) // Expected revenue per click
        }
      };
    });

    res.json({
      success: true,
      data: enrichedOffers
    });

  } catch (error) {
    console.error('Error fetching offer metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch offer metrics'
    });
  }
});

/**
 * GET /api/metrics/performance-timeseries
 * Performance over time with event overlay
 */
router.get('/performance-timeseries', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const cutoffDate = subDays(new Date(), Number(days));

    // Get daily performance metrics
    const dailyMetrics = await db.select({
      date: variantMetricsDaily.date,
      impressions: sql<number>`SUM(${variantMetricsDaily.impressions})`,
      clicks: sql<number>`SUM(${variantMetricsDaily.clicks})`,
      conversions: sql<number>`SUM(${variantMetricsDaily.conversions})`,
      revenue: sql<number>`SUM(${variantMetricsDaily.revenue_jpy})`
    })
    .from(variantMetricsDaily)
    .where(gte(variantMetricsDaily.date, cutoffDate))
    .groupBy(variantMetricsDaily.date)
    .orderBy(variantMetricsDaily.date);

    // Get events that occurred in this period
    const events = await db.select({
      code: eventsCalendar.code,
      startDate: eventsCalendar.start_ts,
      endDate: eventsCalendar.end_ts,
      badge: sql<string>`${eventsCalendar.metadata}->>'badge'`,
      urgency: sql<string>`${eventsCalendar.metadata}->>'urgencyLevel'`
    })
    .from(eventsCalendar)
    .where(
      and(
        gte(eventsCalendar.start_ts, cutoffDate),
        lte(eventsCalendar.start_ts, new Date())
      )
    );

    const timeSeriesData = dailyMetrics.map(day => {
      const impressions = Number(day.impressions);
      const clicks = Number(day.clicks);
      const conversions = Number(day.conversions);
      const revenue = Number(day.revenue);
      const spend = revenue * 0.3; // Estimated spend
      
      return {
        date: format(day.date, 'yyyy-MM-dd'),
        metrics: {
          impressions,
          clicks,
          conversions,
          revenue,
          spend,
          profit: revenue - spend,
          ctr: impressions > 0 ? clicks / impressions : 0,
          cvr: clicks > 0 ? conversions / clicks : 0,
          roas: spend > 0 ? revenue / spend : 0
        }
      };
    });

    const eventOverlay = events.map(event => ({
      code: event.code,
      start: format(event.startDate, 'yyyy-MM-dd'),
      end: format(event.endDate, 'yyyy-MM-dd'),
      badge: event.badge,
      urgency: event.urgency
    }));

    res.json({
      success: true,
      data: {
        timeSeries: timeSeriesData,
        events: eventOverlay
      }
    });

  } catch (error) {
    console.error('Error fetching time series data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch time series data'
    });
  }
});

/**
 * GET /api/metrics/creative-leaderboard
 * 30-min rolling RPM creative performance
 */
router.get('/creative-leaderboard', async (req, res) => {
  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const creativePeformance = await db.select({
      contentId: content.id,
      title: content.title,
      platform: content.platform,
      thumbnailUrl: content.thumbnailUrl,
      recentViews: sql<number>`COALESCE(SUM(CASE WHEN ${variantMetricsDaily.date} >= ${thirtyMinutesAgo} THEN ${variantMetricsDaily.impressions} ELSE 0 END), 0)`,
      recentRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${variantMetricsDaily.date} >= ${thirtyMinutesAgo} THEN ${variantMetricsDaily.revenue_jpy} ELSE 0 END), 0)`,
      totalRevenue: sql<number>`COALESCE(SUM(${variantMetricsDaily.revenue_jpy}), 0)`
    })
    .from(content)
    .leftJoin(linkVariants, eq(content.id, linkVariants.post_id))
    .leftJoin(variantMetricsDaily, eq(linkVariants.id, variantMetricsDaily.variant_id))
    .groupBy(content.id, content.title, content.platform, content.thumbnailUrl)
    .orderBy(desc(sql`COALESCE(SUM(CASE WHEN ${variantMetricsDaily.date} >= ${thirtyMinutesAgo} THEN ${variantMetricsDaily.revenue_jpy} ELSE 0 END), 0)`))
    .limit(15);

    const leaderboard = creativePeformance.map((creative, index) => {
      const recentViews = Number(creative.recentViews);
      const recentRevenue = Number(creative.recentRevenue);
      const rpm = recentViews > 0 ? (recentRevenue / recentViews) * 1000 : 0; // Revenue per 1000 views

      return {
        rank: index + 1,
        id: creative.contentId,
        title: creative.title,
        platform: creative.platform,
        thumbnail: creative.thumbnailUrl,
        thirtyMinMetrics: {
          views: recentViews,
          revenue: recentRevenue,
          rpm: Number(rpm.toFixed(2))
        },
        totalRevenue: Number(creative.totalRevenue)
      };
    });

    res.json({
      success: true,
      data: leaderboard
    });

  } catch (error) {
    console.error('Error fetching creative leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch creative leaderboard'
    });
  }
});

/**
 * GET /api/metrics/network-performance
 * Affiliate network performance summary
 */
router.get('/network-performance', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const networkPerformance = await getNetworkPerformance(Number(days));

    res.json({
      success: true,
      data: networkPerformance
    });

  } catch (error) {
    console.error('Error fetching network performance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch network performance'
    });
  }
});

export default router;