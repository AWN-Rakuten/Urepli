/**
 * Yahoo! Shopping API V3 Integration
 * Extends existing affiliate system for Yahoo Shopping offers
 */

import fetch from 'node-fetch';
import { URLSearchParams } from 'url';
import { db } from '../db';
import { offers, affiliateNetworks } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const BASE_URL = 'https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch';

export interface YahooShoppingParams {
  query?: string;
  category_id?: number;
  price_from?: number;
  price_to?: number;
  sort?: string;
  results?: number;
}

export interface YahooItem {
  code: string;
  name: string;
  description?: string;
  headline?: string;
  url: string;
  price: number;
  premiumPrice?: number;
  premiumPriceStatus?: boolean;
  affiliateUrl?: string;
  imageId?: string;
  review?: {
    count: number;
    rate: number;
  };
  store?: {
    id: string;
    name: string;
    url: string;
  };
  brand?: {
    id: string;
    name: string;
  };
  janCode?: string;
  categoryId?: string;
}

export interface YahooApiResponse {
  totalResultsAvailable: number;
  totalResultsReturned: number;
  firstResultPosition: number;
  hits?: YahooItem[];
  error?: {
    message: string;
    code: string;
  };
}

export async function searchYahooShoppingItems(params: YahooShoppingParams) {
  const { YAHOO_SHOPPING_APP_ID, YAHOO_AFFILIATE_ID } = process.env;
  
  if (!YAHOO_SHOPPING_APP_ID) {
    throw new Error('YAHOO_SHOPPING_APP_ID is not configured');
  }

  const query = new URLSearchParams({
    appid: YAHOO_SHOPPING_APP_ID,
    affiliate_type: 'vc',
    affiliate_id: YAHOO_AFFILIATE_ID || '',
    results: String(params.results ?? 20),
    sort: params.sort ?? 'score',
    ...(params.query ? { query: params.query } : {}),
    ...(params.category_id ? { category_id: String(params.category_id) } : {}),
    ...(params.price_from ? { price_from: String(params.price_from) } : {}),
    ...(params.price_to ? { price_to: String(params.price_to) } : {}),
  });

  const url = `${BASE_URL}?${query.toString()}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Yahoo Shopping API error: ${response.status} ${response.statusText}`);
    }

    const data: YahooApiResponse = await response.json() as YahooApiResponse;
    
    if (data.error) {
      throw new Error(`Yahoo Shopping API error: ${data.error.message} (${data.error.code})`);
    }

    // Get or create Yahoo Shopping network entry
    let network = await db.select().from(affiliateNetworks).where(eq(affiliateNetworks.name, 'yahoo')).limit(1);
    
    if (network.length === 0) {
      const [newNetwork] = await db.insert(affiliateNetworks).values({
        name: 'yahoo',
        api_keys: {
          appId: YAHOO_SHOPPING_APP_ID,
          affiliateId: YAHOO_AFFILIATE_ID || null
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
      // Calculate commission (Yahoo Shopping typically 1-3%)
      const commissionRate = 0.02; // 2% default
      const commissionBps = Math.round(commissionRate * 10000);

      return {
        network_id: networkId,
        external_id: item.code,
        title: item.name,
        price_jpy: item.price,
        commission_bps: commissionBps,
        affiliate_url: item.affiliateUrl || item.url,
        product_url: item.url,
        image_url: item.imageId ? `https://item-shopping.c.yimg.jp/i/g/${item.imageId}` : null,
        shop_name: item.store?.name || 'Yahoo!ショッピング',
        rating: item.review?.rate || null,
        review_count: item.review?.count || null,
        category: item.categoryId || null,
        source_payload: item,
      };
    });

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