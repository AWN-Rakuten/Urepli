// Japanese Affiliate Networks and Revenue Optimization Types
import { z } from "zod";

// Network identifiers for Japanese affiliate programs
export const AffiliateNetworkSchema = z.enum([
  'rakuten',
  'yahoo',
  'valuecommerce', 
  'amazon',
  'a8net'
]);

export type AffiliateNetwork = z.infer<typeof AffiliateNetworkSchema>;

// Event types for Japanese market
export const JapaneseEventSchema = z.enum([
  'SPU',           // Super Point Up Program
  '5-0-day',       // 5と0の日 (5th, 10th, 15th, 20th, 25th, 30th)
  'SUPER_SALE',    // 楽天スーパーSALE
  'OKAIMONO',      // お買い物マラソン
  'OTHER'
]);

export type JapaneseEvent = z.infer<typeof JapaneseEventSchema>;

// Offer data structure from affiliate networks
export const OfferSchema = z.object({
  id: z.string(),
  network: AffiliateNetworkSchema,
  external_id: z.string(),
  title: z.string(),
  price_jpy: z.number(),
  commission_bps: z.number().optional(), // basis points (e.g., 300 = 3%)
  affiliate_url: z.string(),
  product_url: z.string(),
  image_url: z.string().optional(),
  shop_name: z.string().optional(),
  category: z.string().optional(),
  rating: z.number().optional(),
  review_count: z.number().optional(),
  source_payload: z.record(z.any()).optional(),
  updated_at: z.date()
});

export type Offer = z.infer<typeof OfferSchema>;

// Link variant for bandit testing
export const LinkVariantSchema = z.object({
  id: z.string(),
  post_id: z.string(),
  offer_id: z.string(),
  variant_key: z.string(),
  caption: z.string().optional(),
  thumb_url: z.string().optional(),
  enabled: z.boolean().default(true)
});

export type LinkVariant = z.infer<typeof LinkVariantSchema>;

// Daily metrics for bandit optimization
export const VariantMetricsSchema = z.object({
  variant_id: z.string(),
  date: z.date(),
  impressions: z.number().default(0),
  clicks: z.number().default(0),
  conversions: z.number().default(0),
  revenue_jpy: z.number().default(0)
});

export type VariantMetrics = z.infer<typeof VariantMetricsSchema>;

// Japanese event calendar entry
export const EventCalendarSchema = z.object({
  id: z.string(),
  code: JapaneseEventSchema,
  start_ts: z.date(),
  end_ts: z.date(),
  metadata: z.record(z.any()).optional() // points multiplier, campaign info, etc.
});

export type EventCalendar = z.infer<typeof EventCalendarSchema>;

// eRPC calculation input
export const ERPCInputSchema = z.object({
  price_jpy: z.number(),
  commission_bps: z.number(),
  cvr_proxy: z.number() // conversion rate proxy
});

export type ERPCInput = z.infer<typeof ERPCInputSchema>;

// Japanese compliance disclosure requirements
export const ComplianceDisclosureSchema = z.object({
  networks: z.array(AffiliateNetworkSchema),
  platform: z.string(), // 'line', 'instagram', 'tiktok', etc.
  include_amazon_associates: z.boolean().default(false)
});

export type ComplianceDisclosure = z.infer<typeof ComplianceDisclosureSchema>;