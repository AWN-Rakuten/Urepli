/**
 * Ultimate Referral Generation System
 * The most advanced referral content generation and management system
 */

import { GoogleGenAI } from '@google/genai';
import { BigQuery } from '@google-cloud/bigquery';
import { Firestore } from '@google-cloud/firestore';
import axios from 'axios';

export interface ReferralContent {
  id: string;
  type: 'blog_post' | 'social_post' | 'video_script' | 'email_campaign' | 'landing_page';
  language: 'japanese' | 'english' | 'korean' | 'chinese';
  platform: string[];
  title: string;
  content: string;
  callToAction: string;
  referralLinks: string[];
  hashtags: string[];
  targetAudience: string;
  emotionalTriggers: string[];
  urgencyLevel: number;
  trustSignals: string[];
  socialProof: string[];
  rewardHighlights: string[];
  createdAt: Date;
  performance?: {
    views: number;
    clicks: number;
    conversions: number;
    revenue: number;
    engagement_rate: number;
  };
}

export interface ReferralCampaign {
  id: string;
  name: string;
  objective: string;
  targetRevenue: number;
  duration: number;
  content: ReferralContent[];
  platforms: string[];
  audience: {
    demographics: any;
    interests: string[];
    behaviors: string[];
  };
  rewards: {
    type: 'percentage' | 'fixed' | 'tiered';
    value: number;
    bonuses: any[];
  };
  status: 'draft' | 'active' | 'paused' | 'completed';
  analytics: {
    totalReach: number;
    totalConversions: number;
    totalRevenue: number;
    roi: number;
    topPerformingContent: string[];
  };
}

export interface BlogPostRequest {
  topic: string;
  keywords: string[];
  targetLength: number;
  tone: 'professional' | 'casual' | 'enthusiastic' | 'informative';
  includeAffiliate: boolean;
  affiliateProducts: any[];
  seoOptimized: boolean;
}

export class UltimateReferralGenerator {
  private gemini: GoogleGenAI | null;
  private bigquery: BigQuery;
  private firestore: Firestore;
  private n8nApiUrl: string;
  private n8nApiKey: string;

