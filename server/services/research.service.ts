import { GoogleGenerativeAI } from "@google/genai";

interface ResearchBriefRequest {
  seed: string;
  locale: string;
  contentType?: 'blog' | 'video' | 'both';
}

interface KeywordCluster {
  primary: string;
  related: string[];
  searchVolume?: number;
  difficulty?: number;
}

interface ContentAngle {
  title: string;
  hook: string;
  keyPoints: string[];
  cta: string;
}

interface CompetitorAnalysis {
  url: string;
  title: string;
  wordCount: number;
  keyTopics: string[];
  structure: string[];
}

interface ResearchBriefResponse {
  outline: {
    mainTopic: string;
    subTopics: string[];
    structure: string[];
  };
  keywords: KeywordCluster[];
  faq: Array<{
    question: string;
    answer: string;
  }>;
  competitors: CompetitorAnalysis[];
  contentAngles: ContentAngle[];
  japaneseKeywords?: {
    hiragana: string[];
    katakana: string[];
    kanji: string[];
    romaji: string[];
  };
}

class ResearchService {
  private gemini: GoogleGenerativeAI;
  private model: any;

  constructor() {
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      throw new Error('GOOGLE_GEMINI_API_KEY is required for research service');
    }
    this.gemini = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
    this.model = this.gemini.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  /**
   * Japanese keyword segmentation using basic regex patterns
   * TODO: Replace with Sudachi/MeCab when available
   */
  private segmentJapaneseText(text: string) {
    // Basic patterns - in production, use Sudachi/MeCab
    const hiraganaPattern = /[\u3040-\u309f]+/g;
    const katakanaPattern = /[\u30a0-\u30ff]+/g;
    const kanjiPattern = /[\u4e00-\u9faf]+/g;
    
    return {
      hiragana: text.match(hiraganaPattern) || [],
      katakana: text.match(katakanaPattern) || [],
      kanji: text.match(kanjiPattern) || [],
      romaji: [] // Would be populated by MeCab/Sudachi
    };
  }

