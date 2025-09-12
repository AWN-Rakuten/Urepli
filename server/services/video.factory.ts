import { ttsService } from './tts.voicevox';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';

interface VideoScript {
  text: string;
  duration?: number; // seconds
  scenes?: Array<{
    text: string;
    startTime: number;
    endTime: number;
    visualCue?: string;
  }>;
}

interface VideoFactoryRequest {
  script: VideoScript;
  voice: string; // 'jp_female_a', 'jp_male_b', etc.
  length: 15 | 30 | 45 | 60 | 90; // seconds
  style?: 'commercial' | 'educational' | 'entertainment';
  includeCaptions?: boolean;
  includeMusic?: boolean;
  templateId?: string;
}

interface VideoAssets {
  audioPath: string;
  videoPath: string;
  thumbnails: string[];
  srtPath?: string;
  duration: number;
}

interface ThumbnailVariant {
  path: string;
  style: 'minimal' | 'bold' | 'event';
  hasUrgencyBadge: boolean;
  eventType?: '5と0の日' | 'SPU' | 'セール';
}

class VideoFactoryService {
  private outputDir: string;
  private tempDir: string;

  constructor() {
    this.outputDir = process.env.VIDEO_OUTPUT_DIR || './uploads/videos';
    this.tempDir = process.env.VIDEO_TEMP_DIR || './temp/video';
    
    // Ensure directories exist
    [this.outputDir, this.tempDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Generate complete video from script
   */
  async generateVideo(request: VideoFactoryRequest): Promise<VideoAssets> {
    const videoId = this.generateVideoId();
    console.log(`Starting video generation: ${videoId}`);

    try {
      // 1. Generate voiceover
      console.log('Generating voiceover...');
      const audioPath = await this.generateVoiceover(request.script, request.voice, videoId);
      
      // 2. Get audio duration
      const duration = await this.getAudioDuration(audioPath);
      console.log(`Audio duration: ${duration}s`);

      // 3. Generate subtitles if requested
      let srtPath: string | undefined;
      if (request.includeCaptions) {
        srtPath = await this.generateSubtitles(request.script, duration, videoId);
      }

      // 4. Collect B-roll images/videos
      const bRollAssets = await this.collectBRollAssets(request.script, request.style || 'commercial');

      // 5. Generate video composition
      const videoPath = await this.composeVideo({
        audioPath,
        bRollAssets,
        duration,
        srtPath,
        style: request.style || 'commercial',
        videoId
      });

      // 6. Generate thumbnails
      const thumbnails = await this.generateThumbnails(request.script.text, videoId, request.style);

      return {
        audioPath,
        videoPath,
        thumbnails,
        srtPath,
        duration
      };

    } catch (error) {
      console.error(`Video generation failed for ${videoId}:`, error);
      throw error;
    }
  }

  /**
   * Generate voiceover using TTS
   */
  private async generateVoiceover(script: VideoScript, voice: string, videoId: string): Promise<string> {
    const audioPath = path.join(this.tempDir, `${videoId}_audio.wav`);
    
    // Map voice ID to TTS parameters
    const voiceConfig = this.getVoiceConfig(voice);
    
    const audioBuffer = await ttsService.generateSpeech(script.text, {
      provider: 'voicevox',
      speaker: voiceConfig.speakerId,
      speed: voiceConfig.speed,
      pitch: voiceConfig.pitch
    });

    fs.writeFileSync(audioPath, audioBuffer);
    return audioPath;
  }

  /**
   * Get voice configuration
   */
  private getVoiceConfig(voice: string) {
    const configs = {
      'jp_female_a': { speakerId: 1, speed: 1.0, pitch: 1.0 }, // Zundamon Normal
      'jp_female_b': { speakerId: 8, speed: 1.1, pitch: 1.05 }, // Hau Normal
      'jp_male_a': { speakerId: 11, speed: 0.95, pitch: 0.9 }, // Ryusei Normal
      'jp_commercial': { speakerId: 3, speed: 1.2, pitch: 1.1 } // Zundamon Tsundere (energetic)
    };

    return configs[voice] || configs['jp_female_a'];
  }

  /**
   * Get audio duration using FFmpeg
   */
  private async getAudioDuration(audioPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(audioPath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          const duration = metadata.format.duration || 0;
          resolve(duration);
        }
      });
    });
  }

  /**
   * Generate SRT subtitle file
   */
  private async generateSubtitles(script: VideoScript, duration: number, videoId: string): Promise<string> {
    const srtPath = path.join(this.outputDir, `${videoId}.srt`);
    
    // If script has scenes with timestamps, use those
    if (script.scenes && script.scenes.length > 0) {
      const srtContent = script.scenes.map((scene, index) => {
        const startTime = this.formatSRTTime(scene.startTime);
        const endTime = this.formatSRTTime(scene.endTime);
        return `${index + 1}\n${startTime} --> ${endTime}\n${scene.text}\n`;
      }).join('\n');
      
      fs.writeFileSync(srtPath, srtContent);
    } else {
      // Generate approximate timestamps
      const words = script.text.split(/[\s、。！？]/);
      const avgWordsPerSecond = 3;
      const wordDuration = duration / words.length;
      
      const srtContent = words.map((word, index) => {
        const startTime = this.formatSRTTime(index * wordDuration);
        const endTime = this.formatSRTTime((index + 1) * wordDuration);
        return `${index + 1}\n${startTime} --> ${endTime}\n${word}\n`;
      }).join('\n');
      
      fs.writeFileSync(srtPath, srtContent);
    }

    return srtPath;
  }

  /**
   * Format time for SRT subtitles
   */
  private formatSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
  }

  /**
   * Collect B-roll assets (images, video clips)
   */
  private async collectBRollAssets(script: VideoScript, style: string): Promise<string[]> {
    // TODO: Integrate with ComfyUI or external asset sources
    // For now, return placeholder assets based on style
    
    const assetDir = path.join(process.cwd(), 'assets', 'video-templates', style);
    const defaultAssets = [
      './assets/video/default-background.mp4',
      './assets/images/default-product.jpg'
    ];

    // Check if custom assets exist
    if (fs.existsSync(assetDir)) {
      const files = fs.readdirSync(assetDir);
      return files
        .filter(file => /\.(mp4|mov|jpg|png)$/i.test(file))
        .map(file => path.join(assetDir, file));
    }

    return defaultAssets;
  }

  /**
   * Compose final video using FFmpeg
   */
  private async composeVideo(options: {
    audioPath: string;
    bRollAssets: string[];
    duration: number;
    srtPath?: string;
    style: string;
    videoId: string;
  }): Promise<string> {
    const outputPath = path.join(this.outputDir, `${options.videoId}.mp4`);

    return new Promise((resolve, reject) => {
      let command = ffmpeg();

      // Add background video or images
      if (options.bRollAssets.length > 0) {
        const firstAsset = options.bRollAssets[0];
        command = command.input(firstAsset);
        
        // If it's an image, create a video from it
        if (/\.(jpg|png)$/i.test(firstAsset)) {
          command = command.inputOptions([
            '-loop 1',
            `-t ${options.duration}`
          ]);
        }
      }

      // Add audio
      command = command.input(options.audioPath);

      // Apply video filters and settings
      command = command
        .videoCodec('libx264')
        .audioCodec('aac')
        .size('1080x1920') // Vertical format for Shorts/TikTok
        .fps(30)
        .videoBitrate('2M')
        .audioBitrate('128k');

      // Add subtitles if provided
      if (options.srtPath) {
        command = command.videoFilters([
          `subtitles=${options.srtPath}:force_style='FontName=NotoSansCJK-Regular,FontSize=24,PrimaryColour=&Hffffff,OutlineColour=&H000000,Outline=2'`
        ]);
      }

      // Apply style-specific filters
      command = this.applyStyleFilters(command, options.style);

      command
        .output(outputPath)
        .on('end', () => {
          console.log(`Video composition completed: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('Video composition failed:', err);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Apply style-specific video filters
   */
  private applyStyleFilters(command: any, style: string) {
    switch (style) {
      case 'commercial':
        return command.videoFilters([
          'eq=contrast=1.2:brightness=0.1:saturation=1.3', // Enhance colors
          'unsharp=5:5:1.0:5:5:0.0' // Sharpen
        ]);
      
      case 'educational':
        return command.videoFilters([
          'eq=contrast=1.1:brightness=0.05'
        ]);
      
      case 'entertainment':
        return command.videoFilters([
          'eq=contrast=1.3:saturation=1.4', // Vibrant colors
          'hue=h=10' // Slight hue shift
        ]);
      
      default:
        return command;
    }
  }

  /**
   * Generate thumbnail variants
   */
  private async generateThumbnails(scriptText: string, videoId: string, style?: string): Promise<string[]> {
    // TODO: Integrate with ComfyUI for thumbnail generation
    // For now, create placeholder thumbnails
    
    const thumbnails: string[] = [];
    const styles = ['minimal', 'bold', 'event'];
    
    for (const thumbnailStyle of styles) {
      const thumbnailPath = path.join(this.outputDir, `${videoId}_thumb_${thumbnailStyle}.jpg`);
      
      // Generate placeholder thumbnail (in production, would use ComfyUI)
      await this.generatePlaceholderThumbnail(scriptText, thumbnailPath, thumbnailStyle);
      thumbnails.push(thumbnailPath);
    }

    return thumbnails;
  }

  /**
   * Generate placeholder thumbnail
   */
  private async generatePlaceholderThumbnail(text: string, outputPath: string, style: string): Promise<void> {
    // Create a simple colored rectangle as placeholder
    // In production, this would call ComfyUI or another image generation service
    
    const width = 1280;
    const height = 720;
    const colors = {
      minimal: '#f8f9fa',
      bold: '#ff6b6b',
      event: '#ffd43b'
    };

    // Use FFmpeg to create a simple colored image with text
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(`color=c=${colors[style] || colors.minimal}:size=${width}x${height}:duration=1`)
        .inputOptions(['-f', 'lavfi'])
        .videoFilters([
          `drawtext=text='${text.substring(0, 30)}':fontcolor=black:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2`
        ])
        .frames(1)
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });
  }

  /**
   * Generate video ID
   */
  private generateVideoId(): string {
    return `vid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate multiple video variants for A/B testing
   */
  async generateVariants(baseRequest: VideoFactoryRequest, count: number = 3): Promise<VideoAssets[]> {
    const variants = await Promise.all(
      Array.from({ length: count }, (_, index) => {
        const variantRequest = {
          ...baseRequest,
          voice: this.getVoiceVariant(baseRequest.voice, index),
          style: this.getStyleVariant(baseRequest.style || 'commercial', index)
        };
        return this.generateVideo(variantRequest);
      })
    );

    return variants;
  }

  private getVoiceVariant(baseVoice: string, index: number): string {
    const voices = ['jp_female_a', 'jp_female_b', 'jp_male_a'];
    return voices[index % voices.length];
  }

  private getStyleVariant(baseStyle: string, index: number): 'commercial' | 'educational' | 'entertainment' {
    const styles: Array<'commercial' | 'educational' | 'entertainment'> = ['commercial', 'educational', 'entertainment'];
    return styles[index % styles.length];
  }

  /**
   * Clean up temporary files
   */
  async cleanup(videoId?: string): Promise<void> {
    try {
      if (videoId) {
        // Clean specific video files
        const pattern = new RegExp(`${videoId}.*\.(wav|mp4|srt|jpg)$`);
        const files = fs.readdirSync(this.tempDir);
        
        for (const file of files) {
          if (pattern.test(file)) {
            fs.unlinkSync(path.join(this.tempDir, file));
          }
        }
      } else {
        // Clean all temp files older than 1 hour
        const files = fs.readdirSync(this.tempDir);
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        
        for (const file of files) {
          const filePath = path.join(this.tempDir, file);
          const stats = fs.statSync(filePath);
          
          if (stats.mtime.getTime() < oneHourAgo) {
            fs.unlinkSync(filePath);
          }
        }
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
}

export const videoFactory = new VideoFactoryService();
export { VideoFactoryService, VideoFactoryRequest, VideoAssets };