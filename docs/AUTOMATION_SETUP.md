# Hyper Automation Environment Configuration

## N8N Latest Release Integration (Version 1.19.4+)

### Installing N8N Latest Version (1.19.4+)
```bash
# Check current n8n version
n8n --version

# Install/Update to latest version globally
npm install -g n8n@latest

# Or install specific latest version
npm install -g n8n@1.19.4

# Verify installation
n8n --version
# Should show: 1.19.4 or later

# For Docker users - pull latest image
docker pull n8nio/n8n:latest

# Check Docker image version
docker run --rm n8nio/n8n:latest n8n --version
```

### N8N Latest Features Integration (Version 1.19.4+)

#### New Features in 1.19.4+
- **Enhanced AI Nodes**: Improved AI/ML integration capabilities
- **Better Performance**: 40% faster workflow execution
- **Advanced Security**: Enhanced encryption and security features
- **Japanese Localization**: Improved Japanese language support
- **Mobile Responsiveness**: Better mobile workflow management
- **Advanced Debugging**: Enhanced debugging and error handling

#### Custom Node Package for Latest N8N
```json
{
  "name": "@urepli/n8n-nodes-japanese-pack",
  "version": "2.0.0",
  "description": "Comprehensive Japanese market automation nodes for n8n 1.19.4+",
  "main": "index.js",
  "n8n": {
    "n8nNodesApiVersion": 1,
    "credentials": [
      "dist/credentials/A8NetApi.credentials.js",
      "dist/credentials/RakutenAffiliateApi.credentials.js",
      "dist/credentials/TikTokBusinessApi.credentials.js",
      "dist/credentials/InstagramGraphApi.credentials.js"
    ],
    "nodes": [
      "dist/nodes/A8NetProductSearch/A8NetProductSearch.node.js",
      "dist/nodes/RakutenProductSearch/RakutenProductSearch.node.js",
      "dist/nodes/MultiPlatformPoster/MultiPlatformPoster.node.js",
      "dist/nodes/GeminiContentGenerator/GeminiContentGenerator.node.js",
      "dist/nodes/ComfyUIVideoProcessor/ComfyUIVideoProcessor.node.js",
      "dist/nodes/JapaneseAnalytics/JapaneseAnalytics.node.js"
    ]
  },
  "peerDependencies": {
    "n8n-workflow": "^1.19.4"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### N8N Latest Release Integration Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    N8N v1.19.4+ Core                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │  Enhanced   │ │   Advanced  │ │    Japanese Market      │ │
│  │  AI Engine  │ │  Security   │ │   Custom Nodes          │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Urepli Custom Extensions                   │ │
│  │  • A8.net Advanced Integration                          │ │
│  │  • Rakuten Affiliate Pro                               │ │
│  │  • Multi-Platform Social Media Manager                 │ │
│  │  • AI Content Generation Engine                        │ │
│  │  • Japanese Analytics & Insights                       │ │
│  │  • Copyright-Safe Video Processing                     │ │
│  └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│              Real-Time Workflow Engine                     │
│  • Instant execution for social media posting              │
│  • Smart queue management for high-volume operations       │
│  • Auto-scaling based on load                              │
│  • Advanced error handling and retry mechanisms            │
└─────────────────────────────────────────────────────────────┘
```

## Core N8N Services Integration

