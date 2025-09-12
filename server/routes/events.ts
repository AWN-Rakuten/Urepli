/**
 * Events API Routes
 * Japanese market events management endpoints
 */

import { Router } from 'express';
import { eventsService } from '../services/events';
import { initializeEventsNow, getCurrentEventStatus } from '../cron/events.cron';

const router = Router();

/**
 * GET /api/events/active
 * Get currently active events
 */
router.get('/active', async (req, res) => {
  try {
    const activeEvents = await eventsService.getActiveEvents();
    
    res.json({
      success: true,
      data: activeEvents,
      count: activeEvents.length
    });
  } catch (error) {
    console.error('Error fetching active events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active events'
    });
  }
});

/**
 * GET /api/events/upcoming
 * Get upcoming events (next 7 days)
 */
router.get('/upcoming', async (req, res) => {
  try {
    const upcomingEvents = await eventsService.getUpcomingEvents();
    
    res.json({
      success: true,
      data: upcomingEvents,
      count: upcomingEvents.length
    });
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch upcoming events'
    });
  }
});

/**
 * GET /api/events/current
 * Get the highest priority current event
 */
router.get('/current', async (req, res) => {
  try {
    const currentEvent = await eventsService.getCurrentEvent();
    
    res.json({
      success: true,
      data: currentEvent,
      hasEvent: !!currentEvent
    });
  } catch (error) {
    console.error('Error fetching current event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch current event'
    });
  }
});

/**
 * GET /api/events/posting-cadence
 * Get posting cadence multiplier based on current events
 */
router.get('/posting-cadence', async (req, res) => {
  try {
    const multiplier = await eventsService.getPostingCadenceMultiplier();
    const currentEvent = await eventsService.getCurrentEvent();
    
    res.json({
      success: true,
      data: {
        multiplier,
        currentEvent,
        normalFrequency: 1.0,
        adjustedFrequency: multiplier
      }
    });
  } catch (error) {
    console.error('Error fetching posting cadence:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch posting cadence'
    });
  }
});

/**
 * POST /api/events/initialize
 * Manually initialize event calendar
 */
router.post('/initialize', async (req, res) => {
  try {
    const result = await initializeEventsNow();
    
    res.json({
      success: true,
      message: 'Event calendar initialized successfully',
      data: result
    });
  } catch (error) {
    console.error('Error initializing events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize event calendar'
    });
  }
});

/**
 * GET /api/events/status
 * Get comprehensive event status for debugging
 */
router.get('/status', async (req, res) => {
  try {
    const status = await getCurrentEventStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error fetching event status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch event status'
    });
  }
});

/**
 * GET /api/events/badge/:eventCode
 * Generate event badge HTML for a specific event
 */
router.get('/badge/:eventCode', async (req, res) => {
  try {
    const { eventCode } = req.params;
    const activeEvents = await eventsService.getActiveEvents();
    
    const event = activeEvents.find(e => e.code === eventCode);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }
    
    const badgeHtml = eventsService.generateEventBadge(event);
    
    res.json({
      success: true,
      data: {
        eventCode,
        eventName: event.name,
        badgeHtml,
        metadata: event.metadata
      }
    });
  } catch (error) {
    console.error('Error generating event badge:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate event badge'
    });
  }
});

export default router;