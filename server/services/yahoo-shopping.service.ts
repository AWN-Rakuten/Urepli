import fetch from 'node-fetch';
import { URLSearchParams } from 'url';
import { db } from '../db';
import { offers, affiliateNetworks } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const BASE_URL = 'https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch';

export interface YahooSearchParams {
  query?: string;
  category_id?: string;
  brand_id?: string;
  price_from?: number;
  price_to?: number;
  sort?: string; // '-score', '+itemPrice', '-itemPrice', '+name', '-name', etc.
  results?: number;
  start?: number;
}

export interface YahooItem {
  name: string;
  description: string;
  headLine: string;
  url: string;
  inStock: boolean;
  code: string;
  condition: string;
  imageId: string;
  categoryId: {
    id: number;
    name: string;
    depth: number;
  };
  brandId?: {
    id: number;
    name: string;
  };
  parentBrandId?: {
    id: number;
    name: string;
  };
  janCode: string;
  price: number;
  premiumPriceStatus: boolean;
  premiumDiscountType?: string;
  premiumDiscountAmount?: number;
  priceLabel: {
    taxable: boolean;
    defaultPrice: number;
    discountedPrice?: number;
    fixedPrice?: number;
    premiumPrice?: number;
    periodStart?: string;
    periodEnd?: string;
  };
  point: {
    amount: number;
    times: number;
    premiumAmount?: number;
    premiumTimes?: number;
  };
  shipping: {
    code: number;
    name: string;
  };
  genreCategory: {
    id: number;
    name: string;
    depth: number;
  };
  review: {
    rate: number;
    count: number;
    url: string;
  };
  seller: {
    sellerId: string;
    name: string;
    url: string;
    isBestSeller: boolean;
    review: {
      rate: number;
      count: number;
    };
    imageId: string;
  };
}

export interface YahooApiResponse {
  hits?: YahooItem[];
  totalResultsAvailable?: number;
  totalResultsReturned?: number;
  firstResultPosition?: number;
  request?: any;
}

export async function searchYahooShoppingItems(params: YahooSearchParams) {
  const { YAHOO_APP_ID } = process.env;
  
  if (!YAHOO_APP_ID) {
    throw new Error('YAHOO_APP_ID is not configured');
  }

  const query = new URLSearchParams({
    appid: YAHOO_APP_ID,
    output: 'json',
    results: String(params.results ?? 20),
    start: String(params.start ?? 1),
    ...(params.query ? { query: params.query } : {}),
    ...(params.category_id ? { category_id: params.category_id } : {}),
    ...(params.brand_id ? { brand_id: params.brand_id } : {}),
    ...(params.price_from ? { price_from: String(params.price_from) } : {}),
    ...(params.price_to ? { price_to: String(params.price_to) } : {}),
    ...(params.sort ? { sort: params.sort } : {}),
  });

  const url = `${BASE_URL}?${query.toString()}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Yahoo Shopping API error: ${response.status} ${response.statusText}`);
    }

    const data: YahooApiResponse = await response.json() as YahooApiResponse;
    
    // Get or create Yahoo network entry
    let network = await db.select().from(affiliateNetworks).where(eq(affiliateNetworks.name, 'yahoo')).limit(1);
    
    if (network.length === 0) {
      const [newNetwork] = await db.insert(affiliateNetworks).values({
        name: 'yahoo',
        api_keys: {
          appId: YAHOO_APP_ID
        },
        enabled: true,
        cvr_proxy: 0.025 // Default CVR for Yahoo Shopping
      }).returning();
      network = [newNetwork];
    }

    const networkId = network[0].id;
    const items = data.hits || [];
    
    // Transform and upsert offers
    const offerData = items.map(item => {
      // Yahoo Shopping doesn't have direct affiliate rates in the API
      // These would typically come from ValueCommerce or other affiliate programs
      const estimatedCommission = Math.floor(item.price * 0.01); // 1% estimate
      
      return {
        network_id: networkId,
        external_id: item.code,
        title: item.name,
        price_jpy: item.price,
        commission_bps: 100, // 1% default commission (100 basis points)
        affiliate_url: item.url, // This would be replaced with affiliate URL from ValueCommerce
        product_url: item.url,
        image_url: item.imageId ? `https://item-shopping.c.yimg.jp/i/j/${item.imageId}` : null,
        shop_name: item.seller.name,
        rating: item.review.rate || null,
        review_count: item.review.count || null,
        category: item.categoryId.name || null,
        source_payload: item,
      };
    }).filter(Boolean);

    // Bulk insert/update offers
    const insertedOffers = await db.insert(offers).values(offerData).returning();
    
    return insertedOffers;
  } catch (error) {
    console.error('Yahoo Shopping API error:', error);
    throw error;
  }
}

export async function getYahooOfferById(externalId: string) {
  const network = await db.select().from(affiliateNetworks).where(eq(affiliateNetworks.name, 'yahoo')).limit(1);
  
  if (network.length === 0) {
    return null;
  }

  const [offer] = await db.select()
    .from(offers)
    .where(eq(offers.external_id, externalId))
    .limit(1);

  return offer || null;
}

/**
 * Get Yahoo Shopping trending keywords (if available)
 * Note: This might require additional API access or scraping
 */
export async function getYahooTrendingKeywords(): Promise<string[]> {
  // This would require additional implementation
  // Yahoo Shopping API doesn't directly provide trending keywords in the public API
  // You might need to use Yahoo's trend APIs or implement keyword tracking
  
  console.warn('Yahoo trending keywords not implemented - requires additional API access');
  return [];
}