import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha';
import { Browser, Page } from 'puppeteer-core';
import { promises as fs } from 'fs';
import * as path from 'path';

// Add stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

// Optional: Add reCAPTCHA solving capability
puppeteer.use(RecaptchaPlugin({
  provider: {
    id: '2captcha',
    token: process.env.CAPTCHA_API_KEY || '' // Optional API key
  },
  visualFeedback: true
}));

export interface AdvancedBrowserResult {
  success: boolean;
  error?: string;
  data?: any;
  screenshots?: string[];
  fingerprint?: any;
}

export class AdvancedStealthAutomation {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private screenshotCounter = 0;
  private deviceProfile: any;

  constructor() {
    this.setupMobileDeviceProfile();
  }

  /**
   * Setup realistic mobile device profile for social media platforms
   */
  private setupMobileDeviceProfile() {
    // Realistic Android device profiles for TikTok/Instagram (2025 updated)
    const mobileDevices = [
      {
        name: 'Samsung Galaxy S24',
        userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.165 Mobile Safari/537.36',
        viewport: { width: 360, height: 800, deviceScaleFactor: 3 },
        screen: { width: 1080, height: 2400 }
      },
      {
        name: 'iPhone 15 Pro',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        viewport: { width: 393, height: 852, deviceScaleFactor: 3 },
        screen: { width: 1179, height: 2556 }
      },
      {
        name: 'Google Pixel 8',
        userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.165 Mobile Safari/537.36',
        viewport: { width: 412, height: 915, deviceScaleFactor: 2.625 },
        screen: { width: 1080, height: 2400 }
      },
      {
        name: 'OnePlus 12',
        userAgent: 'Mozilla/5.0 (Linux; Android 14; CPH2581) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.165 Mobile Safari/537.36',
        viewport: { width: 412, height: 869, deviceScaleFactor: 2.625 },
        screen: { width: 1080, height: 2400 }
      },
      {
        name: 'Xiaomi 14',
        userAgent: 'Mozilla/5.0 (Linux; Android 14; 2312DRA50G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.165 Mobile Safari/537.36',
        viewport: { width: 393, height: 851, deviceScaleFactor: 2.75 },
        screen: { width: 1080, height: 2340 }
      }
    ];

    this.deviceProfile = mobileDevices[Math.floor(Math.random() * mobileDevices.length)];
  }

