import { chromium, Browser, Page, BrowserContext } from 'playwright';
// import stealth from 'puppeteer-extra-plugin-stealth';
// import UserAgent from 'user-agents';
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

export interface AccountCreationData {
  email: string;
  username: string;
  password: string;
  platform: 'tiktok' | 'instagram';
  fullName?: string;
  dateOfBirth?: {
    day: number;
    month: number;
    year: number;
  };
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
   * Check if browser automation is available
   */
  async isBrowserAvailable(): Promise<boolean> {
    try {
      const browser = await chromium.launch({ headless: true });
      await browser.close();
      return true;
    } catch (error) {
      console.warn('Browser automation not available:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Mock browser automation for testing when real automation isn't available
   */
  private async mockBrowserOperation(operation: string, data: any): Promise<BrowserSession> {
    console.log(`Mock ${operation} operation:`, { ...data, password: '[HIDDEN]' });
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Create mock session
    const sessionId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session: BrowserSession = {
      id: sessionId,
      platform: data.platform,
      username: data.username || data.email?.split('@')[0] || 'mock_user',
      cookies: [
        { name: 'sessionid', value: 'mock_session_' + Math.random().toString(36) },
        { name: 'csrftoken', value: 'mock_csrf_' + Math.random().toString(36) }
      ],
      sessionData: {
        mockOperation: operation,
        mockSuccess: true,
        timestamp: new Date().toISOString()
      },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      isActive: true,
      lastActivity: new Date(),
      createdAt: new Date()
    };

    return session;
  }

  /**
   * Create stealth browser instance with anti-detection measures
   */
  async createStealthBrowser(sessionId: string, proxy?: any): Promise<Browser> {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    
    try {
      // Check availability first
      const isAvailable = await this.isBrowserAvailable();
      if (!isAvailable) {
        throw new Error('Browser automation is not available. This may be due to missing system dependencies or running in a restricted environment.');
      }

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
        `--user-agent=${userAgent}`,
        ...(proxy ? [`--proxy-server=${proxy.server}`] : [])
      ]
    });

    // Create context with anti-detection measures
    const context = await browser.newContext({
      userAgent: userAgent,
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
          Promise.resolve({ state: Notification.permission, name: 'notifications', onchange: null } as any) :
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
    
    } catch (error) {
      if (error instanceof Error && error.message.includes('Host system is missing dependencies')) {
        throw new Error('Browser automation requires additional system dependencies. In a production environment, install them with: sudo npx playwright install-deps');
      }
      throw error;
    }
  }

  /**
   * Create new TikTok account using browser automation
   */
  async createTikTokAccount(accountData: AccountCreationData): Promise<BrowserSession> {
    // Check if browser automation is available
    const isAvailable = await this.isBrowserAvailable();
    if (!isAvailable) {
      console.log('Browser automation not available, using mock operation for testing');
      return await this.mockBrowserOperation('createTikTokAccount', accountData);
    }

    const sessionId = `tiktok_create_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const browser = await this.createStealthBrowser(sessionId, accountData.proxy);
    const context = this.contexts.get(sessionId)!;
    const page = await context.newPage();
    
    this.pages.set(sessionId, page);

    try {
      // Navigate to TikTok signup
      await page.goto('https://www.tiktok.com/signup/phone-or-email/email', {
        waitUntil: 'networkidle'
      });

      // Wait for signup form
      await page.waitForSelector('[name="email"]', { timeout: 30000 });

      // Fill email
      await page.fill('[name="email"]', accountData.email);
      await page.waitForTimeout(1000 + Math.random() * 2000);

      // Fill password
      await page.fill('[type="password"]', accountData.password);
      await page.waitForTimeout(1000 + Math.random() * 2000);

      // Handle basic date of birth (use default values)
      try {
        await page.selectOption('[data-e2e="birthday-month"]', '1');
        await page.selectOption('[data-e2e="birthday-day"]', '15'); 
        await page.selectOption('[data-e2e="birthday-year"]', '2000');
      } catch {
        // Date of birth fields might not be present, continue
      }

      // Submit signup
      await page.click('[data-e2e="signup-button"]');
      
      // Wait for email verification or account completion
      try {
        await page.waitForURL('https://www.tiktok.com/foryou*', { timeout: 60000 });
      } catch {
        // Check for email verification
        const needsVerification = await page.locator('[data-e2e="verification-code-input"]').count() > 0;
        if (needsVerification) {
          throw new Error('Email verification required - please check email and complete manually');
        }
      }

      // Set username if account creation succeeded
      if (accountData.username) {
        try {
          await page.goto('https://www.tiktok.com/setting/account', { waitUntil: 'networkidle' });
          await page.waitForSelector('[data-e2e="username-input"]', { timeout: 10000 });
          await page.fill('[data-e2e="username-input"]', accountData.username);
          await page.click('[data-e2e="save-username"]');
          await page.waitForTimeout(2000);
        } catch {
          // Username setting failed, continue with email-based account
        }
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
        username: accountData.username || accountData.email,
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
        type: 'browser_signup',
        message: `Successfully created TikTok account: ${accountData.username || accountData.email}`,
        status: 'success',
        workflowId: null,
        metadata: { platform: 'tiktok', username: accountData.username || accountData.email, sessionId }
      });

      return session;
      
    } catch (error) {
      await this.cleanupSession(sessionId);
      await storage.createAutomationLog({
        type: 'browser_signup',
        message: `Failed to create TikTok account: ${error}`,
        status: 'error',
        workflowId: null,
        metadata: { platform: 'tiktok', error: String(error) }
      });
      throw error;
    }
  }

  /**
   * Create new Instagram account using browser automation
   */
  async createInstagramAccount(accountData: AccountCreationData): Promise<BrowserSession> {
    // Check if browser automation is available
    const isAvailable = await this.isBrowserAvailable();
    if (!isAvailable) {
      console.log('Browser automation not available, using mock operation for testing');
      return await this.mockBrowserOperation('createInstagramAccount', accountData);
    }

    const sessionId = `instagram_create_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const browser = await this.createStealthBrowser(sessionId, accountData.proxy);
    const context = this.contexts.get(sessionId)!;
    const page = await context.newPage();
    
    this.pages.set(sessionId, page);

    try {
      // Navigate to Instagram signup
      await page.goto('https://www.instagram.com/accounts/emailsignup/', {
        waitUntil: 'networkidle'
      });

      // Wait for signup form
      await page.waitForSelector('[name="emailOrPhone"]', { timeout: 30000 });

      // Fill form data
      await page.fill('[name="emailOrPhone"]', accountData.email);
      await page.waitForTimeout(1000 + Math.random() * 2000);

      await page.fill('[name="fullName"]', accountData.fullName || accountData.username);
      await page.waitForTimeout(1000 + Math.random() * 2000);

      await page.fill('[name="username"]', accountData.username);
      await page.waitForTimeout(1000 + Math.random() * 2000);
      
      await page.fill('[name="password"]', accountData.password);
      await page.waitForTimeout(1000 + Math.random() * 2000);

      // Handle date of birth (use default values for adult account)
      try {
        await page.selectOption('[title="Month:"]', '1');
        await page.selectOption('[title="Day:"]', '15');
        await page.selectOption('[title="Year:"]', '2000');
      } catch {
        // Date of birth fields might not be present, continue
      }

      // Submit signup
      await page.click('[type="submit"]');
      
      // Wait for confirmation code or success
      try {
        await page.waitForURL('https://www.instagram.com/', { timeout: 60000 });
      } catch {
        // Check for confirmation code
        const needsConfirmation = await page.locator('[name="email_confirmation_code"]').count() > 0;
        if (needsConfirmation) {
          throw new Error('Email confirmation required - please check email and complete manually');
        }
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
        username: accountData.username,
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
        type: 'browser_signup',
        message: `Successfully created Instagram account: ${accountData.username}`,
        status: 'success',
        workflowId: null,
        metadata: { platform: 'instagram', username: accountData.username, sessionId }
      });

      return session;
      
    } catch (error) {
      await this.cleanupSession(sessionId);
      await storage.createAutomationLog({
        type: 'browser_signup',
        message: `Failed to create Instagram account: ${error}`,
        status: 'error',
        workflowId: null,
        metadata: { platform: 'instagram', error: String(error) }
      });
      throw error;
    }
  }

  /**
   * Automated login to TikTok
   */
  async loginToTikTok(credentials: LoginCredentials): Promise<BrowserSession> {
    // Check if browser automation is available
    const isAvailable = await this.isBrowserAvailable();
    if (!isAvailable) {
      console.log('Browser automation not available, using mock operation for testing');
      return await this.mockBrowserOperation('loginToTikTok', credentials);
    }

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
        workflowId: null,
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
    // Check if browser automation is available
    const isAvailable = await this.isBrowserAvailable();
    if (!isAvailable) {
      console.log('Browser automation not available, using mock operation for testing');
      return await this.mockBrowserOperation('loginToInstagram', credentials);
    }

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
        workflowId: null,
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
        workflowId: null,
        metadata: { sessionId, postId, platform: 'tiktok' }
      });

      return { success: true, postId };

    } catch (error) {
      await storage.createAutomationLog({
        type: 'browser_post',
        message: `Failed to post to TikTok: ${error}`,
        status: 'error',
        workflowId: null,
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
        workflowId: null,
        metadata: { sessionId, postId, platform: 'instagram' }
      });

      return { success: true, postId };

    } catch (error) {
      await storage.createAutomationLog({
        type: 'browser_post',
        message: `Failed to post to Instagram: ${error}`,
        status: 'error',
        workflowId: null,
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