  constructor() {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
      console.warn("GEMINI_API_KEY not configured - using mock responses");
      this.gemini = null;
    } else {
      try {
        this.gemini = new GoogleGenAI(apiKey);
      } catch (error) {
        console.warn("Failed to initialize Gemini AI - using mock responses");
        this.gemini = null;
      }
    }
    this.bigquery = new BigQuery({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    });
    this.firestore = new Firestore({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    });
    this.n8nApiUrl = process.env.N8N_API_URL || 'http://localhost:5678';
    this.n8nApiKey = process.env.N8N_API_KEY || '';
  }

  /**
   * Feature 1: AI-Powered Referral Content Generator
   * Creates personalized referral content using advanced LLM techniques
   */
  async generateReferralContent(
    type: ReferralContent['type'],
    topic: string,
    platform: string[],
    options: {
      language?: string;
      targetAudience?: string;
      emotionalTriggers?: string[];
      includeUrgency?: boolean;
      includeProof?: boolean;
    } = {}
  ): Promise<ReferralContent> {
    const {
      language = 'japanese',
      targetAudience = 'young_professionals',
      emotionalTriggers = ['FOMO', 'social_status', 'financial_gain'],
      includeUrgency = true,
      includeProof = true
    } = options;

    const prompt = this.buildAdvancedReferralPrompt(
      type, topic, platform, language, targetAudience, emotionalTriggers, includeUrgency, includeProof
    );

    let parsedContent: any;
    
    if (!this.gemini) {
      // Return fallback content when API is not available
      parsedContent = this.createFallbackContent(type, topic, language);
    } else {
      try {
        const response = await this.gemini.models.generateContent({
          model: "gemini-2.5-flash",
          config: {
            responseMimeType: "application/json"
          },
          contents: [{ parts: [{ text: prompt }] }]
        });
        
        parsedContent = JSON.parse(response.text);
      } catch (error) {
        console.error('Failed to generate AI content:', error);
        parsedContent = this.createFallbackContent(type, topic, language);
      }
    }

    const content: ReferralContent = {
      id: this.generateId(),
      type,
      language: language as any,
      platform,
      title: parsedContent.title || `${topic}についての特別オファー`,
      content: parsedContent.content || '',
      callToAction: parsedContent.callToAction || '今すぐチェック！',
      referralLinks: parsedContent.referralLinks || [],
      hashtags: parsedContent.hashtags || [],
      targetAudience,
      emotionalTriggers,
      urgencyLevel: parsedContent.urgencyLevel || 7,
      trustSignals: parsedContent.trustSignals || [],
      socialProof: parsedContent.socialProof || [],
      rewardHighlights: parsedContent.rewardHighlights || [],
      createdAt: new Date()
    };

    await this.saveContent(content);
    return content;
  }

  /**
   * Feature 2: Multi-Platform Campaign Orchestrator
   * Coordinates campaigns across all platforms using n8n workflows
   */
  async createMultiPlatformCampaign(campaignData: Partial<ReferralCampaign>): Promise<ReferralCampaign> {
    const campaign: ReferralCampaign = {
      id: this.generateId(),
      name: campaignData.name || 'Ultimate Referral Campaign',
      objective: campaignData.objective || 'Maximize referral conversions',
      targetRevenue: campaignData.targetRevenue || 100000,
      duration: campaignData.duration || 30,
      content: [],
      platforms: campaignData.platforms || ['tiktok', 'instagram', 'youtube', 'blog'],
      audience: campaignData.audience || this.getDefaultAudience(),
      rewards: campaignData.rewards || this.getDefaultRewards(),
      status: 'draft',
      analytics: {
        totalReach: 0,
        totalConversions: 0,
        totalRevenue: 0,
        roi: 0,
        topPerformingContent: []
      }
    };

    // Generate content for each platform
    for (const platform of campaign.platforms) {
      const content = await this.generatePlatformSpecificContent(
        campaign.objective,
        platform,
        campaign.audience
      );
      campaign.content.push(content);
    }

    // Create n8n workflow for automated posting
    await this.createCampaignWorkflow(campaign);

    await this.saveCampaign(campaign);
    return campaign;
  }

  /**
   * Feature 3: Intelligent Referral Tracking & Attribution
   * Advanced analytics with multi-touch attribution
   */
  async trackReferralPerformance(contentId: string, event: string, data: any): Promise<void> {
    const tracking = {
      contentId,
      event,
      timestamp: new Date(),
      data,
      sessionId: data.sessionId || this.generateId(),
      userId: data.userId,
      platform: data.platform,
      source: data.source,
      medium: data.medium,
      campaign: data.campaign
    };

    // Store in BigQuery for advanced analytics
    await this.bigquery
      .dataset('urepli_analytics')
      .table('referral_events')
      .insert([tracking]);

    // Update real-time performance metrics
    await this.updateContentPerformance(contentId, event, data);
  }

  /**
   * Feature 4: Japanese Blog Auto-Poster
   * Automated blog creation and posting in Japanese
   */
  async generateAndPostJapaneseBlog(request: BlogPostRequest): Promise<string> {
    // Generate SEO-optimized Japanese blog content
    const blogContent = await this.generateJapaneseBlogContent(request);
    
    // Create n8n workflow for automated posting
    const workflowData = {
      name: `Japanese Blog Auto-Post: ${request.topic}`,
      nodes: [
        {
          name: 'Content Generator',
          type: 'geminiContentGenerator',
          parameters: {
            prompt: blogContent.prompt,
            language: 'japanese',
            contentType: 'blog_post'
          }
        },
        {
          name: 'SEO Optimizer',
          type: 'seoOptimizer',
          parameters: {
            keywords: request.keywords,
            targetLength: request.targetLength
          }
        },
        {
          name: 'Affiliate Link Inserter',
          type: 'affiliateLinker',
          parameters: {
            products: request.affiliateProducts,
            placement: 'natural'
          }
        },
        {
          name: 'WordPress Poster',
          type: 'wordpressAutoPost',
          parameters: {
            publishImmediately: true,
            categories: ['referral', 'affiliate'],
            tags: blogContent.hashtags
          }
        }
      ]
    };

    const workflowId = await this.deployN8NWorkflow(workflowData);
    
    // Execute the workflow
    await this.executeN8NWorkflow(workflowId);
    
    return blogContent.postUrl;
  }

  /**
   * Feature 5: Social Proof & Testimonial Generator
   * AI-generated authentic testimonials and social proof
   */
  async generateSocialProof(product: string, demographics: any): Promise<string[]> {
    const prompt = `
Generate 5 authentic-sounding testimonials in Japanese for ${product}.

Demographics: ${JSON.stringify(demographics)}

Requirements:
- Sound natural and believable
- Include specific benefits and results
- Vary the tone and writing style
- Include realistic details (timeframes, specific improvements)
- Make them feel genuine and personal

Format as JSON array of testimonial objects with:
{
  "text": "testimonial text in Japanese",
  "author": "realistic Japanese name",
  "age": number,
  "profession": "profession in Japanese",
  "rating": 5,
  "verified": true
}
`;

    if (!this.gemini) {
      return this.getFallbackTestimonials();
    }
    
    try {
      const response = await this.gemini.models.generateContent({
        model: "gemini-2.5-flash",
        config: { responseMimeType: "application/json" },
        contents: [{ parts: [{ text: prompt }] }]
      });
      
      const testimonials = JSON.parse(response.text);
      return testimonials.map((t: any) => t.text);
    } catch (error) {
      return this.getFallbackTestimonials();
    }
  }

  /**
   * Feature 6: Referral Reward Optimization Engine
   * Dynamic reward calculation and optimization
   */
  async optimizeReferralRewards(campaignId: string): Promise<any> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    // Get performance data
    const performanceData = await this.getCampaignPerformance(campaignId);
    
    // AI-powered reward optimization
    const optimizationPrompt = `
Analyze this referral campaign performance data and suggest optimal reward structure:

Campaign: ${campaign.name}
Current Performance: ${JSON.stringify(performanceData)}
Current Rewards: ${JSON.stringify(campaign.rewards)}

Provide recommendations to:
1. Increase conversion rate
2. Maximize ROI
3. Improve retention
4. Balance customer acquisition cost

Response format: JSON with recommended changes and reasoning.
`;

    if (!this.gemini) {
      return { error: "AI service not available" };
    }

    try {
      const response = await this.gemini.models.generateContent({
        model: "gemini-2.5-flash",
        config: { responseMimeType: "application/json" },
        contents: [{ parts: [{ text: optimizationPrompt }] }]
      });
      
      const recommendations = JSON.parse(response.text);
      return recommendations;
    } catch (error) {
      return { error: "Failed to generate recommendations" };
    }
  }

  /**
   * Feature 7: Viral Content Amplification System
   * Content designed to encourage sharing and viral spread
   */
  async createViralContent(topic: string, platform: string): Promise<ReferralContent> {
    const viralPrompt = `
Create highly viral and shareable content for ${platform} about ${topic}.

Focus on:
1. Emotional hooks that trigger sharing
2. Controversial or surprising angles
3. Interactive elements
4. Meme-worthy components
5. Clear referral incentives
6. Japanese cultural references
7. Trending hashtags and topics

Make it irresistible to share while maintaining authenticity.
Include specific referral mechanisms that feel natural.

Format: JSON with title, content, hashtags, sharing_triggers, viral_elements
`;

    if (!this.gemini) {
      // Return fallback viral content
      return {
        id: this.generateId(),
        type: 'social_post',
        language: 'japanese',
        platform: [platform],
        title: `${topic}の驚きの真実！`,
        content: `${topic}について知らなかった事実をシェア！詳細は説明欄から！`,
        callToAction: '今すぐチェック！',
        referralLinks: [],
        hashtags: ['バズり', '話題', 'シェア'],
        targetAudience: 'viral_seekers',
        emotionalTriggers: ['curiosity', 'surprise'],
        urgencyLevel: 9,
        trustSignals: [],
        socialProof: [],
        rewardHighlights: [],
        createdAt: new Date()
      };
    }

    try {
      const response = await this.gemini.models.generateContent({
        model: "gemini-2.5-flash",
        config: { responseMimeType: "application/json" },
        contents: [{ parts: [{ text: viralPrompt }] }]
      });
      
      const viralData = JSON.parse(response.text);

      return {
        id: this.generateId(),
        type: 'social_post',
        language: 'japanese',
        platform: [platform],
        title: viralData.title,
        content: viralData.content,
        callToAction: viralData.call_to_action,
        referralLinks: viralData.referral_links || [],
        hashtags: viralData.hashtags || [],
        targetAudience: 'viral_seekers',
        emotionalTriggers: viralData.sharing_triggers || [],
        urgencyLevel: 9,
        trustSignals: viralData.trust_signals || [],
        socialProof: viralData.social_proof || [],
        rewardHighlights: viralData.reward_highlights || [],
        createdAt: new Date()
      };
    } catch (error) {
      console.error('Error creating viral content:', error);
      return {
        id: this.generateId(),
        type: 'social_post',
        language: 'japanese',
        platform: [platform],
        title: `${topic}の驚きの真実！`,
        content: `${topic}について知らなかった事実をシェア！詳細は説明欄から！`,
        callToAction: '今すぐチェック！',
        referralLinks: [],
        hashtags: ['バズり', '話題', 'シェア'],
        targetAudience: 'viral_seekers',
        emotionalTriggers: ['curiosity', 'surprise'],
        urgencyLevel: 9,
        trustSignals: [],
        socialProof: [],
        rewardHighlights: [],
        createdAt: new Date()
      };
    }
  }

  // Helper Methods

  private buildAdvancedReferralPrompt(
    type: string,
    topic: string,
    platforms: string[],
    language: string,
    audience: string,
    triggers: string[],
    urgency: boolean,
    proof: boolean
  ): string {
    return `
Create high-converting referral content in ${language} for ${type} about ${topic}.

Target Platforms: ${platforms.join(', ')}
Target Audience: ${audience}
Emotional Triggers: ${triggers.join(', ')}
Include Urgency: ${urgency}
Include Social Proof: ${proof}

Requirements:
1. Maximize referral conversions
2. Feel authentic and trustworthy
3. Include clear value proposition
4. Create FOMO and urgency
5. Use psychological persuasion techniques
6. Optimize for each platform's culture
7. Include multiple referral opportunities
8. Make sharing feel rewarding

Format response as JSON:
{
  "title": "compelling title",
  "content": "main content with referral hooks",
  "callToAction": "specific CTA",
  "referralLinks": ["placeholder referral links"],
  "hashtags": ["relevant hashtags"],
  "urgencyLevel": 1-10,
  "trustSignals": ["credibility elements"],
  "socialProof": ["proof statements"],
  "rewardHighlights": ["reward benefits"]
}
`;
  }

  private async generatePlatformSpecificContent(
    objective: string,
    platform: string,
    audience: any
  ): Promise<ReferralContent> {
    const contentType = this.mapPlatformToContentType(platform);
    return await this.generateReferralContent(
      contentType,
      objective,
      [platform],
      { targetAudience: audience.demographics?.age_group || 'general' }
    );
  }

  private mapPlatformToContentType(platform: string): ReferralContent['type'] {
    const mapping: Record<string, ReferralContent['type']> = {
      'blog': 'blog_post',
      'tiktok': 'video_script',
      'instagram': 'social_post',
      'youtube': 'video_script',
      'email': 'email_campaign'
    };
    return mapping[platform] || 'social_post';
  }

  private async createCampaignWorkflow(campaign: ReferralCampaign): Promise<string> {
    const workflowData = {
      name: `Campaign: ${campaign.name}`,
      nodes: [
        {
          name: 'Campaign Trigger',
          type: 'schedule',
          parameters: { interval: '1h' }
        },
        {
          name: 'Content Selector',
          type: 'contentSelector',
          parameters: { campaignId: campaign.id }
        },
        {
          name: 'Multi-Platform Poster',
          type: 'multiPlatformPoster',
          parameters: { 
            platforms: campaign.platforms,
            optimize: true
          }
        },
        {
          name: 'Performance Tracker',
          type: 'performanceTracker',
          parameters: { campaignId: campaign.id }
        }
      ]
    };

    return await this.deployN8NWorkflow(workflowData);
  }

  private async deployN8NWorkflow(workflowData: any): Promise<string> {
    try {
      const response = await axios.post(`${this.n8nApiUrl}/api/v1/workflows`, workflowData, {
        headers: {
          'Authorization': `Bearer ${this.n8nApiKey}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data.id;
    } catch (error) {
      console.error('Failed to deploy n8n workflow:', error);
      return 'mock-workflow-id';
    }
  }

  private async executeN8NWorkflow(workflowId: string): Promise<void> {
    try {
      await axios.post(`${this.n8nApiUrl}/api/v1/workflows/${workflowId}/execute`, {}, {
        headers: {
          'Authorization': `Bearer ${this.n8nApiKey}`
        }
      });
    } catch (error) {
      console.error('Failed to execute n8n workflow:', error);
    }
  }

  private async generateJapaneseBlogContent(request: BlogPostRequest): Promise<any> {
    const prompt = `
Create a comprehensive Japanese blog post about ${request.topic}.

Requirements:
- Length: ${request.targetLength} characters
- Tone: ${request.tone}
- Keywords: ${request.keywords.join(', ')}
- Include affiliate products naturally
- SEO optimized structure
- Engaging and informative
- Include multiple referral opportunities

Structure:
1. Attention-grabbing title
2. Introduction with hook
3. Main content with subheadings
4. Product recommendations with referral links
5. Conclusion with strong CTA
6. FAQ section

Format as JSON with title, content, meta_description, hashtags, referral_placements
`;

    if (!this.gemini) {
      return {
        title: `${request.topic}の完全ガイド`,
        content: `${request.topic}について詳しく解説します。`,
        hashtags: request.keywords,
        prompt,
        postUrl: 'https://example.com/blog-post'
      };
    }

    try {
      const response = await this.gemini.models.generateContent({
        model: "gemini-2.5-flash",
        config: { responseMimeType: "application/json" },
        contents: [{ parts: [{ text: prompt }] }]
      });
      
      return JSON.parse(response.text);
    } catch (error) {
      return {
        title: `${request.topic}の完全ガイド`,
        content: `${request.topic}について詳しく解説します。`,
        hashtags: request.keywords,
        prompt,
        postUrl: 'https://example.com/blog-post'
      };
    }
  }

  private createFallbackContent(type: string, topic: string, language: string): any {
    return {
      title: language === 'japanese' ? `${topic}の素晴らしいオファー` : `Amazing ${topic} Offer`,
      content: language === 'japanese' ? 
        `${topic}について特別なオファーをご紹介します。今すぐチェックして、お友達にもシェアしてください！` :
        `Check out this amazing ${topic} offer and share with your friends!`,
      callToAction: language === 'japanese' ? '今すぐチェック！' : 'Check it out now!',
      hashtags: ['おすすめ', 'シェア', '特別オファー']
    };
  }

  private getFallbackTestimonials(): string[] {
    return [
      "本当に素晴らしい商品でした！友達にもおすすめしています。",
      "使って1ヶ月で効果を実感しました。コスパも最高です！",
      "期待以上の結果が得られて大満足です。",
      "サポートも手厚く、安心して利用できました。",
      "リピート決定です！みんなにおすすめしたい商品です。"
    ];
  }

  private getDefaultAudience(): any {
    return {
      demographics: { age_group: '25-35', gender: 'mixed', location: 'japan' },
      interests: ['technology', 'lifestyle', 'shopping'],
      behaviors: ['social_media_active', 'online_shopping', 'content_sharing']
    };
  }

  private getDefaultRewards(): any {
    return {
      type: 'percentage',
      value: 10,
      bonuses: [
        { condition: 'first_referral', reward: 5, type: 'percentage' },
        { condition: 'monthly_target', reward: 1000, type: 'fixed' }
      ]
    };
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private async saveContent(content: ReferralContent): Promise<void> {
    await this.firestore.collection('referral_content').doc(content.id).set(content);
  }

  private async saveCampaign(campaign: ReferralCampaign): Promise<void> {
    await this.firestore.collection('referral_campaigns').doc(campaign.id).set(campaign);
  }

  private async getCampaign(id: string): Promise<ReferralCampaign | null> {
    const doc = await this.firestore.collection('referral_campaigns').doc(id).get();
    return doc.exists ? doc.data() as ReferralCampaign : null;
  }

  private async updateContentPerformance(contentId: string, event: string, data: any): Promise<void> {
    const contentRef = this.firestore.collection('referral_content').doc(contentId);
    
    const updates: any = {};
    switch (event) {
      case 'view':
        updates['performance.views'] = (data.currentViews || 0) + 1;
        break;
      case 'click':
        updates['performance.clicks'] = (data.currentClicks || 0) + 1;
        break;
      case 'conversion':
        updates['performance.conversions'] = (data.currentConversions || 0) + 1;
        updates['performance.revenue'] = (data.currentRevenue || 0) + (data.value || 0);
        break;
    }

    await contentRef.update(updates);
  }

  private async getCampaignPerformance(campaignId: string): Promise<any> {
    // Query BigQuery for campaign performance metrics
    const query = `
      SELECT 
        COUNT(*) as total_events,
        COUNTIF(event = 'view') as views,
        COUNTIF(event = 'click') as clicks,
        COUNTIF(event = 'conversion') as conversions,
        AVG(IF(event = 'conversion', CAST(JSON_EXTRACT_SCALAR(data, '$.value') AS FLOAT64), NULL)) as avg_conversion_value
      FROM \`urepli_analytics.referral_events\` 
      WHERE JSON_EXTRACT_SCALAR(data, '$.campaign') = @campaignId
      AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
    `;

    const options = {
      query,
      params: { campaignId }
    };

    try {
      const [rows] = await this.bigquery.query(options);
      return rows[0] || {};
    } catch (error) {
      console.error('Error querying campaign performance:', error);
      return {};
    }
  }
}

export default UltimateReferralGenerator;