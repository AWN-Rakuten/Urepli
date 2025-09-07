import { chromium, Browser, Page, BrowserContext } from 'playwright';
import stealth from 'puppeteer-extra-plugin-stealth';
import UserAgent from 'user-agents';
import { storage } from '../storage';

export interface BrowserSession {
  id: string;
  platform: 'tiktok' | 'instagram';
  username: string;
  cookies: any[];
  sessionData: any;
  userAgent: string;
  isActive: boolean;
  lastActivity: Date;
  createdAt: Date;
}

export interface LoginCredentials {
  username: string;
  password: string;
  platform: 'tiktok' | 'instagram';
  proxy?: {
    server: string;
    username?: string;
    password?: string;
  };
}

export interface PostContent {
  type: 'video' | 'image';
  filePath: string;
  caption: string;
  hashtags: string[];
  location?: string;
  scheduleTime?: Date;
}

export class BrowserAutomationService {
  private browsers: Map<string, Browser> = new Map();
  private contexts: Map<string, BrowserContext> = new Map();
  private pages: Map<string, Page> = new Map();

  constructor() {
    // Cleanup on process exit
    process.on('beforeExit', () => this.cleanup());
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
  }

  /**
   * Create stealth browser instance with anti-detection measures
   */
  async createStealthBrowser(sessionId: string, proxy?: any): Promise<Browser> {
    const userAgent = new UserAgent({ deviceCategory: 'desktop' });
    
    const browser = await chromium.launch({
      headless: true, // Set to false for debugging
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-ipc-flooding-protection',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--disable-field-trial-config',
        '--disable-back-forward-cache',
        '--disable-hang-monitor',
        '--disable-prompt-on-repost',
        '--disable-sync',
        '--disable-translate',
        '--metrics-recording-only',
        '--no-first-run',
        '--safebrowsing-disable-auto-update',
        '--enable-automation',
        '--password-store=basic',
        '--use-mock-keychain',
        `--user-agent=${userAgent.toString()}`,
        ...(proxy ? [`--proxy-server=${proxy.server}`] : [])
      ]
    });

    // Create context with anti-detection measures
    const context = await browser.newContext({
      userAgent: userAgent.toString(),
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
      timezoneId: 'America/New_York',
      permissions: ['notifications'],
      ...(proxy?.username && proxy?.password ? {
        httpCredentials: {
          username: proxy.username,
          password: proxy.password
        }
      } : {})
    });

    // Add stealth scripts
    await context.addInitScript(() => {
      // Override webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
      
      // Override plugins array
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
      
      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters: any) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );

