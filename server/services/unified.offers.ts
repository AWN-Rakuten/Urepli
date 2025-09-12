/**
 * Unified Offer Service
 * Aggregates offers from Rakuten, Yahoo, Amazon, ValueCommerce with Thompson Sampling
 */

import { searchRakutenItems } from './rakuten.service';
import { searchYahooShoppingItems } from './yahoo.shopping.ts';
import { searchAmazonItems } from './amazon.paapi.service';
import { searchValueCommerceItems } from './valuecommerce.service';
import { getBestOfferByERPC, calculateERPC } from './erpc.service';
import { thompsonSamplingBandit } from './bandit.service';
import { db } from '../db';
import { offers, affiliateNetworks } from '../../shared/schema';
import { eq } from 'drizzle-orm';

export interface UnifiedSearchParams {
  keyword: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  networks?: string[]; // ['rakuten', 'yahoo', 'amazon', 'valuecommerce']
}

export interface UnifiedOffer {
  id: string;
  network: string;
  external_id: string;
  title: string;
  price_jpy: number;
  commission_bps: number | null;
  affiliate_url: string;
  product_url: string;
  image_url: string | null;
  shop_name: string | null;
  rating: number | null;
  review_count: number | null;
  eRPC: number;
  commission: number;
  expectedRevenue: number;
  cvr_proxy: number;
}

/**
 * Unified Offer Search Service
 */
export class UnifiedOfferService {

