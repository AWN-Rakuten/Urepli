/**
 * TikTok Creative Center Trend Discovery Service
 * Fetches trending hashtags, songs, and creators from Japan region
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';
import puppeteer, { Browser } from 'puppeteer';

export interface TikTokTrend {
  id: string;
  name: string;
  type: 'hashtag' | 'song' | 'creator';
  country: string;
  score: number;
  metadata?: {
    views?: number;
    posts?: number;
    growth?: string;
    category?: string;
  };
}

/**
 * TikTok Creative Center trends scraper
 * Since TikTok Creative Center doesn't have a public API, we use headless browsing
 */
export class TikTokTrendsService {
  private browser: Browser | null = null;

  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });
    }
    return this.browser;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Scrape trending hashtags from TikTok Creative Center
   */
  async fetchTrendingHashtags(country: string = 'JP'): Promise<TikTokTrend[]> {
    const browser = await this.initBrowser();
    const page = await browser.newPage();
    
    try {
      // Set user agent to appear as regular browser
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Navigate to TikTok Creative Center (Japan)
      await page.goto('https://ads.tiktok.com/business/creativecenter/inspiration/trending-hashtags/pc/ja?period=7&region=JP', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for hashtags to load
      await page.waitForSelector('[data-testid="hashtag-item"], .hashtag-item, .trend-item', { timeout: 15000 });

      // Extract hashtag data
      const hashtags = await page.evaluate(() => {
        const hashtagElements = document.querySelectorAll('[data-testid="hashtag-item"], .hashtag-item, .trend-item, .creative-item');
        const trends: any[] = [];

        hashtagElements.forEach((element, index) => {
          const nameElement = element.querySelector('.hashtag-name, .trend-name, h3, .title');
          const metricElement = element.querySelector('.views, .posts, .metric, .count');
          const growthElement = element.querySelector('.growth, .trend-arrow, .percentage');
          
          if (nameElement) {
            const name = nameElement.textContent?.trim() || '';
            const metric = metricElement?.textContent?.trim() || '0';
            const growth = growthElement?.textContent?.trim() || '';
            
            if (name && name.length > 0) {
              trends.push({
                name: name.startsWith('#') ? name : `#${name}`,
                score: Math.max(100 - index, 1), // Higher score for earlier items
                metadata: {
                  views: parseInt(metric.replace(/[^\d]/g, '')) || 0,
                  growth: growth
                }
              });
            }
          }
        });

        return trends.slice(0, 50); // Limit to top 50
      });

      return hashtags.map((hashtag, index) => ({
        id: `tiktok-hashtag-${Date.now()}-${index}`,
        name: hashtag.name,
        type: 'hashtag' as const,
        country,
        score: hashtag.score,
        metadata: hashtag.metadata
      }));
    } catch (error) {
      console.error('Error fetching TikTok hashtags:', error);
      // Return fallback trending hashtags for Japan
      return this.getFallbackTrends('hashtag', country);
    } finally {
      await page.close();
    }
  }

  /**
   * Scrape trending songs from TikTok Creative Center
   */
  async fetchTrendingSongs(country: string = 'JP'): Promise<TikTokTrend[]> {
    const browser = await this.initBrowser();
    const page = await browser.newPage();
    
    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      await page.goto('https://ads.tiktok.com/business/creativecenter/inspiration/trending-music/pc/ja?period=7&region=JP', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      await page.waitForSelector('[data-testid="music-item"], .music-item, .song-item', { timeout: 15000 });

      const songs = await page.evaluate(() => {
        const songElements = document.querySelectorAll('[data-testid="music-item"], .music-item, .song-item');
        const trends: any[] = [];

        songElements.forEach((element, index) => {
          const titleElement = element.querySelector('.song-title, .music-name, h3, .title');
          const artistElement = element.querySelector('.artist, .singer, .author');
          const usageElement = element.querySelector('.usage, .posts, .count');
          
          if (titleElement) {
            const title = titleElement.textContent?.trim() || '';
            const artist = artistElement?.textContent?.trim() || '';
            const usage = usageElement?.textContent?.trim() || '';
            
            if (title) {
              trends.push({
                name: artist ? `${title} - ${artist}` : title,
                score: Math.max(100 - index, 1),
                metadata: {
                  posts: parseInt(usage.replace(/[^\d]/g, '')) || 0,
                  artist: artist
                }
              });
            }
          }
        });

        return trends.slice(0, 30);
      });

      return songs.map((song, index) => ({
        id: `tiktok-song-${Date.now()}-${index}`,
        name: song.name,
        type: 'song' as const,
        country,
        score: song.score,
        metadata: song.metadata
      }));
    } catch (error) {
      console.error('Error fetching TikTok songs:', error);
      return this.getFallbackTrends('song', country);
    } finally {
      await page.close();
    }
  }

  /**
   * Scrape trending creators from TikTok Creative Center
   */
  async fetchTrendingCreators(country: string = 'JP'): Promise<TikTokTrend[]> {
    const browser = await this.initBrowser();
    const page = await browser.newPage();
    
    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      await page.goto('https://ads.tiktok.com/business/creativecenter/inspiration/trending-creators/pc/ja?period=7&region=JP', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      await page.waitForSelector('[data-testid="creator-item"], .creator-item', { timeout: 15000 });

      const creators = await page.evaluate(() => {
        const creatorElements = document.querySelectorAll('[data-testid="creator-item"], .creator-item');
        const trends: any[] = [];

        creatorElements.forEach((element, index) => {
          const nameElement = element.querySelector('.creator-name, .username, h3, .name');
          const followersElement = element.querySelector('.followers, .fans, .count');
          
          if (nameElement) {
            const name = nameElement.textContent?.trim() || '';
            const followers = followersElement?.textContent?.trim() || '';
            
            if (name) {
              trends.push({
                name: name.startsWith('@') ? name : `@${name}`,
                score: Math.max(100 - index, 1),
                metadata: {
                  followers: parseInt(followers.replace(/[^\d]/g, '')) || 0
                }
              });
            }
          }
        });

        return trends.slice(0, 20);
      });

      return creators.map((creator, index) => ({
        id: `tiktok-creator-${Date.now()}-${index}`,
        name: creator.name,
        type: 'creator' as const,
        country,
        score: creator.score,
        metadata: creator.metadata
      }));
    } catch (error) {
      console.error('Error fetching TikTok creators:', error);
      return this.getFallbackTrends('creator', country);
    } finally {
      await page.close();
    }
  }

  /**
   * Get all trending data (hashtags, songs, creators)
   */
  async fetchAllTrends(country: string = 'JP'): Promise<TikTokTrend[]> {
    const [hashtags, songs, creators] = await Promise.allSettled([
      this.fetchTrendingHashtags(country),
      this.fetchTrendingSongs(country), 
      this.fetchTrendingCreators(country)
    ]);

    const trends: TikTokTrend[] = [];
    
    if (hashtags.status === 'fulfilled') trends.push(...hashtags.value);
    if (songs.status === 'fulfilled') trends.push(...songs.value);
    if (creators.status === 'fulfilled') trends.push(...creators.value);

    return trends;
  }

  /**
   * Store trends in database
   */
  async storeTrends(trends: TikTokTrend[]): Promise<void> {
    if (trends.length === 0) return;

    // Create trends table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS tiktok_trends (
        id VARCHAR PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        country VARCHAR(2) NOT NULL,
        score REAL DEFAULT 0,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create index for faster lookups
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_tiktok_trends_country_type_score 
      ON tiktok_trends(country, type, score DESC);
    `);

    // Insert trends with upsert logic
    for (const trend of trends) {
      await db.execute(sql`
        INSERT INTO tiktok_trends (id, name, type, country, score, metadata, created_at, updated_at)
        VALUES (${trend.id}, ${trend.name}, ${trend.type}, ${trend.country}, ${trend.score}, ${JSON.stringify(trend.metadata)}, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          score = EXCLUDED.score,
          metadata = EXCLUDED.metadata,
          updated_at = NOW();
      `);
    }
  }

  /**
   * Get trends from database
   */
  async getTrends(country: string = 'JP', type?: string, limit: number = 50): Promise<TikTokTrend[]> {
    let query = sql`
      SELECT id, name, type, country, score, metadata
      FROM tiktok_trends 
      WHERE country = ${country}
    `;

    if (type) {
      query = sql`${query} AND type = ${type}`;
    }

    query = sql`${query} ORDER BY score DESC, updated_at DESC LIMIT ${limit}`;

    const results = await db.execute(query);
    return results.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      country: row.country,
      score: row.score,
      metadata: row.metadata
    }));
  }

  /**
   * Fallback trends for when scraping fails
   */
  private getFallbackTrends(type: 'hashtag' | 'song' | 'creator', country: string): TikTokTrend[] {
    const fallbacks = {
      hashtag: [
        '#おすすめ', '#fyp', '#viral', '#トレンド', '#日本', '#グルメ', '#美容', '#ファッション',
        '#旅行', '#技術', '#料理', '#アニメ', '#ゲーム', '#音楽', '#ダンス', '#コメディ',
        '#ライフハック', '#DIY', '#フィットネス', '#勉強', '#仕事', '#恋愛', '#家族', '#ペット'
      ],
      song: [
        '話題の楽曲', 'バイラルソング', 'J-POP', 'アニソン', 'ボカロ', 'インストゥルメンタル'
      ],
      creator: [
        '@tiktok', '@creator', '@influencer', '@japanese_creator'
      ]
    };

    return fallbacks[type].map((name, index) => ({
      id: `fallback-${type}-${Date.now()}-${index}`,
      name,
      type,
      country,
      score: Math.max(50 - index, 1),
      metadata: { fallback: true }
    }));
  }
}

export const tiktokTrendsService = new TikTokTrendsService();