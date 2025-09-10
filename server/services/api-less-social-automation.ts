import { chromium, firefox, webkit, Browser, Page, BrowserContext } from 'playwright';
import UserAgent from 'user-agents';
import { MCPServer } from './mcp-server';

export interface BrowserOptions {
  headless?: boolean;
  proxy?: {
    server: string;
    username?: string;
    password?: string;
  };
  userAgent?: string;
  viewport?: {
    width: number;
    height: number;
  };
  geolocation?: {
    latitude: number;
    longitude: number;
  };
  timezone?: string;
  locale?: string;
  stealth?: boolean;
}

export interface SocialMediaLoginCredentials {
  platform: 'tiktok' | 'instagram' | 'youtube' | 'twitter' | 'facebook';
  username: string;
  password: string;
  accountId: string;
  twoFactorSecret?: string;
}

export interface PostingContent {
  text?: string;
  imageUrl?: string;
  videoUrl?: string;
  hashtags?: string[];
  schedule?: Date;
  location?: string;
}

export interface AccountFingerprint {
  userAgent: string;
  viewport: { width: number; height: number };
  timezone: string;
  locale: string;
  platform: string;
  webglRenderer: string;
  languages: string[];
  canvas: string;
  webrtc: boolean;
}

export interface PostingResult {
  success: boolean;
  platform: string;
  accountId: string;
  postId?: string;
  url?: string;
  error?: string;
  timestamp: Date;
  engagement?: {
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
  };
}

/**
 * Enhanced Browser Automation for API-less Social Media Integration
 * Uses latest stealth techniques and human-like behavior patterns
 */
export class APILessSocialMediaAutomation {
  private browser: Browser | null = null;
  private contexts: Map<string, BrowserContext> = new Map();
  private pages: Map<string, Page> = new Map();
  private fingerprints: Map<string, AccountFingerprint> = new Map();
  private mcpServer?: MCPServer;

  constructor(mcpServer?: MCPServer) {
    this.mcpServer = mcpServer;
  }

  /**
   * Initialize browser with enhanced stealth capabilities
   */
  async initialize(options: BrowserOptions = {}): Promise<void> {
    const browserOptions = {
      headless: options.headless ?? true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        // Enhanced stealth args
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-blink-features=AutomationControlled',
        '--disable-extensions-http-throttling',
        '--disable-component-extensions-with-background-pages'
      ]
    };

