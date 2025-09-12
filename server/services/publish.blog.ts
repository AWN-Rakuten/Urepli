import fetch from 'node-fetch';
import FormData from 'form-data';

interface PublishRequest {
  title: string;
  content: string; // HTML content
  excerpt?: string;
  tags?: string[];
  categories?: string[];
  images?: Array<{
    url: string;
    alt?: string;
    caption?: string;
  }>;
  slug?: string;
  status?: 'draft' | 'publish' | 'private';
  scheduledDate?: Date;
}

interface PublishResponse {
  success: boolean;
  url?: string;
  id?: string | number;
  error?: string;
}

interface MediaUploadResponse {
  id: number;
  url: string;
  title: string;
  alt_text: string;
}

/**
 * WordPress REST API Publisher
 * Based on the code seed from problem statement
 */
class WordPressPublisher {
  private baseUrl: string;
  private username: string;
  private applicationPassword: string;

  constructor() {
    this.baseUrl = process.env.WP_URL || '';
    this.username = process.env.WP_USER || '';
    this.applicationPassword = process.env.WP_APP_PW || '';

    if (!this.baseUrl || !this.username || !this.applicationPassword) {
      console.warn('WordPress credentials not configured. Set WP_URL, WP_USER, and WP_APP_PW environment variables.');
    }
  }

