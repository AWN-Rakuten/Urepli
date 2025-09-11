# AI-driven Social Campaign Launcher

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An AI-powered system for generating viral, interactive social media campaigns tailored for Japanese audiences on TikTok, Instagram, and YouTube. Built with FastAPI, Celery, and moviepy for high-performance content generation and scheduling.

## ✨ Features

### 🎯 Core Capabilities
- **AI Content Generation**: Uses Gemini API for Japanese-optimized social media scripts
- **Video Generation**: Automated video creation with moviepy, captions, and effects
- **Multi-Platform Publishing**: Auto-post to TikTok, Instagram Reels, and YouTube Shorts
- **Campaign Templates**: Pre-built Japanese market templates (MNP, Anime, Tech, etc.)
- **Automated Scheduling**: Celery-based task queue with optimal Japanese posting times
- **Analytics & Monitoring**: Real-time campaign performance tracking

### 🎬 Content Types
- **AI Product Reactions** (AI商品リアクション): AI vs human product reviews
- **Mystery Product Launches** (謎の新商品発表): Teaser campaigns with reveals
- **AI vs Human Polls** (AI対人間投票): Interactive comparison content
- **Day in the Life** (日常動画): Lifestyle integration content
- **Memeable Content** (ミーム性コンテンツ): Viral, shareable content

### 🌏 Japanese Market Optimization
- Japanese-optimized content templates and styles
- Peak posting times for Japanese audiences (19:00-23:00 JST)
- Cultural references and trending Japanese phrases
- Kawaii, anime, and tech-focused content styles
- Affiliate integration for Japanese market (MNP, credit cards, travel)

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Redis server
- S3-compatible storage (MinIO recommended for development)
- FFmpeg (for video processing)

### 1. Clone and Setup
```bash
git clone <repository-url>
cd python_campaign_launcher

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your API keys
nano .env
```

**Required API Keys:**
- `GEMINI_API_KEY`: Google Gemini AI API key
- `S3_ACCESS_KEY` / `S3_SECRET_KEY`: S3 storage credentials

**Optional API Keys:**
- `OPENAI_API_KEY`: OpenAI API (fallback for content generation)
- `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET`: TikTok API for auto-posting
- `INSTAGRAM_CLIENT_ID` / `INSTAGRAM_CLIENT_SECRET`: Instagram API
- `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET`: YouTube API

### 3. Start Services

#### Option A: Docker Compose (Recommended)
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

#### Option B: Manual Setup
```bash
# Start Redis
redis-server

# Start MinIO (in another terminal)
minio server ./data --console-address ":9001"

# Start FastAPI server (in another terminal)
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

# Start Celery worker (in another terminal)
celery -A src.core.celery_app worker --loglevel=info

# Start Celery beat scheduler (in another terminal)
celery -A src.core.celery_app beat --loglevel=info
```

### 4. Access Services
- **API Documentation**: http://localhost:8000/docs
- **Campaign Dashboard**: http://localhost:8000
- **MinIO Console**: http://localhost:9001
- **Health Check**: http://localhost:8000/health

## 📚 API Usage

### Create a Campaign
```bash
curl -X POST "http://localhost:8000/campaigns" \
-H "Content-Type: application/json" \
-d '{
  "name": "新商品スマホレビュー",
  "template_key": "tech",
  "platforms": ["tiktok", "instagram"],
  "content_type": "ai_product_reaction",
  "daily_limit": 3,
  "video_config": {
    "style": "kawaii",
    "duration": 30
  },
  "tags": ["スマホ", "レビュー", "AI"]
}'
```

### Check Campaign Status
```bash
curl "http://localhost:8000/campaigns/{campaign_id}"
```

### Monitor Task Progress
```bash
curl "http://localhost:8000/tasks/{task_id}"
```

### List Available Templates
```bash
curl "http://localhost:8000/templates"
```

## 🎨 Campaign Templates

### Built-in Japanese Templates

| Template | Display Name | Style | Affiliate | Focus |
|----------|--------------|-------|-----------|--------|
| `mnp` | MNP/携帯乗換 | serious + kawaii | Yes | Mobile carrier switching |
| `anime` | アニメ/エンタメ | kawaii + fun | Yes | Anime and entertainment |
| `tech` | テック/ガジェット | tech + serious | No | Technology and gadgets |
| `travel` | 旅行/観光 | calm + kawaii | Yes | Travel and tourism |
| `fashion` | ファッション/ビューティ | kawaii + aesthetic | Yes | Fashion and beauty |
| `food` | 新商品/グルメ | fun + kawaii | No | Food and new products |
| `hacks` | 節約/ライフハック | serious + teacher | Yes | Money-saving tips |
| `jobs` | 仕事/スキル | serious + career | Yes | Career and skills |
| `cute` | 癒し/動物 | kawaii + heartwarming | No | Animals and healing |

### Content Type Examples

#### AI Product Reaction (AI商品リアクション)
```yaml
content_type: "ai_product_reaction"
flow:
  1. "AI first tries the product"
  2. "Human reaction recording"
  3. "Comparison results"
  4. "Audience poll"
```

#### Mystery Launch (謎の新商品発表)
```yaml
content_type: "mystery_launch"
flow:
  1. "Mysterious teaser"
  2. "Gradual hint reveals"
  3. "Countdown to announcement"
  4. "Full reveal"
```

## 🔧 Configuration

