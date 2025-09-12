import fetch from 'node-fetch';

interface CreateSiteRequest {
  niche: string;
  cms: 'strapi' | 'ghost' | 'wp';
  host: 'vercel' | 'cloudflare' | 'wp';
  domain?: string; // If not provided, will use subdomain
  templateRepo?: string;
}

interface CreateSiteResponse {
  success: boolean;
  siteId?: string;
  domain: string;
  repoUrl?: string;
  deployUrl?: string;
  cmsCredentials?: {
    url: string;
    apiKey: string;
    username?: string;
    password?: string;
  };
  error?: string;
}

interface GitHubRepoResponse {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  clone_url: string;
}

interface VercelDeployResponse {
  id: string;
  url: string;
  readyState: string;
}

interface CloudflarePagesResponse {
  id: string;
  name: string;
  subdomain: string;
  domains: string[];
}

/**
 * Website Factory Service - Create new sites automatically
 * Based on the code seed from problem statement
 */
class WebsiteFactoryService {
  private githubToken: string;
  private vercelToken: string;
  private cloudflareToken: string;
  private cloudflareAccountId: string;
  private rootDomain: string;

  constructor() {
    this.githubToken = process.env.GITHUB_TOKEN || '';
    this.vercelToken = process.env.VERCEL_TOKEN || '';
    this.cloudflareToken = process.env.CLOUDFLARE_API_TOKEN || '';
    this.cloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
    this.rootDomain = process.env.ROOT_DOMAIN || 'example.com';

    if (!this.githubToken || !this.vercelToken || !this.cloudflareToken) {
      console.warn('Website Factory credentials not fully configured. Set GITHUB_TOKEN, VERCEL_TOKEN, and CLOUDFLARE_API_TOKEN.');
    }
  }

  /**
   * Create a complete new site with hosting, CMS, and content
   */
  async createSite(request: CreateSiteRequest): Promise<CreateSiteResponse> {
    try {
      console.log(`Creating new site for niche: ${request.niche}`);

      // 1. Generate site configuration
      const siteConfig = await this.generateSiteConfig(request);

      // 2. Create GitHub repository from template
      const repoResult = await this.createRepoFromTemplate({
        name: siteConfig.repoName,
        owner: process.env.TEMPLATE_REPO_OWNER || 'your-github-username',
        templateOwner: process.env.TEMPLATE_REPO_OWNER || 'your-github-username',
        templateRepo: request.templateRepo || 'nextjs-blog-template'
      });

      if (!repoResult.success || !repoResult.repo) {
        throw new Error(`Failed to create repository: ${repoResult.error}`);
      }

      // 3. Setup hosting
      let deployResult;
      switch (request.host) {
        case 'vercel':
          deployResult = await this.deployToVercel(repoResult.repo, siteConfig);
          break;
        case 'cloudflare':
          deployResult = await this.deployToCloudflare(repoResult.repo, siteConfig);
          break;
        default:
          throw new Error(`Unsupported hosting provider: ${request.host}`);
      }

      if (!deployResult.success) {
        throw new Error(`Deployment failed: ${deployResult.error}`);
      }

      // 4. Setup DNS
      const dnsResult = await this.setupDNS(siteConfig.domain, deployResult.deployUrl);
      if (!dnsResult.success) {
        console.warn(`DNS setup failed: ${dnsResult.error}`);
      }

      // 5. Bootstrap CMS
      let cmsResult;
      if (request.cms !== 'wp') {
        cmsResult = await this.bootstrapCMS(request.cms, siteConfig);
        if (!cmsResult.success) {
          console.warn(`CMS bootstrap failed: ${cmsResult.error}`);
        }
      }

      // 6. Generate branding and default pages
      await this.generateBranding(siteConfig);
      await this.createDefaultPages(repoResult.repo, siteConfig);

      // 7. Store in database
      const siteId = await this.storeSiteInDB({
        domain: siteConfig.domain,
        niche: request.niche,
        repoUrl: repoResult.repo.html_url,
        deployUrl: deployResult.deployUrl,
        host: request.host,
        cms: request.cms,
        cmsCredentials: cmsResult?.credentials
      });

      return {
        success: true,
        siteId,
        domain: siteConfig.domain,
        repoUrl: repoResult.repo.html_url,
        deployUrl: deployResult.deployUrl,
        cmsCredentials: cmsResult?.credentials
      };

    } catch (error) {
      console.error('Site creation failed:', error);
      return {
        success: false,
        domain: request.domain || `${this.slugify(request.niche)}.${this.rootDomain}`,
        error: error.message
      };
    }
  }

