from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
import uuid

class CampaignStatus(str, Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"

class CampaignType(str, Enum):
    AI_PRODUCT_REACTION = "ai_product_reaction"
    MYSTERY_PRODUCT_LAUNCH = "mystery_product_launch"
    AI_VS_HUMAN_POLL = "ai_vs_human_poll"
    DAY_IN_LIFE = "day_in_life"
    MEMEABLE_CONTENT = "memeable_content"

class Platform(str, Enum):
    TIKTOK = "tiktok"
    INSTAGRAM = "instagram"
    YOUTUBE = "youtube"

class VideoStyle(str, Enum):
    ANIME = "anime"
    REALISTIC = "realistic"
    CARTOON = "cartoon"
    MINIMALIST = "minimalist"

class VideoContent(BaseModel):
    prompt: str
    style: VideoStyle = VideoStyle.ANIME
    duration: int = Field(default=15, ge=5, le=60)
    aspect_ratio: str = "9:16"  # Vertical for mobile
    background_music: Optional[str] = None
    voice_over: Optional[str] = None
    subtitles: bool = True
    japanese_optimized: bool = True

class SocialPost(BaseModel):
    platform: Platform
    caption: str
    hashtags: List[str]
    scheduled_time: Optional[datetime] = None
    posted: bool = False
    post_id: Optional[str] = None
    engagement_stats: Optional[Dict[str, Any]] = None

class CampaignConfig(BaseModel):
    target_platforms: List[Platform]
    posting_schedule: Dict[str, Any]  # Cron-like schedule
    auto_engage: bool = True
    engagement_replies: List[str]
    content_variations: int = Field(default=3, ge=1, le=10)
    japanese_locale: bool = True
    trending_hashtags: bool = True

class CampaignBase(BaseModel):
    name: str
    description: str
    campaign_type: CampaignType
    video_content: VideoContent
    config: CampaignConfig
    
class CampaignCreate(CampaignBase):
    pass

class Campaign(CampaignBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: CampaignStatus = CampaignStatus.DRAFT
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    posts: List[SocialPost] = []
    video_urls: List[str] = []
    analytics: Optional[Dict[str, Any]] = None
    
    class Config:
        use_enum_values = True

class VideoGenerationTask(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "pending"  # pending, processing, completed, failed
    prompt: str
    style: VideoStyle
    duration: int
    video_url: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

class EngagementTask(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    platform: Platform
    post_id: str
    task_type: str  # reply, like, share, duet, stitch
    executed: bool = False
    scheduled_time: datetime
    result: Optional[Dict[str, Any]] = None