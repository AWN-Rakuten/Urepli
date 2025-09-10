import { ComfyUIService } from './comfyui-integration';
import { BotasaurusService } from './botasaurus-integration';
import { A8NetService } from './a8net-integration';
import { RakutenAffiliateService } from './rakuten-affiliate';
import { MultiPlatformAdManager } from './multi-platform-ad-manager';
import { GeminiService } from './gemini';

export interface AutomationTask {
  id: string;
  type: 'content_generation' | 'social_posting' | 'ad_campaign' | 'affiliate_optimization';
  config: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  results?: any;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface OneClickConfig {
  contentTheme: string;
  targetAudience: string;
  platforms: string[];
  budgetPerPlatform: number;
  targetROAS: number;
  japaneseMarketFocus: boolean;
  affiliateCategories: string[];
  postingSchedule: {
    frequency: 'hourly' | 'daily' | 'weekly';
    times: string[];
  };
  videoProcessing: {
    useComfyUI: boolean;
    copyrightSafeTransformation: boolean;
    style: 'professional' | 'casual' | 'kawaii' | 'tech';
  };
}

export class AutomationOrchestrator {
  private activeTasks: Map<string, AutomationTask> = new Map();
  private services: {
    comfyUI?: ComfyUIService;
    botasaurus?: BotasaurusService;
    a8net?: A8NetService;
    rakuten?: RakutenAffiliateService;
    adManager?: MultiPlatformAdManager;
    gemini?: GeminiService;
  } = {};

  constructor() {
    this.initializeServices();
  }

  private async initializeServices() {
    try {
      // Initialize services based on available environment variables
      if (process.env.COMFYUI_URL) {
        this.services.comfyUI = new ComfyUIService(process.env.COMFYUI_URL);
      }

      if (process.env.PYTHON_ENV_PATH) {
        this.services.botasaurus = new BotasaurusService(process.env.PYTHON_ENV_PATH);
      }

      if (process.env.A8NET_API_KEY && process.env.A8NET_SECRET_KEY && process.env.A8NET_AFFILIATE_ID) {
        this.services.a8net = new A8NetService(
          process.env.A8NET_API_KEY,
          process.env.A8NET_SECRET_KEY,
          process.env.A8NET_AFFILIATE_ID
        );
      }

      if (process.env.RAKUTEN_APPLICATION_ID && process.env.RAKUTEN_AFFILIATE_ID) {
        this.services.rakuten = new RakutenAffiliateService(
          process.env.RAKUTEN_APPLICATION_ID,
          process.env.RAKUTEN_AFFILIATE_ID
        );
      }

      if (process.env.GOOGLE_GEMINI_API_KEY) {
        this.services.gemini = new GeminiService();
      }
    } catch (error) {
      console.error('Failed to initialize automation services:', error);
    }
  }