### Enhanced N8N Service Configuration
```typescript
// server/services/enhanced-n8n-integration.ts
import { N8nClient } from 'n8n-client';
import { WorkflowTemplate } from './types';

export class EnhancedN8NIntegration {
  private client: N8nClient;
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.baseUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678';
    this.apiKey = process.env.N8N_API_KEY || '';
    this.client = new N8nClient({
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      version: '1.19.4'
    });
  }

  async initializeCustomNodes(): Promise<void> {
    try {
      // Install latest custom node package
      await this.client.nodes.install('@urepli/n8n-nodes-japanese-pack@latest');
      
      // Verify installation
      const installedNodes = await this.client.nodes.list();
      const customNodes = installedNodes.filter(node => 
        node.packageName === '@urepli/n8n-nodes-japanese-pack'
      );
      
      if (customNodes.length === 0) {
        throw new Error('Failed to install custom nodes');
      }
      
      console.log(`Installed ${customNodes.length} custom nodes for Japanese market automation`);
    } catch (error) {
      console.error('Failed to initialize custom nodes:', error);
      throw error;
    }
  }

  async createJapaneseAutomationWorkflow(config: {
    contentTheme: string;
    platforms: string[];
    frequency: string;
    affiliateCategories: string[];
  }): Promise<string> {
    const workflow = {
      name: `Japanese Automation - ${config.contentTheme}`,
      active: true,
      nodes: [
        {
          parameters: {
            rule: {
              interval: this.getIntervalFromFrequency(config.frequency)
            }
          },
          name: "Content Schedule",
          type: "n8n-nodes-base.scheduleTrigger",
          typeVersion: 1,
          position: [200, 300]
        },
        {
          parameters: {
            category: config.affiliateCategories[0] || 'electronics',
            minCommission: 2000,
            limit: 3,
            sortBy: 'performance'
          },
          name: "A8.net Product Discovery",
          type: "@urepli/n8n-nodes-japanese-pack.a8NetProductSearch",
          typeVersion: 2,
          position: [400, 300]
        },
        {
          parameters: {
            contentType: 'product_review',
            theme: config.contentTheme,
            language: 'japanese',
            tone: 'enthusiastic',
            includeAffiliate: true,
            optimizeForPlatforms: config.platforms
          },
          name: "AI Content Generation",
          type: "@urepli/n8n-nodes-japanese-pack.geminiContentGenerator",
          typeVersion: 2,
          position: [600, 300]
        },
        {
          parameters: {
            videoStyle: 'japanese_modern',
            duration: 30,
            aspectRatio: '9:16',
            includeSubtitles: true,
            voiceOver: {
              enabled: true,
              voice: 'japanese_female_young'
            }
          },
          name: "Video Creation",
          type: "@urepli/n8n-nodes-japanese-pack.comfyUIVideoProcessor",
          typeVersion: 2,
          position: [800, 300]
        },
        {
          parameters: {
            platforms: config.platforms,
            autoOptimize: true,
            scheduleOptimal: true,
            includeAffiliateLinks: true,
            complianceCheck: true
          },
          name: "Multi-Platform Publishing",
          type: "@urepli/n8n-nodes-japanese-pack.multiPlatformPoster",
          typeVersion: 2,
          position: [1000, 300]
        },
        {
          parameters: {
            platforms: config.platforms,
            metrics: ['views', 'engagement', 'clicks', 'conversions', 'revenue'],
            realTimeTracking: true,
            japaneseMarketInsights: true
          },
          name: "Performance Analytics",
          type: "@urepli/n8n-nodes-japanese-pack.japaneseAnalytics",
          typeVersion: 2,
          position: [1200, 300]
        }
      ],
      connections: {
        "Content Schedule": {
          "main": [
            [
              {
                "node": "A8.net Product Discovery",
                "type": "main",
                "index": 0
              }
            ]
          ]
        },
        "A8.net Product Discovery": {
          "main": [
            [
              {
                "node": "AI Content Generation",
                "type": "main",
                "index": 0
              }
            ]
          ]
        },
        "AI Content Generation": {
          "main": [
            [
              {
                "node": "Video Creation",
                "type": "main",
                "index": 0
              }
            ]
          ]
        },
        "Video Creation": {
          "main": [
            [
              {
                "node": "Multi-Platform Publishing",
                "type": "main",
                "index": 0
              }
            ]
          ]
        },
        "Multi-Platform Publishing": {
          "main": [
            [
              {
                "node": "Performance Analytics",
                "type": "main",
                "index": 0
              }
            ]
          ]
        }
      },
      settings: {
        executionOrder: "v1",
        saveManualExecutions: true,
        callerPolicy: "workflowsFromSameOwner",
        errorWorkflow: "error-handler-workflow"
      },
      meta: {
        templateCredit: "Urepli Japanese Automation Suite v2.0"
      }
    };

    try {
      const result = await this.client.workflows.create(workflow);
      return result.id;
    } catch (error) {
      console.error('Failed to create workflow:', error);
      throw error;
    }
  }

  private getIntervalFromFrequency(frequency: string): any {
    switch (frequency) {
      case 'hourly':
        return [{ field: 'hours', hoursInterval: 1 }];
      case 'daily':
        return [{ field: 'hours', hoursInterval: 24 }];
      case 'weekly':
        return [{ field: 'weeks', weeksInterval: 1 }];
      default:
        return [{ field: 'hours', hoursInterval: 4 }];
    }
  }

  async getWorkflowMetrics(workflowId: string, timeframe: string = '24h'): Promise<{
    executions: number;
    successRate: number;
    averageExecutionTime: number;
    errorRate: number;
    performanceInsights: any[];
  }> {
    try {
      const executions = await this.client.executions.getMany({
        workflowId,
        limit: 100
      });

      const successfulExecutions = executions.filter(e => e.finished && !e.stoppedAt);
      const failedExecutions = executions.filter(e => e.stoppedAt);

      const averageExecutionTime = successfulExecutions.reduce((acc, execution) => {
        const duration = new Date(execution.finishedAt!).getTime() - 
                        new Date(execution.startedAt).getTime();
        return acc + duration;
      }, 0) / successfulExecutions.length;

      return {
        executions: executions.length,
        successRate: (successfulExecutions.length / executions.length) * 100,
        averageExecutionTime: averageExecutionTime / 1000, // Convert to seconds
        errorRate: (failedExecutions.length / executions.length) * 100,
        performanceInsights: await this.generatePerformanceInsights(executions)
      };
    } catch (error) {
      console.error('Failed to get workflow metrics:', error);
      throw error;
    }
  }

  private async generatePerformanceInsights(executions: any[]): Promise<any[]> {
    const insights = [];

    // Analyze execution patterns
    const hourlyExecutions = new Map();
    executions.forEach(execution => {
      const hour = new Date(execution.startedAt).getHours();
      hourlyExecutions.set(hour, (hourlyExecutions.get(hour) || 0) + 1);
    });

    const peakHour = [...hourlyExecutions.entries()]
      .sort((a, b) => b[1] - a[1])[0];

    if (peakHour) {
      insights.push({
        type: 'peak_performance',
        message: `最高パフォーマンス時間: ${peakHour[0]}時 (${peakHour[1]}回実行)`,
        confidence: 0.9
      });
    }

    // Analyze success patterns
    const recentSuccessRate = executions.slice(0, 10)
      .filter(e => e.finished && !e.stoppedAt).length / 10;

    if (recentSuccessRate < 0.8) {
      insights.push({
        type: 'performance_warning',
        message: '最近の成功率が低下しています。設定を確認してください。',
        confidence: 0.95
      });
    }

    return insights;
  }
}
```

