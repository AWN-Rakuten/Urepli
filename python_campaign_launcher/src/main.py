from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime

from .models.campaign import Campaign, CampaignConfig, CampaignStatus, PlatformType, ContentType
from .core.templates import CampaignTemplateLoader
from .core.config import settings
from .tasks.campaign_tasks import generate_campaign_content, execute_campaign_workflow
from .core.celery_app import celery_app

app = FastAPI(
    title="AI-driven Social Campaign Launcher",
    description="Generate viral, interactive trends for TikTok, Instagram, and YouTube with AI",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for demo (replace with database in production)
campaigns_db: Dict[str, Campaign] = {}
template_loader = CampaignTemplateLoader()


class CreateCampaignRequest(BaseModel):
    name: str
    template_key: str
    platforms: List[PlatformType]
    content_type: ContentType
    schedule: Optional[str] = None
    daily_limit: int = 5
    video_config: Dict[str, Any] = {}
    tags: List[str] = []


class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    progress: int = 0
    step: str = ""
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "AI-driven Social Campaign Launcher API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "campaigns": "/campaigns",
            "templates": "/templates", 
            "tasks": "/tasks/{task_id}",
            "health": "/health"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check Celery connection
        celery_inspect = celery_app.control.inspect()
        active_tasks = celery_inspect.active()
        celery_healthy = active_tasks is not None
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "services": {
                "api": "healthy",
                "celery": "healthy" if celery_healthy else "unhealthy",
                "storage": "healthy"  # TODO: Add actual storage health check
            },
            "config": {
                "gemini_configured": bool(settings.gemini_api_key),
                "s3_configured": bool(settings.s3_endpoint_url),
                "redis_configured": bool(settings.redis_url)
            }
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }


@app.get("/templates")
async def list_templates():
    """Get available campaign templates"""
    try:
        templates = template_loader.load_templates()
        return {
            "templates": [template.dict() for template in templates],
            "count": len(templates)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/templates/{template_key}")
async def get_template(template_key: str):
    """Get a specific template by key"""
    try:
        template = template_loader.get_template_by_key(template_key)
        return template.dict()
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/campaigns")
async def create_campaign(request: CreateCampaignRequest, background_tasks: BackgroundTasks):
    """Create a new campaign"""
    try:
        # Validate template exists
        template_loader.get_template_by_key(request.template_key)
        
        # Create campaign
        campaign_id = str(uuid.uuid4())
        
        # Create campaign config
        from .models.campaign import VideoGenerationRequest
        video_config = VideoGenerationRequest(
            script="",  # Will be generated
            style=request.video_config.get("style", "kawaii"),
            voice_language=request.video_config.get("voice_language", "ja"),
            duration=request.video_config.get("duration", 30),
            resolution=request.video_config.get("resolution", "1080x1920")
        )
        
        campaign_config = CampaignConfig(
            name=request.name,
            template_key=request.template_key,
            platforms=request.platforms,
            content_type=request.content_type,
            schedule=request.schedule,
            daily_limit=request.daily_limit,
            video_config=video_config,
            tags=request.tags
        )
        
        campaign = Campaign(
            id=campaign_id,
            config=campaign_config,
            status=CampaignStatus.PENDING,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        # Store campaign
        campaigns_db[campaign_id] = campaign
        
        # Start content generation task
        task_config = {
            "id": campaign_id,
            "template_key": request.template_key,
            "content_type": request.content_type.value,
            "platforms": [p.value for p in request.platforms],
            "video_config": request.video_config
        }
        
        if request.schedule:
            # If scheduled, don't start immediately
            campaign.status = CampaignStatus.SCHEDULED
            campaigns_db[campaign_id] = campaign
            task_id = None
        else:
            # Start workflow immediately
            task = execute_campaign_workflow.delay(campaign_id, task_config)
            task_id = task.id
            campaign.status = CampaignStatus.PROCESSING
            campaigns_db[campaign_id] = campaign
        
        return {
            "campaign_id": campaign_id,
            "task_id": task_id,
            "status": campaign.status.value,
            "created_at": campaign.created_at.isoformat()
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/campaigns")
async def list_campaigns():
    """List all campaigns"""
    campaigns = []
    for campaign in campaigns_db.values():
        campaigns.append({
            "id": campaign.id,
            "name": campaign.config.name,
            "status": campaign.status.value,
            "template_key": campaign.config.template_key,
            "platforms": [p.value for p in campaign.config.platforms],
            "content_type": campaign.config.content_type.value,
            "created_at": campaign.created_at.isoformat(),
            "updated_at": campaign.updated_at.isoformat()
        })
    
    return {
        "campaigns": campaigns,
        "count": len(campaigns)
    }


@app.get("/campaigns/{campaign_id}")
async def get_campaign(campaign_id: str):
    """Get a specific campaign"""
    if campaign_id not in campaigns_db:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    campaign = campaigns_db[campaign_id]
    return campaign.dict()


@app.delete("/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: str):
    """Delete a campaign"""
    if campaign_id not in campaigns_db:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    del campaigns_db[campaign_id]
    return {"message": "Campaign deleted"}


@app.get("/tasks/{task_id}")
async def get_task_status(task_id: str):
    """Get status of a Celery task"""
    try:
        task = celery_app.AsyncResult(task_id)
        
        if task.state == 'PENDING':
            response = TaskStatusResponse(
                task_id=task_id,
                status='pending',
                step='Task is waiting to be processed'
            )
        elif task.state == 'PROGRESS':
            response = TaskStatusResponse(
                task_id=task_id,
                status='processing',
                progress=task.info.get('progress', 0),
                step=task.info.get('step', 'Processing...')
            )
        elif task.state == 'SUCCESS':
            response = TaskStatusResponse(
                task_id=task_id,
                status='completed',
                progress=100,
                step='Task completed successfully',
                result=task.info.get('result', task.result)
            )
        else:  # FAILURE
            response = TaskStatusResponse(
                task_id=task_id,
                status='failed',
                step='Task failed',
                error=str(task.info.get('error', task.result))
            )
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/campaigns/{campaign_id}/generate")
async def regenerate_campaign_content(campaign_id: str):
    """Regenerate content for an existing campaign"""
    if campaign_id not in campaigns_db:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    campaign = campaigns_db[campaign_id]
    
    # Create task config from campaign
    task_config = {
        "id": campaign_id,
        "template_key": campaign.config.template_key,
        "content_type": campaign.config.content_type.value,
        "platforms": [p.value for p in campaign.config.platforms],
        "video_config": campaign.config.video_config.dict()
    }
    
    # Start content generation
    task = generate_campaign_content.delay(task_config)
    
    # Update campaign status
    campaign.status = CampaignStatus.PROCESSING
    campaign.updated_at = datetime.now()
    campaigns_db[campaign_id] = campaign
    
    return {
        "campaign_id": campaign_id,
        "task_id": task.id,
        "status": "processing"
    }


@app.get("/analytics/overview")
async def get_analytics_overview():
    """Get analytics overview"""
    total_campaigns = len(campaigns_db)
    completed_campaigns = sum(1 for c in campaigns_db.values() if c.status == CampaignStatus.COMPLETED)
    failed_campaigns = sum(1 for c in campaigns_db.values() if c.status == CampaignStatus.FAILED)
    
    return {
        "total_campaigns": total_campaigns,
        "completed_campaigns": completed_campaigns,
        "failed_campaigns": failed_campaigns,
        "success_rate": completed_campaigns / total_campaigns if total_campaigns > 0 else 0,
        "generated_at": datetime.now().isoformat()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )