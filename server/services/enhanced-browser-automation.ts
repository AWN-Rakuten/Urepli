import { chromium, firefox, webkit, Browser, Page, BrowserContext } from 'playwright';
import { UserAgent } from 'user-agents';

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
}