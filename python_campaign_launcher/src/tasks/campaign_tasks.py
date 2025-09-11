from celery import current_task
import uuid
from datetime import datetime
from typing import Dict, Any
from ..core.celery_app import celery_app
from ..services.content_generator import GeminiContentGenerator
from ..services.video_generator import VideoGenerator
from ..core.templates import CampaignTemplateLoader
from ..models.campaign import Campaign, CampaignStatus, ContentType
from ..storage.s3_storage import S3Storage


@celery_app.task(bind=True)
def generate_campaign_content(self, campaign_config: Dict[str, Any]):
    """Generate content for a campaign"""
    
    try:
        # Update task status
        self.update_state(
            state='PROGRESS',
            meta={'step': 'Starting content generation', 'progress': 10}
        )
        
        # Load campaign template
        template_loader = CampaignTemplateLoader()
        template = template_loader.get_template_by_key(campaign_config['template_key'])
        
        # Initialize services
        content_generator = GeminiContentGenerator()
        video_generator = VideoGenerator()
        storage = S3Storage()
        
        # Generate script
        self.update_state(
            state='PROGRESS',
            meta={'step': 'Generating script', 'progress': 30}
        )
        
        script = content_generator.generate_script(
            template=template,
            content_type=ContentType(campaign_config['content_type']),
            topic=campaign_config.get('topic')
        )
        
        # Generate video
        self.update_state(
            state='PROGRESS', 
            meta={'step': 'Generating video', 'progress': 60}
        )
        
        video_result = video_generator.generate_video(script)
        
        # Upload to storage
        self.update_state(
            state='PROGRESS',
            meta={'step': 'Uploading assets', 'progress': 80}
        )
        
        campaign_id = campaign_config.get('id', str(uuid.uuid4()))
        
        # Upload video
        video_url = None
        if video_result.get('video_url'):
            video_url = storage.upload_file(
                video_result['video_url'],
                f"campaigns/{campaign_id}/video.mp4"
            )
        
        # Upload audio
        audio_url = None
        if video_result.get('audio_url'):
            audio_url = storage.upload_file(
                video_result['audio_url'], 
                f"campaigns/{campaign_id}/audio.mp3"
            )
        
        # Clean up temporary files
        video_generator.cleanup()
        
        # Return results
        result = {
            'campaign_id': campaign_id,
            'script': script,
            'video_url': video_url,
            'audio_url': audio_url,
            'duration': video_result.get('duration'),
            'created_at': datetime.now().isoformat(),
            'status': 'completed'
        }
        
        self.update_state(
            state='SUCCESS',
            meta={'step': 'Content generation completed', 'progress': 100, 'result': result}
        )
        
        return result
        
    except Exception as exc:
        # Handle errors
        error_msg = str(exc)
        self.update_state(
            state='FAILURE',
            meta={'step': 'Error in content generation', 'error': error_msg}
        )
        raise


@celery_app.task
def check_scheduled_campaigns():
    """Check for scheduled campaigns that need to be executed"""
    
    try:
        # This would typically check a database for scheduled campaigns
        # For now, we'll just log that the check is running
        print(f"Checking scheduled campaigns at {datetime.now()}")
        
        # TODO: Implement database queries to find campaigns ready for execution
        # TODO: Trigger campaign execution for ready campaigns
        
        return {"checked_at": datetime.now().isoformat(), "found": 0}
        
    except Exception as exc:
        print(f"Error checking scheduled campaigns: {exc}")
        raise


@celery_app.task  
def cleanup_completed_tasks():
    """Clean up completed task results"""
    
    try:
        # This would typically clean up old task results from Redis
        print(f"Cleaning up completed tasks at {datetime.now()}")
        
        # TODO: Implement cleanup of old task results
        # TODO: Clean up temporary files
        
        return {"cleaned_at": datetime.now().isoformat(), "cleaned_count": 0}
        
    except Exception as exc:
        print(f"Error cleaning up tasks: {exc}")
        raise


@celery_app.task(bind=True)
def execute_campaign_workflow(self, campaign_id: str, campaign_config: Dict[str, Any]):
    """Execute complete campaign workflow: generate content -> publish -> analyze"""
    
    try:
        # Step 1: Generate content
        self.update_state(
            state='PROGRESS',
            meta={'step': 'Generating content', 'progress': 25}
        )
        
        content_task = generate_campaign_content.delay(campaign_config)
        content_result = content_task.get()  # Wait for completion
        
        # Step 2: Publish to social media
        self.update_state(
            state='PROGRESS', 
            meta={'step': 'Publishing to social media', 'progress': 60}
        )
        
        # Import here to avoid circular imports
        from .social_tasks import publish_to_platforms
        
        publish_task = publish_to_platforms.delay(
            campaign_id=campaign_id,
            content_result=content_result,
            platforms=campaign_config.get('platforms', [])
        )
        publish_result = publish_task.get()
        
        # Step 3: Initialize analytics tracking
        self.update_state(
            state='PROGRESS',
            meta={'step': 'Setting up analytics', 'progress': 90}
        )
        
        # TODO: Initialize analytics tracking
        
        # Complete workflow
        final_result = {
            'campaign_id': campaign_id,
            'content': content_result,
            'publishing': publish_result,
            'status': 'completed',
            'completed_at': datetime.now().isoformat()
        }
        
        self.update_state(
            state='SUCCESS',
            meta={'step': 'Campaign workflow completed', 'progress': 100, 'result': final_result}
        )
        
        return final_result
        
    except Exception as exc:
        error_msg = str(exc)
        self.update_state(
            state='FAILURE',
            meta={'step': 'Error in campaign workflow', 'error': error_msg}
        )
        raise