### N8N Environment Configuration
```bash
# N8N Core Settings
N8N_HOST=0.0.0.0
N8N_PORT=5678
N8N_PROTOCOL=https
N8N_WEBHOOK_URL=https://your-domain.com/

# Database Configuration (PostgreSQL recommended for production)
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=localhost
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_DATABASE=n8n
DB_POSTGRESDB_USER=n8n_user
DB_POSTGRESDB_PASSWORD=secure_password

# Security Settings
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your_secure_password
N8N_JWT_AUTH_ACTIVE=true
N8N_JWT_AUTH_HEADER=authorization
N8N_ENCRYPTION_KEY=your_32_character_encryption_key

# External Webhook Configuration
WEBHOOK_URL=https://your-domain.com/webhook/
N8N_PAYLOAD_SIZE_MAX=104857600

# Email Configuration for Notifications
N8N_EMAIL_MODE=smtp
N8N_SMTP_HOST=smtp.gmail.com
N8N_SMTP_PORT=587
N8N_SMTP_USER=your-email@gmail.com
N8N_SMTP_PASS=your-app-password
N8N_SMTP_SENDER=noreply@your-domain.com

# Custom Node Installation Path
N8N_CUSTOM_EXTENSIONS=/opt/custom_nodes
```

## Required Environment Variables

### Core AI Services
```bash
# Google Gemini API for content generation
GOOGLE_GEMINI_API_KEY=your_gemini_api_key_here

# OpenAI API (alternative to Gemini)
OPENAI_API_KEY=your_openai_api_key_here
```

### Video Processing Services
```bash
# ComfyUI instance URL for advanced video processing
COMFYUI_URL=http://localhost:8188

# FFmpeg path (usually auto-detected)
FFMPEG_PATH=/usr/bin/ffmpeg
```

### Social Media Automation
```bash
# Python environment path for Botasaurus
PYTHON_ENV_PATH=/usr/bin/python3

# Browser automation settings
PLAYWRIGHT_HEADLESS=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

### Japanese Affiliate Networks
```bash
# A8.net API credentials
A8NET_API_KEY=your_a8net_api_key
A8NET_SECRET_KEY=your_a8net_secret_key
A8NET_AFFILIATE_ID=your_a8net_affiliate_id

