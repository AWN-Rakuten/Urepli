from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
import uvicorn
from contextlib import asynccontextmanager
from typing import List, Optional
import logging

from app.models import Campaign, CampaignCreate, CampaignStatus
from app.services.campaign_manager import CampaignManager
from app.services.video_generator import VideoGeneratorService
from app.services.social_poster import SocialPosterService
from app.services.analytics import AnalyticsService
from app.config import settings
from app.database import init_db

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize services
campaign_manager = CampaignManager()
video_generator = VideoGeneratorService()
social_poster = SocialPosterService()
analytics = AnalyticsService()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting AI Social Campaign Launcher...")
    await init_db()
    yield
    # Shutdown
    logger.info("Shutting down...")

app = FastAPI(
    title="AI Social Campaign Launcher",
    description="AI-driven social media campaign launcher for Japanese audiences",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

@app.get("/")
async def root():
    return {"message": "AI Social Campaign Launcher API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "services": {
        "database": "connected",
        "redis": "connected",
        "storage": "connected"
    }}

@app.post("/campaigns", response_model=Campaign)
async def create_campaign(
    campaign_data: CampaignCreate,
    background_tasks: BackgroundTasks
):
    """Create a new AI-driven social media campaign"""
    try:
        campaign = await campaign_manager.create_campaign(campaign_data)
        
        # Start campaign processing in background
        background_tasks.add_task(
            campaign_manager.process_campaign,
            campaign.id
        )
        
        return campaign
    except Exception as e:
        logger.error(f"Error creating campaign: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/campaigns", response_model=List[Campaign])
async def list_campaigns(
    skip: int = 0,
    limit: int = 100,
    status: Optional[CampaignStatus] = None
):
    """List all campaigns with optional filtering"""
    try:
        campaigns = await campaign_manager.list_campaigns(skip, limit, status)
        return campaigns
    except Exception as e:
        logger.error(f"Error listing campaigns: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/campaigns/{campaign_id}", response_model=Campaign)
async def get_campaign(campaign_id: str):
    """Get campaign details by ID"""
    try:
        campaign = await campaign_manager.get_campaign(campaign_id)
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        return campaign
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting campaign: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/campaigns/{campaign_id}/start")
async def start_campaign(campaign_id: str, background_tasks: BackgroundTasks):
    """Start a campaign manually"""
    try:
        campaign = await campaign_manager.get_campaign(campaign_id)
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        background_tasks.add_task(
            campaign_manager.process_campaign,
            campaign_id
        )
        
        return {"message": "Campaign started", "campaign_id": campaign_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting campaign: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/campaigns/{campaign_id}/stop")
async def stop_campaign(campaign_id: str):
    """Stop a running campaign"""
    try:
        await campaign_manager.stop_campaign(campaign_id)
        return {"message": "Campaign stopped", "campaign_id": campaign_id}
    except Exception as e:
        logger.error(f"Error stopping campaign: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/campaigns/{campaign_id}/analytics")
async def get_campaign_analytics(campaign_id: str):
    """Get campaign performance analytics"""
    try:
        analytics_data = await analytics.get_campaign_analytics(campaign_id)
        return analytics_data
    except Exception as e:
        logger.error(f"Error getting analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/video/generate")
async def generate_video(
    prompt: str,
    background_tasks: BackgroundTasks,
    style: str = "anime",
    duration: int = 15
):
    """Generate a video using AI"""
    try:
        task_id = await video_generator.generate_video_async(
            prompt=prompt,
            style=style,
            duration=duration
        )
        
        return {"task_id": task_id, "status": "processing"}
    except Exception as e:
        logger.error(f"Error generating video: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/video/status/{task_id}")
async def get_video_status(task_id: str):
    """Get video generation status"""
    try:
        status = await video_generator.get_generation_status(task_id)
        return status
    except Exception as e:
        logger.error(f"Error getting video status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/templates")
async def list_campaign_templates():
    """List available campaign templates"""
    try:
        templates = await campaign_manager.list_templates()
        return templates
    except Exception as e:
        logger.error(f"Error listing templates: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )