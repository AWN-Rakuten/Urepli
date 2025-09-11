from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Core API settings
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8000
    log_level: str = "info"
    
    # AI API keys
    gemini_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    
    # Storage settings
    s3_endpoint_url: str = "http://localhost:9000"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_bucket_name: str = "campaign-assets"
    
    # Redis for Celery
    redis_url: str = "redis://localhost:6379/0"
    
    # Social Media APIs (Optional)
    tiktok_client_key: Optional[str] = None
    tiktok_client_secret: Optional[str] = None
    instagram_client_id: Optional[str] = None
    instagram_client_secret: Optional[str] = None
    youtube_client_id: Optional[str] = None
    youtube_client_secret: Optional[str] = None
    
    # Campaign settings
    default_voice_language: str = "ja"
    default_video_resolution: str = "1080x1920"
    max_daily_campaigns: int = 50
    
    class Config:
        env_file = ".env"


settings = Settings()