# Rakuten Affiliate API
RAKUTEN_APPLICATION_ID=your_rakuten_app_id
RAKUTEN_AFFILIATE_ID=your_rakuten_affiliate_id

# Amazon Associates API (Japan)
AMAZON_ASSOCIATES_API_KEY=your_amazon_api_key
AMAZON_ASSOCIATES_SECRET_KEY=your_amazon_secret_key
AMAZON_ASSOCIATES_TAG=your_amazon_tag
```

### Advertising Platforms
```bash
# Facebook/Meta Ads API
FACEBOOK_ACCESS_TOKEN=your_facebook_access_token
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
FACEBOOK_PAGE_ID=your_facebook_page_id

# Google Ads API
GOOGLE_ADS_DEVELOPER_TOKEN=your_google_ads_developer_token
GOOGLE_ADS_CLIENT_ID=your_google_ads_client_id
GOOGLE_ADS_CLIENT_SECRET=your_google_ads_client_secret
GOOGLE_ADS_REFRESH_TOKEN=your_google_ads_refresh_token
GOOGLE_ADS_CUSTOMER_ID=your_google_ads_customer_id

# TikTok Ads API
TIKTOK_ADS_ACCESS_TOKEN=your_tiktok_access_token
TIKTOK_ADS_APP_ID=your_tiktok_app_id
TIKTOK_ADS_SECRET=your_tiktok_secret
```

### Proxy and Security
```bash
# Proxy configuration for automation
PROXY_LIST=proxy1:port,proxy2:port,proxy3:port
PROXY_USERNAME=your_proxy_username
PROXY_PASSWORD=your_proxy_password

# User agent rotation
USER_AGENT_ROTATION=true
```

## Installation Steps

### 1. Install Python Dependencies for Botasaurus
```bash
pip install botasaurus selenium undetected-chromedriver
```

### 2. Install ComfyUI (Optional but Recommended)
```bash
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI
pip install -r requirements.txt
python main.py --listen 0.0.0.0 --port 8188
```

### 3. Install FFmpeg
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install ffmpeg

# macOS with Homebrew
brew install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
```

### 4. Setup Japanese Fonts (for video text overlay)
```bash
# Ubuntu/Debian
sudo apt install fonts-noto-cjk

# macOS
# Fonts are usually pre-installed

# Windows
# Download Noto Sans JP from Google Fonts
```

## API Setup Guides

### A8.net API Setup
1. Register at https://pub.a8.net/
2. Apply for API access in your dashboard
3. Get API key and secret from API settings
4. Note your affiliate ID from account settings

### Rakuten Affiliate API Setup
1. Register at https://affiliate.rakuten.co.jp/
2. Apply for API access
3. Get Application ID from developer console
4. Note your affiliate ID

### Social Media Platform Setup
1. **Facebook/Instagram**: Create Facebook App at developers.facebook.com
2. **TikTok**: Apply for TikTok for Business API access
3. **YouTube**: Use Google Ads API for YouTube advertising

## Security Best Practices

### 1. Environment Variable Security
- Never commit API keys to version control
- Use different keys for development and production
- Rotate keys regularly

### 2. Proxy Usage
- Use residential proxies for social media automation
- Rotate IP addresses to avoid detection
- Respect platform rate limits

### 3. Content Compliance
- Always respect copyright laws
- Use proper attribution for content
- Implement content review workflows
- Follow platform community guidelines

## Monitoring and Maintenance

### 1. Service Health Checks
- Monitor API rate limits
- Check proxy rotation status
- Verify affiliate link tracking
- Monitor automation success rates

### 2. Performance Optimization
- Cache AI-generated content
- Optimize video processing pipelines
- Use CDN for media storage
- Implement efficient database queries

### 3. Error Handling
- Implement graceful degradation
- Log all automation attempts
- Set up alerting for failures
- Maintain fallback options

## Troubleshooting

### Common Issues
1. **ComfyUI Connection Failed**: Check if ComfyUI is running on the specified port
2. **Social Media Posting Failed**: Verify account credentials and platform status
3. **Affiliate Links Not Working**: Check API credentials and affiliate account status
4. **Video Generation Slow**: Optimize ComfyUI models or use cloud GPU instances

### Support Resources
- Documentation: `/docs/AUTOMATION_FRAMEWORKS_RESEARCH.md`
- Implementation Guide: `/docs/IMPLEMENTATION_PLAN.md`
- API Reference: Check each service's official documentation