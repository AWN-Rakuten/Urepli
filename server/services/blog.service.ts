import { createGeminiClient } from './mock-gemini';
import { marked } from 'marked';

interface BlogGenerationRequest {
  outline: {
    mainTopic: string;
    subTopics: string[];
    structure: string[];
  };
  keywords: Array<{
    primary: string;
    related: string[];
  }>;
  productRefs?: Array<{
    name: string;
    url: string;
    price?: number;
    description?: string;
  }>;
  wordCount?: number;
  tone?: 'professional' | 'casual' | 'conversational';
  includeAffiliate?: boolean;
}

interface GeneratedImage {
  url: string;
  alt: string;
  caption?: string;
  position: 'hero' | 'inline' | 'gallery';
}

interface JSONLDSchema {
  '@context': string;
  '@type': string;
  headline?: string;
  author?: {
    '@type': string;
    name: string;
  };
  datePublished?: string;
  dateModified?: string;
  image?: string[];
  articleSection?: string;
  keywords?: string[];
  mainEntity?: any; // FAQ schema
}

interface BlogGenerationResponse {
  title: string;
  slug: string;
  metaDescription: string;
  html: string;
  markdown: string;
  jsonld: JSONLDSchema[];
  images: GeneratedImage[];
  wordCount: number;
  readingTime: number; // minutes
  seoScore: number;
  keywordDensity: { [keyword: string]: number };
}

class BlogService {
  private gemini: GoogleGenAI;
  private model: any;

