import puppeteer, { Browser, Page } from 'puppeteer-core';
import { promises as fs } from 'fs';
import * as path from 'path';

export interface RealBrowserResult {
  success: boolean;
  error?: string;
  data?: any;
  screenshots?: string[];
}

export class PuppeteerBrowserAutomation {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private screenshotCounter = 0;

  constructor() {}

  /**
   * Launch Chromium browser with real automation capabilities using Puppeteer
   */
  async launchBrowser(): Promise<RealBrowserResult> {
    try {
      console.log('🚀 Launching real Chromium browser with Puppeteer...');

      // Launch browser with the system Chromium
      this.browser = await puppeteer.launch({
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
        headless: 'new', // Use new headless mode
        args: [
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--allow-running-insecure-content',
          '--disable-features=VizDisplayCompositor',
          '--disable-extensions',
          '--disable-default-apps',
          '--disable-background-timer-throttling',
          '--disable-background-networking',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-ipc-flooding-protection',
          '--disable-blink-features=AutomationControlled',
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
        ]
      });

      // Create a new page
      this.page = await this.browser.newPage();
      
      // Set viewport
      await this.page.setViewport({ width: 1920, height: 1080 });
      
      // Remove webdriver detection
      await this.page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });
      });

      console.log('✅ Real Chromium browser launched successfully with Puppeteer');
      
      return {
        success: true,
        data: { browserLaunched: true }
      };

    } catch (error) {
      console.error('❌ Failed to launch browser:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown browser launch error'
      };
    }
  }

  /**
   * Take a screenshot and save it
   */
  async takeScreenshot(description: string): Promise<string> {
    if (!this.page) {
      throw new Error('Browser not launched or page not available');
    }

    try {
      this.screenshotCounter++;
      const timestamp = Date.now();
      const filename = `/tmp/real_tiktok_puppeteer_${this.screenshotCounter}_${timestamp}.png`;
      
      await this.page.screenshot({ path: filename, fullPage: true });
      
      console.log(`📸 Screenshot saved: ${description} -> ${filename}`);
      return filename;
    } catch (error) {
      console.error('❌ Screenshot failed:', error);
      return '';
    }
  }

  /**
   * Navigate to TikTok and handle login/signup
   */
  async navigateToTikTok(): Promise<RealBrowserResult> {
    if (!this.page) {
      return { success: false, error: 'Browser not launched' };
    }

    try {
      console.log('🌐 Navigating to TikTok...');
      
      await this.page.goto('https://www.tiktok.com', { waitUntil: 'networkidle2' });
      await this.page.waitForTimeout(3000);
      
      const screenshot1 = await this.takeScreenshot('TikTok homepage loaded');
      
      console.log('✅ Successfully navigated to TikTok');
      
      return {
        success: true,
        data: { url: this.page.url() },
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
   * Attempt login with provided credentials
   */
  async attemptLogin(email: string, password: string): Promise<RealBrowserResult> {
    if (!this.page) {
      return { success: false, error: 'Browser not launched' };
    }

    try {
      console.log('🔐 Attempting TikTok login...');
      
      // Look for login button
      try {
        await this.page.waitForSelector('a[href*="login"], [data-e2e="top-login-button"]', { timeout: 10000 });
        await this.page.click('a[href*="login"], [data-e2e="top-login-button"]');
        await this.page.waitForTimeout(2000);
      } catch (e) {
        console.log('⚠️ Login button not found, trying direct navigation');
        await this.page.goto('https://www.tiktok.com/login', { waitUntil: 'networkidle2' });
        await this.page.waitForTimeout(3000);
      }
      
      const screenshot2 = await this.takeScreenshot('Login page loaded');
      
      // Try to find email/username login option
      try {
        await this.page.waitForSelector('[data-e2e="login-phone-email-username"]', { timeout: 5000 });
        await this.page.click('[data-e2e="login-phone-email-username"]');
        await this.page.waitForTimeout(1000);
      } catch (e) {
        console.log('⚠️ Email login option not found, continuing...');
      }
      
      const screenshot3 = await this.takeScreenshot('Email login form');
      
      // Enter email
      try {
        await this.page.waitForSelector('input[type="text"], input[placeholder*="email"]', { timeout: 10000 });
        await this.page.type('input[type="text"], input[placeholder*="email"]', email);
        await this.page.waitForTimeout(1000);
      } catch (e) {
        console.log('⚠️ Email input not found');
      }
      
      // Enter password
      try {
        await this.page.type('input[type="password"]', password);
        await this.page.waitForTimeout(1000);
      } catch (e) {
        console.log('⚠️ Password input not found');
      }
      
      const screenshot4 = await this.takeScreenshot('Login credentials entered');
      
      // Try to submit login
      try {
        await this.page.click('button[data-e2e="login-button"], button[type="submit"]');
        await this.page.waitForTimeout(5000);
      } catch (e) {
        // Try pressing Enter
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(5000);
      }
      
      const screenshot5 = await this.takeScreenshot('After login attempt');
      
      // Check if login was successful
      const currentUrl = this.page.url();
      const isLoggedIn = !currentUrl.includes('/login') && !currentUrl.includes('/signup');
      
      console.log(`🔍 Login check - URL: ${currentUrl}, Logged in: ${isLoggedIn}`);
      
      return {
        success: true,
        data: { 
          loginAttempted: true,
          loggedIn: isLoggedIn,
          currentUrl: currentUrl
        },
        screenshots: [screenshot2, screenshot3, screenshot4, screenshot5]
      };

    } catch (error) {
      console.error('❌ Login attempt failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login error'
      };
    }
  }

  /**
   * Navigate to upload page and upload video
   */
  async uploadVideo(videoPath: string, title: string, hashtags: string[]): Promise<RealBrowserResult> {
    if (!this.page) {
      return { success: false, error: 'Browser not launched' };
    }

    try {
      console.log('📤 Navigating to TikTok upload page...');
      
      await this.page.goto('https://www.tiktok.com/upload', { waitUntil: 'networkidle2' });
      await this.page.waitForTimeout(5000);
      
      const screenshot6 = await this.takeScreenshot('Upload page loaded');
      
      // Look for file upload input
      try {
        await this.page.waitForSelector('input[type="file"], input[accept*="video"]', { timeout: 15000 });
        
        // Upload the video file
        const fileInput = await this.page.$('input[type="file"], input[accept*="video"]');
        if (fileInput) {
          await fileInput.uploadFile(path.resolve(videoPath));
          await this.page.waitForTimeout(10000);
        }
        
        const screenshot7 = await this.takeScreenshot('Video uploaded and processing');
        
        // Wait for video to be processed
        await this.page.waitForTimeout(15000);
        
        const screenshot8 = await this.takeScreenshot('Video processed');
        
        // Fill in title and description
        try {
          await this.page.waitForSelector('div[contenteditable="true"], textarea', { timeout: 10000 });
          
          const fullCaption = `${title}\n\n${hashtags.join(' ')}`;
          await this.page.type('div[contenteditable="true"], textarea', fullCaption);
          await this.page.waitForTimeout(2000);
          
          const screenshot9 = await this.takeScreenshot('Caption and hashtags entered');
          
        } catch (e) {
          console.log('⚠️ Caption input not found, continuing...');
        }
        
        // Try to publish the video
        try {
          await this.page.waitForSelector('button[data-e2e="publish-button"], button:contains("Post")');
          await this.page.click('button[data-e2e="publish-button"], button:contains("Post")');
          await this.page.waitForTimeout(10000);
          
          const screenshot10 = await this.takeScreenshot('Video published');
          
          return {
            success: true,
            data: {
              videoUploaded: true,
              published: true,
              finalUrl: this.page.url()
            },
            screenshots: [screenshot6, screenshot7, screenshot8, screenshot9, screenshot10]
          };
          
        } catch (e) {
          console.log('⚠️ Publish button not found or publish failed');
          const screenshot10 = await this.takeScreenshot('Ready to publish (manual)');
          
          return {
            success: true,
            data: {
              videoUploaded: true,
              readyToPublish: true,
              finalUrl: this.page.url()
            },
            screenshots: [screenshot6, screenshot7, screenshot8, screenshot9, screenshot10]
          };
        }
        
      } catch (e) {
        console.log('⚠️ File upload failed:', e);
        const errorScreenshot = await this.takeScreenshot('Upload failed');
        return {
          success: false,
          error: 'File upload failed',
          screenshots: [screenshot6, errorScreenshot]
        };
      }
      
    } catch (error) {
      console.error('❌ Upload process failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload error'
      };
    }
  }

  /**
   * Close the browser
   */
  async closeBrowser(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
        console.log('🔒 Browser closed successfully');
      } catch (error) {
        console.error('❌ Error closing browser:', error);
      }
      this.browser = null;
      this.page = null;
    }
  }

  /**
   * Get current page info
   */
  async getCurrentPageInfo(): Promise<{ url: string; title: string }> {
    if (!this.page) {
      return { url: 'No browser', title: 'No browser' };
    }

    try {
      const url = this.page.url();
      const title = await this.page.title();
      return { url, title };
    } catch (error) {
      return { url: 'Error', title: 'Error' };
    }
  }
}