import { GeminiService } from './gemini.js';
import { TikTokApiService } from './tiktok-api.js';
import { InstagramApiService } from './instagram-api.js';
import { RSSIngestionService, RSSItem } from './rss-ingestion.js';
import { BanditAlgorithmService } from './bandit.js';
import { IStorage } from '../storage.js';
import * as cron from 'node-cron';

export interface ContentJob {
  streamKey: string;
  item: RSSItem;
  style: string;
  hasAffiliate: boolean;
}

export interface ContentResult {
  success: boolean;
  contentId?: string;
  error?: string;
  platforms?: {
    tiktok?: { id: string; url: string };
    instagram?: { id: string; url: string };
  };
}

export class ContentAutomationService {
  private geminiService: GeminiService;
  private tiktokApi: TikTokApiService;
  private instagramApi: InstagramApiService;
  private rssService: RSSIngestionService;
  private banditService: BanditAlgorithmService;
  private storage: IStorage;
  private isRunning: boolean = false;
  private dailyCap: number = 20; // Reduced for testing
  private dailyCount: number = 0;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.geminiService = new GeminiService();
    this.tiktokApi = new TikTokApiService();
    this.instagramApi = new InstagramApiService();
    this.rssService = new RSSIngestionService(storage);
    this.banditService = new BanditAlgorithmService(storage);
    
