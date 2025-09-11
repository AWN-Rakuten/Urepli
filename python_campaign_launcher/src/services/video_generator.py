from moviepy.editor import *
import os
import tempfile
from typing import Dict, Any, Optional
from gtts import gTTS
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from ..core.config import settings


class VideoGenerator:
    """Generate videos using moviepy and open-source tools"""
    
    def __init__(self):
        self.temp_dir = tempfile.mkdtemp()
        
    async def generate_video(
        self, 
        script: Dict[str, Any], 
        background_images: list = None,
        output_path: str = None
    ) -> Dict[str, str]:
        """Generate a video from script content"""
        
        try:
            # Generate audio from script
            audio_file = await self._generate_audio(script)
            
            # Generate video visuals
            video_file = await self._generate_visuals(script, audio_file, background_images)
            
            # Add captions/subtitles
            final_video = await self._add_captions(video_file, script)
            
            return {
                'video_url': final_video,
                'audio_url': audio_file,
                'duration': script.get('estimated_duration', 30)
            }
            
        except Exception as e:
            print(f"Error generating video: {e}")
            return await self._generate_fallback_video(script)
    
    async def _generate_audio(self, script: Dict[str, Any]) -> str:
        """Generate audio from script text using gTTS"""
        
        # Combine script parts into full text
        full_text = self._build_full_script(script)
        
        audio_file = os.path.join(self.temp_dir, f"audio_{script.get('id', 'temp')}.mp3")
        
        try:
            tts = gTTS(text=full_text, lang='ja', slow=False)
            tts.save(audio_file)
            return audio_file
        except Exception as e:
            print(f"Error generating TTS audio: {e}")
            # Create silent audio as fallback
            silence = AudioFileClip(duration=script.get('estimated_duration', 30))
            silence.write_audiofile(audio_file)
            return audio_file
    
    async def _generate_visuals(
        self, 
        script: Dict[str, Any], 
        audio_file: str,
        background_images: list = None
    ) -> str:
        """Generate video visuals"""
        
        video_file = os.path.join(self.temp_dir, f"video_{script.get('id', 'temp')}.mp4")
        
        try:
            # Load audio to get duration
            audio = AudioFileClip(audio_file)
            duration = audio.duration
            
            # Create background video
            if background_images:
                clips = []
                clip_duration = duration / len(background_images)
                
                for img_path in background_images:
                    try:
                        img_clip = ImageClip(img_path, duration=clip_duration)
                        img_clip = img_clip.resize((1080, 1920))  # 9:16 aspect ratio
                        clips.append(img_clip)
                    except:
                        # Fallback to colored background
                        clips.append(self._create_colored_background(clip_duration))
                
                background = concatenate_videoclips(clips)
            else:
                # Create gradient background
                background = self._create_gradient_background(duration)
            
            # Add audio to video
            final_clip = background.set_audio(audio)
            
            # Write final video
            final_clip.write_videofile(
                video_file,
                fps=30,
                codec='libx264',
                audio_codec='aac'
            )
            
            # Clean up
            audio.close()
            final_clip.close()
            
            return video_file
            
        except Exception as e:
            print(f"Error generating video visuals: {e}")
            return await self._create_simple_video(script, audio_file)
    
    async def _add_captions(self, video_file: str, script: Dict[str, Any]) -> str:
        """Add captions to video"""
        
        captioned_video = os.path.join(self.temp_dir, f"final_{script.get('id', 'temp')}.mp4")
        
        try:
            # Load video
            video = VideoFileClip(video_file)
            duration = video.duration
            
            # Create caption clips for each part of the script
            caption_clips = []
            
            # Add hook caption (first 3 seconds)
            if script.get('hook'):
                hook_caption = self._create_text_clip(
                    script['hook'], 
                    start=0, 
                    duration=min(3, duration/4),
                    position='center'
                )
                caption_clips.append(hook_caption)
            
            # Add bullet points (middle section)
            bullets = script.get('bullets', [])
            if bullets:
                bullet_duration = (duration * 0.6) / len(bullets)
                start_time = duration * 0.25
                
                for i, bullet in enumerate(bullets):
                    bullet_caption = self._create_text_clip(
                        f"{i+1}. {bullet}",
                        start=start_time + (i * bullet_duration),
                        duration=bullet_duration,
                        position='bottom'
                    )
                    caption_clips.append(bullet_caption)
            
            # Add CTA caption (last section)
            if script.get('cta'):
                cta_caption = self._create_text_clip(
                    script['cta'],
                    start=duration * 0.85,
                    duration=duration * 0.15,
                    position='center'
                )
                caption_clips.append(cta_caption)
            
            # Composite all clips
            final_video = CompositeVideoClip([video] + caption_clips)
            
            # Write final video
            final_video.write_videofile(
                captioned_video,
                fps=30,
                codec='libx264',
                audio_codec='aac'
            )
            
            # Clean up
            video.close()
            final_video.close()
            
            return captioned_video
            
        except Exception as e:
            print(f"Error adding captions: {e}")
            return video_file  # Return original video if captioning fails
    
    def _create_text_clip(self, text: str, start: float, duration: float, position: str) -> TextClip:
        """Create a text clip for captions"""
        
        return TextClip(
            text,
            fontsize=50,
            color='white',
            stroke_color='black',
            stroke_width=2,
            font='Arial'
        ).set_position(position).set_start(start).set_duration(duration)
    
    def _create_gradient_background(self, duration: float) -> VideoClip:
        """Create a gradient background video"""
        
        def make_frame(t):
            # Create gradient effect that changes over time
            height, width = 1920, 1080
            gradient = np.zeros((height, width, 3), dtype=np.uint8)
            
            # Simple vertical gradient with time-based color shift
            for y in range(height):
                intensity = y / height
                color_shift = (t / duration) * 255
                gradient[y, :] = [
                    int(intensity * 150 + color_shift) % 255,
                    int(intensity * 100 + color_shift * 0.7) % 255,
                    int(intensity * 200 + color_shift * 0.3) % 255
                ]
            
            return gradient
        
        return VideoClip(make_frame, duration=duration).set_fps(30)
    
    def _create_colored_background(self, duration: float, color: tuple = (100, 150, 200)) -> ColorClip:
        """Create a solid colored background"""
        return ColorClip(size=(1080, 1920), color=color, duration=duration)
    
    async def _create_simple_video(self, script: Dict[str, Any], audio_file: str) -> str:
        """Create a simple video with text and audio as fallback"""
        
        video_file = os.path.join(self.temp_dir, f"simple_{script.get('id', 'temp')}.mp4")
        
        try:
            # Load audio
            audio = AudioFileClip(audio_file)
            duration = audio.duration
            
            # Create simple background with script text
            background = self._create_colored_background(duration)
            
            # Add main text
            if script.get('hook'):
                text_clip = TextClip(
                    script['hook'],
                    fontsize=70,
                    color='white',
                    font='Arial'
                ).set_position('center').set_duration(duration)
                
                video = CompositeVideoClip([background, text_clip])
            else:
                video = background
            
            # Add audio
            final_video = video.set_audio(audio)
            
            # Write video
            final_video.write_videofile(
                video_file,
                fps=24,
                codec='libx264',
                audio_codec='aac'
            )
            
            # Clean up
            audio.close()
            final_video.close()
            
            return video_file
            
        except Exception as e:
            print(f"Error creating simple video: {e}")
            raise
    
    async def _generate_fallback_video(self, script: Dict[str, Any]) -> Dict[str, str]:
        """Generate a basic fallback video"""
        
        try:
            # Create a simple text-based video
            duration = script.get('estimated_duration', 30)
            video_file = os.path.join(self.temp_dir, f"fallback_{script.get('id', 'temp')}.mp4")
            
            # Create simple video with text
            text = script.get('hook', 'Campaign Video')
            background = self._create_colored_background(duration)
            text_clip = TextClip(
                text,
                fontsize=60,
                color='white',
                font='Arial'
            ).set_position('center').set_duration(duration)
            
            video = CompositeVideoClip([background, text_clip])
            video.write_videofile(video_file, fps=24)
            video.close()
            
            return {
                'video_url': video_file,
                'audio_url': None,
                'duration': duration
            }
            
        except Exception as e:
            print(f"Error generating fallback video: {e}")
            raise
    
    def _build_full_script(self, script: Dict[str, Any]) -> str:
        """Build full script text for TTS"""
        
        parts = []
        
        if script.get('hook'):
            parts.append(script['hook'])
        
        if script.get('bullets'):
            for i, bullet in enumerate(script['bullets'], 1):
                parts.append(f"{i}つ目、{bullet}")
        
        if script.get('twist'):
            parts.append(script['twist'])
        
        if script.get('cta'):
            parts.append(script['cta'])
        
        return '。 '.join(parts) + '。'
    
    def cleanup(self):
        """Clean up temporary files"""
        try:
            import shutil
            shutil.rmtree(self.temp_dir)
        except:
            pass