  constructor() {
    this.gemini = createGeminiClient(process.env.GOOGLE_GEMINI_API_KEY);
    this.model = this.gemini.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  /**
   * Generate a complete blog post with SEO optimization
   */
  async generateBlog(request: BlogGenerationRequest): Promise<BlogGenerationResponse> {
    try {
      const { outline, keywords, productRefs = [], wordCount = 2000, tone = 'professional', includeAffiliate = true } = request;
      
      // Generate main content
      const contentPrompt = this.buildContentPrompt(outline, keywords, productRefs, wordCount, tone, includeAffiliate);
      const contentResult = await this.model.generateContent(contentPrompt);
      const contentResponse = await contentResult.response;
      const markdownContent = contentResponse.text();

      // Generate title and meta
      const metaPrompt = this.buildMetaPrompt(outline.mainTopic, keywords[0]?.primary || '');
      const metaResult = await this.model.generateContent(metaPrompt);
      const metaResponse = await metaResult.response;
      
      let metaData;
      try {
        metaData = JSON.parse(metaResponse.text());
      } catch (e) {
        metaData = {
          title: outline.mainTopic,
          metaDescription: `${outline.mainTopic}について詳しく解説します。`,
          slug: this.generateSlug(outline.mainTopic)
        };
      }

      // Convert markdown to HTML
      const html = await marked(markdownContent);
      
      // Generate images (placeholder - would integrate with ComfyUI)
      const images = await this.generateImages(outline, keywords);
      
      // Generate JSON-LD schema
      const jsonld = this.generateJSONLD(metaData.title, markdownContent, keywords, images);
      
      // Calculate metrics
      const wordCount_calculated = this.countWords(markdownContent);
      const readingTime = Math.ceil(wordCount_calculated / 200); // 200 words per minute
      const keywordDensity = this.calculateKeywordDensity(markdownContent, keywords);
      const seoScore = this.calculateSEOScore(metaData.title, markdownContent, keywords, images);

      return {
        title: metaData.title,
        slug: metaData.slug,
        metaDescription: metaData.metaDescription,
        html,
        markdown: markdownContent,
        jsonld,
        images,
        wordCount: wordCount_calculated,
        readingTime,
        seoScore,
        keywordDensity
      };

    } catch (error) {
      console.error('Blog generation failed:', error);
      throw new Error(`Failed to generate blog: ${error.message}`);
    }
  }

  private buildContentPrompt(outline: any, keywords: any[], productRefs: any[], wordCount: number, tone: string, includeAffiliate: boolean): string {
    const affiliateDisclosure = includeAffiliate ? '本コンテンツには広告（アフィリエイトリンク）を含みます。' : '';
    
    return `
あなたは日本市場向けのSEOライターです。以下の要件に基づいて高品質な記事を作成してください。

## 記事情報
- メイントピック: ${outline.mainTopic}
- サブトピック: ${outline.subTopics.join(', ')}
- 構成: ${outline.structure.join(' → ')}
- 目標文字数: ${wordCount}文字
- トーン: ${tone}

## SEOキーワード
- メインキーワード: ${keywords[0]?.primary || ''}
- 関連キーワード: ${keywords.flatMap(k => k.related).join(', ')}

## 商品情報
${productRefs.map(p => `- ${p.name}: ${p.description || ''}`).join('\n')}

## 要件
1. 読者にとって価値のある実用的な情報を提供
2. SEOキーワードを自然に組み込む
3. 見出し構成を適切に使用（H2, H3）
4. 箇条書きや表を活用して読みやすさを向上
5. 日本の読者に最適化された文章
6. ${includeAffiliate ? 'アフィリエイトリンクを適切な箇所に配置' : ''}

## 構成
1. 導入（問題提起・記事の価値）
2. ${outline.subTopics.map((topic, i) => `${i + 2}. ${topic}`).join('\n')}
3. FAQ（よくある質問）
4. まとめ（要点の再確認・行動喚起）

${affiliateDisclosure ? `\n## 重要
記事の最初または最後に必ず以下の文言を含めてください：
「${affiliateDisclosure}」` : ''}

Markdownフォーマットで出力してください。画像の挿入箇所は ![alt](placeholder-image-url) として指定してください。
`;
  }

  private buildMetaPrompt(mainTopic: string, primaryKeyword: string): string {
    return `
以下のトピックについてSEO最適化されたメタデータを生成してください。

トピック: ${mainTopic}
メインキーワード: ${primaryKeyword}

JSON形式で回答してください：
{
  "title": "SEO最適化されたタイトル（32文字以内）",
  "metaDescription": "メタディスクリプション（120文字以内）",
  "slug": "url-slug"
}

要件：
- タイトルはクリック率を高めるように
- メタディスクリプションは検索意図を満たすように
- スラッグは日本語対応（ローマ字またはひらがな）
`;
  }

  /**
   * Generate images for the blog post
   * TODO: Integrate with ComfyUI service
   */
  private async generateImages(outline: any, keywords: any[]): Promise<GeneratedImage[]> {
    // Placeholder implementation - would call ComfyUI service
    const images: GeneratedImage[] = [
      {
        url: '/images/placeholder-hero.jpg',
        alt: `${outline.mainTopic}のイメージ`,
        caption: `${outline.mainTopic}について`,
        position: 'hero'
      }
    ];

    // Add inline images for each subtopic
    outline.subTopics.slice(0, 3).forEach((subtopic: string, index: number) => {
      images.push({
        url: `/images/placeholder-${index + 1}.jpg`,
        alt: `${subtopic}の説明`,
        caption: subtopic,
        position: 'inline'
      });
    });

    return images;
  }

  /**
   * Generate JSON-LD structured data
   */
  private generateJSONLD(title: string, content: string, keywords: any[], images: GeneratedImage[]): JSONLDSchema[] {
    const schemas: JSONLDSchema[] = [];

    // Article schema
    const articleSchema: JSONLDSchema = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: title,
      author: {
        '@type': 'Person',
        name: 'Urepli編集部'
      },
      datePublished: new Date().toISOString(),
      dateModified: new Date().toISOString(),
      image: images.map(img => img.url),
      articleSection: keywords[0]?.primary || '',
      keywords: keywords.flatMap(k => [k.primary, ...k.related])
    };

    schemas.push(articleSchema);

    // FAQ schema if content contains Q&A
    const faqMatches = content.match(/##?\s*(?:Q|質問|FAQ).*?\n(.*?)(?=##|\n\n|$)/gs);
    if (faqMatches && faqMatches.length > 0) {
      const faqSchema: JSONLDSchema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqMatches.map((faq, index) => ({
          '@type': 'Question',
          name: `FAQ ${index + 1}`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.replace(/##?\s*(?:Q|質問|FAQ).*?\n/, '').trim()
          }
        }))
      };
      schemas.push(faqSchema);
    }

    return schemas;
  }

