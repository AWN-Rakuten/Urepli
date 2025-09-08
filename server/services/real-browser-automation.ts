import { Builder, By, until, WebDriver, Key } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';
import { promises as fs } from 'fs';
import * as path from 'path';

export interface RealBrowserResult {
  success: boolean;
  error?: string;
  data?: any;
  screenshots?: string[];
}

export class RealBrowserAutomation {
  private driver: WebDriver | null = null;
  private screenshotCounter = 0;

  constructor() {}

  /**
   * Launch Chrome browser with real automation capabilities
   */
  async launchBrowser(): Promise<RealBrowserResult> {
    try {
      console.log('🚀 Launching real Chromium browser...');

      const chromeOptions = new chrome.Options();
      
      // Set the actual Chromium binary path
      chromeOptions.setChromeBinaryPath('/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium');
      
      // Configure Chrome for automation - headless for now due to environment constraints
      chromeOptions.addArguments('--headless=new');
      chromeOptions.addArguments('--no-sandbox');
      chromeOptions.addArguments('--disable-dev-shm-usage');
      chromeOptions.addArguments('--disable-gpu');
      chromeOptions.addArguments('--remote-debugging-port=9222');
      chromeOptions.addArguments('--disable-blink-features=AutomationControlled');
      chromeOptions.addArguments('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
      chromeOptions.addArguments('--window-size=1920,1080');
      chromeOptions.addArguments('--disable-web-security');
      chromeOptions.addArguments('--allow-running-insecure-content');
      chromeOptions.addArguments('--disable-features=VizDisplayCompositor');
      chromeOptions.addArguments('--disable-extensions');
      chromeOptions.addArguments('--disable-default-apps');
      chromeOptions.addArguments('--disable-background-timer-throttling');
      chromeOptions.addArguments('--disable-background-networking');
      chromeOptions.addArguments('--disable-backgrounding-occluded-windows');
      chromeOptions.addArguments('--disable-renderer-backgrounding');
      chromeOptions.addArguments('--disable-ipc-flooding-protection');
      
      // Set preferences to disable automation detection
      chromeOptions.setUserPreferences({
        'profile.default_content_setting_values.notifications': 2,
        'profile.managed_default_content_settings.images': 1
      });

      // Use the service directly with no chromedriver path since it's built into selenium
      const service = new chrome.ServiceBuilder();
      
      // Build the driver
      this.driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(chromeOptions)
        .setChromeService(service)
        .build();

      // Remove webdriver property to avoid detection
      await this.driver.executeScript('delete navigator.__webdriver');

      console.log('✅ Real Chrome browser launched successfully');
      
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
    if (!this.driver) {
      throw new Error('Browser not launched');
    }

    try {
      this.screenshotCounter++;
      const timestamp = Date.now();
      const filename = `/tmp/real_tiktok_${this.screenshotCounter}_${timestamp}.png`;
      
      const screenshot = await this.driver.takeScreenshot();
      await fs.writeFile(filename, screenshot, 'base64');
      
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
    if (!this.driver) {
      return { success: false, error: 'Browser not launched' };
    }

    try {
      console.log('🌐 Navigating to TikTok...');
      
      await this.driver.get('https://www.tiktok.com');
      await this.driver.sleep(3000); // Wait for page load
      
      const screenshot1 = await this.takeScreenshot('TikTok homepage loaded');
      
      console.log('✅ Successfully navigated to TikTok');
      
      return {
        success: true,
        data: { url: await this.driver.getCurrentUrl() },
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
    if (!this.driver) {
      return { success: false, error: 'Browser not launched' };
    }

    try {
      console.log('🔐 Attempting TikTok login...');
      
      // Look for login button
      try {
        const loginButton = await this.driver.wait(
          until.elementLocated(By.css('[data-e2e="top-login-button"], [data-e2e="login-button"], a[href*="login"]')), 
          10000
        );
        await loginButton.click();
        await this.driver.sleep(2000);
      } catch (e) {
        console.log('⚠️ Login button not found, trying direct navigation');
        await this.driver.get('https://www.tiktok.com/login');
        await this.driver.sleep(3000);
      }
      
      const screenshot2 = await this.takeScreenshot('Login page loaded');
      
      // Try different login methods
      try {
        // Look for "Use phone / email / username" option
        const emailLoginOption = await this.driver.findElement(
          By.css('[data-e2e="login-phone-email-username"], .tiktok-1uwhmqz-DivLoginMethodContainer')
        );
        await emailLoginOption.click();
        await this.driver.sleep(1000);
      } catch (e) {
        console.log('⚠️ Email login option not found, continuing...');
      }
      
      const screenshot3 = await this.takeScreenshot('Email login form');
      
      // Enter email
      try {
        const emailInput = await this.driver.wait(
          until.elementLocated(By.css('input[type="text"], input[placeholder*="email"], input[placeholder*="Email"], input[name*="email"]')),
          10000
        );
        await emailInput.clear();
        await emailInput.sendKeys(email);
        await this.driver.sleep(1000);
      } catch (e) {
        console.log('⚠️ Email input not found');
      }
      
      // Enter password
      try {
        const passwordInput = await this.driver.findElement(
          By.css('input[type="password"], input[placeholder*="password"], input[placeholder*="Password"]')
        );
        await passwordInput.clear();
        await passwordInput.sendKeys(password);
        await this.driver.sleep(1000);
      } catch (e) {
        console.log('⚠️ Password input not found');
      }
      
      const screenshot4 = await this.takeScreenshot('Login credentials entered');
      
      // Try to submit login
      try {
        const submitButton = await this.driver.findElement(
          By.css('button[data-e2e="login-button"], button[type="submit"], .tiktok-login-submit-button')
        );
        await submitButton.click();
        await this.driver.sleep(5000); // Wait for login processing
      } catch (e) {
        // Try pressing Enter
        const passwordInput = await this.driver.findElement(By.css('input[type="password"]'));
        await passwordInput.sendKeys(Key.ENTER);
        await this.driver.sleep(5000);
      }
      
      const screenshot5 = await this.takeScreenshot('After login attempt');
      
      // Check if login was successful by looking for profile elements
      const currentUrl = await this.driver.getCurrentUrl();
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
    if (!this.driver) {
      return { success: false, error: 'Browser not launched' };
    }

    try {
      console.log('📤 Navigating to TikTok upload page...');
      
      await this.driver.get('https://www.tiktok.com/upload');
      await this.driver.sleep(5000);
      
      const screenshot6 = await this.takeScreenshot('Upload page loaded');
      
      // Look for file upload input
      try {
        const fileInput = await this.driver.wait(
          until.elementLocated(By.css('input[type="file"], input[accept*="video"]')),
          15000
        );
        
        // Upload the video file
        await fileInput.sendKeys(path.resolve(videoPath));
        await this.driver.sleep(10000); // Wait for upload processing
        
        const screenshot7 = await this.takeScreenshot('Video uploaded and processing');
        
        // Wait for video to be processed
        await this.driver.sleep(15000);
        
        const screenshot8 = await this.takeScreenshot('Video processed');
        
        // Fill in title and description
        try {
          const captionInput = await this.driver.wait(
            until.elementLocated(By.css('div[contenteditable="true"], textarea[placeholder*="caption"], div[data-text="true"]')),
            10000
          );
          
          const fullCaption = `${title}\n\n${hashtags.join(' ')}`;
          await captionInput.clear();
          await captionInput.sendKeys(fullCaption);
          await this.driver.sleep(2000);
          
          const screenshot9 = await this.takeScreenshot('Caption and hashtags entered');
          
        } catch (e) {
          console.log('⚠️ Caption input not found, continuing...');
        }
        
        // Try to publish the video
        try {
          const publishButton = await this.driver.wait(
            until.elementLocated(By.css('button[data-e2e="publish-button"], button:contains("Post"), .publish-button')),
            10000
          );
          await publishButton.click();
          await this.driver.sleep(10000);
          
          const screenshot10 = await this.takeScreenshot('Video published');
          
          const finalUrl = await this.driver.getCurrentUrl();
          
          return {
            success: true,
            data: {
              videoUploaded: true,
              published: true,
              finalUrl: finalUrl
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
              finalUrl: await this.driver.getCurrentUrl()
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
    if (this.driver) {
      try {
        await this.driver.quit();
        console.log('🔒 Browser closed successfully');
      } catch (error) {
        console.error('❌ Error closing browser:', error);
      }
      this.driver = null;
    }
  }

  /**
   * Get current page title
   */
  async getCurrentPageInfo(): Promise<{ url: string; title: string }> {
    if (!this.driver) {
      return { url: 'No browser', title: 'No browser' };
    }

    try {
      const url = await this.driver.getCurrentUrl();
      const title = await this.driver.getTitle();
      return { url, title };
    } catch (error) {
      return { url: 'Error', title: 'Error' };
    }
  }
}