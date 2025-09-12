import { Router } from 'express';
import { videoFactory } from '../services/video.factory.js';
import { ttsService } from '../services/tts.voicevox.js';
import { z } from 'zod';

const router = Router();

// Input validation schemas
const generateVideoSchema = z.object({
  script: z.object({
    text: z.string().min(1, 'Script text is required'),
    duration: z.number().optional(),
    scenes: z.array(z.object({
      text: z.string(),
      startTime: z.number(),
      endTime: z.number(),
      visualCue: z.string().optional()
    })).optional()
  }),
  voice: z.string().default('jp_female_a'),
  length: z.enum([15, 30, 45, 60, 90]).default(30),
  style: z.enum(['commercial', 'educational', 'entertainment']).default('commercial'),
  includeCaptions: z.boolean().default(true),
  includeMusic: z.boolean().default(false),
  templateId: z.string().optional()
});

const ttsRequestSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  speaker: z.number().int().min(0).default(1),
  speed: z.number().min(0.1).max(3.0).default(1.0),
  pitch: z.number().min(0.1).max(3.0).default(1.0),
  intonation: z.number().min(0.1).max(3.0).default(1.0),
  volume: z.number().min(0.1).max(3.0).default(1.0)
});

/**
 * POST /api/video/generate
 * Generate a complete video from script
 */
router.post('/generate', async (req, res) => {
  try {
    const validation = generateVideoSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid input',
        details: validation.error.errors
      });
    }

    const videoAssets = await videoFactory.generateVideo(validation.data);
    
    res.json({
      success: true,
      data: videoAssets
    });

  } catch (error) {
    console.error('Video generation failed:', error);
    res.status(500).json({
      error: 'Failed to generate video',
      message: error.message
    });
  }
});

/**
 * POST /api/video/variants
 * Generate multiple video variants for A/B testing
 */
router.post('/variants', async (req, res) => {
  try {
    const { count = 3, ...videoRequest } = req.body;
    
    const validation = generateVideoSchema.safeParse(videoRequest);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid input',
        details: validation.error.errors
      });
    }

    if (count < 1 || count > 5) {
      return res.status(400).json({
        error: 'Count must be between 1 and 5'
      });
    }

    const variants = await videoFactory.generateVariants(validation.data, count);
    
    res.json({
      success: true,
      data: variants
    });

  } catch (error) {
    console.error('Video variants generation failed:', error);
    res.status(500).json({
      error: 'Failed to generate video variants',
      message: error.message
    });
  }
});

/**
 * POST /api/video/tts
 * Generate text-to-speech audio
 */
router.post('/tts', async (req, res) => {
  try {
    const validation = ttsRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid input',
        details: validation.error.errors
      });
    }

    const { text, speaker, speed, pitch } = validation.data;
    
    const audioBuffer = await ttsService.generateSpeech(text, {
      provider: 'voicevox',
      speaker,
      speed,
      pitch
    });

    // Set appropriate headers for audio response
    res.set({
      'Content-Type': 'audio/wav',
      'Content-Length': audioBuffer.length,
      'Content-Disposition': 'attachment; filename="tts-audio.wav"'
    });

    res.send(audioBuffer);

  } catch (error) {
    console.error('TTS generation failed:', error);
    res.status(500).json({
      error: 'Failed to generate speech',
      message: error.message
    });
  }
});

/**
 * GET /api/video/tts/voices
 * Get available TTS voices
 */
router.get('/tts/voices', async (req, res) => {
  try {
    const providers = await ttsService.testAllProviders();
    
    // Return available voices based on working providers
    const voices = [
      {
        id: 'jp_female_a',
        name: 'ずんだもん（ノーマル）',
        provider: 'voicevox',
        gender: 'female',
        available: providers.voicevox
      },
      {
        id: 'jp_female_b',
        name: 'はう（ノーマル）',
        provider: 'voicevox',
        gender: 'female',
        available: providers.voicevox
      },
      {
        id: 'jp_male_a',
        name: '流星（ノーマル）',
        provider: 'voicevox',
        gender: 'male',
        available: providers.voicevox
      },
      {
        id: 'jp_commercial',
        name: 'ずんだもん（ツンデレ）',
        provider: 'voicevox',
        gender: 'female',
        available: providers.voicevox
      }
    ];
    
    res.json({
      success: true,
      data: {
        voices,
        providers
      }
    });

  } catch (error) {
    console.error('Failed to get TTS voices:', error);
    res.status(500).json({
      error: 'Failed to get available voices',
      message: error.message
    });
  }
});

/**
 * GET /api/video/tts/test-providers
 * Test TTS provider connections
 */
router.get('/tts/test-providers', async (req, res) => {
  try {
    const providers = await ttsService.testAllProviders();
    
    res.json({
      success: true,
      data: providers
    });

  } catch (error) {
    console.error('TTS provider test failed:', error);
    res.status(500).json({
      error: 'Failed to test TTS providers',
      message: error.message
    });
  }
});

/**
 * POST /api/video/cleanup
 * Clean up temporary video files
 */
router.post('/cleanup', async (req, res) => {
  try {
    const { videoId } = req.body;
    
    await videoFactory.cleanup(videoId);
    
    res.json({
      success: true,
      message: videoId ? `Cleaned up files for ${videoId}` : 'Cleaned up old temporary files'
    });

  } catch (error) {
    console.error('Video cleanup failed:', error);
    res.status(500).json({
      error: 'Failed to cleanup video files',
      message: error.message
    });
  }
});

export default router;