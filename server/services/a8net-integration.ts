import axios from 'axios';
import crypto from 'crypto';

export interface A8NetProduct {
  id: string;
  name: string;
  category: string;
  commission: number;
  commissionType: 'percentage' | 'fixed';
  landingPageUrl: string;
  imageUrl: string;
  description: string;
  merchantName: string;
}

export class A8NetService {
  private apiKey: string;
  private secretKey: string;
  private baseUrl = 'https://api.a8.net/v1';
  private affiliateId: string;

  constructor(apiKey: string, secretKey: string, affiliateId: string) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.affiliateId = affiliateId;
  }

  private generateSignature(params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(sortedParams)
      .digest('hex');
  }

  async getHighROIProducts(category?: string): Promise<A8NetProduct[]> {
    // For demo purposes, return mock data since A8.net API access requires approval
    console.log('Fetching A8.net high ROI products for category:', category);
    
    const mockProducts: A8NetProduct[] = [
      {
        id: 'a8-mobile-001',
        name: 'ドコモ新規契約キャンペーン',
        category: 'mobile',
        commission: 15000,
        commissionType: 'fixed',
        landingPageUrl: 'https://example.com/docomo-campaign',
        imageUrl: 'https://example.com/docomo-banner.jpg',
        description: 'ドコモの新規契約で最大15,000円キャッシュバック',
        merchantName: 'NTTドコモ'
      },
      {
        id: 'a8-finance-001',
        name: '楽天クレジットカード新規入会',
        category: 'finance',
        commission: 8000,
        commissionType: 'fixed',
        landingPageUrl: 'https://example.com/rakuten-card',
        imageUrl: 'https://example.com/rakuten-card-banner.jpg',
        description: '楽天カード新規入会で8,000ポイントプレゼント',
        merchantName: '楽天カード株式会社'
      },
      {
        id: 'a8-tech-001',
        name: '最新iPhone購入サポート',
        category: 'tech',
        commission: 5000,
        commissionType: 'fixed',
        landingPageUrl: 'https://example.com/iphone-deal',
        imageUrl: 'https://example.com/iphone-banner.jpg',
        description: '最新iPhone購入で5,000円分のギフトカードプレゼント',
        merchantName: 'Apple公認販売店'
      }
    ];

    return mockProducts.filter(product => !category || product.category === category);
  }

  async generateAffiliateLink(productId: string, customParams?: Record<string, string>): Promise<string> {
    console.log('Generating A8.net affiliate link for product:', productId);
    
    // Return mock affiliate link
    const trackingId = Math.random().toString(36).substring(7);
    return `https://px.a8.net/svt/ejp?a8mat=${trackingId}&pid=${this.affiliateId}&p=${productId}`;
  }

  async trackConversion(linkId: string, conversionType: 'click' | 'sale'): Promise<void> {
    console.log('Tracking A8.net conversion:', { linkId, conversionType });
    // Mock tracking - in real implementation, this would send data to A8.net
  }

  async getTopPerformingProducts(timeframe: '7d' | '30d' | '90d' = '30d'): Promise<A8NetProduct[]> {
    console.log('Fetching A8.net top performing products for timeframe:', timeframe);
    
    // Return products sorted by commission amount (mock performance sorting)
    const products = await this.getHighROIProducts();
    return products.sort((a, b) => b.commission - a.commission);
  }
}