  /**
   * Publish article to WordPress
   */
  async publish(article: PublishRequest): Promise<PublishResponse> {
    try {
      if (!this.baseUrl) {
        throw new Error('WordPress URL not configured');
      }

      const token = Buffer.from(`${this.username}:${this.applicationPassword}`).toString('base64');

      // 1) Upload media (first image as featured)
      let featuredMediaId: number | undefined;
      if (article.images && article.images.length > 0) {
        const uploadResult = await this.uploadImage(article.images[0]);
        if (uploadResult) {
          featuredMediaId = uploadResult.id;
        }
      }

      // 2) Create post
      const postData = {
        title: article.title,
        content: article.content,
        excerpt: article.excerpt || '',
        status: article.status || 'publish',
        slug: article.slug || this.generateSlug(article.title),
        tags: article.tags || [],
        categories: this.mapCategories(article.categories || []),
        featured_media: featuredMediaId,
        meta: {
          affiliate_disclosure: '本コンテンツには広告（アフィリエイトリンク）を含みます。'
        },
        date: article.scheduledDate ? article.scheduledDate.toISOString() : undefined
      };

      const response = await fetch(`${this.baseUrl}/wp-json/wp/v2/posts`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`WordPress publish failed: ${response.status} ${errorText}`);
      }

      const result = await response.json() as any;
      
      return {
        success: true,
        url: result.link,
        id: result.id
      };

    } catch (error) {
      console.error('WordPress publishing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Upload image to WordPress media library
   */
  private async uploadImage(image: { url: string; alt?: string; caption?: string }): Promise<MediaUploadResponse | null> {
    try {
      const token = Buffer.from(`${this.username}:${this.applicationPassword}`).toString('base64');
      
      // Download image first
      const imageResponse = await fetch(image.url);
      if (!imageResponse.ok) {
        console.error(`Failed to download image: ${image.url}`);
        return null;
      }

      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      const filename = image.url.split('/').pop() || 'image.jpg';

      // Create form data for upload
      const formData = new FormData();
      formData.append('file', imageBuffer, filename);
      formData.append('title', image.caption || 'Blog Image');
      formData.append('alt_text', image.alt || '');

      const uploadResponse = await fetch(`${this.baseUrl}/wp-json/wp/v2/media`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${token}`
        },
        body: formData
      });

      if (!uploadResponse.ok) {
        console.error(`Media upload failed: ${uploadResponse.status}`);
        return null;
      }

      const result = await uploadResponse.json() as any;
      return {
        id: result.id,
        url: result.source_url,
        title: result.title.rendered,
        alt_text: result.alt_text
      };

    } catch (error) {
      console.error('Image upload error:', error);
      return null;
    }
  }

  /**
   * Map category names to WordPress category IDs
   */
  private mapCategories(categories: string[]): number[] {
    // In production, this would query WordPress for category IDs
    // For now, return empty array
    return [];
  }

  /**
   * Generate URL slug from title
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9ひらがなカタカナ漢字\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }

  /**
   * Test WordPress connection
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.baseUrl) return false;
      
      const response = await fetch(`${this.baseUrl}/wp-json/wp/v2/posts?per_page=1`);
      return response.ok;
    } catch (error) {
      console.error('WordPress connection test failed:', error);
      return false;
    }
  }
}

/**
 * Strapi Headless CMS Publisher
 */
class StrapiPublisher {
  private baseUrl: string;
  private apiToken: string;

  constructor() {
    this.baseUrl = process.env.STRAPI_URL || 'http://localhost:1337';
    this.apiToken = process.env.STRAPI_API_TOKEN || '';
  }

  async publish(article: PublishRequest): Promise<PublishResponse> {
    try {
      if (!this.apiToken) {
        throw new Error('Strapi API token not configured');
      }

      // Upload images first
      const uploadedImages = await Promise.all(
        (article.images || []).map(image => this.uploadImage(image))
      );

      const validImages = uploadedImages.filter(img => img !== null);

      const postData = {
        data: {
          title: article.title,
          content: article.content,
          excerpt: article.excerpt,
          slug: article.slug || this.generateSlug(article.title),
          publishedAt: article.status === 'publish' ? new Date().toISOString() : null,
          featuredImage: validImages[0]?.id || null,
          images: validImages.map(img => img!.id),
          tags: article.tags,
          categories: article.categories,
          seo: {
            metaDescription: article.excerpt
          }
        }
      };

      const response = await fetch(`${this.baseUrl}/api/articles`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Strapi publish failed: ${response.status} ${errorText}`);
      }

      const result = await response.json() as any;
      
      return {
        success: true,
        url: `${this.baseUrl}/articles/${result.data.attributes.slug}`,
        id: result.data.id
      };

    } catch (error) {
      console.error('Strapi publishing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async uploadImage(image: { url: string; alt?: string }): Promise<{ id: number; url: string } | null> {
    try {
      // Download and upload to Strapi
      const imageResponse = await fetch(image.url);
      if (!imageResponse.ok) return null;

      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      const filename = image.url.split('/').pop() || 'image.jpg';

      const formData = new FormData();
      formData.append('files', imageBuffer, filename);

      const uploadResponse = await fetch(`${this.baseUrl}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`
        },
        body: formData
      });

      if (!uploadResponse.ok) return null;

      const result = await uploadResponse.json() as any;
      return {
        id: result[0].id,
        url: result[0].url
      };

    } catch (error) {
      console.error('Strapi image upload error:', error);
      return null;
    }
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/articles?pagination[pageSize]=1`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Ghost Headless CMS Publisher
 */
class GhostPublisher {
  private baseUrl: string;
  private adminApiKey: string;

  constructor() {
    this.baseUrl = process.env.GHOST_URL || 'http://localhost:2368';
    this.adminApiKey = process.env.GHOST_ADMIN_API_KEY || '';
  }

  async publish(article: PublishRequest): Promise<PublishResponse> {
    try {
      if (!this.adminApiKey) {
        throw new Error('Ghost Admin API key not configured');
      }

      // Ghost uses JWT for admin API - would need proper implementation
      // This is a simplified version
      const postData = {
        posts: [{
          title: article.title,
          html: article.content,
          excerpt: article.excerpt,
          slug: article.slug || this.generateSlug(article.title),
          status: article.status === 'publish' ? 'published' : 'draft',
          tags: article.tags?.map(tag => ({ name: tag })) || [],
          published_at: article.scheduledDate?.toISOString()
        }]
      };

      // Note: Ghost requires JWT token generation which is complex
      // This is a placeholder implementation
      console.log('Ghost publishing not fully implemented - requires JWT token generation');
      
      return {
        success: false,
        error: 'Ghost publisher requires JWT implementation'
      };

    } catch (error) {
      console.error('Ghost publishing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/ghost/api/v4/content/posts/?limit=1`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Unified Blog Publisher that can target multiple platforms
 */
class UnifiedBlogPublisher {
  private wordpress: WordPressPublisher;
  private strapi: StrapiPublisher;
  private ghost: GhostPublisher;

  constructor() {
    this.wordpress = new WordPressPublisher();
    this.strapi = new StrapiPublisher();
    this.ghost = new GhostPublisher();
  }

  async publish(article: PublishRequest, targets: Array<'wordpress' | 'strapi' | 'ghost'> = ['wordpress']): Promise<{
    [platform: string]: PublishResponse;
  }> {
    const results: { [platform: string]: PublishResponse } = {};

    const publishPromises = targets.map(async (target) => {
      let result: PublishResponse;
      
      try {
        switch (target) {
          case 'wordpress':
            result = await this.wordpress.publish(article);
            break;
          case 'strapi':
            result = await this.strapi.publish(article);
            break;
          case 'ghost':
            result = await this.ghost.publish(article);
            break;
          default:
            result = { success: false, error: `Unknown target: ${target}` };
        }
      } catch (error) {
        result = { success: false, error: error.message };
      }
      
      results[target] = result;
      return result;
    });

    await Promise.allSettled(publishPromises);
    return results;
  }

  async testAllConnections(): Promise<{ [platform: string]: boolean }> {
    const [wpTest, strapiTest, ghostTest] = await Promise.allSettled([
      this.wordpress.testConnection(),
      this.strapi.testConnection(),
      this.ghost.testConnection()
    ]);

    return {
      wordpress: wpTest.status === 'fulfilled' ? wpTest.value : false,
      strapi: strapiTest.status === 'fulfilled' ? strapiTest.value : false,
      ghost: ghostTest.status === 'fulfilled' ? ghostTest.value : false
    };
  }
}

export const blogPublisher = new UnifiedBlogPublisher();
export { UnifiedBlogPublisher, WordPressPublisher, StrapiPublisher, GhostPublisher };
export type { PublishRequest, PublishResponse };