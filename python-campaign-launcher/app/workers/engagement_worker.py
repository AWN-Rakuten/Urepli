from celery import shared_task
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any

from app.services.social_poster import SocialPosterService
from app.database import get_db, EngagementTaskDB, CampaignDB

logger = logging.getLogger(__name__)

@shared_task
def process_engagement_queue():
    """Process pending engagement tasks"""
    try:
        logger.info("Processing engagement queue...")
        
        # Get pending engagement tasks
        db = next(get_db())
        pending_tasks = db.query(EngagementTaskDB).filter(
            EngagementTaskDB.executed == False,
            EngagementTaskDB.scheduled_time <= datetime.utcnow()
        ).limit(10).all()
        
        social_poster = SocialPosterService()
        
        for task in pending_tasks:
            try:
                # Execute engagement task
                result = await social_poster.engage_with_content(
                    campaign_id=task.campaign_id,
                    platform=task.platform,
                    post_id=task.post_id,
                    engagement_type=task.task_type
                )
                
                # Update task status
                task.executed = True
                task.result = result
                db.commit()
                
                logger.info(f"Executed engagement task: {task.id}")
                
            except Exception as e:
                logger.error(f"Error executing engagement task {task.id}: {e}")
                continue
        
        db.close()
        logger.info(f"Processed {len(pending_tasks)} engagement tasks")
        
    except Exception as e:
        logger.error(f"Error processing engagement queue: {e}")
        raise

@shared_task
def schedule_engagement_tasks(campaign_id: str, posts: List[Dict[str, Any]]):
    """Schedule engagement tasks for campaign posts"""
    try:
        logger.info(f"Scheduling engagement tasks for campaign: {campaign_id}")
        
        db = next(get_db())
        
        for post in posts:
            platform = post.get("platform")
            post_id = post.get("post_id")
            
            if not platform or not post_id:
                continue
            
            # Schedule different engagement tasks with delays
            engagement_tasks = [
                {"type": "like", "delay_hours": 0.5},
                {"type": "reply", "delay_hours": 2},
                {"type": "share", "delay_hours": 4}
            ]
            
            for task_config in engagement_tasks:
                scheduled_time = datetime.utcnow() + timedelta(hours=task_config["delay_hours"])
                
                engagement_task = EngagementTaskDB(
                    campaign_id=campaign_id,
                    platform=platform,
                    post_id=post_id,
                    task_type=task_config["type"],
                    scheduled_time=scheduled_time
                )
                
                db.add(engagement_task)
        
        db.commit()
        db.close()
        
        logger.info(f"Scheduled engagement tasks for campaign: {campaign_id}")
        
    except Exception as e:
        logger.error(f"Error scheduling engagement tasks: {e}")
        raise

@shared_task
def auto_reply_to_comments(post_id: str, platform: str, campaign_id: str):
    """Auto-reply to new comments on posts"""
    try:
        logger.info(f"Auto-replying to comments for post: {post_id}")
        
        # Get campaign details for reply templates
        db = next(get_db())
        campaign = db.query(CampaignDB).filter(CampaignDB.id == campaign_id).first()
        db.close()
        
        if not campaign or not campaign.config:
            return
        
        replies = campaign.config.get("engagement_replies", [])
        if not replies:
            return
        
        # Simulate getting new comments (in production, integrate with social media APIs)
        # For now, just log the action
        logger.info(f"Would auto-reply with templates: {replies[:2]}")
        
        return {"success": True, "replies_sent": 2}
        
    except Exception as e:
        logger.error(f"Error auto-replying to comments: {e}")
        raise

@shared_task
def monitor_trending_hashtags(platform: str):
    """Monitor and update trending hashtags for platform"""
    try:
        logger.info(f"Monitoring trending hashtags for {platform}")
        
        # Simulate trending hashtag detection
        # In production, integrate with platform APIs
        trending_tags = {
            "tiktok": ["#バイラル", "#トレンド", "#AI", "#日本"],
            "instagram": ["#インスタ", "#写真", "#日本", "#トレンド"],
            "youtube": ["#動画", "#ユーチューブ", "#日本", "#面白い"]
        }
        
        tags = trending_tags.get(platform, [])
        logger.info(f"Found trending tags for {platform}: {tags}")
        
        return {"platform": platform, "trending_tags": tags}
        
    except Exception as e:
        logger.error(f"Error monitoring trending hashtags: {e}")
        raise