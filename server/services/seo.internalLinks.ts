import { eq, and, desc, sql } from 'drizzle-orm';

interface LinkOpportunity {
  fromArticleId: string;
  toArticleId: string;
  anchor: string;
  relevanceScore: number;
  position?: number;
}

interface ArticleForLinking {
  id: string;
  title: string;
  html: string;
  keywords: string[];
  slug: string;
  publishedUrl?: string;
  wordCount: number;
}

class SEOInternalLinksService {
  /**
   * Find internal link opportunities between articles
   * Based on the code seed from problem statement
   */
  linkOpportunities(articles: ArticleForLinking[], k: number = 3): LinkOpportunity[] {
    const opportunities: LinkOpportunity[] = [];
    
    for (const fromArticle of articles) {
      for (const toArticle of articles) {
        if (fromArticle.id === toArticle.id) continue;
        
        // Calculate semantic similarity
        const relevanceScore = this.calculateRelevance(fromArticle, toArticle);
        
        if (relevanceScore > 0.3) { // Minimum threshold
          const anchor = this.findBestAnchor(fromArticle, toArticle);
          
          if (anchor) {
            opportunities.push({
              fromArticleId: fromArticle.id,
              toArticleId: toArticle.id,
              anchor,
              relevanceScore,
              position: this.findAnchorPosition(fromArticle.html, anchor)
            });
          }
        }
      }
    }
    
    // Sort by relevance score and return top k opportunities per article
    return opportunities
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, k);
  }

  /**
   * Calculate relevance score between two articles
   */
  private calculateRelevance(from: ArticleForLinking, to: ArticleForLinking): number {
    let score = 0;
    
    // Keyword overlap (weighted heavily)
    const keywordOverlap = from.keywords.filter(keyword => 
      to.keywords.some(toKeyword => 
        this.calculateStringSimilarity(keyword, toKeyword) > 0.8
      )
    );
    score += keywordOverlap.length * 0.4;
    
    // Title similarity
    const titleSimilarity = this.calculateStringSimilarity(from.title, to.title);
    score += titleSimilarity * 0.3;
    
    // Content topic similarity (simplified - in production use embeddings)
    const contentSimilarity = this.calculateContentSimilarity(from.html, to.html);
    score += contentSimilarity * 0.2;
    
    // Length bonus (prefer linking to substantial articles)
    if (to.wordCount > 1000) score += 0.1;
    
    return Math.min(score, 1.0);
  }

  /**
   * Calculate string similarity using simple algorithm
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(null)
    );

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Calculate content similarity based on common phrases
   */
  private calculateContentSimilarity(content1: string, content2: string): number {
    // Extract meaningful phrases (2-3 word combinations)
    const phrases1 = this.extractPhrases(content1);
    const phrases2 = this.extractPhrases(content2);
    
    const commonPhrases = phrases1.filter(phrase => phrases2.includes(phrase));
    const totalPhrases = Math.max(phrases1.length, phrases2.length);
    
    return totalPhrases > 0 ? commonPhrases.length / totalPhrases : 0;
  }

  /**
   * Extract meaningful phrases from content
   */
  private extractPhrases(content: string): string[] {
    // Remove HTML tags and clean content
    const cleanContent = content
      .replace(/<[^>]*>/g, ' ')
      .replace(/[^\w\sひらがなカタカナ漢字]/g, ' ')
      .toLowerCase();
    
    const words = cleanContent.split(/\s+/).filter(word => word.length > 2);
    const phrases: string[] = [];
    
    // Create 2-word and 3-word phrases
    for (let i = 0; i < words.length - 1; i++) {
      phrases.push(words.slice(i, i + 2).join(' '));
      if (i < words.length - 2) {
        phrases.push(words.slice(i, i + 3).join(' '));
      }
    }
    
    return [...new Set(phrases)]; // Remove duplicates
  }

  /**
   * Find the best anchor text for linking
   */
  private findBestAnchor(from: ArticleForLinking, to: ArticleForLinking): string | null {
    // Try to find relevant keywords from target article in source content
    const sourceText = from.html.replace(/<[^>]*>/g, ' ').toLowerCase();
    
    for (const keyword of to.keywords) {
      if (sourceText.includes(keyword.toLowerCase())) {
        return keyword;
      }
    }
    
    // Try partial matches
    for (const keyword of to.keywords) {
      const words = keyword.split(' ');
      for (const word of words) {
        if (word.length > 3 && sourceText.includes(word.toLowerCase())) {
          return word;
        }
      }
    }
    
    // Fallback to title words
    const titleWords = to.title.split(' ').filter(word => word.length > 3);
    for (const word of titleWords) {
      if (sourceText.includes(word.toLowerCase())) {
        return word;
      }
    }
    
    return null;
  }

  /**
   * Find position of anchor text in content
   */
  private findAnchorPosition(html: string, anchor: string): number | undefined {
    const cleanContent = html.replace(/<[^>]*>/g, '');
    const position = cleanContent.toLowerCase().indexOf(anchor.toLowerCase());
    return position >= 0 ? position : undefined;
  }

  /**
   * Execute internal linking for a site
   * Mock implementation - would integrate with database in production
   */
  async executeInternalLinking(siteId: string): Promise<{
    linksCreated: number;
    opportunities: LinkOpportunity[];
  }> {
    try {
      // Mock implementation - in production would use database
      console.log(`Executing internal linking for site: ${siteId}`);
      
      // Mock data for demo
      const mockArticles: ArticleForLinking[] = [
        {
          id: '1',
          title: '美容液おすすめランキング',
          html: '<p>美容液の選び方について説明します。スキンケアの重要性...</p>',
          keywords: ['美容液', 'スキンケア', 'おすすめ'],
          slug: 'beauty-serum-ranking',
          wordCount: 2000
        },
        {
          id: '2',
          title: 'スキンケア完全ガイド',
          html: '<p>スキンケアの基本から応用まで。美容液の使い方も解説...</p>',
          keywords: ['スキンケア', '美容', 'ガイド'],
          slug: 'skincare-guide',
          wordCount: 1800
        }
      ];

      const opportunities = this.linkOpportunities(mockArticles, 3);
      
      // Mock link creation
      const linksCreated = opportunities.length;

      return { linksCreated, opportunities };

    } catch (error) {
      console.error('Internal linking execution failed:', error);
      throw error;
    }
  }

  /**
   * Extract keywords from content (simple implementation)
   */
  private extractKeywordsFromContent(html: string): string[] {
    const cleanText = html.replace(/<[^>]*>/g, ' ').toLowerCase();
    
    // Extract meaningful terms (this is simplified - in production use proper NLP)
    const words = cleanText
      .split(/[\s\n\r]+/)
      .filter(word => word.length > 3 && word.length < 20)
      .filter(word => !/^\d+$/.test(word)); // Remove numbers
    
    // Count word frequency
    const wordCount: { [word: string]: number } = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    // Return top keywords by frequency
    return Object.entries(wordCount)
      .filter(([, count]) => count >= 2) // Appear at least twice
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Update existing articles with new internal links
   */
  async updateArticleWithLinks(articleId: string): Promise<boolean> {
    try {
      // Get article and its outbound links
      const article = await db
        .select()
        .from(articles)
        .where(eq(articles.id, articleId))
        .limit(1);

      if (article.length === 0) return false;

      const outboundLinks = await db
        .select({
          toArticleId: internalLinks.toArticleId,
          anchor: internalLinks.anchor,
          position: internalLinks.position,
          toSlug: articles.slug,
          toTitle: articles.title
        })
        .from(internalLinks)
        .leftJoin(articles, eq(internalLinks.toArticleId, articles.id))
        .where(eq(internalLinks.fromArticleId, articleId));

      if (outboundLinks.length === 0) return true;

      // Update HTML content with internal links
      let updatedHtml = article[0].html || '';
      
      for (const link of outboundLinks) {
        if (link.toSlug && link.anchor) {
          const linkUrl = `/articles/${link.toSlug}`;
          const linkHtml = `<a href="${linkUrl}" title="${link.toTitle || ''}">${link.anchor}</a>`;
          
          // Replace first occurrence of anchor text (case-insensitive)
          const regex = new RegExp(`\\b${this.escapeRegex(link.anchor)}\\b`, 'i');
          updatedHtml = updatedHtml.replace(regex, linkHtml);
        }
      }

      // Update article in database
      await db
        .update(articles)
        .set({ 
          html: updatedHtml,
          updatedAt: new Date()
        })
        .where(eq(articles.id, articleId));

      return true;

    } catch (error) {
      console.error('Failed to update article with links:', error);
      return false;
    }
  }

  /**
   * Escape string for regex
   */
  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Get internal link metrics for a site
   */
  async getLinkMetrics(siteId: string): Promise<{
    totalLinks: number;
    avgLinksPerArticle: number;
    topLinkedArticles: Array<{
      id: string;
      title: string;
      inboundLinks: number;
    }>;
  }> {
    try {
      // Get total links for this site
      const totalLinksResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(internalLinks)
        .leftJoin(articles, eq(internalLinks.fromArticleId, articles.id))
        .where(eq(articles.siteId, siteId));

      const totalLinks = totalLinksResult[0]?.count || 0;

      // Get article count
      const articleCountResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(articles)
        .where(and(
          eq(articles.siteId, siteId),
          eq(articles.status, 'published')
        ));

      const articleCount = articleCountResult[0]?.count || 0;
      const avgLinksPerArticle = articleCount > 0 ? totalLinks / articleCount : 0;

      // Get top linked articles (most inbound links)
      const topLinkedArticles = await db
        .select({
          id: articles.id,
          title: articles.title,
          inboundLinks: sql<number>`count(${internalLinks.toArticleId})`
        })
        .from(articles)
        .leftJoin(internalLinks, eq(articles.id, internalLinks.toArticleId))
        .where(eq(articles.siteId, siteId))
        .groupBy(articles.id, articles.title)
        .orderBy(desc(sql`count(${internalLinks.toArticleId})`))
        .limit(10);

      return {
        totalLinks,
        avgLinksPerArticle,
        topLinkedArticles
      };

    } catch (error) {
      console.error('Failed to get link metrics:', error);
      return {
        totalLinks: 0,
        avgLinksPerArticle: 0,
        topLinkedArticles: []
      };
    }
  }
}

export const seoInternalLinksService = new SEOInternalLinksService();
export { SEOInternalLinksService, LinkOpportunity, ArticleForLinking };