  /**
   * Calculate word count
   */
  private countWords(text: string): number {
    // For Japanese text, count characters instead of words
    const cleanText = text.replace(/[#*`\[\]]/g, '').replace(/\n+/g, ' ');
    return cleanText.length;
  }

  /**
   * Calculate keyword density
   */
  private calculateKeywordDensity(content: string, keywords: any[]): { [keyword: string]: number } {
    const density: { [keyword: string]: number } = {};
    const totalWords = this.countWords(content);
    const cleanContent = content.toLowerCase();

    keywords.forEach(keywordGroup => {
      const allKeywords = [keywordGroup.primary, ...keywordGroup.related];
      allKeywords.forEach(keyword => {
        const matches = (cleanContent.match(new RegExp(keyword.toLowerCase(), 'g')) || []).length;
        density[keyword] = (matches / totalWords) * 100;
      });
    });

    return density;
  }

  /**
   * Calculate SEO score
   */
  private calculateSEOScore(title: string, content: string, keywords: any[], images: GeneratedImage[]): number {
    let score = 0;

    // Title contains primary keyword
    if (keywords[0]?.primary && title.toLowerCase().includes(keywords[0].primary.toLowerCase())) {
      score += 20;
    }

    // Content length
    const wordCount = this.countWords(content);
    if (wordCount >= 1500) score += 20;
    else if (wordCount >= 1000) score += 15;
    else if (wordCount >= 500) score += 10;

    // Headers structure
    const h2Count = (content.match(/^##\s/gm) || []).length;
    if (h2Count >= 3) score += 15;

    // Images with alt text
    if (images.length >= 2 && images.every(img => img.alt)) {
      score += 15;
    }

    // Keyword density
    const density = this.calculateKeywordDensity(content, keywords);
    const primaryDensity = density[keywords[0]?.primary] || 0;
    if (primaryDensity >= 1 && primaryDensity <= 3) {
      score += 20;
    }

    // Internal structure
    if (content.includes('まとめ') || content.includes('FAQ')) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  /**
   * Generate URL slug from Japanese text
   */
  private generateSlug(text: string): string {
    // Basic slug generation - in production, use proper Japanese romanization
    return text
      .toLowerCase()
      .replace(/[^a-z0-9ひらがなカタカナ漢字]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }

  /**
   * Generate multiple blog variants for A/B testing
   */
  async generateVariants(request: BlogGenerationRequest, count: number = 3): Promise<BlogGenerationResponse[]> {
    const variants = await Promise.all(
      Array.from({ length: count }, () => this.generateBlog(request))
    );
    return variants;
  }

  /**
   * Optimize existing blog content
   */
  async optimizeBlog(existingContent: string, targetKeywords: string[], performanceData?: any): Promise<string> {
    const optimizationPrompt = `
以下のブログ記事を最適化してください。

既存の記事:
${existingContent}

対象キーワード: ${targetKeywords.join(', ')}

${performanceData ? `パフォーマンスデータ:
- CTR: ${performanceData.ctr}%
- 平均滞在時間: ${performanceData.dwellTime}秒
- 直帰率: ${performanceData.bounceRate}%` : ''}

最適化要件:
1. SEOキーワードの適切な配置
2. 読みやすさの向上
3. ユーザーエンゲージメントの改善
4. コンバージョン率の向上

最適化されたMarkdownコンテンツを出力してください。
`;

    try {
      const result = await this.model.generateContent(optimizationPrompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Blog optimization failed:', error);
      return existingContent;
    }
  }
}

export const blogService = new BlogService();
export { BlogService, BlogGenerationRequest, BlogGenerationResponse };