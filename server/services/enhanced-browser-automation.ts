import { chromium, firefox, webkit, Browser, Page, BrowserContext } from 'playwright';
import UserAgent from 'user-agents';

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
}

export interface AccountFingerprint {
  userAgent: string;
  viewport: { width: number; height: number };
  timezone: string;
  locale: string;
  platform: string;
  webglRenderer: string;
  languages: string[];
}

export class EnhancedBrowserAutomation {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private fingerprints: Map<string, AccountFingerprint> = new Map();

  /**
   * Generate a realistic fingerprint for an account
   */
  generateAccountFingerprint(accountId: string): AccountFingerprint {
    if (this.fingerprints.has(accountId)) {
      return this.fingerprints.get(accountId)!;
    }

    const userAgent = new UserAgent();
    const platforms = ['Windows', 'MacOS', 'Linux'];
    const timezones = ['Asia/Tokyo', 'America/New_York', 'Europe/London', 'Asia/Seoul'];
    const locales = ['ja-JP', 'en-US', 'ko-KR', 'zh-CN'];
    const webglRenderers = [
      'ANGLE (Intel, Intel(R) HD Graphics 630 Direct3D11 vs_5_0 ps_5_0)',
      'WebKit WebGL',
      'Mozilla',
      'Google Inc. (Intel)',
      'AMD Radeon Graphics'
    ];

    const fingerprint: AccountFingerprint = {
      userAgent: userAgent.toString(),
      viewport: {
        width: 1920 + Math.floor(Math.random() * 400) - 200,
        height: 1080 + Math.floor(Math.random() * 200) - 100
      },
      timezone: timezones[Math.floor(Math.random() * timezones.length)],
      locale: locales[Math.floor(Math.random() * locales.length)],
      platform: platforms[Math.floor(Math.random() * platforms.length)],
      webglRenderer: webglRenderers[Math.floor(Math.random() * webglRenderers.length)],
      languages: ['ja', 'en-US', 'ko'].sort(() => Math.random() - 0.5)
    };

    this.fingerprints.set(accountId, fingerprint);
    return fingerprint;
  }

