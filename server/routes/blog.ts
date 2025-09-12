import { Router } from 'express';
import { blogService } from '../services/blog.service.js';
import { blogPublisher } from '../services/publish.blog.js';
import { z } from 'zod';

const router = Router();

// Input validation schemas
const generateBlogSchema = z.object({
  outline: z.object({
    mainTopic: z.string(),
    subTopics: z.array(z.string()),
    structure: z.array(z.string())
  }),
  keywords: z.array(z.object({
    primary: z.string(),
    related: z.array(z.string())
  })),
  productRefs: z.array(z.object({
    name: z.string(),
    url: z.string(),
    price: z.number().optional(),
    description: z.string().optional()
  })).optional(),
  wordCount: z.number().int().min(500).max(10000).default(2000),
  tone: z.enum(['professional', 'casual', 'conversational']).default('professional'),
  includeAffiliate: z.boolean().default(true)
});

const publishBlogSchema = z.object({
  title: z.string(),
  content: z.string(),
  excerpt: z.string().optional(),
  tags: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  images: z.array(z.object({
    url: z.string(),
    alt: z.string().optional(),
    caption: z.string().optional()
  })).optional(),
  slug: z.string().optional(),
  status: z.enum(['draft', 'publish', 'private']).default('publish'),
  targets: z.array(z.enum(['wordpress', 'strapi', 'ghost'])).default(['wordpress'])
});

/**
 * POST /api/blog/generate
 * Generate a blog post from outline and keywords
 */
router.post('/generate', async (req, res) => {
  try {
    const validation = generateBlogSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid input',
        details: validation.error.errors
      });
    }

    const blog = await blogService.generateBlog(validation.data);
    
    res.json({
      success: true,
      data: blog
    });

  } catch (error) {
    console.error('Blog generation failed:', error);
    res.status(500).json({
      error: 'Failed to generate blog',
      message: error.message
    });
  }
});

/**
 * POST /api/blog/variants
 * Generate multiple blog variants for A/B testing
 */
router.post('/variants', async (req, res) => {
  try {
    const { count = 3, ...blogRequest } = req.body;
    
    const validation = generateBlogSchema.safeParse(blogRequest);
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

    const variants = await blogService.generateVariants(validation.data, count);
    
    res.json({
      success: true,
      data: variants
    });

  } catch (error) {
    console.error('Blog variants generation failed:', error);
    res.status(500).json({
      error: 'Failed to generate blog variants',
      message: error.message
    });
  }
});

/**
 * POST /api/blog/optimize
 * Optimize existing blog content
 */
router.post('/optimize', async (req, res) => {
  try {
    const { content, keywords, performanceData } = req.body;
    
    if (!content || !keywords) {
      return res.status(400).json({
        error: 'Content and keywords are required'
      });
    }

    const optimizedContent = await blogService.optimizeBlog(
      content,
      keywords,
      performanceData
    );
    
    res.json({
      success: true,
      data: {
        originalContent: content,
        optimizedContent,
        keywords
      }
    });

  } catch (error) {
    console.error('Blog optimization failed:', error);
    res.status(500).json({
      error: 'Failed to optimize blog',
      message: error.message
    });
  }
});

/**
 * POST /api/blog/publish
 * Publish blog to multiple platforms
 */
router.post('/publish', async (req, res) => {
  try {
    const validation = publishBlogSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid input',
        details: validation.error.errors
      });
    }

    const { targets, ...publishData } = validation.data;
    
    const results = await blogPublisher.publish(publishData, targets);
    
    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('Blog publishing failed:', error);
    res.status(500).json({
      error: 'Failed to publish blog',
      message: error.message
    });
  }
});

/**
 * GET /api/blog/test-connections
 * Test CMS connections
 */
router.get('/test-connections', async (req, res) => {
  try {
    const connections = await blogPublisher.testAllConnections();
    
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