  /**
   * Search across all enabled affiliate networks
   */
  async searchOffers(params: UnifiedSearchParams): Promise<UnifiedOffer[]> {
    const { keyword, minPrice, maxPrice, limit = 10, networks } = params;
    
    // Get enabled networks
    const enabledNetworks = await this.getEnabledNetworks(networks);
    
    // Search each network in parallel
    const searchPromises = enabledNetworks.map(network => 
      this.searchNetwork(network, { keyword, minPrice, maxPrice, limit: 20 })
    );
    
    const searchResults = await Promise.allSettled(searchPromises);
    
    // Combine results and calculate eRPC
    const allOffers: UnifiedOffer[] = [];
    
    searchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allOffers.push(...result.value);
      } else {
        console.warn(`Search failed for network ${enabledNetworks[index].name}:`, result.reason);
      }
    });
    
    // Sort by eRPC and return top results
    return allOffers
      .sort((a, b) => b.eRPC - a.eRPC)
      .slice(0, limit);
  }

  /**
   * Get top N offers for a post using Thompson Sampling
   */
  async getOptimalOffers(postId: string, keyword: string, numOffers: number = 3): Promise<UnifiedOffer[]> {
    // First get candidate offers
    const candidates = await this.searchOffers({ keyword, limit: 20 });
    
    if (candidates.length === 0) {
      return [];
    }
    
    // If we have existing variants, use Thompson Sampling
    try {
      const selectedVariantId = await thompsonSamplingBandit.chooseVariant(postId);
      
      if (selectedVariantId) {
        // Return the bandit-selected offer first, then fill with eRPC-ranked offers
        const selectedOffer = candidates.find(o => o.id === selectedVariantId);
        const otherOffers = candidates.filter(o => o.id !== selectedVariantId).slice(0, numOffers - 1);
        
        return selectedOffer ? [selectedOffer, ...otherOffers] : candidates.slice(0, numOffers);
      }
    } catch (error) {
      console.warn('Thompson Sampling failed, falling back to eRPC ranking:', error);
    }
    
    // Fallback to eRPC ranking
    return candidates.slice(0, numOffers);
  }

  /**
   * Create link variants for a post
   */
  async createLinkVariants(postId: string, offers: UnifiedOffer[]) {
    const variants = [];
    
    for (const [index, offer] of offers.entries()) {
      const variantKey = `${offer.network}-${offer.external_id}-${Date.now()}`;
      
      // Create variant in database
      const [variant] = await db.insert(linkVariants).values({
        post_id: postId,
        offer_id: offer.id,
        variant_key: variantKey,
        caption: `${offer.title}をチェック！`,
        thumb_url: offer.image_url,
        enabled: true
      }).returning();
      
      variants.push(variant);
    }
    
    return variants;
  }

  /**
   * Get network performance and update CVR proxies
   */
  async updateNetworkPerformance() {
    const networks = await db.select().from(affiliateNetworks).where(eq(affiliateNetworks.enabled, true));
    
    for (const network of networks) {
      try {
        // Update CVR proxy based on recent performance
        const updatedCVR = await updateNetworkCVRProxy(network.id, 30);
        
        if (updatedCVR !== null) {
          console.log(`Updated CVR for ${network.name}: ${updatedCVR.toFixed(4)}`);
        }
      } catch (error) {
        console.error(`Failed to update CVR for ${network.name}:`, error);
      }
    }
  }

  /**
   * Private helper methods
   */
  private async getEnabledNetworks(filterNetworks?: string[]) {
    let query = db.select().from(affiliateNetworks).where(eq(affiliateNetworks.enabled, true));
    
    const networks = await query;
    
    if (filterNetworks && filterNetworks.length > 0) {
      return networks.filter(n => filterNetworks.includes(n.name));
    }
    
    return networks;
  }

  private async searchNetwork(
    network: any, 
    params: { keyword: string; minPrice?: number; maxPrice?: number; limit: number }
  ): Promise<UnifiedOffer[]> {
    try {
      let networkOffers = [];
      
      switch (network.name) {
        case 'rakuten':
          networkOffers = await searchRakutenItems({
            keyword: params.keyword,
            minPrice: params.minPrice,
            maxPrice: params.maxPrice,
            hits: params.limit
          });
          break;
          
        case 'yahoo':
          networkOffers = await searchYahooShoppingItems({
            query: params.keyword,
            price_from: params.minPrice,
            price_to: params.maxPrice,
            results: params.limit
          });
          break;
          
        case 'amazon':
          networkOffers = await searchAmazonItems({
            keywords: params.keyword,
            minPrice: params.minPrice,
            maxPrice: params.maxPrice,
            itemCount: params.limit
          });
          break;
          
        case 'valuecommerce':
          networkOffers = await searchValueCommerceItems({
            keyword: params.keyword,
            priceFrom: params.minPrice,
            priceTo: params.maxPrice,
            count: params.limit
          });
          break;
          
        default:
          console.warn(`Unknown network: ${network.name}`);
          return [];
      }
      
      // Transform to unified format and calculate eRPC
      return networkOffers.map(offer => this.transformToUnifiedOffer(offer, network));
      
    } catch (error) {
      console.error(`Network search failed for ${network.name}:`, error);
      return [];
    }
  }

  private transformToUnifiedOffer(offer: any, network: any): UnifiedOffer {
    const cvr_proxy = network.cvr_proxy || 0.03;
    const commission_bps = offer.commission_bps || 200; // Default 2%
    
    const erpcResult = calculateERPC({
      price_jpy: offer.price_jpy,
      commission_bps,
      cvr_proxy
    });

    return {
      id: offer.id,
      network: network.name,
      external_id: offer.external_id,
      title: offer.title,
      price_jpy: offer.price_jpy,
      commission_bps: offer.commission_bps,
      affiliate_url: offer.affiliate_url,
      product_url: offer.product_url,
      image_url: offer.image_url,
      shop_name: offer.shop_name,
      rating: offer.rating,
      review_count: offer.review_count,
      cvr_proxy,
      ...erpcResult
    };
  }
}

// Missing imports - create placeholder services
async function searchAmazonItems(params: any) {
  // Placeholder for Amazon PA-API integration
  return [];
}

async function searchValueCommerceItems(params: any) {
  // Placeholder for ValueCommerce integration  
  return [];
}

async function updateNetworkCVRProxy(networkId: string, days: number) {
  // Import from existing erpc.service
  const { updateNetworkCVRProxy } = await import('./erpc.service');
  return updateNetworkCVRProxy(networkId, days);
}

// Add missing import for linkVariants
const { linkVariants } = await import('../../shared/schema');

export const unifiedOfferService = new UnifiedOfferService();