import { eq, and, desc } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

interface SitemapEntry {
  url: string;
  lastModified: Date;
  changeFreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}

interface VideoSitemapEntry {
  url: string;
  videoUrl: string;
  thumbnailUrl: string;
  title: string;
  description: string;
  duration: number;
  uploadDate: Date;
}

class SEOSitemapService {
  private sitemapDir: string;

  constructor() {
    this.sitemapDir = process.env.SITEMAP_DIR || './public/sitemaps';
    
    // Ensure sitemap directory exists
    if (!fs.existsSync(this.sitemapDir)) {
      fs.mkdirSync(this.sitemapDir, { recursive: true });
    }
  }

  /**
   * Generate complete sitemap for a site
   */
  async generateSitemap(siteId: string): Promise<{
    mainSitemap: string;
    videoSitemap?: string;
    imageSitemap?: string;
  }> {
    try {
      // Get site information
      const site = await db
        .select()
        .from(sites)
        .where(eq(sites.id, siteId))
        .limit(1);

      if (site.length === 0) {
        throw new Error(`Site not found: ${siteId}`);
      }

      const siteData = site[0];
      const baseUrl = siteData.deployUrl || `https://${siteData.domain}`;

      // Generate main sitemap
      const mainSitemapPath = await this.generateMainSitemap(siteId, baseUrl);

      // Generate video sitemap if videos exist
      let videoSitemapPath: string | undefined;
      const hasVideos = await this.checkHasVideos(siteId);
      if (hasVideos) {
        videoSitemapPath = await this.generateVideoSitemap(siteId, baseUrl);
      }

      // Generate sitemap index
      const sitemapIndexPath = await this.generateSitemapIndex(siteId, baseUrl, {
        mainSitemap: mainSitemapPath,
        videoSitemap: videoSitemapPath
      });

      return {
        mainSitemap: sitemapIndexPath,
        videoSitemap: videoSitemapPath
      };

    } catch (error) {
      console.error('Sitemap generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate main sitemap.xml
   */
  private async generateMainSitemap(siteId: string, baseUrl: string): Promise<string> {
    // Get all published articles
    const siteArticles = await db
      .select({
        slug: articles.slug,
        publishedAt: articles.publishedAt,
        updatedAt: articles.updatedAt,
        wordCount: articles.wordCount
      })
      .from(articles)
      .where(and(
        eq(articles.siteId, siteId),
        eq(articles.status, 'published')
      ))
      .orderBy(desc(articles.publishedAt));

    const entries: SitemapEntry[] = [];

    // Add homepage
    entries.push({
      url: baseUrl,
      lastModified: new Date(),
      changeFreq: 'daily',
      priority: 1.0
    });

    // Add static pages
    const staticPages = [
      { path: '/about', priority: 0.8, changeFreq: 'monthly' as const },
      { path: '/contact', priority: 0.6, changeFreq: 'yearly' as const },
      { path: '/privacy', priority: 0.5, changeFreq: 'yearly' as const },
      { path: '/terms', priority: 0.5, changeFreq: 'yearly' as const }
    ];

    staticPages.forEach(page => {
      entries.push({
        url: `${baseUrl}${page.path}`,
        lastModified: new Date(),
        changeFreq: page.changeFreq,
        priority: page.priority
      });
    });

    // Add articles
    siteArticles.forEach(article => {
      if (article.slug) {
        const priority = this.calculateArticlePriority(article.wordCount || 0);
        const changeFreq = this.determineChangeFreq(article.publishedAt);
        
        entries.push({
          url: `${baseUrl}/articles/${article.slug}`,
          lastModified: article.updatedAt || article.publishedAt || new Date(),
          changeFreq,
          priority
        });
      }
    });

    // Generate XML
    const xml = this.generateSitemapXML(entries);
    
    // Save to file
    const filename = `sitemap-${siteId}.xml`;
    const filepath = path.join(this.sitemapDir, filename);
    fs.writeFileSync(filepath, xml);

    return filename;
  }

  /**
   * Generate video sitemap
   */
  private async generateVideoSitemap(siteId: string, baseUrl: string): Promise<string> {
    // Get all videos with their associated articles
    const siteVideos = await db
      .select({
        videoUrl: videos.mp4Url,
        thumbnailUrls: videos.thumbnailUrls,
        script: videos.script,
        durationSeconds: videos.durationSeconds,
        createdAt: videos.createdAt,
        articleSlug: articles.slug,
        articleTitle: articles.title
      })
      .from(videos)
      .leftJoin(articles, eq(videos.topicId, articles.topicId))
      .where(and(
        eq(articles.siteId, siteId),
        eq(videos.status, 'published'),
        eq(articles.status, 'published')
      ));

    const videoEntries: VideoSitemapEntry[] = siteVideos
      .filter(video => video.videoUrl && video.articleSlug)
      .map(video => {
        const thumbnailUrls = Array.isArray(video.thumbnailUrls) ? video.thumbnailUrls : [];
        
        return {
          url: `${baseUrl}/articles/${video.articleSlug}`,
          videoUrl: video.videoUrl!,
          thumbnailUrl: thumbnailUrls[0] || `${baseUrl}/default-thumbnail.jpg`,
          title: video.articleTitle || 'Video',
          description: this.extractVideoDescription(video.script || ''),
          duration: Math.floor(video.durationSeconds || 30),
          uploadDate: video.createdAt || new Date()
        };
      });

    const xml = this.generateVideoSitemapXML(videoEntries);
    
    const filename = `sitemap-videos-${siteId}.xml`;
    const filepath = path.join(this.sitemapDir, filename);
    fs.writeFileSync(filepath, xml);

    return filename;
  }

  /**
   * Generate sitemap index
   */
  private async generateSitemapIndex(siteId: string, baseUrl: string, sitemaps: {
    mainSitemap: string;
    videoSitemap?: string;
  }): Promise<string> {
    const sitemapEntries = [
      {
        url: `${baseUrl}/sitemaps/${sitemaps.mainSitemap}`,
        lastModified: new Date()
      }
    ];

    if (sitemaps.videoSitemap) {
      sitemapEntries.push({
        url: `${baseUrl}/sitemaps/${sitemaps.videoSitemap}`,
        lastModified: new Date()
      });
    }

    const xml = this.generateSitemapIndexXML(sitemapEntries);
    
    const filename = `sitemap-index-${siteId}.xml`;
    const filepath = path.join(this.sitemapDir, filename);
    fs.writeFileSync(filepath, xml);

    return filename;
  }

  /**
   * Generate sitemap XML
   */
  private generateSitemapXML(entries: SitemapEntry[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    entries.forEach(entry => {
      xml += '  <url>\n';
      xml += `    <loc>${this.escapeXml(entry.url)}</loc>\n`;
      xml += `    <lastmod>${entry.lastModified.toISOString()}</lastmod>\n`;
      xml += `    <changefreq>${entry.changeFreq}</changefreq>\n`;
      xml += `    <priority>${entry.priority.toFixed(1)}</priority>\n`;
      xml += '  </url>\n';
    });

    xml += '</urlset>';
    return xml;
  }

  /**
   * Generate video sitemap XML
   */
  private generateVideoSitemapXML(entries: VideoSitemapEntry[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
    xml += '        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n';

    entries.forEach(entry => {
      xml += '  <url>\n';
      xml += `    <loc>${this.escapeXml(entry.url)}</loc>\n`;
      xml += '    <video:video>\n';
      xml += `      <video:thumbnail_loc>${this.escapeXml(entry.thumbnailUrl)}</video:thumbnail_loc>\n`;
      xml += `      <video:title>${this.escapeXml(entry.title)}</video:title>\n`;
      xml += `      <video:description>${this.escapeXml(entry.description)}</video:description>\n`;
      xml += `      <video:content_loc>${this.escapeXml(entry.videoUrl)}</video:content_loc>\n`;
      xml += `      <video:duration>${entry.duration}</video:duration>\n`;
      xml += `      <video:upload_date>${entry.uploadDate.toISOString()}</video:upload_date>\n`;
      xml += '    </video:video>\n';
      xml += '  </url>\n';
    });

    xml += '</urlset>';
    return xml;
  }

  /**
   * Generate sitemap index XML
   */
  private generateSitemapIndexXML(entries: Array<{ url: string; lastModified: Date }>): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    entries.forEach(entry => {
      xml += '  <sitemap>\n';
      xml += `    <loc>${this.escapeXml(entry.url)}</loc>\n`;
      xml += `    <lastmod>${entry.lastModified.toISOString()}</lastmod>\n`;
      xml += '  </sitemap>\n';
    });

    xml += '</sitemapindex>';
    return xml;
  }

  /**
   * Calculate article priority based on word count and other factors
   */
  private calculateArticlePriority(wordCount: number): number {
    // Base priority for articles
    let priority = 0.7;
    
    // Boost for longer articles
    if (wordCount > 2000) priority += 0.2;
    else if (wordCount > 1000) priority += 0.1;
    
    // Cap at 0.9 (reserve 1.0 for homepage)
    return Math.min(priority, 0.9);
  }

  /**
   * Determine change frequency based on article age
   */
  private determineChangeFreq(publishedAt: Date | null): 'daily' | 'weekly' | 'monthly' {
    if (!publishedAt) return 'monthly';
    
    const daysSincePublished = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSincePublished < 7) return 'daily';
    if (daysSincePublished < 30) return 'weekly';
    return 'monthly';
  }

  /**
   * Extract video description from script
   */
  private extractVideoDescription(script: string): string {
    // Take first sentence or 160 characters, whichever is shorter
    const firstSentence = script.split(/[。！？]/)[0];
    const description = firstSentence.length > 160 
      ? script.substring(0, 157) + '...'
      : firstSentence;
    
    return description;
  }

  /**
   * Check if site has videos
   */
  private async checkHasVideos(siteId: string): Promise<boolean> {
    const videoCount = await db
      .select()
      .from(videos)
      .leftJoin(articles, eq(videos.topicId, articles.topicId))
      .where(and(
        eq(articles.siteId, siteId),
        eq(videos.status, 'published')
      ))
      .limit(1);

    return videoCount.length > 0;
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Generate RSS feed
   */
  async generateRSSFeed(siteId: string): Promise<string> {
    try {
      // Get site information
      const site = await db
        .select()
        .from(sites)
        .where(eq(sites.id, siteId))
        .limit(1);

      if (site.length === 0) {
        throw new Error(`Site not found: ${siteId}`);
      }

      const siteData = site[0];
      const baseUrl = siteData.deployUrl || `https://${siteData.domain}`;

      // Get latest articles
      const latestArticles = await db
        .select({
          title: articles.title,
          slug: articles.slug,
          html: articles.html,
          publishedAt: articles.publishedAt,
          updatedAt: articles.updatedAt
        })
        .from(articles)
        .where(and(
          eq(articles.siteId, siteId),
          eq(articles.status, 'published')
        ))
        .orderBy(desc(articles.publishedAt))
        .limit(20);

      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n';
      xml += '  <channel>\n';
      xml += `    <title>${this.escapeXml(siteData.niche)} - ${this.escapeXml(siteData.domain)}</title>\n`;
      xml += `    <link>${baseUrl}</link>\n`;
      xml += `    <description>最新の${this.escapeXml(siteData.niche)}情報をお届けします</description>\n`;
      xml += `    <language>ja</language>\n`;
      xml += `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n`;
      xml += `    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />\n`;

      latestArticles.forEach(article => {
        if (article.slug && article.publishedAt) {
          const articleUrl = `${baseUrl}/articles/${article.slug}`;
          const description = this.extractExcerpt(article.html || '');
          
          xml += '    <item>\n';
          xml += `      <title>${this.escapeXml(article.title)}</title>\n`;
          xml += `      <link>${articleUrl}</link>\n`;
          xml += `      <description>${this.escapeXml(description)}</description>\n`;
          xml += `      <pubDate>${article.publishedAt.toUTCString()}</pubDate>\n`;
          xml += `      <guid>${articleUrl}</guid>\n`;
          xml += '    </item>\n';
        }
      });

      xml += '  </channel>\n';
      xml += '</rss>';

      // Save RSS feed
      const filename = `rss-${siteId}.xml`;
      const filepath = path.join(this.sitemapDir, filename);
      fs.writeFileSync(filepath, xml);

      return filename;

    } catch (error) {
      console.error('RSS feed generation failed:', error);
      throw error;
    }
  }

  /**
   * Extract excerpt from HTML content
   */
  private extractExcerpt(html: string): string {
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return text.length > 200 ? text.substring(0, 197) + '...' : text;
  }

  /**
   * Ping search engines about sitemap updates
   */
  async pingSearchEngines(siteId: string, baseUrl: string): Promise<{
    google: boolean;
    bing: boolean;
  }> {
    const sitemapUrl = `${baseUrl}/sitemaps/sitemap-index-${siteId}.xml`;
    
    const results = {
      google: false,
      bing: false
    };

    try {
      // Ping Google
      const googleUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
      const googleResponse = await fetch(googleUrl);
      results.google = googleResponse.ok;
    } catch (error) {
      console.error('Failed to ping Google:', error);
    }

    try {
      // Ping Bing
      const bingUrl = `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
      const bingResponse = await fetch(bingUrl);
      results.bing = bingResponse.ok;
    } catch (error) {
      console.error('Failed to ping Bing:', error);
    }

    return results;
  }
}

export const seoSitemapService = new SEOSitemapService();
export { SEOSitemapService, SitemapEntry, VideoSitemapEntry };