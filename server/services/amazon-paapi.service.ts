import fetch from 'node-fetch';
import crypto from 'crypto';
import { db } from '../db';
import { offers, affiliateNetworks } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const PAAPI_HOST = 'webservices.amazon.co.jp';
const PAAPI_REGION = 'us-west-2';
const PAAPI_SERVICE = 'ProductAdvertisingAPI';
const PAAPI_VERSION = 'paapi5-sdk';

export interface AmazonSearchParams {
  keywords?: string;
  searchIndex?: string; // 'All', 'Books', 'Electronics', etc.
  itemCount?: number;
  itemPage?: number;
  sortBy?: string;
  minPrice?: number;
  maxPrice?: number;
  brand?: string;
}

export interface AmazonItem {
  ASIN: string;
  DetailPageURL: string;
  Images: {
    Primary: {
      Large: { URL: string; Height: number; Width: number };
      Medium: { URL: string; Height: number; Width: number };
      Small: { URL: string; Height: number; Width: number };
    };
  };
  ItemInfo: {
    ByLineInfo?: {
      Brand?: { DisplayValue: string };
      Manufacturer?: { DisplayValue: string };
    };
    Classifications?: {
      Binding?: { DisplayValue: string };
      ProductGroup?: { DisplayValue: string };
    };
    ContentInfo?: {
      Edition?: { DisplayValue: string };
      PagesCount?: { DisplayValue: number };
    };
    ExternalIds?: {
      EANs?: { DisplayValues: string[] };
      ISBNs?: { DisplayValues: string[] };
      UPCs?: { DisplayValues: string[] };
    };
    Features?: {
      DisplayValues: string[];
    };
    Title: {
      DisplayValue: string;
      Label: string;
      Locale: string;
    };
  };
  Offers: {
    Listings: Array<{
      Id: string;
      Price: {
        Amount: number;
        Currency: string;
        DisplayAmount: string;
      };
      ProgramEligibility: {
        IsPrimeEligible: boolean;
        IsPrimePantryEligible: boolean;
      };
      SavingBasis?: {
        Amount: number;
        Currency: string;
        DisplayAmount: string;
      };
    }>;
    Summaries: Array<{
      Condition: {
        Value: string;
      };
      HighestPrice: {
        Amount: number;
        Currency: string;
        DisplayAmount: string;
      };
      LowestPrice: {
        Amount: number;
        Currency: string;
        DisplayAmount: string;
      };
      OfferCount: number;
    }>;
  };
  ParentASIN?: string;
}

export interface PAAPIResponse {
  SearchResult?: {
    Items: AmazonItem[];
    SearchURL: string;
    TotalResultCount: number;
  };
  Errors?: Array<{
    Code: string;
    Message: string;
  }>;
}

export class AmazonPAAPIService {
  private accessKey: string;
  private secretKey: string;
  private partnerTag: string;

  constructor() {
    const { 
      AMAZON_PAAPI_ACCESS_KEY, 
      AMAZON_PAAPI_SECRET_KEY, 
      AMAZON_ASSOCIATE_TAG 
    } = process.env;
    
    if (!AMAZON_PAAPI_ACCESS_KEY || !AMAZON_PAAPI_SECRET_KEY || !AMAZON_ASSOCIATE_TAG) {
      throw new Error('Amazon PA-API credentials not configured');
    }
    
    this.accessKey = AMAZON_PAAPI_ACCESS_KEY;
    this.secretKey = AMAZON_PAAPI_SECRET_KEY;
    this.partnerTag = AMAZON_ASSOCIATE_TAG;
  }

  private createSignature(stringToSign: string, secretKey: string): string {
    return crypto
      .createHmac('sha256', secretKey)
      .update(stringToSign)
      .digest('hex');
  }

  private createAuthorizationHeader(
    method: string,
    uri: string,
    query: string,
    headers: Record<string, string>,
    payload: string
  ): string {
    const algorithm = 'AWS4-HMAC-SHA256';
    const date = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
    const dateStamp = date.substr(0, 8);
    
    // Create canonical request
    const canonicalUri = uri;
    const canonicalQuerystring = query;
    const canonicalHeaders = Object.entries(headers)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key.toLowerCase()}:${value}\n`)
      .join('');
    const signedHeaders = Object.keys(headers)
      .sort()
      .map(key => key.toLowerCase())
      .join(';');
    
    const payloadHash = crypto
      .createHash('sha256')
      .update(payload)
      .digest('hex');
    
    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQuerystring,
      canonicalHeaders,
      signedHeaders,
      payloadHash
    ].join('\n');
    
    // Create string to sign
    const credentialScope = `${dateStamp}/${PAAPI_REGION}/${PAAPI_SERVICE}/aws4_request`;
    const stringToSign = [
      algorithm,
      date,
      credentialScope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex')
    ].join('\n');
    
    // Calculate signature
    const kDate = crypto.createHmac('sha256', `AWS4${this.secretKey}`).update(dateStamp).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(PAAPI_REGION).digest();
    const kService = crypto.createHmac('sha256', kRegion).update(PAAPI_SERVICE).digest();
    const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');
    
    const authorizationHeader = `${algorithm} Credential=${this.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    
    return authorizationHeader;
  }

