from celery import Celery
from ..core.config import settings

# Create Celery app
celery_app = Celery(
    "campaign_launcher",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "src.tasks.campaign_tasks",
        "src.tasks.content_tasks", 
        "src.tasks.social_tasks"
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
    worker_prefetch_multiplier=1,
    result_expires=3600,  # 1 hour
)

# Define periodic tasks
celery_app.conf.beat_schedule = {
    'check-scheduled-campaigns': {
        'task': 'src.tasks.campaign_tasks.check_scheduled_campaigns',
        'schedule': 60.0,  # Check every minute
    },
    'cleanup-completed-tasks': {
        'task': 'src.tasks.campaign_tasks.cleanup_completed_tasks',
        'schedule': 3600.0,  # Clean up every hour
    },
}