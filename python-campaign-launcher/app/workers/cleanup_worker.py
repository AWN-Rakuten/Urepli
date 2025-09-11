from celery import shared_task
import logging
from datetime import datetime, timedelta
import os
import glob

from app.config import settings

logger = logging.getLogger(__name__)

@shared_task
def cleanup_old_videos():
    """Clean up old video files to save storage space"""
    try:
        logger.info("Starting cleanup of old video files...")
        
        # Define cleanup age (e.g., delete videos older than 7 days)
        cleanup_age = datetime.now() - timedelta(days=7)
        cleanup_count = 0
        
        # Get video directory
        video_dir = settings.video_output_path
        if not os.path.exists(video_dir):
            logger.info(f"Video directory does not exist: {video_dir}")
            return
        
        # Find video files
        video_patterns = ["*.mp4", "*.mov", "*.avi", "*.mkv", "*.webm"]
        
        for pattern in video_patterns:
            video_files = glob.glob(os.path.join(video_dir, pattern))
            
            for video_file in video_files:
                try:
                    # Check file age
                    file_time = datetime.fromtimestamp(os.path.getctime(video_file))
                    
                    if file_time < cleanup_age:
                        os.remove(video_file)
                        cleanup_count += 1
                        logger.info(f"Deleted old video file: {video_file}")
                        
                except Exception as e:
                    logger.error(f"Error deleting video file {video_file}: {e}")
                    continue
        
        logger.info(f"Cleanup completed. Deleted {cleanup_count} old video files.")
        return {"deleted_count": cleanup_count}
        
    except Exception as e:
        logger.error(f"Error during video cleanup: {e}")
        raise

@shared_task
def cleanup_temp_files():
    """Clean up temporary files"""
    try:
        logger.info("Cleaning up temporary files...")
        
        temp_patterns = [
            "/tmp/*.tmp",
            "/tmp/temp-*",
            "/tmp/moviepy_*"
        ]
        
        cleanup_count = 0
        
        for pattern in temp_patterns:
            temp_files = glob.glob(pattern)
            
            for temp_file in temp_files:
                try:
                    # Check if file is older than 1 hour
                    file_time = datetime.fromtimestamp(os.path.getctime(temp_file))
                    if file_time < datetime.now() - timedelta(hours=1):
                        os.remove(temp_file)
                        cleanup_count += 1
                        
                except Exception as e:
                    logger.error(f"Error deleting temp file {temp_file}: {e}")
                    continue
        
        logger.info(f"Cleaned up {cleanup_count} temporary files")
        return {"cleaned_temp_files": cleanup_count}
        
    except Exception as e:
        logger.error(f"Error cleaning temp files: {e}")
        raise

@shared_task
def archive_old_campaigns():
    """Archive old completed campaigns"""
    try:
        logger.info("Archiving old campaigns...")
        
        from app.database import get_db, CampaignDB
        
        # Archive campaigns older than 30 days
        archive_date = datetime.utcnow() - timedelta(days=30)
        
        db = next(get_db())
        old_campaigns = db.query(CampaignDB).filter(
            CampaignDB.status.in_(["completed", "failed"]),
            CampaignDB.updated_at < archive_date
        ).all()
        
        archived_count = 0
        
        for campaign in old_campaigns:
            # In production, move to archive storage
            # For now, just mark as archived
            campaign.status = "archived"
            archived_count += 1
        
        db.commit()
        db.close()
        
        logger.info(f"Archived {archived_count} old campaigns")
        return {"archived_count": archived_count}
        
    except Exception as e:
        logger.error(f"Error archiving campaigns: {e}")
        raise

@shared_task  
def generate_storage_report():
    """Generate storage usage report"""
    try:
        logger.info("Generating storage usage report...")
        
        # Calculate video storage usage
        video_dir = settings.video_output_path
        total_size = 0
        file_count = 0
        
        if os.path.exists(video_dir):
            for root, dirs, files in os.walk(video_dir):
                for file in files:
                    filepath = os.path.join(root, file)
                    try:
                        total_size += os.path.getsize(filepath)
                        file_count += 1
                    except OSError:
                        continue
        
        # Convert to MB
        total_size_mb = total_size / (1024 * 1024)
        
        report = {
            "timestamp": datetime.utcnow().isoformat(),
            "video_storage_mb": round(total_size_mb, 2),
            "total_files": file_count,
            "storage_path": video_dir
        }
        
        logger.info(f"Storage report: {report}")
        return report
        
    except Exception as e:
        logger.error(f"Error generating storage report: {e}")
        raise