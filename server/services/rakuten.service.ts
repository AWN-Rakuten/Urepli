import fetch from 'node-fetch';
import { URLSearchParams } from 'url';
import { db } from '../db';
import { offers, affiliateNetworks } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const BASE_URL = 'https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601';

export interface RakutenSearchParams {
  keyword?: string;
  genreId?: number;
  minPrice?: number;
  maxPrice?: number;
  sort?: string; // 'standard', 'affiliateRate', 'price', etc.
  hits?: number;
}

export interface RakutenItem {
  itemCode: string;
  itemName: string;
  itemPrice: number;
  itemUrl: string;
  affiliateUrl?: string;
  affiliateRate?: number;
  mediumImageUrls?: Array<{ imageUrl: string }>;
  smallImageUrls?: Array<{ imageUrl: string }>;
  shopName: string;
  reviewCount?: number;
  reviewAverage?: number;
  genreId: string;
}

export interface RakutenApiResponse {
  items?: Array<{
    Item?: RakutenItem;
  }>;
  error?: string;
  error_description?: string;
}

export async function searchRakutenItems(params: RakutenSearchParams) {
  const { RAKUTEN_APPLICATION_ID, RAKUTEN_AFFILIATE_ID } = process.env;
  
  if (!RAKUTEN_APPLICATION_ID) {
    throw new Error('RAKUTEN_APPLICATION_ID is not configured');
  }

  const query = new URLSearchParams({
    applicationId: RAKUTEN_APPLICATION_ID,
    format: 'json',
    formatVersion: '2',
    hits: String(params.hits ?? 20),
    ...(RAKUTEN_AFFILIATE_ID ? { affiliateId: RAKUTEN_AFFILIATE_ID } : {}),
    ...(params.keyword ? { keyword: params.keyword } : {}),
    ...(params.genreId ? { genreId: String(params.genreId) } : {}),
    ...(params.minPrice ? { minPrice: String(params.minPrice) } : {}),
    ...(params.maxPrice ? { maxPrice: String(params.maxPrice) } : {}),
    ...(params.sort ? { sort: params.sort } : {}),
  });

  const url = `${BASE_URL}?${query.toString()}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Rakuten API error: ${response.status} ${response.statusText}`);
    }

    const data: RakutenApiResponse = await response.json() as RakutenApiResponse;
    
    if (data.error) {
      throw new Error(`Rakuten API error: ${data.error} - ${data.error_description}`);
    }

    // Get or create Rakuten network entry
    let network = await db.select().from(affiliateNetworks).where(eq(affiliateNetworks.name, 'rakuten')).limit(1);
    
    if (network.length === 0) {
      const [newNetwork] = await db.insert(affiliateNetworks).values({
        name: 'rakuten',
        api_keys: {
          applicationId: RAKUTEN_APPLICATION_ID,
          affiliateId: RAKUTEN_AFFILIATE_ID || null
        },
        enabled: true,
        cvr_proxy: 0.03 // Default CVR for Rakuten
      }).returning();
      network = [newNetwork];
    }

    const networkId = network[0].id;
    const items = data.items || [];
    
    // Transform and upsert offers
    const offerData = items.map(item => {
      const rakutenItem = item.Item;
      if (!rakutenItem) return null;

      return {
        network_id: networkId,
        external_id: rakutenItem.itemCode,
        title: rakutenItem.itemName,
        price_jpy: rakutenItem.itemPrice,
        commission_bps: rakutenItem.affiliateRate ? Math.round(Number(rakutenItem.affiliateRate) * 100) : null,
        affiliate_url: rakutenItem.affiliateUrl || rakutenItem.itemUrl,
        product_url: rakutenItem.itemUrl,
        image_url: rakutenItem.mediumImageUrls?.[0]?.imageUrl || 
                  rakutenItem.smallImageUrls?.[0]?.imageUrl || null,
        shop_name: rakutenItem.shopName,
        rating: rakutenItem.reviewAverage || null,
        review_count: rakutenItem.reviewCount || null,
        category: rakutenItem.genreId || null,
        source_payload: rakutenItem,
      };
    }).filter(Boolean);

    // Bulk insert/update offers
    const insertedOffers = await db.insert(offers).values(offerData).returning();
    
    return insertedOffers;
  } catch (error) {
    console.error('Rakuten API error:', error);
    throw error;
  }
}

export async function getRakutenOfferById(externalId: string) {
  const network = await db.select().from(affiliateNetworks).where(eq(affiliateNetworks.name, 'rakuten')).limit(1);
  
  if (network.length === 0) {
    return null;
  }

  const [offer] = await db.select()
    .from(offers)
    .where(eq(offers.external_id, externalId))
    .limit(1);

  return offer || null;
}