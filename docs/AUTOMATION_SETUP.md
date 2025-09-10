# Hyper Automation Environment Configuration

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