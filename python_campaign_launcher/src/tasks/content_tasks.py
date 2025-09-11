from celery import current_task
from datetime import datetime
from typing import Dict, Any
from ..core.celery_app import celery_app
from ..services.content_generator import GeminiContentGenerator
from ..core.templates import CampaignTemplateLoader
from ..models.campaign import ContentType


@celery_app.task(bind=True)
def generate_content_only(self, template_key: str, content_type: str, topic: str = None):
    """Generate content without video processing (for testing)"""
    
    try:
        # Update task status
        self.update_state(
            state='PROGRESS',
            meta={'step': 'Loading template', 'progress': 20}
        )
        
        # Load template
        template_loader = CampaignTemplateLoader()
        template = template_loader.get_template_by_key(template_key)
        
        # Generate content
        self.update_state(
            state='PROGRESS',
            meta={'step': 'Generating content', 'progress': 60}
        )
        
        content_generator = GeminiContentGenerator()
        script = content_generator.generate_script(
            template=template,
            content_type=ContentType(content_type),
            topic=topic
        )
        
        # Return results
        result = {
            'template_key': template_key,
            'content_type': content_type,
            'script': script,
            'generated_at': datetime.now().isoformat(),
            'status': 'completed'
        }
        
        self.update_state(
            state='SUCCESS',
            meta={'step': 'Content generation completed', 'progress': 100, 'result': result}
        )
        
        return result
        
    except Exception as exc:
        error_msg = str(exc)
        self.update_state(
            state='FAILURE',
            meta={'step': 'Error in content generation', 'error': error_msg}
        )
        raise


@celery_app.task
def test_task(message: str = "Hello from Celery!"):
    """Simple test task to verify Celery is working"""
    
    import time
    
    # Simulate some work
    time.sleep(2)
    
    return {
        "message": message,
        "timestamp": datetime.now().isoformat(),
        "status": "completed"
    }