    this.initializeScheduler();
  }

  private initializeScheduler(): void {
    // Run every 30 minutes during peak hours
    cron.schedule('*/30 9-21 * * *', async () => {
      if (!this.isRunning && this.dailyCount < this.dailyCap) {
        await this.runContentGeneration();
      }
    });

    // Reset daily counter at midnight JST
    cron.schedule('0 0 * * *', () => {
      this.dailyCount = 0;
      console.log('Daily content counter reset');
    });

    console.log('Content automation scheduler initialized');
  }

  async runContentGeneration(): Promise<void> {
    if (this.isRunning) {
      console.log('Content generation already running, skipping...');
      return;
    }

    this.isRunning = true;
    console.log('Starting RSS-based content generation...');

    try {
      // Get fresh RSS content for all streams
      const streamContent = await this.rssService.fetchAllStreams(1); // One item per stream
      
      // Process each stream
      for (const [streamKey, items] of streamContent.entries()) {
        if (this.dailyCount >= this.dailyCap) break;
        if (items.length === 0) continue;

        const streamConfig = this.rssService.getStreamConfig(streamKey);
        if (!streamConfig) continue;

        // Generate content for the top item
        const selectedItem = items[0];
        
        const result = await this.generateTextContent({
          streamKey,
          item: selectedItem,
          style: streamConfig.style_primary,
          hasAffiliate: streamConfig.has_affiliate
        });

        if (result.success) {
          this.dailyCount++;
          console.log(`Generated text content for ${streamKey}: ${result.contentId}`);
        } else {
          console.error(`Failed to generate content for ${streamKey}:`, result.error);
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

    } catch (error) {
      console.error('Content generation cycle failed:', error);
      
      await this.storage.createAutomationLog({
        type: 'content_generation_cycle',
        message: `RSS content generation failed: ${error}`,
        status: 'error',
        workflowId: null,
        metadata: { error: String(error), dailyCount: this.dailyCount }
      });
    } finally {
      this.isRunning = false;
      console.log(`Content generation completed. Daily count: ${this.dailyCount}/${this.dailyCap}`);
    }
  }

  async generateTextContent(job: ContentJob): Promise<ContentResult> {
    const { streamKey, item, style, hasAffiliate } = job;
    const contentId = `${streamKey}_${Date.now()}`;

    try {
      console.log(`Generating text content for: ${item.title}`);

      // Generate Japanese social media script
      const script = await this.generateScript(item, style, hasAffiliate);
      if (!script) {
        throw new Error('Failed to generate script');
      }

      // Build full text content for social media
      const fullText = `${script.hook}\n\n${script.bullets.join('\n')}\n\n${script.twist}\n\n${script.cta}`;
      
      // Add proper disclosure and hashtags
      const caption = this.buildCaption(script, streamKey, hasAffiliate);

      // Upload to social platforms (text-based posts for now)
      const platforms: any = {};

      // TikTok text post (if supported) or prepare for video later
      try {
        // For now, we'll store the content and mark for video generation later
        console.log(`TikTok content prepared: ${script.hook}`);
        platforms.tiktok = { 
          id: `tiktok_${contentId}`, 
          url: `https://www.tiktok.com/@placeholder/${contentId}`,
          status: 'prepared'
        };
      } catch (error) {
        console.error('TikTok preparation failed:', error);
      }

      // Instagram text post (prepare for reel later)
      try {
        console.log(`Instagram content prepared: ${script.hook}`);
        platforms.instagram = { 
          id: `ig_${contentId}`, 
          url: `https://www.instagram.com/p/${contentId}`,
          status: 'prepared'
        };
      } catch (error) {
        console.error('Instagram preparation failed:', error);
      }

      // Store content record with real data
      await this.storage.createContent({
        title: script.hook,
        platform: 'multi',
        videoUrl: `content_${contentId}`, // Will be updated with real URLs later
        thumbnailUrl: null,
        views: 0,
        likes: 0,
        shares: 0,
        revenue: 0,
        status: 'draft'
      });

      // Log successful generation
      await this.storage.createAutomationLog({
        type: 'content_generated',
        message: `Generated text content for ${streamKey}: ${script.hook}`,
        status: 'success',
        workflowId: null,
        metadata: {
          contentId,
          streamKey,
          itemTitle: item.title,
          source: item.source,
          platforms: Object.keys(platforms),
          hasAffiliate
        }
      });

      return {
        success: true,
        contentId,
        platforms
      };

    } catch (error) {
      console.error(`Text content generation failed for ${contentId}:`, error);
      
      await this.storage.createAutomationLog({
        type: 'content_generation',
        message: `Text content generation failed: ${error}`,
        status: 'error',
        workflowId: null,
        metadata: {
          contentId,
          streamKey,
          itemTitle: item.title,
          error: String(error)
        }
      });

      return {
        success: false,
        error: String(error)
      };
    }
  }

  private async generateScript(item: RSSItem, style: string, hasAffiliate: boolean): Promise<any> {
    try {
      const prompt = `記事タイトル: "${item.title}"
URL: ${item.link}
ストリーム: ${item.stream}
アフィリエイト有無: ${hasAffiliate}

上記に基づき、${style}スタイルで25-35秒のTikTok/Instagram用台本JSONを出力してください。

フォーマット:
{
  "hook": "10文字以内のフック",
  "bullets": ["要点1 (12文字以内)", "要点2 (12文字以内)", "要点3 (12文字以内)"],
  "twist": "注意点やツイスト (12文字以内)",
  "cta": "詳細はプロフィールへ",
  "disclosure": "${hasAffiliate ? '#PR #広告' : ''}",
  "source": "出典: ${new URL(item.link).hostname}"
}

日本語で、俯瞰→具体→注意点の流れで作成してください。`;

      const response = await this.geminiService.generateJapaneseScript({
        topic: item.title,
        targetAudience: '20-40代の日本人',
        platform: 'tiktok',
        duration: 30,
        style: style as any
      });

      // Use the generated script directly or format it properly
      return {
        hook: response.title || item.title.substring(0, 20),
        bullets: [
          response.description.substring(0, 40),
          `出典: ${item.source}`,
          hasAffiliate ? '#PR #広告' : 'チェック推奨'
        ],
        twist: '詳細確認をお忘れなく！',
        cta: '詳細はプロフィールへ',
        disclosure: hasAffiliate ? '#PR #広告' : '',
        source: `出典: ${new URL(item.link).hostname}`
      };

    } catch (error) {
      console.error('Script generation failed:', error);
      return null;
    }
  }

  private buildCaption(script: any, streamKey: string, hasAffiliate: boolean): string {
    const hashtags = this.getStreamHashtags(streamKey);
    let caption = `${script.hook}\n\n${script.bullets.join('\n')}\n\n${script.twist}\n\n${script.cta}`;
    
    if (hasAffiliate) {
      caption += `\n\n${script.disclosure}`;
    }
    
    caption += `\n\n${hashtags.map((tag: string) => `#${tag}`).join(' ')}`;
    caption += `\n\n${script.source}`;
    
    return caption;
  }

  private getStreamHashtags(streamKey: string): string[] {
    const hashtagMap: Record<string, string[]> = {
      mnp: ['スマホ', '乗り換え', 'MNP'],
      credit: ['クレジットカード', 'ポイント', '節約'],
      tech: ['テック', 'ガジェット', '新製品'],
      anime: ['アニメ', 'エンタメ'],
      travel: ['旅行', '観光'],
      fashion: ['ファッション', 'トレンド'],
      food: ['グルメ', '新商品'],
      hacks: ['節約', 'ライフハック'],
      jobs: ['転職', 'キャリア'],
      cute: ['かわいい', '癒し']
    };
    
    return hashtagMap[streamKey] || ['トレンド'];
  }

  async getPerformanceReport(days: number = 7): Promise<any> {
    const content = await this.storage.getContent(50);
    const logs = await this.storage.getAutomationLogs(50);
    
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const recentContent = content.filter(c => c.createdAt && new Date(c.createdAt) > cutoff);
    const recentLogs = logs.filter(l => l.createdAt && new Date(l.createdAt) > cutoff);
    
    const streamStats = this.rssService.getAllStreamConfigs().reduce((acc, stream) => {
      const streamContent = recentContent.filter(c => 
        c.title && c.title.toLowerCase().includes(stream.key.toLowerCase())
      );
      const streamLogs = recentLogs.filter(l => 
        l.metadata && (l.metadata as any).streamKey === stream.key
      );
      
      acc[stream.key] = {
        display: stream.display,
        contentGenerated: streamContent.length,
        totalViews: streamContent.reduce((sum, c) => sum + (c.views || 0), 0),
        totalRevenue: streamContent.reduce((sum, c) => sum + (c.revenue || 0), 0),
        successRate: streamLogs.length > 0 ? 
          streamLogs.filter(l => l.status === 'success').length / streamLogs.length : 0
      };
      
      return acc;
    }, {} as any);

    return {
      period: `${days} days`,
      totalContent: recentContent.length,
      dailyAverage: Math.round((recentContent.length / days) * 10) / 10,
      totalRevenue: recentContent.reduce((sum, c) => sum + (c.revenue || 0), 0),
      streamStats,
      topPerforming: recentContent
        .slice(0, 5)
        .map(c => ({
          title: c.title,
          platform: c.platform,
          views: c.views || 0,
          revenue: c.revenue || 0
        }))
    };
  }

  async updateAnalytics(): Promise<void> {
    console.log('Updating content analytics...');
    
    try {
      const recentContent = await this.storage.getContent(10);
      
      for (const content of recentContent) {
        try {
          // Simulate analytics updates for demo
          const simulatedViews = Math.floor(Math.random() * 1000) + 100;
          const simulatedRevenue = simulatedViews * 0.01;
          
          // In real implementation, this would call actual social media APIs
          await this.storage.createAutomationLog({
            type: 'analytics_update',
            message: `Simulated analytics update for content ${content.id}`,
            status: 'success',
            workflowId: null,
            metadata: {
              contentId: content.id,
              views: simulatedViews,
              revenue: simulatedRevenue
            }
          });
          
        } catch (error) {
          console.error(`Failed to update analytics for content ${content.id}:`, error);
        }
      }

    } catch (error) {
      console.error('Failed to update analytics:', error);
    }
  }
}