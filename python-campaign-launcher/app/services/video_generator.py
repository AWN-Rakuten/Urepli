import logging
import os
import asyncio
import uuid
from typing import Optional, Dict, Any
from datetime import datetime
import json

import google.generativeai as genai
from moviepy.editor import VideoFileClip, TextClip, CompositeVideoClip, ColorClip
from moviepy.config import check_for_imagemagick
import numpy as np
from PIL import Image
import requests

from app.models import VideoStyle, VideoGenerationTask
from app.config import settings
from app.database import get_db, VideoTaskDB

logger = logging.getLogger(__name__)

class VideoGeneratorService:
    def __init__(self):
        self.setup_ai_clients()
        self.ensure_output_directory()
        
    def setup_ai_clients(self):
        """Setup AI service clients"""
        if settings.gemini_api_key:
            genai.configure(api_key=settings.gemini_api_key)
            self.gemini_model = genai.GenerativeModel('gemini-pro')
        else:
            logger.warning("Gemini API key not configured")
            self.gemini_model = None
    
    def ensure_output_directory(self):
        """Ensure video output directory exists"""
        os.makedirs(settings.video_output_path, exist_ok=True)
    
    async def generate_video_async(
        self, 
        prompt: str, 
        style: str = "anime", 
        duration: int = 15
    ) -> str:
        """Start asynchronous video generation"""
        task_id = str(uuid.uuid4())
        
        # Save task to database
        db = next(get_db())
        video_task = VideoTaskDB(
            id=task_id,
            status="pending",
            prompt=prompt,
            style=style,
            duration=duration
        )
        db.add(video_task)
        db.commit()
        db.close()
        
        # Start background task
        asyncio.create_task(self._generate_video_background(task_id))
        
        return task_id
    
    async def _generate_video_background(self, task_id: str):
        """Background task for video generation"""
        try:
            # Update status to processing
            await self._update_task_status(task_id, "processing")
            
            # Get task details
            db = next(get_db())
            task = db.query(VideoTaskDB).filter(VideoTaskDB.id == task_id).first()
            db.close()
            
            if not task:
                return
            
            # Generate video
            video_url = await self.generate_video(
                prompt=task.prompt,
                style=VideoStyle(task.style),
                duration=task.duration
            )
            
            if video_url:
                await self._update_task_status(task_id, "completed", video_url=video_url)
            else:
                await self._update_task_status(task_id, "failed", error="Video generation failed")
                
        except Exception as e:
            logger.error(f"Error in background video generation: {e}")
            await self._update_task_status(task_id, "failed", error=str(e))
    
    async def _update_task_status(
        self, 
        task_id: str, 
        status: str, 
        video_url: Optional[str] = None,
        error: Optional[str] = None
    ):
        """Update task status in database"""
        db = next(get_db())
        task = db.query(VideoTaskDB).filter(VideoTaskDB.id == task_id).first()
        if task:
            task.status = status
            if video_url:
                task.video_url = video_url
            if error:
                task.error_message = error
            if status in ["completed", "failed"]:
                task.completed_at = datetime.utcnow()
            db.commit()
        db.close()
    
    async def get_generation_status(self, task_id: str) -> Dict[str, Any]:
        """Get video generation task status"""
        db = next(get_db())
        task = db.query(VideoTaskDB).filter(VideoTaskDB.id == task_id).first()
        db.close()
        
        if not task:
            return {"error": "Task not found"}
        
        return {
            "id": task.id,
            "status": task.status,
            "video_url": task.video_url,
            "error_message": task.error_message,
            "created_at": task.created_at.isoformat() if task.created_at else None,
            "completed_at": task.completed_at.isoformat() if task.completed_at else None
        }
    
    async def generate_video(
        self,
        prompt: str,
        style: VideoStyle = VideoStyle.ANIME,
        duration: int = 15,
        japanese_optimized: bool = True
    ) -> Optional[str]:
        """Generate a video using AI and moviepy"""
        try:
            # Step 1: Generate script and scene descriptions using Gemini
            script_data = await self._generate_script(prompt, duration, japanese_optimized)
            
            # Step 2: Generate visual elements (using placeholder for now, can integrate SDXL/ComfyUI)
            visual_elements = await self._generate_visual_elements(script_data, style)
            
            # Step 3: Create video using moviepy
            video_path = await self._create_video_with_moviepy(
                script_data, visual_elements, duration
            )
            
            # Step 4: Upload to storage and return URL
            if video_path:
                video_url = await self._upload_video(video_path)
                return video_url
            
            return None
            
        except Exception as e:
            logger.error(f"Error generating video: {e}")
            return None
    
    async def _generate_script(
        self, 
        prompt: str, 
        duration: int, 
        japanese_optimized: bool
    ) -> Dict[str, Any]:
        """Generate video script using Gemini"""
        if not self.gemini_model:
            # Fallback script generation
            return self._generate_fallback_script(prompt, duration)
        
        try:
            system_prompt = f"""
            Create a detailed video script for a {duration}-second social media video.
            Original prompt: {prompt}
            
            {"Focus on Japanese aesthetics, culture, and humor." if japanese_optimized else ""}
            
            Return a JSON object with:
            - title: Short catchy title
            - scenes: Array of scenes with timing, description, and text overlay
            - background_music_mood: Mood for background music
            - voice_over_text: Japanese text for voice over (if applicable)
            - subtitles: Array of subtitle timing and text
            
            Make it engaging for short-form vertical video content.
            """
            
            response = self.gemini_model.generate_content(system_prompt)
            
            # Parse JSON response
            try:
                script_data = json.loads(response.text)
                return script_data
            except json.JSONDecodeError:
                logger.warning("Could not parse Gemini response as JSON, using fallback")
                return self._generate_fallback_script(prompt, duration)
                
        except Exception as e:
            logger.error(f"Error with Gemini script generation: {e}")
            return self._generate_fallback_script(prompt, duration)
    
    def _generate_fallback_script(self, prompt: str, duration: int) -> Dict[str, Any]:
        """Generate fallback script when AI is unavailable"""
        scenes_count = max(1, duration // 5)  # One scene per 5 seconds
        
        return {
            "title": "AI Generated Video",
            "scenes": [
                {
                    "start_time": i * (duration / scenes_count),
                    "duration": duration / scenes_count,
                    "description": f"{prompt} - Scene {i+1}",
                    "text_overlay": f"シーン {i+1}"
                }
                for i in range(scenes_count)
            ],
            "background_music_mood": "upbeat",
            "voice_over_text": prompt,
            "subtitles": [
                {
                    "start_time": 0,
                    "duration": duration,
                    "text": prompt
                }
            ]
        }
    
    async def _generate_visual_elements(
        self, 
        script_data: Dict[str, Any], 
        style: VideoStyle
    ) -> Dict[str, Any]:
        """Generate visual elements (placeholder - can integrate with SDXL/ComfyUI)"""
        # For now, create colored backgrounds and simple shapes
        # In production, this would call image generation APIs
        
        visual_elements = {
            "backgrounds": [],
            "overlays": [],
            "style_config": {
                "color_palette": self._get_style_colors(style),
                "font_family": "Noto Sans CJK JP" if style == VideoStyle.ANIME else "Arial"
            }
        }
        
        # Generate background colors for each scene
        colors = visual_elements["style_config"]["color_palette"]
        for i, scene in enumerate(script_data.get("scenes", [])):
            color = colors[i % len(colors)]
            visual_elements["backgrounds"].append({
                "scene_index": i,
                "type": "color",
                "color": color,
                "duration": scene.get("duration", 5)
            })
        
        return visual_elements
    
    def _get_style_colors(self, style: VideoStyle) -> list:
        """Get color palette for video style"""
        palettes = {
            VideoStyle.ANIME: ["#FF6B9D", "#F7A2C7", "#FFE0E5", "#87CEEB"],
            VideoStyle.REALISTIC: ["#2C3E50", "#34495E", "#7F8C8D", "#BDC3C7"],
            VideoStyle.CARTOON: ["#FF8C00", "#FFD700", "#98FB98", "#87CEFA"],
            VideoStyle.MINIMALIST: ["#FFFFFF", "#F8F9FA", "#E9ECEF", "#DEE2E6"]
        }
        return palettes.get(style, palettes[VideoStyle.ANIME])
    
    async def _create_video_with_moviepy(
        self,
        script_data: Dict[str, Any],
        visual_elements: Dict[str, Any],
        duration: int
    ) -> Optional[str]:
        """Create video using moviepy"""
        try:
            clips = []
            
            # Create background clips for each scene
            for i, scene in enumerate(script_data.get("scenes", [])):
                scene_duration = scene.get("duration", 5)
                
                # Get background color
                bg_color = visual_elements["backgrounds"][i]["color"] if i < len(visual_elements["backgrounds"]) else "#FF6B9D"
                
                # Create colored background
                bg_clip = ColorClip(
                    size=(720, 1280),  # 9:16 aspect ratio
                    color=bg_color,
                    duration=scene_duration
                ).set_start(scene.get("start_time", 0))
                
                clips.append(bg_clip)
                
                # Add text overlay if available
                text_overlay = scene.get("text_overlay", "")
                if text_overlay:
                    try:
                        text_clip = TextClip(
                            text_overlay,
                            fontsize=50,
                            color='white',
                            font='Arial-Bold',
                            size=(640, None)
                        ).set_position('center').set_duration(scene_duration).set_start(scene.get("start_time", 0))
                        
                        clips.append(text_clip)
                    except Exception as e:
                        logger.warning(f"Could not create text clip: {e}")
            
            # Add subtitles
            for subtitle in script_data.get("subtitles", []):
                try:
                    subtitle_clip = TextClip(
                        subtitle["text"],
                        fontsize=40,
                        color='white',
                        font='Arial-Bold',
                        size=(640, None)
                    ).set_position(('center', 'bottom')).set_duration(
                        subtitle["duration"]
                    ).set_start(subtitle["start_time"])
                    
                    clips.append(subtitle_clip)
                except Exception as e:
                    logger.warning(f"Could not create subtitle clip: {e}")
            
            if not clips:
                logger.error("No clips created")
                return None
            
            # Composite all clips
            final_video = CompositeVideoClip(clips, size=(720, 1280))
            
            # Set final duration
            final_video = final_video.set_duration(duration)
            
            # Generate output filename
            output_filename = f"video_{uuid.uuid4().hex[:8]}.mp4"
            output_path = os.path.join(settings.video_output_path, output_filename)
            
            # Write video file
            final_video.write_videofile(
                output_path,
                fps=30,
                codec='libx264',
                audio_codec='aac',
                temp_audiofile='temp-audio.m4a',
                remove_temp=True,
                verbose=False,
                logger=None
            )
            
            # Clean up
            final_video.close()
            for clip in clips:
                if hasattr(clip, 'close'):
                    clip.close()
            
            logger.info(f"Video created successfully: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Error creating video with moviepy: {e}")
            return None
    
    async def _upload_video(self, video_path: str) -> Optional[str]:
        """Upload video to storage and return URL"""
        try:
            # For now, return local file path
            # In production, upload to S3 or similar storage
            filename = os.path.basename(video_path)
            
            # Simulate upload delay
            await asyncio.sleep(1)
            
            # Return public URL (in production this would be actual S3 URL)
            public_url = f"http://localhost:8000/static/videos/{filename}"
            
            logger.info(f"Video uploaded: {public_url}")
            return public_url
            
        except Exception as e:
            logger.error(f"Error uploading video: {e}")
            return None