from celery import shared_task
import logging
from datetime import datetime

from app.services.video_generator import VideoGeneratorService
from app.database import get_db, VideoTaskDB

logger = logging.getLogger(__name__)

@shared_task(bind=True)
def generate_video_task(self, task_id: str, prompt: str, style: str = "anime", duration: int = 15):
    """Celery task for video generation"""
    try:
        logger.info(f"Starting video generation task: {task_id}")
        
        # Update task status
        db = next(get_db())
        task = db.query(VideoTaskDB).filter(VideoTaskDB.id == task_id).first()
        if task:
            task.status = "processing"
            db.commit()
        db.close()
        
        # Generate video
        video_service = VideoGeneratorService()
        video_url = video_service.generate_video(
            prompt=prompt,
            style=style,
            duration=duration
        )
        
        # Update task with result
        db = next(get_db())
        task = db.query(VideoTaskDB).filter(VideoTaskDB.id == task_id).first()
        if task:
            if video_url:
                task.status = "completed"
                task.video_url = video_url
            else:
                task.status = "failed"
                task.error_message = "Video generation failed"
            task.completed_at = datetime.utcnow()
            db.commit()
        db.close()
        
        logger.info(f"Video generation task completed: {task_id}")
        return {"task_id": task_id, "video_url": video_url}
        
    except Exception as e:
        logger.error(f"Video generation task failed: {e}")
        
        # Update task with error
        db = next(get_db())
        task = db.query(VideoTaskDB).filter(VideoTaskDB.id == task_id).first()
        if task:
            task.status = "failed"
            task.error_message = str(e)
            task.completed_at = datetime.utcnow()
            db.commit()
        db.close()
        
        raise

@shared_task
def batch_generate_videos(campaign_id: str, video_configs: list):
    """Generate multiple videos for a campaign"""
    try:
        logger.info(f"Starting batch video generation for campaign: {campaign_id}")
        
        results = []
        for config in video_configs:
            task_id = generate_video_task.delay(
                task_id=config["task_id"],
                prompt=config["prompt"],
                style=config.get("style", "anime"),
                duration=config.get("duration", 15)
            )
            results.append(task_id)
        
        return {"campaign_id": campaign_id, "video_tasks": [str(task.id) for task in results]}
        
    except Exception as e:
        logger.error(f"Batch video generation failed: {e}")
        raise

@shared_task
def optimize_video_quality(video_path: str, target_platform: str):
    """Optimize video for specific platform requirements"""
    try:
        logger.info(f"Optimizing video for {target_platform}: {video_path}")
        
        # Platform-specific optimization settings
        platform_settings = {
            "tiktok": {
                "resolution": (720, 1280),
                "fps": 30,
                "bitrate": "2000k",
                "format": "mp4"
            },
            "instagram": {
                "resolution": (720, 1280),
                "fps": 30,
                "bitrate": "3500k",
                "format": "mp4"
            },
            "youtube": {
                "resolution": (1080, 1920),
                "fps": 60,
                "bitrate": "5000k",
                "format": "mp4"
            }
        }
        
        settings = platform_settings.get(target_platform, platform_settings["tiktok"])
        
        # Simulate video optimization (in production, use FFmpeg)
        optimized_path = video_path.replace(".mp4", f"_{target_platform}.mp4")
        
        logger.info(f"Video optimized for {target_platform}: {optimized_path}")
        return optimized_path
        
    except Exception as e:
        logger.error(f"Video optimization failed: {e}")
        raise