import logging
from typing import List, Optional
from datetime import datetime
import yaml
import os
from sqlalchemy.orm import Session

from app.models import Campaign, CampaignCreate, CampaignStatus
from app.database import get_db, CampaignDB
from app.services.video_generator import VideoGeneratorService
from app.services.social_poster import SocialPosterService
from app.config import settings

logger = logging.getLogger(__name__)

class CampaignManager:
    def __init__(self):
        self.video_generator = VideoGeneratorService()
        self.social_poster = SocialPosterService()
        
    async def create_campaign(self, campaign_data: CampaignCreate) -> Campaign:
        """Create a new campaign"""
        campaign = Campaign(**campaign_data.dict())
        
        # Save to database
        db = next(get_db())
        db_campaign = CampaignDB(
            id=campaign.id,
            name=campaign.name,
            description=campaign.description,
            campaign_type=campaign.campaign_type,
            status=campaign.status,
            video_content=campaign.video_content.dict(),
            config=campaign.config.dict(),
            posts=[],
            video_urls=[],
            created_at=campaign.created_at,
            updated_at=campaign.updated_at
        )
        db.add(db_campaign)
        db.commit()
        db.close()
        
        logger.info(f"Created campaign: {campaign.id}")
        return campaign
    
    async def get_campaign(self, campaign_id: str) -> Optional[Campaign]:
        """Get campaign by ID"""
        db = next(get_db())
        db_campaign = db.query(CampaignDB).filter(CampaignDB.id == campaign_id).first()
        db.close()
        
        if not db_campaign:
            return None
            
        # Convert back to Pydantic model
        campaign_data = {
            "id": db_campaign.id,
            "name": db_campaign.name,
            "description": db_campaign.description,
            "campaign_type": db_campaign.campaign_type,
            "status": db_campaign.status,
            "video_content": db_campaign.video_content,
            "config": db_campaign.config,
            "posts": db_campaign.posts or [],
            "video_urls": db_campaign.video_urls or [],
            "analytics": db_campaign.analytics,
            "created_at": db_campaign.created_at,
            "updated_at": db_campaign.updated_at
        }
        return Campaign(**campaign_data)
    
    async def list_campaigns(
        self, 
        skip: int = 0, 
        limit: int = 100, 
        status: Optional[CampaignStatus] = None
    ) -> List[Campaign]:
        """List campaigns with optional filtering"""
        db = next(get_db())
        query = db.query(CampaignDB)
        
        if status:
            query = query.filter(CampaignDB.status == status.value)
            
        db_campaigns = query.offset(skip).limit(limit).all()
        db.close()
        
        campaigns = []
        for db_campaign in db_campaigns:
            campaign_data = {
                "id": db_campaign.id,
                "name": db_campaign.name,
                "description": db_campaign.description,
                "campaign_type": db_campaign.campaign_type,
                "status": db_campaign.status,
                "video_content": db_campaign.video_content,
                "config": db_campaign.config,
                "posts": db_campaign.posts or [],
                "video_urls": db_campaign.video_urls or [],
                "analytics": db_campaign.analytics,
                "created_at": db_campaign.created_at,
                "updated_at": db_campaign.updated_at
            }
            campaigns.append(Campaign(**campaign_data))
        
        return campaigns
    
    async def process_campaign(self, campaign_id: str):
        """Process a campaign - generate videos and schedule posts"""
        try:
            campaign = await self.get_campaign(campaign_id)
            if not campaign:
                logger.error(f"Campaign not found: {campaign_id}")
                return
            
            # Update status to running
            await self.update_campaign_status(campaign_id, CampaignStatus.RUNNING)
            
            # Generate videos based on campaign content
            video_urls = await self._generate_campaign_videos(campaign)
            
            # Create social media posts
            await self._create_social_posts(campaign, video_urls)
            
            # Update status to completed
            await self.update_campaign_status(campaign_id, CampaignStatus.COMPLETED)
            
            logger.info(f"Campaign processed successfully: {campaign_id}")
            
        except Exception as e:
            logger.error(f"Error processing campaign {campaign_id}: {e}")
            await self.update_campaign_status(campaign_id, CampaignStatus.FAILED)
    
    async def update_campaign_status(self, campaign_id: str, status: CampaignStatus):
        """Update campaign status"""
        db = next(get_db())
        db_campaign = db.query(CampaignDB).filter(CampaignDB.id == campaign_id).first()
        if db_campaign:
            db_campaign.status = status.value
            db_campaign.updated_at = datetime.utcnow()
            db.commit()
        db.close()
    
    async def stop_campaign(self, campaign_id: str):
        """Stop a running campaign"""
        await self.update_campaign_status(campaign_id, CampaignStatus.PAUSED)
    
    async def _generate_campaign_videos(self, campaign: Campaign) -> List[str]:
        """Generate videos for a campaign"""
        video_urls = []
        content = campaign.video_content
        
        # Generate main video
        prompt = self._enhance_prompt_for_japanese_audience(content.prompt, campaign.campaign_type)
        
        video_url = await self.video_generator.generate_video(
            prompt=prompt,
            style=content.style,
            duration=content.duration,
            japanese_optimized=content.japanese_optimized
        )
        
        if video_url:
            video_urls.append(video_url)
        
        # Generate variations if requested
        for i in range(campaign.config.content_variations - 1):
            variation_prompt = self._create_variation_prompt(prompt, i + 1)
            variation_url = await self.video_generator.generate_video(
                prompt=variation_prompt,
                style=content.style,
                duration=content.duration,
                japanese_optimized=content.japanese_optimized
            )
            if variation_url:
                video_urls.append(variation_url)
        
        # Update campaign with video URLs
        db = next(get_db())
        db_campaign = db.query(CampaignDB).filter(CampaignDB.id == campaign.id).first()
        if db_campaign:
            db_campaign.video_urls = video_urls
            db.commit()
        db.close()
        
        return video_urls
    
    async def _create_social_posts(self, campaign: Campaign, video_urls: List[str]):
        """Create and schedule social media posts"""
        if not video_urls:
            logger.warning(f"No videos generated for campaign {campaign.id}")
            return
        
        posts = []
        for i, platform in enumerate(campaign.config.target_platforms):
            video_url = video_urls[i % len(video_urls)]  # Cycle through videos
            
            # Create platform-optimized caption
            caption = self._create_platform_caption(campaign, platform)
            hashtags = self._get_trending_hashtags(platform, campaign.campaign_type)
            
            # Schedule post
            post_result = await self.social_poster.schedule_post(
                platform=platform,
                video_url=video_url,
                caption=caption,
                hashtags=hashtags,
                schedule=campaign.config.posting_schedule
            )
            
            if post_result:
                posts.append(post_result)
        
        # Update campaign with posts
        db = next(get_db())
        db_campaign = db.query(CampaignDB).filter(CampaignDB.id == campaign.id).first()
        if db_campaign:
            db_campaign.posts = [post.dict() for post in posts]
            db.commit()
        db.close()
    
    def _enhance_prompt_for_japanese_audience(self, prompt: str, campaign_type: str) -> str:
        """Enhance prompt for Japanese audience"""
        japanese_elements = {
            "ai_product_reaction": "日本のアニメスタイルで、可愛いキャラクターが新商品に驚く反応を示す",
            "mystery_product_launch": "神秘的な雰囲気で、日本の美学を取り入れたミステリアスな商品発表",
            "ai_vs_human_poll": "日本の文化に根ざした、AIと人間の違いを面白く比較",
            "day_in_life": "日本の日常生活の美しい瞬間を捉えた、リラックスした雰囲気",
            "memeable_content": "日本のミーム文化に合った、面白くてシェアしたくなる内容"
        }
        
        enhancement = japanese_elements.get(campaign_type, "日本の視聴者向けの魅力的なコンテンツ")
        return f"{prompt}. {enhancement}. アニメスタイル、高品質、縦向き動画、日本語字幕対応"
    
    def _create_variation_prompt(self, base_prompt: str, variation_number: int) -> str:
        """Create variation of the base prompt"""
        variations = [
            "異なる角度から",
            "より明るい雰囲気で",
            "よりドラマチックに",
            "コメディタッチで",
            "ミニマルなスタイルで"
        ]
        
        variation = variations[variation_number % len(variations)]
        return f"{base_prompt}. {variation}撮影"
    
    def _create_platform_caption(self, campaign: Campaign, platform: str) -> str:
        """Create platform-optimized caption"""
        base_caption = campaign.description
        
        platform_specific = {
            "tiktok": f"🔥 {base_caption} #バイラル #TikTok #AI",
            "instagram": f"✨ {base_caption}\n\n📱 フォローしてね！",
            "youtube": f"🎬 {base_caption}\n\nチャンネル登録お願いします！"
        }
        
        return platform_specific.get(platform, base_caption)
    
    def _get_trending_hashtags(self, platform: str, campaign_type: str) -> List[str]:
        """Get trending hashtags for platform and campaign type"""
        base_hashtags = settings.default_hashtags_jp.copy()
        
        type_hashtags = {
            "ai_product_reaction": ["#商品レビュー", "#AI反応", "#新商品"],
            "mystery_product_launch": ["#ミステリー", "#新発売", "#話題"],
            "ai_vs_human_poll": ["#AI", "#人間", "#比較", "#投票"],
            "day_in_life": ["#日常", "#ライフスタイル", "#vlog"],
            "memeable_content": ["#面白い", "#ミーム", "#爆笑"]
        }
        
        campaign_hashtags = type_hashtags.get(campaign_type, [])
        return base_hashtags + campaign_hashtags
    
    async def list_templates(self) -> List[dict]:
        """List available campaign templates"""
        templates_dir = "app/templates"
        templates = []
        
        if os.path.exists(templates_dir):
            for filename in os.listdir(templates_dir):
                if filename.endswith('.yaml') or filename.endswith('.yml'):
                    template_path = os.path.join(templates_dir, filename)
                    try:
                        with open(template_path, 'r', encoding='utf-8') as f:
                            template_data = yaml.safe_load(f)
                            template_data['filename'] = filename
                            templates.append(template_data)
                    except Exception as e:
                        logger.error(f"Error loading template {filename}: {e}")
        
        return templates