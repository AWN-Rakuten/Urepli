import * as fs from 'fs';
import * as path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { createCanvas, loadImage } from 'canvas';
import sharp from 'sharp';

export interface VideoGenerationOptions {
  script: string;
  audioFile: string;
  targetPlatform: 'tiktok' | 'instagram' | 'youtube';
  visualStyle: 'minimal' | 'dynamic' | 'business';
  duration?: number;
}

export interface VideoOutput {
  videoPath: string;
  thumbnailPath: string;
  duration: number;
  resolution: { width: number; height: number };
  fileSize: number;
}

export class VideoGeneratorService {
  private readonly outputDir = 'generated_videos';
  private readonly tempDir = 'temp_assets';

  constructor() {
    // Ensure directories exist
    [this.outputDir, this.tempDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async generateVideo(options: VideoGenerationOptions): Promise<VideoOutput> {
    const { script, audioFile, targetPlatform, visualStyle } = options;
    
    // Get platform-specific dimensions
    const dimensions = this.getPlatformDimensions(targetPlatform);
    
    // Generate visual frames based on script
    const frames = await this.generateVisualFrames(script, visualStyle, dimensions);
    
    // Create video from frames and audio
    const videoPath = await this.assembleVideo(frames, audioFile, dimensions, targetPlatform);
    
    // Generate thumbnail
    const thumbnailPath = await this.generateThumbnail(videoPath);
    
    // Get video metadata
    const metadata = await this.getVideoMetadata(videoPath);
    
    return {
      videoPath,
      thumbnailPath,
      duration: metadata.duration,
      resolution: dimensions,
      fileSize: metadata.fileSize
    };
  }

  private getPlatformDimensions(platform: string): { width: number; height: number } {
    switch (platform) {
      case 'tiktok':
        return { width: 1080, height: 1920 }; // 9:16 vertical
      case 'instagram':
        return { width: 1080, height: 1920 }; // 9:16 for Reels
      case 'youtube':
        return { width: 1920, height: 1080 }; // 16:9 horizontal
      default:
        return { width: 1080, height: 1920 };
    }
  }

  private async generateVisualFrames(
    script: string, 
    style: string, 
    dimensions: { width: number; height: number }
  ): Promise<string[]> {
    const sentences = script.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const frames: string[] = [];
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim();
      if (!sentence) continue;
      
      const framePath = path.join(this.tempDir, `frame_${i}.png`);
      await this.createTextFrame(sentence, framePath, style, dimensions);
      frames.push(framePath);
    }
    
    return frames;
  }

  private async createTextFrame(
    text: string, 
    outputPath: string, 
    style: string, 
    dimensions: { width: number; height: number }
  ): Promise<void> {
    const canvas = createCanvas(dimensions.width, dimensions.height);
    const ctx = canvas.getContext('2d');
    
    // Set background based on style
    const bgColors = {
      minimal: '#FFFFFF',
      dynamic: '#000000',
      business: '#1A1A1A'
    };
    
    const textColors = {
      minimal: '#000000',
      dynamic: '#FFFFFF',
      business: '#FFFFFF'
    };
    
    // Fill background
    ctx.fillStyle = bgColors[style as keyof typeof bgColors] || bgColors.minimal;
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);
    
    // Configure text
    const fontSize = Math.min(dimensions.width / 15, 72);
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.fillStyle = textColors[style as keyof typeof textColors] || textColors.minimal;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Word wrap text
    const maxWidth = dimensions.width * 0.8;
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    
    // Draw text lines
    const lineHeight = fontSize * 1.2;
    const totalHeight = lines.length * lineHeight;
    const startY = (dimensions.height - totalHeight) / 2 + fontSize / 2;
    
    lines.forEach((line, index) => {
      ctx.fillText(line, dimensions.width / 2, startY + index * lineHeight);
    });
    
    // Add subtle visual elements for dynamic style
    if (style === 'dynamic') {
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 4;
      ctx.strokeRect(50, 50, dimensions.width - 100, dimensions.height - 100);
    }
    
    // Save frame
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
  }

  private async assembleVideo(
    frames: string[], 
    audioFile: string, 
    dimensions: { width: number; height: number },
    platform: string
  ): Promise<string> {
    const outputPath = path.join(this.outputDir, `video_${platform}_${Date.now()}.mp4`);
    
    return new Promise((resolve, reject) => {
      // Create frame list file for ffmpeg
      const frameListPath = path.join(this.tempDir, 'frames.txt');
      const frameList = frames.map(frame => `file '${path.resolve(frame)}'`).join('\n');
      fs.writeFileSync(frameListPath, frameList);
      
      const command = ffmpeg()
        .input(frameListPath)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .input(audioFile)
        .outputOptions([
          '-c:v', 'libx264',
          '-c:a', 'aac',
          '-pix_fmt', 'yuv420p',
          '-r', '1', // 1 frame per second (adjust based on audio duration)
          '-shortest', // End when shortest input ends
          `-s`, `${dimensions.width}x${dimensions.height}`
        ])
        .output(outputPath)
        .on('end', () => {
          // Cleanup temp files
          this.cleanupTempFiles([frameListPath, ...frames]);
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('FFmpeg error:', err);
          reject(err);
        })
        .run();
    });
  }

  private async generateThumbnail(videoPath: string): Promise<string> {
    const thumbnailPath = videoPath.replace('.mp4', '_thumbnail.jpg');
    
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: ['00:00:01'],
          filename: path.basename(thumbnailPath),
          folder: path.dirname(thumbnailPath),
          size: '1080x1920'
        })
        .on('end', () => resolve(thumbnailPath))
        .on('error', reject);
    });
  }

  private async getVideoMetadata(videoPath: string): Promise<{ duration: number; fileSize: number }> {
    const stats = fs.statSync(videoPath);
    
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }
        
        const duration = metadata.format.duration || 0;
        resolve({
          duration,
          fileSize: stats.size
        });
      });
    });
  }

  private cleanupTempFiles(files: string[]): void {
    files.forEach(file => {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      } catch (error) {
        console.warn(`Failed to cleanup temp file ${file}:`, error);
      }
    });
  }

  async getVideoInfo(videoPath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata);
      });
    });
  }
}