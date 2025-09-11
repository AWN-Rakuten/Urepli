from celery import Celery
from celery.schedules import crontab
import logging

from app.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Celery app
celery_app = Celery(
    "campaign_launcher",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        'app.workers.video_worker',
        'app.workers.social_worker',
        'app.workers.engagement_worker'
    ]
)

# Configure Celery
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='Asia/Tokyo',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_disable_rate_limits=True,
    worker_prefetch_multiplier=1,
)

# Scheduled tasks for campaign automation
celery_app.conf.beat_schedule = {
    # Check for scheduled campaigns every 5 minutes
    'check-scheduled-campaigns': {
        'task': 'app.workers.campaign_scheduler.check_scheduled_campaigns',
        'schedule': 300.0,  # 5 minutes
    },
    
    # Process engagement tasks every 10 minutes
    'process-engagement-tasks': {
        'task': 'app.workers.engagement_worker.process_engagement_queue',
        'schedule': 600.0,  # 10 minutes
    },
    
    # Update analytics every hour
    'update-campaign-analytics': {
        'task': 'app.workers.analytics_worker.update_all_campaign_analytics',
        'schedule': crontab(minute=0),  # Every hour
    },
    
    # Cleanup old video files daily
    'cleanup-old-videos': {
        'task': 'app.workers.cleanup_worker.cleanup_old_videos',
        'schedule': crontab(hour=2, minute=0),  # Daily at 2 AM
    },
    
    # Generate trending hashtags every 6 hours
    'update-trending-hashtags': {
        'task': 'app.workers.hashtag_worker.update_trending_hashtags',
        'schedule': crontab(minute=0, hour='*/6'),  # Every 6 hours
    }
}

if __name__ == '__main__':
    celery_app.start()