    this.browser = await chromium.launch(browserOptions);
    console.log('Enhanced browser automation initialized with stealth capabilities');
  }

  /**
   * Generate realistic account fingerprint with human-like characteristics
   */
  generateAccountFingerprint(accountId: string): AccountFingerprint {
    if (this.fingerprints.has(accountId)) {
      return this.fingerprints.get(accountId)!;
    }

    const userAgent = new UserAgent();
    const platforms = ['Win32', 'MacIntel', 'Linux x86_64'];
    const renderers = [
      'Intel Iris OpenGL Engine',
      'ANGLE (NVIDIA GeForce GTX 1060',
      'AMD Radeon Pro 560X OpenGL Engine'
    ];
    
    const fingerprint: AccountFingerprint = {
      userAgent: userAgent.toString(),
      viewport: this.randomViewport(),
      timezone: 'Asia/Tokyo',
      locale: 'ja-JP',
      platform: platforms[Math.floor(Math.random() * platforms.length)],
      webglRenderer: renderers[Math.floor(Math.random() * renderers.length)],
      languages: ['ja-JP', 'ja', 'en-US', 'en'],
      canvas: this.generateCanvasFingerprint(),
      webrtc: Math.random() > 0.5
    };

    this.fingerprints.set(accountId, fingerprint);
    return fingerprint;
  }

  /**
   * Create isolated browser context for each account
   */
  async createAccountContext(accountId: string, options: BrowserOptions = {}): Promise<BrowserContext> {
    if (!this.browser) {
      await this.initialize(options);
    }

    const fingerprint = this.generateAccountFingerprint(accountId);
    
    const context = await this.browser!.newContext({
      userAgent: fingerprint.userAgent,
      viewport: fingerprint.viewport,
      locale: fingerprint.locale,
      timezoneId: fingerprint.timezone,
      geolocation: options.geolocation,
      proxy: options.proxy,
      ignoreHTTPSErrors: true,
      bypassCSP: true,
      // Enhanced stealth options
      extraHTTPHeaders: {
        'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none'
      }
    });

    // Enhanced stealth setup
    await this.setupStealthContext(context, fingerprint);
    
    this.contexts.set(accountId, context);
    return context;
  }

  /**
   * Setup advanced stealth measures for context
   */
  private async setupStealthContext(context: BrowserContext, fingerprint: AccountFingerprint): Promise<void> {
    // Override webdriver detection
    await context.addInitScript(() => {
      // Remove webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // Override plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          {
            description: 'Portable Document Format',
            filename: 'internal-pdf-viewer',
            name: 'Chrome PDF Plugin'
          }
        ]
      });

      // Override chrome object
      (window as any).chrome = {
        runtime: {
          onConnect: null,
          onMessage: null
        }
      };

      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );
    });

    // Set consistent fingerprint properties
    await context.addInitScript((fp) => {
      Object.defineProperty(navigator, 'platform', {
        get: () => fp.platform
      });

      Object.defineProperty(navigator, 'languages', {
        get: () => fp.languages
      });

      // Canvas fingerprint spoofing
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type: string, ...args) {
        if (type === '2d') {
          const context = getContext.apply(this, [type, ...args]);
          const getImageData = context.getImageData;
          context.getImageData = function(...args) {
            const imageData = getImageData.apply(this, args);
            // Add slight noise to avoid detection
            for (let i = 0; i < imageData.data.length; i += 4) {
              imageData.data[i] = Math.min(255, imageData.data[i] + Math.floor(Math.random() * 3) - 1);
            }
            return imageData;
          };
          return context;
        }
        return getContext.apply(this, [type, ...args]);
      };
    }, fingerprint);
  }

  /**
   * Login to social media platform with human-like behavior
   */
  async loginToAccount(credentials: SocialMediaLoginCredentials): Promise<boolean> {
    const context = await this.createAccountContext(credentials.accountId);
    const page = await context.newPage();
    
    this.pages.set(credentials.accountId, page);

    try {
      switch (credentials.platform) {
        case 'tiktok':
          return await this.loginToTikTok(page, credentials);
        case 'instagram':
          return await this.loginToInstagram(page, credentials);
        case 'youtube':
          return await this.loginToYouTube(page, credentials);
        case 'twitter':
          return await this.loginToTwitter(page, credentials);
        default:
          throw new Error(`Platform ${credentials.platform} not supported`);
      }
    } catch (error) {
      console.error(`Login failed for ${credentials.platform}:`, error);
      return false;
    }
  }

  /**
   * Post content to social media platform without API
   */
  async postContent(
    accountId: string, 
    platform: string, 
    content: PostingContent
  ): Promise<PostingResult> {
    const page = this.pages.get(accountId);
    if (!page) {
      throw new Error(`No active session for account ${accountId}`);
    }

    const startTime = Date.now();
    
    try {
      let result: PostingResult;
      
      switch (platform) {
        case 'tiktok':
          result = await this.postToTikTok(page, accountId, content);
          break;
        case 'instagram':
          result = await this.postToInstagram(page, accountId, content);
          break;
        case 'youtube':
          result = await this.postToYouTube(page, accountId, content);
          break;
        case 'twitter':
          result = await this.postToTwitter(page, accountId, content);
          break;
        default:
          throw new Error(`Platform ${platform} not supported`);
      }

      // Notify MCP server of successful post
      if (this.mcpServer && result.success) {
        console.log(`Successfully posted to ${platform} via browser automation`);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        platform,
        accountId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Enhanced TikTok login with latest selectors and human behavior
   */
  private async loginToTikTok(page: Page, credentials: SocialMediaLoginCredentials): Promise<boolean> {
    await page.goto('https://www.tiktok.com/login', { waitUntil: 'networkidle' });
    
    // Wait for page to load and use human-like delays
    await this.humanDelay(2000, 4000);
    
    // Click on "Use phone / email / username" option
    await page.click('[data-e2e="login-phone-email"]', { timeout: 10000 });
    await this.humanDelay(1000, 2000);
    
    // Fill username with human-like typing
    await this.humanType(page, '[name="username"]', credentials.username);
    await this.humanDelay(500, 1000);
    
    // Fill password
    await this.humanType(page, '[type="password"]', credentials.password);
    await this.humanDelay(1000, 2000);
    
    // Click login button
    await page.click('[data-e2e="login-button"]');
    
    // Wait for login to complete or handle 2FA
    try {
      await page.waitForSelector('[data-e2e="profile-icon"]', { timeout: 30000 });
      return true;
    } catch {
      // Check for 2FA
      if (await page.isVisible('[data-e2e="verification-code-input"]')) {
        if (credentials.twoFactorSecret) {
          // Handle 2FA if secret is provided
          // Implementation for TOTP generation would go here
          console.log('2FA required for TikTok login');
        }
      }
      return false;
    }
  }

  /**
   * Enhanced Instagram login
   */
  private async loginToInstagram(page: Page, credentials: SocialMediaLoginCredentials): Promise<boolean> {
    await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle' });
    
    await this.humanDelay(2000, 4000);
    
    // Wait for login form
    await page.waitForSelector('input[name="username"]', { timeout: 10000 });
    
    // Fill credentials with human-like behavior
    await this.humanType(page, 'input[name="username"]', credentials.username);
    await this.humanDelay(500, 1000);
    
    await this.humanType(page, 'input[name="password"]', credentials.password);
    await this.humanDelay(1000, 2000);
    
    // Click login
    await page.click('button[type="submit"]');
    
    try {
      // Wait for successful login or 2FA
      await page.waitForSelector('svg[aria-label="Home"]', { timeout: 30000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Enhanced YouTube login
   */
  private async loginToYouTube(page: Page, credentials: SocialMediaLoginCredentials): Promise<boolean> {
    await page.goto('https://accounts.google.com/signin', { waitUntil: 'networkidle' });
    
    await this.humanDelay(2000, 4000);
    
    // Google login flow
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await this.humanType(page, 'input[type="email"]', credentials.username);
    await page.click('#identifierNext');
    
    await this.humanDelay(2000, 3000);
    
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });
    await this.humanType(page, 'input[type="password"]', credentials.password);
    await page.click('#passwordNext');
    
    try {
      await page.waitForURL('**/myaccount.google.com/**', { timeout: 30000 });
      
      // Navigate to YouTube
      await page.goto('https://www.youtube.com', { waitUntil: 'networkidle' });
      await page.waitForSelector('#avatar-btn', { timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Enhanced Twitter login
   */
  private async loginToTwitter(page: Page, credentials: SocialMediaLoginCredentials): Promise<boolean> {
    await page.goto('https://twitter.com/i/flow/login', { waitUntil: 'networkidle' });
    
    await this.humanDelay(2000, 4000);
    
    // New Twitter login flow
    await page.waitForSelector('input[name="text"]', { timeout: 10000 });
    await this.humanType(page, 'input[name="text"]', credentials.username);
    
    await page.click('[role="button"]:has-text("Next")');
    await this.humanDelay(1000, 2000);
    
    await page.waitForSelector('input[name="password"]', { timeout: 10000 });
    await this.humanType(page, 'input[name="password"]', credentials.password);
    
    await page.click('[data-testid="LoginForm_Login_Button"]');
    
    try {
      await page.waitForSelector('[data-testid="SideNav_AccountSwitcher_Button"]', { timeout: 30000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Post to TikTok with enhanced automation
   */
  private async postToTikTok(page: Page, accountId: string, content: PostingContent): Promise<PostingResult> {
    try {
      // Navigate to upload page
      await page.goto('https://www.tiktok.com/upload', { waitUntil: 'networkidle' });
      await this.humanDelay(2000, 4000);

      if (content.videoUrl) {
        // Upload video file
        const fileInput = await page.locator('input[type="file"]').first();
        await fileInput.setInputFiles(content.videoUrl);
        
        // Wait for upload to complete
        await page.waitForSelector('[data-testid="post-btn"]', { timeout: 60000 });
        await this.humanDelay(3000, 5000);
      }

      if (content.text) {
        // Add caption
        const captionArea = page.locator('[data-testid="caption-input"]');
        await this.humanType(captionArea, content.text);
        await this.humanDelay(1000, 2000);
      }

      if (content.hashtags) {
        // Add hashtags
        const hashtagText = ' ' + content.hashtags.map(tag => `#${tag}`).join(' ');
        await this.humanType(page.locator('[data-testid="caption-input"]'), hashtagText);
        await this.humanDelay(1000, 2000);
      }

      // Post the content
      await page.click('[data-testid="post-btn"]');
      
      // Wait for success confirmation
      await page.waitForSelector('.posting-success', { timeout: 30000 });

      return {
        success: true,
        platform: 'tiktok',
        accountId,
        timestamp: new Date(),
        url: page.url()
      };
    } catch (error) {
      return {
        success: false,
        platform: 'tiktok',
        accountId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Post to Instagram with latest automation techniques
   */
  private async postToInstagram(page: Page, accountId: string, content: PostingContent): Promise<PostingResult> {
    try {
      // Navigate to create new post
      await page.click('svg[aria-label="New post"]');
      await this.humanDelay(1000, 2000);

      if (content.imageUrl || content.videoUrl) {
        // Upload media
        const fileInput = page.locator('input[type="file"]').first();
        await fileInput.setInputFiles(content.imageUrl || content.videoUrl!);
        
        await this.humanDelay(2000, 4000);
        await page.click('button:has-text("Next")');
        await this.humanDelay(1000, 2000);
        await page.click('button:has-text("Next")');
        await this.humanDelay(1000, 2000);
      }

      if (content.text) {
        // Add caption
        await this.humanType(page.locator('textarea[aria-label="Write a caption..."]'), content.text);
        await this.humanDelay(1000, 2000);
      }

      // Share the post
      await page.click('button:has-text("Share")');
      
      // Wait for success
      await page.waitForSelector('img[alt="Your post was shared."]', { timeout: 30000 });

      return {
        success: true,
        platform: 'instagram',
        accountId,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        platform: 'instagram',
        accountId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Post to YouTube with enhanced automation
   */
  private async postToYouTube(page: Page, accountId: string, content: PostingContent): Promise<PostingResult> {
    try {
      // Navigate to YouTube Studio
      await page.goto('https://studio.youtube.com', { waitUntil: 'networkidle' });
      await this.humanDelay(2000, 4000);

      // Click create button
      await page.click('#create-icon');
      await page.click('tp-yt-paper-item:has-text("Upload video")');
      await this.humanDelay(1000, 2000);

      if (content.videoUrl) {
        // Upload video
        const fileInput = page.locator('input[type="file"]').first();
        await fileInput.setInputFiles(content.videoUrl);
        
        // Wait for upload processing
        await page.waitForSelector('#textbox[aria-label="Add a title that describes your video"]', { timeout: 120000 });
        await this.humanDelay(3000, 5000);
      }

      if (content.text) {
        // Add title and description
        await this.humanType(page.locator('#textbox[aria-label="Add a title that describes your video"]'), content.text);
        await this.humanDelay(1000, 2000);
      }

      // Publish the video
      await page.click('#next-button');
      await this.humanDelay(1000, 2000);
      await page.click('#next-button');
      await this.humanDelay(1000, 2000);
      await page.click('#next-button');
      await this.humanDelay(1000, 2000);
      
      // Set to public and publish
      await page.click('[name="PUBLIC"]');
      await page.click('#done-button');

      return {
        success: true,
        platform: 'youtube',
        accountId,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        platform: 'youtube',
        accountId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Post to Twitter with latest automation
   */
  private async postToTwitter(page: Page, accountId: string, content: PostingContent): Promise<PostingResult> {
    try {
      // Navigate to compose tweet
      await page.click('[data-testid="SideNav_NewTweet_Button"]');
      await this.humanDelay(1000, 2000);

      if (content.text) {
        // Add tweet text
        await this.humanType(page.locator('[data-testid="tweetTextarea_0"]'), content.text);
        await this.humanDelay(1000, 2000);
      }

      if (content.imageUrl) {
        // Add media
        const fileInput = page.locator('input[data-testid="fileInput"]');
        await fileInput.setInputFiles(content.imageUrl);
        await this.humanDelay(2000, 3000);
      }

      // Post the tweet
      await page.click('[data-testid="tweetButtonInline"]');
      
      // Wait for success
      await page.waitForSelector('[data-testid="toast"]', { timeout: 30000 });

      return {
        success: true,
        platform: 'twitter',
        accountId,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        platform: 'twitter',
        accountId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Human-like typing with realistic delays and occasional typos
   */
  private async humanType(locator: any, text: string): Promise<void> {
    // Clear existing text first
    await locator.fill('');
    
    for (const char of text) {
      await locator.type(char);
      // Random delay between keystrokes (50-200ms)
      await this.humanDelay(50, 200);
      
      // Occasional pause (simulate thinking)
      if (Math.random() < 0.1) {
        await this.humanDelay(500, 1500);
      }
    }
  }

  /**
   * Human-like delay with random variance
   */
  private async humanDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Generate random but realistic viewport sizes
   */
  private randomViewport(): { width: number; height: number } {
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 1536, height: 864 },
      { width: 1440, height: 900 },
      { width: 1024, height: 768 }
    ];
    return viewports[Math.floor(Math.random() * viewports.length)];
  }

  /**
   * Generate unique canvas fingerprint
   */
  private generateCanvasFingerprint(): string {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars[Math.floor(Math.random() * 16)];
    }
    return result;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    for (const [accountId, context] of this.contexts) {
      await context.close();
    }
    
    if (this.browser) {
      await this.browser.close();
    }

    this.contexts.clear();
    this.pages.clear();
    this.fingerprints.clear();
  }

  /**
   * Get account session status
   */
  isAccountActive(accountId: string): boolean {
    return this.pages.has(accountId) && this.contexts.has(accountId);
  }

  /**
   * Rotate account session (logout and login with new fingerprint)
   */
  async rotateAccountSession(credentials: SocialMediaLoginCredentials): Promise<boolean> {
    // Close existing session
    const context = this.contexts.get(credentials.accountId);
    if (context) {
      await context.close();
      this.contexts.delete(credentials.accountId);
      this.pages.delete(credentials.accountId);
    }

    // Remove old fingerprint to generate new one
    this.fingerprints.delete(credentials.accountId);

    // Create new session with fresh fingerprint
    return await this.loginToAccount(credentials);
  }

  /**
   * Batch posting across multiple accounts and platforms
   */
  async batchPost(
    accounts: SocialMediaLoginCredentials[],
    content: PostingContent
  ): Promise<PostingResult[]> {
    const results: PostingResult[] = [];
    
    for (const account of accounts) {
      try {
        // Ensure account is logged in
        if (!this.isAccountActive(account.accountId)) {
          await this.loginToAccount(account);
        }

        // Add human-like delay between posts
        await this.humanDelay(5000, 15000);
        
        const result = await this.postContent(account.accountId, account.platform, content);
        results.push(result);
        
        // Notify MCP server
        if (this.mcpServer) {
          console.log(`Batch post completed for ${account.platform}:${account.accountId}`);
        }
      } catch (error) {
        results.push({
          success: false,
          platform: account.platform,
          accountId: account.accountId,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        });
      }
    }

    return results;
  }
}