  async executeOneClickAutomation(config: OneClickConfig): Promise<{
    taskId: string;
    status: string;
    estimatedCompletionTime: number;
  }> {
    const taskId = `automation-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    const task: AutomationTask = {
      id: taskId,
      type: 'content_generation',
      config,
      status: 'pending',
      createdAt: new Date()
    };

    this.activeTasks.set(taskId, task);

    // Start automation in background
    this.runAutomationPipeline(task).catch(error => {
      console.error(`Automation task ${taskId} failed:`, error);
      task.status = 'failed';
      task.error = error.message;
    });

    return {
      taskId,
      status: 'pending',
      estimatedCompletionTime: this.estimateCompletionTime(config)
    };
  }

  private async runAutomationPipeline(task: AutomationTask): Promise<void> {
    const config = task.config as OneClickConfig;
    task.status = 'running';

    const results = {
      contentGenerated: 0,
      postsPublished: 0,
      campaignsCreated: 0,
      affiliateLinksGenerated: 0,
      estimatedRevenue: 0,
      errors: [] as string[]
    };

    try {
      // Phase 1: Generate content ideas
      const contentIdeas = await this.generateContentIdeas(config);
      
      // Phase 2: Get affiliate products
      const affiliateProducts = await this.getOptimalAffiliateProducts(config);
      
      // Phase 3: Process each content idea
      for (const idea of contentIdeas.slice(0, 5)) { // Limit for demo
        try {
          // Generate video content
          const videoContent = await this.generateVideoContent(idea, affiliateProducts[0], config);
          results.contentGenerated++;

          // Generate affiliate links
          const affiliateLinks = await this.generateAffiliateLinks(affiliateProducts.slice(0, 3));
          results.affiliateLinksGenerated += affiliateLinks.length;

          // Post to social media (if services available)
          if (this.services.botasaurus) {
            const postResults = await this.publishContent(videoContent, config);
            results.postsPublished += postResults.filter(r => r.success).length;
          }

          // Create ad campaigns (if budget allocated)
          if (config.budgetPerPlatform > 0 && this.services.adManager) {
            const campaigns = await this.createAdvertisingCampaigns(videoContent, config);
            results.campaignsCreated += campaigns.length;
          }

        } catch (error) {
          results.errors.push(`Content processing failed: ${error.message}`);
        }
      }

      // Calculate estimated revenue
      results.estimatedRevenue = this.calculateEstimatedRevenue(results, config);

      task.status = 'completed';
      task.results = results;
      task.completedAt = new Date();

    } catch (error) {
      task.status = 'failed';
      task.error = error.message;
      task.results = results;
    }
  }

  private async generateContentIdeas(config: OneClickConfig): Promise<Array<{
    title: string;
    description: string;
    hashtags: string[];
    keywords: string[];
  }>> {
    // Use Gemini AI to generate content ideas if available
    if (this.services.gemini) {
      const prompt = `Generate 5 engaging video content ideas for "${config.contentTheme}" targeting "${config.targetAudience}" in the Japanese market. Each idea should be suitable for affiliate marketing and include relevant hashtags.`;
      
      try {
        const response = await this.services.gemini.generateContent(prompt);
        // Parse AI response into structured format
        return this.parseContentIdeas(response);
      } catch (error) {
        console.error('Failed to generate AI content ideas:', error);
      }
    }

    // Fallback to predefined content ideas
    return this.getDefaultContentIdeas(config);
  }

  private parseContentIdeas(aiResponse: string): Array<{
    title: string;
    description: string;
    hashtags: string[];
    keywords: string[];
  }> {
    // Simple parsing - in production, this would be more sophisticated
    const ideas = [];
    const lines = aiResponse.split('\n').filter(line => line.trim());
    
    for (let i = 0; i < lines.length; i += 3) {
      if (lines[i] && lines[i + 1]) {
        ideas.push({
          title: lines[i].replace(/^\d+\.\s*/, ''),
          description: lines[i + 1] || '',
          hashtags: ['おすすめ', 'PR', '広告'],
          keywords: ['おすすめ', '比較', 'レビュー']
        });
      }
    }

    return ideas.slice(0, 5);
  }

  private getDefaultContentIdeas(config: OneClickConfig): Array<{
    title: string;
    description: string;
    hashtags: string[];
    keywords: string[];
  }> {
    const themes: Record<string, any[]> = {
      mobile: [
        {
          title: "2024年最新スマホ比較！コスパ最強はどれ？",
          description: "最新スマートフォンを価格・性能で徹底比較",
          hashtags: ["スマホ", "比較", "おすすめ", "コスパ"],
          keywords: ["スマートフォン", "比較", "おすすめ"]
        }
      ],
      finance: [
        {
          title: "クレジットカード特典で年間10万円得する方法",
          description: "賢いクレジットカード活用術",
          hashtags: ["クレジットカード", "特典", "お得", "節約"],
          keywords: ["クレジットカード", "特典", "ポイント"]
        }
      ],
      tech: [
        {
          title: "最新ガジェット！買う前に知っておきたいポイント",
          description: "話題のガジェットを実際に使ってレビュー",
          hashtags: ["ガジェット", "レビュー", "最新", "テック"],
          keywords: ["ガジェット", "レビュー", "最新技術"]
        }
      ]
    };

    return themes[config.contentTheme] || themes.tech;
  }

  private async getOptimalAffiliateProducts(config: OneClickConfig): Promise<any[]> {
    const products = [];

    // Get A8.net products
    if (this.services.a8net) {
      try {
        const a8Products = await this.services.a8net.getHighROIProducts(config.affiliateCategories[0]);
        products.push(...a8Products.slice(0, 3));
      } catch (error) {
        console.error('Failed to fetch A8.net products:', error);
      }
    }

    // Get Rakuten products
    if (this.services.rakuten) {
      try {
        const rakutenProducts = await this.services.rakuten.getVideoFriendlyProducts(config.affiliateCategories[0] || 'electronics');
        products.push(...rakutenProducts.slice(0, 3));
      } catch (error) {
        console.error('Failed to fetch Rakuten products:', error);
      }
    }

    // Fallback products if no affiliate services available
    if (products.length === 0) {
      products.push({
        id: 'demo-product-1',
        name: 'おすすめスマートフォン',
        commission: 3000,
        affiliateUrl: 'https://example.com/affiliate',
        imageUrl: 'https://example.com/image.jpg'
      });
    }

    return products;
  }

  private async generateVideoContent(idea: any, affiliateProduct: any, config: OneClickConfig): Promise<{
    videoPath?: string;
    script: string;
    caption: string;
    thumbnailUrl?: string;
  }> {
    // Generate script using AI
    let script = `${idea.title}\n\n${idea.description}`;
    
    if (this.services.gemini) {
      try {
        const scriptPrompt = `Create a 30-second video script in Japanese for: "${idea.title}". Include mention of the product: "${affiliateProduct.name}". Make it engaging for social media.`;
        script = await this.services.gemini.generateContent(scriptPrompt);
      } catch (error) {
        console.error('Failed to generate AI script:', error);
      }
    }

    // Generate video using ComfyUI if available
    let videoPath: string | undefined;
    let thumbnailUrl: string | undefined;

    if (this.services.comfyUI && config.videoProcessing.useComfyUI) {
      try {
        const workflow = this.services.comfyUI.createJapaneseContentWorkflow(
          script,
          'https://example.com/background-video.mp4' // Would use actual background video
        );
        
        const promptId = await this.services.comfyUI.queueWorkflow(workflow);
        
        // Poll for completion (simplified)
        let attempts = 0;
        while (attempts < 30) { // 5 minutes max
          const progress = await this.services.comfyUI.getWorkflowProgress(promptId);
          if (progress.status === 'completed' && progress.outputUrls) {
            videoPath = progress.outputUrls[0];
            break;
          } else if (progress.status === 'failed') {
            break;
          }
          
          await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
          attempts++;
        }
      } catch (error) {
        console.error('Failed to generate video with ComfyUI:', error);
      }
    }

    const caption = this.generateSocialMediaCaption(idea, affiliateProduct);

    return {
      videoPath,
      script,
      caption,
      thumbnailUrl
    };
  }

  private async generateAffiliateLinks(products: any[]): Promise<string[]> {
    const links = [];

    for (const product of products) {
      if (this.services.a8net && product.id.startsWith('a8-')) {
        try {
          const link = await this.services.a8net.generateAffiliateLink(product.id);
          links.push(link);
        } catch (error) {
          console.error('Failed to generate A8.net affiliate link:', error);
        }
      } else if (product.affiliateUrl) {
        links.push(product.affiliateUrl);
      }
    }

    return links;
  }

  private async publishContent(content: any, config: OneClickConfig): Promise<Array<{
    platform: string;
    success: boolean;
    postUrl?: string;
  }>> {
    if (!this.services.botasaurus) {
      return [];
    }

    const accounts = config.platforms.map(platform => ({
      platform,
      username: `auto_${platform}_account_1` // Would come from account management
    }));

    try {
      return await this.services.botasaurus.postToMultiplePlatforms(
        content.videoPath || '/tmp/demo-video.mp4',
        content.caption,
        accounts
      );
    } catch (error) {
      console.error('Failed to publish content:', error);
      return [];
    }
  }

  private async createAdvertisingCampaigns(content: any, config: OneClickConfig): Promise<string[]> {
    if (!this.services.adManager) {
      return [];
    }

    const campaigns = [];
    
    for (const platform of config.platforms.filter(p => ['facebook', 'google', 'tiktok'].includes(p))) {
      try {
        const campaign = await this.services.adManager.createOptimizedCampaign({
          platform: platform as any,
          budget: config.budgetPerPlatform,
          targetROAS: config.targetROAS,
          audience: {
            age: [18, 65],
            gender: 'all',
            interests: ['technology', 'shopping'],
            location: ['JP']
          },
          creative: {
            videoUrl: content.videoPath || '/tmp/demo-video.mp4',
            thumbnailUrl: content.thumbnailUrl || '/tmp/demo-thumb.jpg',
            headline: content.caption.split('\n')[0],
            description: content.caption,
            callToAction: 'learn_more'
          }
        });
        
        campaigns.push(campaign.campaignId);
      } catch (error) {
        console.error(`Failed to create ${platform} campaign:`, error);
      }
    }
    
    return campaigns;
  }

  private generateSocialMediaCaption(idea: any, affiliateProduct: any): string {
    return `${idea.title}

${idea.description}

🔗 詳細情報とお得なリンクはプロフィールから

${idea.hashtags.map((tag: string) => `#${tag}`).join(' ')}

#PR #広告 #アフィリエイト`;
  }

