import express from 'express';
import { getDefaultOrchestrator } from '../../quant-agents/workflows/orchestrator';

const router = express.Router();

// Global orchestrator instance
let orchestrator = getDefaultOrchestrator();

/**
 * Initialize the quant agents system
 */
router.post('/initialize', async (req, res) => {
  try {
    if (!orchestrator) {
      orchestrator = getDefaultOrchestrator();
    }
    
    await orchestrator.initialize();
    await orchestrator.start();
    
    res.json({
      success: true,
      message: 'Quant agents system initialized and started',
      status: orchestrator.getSystemStatus()
    });
  } catch (error) {
    console.error('Error initializing quant agents:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get system status and metrics
 */
router.get('/status', (req, res) => {
  try {
    const status = orchestrator ? orchestrator.getSystemStatus() : null;
    
    res.json({
      success: true,
      status: status || {
        isRunning: false,
        activeAgents: 0,
        totalEvents: 0,
        recentErrors: [],
        lastActivity: new Date(),
        performanceMetrics: {
          strategiesGenerated: 0,
          factorsDiscovered: 0,
          riskAssessments: 0,
          regimeChanges: 0
        }
      }
    });
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get agent statuses
 */
router.get('/agents', (req, res) => {
  try {
    const agents = orchestrator ? orchestrator.getAgentStatuses() : [];
    
    res.json({
      success: true,
      agents
    });
  } catch (error) {
    console.error('Error getting agent statuses:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Trigger analysis cycle with mock or real data
 */
router.post('/analyze', async (req, res) => {
  try {
    if (!orchestrator || !orchestrator.getSystemStatus().isRunning) {
      return res.status(400).json({
        success: false,
        error: 'System not running. Please initialize first.'
      });
    }

    const { marketData, narrative } = req.body;
    
    // Ingest market data if provided, otherwise trigger with mock data
    if (marketData) {
      await orchestrator.ingestMarketData(marketData);
    } else {
      await orchestrator.triggerAnalysisCycle();
    }
    
    // Update narrative if provided
    if (narrative) {
      await orchestrator.updateMacroNarrative(narrative);
    }
    
    res.json({
      success: true,
      message: 'Analysis cycle triggered',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error triggering analysis:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get strategy recommendations
 */
router.get('/strategies', async (req, res) => {
  try {
    if (!orchestrator) {
      return res.json({ success: true, strategies: [] });
    }
    
    const strategies = await orchestrator.getStrategyRecommendations();
    
    res.json({
      success: true,
      strategies,
      count: strategies.length
    });
  } catch (error) {
    console.error('Error getting strategies:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get factor discoveries
 */
router.get('/factors', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    
    if (!orchestrator) {
      return res.json({ success: true, factors: [] });
    }
    
    const factors = orchestrator.getFactorDiscoveries(limit);
    
    res.json({
      success: true,
      factors,
      count: factors.length
    });
  } catch (error) {
    console.error('Error getting factors:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get knowledge graph statistics
 */
router.get('/knowledge-graph', (req, res) => {
  try {
    const stats = orchestrator ? orchestrator.getKnowledgeGraphStats() : null;
    
    res.json({
      success: true,
      stats: stats || {
        entityCount: 0,
        relationCount: 0,
        entityTypeBreakdown: {},
        relationTypeBreakdown: {}
      }
    });
  } catch (error) {
    console.error('Error getting knowledge graph stats:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get recent events
 */
router.get('/events', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    
    const events = orchestrator ? orchestrator.getRecentEvents(limit) : [];
    
    res.json({
      success: true,
      events,
      count: events.length
    });
  } catch (error) {
    console.error('Error getting events:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Ingest custom market data
 */
router.post('/data/ingest', async (req, res) => {
  try {
    if (!orchestrator || !orchestrator.getSystemStatus().isRunning) {
      return res.status(400).json({
        success: false,
        error: 'System not running. Please initialize first.'
      });
    }

    const { data } = req.body;
    
    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Market data is required'
      });
    }
    
    await orchestrator.ingestMarketData(data);
    
    res.json({
      success: true,
      message: 'Market data ingested successfully',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error ingesting data:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Update macro narrative
 */
router.post('/narrative', async (req, res) => {
  try {
    if (!orchestrator || !orchestrator.getSystemStatus().isRunning) {
      return res.status(400).json({
        success: false,
        error: 'System not running. Please initialize first.'
      });
    }

    const { narrative } = req.body;
    
    if (!narrative) {
      return res.status(400).json({
        success: false,
        error: 'Narrative text is required'
      });
    }
    
    await orchestrator.updateMacroNarrative(narrative);
    
    res.json({
      success: true,
      message: 'Macro narrative updated successfully',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error updating narrative:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Stop the system
 */
router.post('/stop', async (req, res) => {
  try {
    if (orchestrator) {
      await orchestrator.stop();
    }
    
    res.json({
      success: true,
      message: 'Quant agents system stopped'
    });
  } catch (error) {
    console.error('Error stopping system:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get system dashboard data (combined endpoint for UI)
 */
router.get('/dashboard', async (req, res) => {
  try {
    if (!orchestrator) {
      return res.json({
        success: true,
        dashboard: {
          systemStatus: { isRunning: false, activeAgents: 0, totalEvents: 0, recentErrors: [], lastActivity: new Date(), performanceMetrics: { strategiesGenerated: 0, factorsDiscovered: 0, riskAssessments: 0, regimeChanges: 0 }},
          agents: [],
          recentStrategies: [],
          recentFactors: [],
          knowledgeGraphStats: { entityCount: 0, relationCount: 0, entityTypeBreakdown: {}, relationTypeBreakdown: {} },
          recentEvents: []
        }
      });
    }
    
    const [
      systemStatus,
      agents,
      recentStrategies,
      recentFactors,
      knowledgeGraphStats,
      recentEvents
    ] = await Promise.all([
      Promise.resolve(orchestrator.getSystemStatus()),
      Promise.resolve(orchestrator.getAgentStatuses()),
      orchestrator.getStrategyRecommendations(),
      Promise.resolve(orchestrator.getFactorDiscoveries(10)),
      Promise.resolve(orchestrator.getKnowledgeGraphStats()),
      Promise.resolve(orchestrator.getRecentEvents(20))
    ]);
    
    res.json({
      success: true,
      dashboard: {
        systemStatus,
        agents,
        recentStrategies,
        recentFactors,
        knowledgeGraphStats,
        recentEvents
      }
    });
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    healthy: true,
    timestamp: new Date(),
    version: '1.0.0'
  });
});

export default router;