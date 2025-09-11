from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class PlatformType(str, Enum):
    TIKTOK = "tiktok"
    INSTAGRAM = "instagram" 
    YOUTUBE = "youtube"


class CampaignStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    SCHEDULED = "scheduled"


class ContentType(str, Enum):
    AI_PRODUCT_REACTION = "ai_product_reaction"
    MYSTERY_LAUNCH = "mystery_launch"
    AI_VS_HUMAN_POLL = "ai_vs_human_poll"
    DAY_IN_LIFE = "day_in_life"
    MEMEABLE_CONTENT = "memeable_content"


class CampaignTemplate(BaseModel):
    key: str
    display: str
    style_primary: str
    style_secondary: str
    has_affiliate: bool
    keywords: List[str]
    sources_rss: List[str]
    affiliate_url_env: Optional[str] = None


class VideoGenerationRequest(BaseModel):
    script: str
    style: str
    voice_language: str = "ja"
    duration: Optional[int] = 30
    resolution: str = "1080x1920"
    background_music: bool = True


class CampaignConfig(BaseModel):
    name: str
    template_key: str
    platforms: List[PlatformType]
    content_type: ContentType
    schedule: Optional[str] = None  # Cron expression
    daily_limit: int = 5
    video_config: VideoGenerationRequest
    tags: List[str] = []
    enabled: bool = True


class Campaign(BaseModel):
    id: str
    config: CampaignConfig
    status: CampaignStatus
    created_at: datetime
    updated_at: datetime
    error_message: Optional[str] = None
    generated_content: Optional[Dict[str, Any]] = None
    published_urls: Dict[str, str] = {}
    analytics: Dict[str, Any] = {}


class ContentResult(BaseModel):
    campaign_id: str
    script: str
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    audio_url: Optional[str] = None
    metadata: Dict[str, Any] = {}


class SocialPost(BaseModel):
    platform: PlatformType
    content: str
    media_urls: List[str] = []
    tags: List[str] = []
    scheduled_time: Optional[datetime] = None