  private calculateEstimatedRevenue(results: any, config: OneClickConfig): number {
    const avgRevenuePerPost = 5000; // ¥5,000 average
    const avgRevenuePerCampaign = 15000; // ¥15,000 average
    const avgCommissionPerAffiliate = 2000; // ¥2,000 average

    return (
      results.postsPublished * avgRevenuePerPost +
      results.campaignsCreated * avgRevenuePerCampaign +
      results.affiliateLinksGenerated * avgCommissionPerAffiliate
    );
  }

  private estimateCompletionTime(config: OneClickConfig): number {
    // Estimate in minutes
    let timeEstimate = 10; // Base time
    
    timeEstimate += config.platforms.length * 2; // 2 min per platform
    timeEstimate += config.videoProcessing.useComfyUI ? 15 : 5; // Video generation
    timeEstimate += config.budgetPerPlatform > 0 ? 5 : 0; // Ad campaigns
    
    return timeEstimate;
  }

  getTaskStatus(taskId: string): AutomationTask | null {
    return this.activeTasks.get(taskId) || null;
  }

  getAllActiveTasks(): AutomationTask[] {
    return Array.from(this.activeTasks.values());
  }

  cancelTask(taskId: string): boolean {
    const task = this.activeTasks.get(taskId);
    if (task && task.status === 'running') {
      task.status = 'failed';
      task.error = 'Cancelled by user';
      return true;
    }
    return false;
  }
}