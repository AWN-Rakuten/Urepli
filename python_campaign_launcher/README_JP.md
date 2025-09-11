# AI-driven Social Campaign Launcher (日本語版)

日本のソーシャルメディア向けAI駆動キャンペーンランチャー

## 概要

TikTok、Instagram、YouTubeで日本の視聴者向けにバイラルでインタラクティブなソーシャルメディアキャンペーンを生成するAI搭載システムです。FastAPI、Celery、moviepyを使用して高性能なコンテンツ生成とスケジューリングを実現します。

## 主な機能

### 🎯 核となる機能
- **AIコンテンツ生成**: Gemini APIを使用した日本語最適化ソーシャルメディアスクリプト
- **動画生成**: moviepyによる自動動画作成、字幕、エフェクト付き
- **マルチプラットフォーム投稿**: TikTok、Instagram Reels、YouTube Shortsへの自動投稿
- **キャンペーンテンプレート**: 事前構築された日本市場向けテンプレート（MNP、アニメ、テックなど）
- **自動スケジューリング**: 日本の最適な投稿時間でのCeleryベースタスクキュー
- **分析・監視**: リアルタイムキャンペーンパフォーマンス追跡

### 🎬 コンテンツタイプ
- **AI商品リアクション**: AI対人間の商品レビュー
- **謎の新商品発表**: 段階的公開ティーザーキャンペーン
- **AI対人間投票**: インタラクティブ比較コンテンツ
- **日常動画**: ライフスタイル統合コンテンツ
- **ミーム性コンテンツ**: バイラル性のあるシェアしやすいコンテンツ

## クイックスタート

### 前提条件
- Python 3.11+
- Redisサーバー
- S3互換ストレージ（開発にはMinIOを推奨）
- FFmpeg（動画処理用）

### 1. セットアップ
```bash
# リポジトリをクローン
git clone <repository-url>
cd python_campaign_launcher

# 仮想環境を作成
python -m venv venv
source venv/bin/activate

# 依存関係をインストール
pip install -r requirements.txt
```

### 2. 設定
```bash
# 環境設定テンプレートをコピー
cp .env.example .env

# APIキーを設定
nano .env
```

### 3. サービス開始

#### Docker Compose使用（推奨）
```bash
# すべてのサービスを開始
docker-compose up -d
```

#### 手動セットアップ
```bash
# Redis開始
redis-server

# MinIO開始
minio server ./data --console-address ":9001"

# FastAPIサーバー開始
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

# Celeryワーカー開始
celery -A src.core.celery_app worker --loglevel=info
```

### 4. アクセス
- **API ドキュメント**: http://localhost:8000/docs
- **キャンペーンダッシュボード**: http://localhost:8000
- **ヘルスチェック**: http://localhost:8000/health

## API使用方法

### キャンペーン作成
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

## 日本市場向け最適化

### コンテンツスタイル
- **Kawaii（かわいい）**: 可愛らしさを重視したコンテンツ
- **Serious（真面目）**: 信頼性と専門性を重視
- **Fun（楽しい）**: エンターテイメント重視
- **Tech（テック）**: 技術トレンド重視

### 投稿最適時間
- **19:00 JST**: 夕方のプライムタイム
- **21:00 JST**: ピークエンゲージメント時間
- **23:00 JST**: 深夜のアクティブ時間

### アフィリエイト対応分野
- **MNP**: 携帯電話乗り換え
- **クレジットカード**: 入会特典・ポイント還元
- **アニメグッズ**: コラボ商品・限定品
- **旅行**: セール・ホテル・航空券
- **ファッション**: 新作・限定コラボ

## キャンペーンテンプレート例

### MNP（携帯乗り換え）キャンペーン
```yaml
template_key: "mnp"
content_type: "ai_vs_human_poll"
script_structure:
  hook: "今のスマホ代、高すぎない？"
  comparison: "大手キャリア vs 格安SIM"
  revelation: "実は年間○万円も節約できる"
  cta: "乗り換え体験談をコメントで教えて！"
```

### アニメコラボキャンペーン
```yaml
template_key: "anime"
content_type: "mystery_launch"
script_structure:
  hook: "実は...明日発表される新コラボ、知ってます"
  hints: "あの人気キャラクターが..."
  reveal: "完全新作グッズライン！"
  cta: "欲しい人は「欲しい」でコメント！"
```

## 監視とトラブルシューティング

### ヘルスチェック
```bash
# システムの健全性確認
curl http://localhost:8000/health

# Celeryワーカー確認
celery -A src.core.celery_app inspect active
```

### よくある問題

#### FFmpegが見つからない
```bash
# Ubuntu/Debian
sudo apt-get install ffmpeg

# macOS
brew install ffmpeg
```

#### Redis接続エラー
```bash
# Redis状態確認
redis-cli ping

# Redis開始
redis-server
```

## 開発・貢献

### 開発環境セットアップ
```bash
# 開発用依存関係インストール
pip install black flake8 pytest

# コードフォーマット
black src/

# テスト実行
pytest tests/ -v
```

### 新しいテンプレート追加
1. `src/templates/`にYAMLテンプレート作成
2. `CampaignTemplateLoader`にテンプレート追加
3. サンプルキャンペーンでテスト
4. ドキュメント更新

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。

---

*日本のソーシャルメディア市場のために❤️で構築*