### Environment Variables
```bash
# Core API settings
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key

# Storage settings
S3_ENDPOINT_URL=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET_NAME=campaign-assets

# Redis for Celery
REDIS_URL=redis://localhost:6379/0

# Social Media APIs (Optional)
TIKTOK_CLIENT_KEY=your_tiktok_key
TIKTOK_CLIENT_SECRET=your_tiktok_secret
INSTAGRAM_CLIENT_ID=your_instagram_id
INSTAGRAM_CLIENT_SECRET=your_instagram_secret
YOUTUBE_CLIENT_ID=your_youtube_id
YOUTUBE_CLIENT_SECRET=your_youtube_secret

# Application settings
DEBUG=true
HOST=0.0.0.0
PORT=8000
DEFAULT_VOICE_LANGUAGE=ja
MAX_DAILY_CAMPAIGNS=50
```

### Campaign Scheduling
```python
# Optimal Japanese posting times
optimal_times = [
    "19:00 JST",  # Evening prime time
    "21:00 JST",  # Peak engagement
    "23:00 JST"   # Late night activity
]

# Schedule a campaign
campaign_config = {
    "schedule": "0 19,21,23 * * *",  # Cron format
    "timezone": "Asia/Tokyo"
}
```

## 🎯 Content Generation Pipeline

### 1. Script Generation
- Gemini AI generates Japanese-optimized scripts
- Cultural references and trending phrases
- Platform-specific optimization (TikTok/Instagram/YouTube)
- Structured format: Hook → Content → Twist → CTA

### 2. Video Creation
- MoviePy-based video generation
- 9:16 aspect ratio for mobile platforms
- Automatic caption generation in Japanese
- Background music and effects
- Fallback to open-source tools (SDXL, AnimateDiff)

### 3. Social Media Publishing
- Platform-specific formatting
- Optimal hashtag generation
- Scheduled posting based on Japanese peak hours
- Auto-engagement responses

### 4. Analytics Collection
- Real-time performance monitoring
- Engagement rate tracking
- A/B testing for content variations
- ROI analysis for affiliate campaigns

## 🧪 Testing

### Run Basic Tests
```bash
# Install test dependencies
pip install pytest pytest-asyncio

# Run tests
pytest tests/ -v

# Run specific test
pytest tests/test_basic.py::test_content_generator_mock -v
```

### Test Campaign Creation
```python
import requests

# Test campaign creation
response = requests.post("http://localhost:8000/campaigns", json={
    "name": "テストキャンペーン",
    "template_key": "tech",
    "platforms": ["tiktok"],
    "content_type": "ai_product_reaction"
})

print(f"Campaign created: {response.json()}")
```

## 🚀 Production Deployment

### Docker Production Setup
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  campaign_api:
    image: campaign-launcher:latest
    environment:
      - DEBUG=false
      - REDIS_URL=redis://redis:6379/0
    deploy:
      replicas: 3
      
  celery_worker:
    image: campaign-launcher:latest
    deploy:
      replicas: 5
```

### Environment Setup
```bash
# Production environment variables
export GEMINI_API_KEY="your_production_key"
export S3_ENDPOINT_URL="https://your-s3-endpoint.com"
export REDIS_URL="redis://your-redis-cluster:6379/0"

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

## 📊 Monitoring & Analytics

### Health Checks
```bash
# Check system health
curl http://localhost:8000/health

# Check Celery workers
celery -A src.core.celery_app inspect active

# Monitor tasks
celery -A src.core.celery_app flower
```

### Campaign Analytics
```bash
# Get analytics overview
curl http://localhost:8000/analytics/overview

# Campaign performance
curl http://localhost:8000/campaigns/{id}/analytics
```

## 🔧 Troubleshooting

### Common Issues

#### FFmpeg Not Found
```bash
# Ubuntu/Debian
sudo apt-get install ffmpeg

# macOS
brew install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
```

#### Redis Connection Error
```bash
# Check Redis status
redis-cli ping

# Start Redis if not running
redis-server
```

#### Storage Issues
```bash
# Check MinIO console
http://localhost:9001

# Verify bucket creation
curl http://localhost:9000/campaign-assets
```

### Performance Optimization

#### Celery Scaling
```bash
# Scale workers
celery -A src.core.celery_app worker --concurrency=8

# Monitor performance
celery -A src.core.celery_app events
```

#### Video Generation Optimization
```python
# Reduce video quality for faster processing
video_config = {
    "resolution": "720x1280",  # Lower resolution
    "fps": 24,                 # Lower framerate
    "quality": "medium"        # Reduce quality
}
```

## 🤝 Contributing

### Development Setup
```bash
# Install development dependencies
pip install -r requirements.txt
pip install black flake8 pytest

# Code formatting
black src/
flake8 src/

# Run tests
pytest tests/ -v
```

### Adding New Templates
1. Create YAML template in `src/templates/`
2. Add template to `CampaignTemplateLoader`
3. Test with sample campaign
4. Update documentation

### Adding New Platforms
1. Implement platform publisher in `social_tasks.py`
2. Add platform enum to `models/campaign.py`
3. Update API endpoints
4. Add tests

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Japanese social media trends and cultural insights
- Open-source video generation tools
- FastAPI and Celery communities
- Gemini AI for content generation capabilities

## 📞 Support

For questions, issues, or contributions:
- Open an issue on GitHub
- Check existing documentation
- Review the API documentation at `/docs`

---

*Built with ❤️ for the Japanese social media market*