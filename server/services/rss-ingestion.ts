import Parser from 'rss-parser';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { IStorage } from '../storage.js';

export interface RSSItem {
  id: string;
  title: string;
  link: string;
  source: string;
  publishedAt: Date;
  stream: string;
  content?: string;
  score: number;
}

export interface StreamConfig {
  key: string;
  display: string;
  style_primary: string;
  style_secondary?: string;
  has_affiliate: boolean;
  keywords: string[];
  sources_rss: string[];
  affiliate_url_env?: string;
}

export class RSSIngestionService {
  private parser: Parser;
  private storage: IStorage;
  private streams: StreamConfig[] = [];
  private cache: Map<string, RSSItem[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();

  constructor(storage: IStorage) {
    this.parser = new Parser({
      timeout: 10000,
      customFields: {
        item: ['description', 'content:encoded', 'summary']
      }
    });
    this.storage = storage;
    this.loadStreamConfigs();
  }

  private loadStreamConfigs(): void {
    try {
      const configPath = path.join(process.cwd(), 'server', 'config', 'streams.yaml');
      const configFile = fs.readFileSync(configPath, 'utf8');
      const config = yaml.load(configFile) as { streams: StreamConfig[] };
      this.streams = config.streams;
      console.log(`Loaded ${this.streams.length} content streams`);
    } catch (error) {
      console.error('Failed to load stream configs:', error);
      this.streams = [];
    }
  }

  async fetchStreamContent(streamKey: string, limit: number = 5): Promise<RSSItem[]> {
    const stream = this.streams.find(s => s.key === streamKey);
    if (!stream) {
      throw new Error(`Stream not found: ${streamKey}`);
    }

    // Check cache first (15 min expiry)
    const cacheKey = `${streamKey}_${limit}`;
    const cached = this.cache.get(cacheKey);
    const expiry = this.cacheExpiry.get(cacheKey) || 0;
    
    if (cached && Date.now() < expiry) {
      console.log(`Using cached content for stream: ${streamKey}`);
      return cached;
    }

    console.log(`Fetching fresh content for stream: ${streamKey}`);
    
    try {
      // Fetch from all RSS sources for this stream
      const allItems: RSSItem[] = [];
      
      for (const url of stream.sources_rss) {
        try {
          console.log(`Fetching RSS: ${url}`);
          const feed = await this.parser.parseURL(url);
          
          for (const entry of feed.items) {
            if (!entry.title || !entry.link) continue;
            
            const item: RSSItem = {
              id: entry.link || entry.guid || `${Date.now()}_${Math.random()}`,
              title: entry.title,
              link: entry.link,
              source: feed.title || new URL(url).hostname,
              publishedAt: entry.pubDate ? new Date(entry.pubDate) : new Date(),
              stream: streamKey,
              content: entry.content || entry.summary || entry.description || '',
              score: 0
            };
            
            allItems.push(item);
          }
        } catch (error) {
          console.error(`Failed to fetch RSS ${url}:`, error);
          continue;
        }
      }

      // De-duplicate by normalized title (last 48h)
      const deduped = this.deduplicateItems(allItems);
      
      // Rank and score items
      const ranked = this.rankItems(deduped, stream.keywords);
      
      // Take top items
      const topItems = ranked.slice(0, limit);

      // Cache results (15 min)
      this.cache.set(cacheKey, topItems);
      this.cacheExpiry.set(cacheKey, Date.now() + 15 * 60 * 1000);

      console.log(`Fetched ${topItems.length} items for stream ${streamKey}`);
      return topItems;

    } catch (error) {
      console.error(`Failed to fetch content for stream ${streamKey}:`, error);
      return [];
    }
  }

  async fetchAllStreams(limit: number = 3): Promise<Map<string, RSSItem[]>> {
    const results = new Map<string, RSSItem[]>();
    
    // Process streams in parallel
    const promises = this.streams.map(async (stream) => {
      try {
        const items = await this.fetchStreamContent(stream.key, limit);
        results.set(stream.key, items);
      } catch (error) {
        console.error(`Failed to fetch stream ${stream.key}:`, error);
        results.set(stream.key, []);
      }
    });

    await Promise.allSettled(promises);
    return results;
  }

  private deduplicateItems(items: RSSItem[]): RSSItem[] {
    const seen = new Set<string>();
    const cutoff = Date.now() - 48 * 60 * 60 * 1000; // 48 hours ago
    
    return items.filter(item => {
      // Skip old items
      if (item.publishedAt.getTime() < cutoff) return false;
      
      // Create normalized title for deduplication
      const normalized = this.normalizeTitle(item.title);
      const key = `${normalized}_${new URL(item.link).hostname}`;
      
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[「」『』【】（）()]/g, '') // Remove Japanese brackets
      .replace(/[！？!?。、]/g, '') // Remove punctuation
      .replace(/\s+/g, '') // Remove whitespace
      .trim();
  }

  private rankItems(items: RSSItem[], keywords: string[]): RSSItem[] {
    return items.map(item => {
      let score = 0;
      const titleLower = item.title.toLowerCase();
      const contentLower = (item.content || '').toLowerCase();
      
      // Keyword matching (higher weight for title)
      for (const keyword of keywords) {
        if (titleLower.includes(keyword.toLowerCase())) {
          score += 3;
        }
        if (contentLower.includes(keyword.toLowerCase())) {
          score += 1;
        }
      }
      
      // Recency boost (newer = higher score)
      const ageHours = (Date.now() - item.publishedAt.getTime()) / (1000 * 60 * 60);
      if (ageHours < 6) score += 2;
      else if (ageHours < 24) score += 1;
      
      // Engagement indicators (simplified)
      const hasNumbers = /\d+/.test(item.title);
      const hasPercentage = /%|％|割引|セール/.test(item.title);
      const hasUrgency = /限定|今だけ|緊急|速報/.test(item.title);
      
      if (hasNumbers) score += 1;
      if (hasPercentage) score += 2;
      if (hasUrgency) score += 1;
      
      item.score = score;
      return item;
    }).sort((a, b) => b.score - a.score);
  }

  getStreamConfig(streamKey: string): StreamConfig | undefined {
    return this.streams.find(s => s.key === streamKey);
  }

  getAllStreamConfigs(): StreamConfig[] {
    return [...this.streams];
  }

  async logIngestionMetrics(): Promise<void> {
    const totalStreams = this.streams.length;
    const activeStreams = Array.from(this.cache.keys()).length;
    const totalCachedItems = Array.from(this.cache.values()).reduce((sum, items) => sum + items.length, 0);
    
    await this.storage.createAutomationLog({
      type: 'rss_ingestion',
      message: `RSS ingestion metrics: ${activeStreams}/${totalStreams} streams active, ${totalCachedItems} items cached`,
      status: 'success',
      metadata: {
        totalStreams,
        activeStreams,
        totalCachedItems,
        cacheEntries: this.cache.size
      }
    });
  }

  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
    console.log('RSS cache cleared');
  }
}