  /**
   * Generate site configuration
   */
  private async generateSiteConfig(request: CreateSiteRequest) {
    const nicheSlug = this.slugify(request.niche);
    const timestamp = Date.now().toString(36);
    
    return {
      repoName: `${nicheSlug}-${timestamp}`,
      domain: request.domain || `${nicheSlug}.${this.rootDomain}`,
      subdomain: nicheSlug,
      siteName: this.toTitleCase(request.niche),
      description: `${request.niche}に関する最新情報をお届けするサイト`,
      brandColors: await this.generateBrandColors(request.niche),
      keywords: await this.generateKeywords(request.niche)
    };
  }

  /**
   * Create repository from template (based on code seed)
   */
  async createRepoFromTemplate(params: {
    name: string;
    owner: string;
    templateOwner: string;
    templateRepo: string;
  }): Promise<{
    success: boolean;
    repo?: GitHubRepoResponse;
    error?: string;
  }> {
    try {
      const { name, owner, templateOwner, templateRepo } = params;
      
      const response = await fetch(`https://api.github.com/repos/${templateOwner}/${templateRepo}/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.githubToken}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          owner,
          name,
          private: false,
          include_all_branches: false
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitHub API error: ${response.status} ${errorText}`);
      }

      const repo = await response.json() as GitHubRepoResponse;
      
      return {
        success: true,
        repo
      };

    } catch (error) {
      console.error('Repository creation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Deploy to Vercel
   */
  private async deployToVercel(repo: GitHubRepoResponse, config: any): Promise<{
    success: boolean;
    deployUrl?: string;
    error?: string;
  }> {
    try {
      const response = await fetch('https://api.vercel.com/v13/deployments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.vercelToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: config.repoName,
          gitSource: {
            type: 'github',
            repo: repo.full_name,
            ref: 'main'
          },
          env: {
            SITE_NAME: config.siteName,
            SITE_DESCRIPTION: config.description,
            SITE_DOMAIN: config.domain
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Vercel deployment failed: ${response.status} ${errorText}`);
      }

      const deployment = await response.json() as VercelDeployResponse;
      
      return {
        success: true,
        deployUrl: `https://${deployment.url}`
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Deploy to Cloudflare Pages
   */
  private async deployToCloudflare(repo: GitHubRepoResponse, config: any): Promise<{
    success: boolean;
    deployUrl?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${this.cloudflareAccountId}/pages/projects`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.cloudflareToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: config.repoName,
          source: {
            type: 'github',
            config: {
              owner: repo.full_name.split('/')[0],
              repo_name: repo.name,
              production_branch: 'main'
            }
          },
          build_config: {
            build_command: 'npm run build',
            destination_dir: 'out'
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cloudflare Pages deployment failed: ${response.status} ${errorText}`);
      }

      const project = await response.json() as { result: CloudflarePagesResponse };
      
      return {
        success: true,
        deployUrl: `https://${project.result.subdomain}.pages.dev`
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Setup DNS using Cloudflare API
   */
  private async setupDNS(domain: string, targetUrl: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Extract zone from domain
      const domainParts = domain.split('.');
      const zone = domainParts.slice(-2).join('.');
      
      // Get zone ID
      const zonesResponse = await fetch(`https://api.cloudflare.com/client/v4/zones?name=${zone}`, {
        headers: {
          'Authorization': `Bearer ${this.cloudflareToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!zonesResponse.ok) {
        throw new Error(`Failed to get zone information`);
      }

      const zonesData = await zonesResponse.json() as any;
      if (zonesData.result.length === 0) {
        throw new Error(`Zone not found: ${zone}`);
      }

      const zoneId = zonesData.result[0].id;
      
      // Create DNS record
      const recordResponse = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.cloudflareToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'CNAME',
          name: domain,
          content: new URL(targetUrl).hostname,
          ttl: 1 // Auto
        })
      });

      if (!recordResponse.ok) {
        const errorText = await recordResponse.text();
        throw new Error(`DNS record creation failed: ${errorText}`);
      }

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Bootstrap CMS (Strapi/Ghost)
   */
  private async bootstrapCMS(cms: 'strapi' | 'ghost', config: any): Promise<{
    success: boolean;
    credentials?: any;
    error?: string;
  }> {
    // TODO: Implement actual CMS bootstrapping
    // This would involve deploying CMS instances via Docker/Railway/Render
    console.log(`Bootstrapping ${cms} for ${config.domain} - not yet implemented`);
    
    return {
      success: false,
      error: `${cms} bootstrapping not yet implemented`
    };
  }

  /**
   * Generate branding (colors, logo)
   */
  private async generateBranding(config: any): Promise<void> {
    // TODO: Implement automatic logo/branding generation
    // This would integrate with design APIs or AI image generation
    console.log(`Generating branding for ${config.siteName}`);
  }

  /**
   * Create default pages (privacy, terms, etc.)
   */
  private async createDefaultPages(repo: GitHubRepoResponse, config: any): Promise<void> {
    // TODO: Commit default pages to the repository
    // This would use GitHub API to create/update files
    console.log(`Creating default pages for ${repo.name}`);
  }

  /**
   * Store site information in database
   */
  private async storeSiteInDB(data: {
    domain: string;
    niche: string;
    repoUrl: string;
    deployUrl: string;
    host: string;
    cms: string;
    cmsCredentials?: any;
  }): Promise<string> {
    // TODO: Store in database using Drizzle
    // For now, return mock ID
    return `site_${Date.now()}`;
  }

  /**
   * Generate brand colors based on niche
   */
  private async generateBrandColors(niche: string): Promise<{
    primary: string;
    secondary: string;
    accent: string;
  }> {
    // Simple color mapping - in production, use AI generation
    const colorSchemes = {
      '美容': { primary: '#ff6b9d', secondary: '#ffc3d7', accent: '#c73650' },
      '料理': { primary: '#ff8c42', secondary: '#ffd23f', accent: '#ee6352' },
      '健康': { primary: '#06d6a0', secondary: '#118ab2', accent: '#073b4c' },
      'テック': { primary: '#3a86ff', secondary: '#6c5ce7', accent: '#2d3436' },
      default: { primary: '#007bff', secondary: '#6c757d', accent: '#dc3545' }
    };

    return colorSchemes[niche] || colorSchemes.default;
  }

  /**
   * Generate keywords for niche
   */
  private async generateKeywords(niche: string): Promise<string[]> {
    // Simple keyword generation - in production, use research service
    return [
      niche,
      `${niche} おすすめ`,
      `${niche} 比較`,
      `${niche} ランキング`,
      `${niche} 口コミ`
    ];
  }

  /**
   * Utility: Convert string to slug
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9ひらがなカタカナ漢字]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 30);
  }

  /**
   * Utility: Convert to title case
   */
  private toTitleCase(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  /**
   * Test all service connections
   */
  async testConnections(): Promise<{
    github: boolean;
    vercel: boolean;
    cloudflare: boolean;
  }> {
    const results = {
      github: false,
      vercel: false,
      cloudflare: false
    };

    try {
      const githubResponse = await fetch('https://api.github.com/user', {
        headers: { 'Authorization': `Bearer ${this.githubToken}` }
      });
      results.github = githubResponse.ok;
    } catch (e) {
      console.log('GitHub connection failed');
    }

    try {
      const vercelResponse = await fetch('https://api.vercel.com/v2/user', {
        headers: { 'Authorization': `Bearer ${this.vercelToken}` }
      });
      results.vercel = vercelResponse.ok;
    } catch (e) {
      console.log('Vercel connection failed');
    }

    try {
      const cloudflareResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${this.cloudflareAccountId}`, {
        headers: { 'Authorization': `Bearer ${this.cloudflareToken}` }
      });
      results.cloudflare = cloudflareResponse.ok;
    } catch (e) {
      console.log('Cloudflare connection failed');
    }

    return results;
  }
}

export const websiteFactory = new WebsiteFactoryService();
export { WebsiteFactoryService, CreateSiteRequest, CreateSiteResponse };