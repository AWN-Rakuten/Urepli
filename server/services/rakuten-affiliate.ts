import axios from 'axios';

export interface RakutenProduct {
  id: string;
  name: string;
  price: number;
  commissionRate: number;
  shopName: string;
  imageUrl: string;
  affiliateUrl: string;
  rating: number;
  reviewCount: number;
}

export class RakutenAffiliateService {
  private applicationId: string;
  private affiliateId: string;
  private baseUrl = 'https://app.rakuten.co.jp/services/api';

  constructor(applicationId: string, affiliateId: string) {
    this.applicationId = applicationId;
    this.affiliateId = affiliateId;
  }

  async searchProducts(keyword: string, category?: string): Promise<RakutenProduct[]> {
    console.log('Searching Rakuten products:', { keyword, category });
    
    // Return mock data for demo purposes
    const mockProducts: RakutenProduct[] = [
      {
        id: 'rakuten-001',
        name: 'iPhone 15 Pro 128GB',
        price: 159800,
        commissionRate: 3.5,
        shopName: 'Apple Store楽天市場店',
        imageUrl: 'https://example.com/iphone15pro.jpg',
        affiliateUrl: 'https://hb.afl.rakuten.co.jp/hgc/example',
        rating: 4.8,
        reviewCount: 1250
      },
      {
        id: 'rakuten-002',
        name: 'Nintendo Switch 有機ELモデル',
        price: 37980,
        commissionRate: 2.5,
        shopName: 'Nintendo TOKYO',
        imageUrl: 'https://example.com/switch-oled.jpg',
        affiliateUrl: 'https://hb.afl.rakuten.co.jp/hgc/example2',
        rating: 4.7,
        reviewCount: 890
      },
      {
        id: 'rakuten-003',
        name: 'Sony WH-1000XM5 ヘッドフォン',
        price: 45000,
        commissionRate: 4.0,
        shopName: 'ソニーストア',
        imageUrl: 'https://example.com/sony-headphones.jpg',
        affiliateUrl: 'https://hb.afl.rakuten.co.jp/hgc/example3',
        rating: 4.9,
        reviewCount: 567
      }
    ];

    return mockProducts.filter(product => 
      !keyword || product.name.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  async getTrendingProducts(genreId?: string): Promise<RakutenProduct[]> {
    console.log('Fetching Rakuten trending products for genre:', genreId);
    
    // Return mock trending products
    return this.searchProducts('', genreId);
  }

  async getVideoFriendlyProducts(category: string): Promise<RakutenProduct[]> {
    console.log('Fetching Rakuten video-friendly products for category:', category);
    
    const products = await this.searchProducts('', category);
    
    // Filter and sort for video-friendly products
    return products
      .filter(product => 
        product.imageUrl &&
        product.commissionRate >= 2 &&
        product.rating >= 4 &&
        product.reviewCount >= 10
      )
      .sort((a, b) => {
        // Prioritize by commission rate * rating * review count
        const scoreA = a.commissionRate * a.rating * Math.log(a.reviewCount + 1);
        const scoreB = b.commissionRate * b.rating * Math.log(b.reviewCount + 1);
        return scoreB - scoreA;
      })
      .slice(0, 10);
  }
}