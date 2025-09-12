/**
 * Creative Generator Service
 * Multi-AI pipeline for generating viral-style content with JP optimization
 */

import { tiktokTrendsService, TikTokTrend } from './trends.tiktok';
import { Offer } from '../../shared/schema';
import { createGeminiClient } from './mock-gemini';

export interface CreativeInput {
  trend: TikTokTrend;
  offer: Offer;
  eventActive?: {
    code: string; // 'SPU', '5-0-day', 'SUPER_SALE'
    badge: string;
    multiplier?: number;
  };
}

export interface CreativeOutput {
  scripts: CreativeScript[];
  thumbnails: CreativeThumbnail[];
  captions: CreativeCaption[];
  disclosureString: string;
}

export interface CreativeScript {
  id: string;
  hookType: string;
  script: string;
  shotList: string[];
  duration: number; // seconds
  jpText: string; // On-screen Japanese text
}

export interface CreativeThumbnail {
  id: string;
  text: string;
  description: string;
  eventBadge?: string;
  designNotes: string;
}

export interface CreativeCaption {
  id: string;
  text: string;
  hashtags: string[];
  searchableHashtag: string; // Long-tail hashtag
}

/**
 * Japanese market optimized content generator
 */
export class CreativeGeneratorService {
  private genai: GoogleGenAI;
  