  /**
   * Generate research brief for Japanese market
   */
  async generateBrief(request: ResearchBriefRequest): Promise<ResearchBriefResponse> {
    try {
      const { seed, locale, contentType = 'both' } = request;
      
      const prompt = `
あなたは日本市場向けコンテンツの専門リサーチャーです。以下のトピックについて包括的な調査結果を提供してください。

トピック: ${seed}
ロケール: ${locale}
コンテンツタイプ: ${contentType}

以下の形式でJSONレスポンスを生成してください：

{
  "outline": {
    "mainTopic": "メイントピック",
    "subTopics": ["サブトピック1", "サブトピック2", "サブトピック3"],
    "structure": ["導入", "本文1", "本文2", "まとめ", "CTA"]
  },
  "keywords": [
    {
      "primary": "メインキーワード",
      "related": ["関連キーワード1", "関連キーワード2"],
      "searchVolume": 1000,
      "difficulty": 60
    }
  ],
  "faq": [
    {
      "question": "よくある質問1",
      "answer": "回答1"
    }
  ],
  "competitors": [
    {
      "url": "競合サイトURL",
      "title": "競合記事タイトル", 
      "wordCount": 2000,
      "keyTopics": ["トピック1", "トピック2"],
      "structure": ["見出し1", "見出し2"]
    }
  ],
  "contentAngles": [
    {
      "title": "コンテンツ角度1",
      "hook": "読者を引きつけるフック",
      "keyPoints": ["要点1", "要点2", "要点3"],
      "cta": "行動喚起"
    }
  ]
}

日本のユーザーの検索意図とSEO要件を考慮し、楽天、Amazon、価格比較サイトとの親和性を含めてください。
アフィリエイトリンクの開示義務「本コンテンツには広告（アフィリエイトリンク）を含みます。」も考慮してください。
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse JSON response
      let briefData: ResearchBriefResponse;
      try {
        briefData = JSON.parse(text);
      } catch (parseError) {
        // Fallback to basic structure if JSON parsing fails
        briefData = this.generateFallbackBrief(seed, locale);
      }

      // Add Japanese keyword segmentation
      if (locale.startsWith('ja')) {
        const fullText = `${briefData.outline.mainTopic} ${briefData.outline.subTopics.join(' ')} ${briefData.keywords.map(k => k.primary).join(' ')}`;
        briefData.japaneseKeywords = this.segmentJapaneseText(fullText);
      }

      return briefData;

    } catch (error) {
      console.error('Research brief generation failed:', error);
      // Return fallback brief
      return this.generateFallbackBrief(request.seed, request.locale);
    }
  }

  /**
   * Fallback brief generation when AI fails
   */
  private generateFallbackBrief(seed: string, locale: string): ResearchBriefResponse {
    const isJapanese = locale.startsWith('ja');
    
    return {
      outline: {
        mainTopic: seed,
        subTopics: isJapanese ? 
          [`${seed}とは`, `${seed}の選び方`, `${seed}のおすすめ`] :
          [`What is ${seed}`, `How to choose ${seed}`, `Best ${seed} options`],
        structure: isJapanese ?
          ['導入', '基本情報', '比較・選び方', 'おすすめ商品', 'まとめ'] :
          ['Introduction', 'Basic Information', 'Comparison Guide', 'Recommendations', 'Conclusion']
      },
      keywords: [{
        primary: seed,
        related: [`${seed} おすすめ`, `${seed} 比較`, `${seed} 口コミ`],
        searchVolume: 500,
        difficulty: 50
      }],
      faq: [{
        question: isJapanese ? `${seed}とは何ですか？` : `What is ${seed}?`,
        answer: isJapanese ? `${seed}について説明します。` : `${seed} is explained here.`
      }],
      competitors: [],
      contentAngles: [{
        title: isJapanese ? `${seed}完全ガイド` : `Complete ${seed} Guide`,
        hook: isJapanese ? `${seed}選びで失敗しないために` : `Don't make mistakes choosing ${seed}`,
        keyPoints: [
          isJapanese ? '基本的な選び方' : 'Basic selection criteria',
          isJapanese ? 'おすすめ商品' : 'Recommended products',
          isJapanese ? 'よくある質問' : 'Common questions'
        ],
        cta: isJapanese ? '今すぐチェック' : 'Check it out now'
      }],
      japaneseKeywords: isJapanese ? this.segmentJapaneseText(seed) : undefined
    };
  }

  /**
   * Generate topic clusters for site planning
   */
  async generateTopicClusters(niche: string, count: number = 10): Promise<Array<{
    pillar: string;
    supporting: string[];
    intent: string;
  }>> {
    try {
      const prompt = `
${niche}に関する記事クラスターを${count}個生成してください。
各クラスターには1つのピラーページと3-5つのサポートページを含めてください。

JSON形式で回答してください：
[
  {
    "pillar": "ピラー記事のタイトル",
    "supporting": ["サポート記事1", "サポート記事2", "サポート記事3"],
    "intent": "commercial" // informational, commercial, navigational, transactional
  }
]

SEO効果とアフィリエイト収益を最大化する構成にしてください。
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      try {
        return JSON.parse(text);
      } catch (parseError) {
        // Return fallback clusters
        return this.generateFallbackClusters(niche, count);
      }

    } catch (error) {
      console.error('Topic cluster generation failed:', error);
      return this.generateFallbackClusters(niche, count);
    }
  }

  private generateFallbackClusters(niche: string, count: number) {
    return Array.from({ length: count }, (_, i) => ({
      pillar: `${niche} 完全ガイド ${i + 1}`,
      supporting: [
        `${niche} おすすめ商品 ${i + 1}`,
        `${niche} 選び方のポイント ${i + 1}`,
        `${niche} 口コミ・評判 ${i + 1}`
      ],
      intent: i % 2 === 0 ? 'commercial' : 'informational'
    }));
  }

  /**
   * Analyze competitor content
   */
  async analyzeCompetitor(url: string): Promise<CompetitorAnalysis | null> {
    // TODO: Implement web scraping for competitor analysis
    // For now, return null - would use Puppeteer/Playwright in production
    console.log(`Competitor analysis for ${url} - not implemented yet`);
    return null;
  }

  /**
   * Test Japanese text segmentation
   */
  async testSegmentation(text: string) {
    return this.segmentJapaneseText(text);
  }
}

export const researchService = new ResearchService();
export { ResearchService, ResearchBriefRequest, ResearchBriefResponse };