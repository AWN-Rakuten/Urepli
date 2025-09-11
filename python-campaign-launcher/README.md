# AI Social Campaign Launcher / AI ソーシャルキャンペーンランチャー

[🇺🇸 English](#english) | [🇯🇵 日本語](#japanese)

---

## English

### Overview
AI-driven Social Campaign Launcher is a Python-based system that enables viral, interactive social media campaigns tailored for Japanese audiences. The system automatically generates short-form videos using AI, creates and schedules campaigns, and handles engagement across TikTok, Instagram, and YouTube.

### Features
- 🎬 **AI Video Generation**: Generate short-form videos using Gemini API, SDXL, and other AI tools
- 📱 **Multi-Platform Posting**: Auto-post to TikTok, Instagram Reels, and YouTube Shorts
- 🇯🇵 **Japanese Optimization**: Optimized content formats and timing for Japanese audiences
- 🤖 **AI Engagement**: Automated comment replies, likes, and interactions
- 📊 **Analytics Dashboard**: Real-time campaign performance tracking
- 🎯 **Campaign Templates**: Pre-built templates for popular Japanese content formats
- ⚡ **Async Processing**: FastAPI + Celery for scalable job processing
- 🐳 **Docker Deployment**: Easy deployment with Docker Compose

### Quick Start

#### 1. Clone and Setup
```bash
git clone <repository>
cd python-campaign-launcher
cp .env.example .env
# Edit .env with your API keys
```

#### 2. Run with Docker
```bash
docker-compose up -d
```

#### 3. Access the API
- API Documentation: http://localhost:8000/docs
- MinIO Console: http://localhost:9090

#### 4. Create Your First Campaign
```python
import requests

campaign_data = {
    "name": "AI Product Reaction Campaign",
    "description": "AI character reacts to new Japanese product",
    "campaign_type": "ai_product_reaction",
    "video_content": {
        "prompt": "Cute anime character surprised by new Japanese gadget",
        "style": "anime",
        "duration": 15
    },
    "config": {
        "target_platforms": ["tiktok", "instagram", "youtube"],
        "posting_schedule": {"tiktok": "19:00"},
        "auto_engage": True,
        "content_variations": 3
    }
}

response = requests.post("http://localhost:8000/campaigns", json=campaign_data)
print(response.json())
```

### Campaign Types

1. **AI Product Reaction** (`ai_product_reaction`)
   - AI characters react to new products with surprise and excitement
   - Optimized for viral engagement and product discovery

2. **Mystery Product Launch** (`mystery_product_launch`)
   - Gradual product reveals to build anticipation
   - Multi-phase campaigns with increasing engagement

3. **AI vs Human Poll** (`ai_vs_human_poll`)
   - Interactive content comparing AI and human capabilities
   - High engagement through voting and comments

4. **Day in the Life** (`day_in_life`)
   - Lifestyle content showcasing daily routines with products
   - Authentic and relatable content format

5. **Memeable Content** (`memeable_content`)
   - Content designed for sharing and remixing
   - Viral potential through humor and relatability

### API Endpoints

#### Campaigns
- `POST /campaigns` - Create new campaign
- `GET /campaigns` - List all campaigns
- `GET /campaigns/{id}` - Get campaign details
- `POST /campaigns/{id}/start` - Start campaign
- `POST /campaigns/{id}/stop` - Stop campaign
- `GET /campaigns/{id}/analytics` - Get campaign analytics

#### Video Generation
- `POST /video/generate` - Generate video
- `GET /video/status/{task_id}` - Check generation status

#### Templates
- `GET /templates` - List campaign templates

### Configuration

#### Required API Keys
- **Gemini API**: For AI content generation
- **TikTok API**: For posting to TikTok
- **Instagram API**: For posting to Instagram Reels
- **YouTube API**: For posting to YouTube Shorts

#### Optional Integrations
- **OpenAI API**: Alternative LLM for content generation
- **S3/MinIO**: For video storage
- **PostgreSQL**: For campaign data storage

### Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   FastAPI   │    │   Celery    │    │ Video Gen   │
│     API     │────│   Workers   │────│   Service   │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       │                   │                   │
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ PostgreSQL  │    │    Redis    │    │   MinIO     │
│  Database   │    │   Queue     │    │  Storage    │
└─────────────┘    └─────────────┘    └─────────────┘
```

### Development

#### Local Development
```bash
# Install dependencies
pip install -r requirements.txt

# Start database
docker-compose up db redis -d

# Run API
uvicorn main:app --reload

# Run Celery worker
celery -A celery_app worker --loglevel=info
```

#### Testing
```bash
pytest app/tests/
```

---

## Japanese

### 概要
AIソーシャルキャンペーンランチャーは、日本のオーディエンス向けにカスタマイズされたバイラルでインタラクティブなソーシャルメディアキャンペーンを可能にするPythonベースのシステムです。AIを使用してショートフォーム動画を自動生成し、キャンペーンを作成・スケジュールし、TikTok、Instagram、YouTubeでのエンゲージメントを処理します。

### 機能
- 🎬 **AI動画生成**: Gemini API、SDXLなどのAIツールを使用してショートフォーム動画を生成
- 📱 **マルチプラットフォーム投稿**: TikTok、Instagram Reels、YouTube Shortsに自動投稿
- 🇯🇵 **日本最適化**: 日本のオーディエンス向けに最適化されたコンテンツ形式とタイミング
- 🤖 **AIエンゲージメント**: 自動コメント返信、いいね、インタラクション
- 📊 **分析ダッシュボード**: リアルタイムキャンペーンパフォーマンス追跡
- 🎯 **キャンペーンテンプレート**: 人気の日本のコンテンツ形式用の事前構築テンプレート
- ⚡ **非同期処理**: スケーラブルなジョブ処理のためのFastAPI + Celery
- 🐳 **Docker展開**: Docker Composeによる簡単な展開

### クイックスタート

#### 1. クローンとセットアップ
```bash
git clone <repository>
cd python-campaign-launcher
cp .env.example .env
# .envファイルにAPIキーを入力
```

#### 2. Dockerで実行
```bash
docker-compose up -d
```

#### 3. APIにアクセス
- APIドキュメント: http://localhost:8000/docs
- MinIOコンソール: http://localhost:9090

#### 4. 最初のキャンペーンを作成
```python
import requests

campaign_data = {
    "name": "AI商品反応キャンペーン",
    "description": "AIキャラクターが新しい日本の商品に反応",
    "campaign_type": "ai_product_reaction",
    "video_content": {
        "prompt": "可愛いアニメキャラクターが新しい日本のガジェットに驚く",
        "style": "anime",
        "duration": 15
    },
    "config": {
        "target_platforms": ["tiktok", "instagram", "youtube"],
        "posting_schedule": {"tiktok": "19:00"},
        "auto_engage": True,
        "content_variations": 3
    }
}

response = requests.post("http://localhost:8000/campaigns", json=campaign_data)
print(response.json())
```

### キャンペーンタイプ

1. **AI商品反応** (`ai_product_reaction`)
   - AIキャラクターが新商品に驚きと興奮の反応を示す
   - バイラルエンゲージメントと商品発見に最適化

2. **ミステリー商品発表** (`mystery_product_launch`)
   - 段階的な商品公開で期待感を構築
   - エンゲージメントが増加するマルチフェーズキャンペーン

3. **AI対人間投票** (`ai_vs_human_poll`)
   - AIと人間の能力を比較するインタラクティブコンテンツ
   - 投票とコメントによる高いエンゲージメント

4. **1日の生活** (`day_in_life`)
   - 商品を使った日常ルーチンを紹介するライフスタイルコンテンツ
   - 本物で親しみやすいコンテンツ形式

5. **ミーム可能コンテンツ** (`memeable_content`)
   - 共有とリミックス用に設計されたコンテンツ
   - ユーモアと親しみやすさによるバイラル可能性

### 必要なAPIキー
- **Gemini API**: AIコンテンツ生成用
- **TikTok API**: TikTokへの投稿用
- **Instagram API**: Instagram Reelsへの投稿用
- **YouTube API**: YouTube Shortsへの投稿用

### 日本最適化機能
- 🕐 最適な投稿時間（19:00-21:00）
- 🏷️ 日本のトレンドハッシュタグ
- 🎌 日本の文化と美学を反映
- 💬 日本語での自動返信
- 📍 日本の地域に基づくターゲティング

### サポート

技術的な問題や質問については、GitHubのIssuesページまでお気軽にお問い合わせください。

---

## License

MIT License - see LICENSE file for details.