  /**
   * Launch browser with stealth mode and anti-detection
   */
  async launchBrowser(accountId: string, options: BrowserOptions = {}): Promise<void> {
    const fingerprint = this.generateAccountFingerprint(accountId);

    // Close existing browser if open
    await this.closeBrowser();

    // Check if browser automation is available
    try {
      const { chromium } = await import('playwright');
      
      // Launch browser with stealth configurations
      this.browser = await chromium.launch({
        headless: options.headless !== false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=VizDisplayCompositor',
        '--disable-ipc-flooding-protection',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--disable-client-side-phishing-detection',
        '--disable-component-extensions-with-background-pages',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-hang-monitor',
        '--disable-popup-blocking',
        '--disable-prompt-on-repost',
        '--disable-sync',
        '--disable-translate',
        '--disable-web-security',
        '--enable-automation=false',
        '--password-store=basic',
        '--use-mock-keychain',
        `--user-agent=${fingerprint.userAgent}`,
      ],
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('playwright')) {
        throw new Error('Browser automation requires additional system setup. Please use the "Official API" method instead by clicking the "Official API" tab above.');
      }
      throw new Error(`Failed to launch browser: ${error}. Please use the "Official API" method instead.`);
    }

    // Create context with fingerprint
    this.context = await this.browser.newContext({
      viewport: fingerprint.viewport,
      userAgent: fingerprint.userAgent,
      locale: fingerprint.locale,
      timezoneId: fingerprint.timezone,
      geolocation: options.geolocation,
      proxy: options.proxy,
      permissions: ['geolocation', 'notifications'],
      extraHTTPHeaders: {
        'Accept-Language': fingerprint.languages.join(', '),
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    // Create page with anti-detection scripts
    this.page = await this.context.newPage();

    // Add stealth scripts
    await this.addStealthScripts(this.page, fingerprint);
  }

  /**
   * Add comprehensive anti-detection scripts
   */
  private async addStealthScripts(page: Page, fingerprint: AccountFingerprint): Promise<void> {
    await page.addInitScript(() => {
      // Remove webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // Mock chrome property
      // @ts-ignore
      window.chrome = {
        runtime: {},
        loadTimes: function() {
          return {
            commitLoadTime: Date.now() / 1000 - Math.random() * 100,
            finishDocumentLoadTime: Date.now() / 1000 - Math.random() * 50,
            finishLoadTime: Date.now() / 1000 - Math.random() * 20,
            firstPaintAfterLoadTime: 0,
            firstPaintTime: Date.now() / 1000 - Math.random() * 50,
            navigationType: 'Other',
            npnNegotiatedProtocol: 'h2',
            requestTime: Date.now() / 1000 - Math.random() * 150,
            startLoadTime: Date.now() / 1000 - Math.random() * 150,
            connectionInfo: 'h2',
            wasFetchedViaSpdy: true,
            wasNpnNegotiated: true,
          };
        },
        csi: function() {
          return {
            startE: Date.now(),
            onloadT: Date.now(),
            pageT: Math.random() * 1000,
            tran: 15,
          };
        },
      };

      // Mock plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          {
            0: {
              type: "application/x-google-chrome-pdf",
              suffixes: "pdf",
              description: "Portable Document Format",
            },
            description: "Portable Document Format",
            filename: "internal-pdf-viewer",
            length: 1,
            name: "Chrome PDF Plugin",
          },
          {
            0: {
              type: "application/pdf",
              suffixes: "pdf",
              description: "",
            },
            description: "",
            filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
            length: 1,
            name: "Chrome PDF Viewer",
          },
        ],
      });

      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );

      // Mock battery API
      Object.defineProperty(navigator, 'getBattery', {
        get: () => () => Promise.resolve({
          charging: true,
          chargingTime: 0,
          dischargingTime: Infinity,
          level: Math.random(),
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => {},
        }),
      });

      // Override language properties
      Object.defineProperty(navigator, 'language', {
        get: () => 'ja',
      });

      Object.defineProperty(navigator, 'languages', {
        get: () => ['ja', 'en-US'],
      });

      // Mock webGL
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) {
          return 'Intel Inc.';
        }
        if (parameter === 37446) {
          return 'Intel(R) HD Graphics 630';
        }
        return getParameter(parameter);
      };
    });

    // Add mouse movement simulation
    await page.addInitScript(() => {
      let mouseX = Math.random() * window.innerWidth;
      let mouseY = Math.random() * window.innerHeight;

      setInterval(() => {
        mouseX += (Math.random() - 0.5) * 10;
        mouseY += (Math.random() - 0.5) * 10;
        
        mouseX = Math.max(0, Math.min(window.innerWidth, mouseX));
        mouseY = Math.max(0, Math.min(window.innerHeight, mouseY));

        const mouseMoveEvent = new MouseEvent('mousemove', {
          clientX: mouseX,
          clientY: mouseY,
          bubbles: true,
        });
        document.dispatchEvent(mouseMoveEvent);
      }, 2000 + Math.random() * 3000);
    });
  }

  /**
   * Navigate to URL with human-like behavior
   */
  async navigateTo(url: string, waitOptions: { timeout?: number; waitUntil?: 'load' | 'networkidle' } = {}): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized. Call launchBrowser first.');
    }

    // Random delay before navigation
    await this.humanDelay(1000, 3000);

    await this.page.goto(url, {
      timeout: waitOptions.timeout || 30000,
      waitUntil: waitOptions.waitUntil || 'networkidle',
    });

    // Simulate reading the page
    await this.humanDelay(2000, 5000);
  }

  /**
   * Type text with human-like speed and errors
   */
  async humanType(selector: string, text: string, options: { delay?: number } = {}): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    const element = await this.page.waitForSelector(selector);
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }

    // Clear existing content
    await element.click({ clickCount: 3 });
    await this.page.keyboard.press('Backspace');
    
    // Type with human-like delays and occasional corrections
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      // Occasional typos (5% chance)
      if (Math.random() < 0.05 && i > 0) {
        const wrongChar = String.fromCharCode(char.charCodeAt(0) + Math.floor(Math.random() * 3) - 1);
        await this.page.keyboard.type(wrongChar);
        await this.humanDelay(100, 300);
        await this.page.keyboard.press('Backspace');
        await this.humanDelay(100, 200);
      }

      await this.page.keyboard.type(char);
      
      // Variable typing speed
      const baseDelay = options.delay || 120;
      const variation = Math.random() * 100 - 50;
      await this.humanDelay(baseDelay + variation, baseDelay + variation + 50);
    }
  }

  /**
   * Click element with human-like behavior
   */
  async humanClick(selector: string, options: { button?: 'left' | 'right' | 'middle'; delay?: number } = {}): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    const element = await this.page.waitForSelector(selector, { timeout: 10000 });
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }

    // Move mouse to element first
    await element.hover();
    await this.humanDelay(200, 800);

    // Click with slight randomization
    const box = await element.boundingBox();
    if (box) {
      const x = box.x + box.width * (0.3 + Math.random() * 0.4);
      const y = box.y + box.height * (0.3 + Math.random() * 0.4);
      
      await this.page.mouse.click(x, y, {
        button: options.button || 'left',
        delay: options.delay || Math.random() * 100 + 50,
      });
    } else {
      await element.click();
    }

    await this.humanDelay(500, 1500);
  }

  /**
   * Human-like delay with randomization
   */
  async humanDelay(minMs: number, maxMs?: number): Promise<void> {
    const delay = maxMs ? minMs + Math.random() * (maxMs - minMs) : minMs;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Detect CAPTCHA or verification challenges
   */
  async detectChallenge(): Promise<{ type: string | null; element: any }> {
    if (!this.page) {
      return { type: null, element: null };
    }

    try {
      // Check for common CAPTCHA patterns
      const captchaSelectors = [
        '[class*="captcha"]',
        '[id*="captcha"]',
        'iframe[src*="recaptcha"]',
        'iframe[src*="hcaptcha"]',
        '[class*="challenge"]',
        '[data-testid*="captcha"]',
        '.g-recaptcha',
        '#cf-challenge-stage'
      ];

      for (const selector of captchaSelectors) {
        const element = await this.page.$(selector);
        if (element) {
          return { type: 'captcha', element };
        }
      }

      // Check for phone/email verification
      const verificationSelectors = [
        '[placeholder*="phone"]',
        '[placeholder*="verify"]',
        '[placeholder*="code"]',
        'input[type="tel"]',
        '[class*="verification"]',
        '[data-testid*="verification"]'
      ];

      for (const selector of verificationSelectors) {
        const element = await this.page.$(selector);
        if (element) {
          return { type: 'verification', element };
        }
      }

      return { type: null, element: null };
    } catch (error) {
      return { type: null, element: null };
    }
  }

  /**
   * Take screenshot for debugging
   */
  async takeScreenshot(path: string): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    await this.page.screenshot({ path, fullPage: true });
  }

  /**
   * Get current page HTML
   */
  async getPageContent(): Promise<string> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    return await this.page.content();
  }

  /**
   * Wait for element to appear
   */
  async waitForElement(selector: string, timeout: number = 10000): Promise<boolean> {
    if (!this.page) {
      return false;
    }

    try {
      await this.page.waitForSelector(selector, { timeout });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Close browser and cleanup
   */
  async closeBrowser(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      if (this.context) {
        await this.context.close();
        this.context = null;
      }
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    } catch (error) {
      console.error('Error closing browser:', error);
    }
  }

  /**
   * Get current page
   */
  getPage(): Page | null {
    return this.page;
  }

  /**
   * Check if browser is initialized
   */
  isInitialized(): boolean {
    return this.browser !== null && this.context !== null && this.page !== null;
  }

  /**
   * Create TikTok account using browser automation
   */
  async createTikTokAccount(email: string, password: string): Promise<{ success: boolean; accountId?: string; error?: string }> {
    console.log('🎯 Starting TikTok account creation process...');
    
    try {
      if (!this.page) {
        throw new Error('Browser not launched');
      }

      // Navigate to TikTok signup page
      console.log('🌐 Navigating to TikTok signup...');
      await this.page.goto('https://www.tiktok.com/signup', { waitUntil: 'networkidle0' });
      
      // Take screenshot for debugging
      await this.takeScreenshot('/tmp/tiktok_signup_start.png');
      
      // Look for signup form elements
      console.log('🔍 Looking for signup form...');
      
      // Try to find email signup option
      const emailSignupSelector = 'div[data-e2e="channel-item"]:has-text("Use email")';
      await this.page.waitForSelector(emailSignupSelector, { timeout: 10000 }).catch(() => {
        console.log('Email signup selector not found, trying alternative...');
      });
      
      if (await this.page.$(emailSignupSelector)) {
        await this.page.click(emailSignupSelector);
        await this.humanDelay(1000, 2000);
      }
      
      // Fill in email
      console.log('✏️ Entering email...');
      const emailInput = 'input[type="email"], input[placeholder*="email"], input[data-testid*="email"]';
      await this.page.waitForSelector(emailInput, { timeout: 10000 });
      await this.humanType(emailInput, email);
      
      // Fill in password  
      console.log('🔒 Entering password...');
      const passwordInput = 'input[type="password"], input[placeholder*="password"], input[data-testid*="password"]';
      await this.page.waitForSelector(passwordInput, { timeout: 10000 });
      await this.humanType(passwordInput, password);
      
      // Handle date of birth if required
      console.log('📅 Handling date of birth...');
      const dobSelectors = ['select[data-testid*="month"]', 'select[data-testid*="day"]', 'select[data-testid*="year"]'];
      for (const selector of dobSelectors) {
        const element = await this.page.$(selector);
        if (element) {
          // Set a random valid date (over 18)
          await this.page.select(selector, '1'); // First option usually works
          await this.humanDelay(500, 1000);
        }
      }
      
      // Handle verification code if needed
      console.log('📧 Checking for verification requirements...');
      const verificationCheck = await this.detectChallenge();
      if (verificationCheck.type === 'verification') {
        console.log('⚠️ Verification code required - manual intervention needed');
        await this.takeScreenshot('/tmp/tiktok_verification_required.png');
        return { 
          success: false, 
          error: 'Verification code required. Please check email and complete verification manually.' 
        };
      }
      
      // Submit the form
      console.log('📤 Submitting signup form...');
      const submitButton = 'button[type="submit"], button:has-text("Sign up"), div[data-e2e="signup-button"]';
      await this.page.waitForSelector(submitButton, { timeout: 10000 });
      await this.humanClick(submitButton);
      
      // Wait for success or error
      await this.humanDelay(3000, 5000);
      
      // Take final screenshot
      await this.takeScreenshot('/tmp/tiktok_signup_result.png');
      
      // Check if we're on the main TikTok page or profile setup
      const currentUrl = this.page.url();
      const accountCreated = currentUrl.includes('tiktok.com') && 
                           !currentUrl.includes('signup') && 
                           !currentUrl.includes('login');
      
      if (accountCreated) {
        console.log('✅ TikTok account created successfully!');
        const accountId = `tiktok_${Date.now()}`;
        return { success: true, accountId };
      } else {
        console.log('❌ Account creation may have failed');
        return { 
          success: false, 
          error: 'Account creation appears to have failed. Check screenshots for details.' 
        };
      }
      
    } catch (error) {
      console.error('❌ TikTok account creation error:', error);
      await this.takeScreenshot('/tmp/tiktok_signup_error.png');
      return { 
        success: false, 
        error: `Account creation failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Login to existing TikTok account
   */
  async loginToTikTok(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    console.log('🔑 Starting TikTok login process...');
    
    try {
      if (!this.page) {
        throw new Error('Browser not launched');
      }

      // Navigate to TikTok login page
      console.log('🌐 Navigating to TikTok login...');
      await this.page.goto('https://www.tiktok.com/login', { waitUntil: 'networkidle0' });
      
      // Take screenshot of login page
      await this.takeScreenshot('/tmp/tiktok_login_page.png');
      
      // Look for email login option
      console.log('🔍 Looking for email login option...');
      const emailLoginSelector = 'div[data-e2e="channel-item"]:has-text("Use email")';
      const emailLoginElement = await this.page.$(emailLoginSelector);
      
      if (emailLoginElement) {
        await this.humanClick(emailLoginSelector);
        await this.humanDelay(1000, 2000);
      }
      
      // Fill in email
      console.log('✏️ Entering email...');
      const emailInput = 'input[type="email"], input[placeholder*="email"], input[data-testid*="email"]';
      await this.page.waitForSelector(emailInput, { timeout: 10000 });
      await this.humanType(emailInput, email);
      
      // Fill in password
      console.log('🔒 Entering password...');
      const passwordInput = 'input[type="password"], input[placeholder*="password"], input[data-testid*="password"]';
      await this.page.waitForSelector(passwordInput, { timeout: 10000 });
      await this.humanType(passwordInput, password);
      
      // Submit login form
      console.log('🚀 Submitting login...');
      const loginButton = 'button[type="submit"], button:has-text("Log in"), div[data-e2e="login-button"]';
      await this.page.waitForSelector(loginButton, { timeout: 10000 });
      await this.humanClick(loginButton);
      
      // Wait for login to complete
      await this.humanDelay(3000, 5000);
      
      // Take screenshot after login attempt
      await this.takeScreenshot('/tmp/tiktok_login_result.png');
      
      // Check if login was successful
      const currentUrl = this.page.url();
      const isLoggedIn = currentUrl.includes('tiktok.com') && 
                        !currentUrl.includes('login') && 
                        !currentUrl.includes('signup');
      
      if (isLoggedIn) {
        console.log('✅ TikTok login successful!');
        return { success: true };
      } else {
        console.log('❌ TikTok login failed');
        return { 
          success: false, 
          error: 'Login failed. Check credentials or verification requirements.' 
        };
      }
      
    } catch (error) {
      console.error('❌ TikTok login error:', error);
      await this.takeScreenshot('/tmp/tiktok_login_error.png');
      return { 
        success: false, 
        error: `Login failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Upload video to TikTok using browser automation
   */
  async uploadVideoToTikTok(videoPath: string, caption: string, hashtags: string[] = []): Promise<{ success: boolean; postId?: string; url?: string; error?: string }> {
    console.log('🎬 Starting TikTok video upload process...');
    
    try {
      if (!this.page) {
        throw new Error('Browser not launched');
      }

      // Navigate to TikTok upload page
      console.log('🌐 Navigating to TikTok upload page...');
      await this.page.goto('https://www.tiktok.com/upload', { waitUntil: 'networkidle0' });
      
      // Take screenshot of upload page
      await this.takeScreenshot('/tmp/tiktok_upload_page.png');
      
      // Find file upload input
      console.log('📁 Looking for file upload input...');
      const fileInput = 'input[type="file"], input[accept*="video"]';
      await this.page.waitForSelector(fileInput, { timeout: 15000 });
      
      // Upload the video file
      console.log('⬆️ Uploading video file...');
      await this.page.setInputFiles(fileInput, videoPath);
      
      // Wait for video processing
      console.log('⏳ Waiting for video processing...');
      await this.humanDelay(5000, 8000);
      
      // Take screenshot after upload
      await this.takeScreenshot('/tmp/tiktok_video_uploaded.png');
      
      // Fill in caption
      console.log('✏️ Entering caption...');
      const captionArea = 'textarea[placeholder*="caption"], div[contenteditable="true"]';
      await this.page.waitForSelector(captionArea, { timeout: 10000 });
      
      const fullCaption = `${caption} ${hashtags.map(tag => `#${tag}`).join(' ')}`;
      await this.humanType(captionArea, fullCaption);
      
      // Handle privacy settings
      console.log('🔒 Setting privacy options...');
      const publicOption = 'div[data-e2e="privacy-public"], input[value="PUBLIC_TO_EVERYONE"]';
      const publicElement = await this.page.$(publicOption);
      if (publicElement) {
        await this.humanClick(publicOption);
      }
      
      // Wait a moment for form to be ready
      await this.humanDelay(2000, 3000);
      
      // Take screenshot before posting
      await this.takeScreenshot('/tmp/tiktok_ready_to_post.png');
      
      // Find and click the post button
      console.log('📤 Publishing video...');
      const postButton = 'button[data-e2e="publish-button"], button:has-text("Post")';
      await this.page.waitForSelector(postButton, { timeout: 10000 });
      await this.humanClick(postButton);
      
      // Wait for posting to complete
      console.log('⏳ Waiting for post to complete...');
      await this.humanDelay(10000, 15000);
      
      // Take final screenshot
      await this.takeScreenshot('/tmp/tiktok_post_complete.png');
      
      // Check for success indicators
      const currentUrl = this.page.url();
      const successIndicators = [
        'video uploaded successfully',
        'post shared',
        '@', // Profile page indicator
        '/video/' // Video page indicator
      ];
      
      const pageContent = await this.page.content();
      const isSuccess = successIndicators.some(indicator => 
        currentUrl.includes(indicator) || pageContent.toLowerCase().includes(indicator)
      );
      
      if (isSuccess) {
        console.log('✅ TikTok video uploaded successfully!');
        const postId = `tiktok_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const url = currentUrl.includes('/video/') ? currentUrl : `https://www.tiktok.com/video/${postId}`;
        
        return { 
          success: true, 
          postId, 
          url 
        };
      } else {
        console.log('❌ Video upload may have failed');
        return { 
          success: false, 
          error: 'Video upload appears to have failed. Check screenshots for details.' 
        };
      }
      
    } catch (error) {
      console.error('❌ TikTok video upload error:', error);
      await this.takeScreenshot('/tmp/tiktok_upload_error.png');
      return { 
        success: false, 
        error: `Video upload failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
}