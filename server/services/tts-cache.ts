import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

export interface TTSRequest {
  text: string;
  voice: string;
  audioFormat: 'mp3' | 'wav';
  speed: number;
  pitch: number;
}

export interface CachedAudio {
  filePath: string;
  cacheKey: string;
  createdAt: Date;
}

export class TTSCacheService {
  private client: TextToSpeechClient;
  private cacheDir: string = 'audio_cache';
  private phraseBank: Map<string, string> = new Map();

  constructor() {
    this.client = new TextToSpeechClient();
    this.initializeCacheDir();
    this.initializePhraseBank();
  }

  private initializeCacheDir(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private initializePhraseBank(): void {
    // Pre-cache common Japanese phrases for content automation
    const commonPhrases = [
      '詳細はプロフィールへ',
      '#PR #広告',
      '期間限定',
      '今月限定',
      '今週限定',
      '注意点をチェック',
      'お得情報',
      '申込条件あり',
      '詳細確認をお忘れなく',
      'チェック推奨',
      '最新情報',
      '出典：',
      'おすすめ',
      'トレンド',
      '節約',
      'ポイント還元',
      '限定特典',
      'キャンペーン中'
    ];

    commonPhrases.forEach(phrase => {
      const key = this.generateCacheKey(phrase, 'ja-JP-Wavenet-F');
      this.phraseBank.set(key, phrase);
    });

    console.log(`Initialized phrase bank with ${commonPhrases.length} common phrases`);
  }

  private generateCacheKey(text: string, voice: string, speed: number = 1.0, pitch: number = 0): string {
    const content = `${text}|${voice}|${speed}|${pitch}`;
    return crypto.createHash('sha1').update(content, 'utf8').digest('hex');
  }

  private getCacheFilePath(cacheKey: string, format: string): string {
    return path.join(this.cacheDir, `${cacheKey}.${format}`);
  }

  async generateSpeech(request: TTSRequest): Promise<string> {
    const { text, voice, audioFormat, speed, pitch } = request;
    const cacheKey = this.generateCacheKey(text, voice, speed, pitch);
    const cacheFilePath = this.getCacheFilePath(cacheKey, audioFormat);

    // Check if already cached
    if (fs.existsSync(cacheFilePath)) {
      console.log(`TTS cache hit: ${cacheKey}`);
      return cacheFilePath;
    }

    console.log(`TTS cache miss, generating: ${text.substring(0, 50)}...`);

    try {
      // Configure the request
      const ttsRequest = {
        input: { text },
        voice: {
          languageCode: 'ja-JP',
          name: voice,
        },
        audioConfig: {
          audioEncoding: audioFormat === 'mp3' ? 'MP3' : 'LINEAR16',
          speakingRate: speed,
          pitch: pitch,
        },
      };

      // Perform the text-to-speech request
      const [response] = await this.client.synthesizeSpeech(ttsRequest as any);
      
      if (!response.audioContent) {
        throw new Error('No audio content received from TTS API');
      }

      // Write the binary audio content to cache file
      fs.writeFileSync(cacheFilePath, response.audioContent, 'binary');
      
      console.log(`TTS cached: ${cacheKey} -> ${cacheFilePath}`);
      return cacheFilePath;

    } catch (error) {
      console.error('TTS generation failed:', error);
      throw new Error(`Failed to generate speech: ${error}`);
    }
  }

  async generateBatchSpeech(requests: TTSRequest[]): Promise<string[]> {
    // Process requests in batches to optimize API usage
    const batchSize = 10;
    const results: string[] = [];

    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchPromises = batch.map(request => this.generateSpeech(request));
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(`Batch TTS failed for request ${i + index}:`, result.reason);
          results.push(''); // Empty path for failed requests
        }
      });
    }

    return results;
  }

  async preCacheCommonPhrases(): Promise<void> {
    console.log('Pre-caching common phrases...');
    
    const requests: TTSRequest[] = Array.from(this.phraseBank.values()).map(phrase => ({
      text: phrase,
      voice: 'ja-JP-Wavenet-F',
      audioFormat: 'mp3' as const,
      speed: 1.0,
      pitch: 0
    }));

    const results = await this.generateBatchSpeech(requests);
    const successCount = results.filter(path => path !== '').length;
    
    console.log(`Pre-cached ${successCount}/${requests.length} common phrases`);
  }

  getCacheStats(): any {
    const files = fs.readdirSync(this.cacheDir);
    const totalFiles = files.length;
    let totalSize = 0;

    files.forEach(file => {
      const filePath = path.join(this.cacheDir, file);
      const stats = fs.statSync(filePath);
      totalSize += stats.size;
    });

    return {
      totalFiles,
      totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
      phraseBankSize: this.phraseBank.size,
      cacheDir: this.cacheDir
    };
  }

  clearCache(): void {
    const files = fs.readdirSync(this.cacheDir);
    files.forEach(file => {
      fs.unlinkSync(path.join(this.cacheDir, file));
    });
    console.log(`Cleared ${files.length} cached audio files`);
  }

  async splitAndCache(longText: string, maxChunkLength: number = 200): Promise<string[]> {
    // Split long text into chunks for efficient caching and processing
    const sentences = longText.split(/[。！？\n]/).filter(s => s.trim().length > 0);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (!trimmed) continue;

      if (currentChunk.length + trimmed.length + 1 <= maxChunkLength) {
        currentChunk += (currentChunk ? '。' : '') + trimmed;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk + '。');
        }
        currentChunk = trimmed;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk + '。');
    }

    // Generate audio for each chunk
    const requests: TTSRequest[] = chunks.map(chunk => ({
      text: chunk,
      voice: 'ja-JP-Wavenet-F',
      audioFormat: 'mp3' as const,
      speed: 1.0,
      pitch: 0
    }));

    return await this.generateBatchSpeech(requests);
  }
}