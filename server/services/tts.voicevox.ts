import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

interface TTSRequest {
  text: string;
  speaker?: number;
  speed?: number;
  pitch?: number;
  intonation?: number;
  volume?: number;
}

interface VoiceVoxVoice {
  id: number;
  name: string;
  styles: Array<{
    id: number;
    name: string;
  }>;
}

class TTSVoiceVoxService {
  private baseUrl: string;
  private defaultSpeaker: number = 1; // Default: Zundamon (Normal)

  constructor() {
    this.baseUrl = process.env.VOICEVOX_HOST || 'http://localhost:50021';
  }

  /**
   * Generate speech from text using VOICEVOX
   */
  async generateSpeech(request: TTSRequest): Promise<Buffer> {
    try {
      const { text, speaker = this.defaultSpeaker } = request;

      // First, get audio query
      const queryUrl = `${this.baseUrl}/audio_query?text=${encodeURIComponent(text)}&speaker=${speaker}`;
      const queryResponse = await fetch(queryUrl, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!queryResponse.ok) {
        throw new Error(`VOICEVOX query failed: ${queryResponse.status} ${queryResponse.statusText}`);
      }

      const audioQuery = await queryResponse.json();

      // Apply custom parameters if provided
      if (request.speed !== undefined) {
        audioQuery.speedScale = request.speed;
      }
      if (request.pitch !== undefined) {
        audioQuery.pitchScale = request.pitch;
      }
      if (request.intonation !== undefined) {
        audioQuery.intonationScale = request.intonation;
      }
      if (request.volume !== undefined) {
        audioQuery.volumeScale = request.volume;
      }

      // Generate synthesis
      const synthesisUrl = `${this.baseUrl}/synthesis?speaker=${speaker}`;
      const synthesisResponse = await fetch(synthesisUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(audioQuery)
      });

      if (!synthesisResponse.ok) {
        throw new Error(`VOICEVOX synthesis failed: ${synthesisResponse.status} ${synthesisResponse.statusText}`);
      }

      const audioBuffer = Buffer.from(await synthesisResponse.arrayBuffer());
      return audioBuffer;

    } catch (error) {
      console.error('TTS generation failed:', error);
      throw error;
    }
  }

  /**
   * Get available voices from VOICEVOX
   */
  async getAvailableVoices(): Promise<VoiceVoxVoice[]> {
    try {
      const response = await fetch(`${this.baseUrl}/speakers`);
      if (!response.ok) {
        throw new Error(`Failed to get speakers: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to get available voices:', error);
      return [];
    }
  }

  /**
   * Test VOICEVOX connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/version`);
      return response.ok;
    } catch (error) {
      console.error('VOICEVOX connection test failed:', error);
      return false;
    }
  }

  /**
   * Generate speech and save to file
   */
  async generateSpeechToFile(request: TTSRequest, outputPath: string): Promise<string> {
    const audioBuffer = await this.generateSpeech(request);
    
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write audio file
    fs.writeFileSync(outputPath, audioBuffer);
    return outputPath;
  }

  /**
   * Generate speech with timestamps for subtitle creation
   */
  async generateSpeechWithTimestamps(request: TTSRequest): Promise<{
    audio: Buffer;
    timestamps: Array<{ start: number; end: number; text: string }>;
  }> {
    // For now, just generate audio
    // TODO: Implement proper timestamp extraction from VOICEVOX
    const audio = await this.generateSpeech(request);
    
    // Estimate timestamps (rough approximation)
    const words = request.text.split(/[\s、。！？]/);
    const avgWordsPerSecond = 3; // Japanese speech rate
    const timestamps = words.map((word, index) => ({
      start: index / avgWordsPerSecond,
      end: (index + 1) / avgWordsPerSecond,
      text: word
    }));

    return { audio, timestamps };
  }

  /**
   * Batch generate multiple audio files
   */
  async batchGenerate(requests: Array<TTSRequest & { outputPath: string }>): Promise<string[]> {
    const results = await Promise.allSettled(
      requests.map(req => this.generateSpeechToFile(req, req.outputPath))
    );

    return results
      .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
      .map(result => result.value);
  }

  /**
   * Get recommended speaker for different content types
   */
  getRecommendedSpeaker(contentType: 'commercial' | 'educational' | 'entertainment' | 'news'): number {
    const speakers = {
      commercial: 3, // Zundamon (Tsundere) - energetic for ads
      educational: 1, // Zundamon (Normal) - clear and professional  
      entertainment: 8, // Hau (Normal) - friendly and engaging
      news: 1  // Zundamon (Normal) - authoritative
    };

    return speakers[contentType] || this.defaultSpeaker;
  }
}