      // Override chrome property
      Object.defineProperty(window, 'chrome', {
        get: () => ({
          runtime: {},
          loadTimes: () => {},
          csi: () => {},
          app: {}
        }),
      });
    });

    this.browsers.set(sessionId, browser);
    this.contexts.set(sessionId, context);
    
    return browser;
  }

  /**
   * Automated login to TikTok
   */
  async loginToTikTok(credentials: LoginCredentials): Promise<BrowserSession> {
    const sessionId = `tiktok_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const browser = await this.createStealthBrowser(sessionId, credentials.proxy);
    const context = this.contexts.get(sessionId)!;
    const page = await context.newPage();
    
    this.pages.set(sessionId, page);

    try {
      // Navigate to TikTok login
      await page.goto('https://www.tiktok.com/login/phone-or-email/email', {
        waitUntil: 'networkidle'
      });

      // Wait for login form
      await page.waitForSelector('[name="username"]', { timeout: 30000 });

      // Fill credentials
      await page.fill('[name="username"]', credentials.username);
      await page.waitForTimeout(1000 + Math.random() * 2000); // Random delay
      
      await page.fill('[type="password"]', credentials.password);
      await page.waitForTimeout(1000 + Math.random() * 2000);

      // Submit login
      await page.click('[data-e2e="login-button"]');
      
      // Wait for navigation or 2FA
      try {
        await page.waitForURL('https://www.tiktok.com/foryou*', { timeout: 30000 });
      } catch {
        // Check for 2FA or captcha
        const has2FA = await page.locator('[data-e2e="verification-code-input"]').count() > 0;
        const hasCaptcha = await page.locator('.captcha_verify_container').count() > 0;
        
        if (has2FA || hasCaptcha) {
          throw new Error('Manual verification required (2FA/Captcha)');
        }
      }

      // Verify login success
      const isLoggedIn = await page.locator('[data-e2e="profile-icon"]').count() > 0;
      if (!isLoggedIn) {
        throw new Error('Login failed - could not verify successful login');
      }

      // Extract session data
      const cookies = await context.cookies();
      const sessionData = await page.evaluate(() => ({
        localStorage: { ...localStorage },
        sessionStorage: { ...sessionStorage }
      }));

      const session: BrowserSession = {
        id: sessionId,
        platform: 'tiktok',
        username: credentials.username,
        cookies,
        sessionData,
        userAgent: await page.evaluate(() => navigator.userAgent),
        isActive: true,
        lastActivity: new Date(),
        createdAt: new Date()
      };

      // Store session
      await storage.createBrowserSession(session);

      await storage.createAutomationLog({
        type: 'browser_login',
        message: `Successfully logged into TikTok: ${credentials.username}`,
        status: 'success',
        metadata: { platform: 'tiktok', username: credentials.username, sessionId }
      });

      return session;
      
    } catch (error) {
      await this.cleanupSession(sessionId);
      throw error;
    }
  }

  /**
   * Automated login to Instagram
   */
  async loginToInstagram(credentials: LoginCredentials): Promise<BrowserSession> {
    const sessionId = `instagram_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const browser = await this.createStealthBrowser(sessionId, credentials.proxy);
    const context = this.contexts.get(sessionId)!;
    const page = await context.newPage();
    
    this.pages.set(sessionId, page);

    try {
      // Navigate to Instagram login
      await page.goto('https://www.instagram.com/accounts/login/', {
        waitUntil: 'networkidle'
      });

      // Wait for login form
      await page.waitForSelector('[name="username"]', { timeout: 30000 });

      // Fill credentials
      await page.fill('[name="username"]', credentials.username);
      await page.waitForTimeout(1000 + Math.random() * 2000);
      
      await page.fill('[name="password"]', credentials.password);
      await page.waitForTimeout(1000 + Math.random() * 2000);

      // Submit login
      await page.click('[type="submit"]');
      
      // Wait for navigation
      try {
        await page.waitForURL('https://www.instagram.com/', { timeout: 30000 });
      } catch {
        // Check for 2FA or suspicious login
        const has2FA = await page.locator('[name="verificationCode"]').count() > 0;
        const hasSuspicious = await page.getByText('Suspicious Login').count() > 0;
        
        if (has2FA || hasSuspicious) {
          throw new Error('Manual verification required (2FA/Suspicious login)');
        }
      }

      // Verify login success
      const isLoggedIn = await page.locator('[data-testid="user-avatar"]').count() > 0;
      if (!isLoggedIn) {
        throw new Error('Login failed - could not verify successful login');
      }

      // Extract session data
      const cookies = await context.cookies();
      const sessionData = await page.evaluate(() => ({
        localStorage: { ...localStorage },
        sessionStorage: { ...sessionStorage }
      }));

      const session: BrowserSession = {
        id: sessionId,
        platform: 'instagram',
        username: credentials.username,
        cookies,
        sessionData,
        userAgent: await page.evaluate(() => navigator.userAgent),
        isActive: true,
        lastActivity: new Date(),
        createdAt: new Date()
      };

      // Store session
      await storage.createBrowserSession(session);

      await storage.createAutomationLog({
        type: 'browser_login',
        message: `Successfully logged into Instagram: ${credentials.username}`,
        status: 'success',
        metadata: { platform: 'instagram', username: credentials.username, sessionId }
      });

      return session;
      
    } catch (error) {
      await this.cleanupSession(sessionId);
      throw error;
    }
  }

  /**
   * Restore browser session from stored data
   */
  async restoreSession(sessionId: string): Promise<Page> {
    const session = await storage.getBrowserSession(sessionId);
    if (!session || !session.isActive) {
      throw new Error('Invalid or inactive session');
    }

    const browser = await this.createStealthBrowser(sessionId);
    const context = this.contexts.get(sessionId)!;
    
    // Restore cookies and session data
    await context.addCookies(session.cookies);
    
    const page = await context.newPage();
    this.pages.set(sessionId, page);

    // Restore session storage and local storage
    await page.addInitScript((sessionData) => {
      if (sessionData.localStorage) {
        Object.entries(sessionData.localStorage).forEach(([key, value]) => {
          localStorage.setItem(key, value as string);
        });
      }
      if (sessionData.sessionStorage) {
        Object.entries(sessionData.sessionStorage).forEach(([key, value]) => {
          sessionStorage.setItem(key, value as string);
        });
      }
    }, session.sessionData);

    // Update last activity
    await storage.updateBrowserSession(sessionId, { lastActivity: new Date() });

    return page;
  }

  /**
   * Post content to TikTok using browser automation
   */
  async postToTikTokBrowser(sessionId: string, content: PostContent): Promise<{ success: boolean; postId?: string; error?: string }> {
    try {
      const page = await this.restoreSession(sessionId);

      // Navigate to upload page
      await page.goto('https://www.tiktok.com/upload', { waitUntil: 'networkidle' });

      // Upload video file
      const fileInput = await page.locator('input[type="file"]');
      await fileInput.setInputFiles(content.filePath);

      // Wait for video processing
      await page.waitForSelector('[data-e2e="upload-caption"]', { timeout: 60000 });

      // Add caption
      await page.fill('[data-e2e="upload-caption"]', `${content.caption}\n\n${content.hashtags.join(' ')}`);

      // Configure posting settings
      await page.waitForTimeout(2000);

      // Submit post
      await page.click('[data-e2e="upload-button"]');

      // Wait for success
      await page.waitForSelector('[data-e2e="upload-success"]', { timeout: 120000 });

      // Extract post ID from URL if possible
      const currentUrl = page.url();
      const postIdMatch = currentUrl.match(/video\/(\d+)/);
      const postId = postIdMatch ? postIdMatch[1] : `browser_${Date.now()}`;

      await storage.createAutomationLog({
        type: 'browser_post',
        message: `Successfully posted to TikTok via browser automation`,
        status: 'success',
        metadata: { sessionId, postId, platform: 'tiktok' }
      });

      return { success: true, postId };

    } catch (error) {
      await storage.createAutomationLog({
        type: 'browser_post',
        message: `Failed to post to TikTok: ${error}`,
        status: 'error',
        metadata: { sessionId, error: String(error) }
      });

      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Post content to Instagram using browser automation
   */
  async postToInstagramBrowser(sessionId: string, content: PostContent): Promise<{ success: boolean; postId?: string; error?: string }> {
    try {
      const page = await this.restoreSession(sessionId);

      // Navigate to create post
      await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle' });
      
      // Click create button
      await page.click('[aria-label="New post"]');
      await page.waitForSelector('input[type="file"]', { timeout: 10000 });

      // Upload media file
      const fileInput = await page.locator('input[type="file"]');
      await fileInput.setInputFiles(content.filePath);

      // Wait for upload and click Next
      await page.waitForSelector('[tabindex="0"]', { timeout: 30000 });
      await page.getByText('Next').click();

      // Skip editing and click Next again
      await page.waitForTimeout(2000);
      await page.getByText('Next').click();

      // Add caption
      await page.waitForSelector('[aria-label="Write a caption..."]', { timeout: 10000 });
      await page.fill('[aria-label="Write a caption..."]', `${content.caption}\n\n${content.hashtags.join(' ')}`);

      // Submit post
      await page.getByText('Share').click();

      // Wait for success
      await page.waitForSelector('[data-testid="post-success"]', { timeout: 60000 });

      const postId = `browser_${Date.now()}`;

      await storage.createAutomationLog({
        type: 'browser_post',
        message: `Successfully posted to Instagram via browser automation`,
        status: 'success',
        metadata: { sessionId, postId, platform: 'instagram' }
      });

      return { success: true, postId };

    } catch (error) {
      await storage.createAutomationLog({
        type: 'browser_post',
        message: `Failed to post to Instagram: ${error}`,
        status: 'error',
        metadata: { sessionId, error: String(error) }
      });

      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Verify account status using browser automation
   */
  async verifyAccountStatus(sessionId: string, platform: 'tiktok' | 'instagram'): Promise<{
    isActive: boolean;
    followerCount?: number;
    canPost?: boolean;
    restrictions?: string[];
  }> {
    try {
      const page = await this.restoreSession(sessionId);

      if (platform === 'tiktok') {
        await page.goto('https://www.tiktok.com/profile', { waitUntil: 'networkidle' });
        
        const isActive = await page.locator('[data-e2e="profile-icon"]').count() > 0;
        const followerText = await page.locator('[data-e2e="followers-count"]').textContent() || '0';
        const followerCount = parseInt(followerText.replace(/[^\d]/g, '')) || 0;

        // Check for restrictions
        const restrictions: string[] = [];
        if (await page.getByText('Account has been restricted').count() > 0) {
          restrictions.push('Account restricted');
        }
        if (await page.getByText('Content under review').count() > 0) {
          restrictions.push('Content under review');
        }

        return {
          isActive,
          followerCount,
          canPost: isActive && restrictions.length === 0,
          restrictions
        };
      } else {
        await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle' });
        
        const isActive = await page.locator('[data-testid="user-avatar"]').count() > 0;
        
        // Navigate to profile to get follower count
        await page.click('[data-testid="user-avatar"]');
        await page.waitForTimeout(2000);
        
        const followerText = await page.locator('a[href*="/followers/"]').textContent() || '0';
        const followerCount = parseInt(followerText.replace(/[^\d]/g, '')) || 0;

        const restrictions: string[] = [];
        if (await page.getByText('Account suspended').count() > 0) {
          restrictions.push('Account suspended');
        }

        return {
          isActive,
          followerCount,
          canPost: isActive && restrictions.length === 0,
          restrictions
        };
      }
    } catch (error) {
      return {
        isActive: false,
        canPost: false,
        restrictions: [`Verification failed: ${error}`]
      };
    }
  }

  /**
   * Get active browser sessions
   */
  async getActiveSessions(): Promise<BrowserSession[]> {
    return await storage.getBrowserSessions(true);
  }

  /**
   * Cleanup specific session
   */
  async cleanupSession(sessionId: string): Promise<void> {
    try {
      const page = this.pages.get(sessionId);
      const context = this.contexts.get(sessionId);
      const browser = this.browsers.get(sessionId);

      if (page) await page.close();
      if (context) await context.close();
      if (browser) await browser.close();

      this.pages.delete(sessionId);
      this.contexts.delete(sessionId);
      this.browsers.delete(sessionId);

      // Update session status
      await storage.updateBrowserSession(sessionId, { isActive: false });
    } catch (error) {
      console.error(`Error cleaning up session ${sessionId}:`, error);
    }
  }

  /**
   * Cleanup all browser instances
   */
  async cleanup(): Promise<void> {
    const promises = Array.from(this.browsers.keys()).map(sessionId => 
      this.cleanupSession(sessionId)
    );
    await Promise.all(promises);
  }

  /**
   * Get session health status
   */
  async getSessionHealth(sessionId: string): Promise<{
    isHealthy: boolean;
    lastActivity: Date;
    issues: string[];
  }> {
    try {
      const session = await storage.getBrowserSession(sessionId);
      if (!session) {
        return { isHealthy: false, lastActivity: new Date(0), issues: ['Session not found'] };
      }

      const issues: string[] = [];
      const now = new Date();
      const lastActivity = session.lastActivity;
      const hoursSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);

      if (hoursSinceActivity > 24) {
        issues.push('No activity in 24+ hours');
      }

      if (!session.isActive) {
        issues.push('Session marked as inactive');
      }

      const browser = this.browsers.get(sessionId);
      if (!browser || !browser.isConnected()) {
        issues.push('Browser disconnected');
      }

      return {
        isHealthy: issues.length === 0,
        lastActivity,
        issues
      };
    } catch (error) {
      return {
        isHealthy: false,
        lastActivity: new Date(0),
        issues: [`Health check failed: ${error}`]
      };
    }
  }
}