import { Router } from 'express';
import { researchService } from '../services/research.service.js';
import { z } from 'zod';

const router = Router();

// Input validation schemas
const researchBriefSchema = z.object({
  seed: z.string().min(1, 'Seed topic is required'),
  locale: z.string().default('ja-JP'),
  contentType: z.enum(['blog', 'video', 'both']).default('both')
});

const topicClustersSchema = z.object({
  niche: z.string().min(1, 'Niche is required'),
  count: z.number().int().min(1).max(50).default(10)
});

/**
 * POST /api/research/brief
 * Generate research brief for content creation
 */
router.post('/brief', async (req, res) => {
  try {
    const validation = researchBriefSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid input',
        details: validation.error.errors
      });
    }

    const brief = await researchService.generateBrief(validation.data);
    
    res.json({
      success: true,
      data: brief
    });

  } catch (error) {
    console.error('Research brief generation failed:', error);
    res.status(500).json({
      error: 'Failed to generate research brief',
      message: error.message
    });
  }
});

/**
 * POST /api/research/clusters
 * Generate topic clusters for site planning
 */
router.post('/clusters', async (req, res) => {
  try {
    const validation = topicClustersSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid input',
        details: validation.error.errors
      });
    }

    const clusters = await researchService.generateTopicClusters(
      validation.data.niche,
      validation.data.count
    );
    
    res.json({
      success: true,
      data: clusters
    });

  } catch (error) {
    console.error('Topic clusters generation failed:', error);
    res.status(500).json({
      error: 'Failed to generate topic clusters',
      message: error.message
    });
  }
});

/**
 * POST /api/research/analyze-competitor
 * Analyze competitor content
 */
router.post('/analyze-competitor', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        error: 'Valid URL is required'
      });
    }

    const analysis = await researchService.analyzeCompetitor(url);
    
    res.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    console.error('Competitor analysis failed:', error);
    res.status(500).json({
      error: 'Failed to analyze competitor',
      message: error.message
    });
  }
});

/**
 * POST /api/research/test-segmentation
 * Test Japanese text segmentation
 */
router.post('/test-segmentation', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Text is required'
      });
    }

    const segmentation = await researchService.testSegmentation(text);
    
    res.json({
      success: true,
      data: segmentation
    });

  } catch (error) {
    console.error('Text segmentation failed:', error);
    res.status(500).json({
      error: 'Failed to segment text',
      message: error.message
    });
  }
});

export default router;