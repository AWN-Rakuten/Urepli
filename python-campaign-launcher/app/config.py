from pydantic_settings import BaseSettings
from typing import Optional, List
import os

class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://localhost/campaign_launcher"
    
    # Redis for Celery
    redis_url: str = "redis://localhost:6379/0"
    
    # AI Services
    gemini_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    
    # Social Media APIs
    tiktok_client_id: Optional[str] = None
    tiktok_client_secret: Optional[str] = None
    instagram_access_token: Optional[str] = None
    youtube_client_id: Optional[str] = None
    youtube_client_secret: Optional[str] = None
    
    # Storage
    s3_bucket: str = "campaign-assets"
    s3_access_key: Optional[str] = None
    s3_secret_key: Optional[str] = None
    s3_endpoint: Optional[str] = None
    s3_region: str = "us-east-1"
    
    # Application
    app_secret_key: str = "your-secret-key-here"
    debug: bool = False
    
    # Japanese optimization
    japanese_locale: bool = True
    timezone: str = "Asia/Tokyo"
    
    # Rate limiting
    api_rate_limit: int = 100  # requests per minute
    
    # Video generation
    video_output_path: str = "/tmp/videos"
    max_video_duration: int = 60
    default_video_style: str = "anime"
    
    # Campaign defaults
    default_hashtags_jp: List[str] = [
        "#AI", "#バイラル", "#トレンド", "#日本", "#面白い",
        "#新商品", "#レビュー", "#ショート動画", "#話題"
    ]
    
    class Config:
        env_file = ".env"
        env_prefix = "CAMPAIGN_"

settings = Settings()