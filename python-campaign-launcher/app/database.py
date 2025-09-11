from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy import Column, String, DateTime, Boolean, Text, JSON, Integer
from datetime import datetime
from app.config import settings

engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class CampaignDB(Base):
    __tablename__ = "campaigns"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    campaign_type = Column(String, nullable=False)
    status = Column(String, default="draft")
    video_content = Column(JSON)
    config = Column(JSON)
    posts = Column(JSON, default=list)
    video_urls = Column(JSON, default=list)
    analytics = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class VideoTaskDB(Base):
    __tablename__ = "video_tasks"
    
    id = Column(String, primary_key=True)
    status = Column(String, default="pending")
    prompt = Column(Text, nullable=False)
    style = Column(String)
    duration = Column(Integer)
    video_url = Column(String)
    error_message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)

class EngagementTaskDB(Base):
    __tablename__ = "engagement_tasks"
    
    id = Column(String, primary_key=True)
    campaign_id = Column(String, nullable=False)
    platform = Column(String, nullable=False)
    post_id = Column(String, nullable=False)
    task_type = Column(String, nullable=False)
    executed = Column(Boolean, default=False)
    scheduled_time = Column(DateTime, nullable=False)
    result = Column(JSON)

async def init_db():
    """Initialize database tables"""
    Base.metadata.create_all(bind=engine)

def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()