// Alternative TTS providers
class PiperTTSService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.PIPER_HOST || 'http://localhost:50022';
  }

  async generateSpeech(text: string, voice: string = 'jp_female'): Promise<Buffer> {
    try {
      const response = await fetch(`${this.baseUrl}/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          voice,
          format: 'wav'
        })
      });

      if (!response.ok) {
        throw new Error(`Piper TTS failed: ${response.status}`);
      }

      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      console.error('Piper TTS generation failed:', error);
      throw error;
    }
  }
}

class CoquiTTSService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.COQUI_TTS_HOST || 'http://localhost:50023';
  }

  async generateSpeech(text: string, voice: string = 'jp_female'): Promise<Buffer> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          speaker_id: voice,
          language: 'ja'
        })
      });

      if (!response.ok) {
        throw new Error(`Coqui TTS failed: ${response.status}`);
      }

      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      console.error('Coqui TTS generation failed:', error);
      throw error;
    }
  }
}

// Unified TTS service that can use different providers
class UnifiedTTSService {
  private voicevox: TTSVoiceVoxService;
  private piper: PiperTTSService;
  private coqui: CoquiTTSService;
  private preferredProvider: 'voicevox' | 'piper' | 'coqui' = 'voicevox';

  constructor() {
    this.voicevox = new TTSVoiceVoxService();
    this.piper = new PiperTTSService();
    this.coqui = new CoquiTTSService();
  }

  async generateSpeech(text: string, options: {
    provider?: 'voicevox' | 'piper' | 'coqui';
    speaker?: number | string;
    speed?: number;
    pitch?: number;
  } = {}): Promise<Buffer> {
    const provider = options.provider || this.preferredProvider;

    try {
      switch (provider) {
        case 'voicevox':
          return await this.voicevox.generateSpeech({
            text,
            speaker: typeof options.speaker === 'number' ? options.speaker : 1,
            speed: options.speed,
            pitch: options.pitch
          });
        
        case 'piper':
          return await this.piper.generateSpeech(text, options.speaker as string);
        
        case 'coqui':
          return await this.coqui.generateSpeech(text, options.speaker as string);
        
        default:
          throw new Error(`Unsupported TTS provider: ${provider}`);
      }
    } catch (error) {
      console.error(`TTS generation failed with ${provider}:`, error);
      
      // Fallback to other providers
      if (provider !== 'voicevox') {
        console.log('Falling back to VOICEVOX...');
        return await this.voicevox.generateSpeech({ text });
      }
      
      throw error;
    }
  }

  async testAllProviders(): Promise<{ [provider: string]: boolean }> {
    const results = {
      voicevox: false,
      piper: false,
      coqui: false
    };

    try {
      results.voicevox = await this.voicevox.testConnection();
    } catch (e) {
      console.log('VOICEVOX not available');
    }

    try {
      await this.piper.generateSpeech('テスト');
      results.piper = true;
    } catch (e) {
      console.log('Piper not available');
    }

    try {
      await this.coqui.generateSpeech('テスト');
      results.coqui = true;
    } catch (e) {
      console.log('Coqui TTS not available');
    }

    return results;
  }
}

export const ttsService = new UnifiedTTSService();
export const voicevoxService = new TTSVoiceVoxService();
export { TTSVoiceVoxService, PiperTTSService, CoquiTTSService, UnifiedTTSService };