  /**
   * Advanced browser launch with stealth capabilities
   */
  async launchAdvancedBrowser(): Promise<AdvancedBrowserResult> {
    try {
      console.log('🚀 Launching advanced stealth browser (2025 techniques)...');
      console.log(`📱 Device profile: ${this.deviceProfile.name}`);

      // Advanced Chrome arguments for maximum stealth
      const chromeArgs = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-field-trial-config',
        '--disable-back-forward-cache',
        '--disable-hang-monitor',
        '--disable-prompt-on-repost',
        '--disable-sync',
        '--disable-translate',
        '--disable-ipc-flooding-protection',
        '--password-store=basic',
        '--use-mock-keychain',
        '--disable-component-extensions-with-background-pages',
        '--disable-default-apps',
        '--mute-audio',
        '--no-default-browser-check',
        '--autoplay-policy=user-gesture-required',
        '--disable-background-networking',
        '--disable-client-side-phishing-detection',
        '--disable-default-apps',
        '--disable-device-discovery-notifications',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-prerender-local-predictor',
        '--disable-web-security',
        '--allow-running-insecure-content',
        '--disable-blink-features=AutomationControlled',
        '--flag-switches-begin',
        '--flag-switches-end',
        // Mobile simulation
        `--user-agent=${this.deviceProfile.userAgent}`
      ];

      // Launch browser with stealth configuration
      this.browser = await puppeteer.launch({
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
        headless: 'new', // Use new headless mode
        args: chromeArgs,
        ignoreDefaultArgs: ['--enable-automation'],
        defaultViewport: null
      });

      // Create new page with advanced stealth setup
      this.page = await this.browser.newPage();

      // Set mobile viewport
      await this.page.setViewport({
        width: this.deviceProfile.viewport.width,
        height: this.deviceProfile.viewport.height,
        deviceScaleFactor: this.deviceProfile.viewport.deviceScaleFactor,
        isMobile: true,
        hasTouch: true
      });

      // Set realistic user agent
      await this.page.setUserAgent(this.deviceProfile.userAgent);

      // Advanced anti-detection: Override browser properties
      await this.page.evaluateOnNewDocument(() => {
        // Remove webdriver traces
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });

        // Override plugins
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5],
        });

        // Override languages
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en'],
        });

        // Override chrome object
        Object.defineProperty(window, 'chrome', {
          get: () => ({
            runtime: {},
          }),
        });

        // Override permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
        );

        // Add realistic screen properties
        Object.defineProperty(screen, 'width', {
          get: () => 1080,
        });
        Object.defineProperty(screen, 'height', {
          get: () => 2400,
        });

        // Add realistic touch capabilities
        Object.defineProperty(navigator, 'maxTouchPoints', {
          get: () => 5,
        });

        // Add device memory
        Object.defineProperty(navigator, 'deviceMemory', {
          get: () => 8,
        });

        // Add hardware concurrency
        Object.defineProperty(navigator, 'hardwareConcurrency', {
          get: () => 8,
        });
      });

      // Set extra headers to mimic real mobile browser
      await this.page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-User': '?1',
        'Sec-Fetch-Dest': 'document',
        'Cache-Control': 'max-age=0'
      });

      console.log('✅ Advanced stealth browser launched successfully');
      console.log(`📱 Simulating: ${this.deviceProfile.name}`);
      console.log(`🌐 User Agent: ${this.deviceProfile.userAgent.substring(0, 50)}...`);

      return {
        success: true,
        data: { 
          browserLaunched: true,
          deviceProfile: this.deviceProfile.name,
          userAgent: this.deviceProfile.userAgent
        }
      };

    } catch (error) {
      console.error('❌ Failed to launch advanced browser:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown browser launch error'
      };
    }
  }

  /**
   * Human-like delay with random variance
   */
  private async humanDelay(minMs: number = 1000, maxMs: number = 3000): Promise<void> {
    const delay = Math.random() * (maxMs - minMs) + minMs;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Simulate human-like mouse movements
   */
  private async humanMouseMove(x: number, y: number): Promise<void> {
    if (!this.page) return;
    
    // Random path to target with multiple steps
    const steps = Math.floor(Math.random() * 5) + 3;
    const currentMouse = await this.page.mouse;
    
    for (let i = 0; i < steps; i++) {
      const progress = i / steps;
      const currentX = x * progress + Math.random() * 10 - 5;
      const currentY = y * progress + Math.random() * 10 - 5;
      
      await currentMouse.move(currentX, currentY);
      await this.humanDelay(50, 150);
    }
  }

  /**
   * Advanced screenshot with fingerprint information
   */
  async takeAdvancedScreenshot(description: string): Promise<string> {
    if (!this.page) {
      throw new Error('Browser not launched or page not available');
    }

    try {
      this.screenshotCounter++;
      const timestamp = Date.now();
      const filename = `/tmp/advanced_stealth_${this.screenshotCounter}_${timestamp}.png`;
      
      // Take full page screenshot
      await this.page.screenshot({ 
        path: filename, 
        fullPage: true,
        type: 'png',
        quality: 90
      });

      // Capture fingerprint information
      const fingerprint = await this.page.evaluate(() => ({
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        languages: navigator.languages,
        cookieEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack,
        hardwareConcurrency: navigator.hardwareConcurrency,
        maxTouchPoints: navigator.maxTouchPoints,
        deviceMemory: (navigator as any).deviceMemory,
        screen: {
          width: screen.width,
          height: screen.height,
          colorDepth: screen.colorDepth,
          pixelDepth: screen.pixelDepth
        },
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        webdriver: navigator.webdriver
      }));
      
      console.log(`📸 Advanced screenshot: ${description} -> ${filename}`);
      console.log(`🔍 Fingerprint captured: webdriver=${fingerprint.webdriver}, platform=${fingerprint.platform}`);
      
      return filename;
    } catch (error) {
      console.error('❌ Advanced screenshot failed:', error);
      return '';
    }
  }

  /**
   * Navigate to TikTok with advanced stealth
   */
  async navigateToTikTokAdvanced(): Promise<AdvancedBrowserResult> {
    if (!this.page) {
      return { success: false, error: 'Browser not launched' };
    }

    try {
      console.log('🌐 Navigating to TikTok with advanced stealth...');
      
      // Pre-navigation: Set additional mobile headers
      await this.page.setExtraHTTPHeaders({
        'Sec-CH-UA': '"Chromium";v="125", "Not.A/Brand";v="24"',
        'Sec-CH-UA-Mobile': '?1',
        'Sec-CH-UA-Platform': '"Android"',
        'Upgrade-Insecure-Requests': '1'
      });

      // Navigate with realistic options
      await this.page.goto('https://www.tiktok.com', { 
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Human-like interaction: scroll slightly
      await this.humanDelay(2000, 4000);
      await this.page.evaluate(() => {
        window.scrollBy(0, Math.random() * 200 + 100);
      });

      await this.humanDelay(1000, 2000);
      
      const screenshot1 = await this.takeAdvancedScreenshot('TikTok homepage loaded with stealth');
      
      // Check for bot detection
      const pageContent = await this.page.content();
      const isBotDetected = pageContent.includes('unusual traffic') || 
                           pageContent.includes('captcha') || 
                           pageContent.includes('verify you are human');

      console.log('✅ Successfully navigated to TikTok with advanced stealth');
      console.log(`🤖 Bot detection status: ${isBotDetected ? 'DETECTED' : 'NOT DETECTED'}`);
      
      return {
        success: true,
        data: { 
          url: this.page.url(),
          botDetected: isBotDetected,
          deviceProfile: this.deviceProfile.name
        },
        screenshots: [screenshot1]
      };

    } catch (error) {
      console.error('❌ Failed to navigate to TikTok:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Navigation error'
      };
    }
  }

  /**
   * Advanced login attempt with human-like behavior
   */
  async attemptAdvancedLogin(email: string, password: string): Promise<AdvancedBrowserResult> {
    if (!this.page) {
      return { success: false, error: 'Browser not launched' };
    }

    try {
      console.log('🔐 Attempting advanced TikTok login with human-like behavior...');
      
      // Look for login button with multiple selectors
      const loginSelectors = [
        '[data-e2e="top-login-button"]',
        'a[href*="login"]',
        'button:contains("Log in")',
        '.login-button',
        '[data-testid="login-button"]'
      ];

      let loginClicked = false;
      for (const selector of loginSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 5000 });
          
          // Human-like mouse movement to button
          const loginElement = await this.page.$(selector);
          if (loginElement) {
            const box = await loginElement.boundingBox();
            if (box) {
              await this.humanMouseMove(box.x + box.width/2, box.y + box.height/2);
              await this.humanDelay(500, 1000);
              await loginElement.click();
              loginClicked = true;
              break;
            }
          }
        } catch (e) {
          continue;
        }
      }

      if (!loginClicked) {
        console.log('⚠️ Login button not found, trying direct navigation');
        await this.page.goto('https://www.tiktok.com/login', { waitUntil: 'networkidle2' });
      }

      await this.humanDelay(2000, 4000);
      const screenshot2 = await this.takeAdvancedScreenshot('Login page loaded');

      // Try to find and click email/username login option
      const emailLoginSelectors = [
        '[data-e2e="login-phone-email-username"]',
        'div:contains("Use phone / email / username")',
        '.login-method-email',
        'button:contains("Email")'
      ];

      for (const selector of emailLoginSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 3000 });
          await this.page.click(selector);
          await this.humanDelay(1000, 2000);
          break;
        } catch (e) {
          continue;
        }
      }

      const screenshot3 = await this.takeAdvancedScreenshot('Email login form');

      // Enter email with human-like typing
      const emailInputSelectors = [
        'input[type="text"]',
        'input[placeholder*="email"]',
        'input[placeholder*="Email"]',
        'input[name*="email"]',
        '[data-e2e="email-input"]'
      ];

      for (const selector of emailInputSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 5000 });
          
          // Human-like typing with random delays
          await this.page.click(selector);
          await this.humanDelay(500, 1000);
          
          for (const char of email) {
            await this.page.type(selector, char, { delay: Math.random() * 150 + 50 });
          }
          break;
        } catch (e) {
          continue;
        }
      }

      await this.humanDelay(1000, 2000);

      // Enter password with human-like typing
      const passwordInputSelectors = [
        'input[type="password"]',
        'input[placeholder*="password"]',
        'input[placeholder*="Password"]',
        '[data-e2e="password-input"]'
      ];

      for (const selector of passwordInputSelectors) {
        try {
          await this.page.click(selector);
          await this.humanDelay(500, 1000);
          
          for (const char of password) {
            await this.page.type(selector, char, { delay: Math.random() * 150 + 50 });
          }
          break;
        } catch (e) {
          continue;
        }
      }

      const screenshot4 = await this.takeAdvancedScreenshot('Login credentials entered');

      // Submit login form
      const submitSelectors = [
        'button[data-e2e="login-button"]',
        'button[type="submit"]',
        'button:contains("Log in")',
        '.login-submit-button'
      ];

      for (const selector of submitSelectors) {
        try {
          await this.page.click(selector);
          break;
        } catch (e) {
          continue;
        }
      }

      // If no submit button found, try pressing Enter
      if (!await this.page.$('button[data-e2e="login-button"]')) {
        await this.page.keyboard.press('Enter');
      }

      await this.humanDelay(5000, 8000); // Wait for login processing

      const screenshot5 = await this.takeAdvancedScreenshot('After login attempt');

      // Check login success
      const currentUrl = this.page.url();
      const isLoggedIn = !currentUrl.includes('/login') && !currentUrl.includes('/signup');
      
      // Check for CAPTCHA
      const pageContent = await this.page.content();
      const hasCaptcha = pageContent.includes('captcha') || pageContent.includes('puzzle');

      console.log(`🔍 Advanced login check - URL: ${currentUrl}`);
      console.log(`🔑 Logged in: ${isLoggedIn}`);
      console.log(`🧩 CAPTCHA detected: ${hasCaptcha}`);

      return {
        success: true,
        data: { 
          loginAttempted: true,
          loggedIn: isLoggedIn,
          captchaDetected: hasCaptcha,
          currentUrl: currentUrl,
          deviceProfile: this.deviceProfile.name
        },
        screenshots: [screenshot2, screenshot3, screenshot4, screenshot5]
      };

    } catch (error) {
      console.error('❌ Advanced login attempt failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login error'
      };
    }
  }

  /**
   * Advanced video upload with human-like behavior
   */
  async uploadVideoAdvanced(videoPath: string, title: string, hashtags: string[]): Promise<AdvancedBrowserResult> {
    if (!this.page) {
      return { success: false, error: 'Browser not launched' };
    }

    try {
      console.log('📤 Navigating to TikTok upload with advanced stealth...');
      
      // Navigate to upload page
      await this.page.goto('https://www.tiktok.com/upload', { waitUntil: 'networkidle2' });
      await this.humanDelay(3000, 5000);
      
      const screenshot6 = await this.takeAdvancedScreenshot('Upload page loaded');

      // Look for file upload input
      const fileInputSelectors = [
        'input[type="file"]',
        'input[accept*="video"]',
        '[data-e2e="upload-input"]',
        '.upload-input'
      ];

      let uploadSuccess = false;
      for (const selector of fileInputSelectors) {
        try {
          const fileInput = await this.page.$(selector);
          if (fileInput) {
            await fileInput.uploadFile(path.resolve(videoPath));
            uploadSuccess = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!uploadSuccess) {
        throw new Error('Could not find file upload input');
      }

      await this.humanDelay(10000, 15000); // Wait for upload processing
      const screenshot7 = await this.takeAdvancedScreenshot('Video uploaded and processing');

      // Wait for video to be processed
      await this.humanDelay(15000, 20000);
      const screenshot8 = await this.takeAdvancedScreenshot('Video processed');

      // Fill in caption with human-like typing
      const captionSelectors = [
        'div[contenteditable="true"]',
        'textarea[placeholder*="caption"]',
        'div[data-text="true"]',
        '[data-e2e="caption-input"]'
      ];

      const fullCaption = `${title}\n\n${hashtags.join(' ')}`;
      
      for (const selector of captionSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 10000 });
          await this.page.click(selector);
          await this.humanDelay(1000, 2000);
          
          // Type caption with human-like delays
          for (const char of fullCaption) {
            await this.page.type(selector, char, { delay: Math.random() * 100 + 30 });
          }
          break;
        } catch (e) {
          continue;
        }
      }

      const screenshot9 = await this.takeAdvancedScreenshot('Caption and hashtags entered');

      // Try to publish the video
      const publishSelectors = [
        'button[data-e2e="publish-button"]',
        'button:contains("Post")',
        '.publish-button',
        'button:contains("Publish")'
      ];

      let publishAttempted = false;
      for (const selector of publishSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 10000 });
          
          // Human-like mouse movement to publish button
          const publishElement = await this.page.$(selector);
          if (publishElement) {
            const box = await publishElement.boundingBox();
            if (box) {
              await this.humanMouseMove(box.x + box.width/2, box.y + box.height/2);
              await this.humanDelay(1000, 2000);
              await publishElement.click();
              publishAttempted = true;
              break;
            }
          }
        } catch (e) {
          continue;
        }
      }

      await this.humanDelay(10000, 15000);
      const screenshot10 = await this.takeAdvancedScreenshot(publishAttempted ? 'Video publish attempted' : 'Ready to publish manually');

      return {
        success: true,
        data: {
          videoUploaded: true,
          publishAttempted: publishAttempted,
          finalUrl: this.page.url(),
          deviceProfile: this.deviceProfile.name
        },
        screenshots: [screenshot6, screenshot7, screenshot8, screenshot9, screenshot10]
      };

    } catch (error) {
      console.error('❌ Advanced upload process failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload error'
      };
    }
  }

  /**
   * Close browser and cleanup
   */
  async closeBrowser(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
        console.log('🔒 Advanced stealth browser closed successfully');
      } catch (error) {
        console.error('❌ Error closing browser:', error);
      }
      this.browser = null;
      this.page = null;
    }
  }

  /**
   * Get current page information with fingerprint data
   */
  async getCurrentPageInfo(): Promise<{ url: string; title: string; fingerprint?: any }> {
    if (!this.page) {
      return { url: 'No browser', title: 'No browser' };
    }

    try {
      const url = this.page.url();
      const title = await this.page.title();
      
      // Get detailed fingerprint information
      const fingerprint = await this.page.evaluate(() => ({
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        languages: navigator.languages,
        webdriver: navigator.webdriver,
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: (navigator as any).deviceMemory,
        maxTouchPoints: navigator.maxTouchPoints,
        screen: {
          width: screen.width,
          height: screen.height,
          availWidth: screen.availWidth,
          availHeight: screen.availHeight,
          colorDepth: screen.colorDepth
        }
      }));

      return { url, title, fingerprint };
    } catch (error) {
      return { url: 'Error', title: 'Error' };
    }
  }
}