  constructor() {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_GEMINI_API_KEY is required');
    }
    this.genai = new GoogleGenAI(apiKey);
  }

  /**
   * Generate 3 viral content variations
   */
  async generateContent(input: CreativeInput): Promise<CreativeOutput> {
    const { trend, offer, eventActive } = input;

    // Generate scripts using different hooks
    const scripts = await this.generateScripts(trend, offer, eventActive);
    
    // Generate thumbnails with event badges when appropriate
    const thumbnails = await this.generateThumbnails(trend, offer, eventActive);
    
    // Generate captions with trending hashtags
    const captions = await this.generateCaptions(trend, offer, scripts);
    
    // Generate compliance disclosure
    const disclosureString = this.generateDisclosure(offer);

    return {
      scripts,
      thumbnails,
      captions,
      disclosureString
    };
  }

  /**
   * Generate 3 script variations with different hooks
   */
  private async generateScripts(trend: TikTokTrend, offer: Offer, eventActive?: any): Promise<CreativeScript[]> {
    const model = this.genai.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const basePrompt = `
あなたは日本のバイラルコンテンツ制作の専門家です。以下の商品とトレンドを使って、3つの異なるフックで15-30秒のTikTok動画スクリプトを作成してください。

商品情報:
- 商品名: ${offer.title}
- 価格: ¥${offer.price_jpy.toLocaleString()}
- ショップ: ${offer.shop_name}

トレンド情報:
- ${trend.type}: ${trend.name}
- スコア: ${trend.score}

${eventActive ? `\n特別イベント: ${eventActive.badge} (${eventActive.code})` : ''}

必須要素:
- Hook (0-2秒): 顔のクローズアップ + 手に商品 + 日本語テキスト
- Open loop (2-5秒): 効果のプレビュー表示 (価格下降/ポイント◯倍)
- Proof (5-15秒): 実際のデモや「使用前後」
- Offer (最後3秒): バッジ + CTA + 開示

3つの異なるフックタイプ:
1. 問題解決フック
2. 驚きフック  
3. お得フック

JSON形式で回答してください:
`;

    try {
      const result = await model.generateContent(basePrompt);
      const response = result.response.text();
      
      // Parse JSON response or create fallback scripts
      let scriptsData;
      try {
        scriptsData = JSON.parse(response);
      } catch {
        scriptsData = this.getFallbackScripts(trend, offer, eventActive);
      }

      return scriptsData.scripts?.map((script: any, index: number) => ({
        id: `script-${Date.now()}-${index}`,
        hookType: script.hookType || ['problem', 'surprise', 'deal'][index],
        script: script.script || script.text || '',
        shotList: script.shotList || this.getDefaultShotList(),
        duration: script.duration || 20,
        jpText: script.jpText || this.generateJPText(offer, eventActive)
      })) || this.getFallbackScripts(trend, offer, eventActive);
    } catch (error) {
      console.error('Script generation failed:', error);
      return this.getFallbackScripts(trend, offer, eventActive);
    }
  }

  /**
   * Generate thumbnails with event badges
   */
  private async generateThumbnails(trend: TikTokTrend, offer: Offer, eventActive?: any): Promise<CreativeThumbnail[]> {
    const model = this.genai.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
日本市場向けのTikTokサムネイル案を2つ作成してください。

商品: ${offer.title}
価格: ¥${offer.price_jpy.toLocaleString()}
トレンド: ${trend.name}

${eventActive ? `イベントバッジ: ${eventActive.badge}` : ''}

要件:
- 目を引く日本語テキスト
- 商品の魅力を表現
- モバイル画面で見やすい
${eventActive ? '- イベントバッジを目立たせる' : ''}

JSON形式で2つのサムネイル案を提案してください。
`;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      let thumbnailsData;
      try {
        thumbnailsData = JSON.parse(response);
      } catch {
        thumbnailsData = this.getFallbackThumbnails(offer, eventActive);
      }

      return thumbnailsData.thumbnails?.map((thumb: any, index: number) => ({
        id: `thumb-${Date.now()}-${index}`,
        text: thumb.text || `${offer.title}がお得！`,
        description: thumb.description || '商品の魅力を伝える画像',
        eventBadge: eventActive ? eventActive.badge : undefined,
        designNotes: thumb.designNotes || '商品画像 + 価格表示'
      })) || this.getFallbackThumbnails(offer, eventActive);
    } catch (error) {
      console.error('Thumbnail generation failed:', error);
      return this.getFallbackThumbnails(offer, eventActive);
    }
  }

  /**
   * Generate captions with trending hashtags
   */
  private async generateCaptions(trend: TikTokTrend, offer: Offer, scripts: CreativeScript[]): Promise<CreativeCaption[]> {
    // Get current trending hashtags
    const trendingHashtags = await tiktokTrendsService.getTrends('JP', 'hashtag', 20);
    const topHashtags = trendingHashtags.slice(0, 10).map(t => t.name);

    // Create long-tail searchable hashtag
    const searchableHashtag = this.createSearchableHashtag(offer);

    return scripts.map((script, index) => {
      const baseCaption = this.createBaseCaptionText(script, offer);
      const selectedHashtags = this.selectHashtagsForScript(script, topHashtags, trend);

      return {
        id: `caption-${Date.now()}-${index}`,
        text: baseCaption,
        hashtags: [...selectedHashtags, searchableHashtag],
        searchableHashtag
      };
    });
  }

  /**
   * Generate compliance disclosure string
   */
  private generateDisclosure(offer: Offer): string {
    let disclosure = '広告（アフィリエイトリンク）を含みます。';
    
    // Add network-specific disclosures
    if (offer.network_id) {
      // Amazon Associates disclosure
      disclosure += ' Amazonのアソシエイトとして、当メディアは適格販売により収入を得ています。';
    }

    return disclosure;
  }

  /**
   * Helper methods
   */
  private getDefaultShotList(): string[] {
    return [
      '顔のクローズアップ（商品を手に持つ）',
      '商品のパッケージング見せ',
      '使用シーンのデモンストレーション',
      '効果・結果の表示',
      'CTAとリンクの案内'
    ];
  }

  private generateJPText(offer: Offer, eventActive?: any): string {
    if (eventActive) {
      return `${eventActive.badge}`;
    }
    return `${offer.title}をチェック！`;
  }

  private createSearchableHashtag(offer: Offer): string {
    // Extract product category for long-tail hashtag
    const category = offer.category || offer.title.split(/\s+/)[0];
    return `#${category}コスパ`;
  }

  private createBaseCaptionText(script: CreativeScript, offer: Offer): string {
    const hookType = script.hookType;
    const productName = offer.title;
    
    const templates = {
      problem: `${productName}でこの問題解決✨`,
      surprise: `まさかの${productName}効果に驚愕😱`,
      deal: `今だけ！${productName}がお得すぎる🔥`
    };

    return templates[hookType as keyof typeof templates] || templates.deal;
  }

  private selectHashtagsForScript(script: CreativeScript, trending: string[], trend: TikTokTrend): string[] {
    const selected = ['#おすすめ', '#fyp'];
    
    // Add trend hashtag if it's a hashtag
    if (trend.type === 'hashtag') {
      selected.push(trend.name);
    }
    
    // Add 3-5 trending hashtags
    selected.push(...trending.slice(0, 5));
    
    return [...new Set(selected)]; // Remove duplicates
  }

  private getFallbackScripts(trend: TikTokTrend, offer: Offer, eventActive?: any): CreativeScript[] {
    const baseText = eventActive ? eventActive.badge : `${offer.title}をチェック！`;
    
    return [
      {
        id: `script-fallback-${Date.now()}-0`,
        hookType: 'problem',
        script: `この問題、${offer.title}で解決！実際に使ってみた結果がこちら...`,
        shotList: this.getDefaultShotList(),
        duration: 20,
        jpText: baseText
      },
      {
        id: `script-fallback-${Date.now()}-1`, 
        hookType: 'surprise',
        script: `まさか${offer.title}がこんなに効果的だとは...使用前後をご覧ください`,
        shotList: this.getDefaultShotList(),
        duration: 25,
        jpText: baseText
      },
      {
        id: `script-fallback-${Date.now()}-2`,
        hookType: 'deal',
        script: `今だけ特価！${offer.title}が${offer.price_jpy.toLocaleString()}円`,
        shotList: this.getDefaultShotList(), 
        duration: 15,
        jpText: baseText
      }
    ];
  }

  private getFallbackThumbnails(offer: Offer, eventActive?: any): CreativeThumbnail[] {
    return [
      {
        id: `thumb-fallback-${Date.now()}-0`,
        text: `${offer.title}が話題`,
        description: '商品画像とキャッチコピー',
        eventBadge: eventActive?.badge,
        designNotes: '商品中心、価格目立たせ'
      },
      {
        id: `thumb-fallback-${Date.now()}-1`,
        text: `¥${offer.price_jpy.toLocaleString()}`,
        description: '価格強調デザイン', 
        eventBadge: eventActive?.badge,
        designNotes: '大きな価格表示、商品サブ'
      }
    ];
  }
}

export const creativeGenerator = new CreativeGeneratorService();