  async searchItems(params: AmazonSearchParams) {
    const payload = {
      PartnerType: 'Associates',
      PartnerTag: this.partnerTag,
      Marketplace: 'www.amazon.co.jp',
      Operation: 'SearchItems',
      SearchIndex: params.searchIndex || 'All',
      Keywords: params.keywords,
      ItemCount: params.itemCount || 10,
      ItemPage: params.itemPage || 1,
      Resources: [
        'Images.Primary.Large',
        'Images.Primary.Medium',
        'Images.Primary.Small',
        'ItemInfo.Title',
        'ItemInfo.ByLineInfo',
        'ItemInfo.Classifications',
        'ItemInfo.Features',
        'Offers.Listings.Price',
        'Offers.Summaries.HighestPrice',
        'Offers.Summaries.LowestPrice',
        'ParentASIN'
      ]
    };

    const jsonPayload = JSON.stringify(payload);
    const host = PAAPI_HOST;
    const uri = '/paapi5/searchitems';
    const method = 'POST';
    
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'Host': host,
      'X-Amz-Date': new Date().toISOString().replace(/[:\-]|\.\d{3}/g, ''),
      'X-Amz-Target': 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems'
    };
    
    const authorization = this.createAuthorizationHeader(method, uri, '', headers, jsonPayload);
    headers['Authorization'] = authorization;
    
    try {
      const response = await fetch(`https://${host}${uri}`, {
        method,
        headers,
        body: jsonPayload
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Amazon PA-API error: ${response.status} ${errorText}`);
      }

      const data: PAAPIResponse = await response.json() as PAAPIResponse;
      
      if (data.Errors && data.Errors.length > 0) {
        throw new Error(`Amazon PA-API error: ${data.Errors[0].Code} - ${data.Errors[0].Message}`);
      }

      return await this.processSearchResults(data);
    } catch (error) {
      console.error('Amazon PA-API error:', error);
      throw error;
    }
  }

  private async processSearchResults(data: PAAPIResponse) {
    if (!data.SearchResult || !data.SearchResult.Items) {
      return [];
    }

    // Get or create Amazon network entry
    let network = await db.select().from(affiliateNetworks).where(eq(affiliateNetworks.name, 'amazon')).limit(1);
    
    if (network.length === 0) {
      const [newNetwork] = await db.insert(affiliateNetworks).values({
        name: 'amazon',
        api_keys: {
          accessKey: this.accessKey,
          partnerTag: this.partnerTag
        },
        enabled: true,
        cvr_proxy: 0.04 // Default CVR for Amazon
      }).returning();
      network = [newNetwork];
    }

    const networkId = network[0].id;
    const items = data.SearchResult.Items;
    
    // Transform and upsert offers
    const offerData = items.map(item => {
      const listing = item.Offers?.Listings?.[0];
      const summary = item.Offers?.Summaries?.[0];
      const price = listing?.Price?.Amount || summary?.LowestPrice?.Amount || 0;
      
      // Amazon Associates commission varies by category (0.5% - 10%)
      // Using 3% as default estimate
      const commissionBps = 300; // 3%
      
      return {
        network_id: networkId,
        external_id: item.ASIN,
        title: item.ItemInfo.Title.DisplayValue,
        price_jpy: Math.round(price), // Convert to JPY if needed
        commission_bps: commissionBps,
        affiliate_url: item.DetailPageURL, // Should be converted to affiliate link
        product_url: item.DetailPageURL,
        image_url: item.Images?.Primary?.Large?.URL || 
                  item.Images?.Primary?.Medium?.URL || 
                  item.Images?.Primary?.Small?.URL || null,
        shop_name: 'Amazon Japan',
        category: item.ItemInfo.Classifications?.ProductGroup?.DisplayValue || null,
        source_payload: item,
      };
    }).filter(offer => offer.price_jpy > 0);

    // Bulk insert/update offers
    const insertedOffers = await db.insert(offers).values(offerData).returning();
    
    return insertedOffers;
  }
}

export async function searchAmazonItems(params: AmazonSearchParams) {
  const service = new AmazonPAAPIService();
  return await service.searchItems(params);
}

export async function getAmazonOfferById(asin: string) {
  const network = await db.select().from(affiliateNetworks).where(eq(affiliateNetworks.name, 'amazon')).limit(1);
  
  if (network.length === 0) {
    return null;
  }

  const [offer] = await db.select()
    .from(offers)
    .where(eq(offers.external_id, asin))
    .limit(1);

  return offer || null;
}