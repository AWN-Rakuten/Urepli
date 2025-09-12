import { Router } from 'express';
import { websiteFactory } from '../services/webfactory.js';
import { z } from 'zod';

const router = Router();

// Input validation schemas
const createSiteSchema = z.object({
  niche: z.string().min(1, 'Niche is required'),
  cms: z.enum(['strapi', 'ghost', 'wp']).default('strapi'),
  host: z.enum(['vercel', 'cloudflare', 'wp']).default('vercel'),
  domain: z.string().optional(),
  templateRepo: z.string().optional()
});

/**
 * POST /api/webfactory/create
 * Create a new website with hosting, CMS, and DNS
 */
router.post('/create', async (req, res) => {
  try {
    const validation = createSiteSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid input',
        details: validation.error.errors
      });
    }

    const result = await websiteFactory.createSite(validation.data);
    
    if (result.success) {
      res.status(201).json({
        success: true,
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        data: {
          domain: result.domain
        }
      });
    }

  } catch (error) {
    console.error('Website creation failed:', error);
    res.status(500).json({
      error: 'Failed to create website',
      message: error.message
    });
  }
});

/**
 * GET /api/webfactory/test-connections
 * Test connections to GitHub, Vercel, and Cloudflare
 */
router.get('/test-connections', async (req, res) => {
  try {
    const connections = await websiteFactory.testConnections();
    
    res.json({
      success: true,
      data: connections
    });

  } catch (error) {
    console.error('Connection test failed:', error);
    res.status(500).json({
      error: 'Failed to test connections',
      message: error.message
    });
  }
});

export default router;