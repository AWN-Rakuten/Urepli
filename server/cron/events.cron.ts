/**
 * Events Orchestrator Cron Jobs
 * Manages Japanese market events scheduling and notifications
 */

import cron from 'node-cron';
import { eventsService } from '../services/events';

/**
 * Setup all event-related cron jobs
 */
export function setupEventsCronJobs() {
  
  // Daily event calendar sync at 00:30 JST (15:30 UTC previous day)
  cron.schedule('30 15 * * *', async () => {
    console.log('🗓️ Running daily event calendar sync...');
    
    try {
      await eventsService.initializeEventCalendar();
      console.log('✅ Event calendar sync completed');
    } catch (error) {
      console.error('❌ Event calendar sync failed:', error);
    }
  }, {
    
    timezone: 'UTC'
  });

  // Pre-event notifications every hour
  cron.schedule('0 * * * *', async () => {
    console.log('📱 Checking for pre-event notifications...');
    
    try {
      await eventsService.sendPreEventNotifications();
    } catch (error) {
      console.error('❌ Pre-event notification failed:', error);
    }
  }, {
    
    timezone: 'UTC'
  });

  // Event status check every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    try {
      const currentEvent = await eventsService.getCurrentEvent();
      
      if (currentEvent) {
        console.log(`🎉 Active event: ${currentEvent.name} (${currentEvent.code})`);
        
        // Log posting cadence multiplier
        const multiplier = await eventsService.getPostingCadenceMultiplier();
        if (multiplier > 1) {
          console.log(`📈 Posting cadence increased: ${multiplier}x`);
        }
      }
    } catch (error) {
      console.error('❌ Event status check failed:', error);
    }
  }, {
    
    timezone: 'UTC'
  });

  // Weekly event summary (Mondays at 09:00 JST)
  cron.schedule('0 0 * * 1', async () => {
    console.log('📊 Generating weekly event summary...');
    
    try {
      const upcomingEvents = await eventsService.getUpcomingEvents();
      
      if (upcomingEvents.length > 0) {
        console.log(`📅 Upcoming events this week: ${upcomingEvents.length}`);
        upcomingEvents.forEach(event => {
          console.log(`  - ${event.name}: ${event.startDate.toISOString().split('T')[0]}`);
        });
      } else {
        console.log('📅 No events scheduled for this week');
      }
    } catch (error) {
      console.error('❌ Weekly event summary failed:', error);
    }
  }, {
    
    timezone: 'UTC'
  });

  console.log('⏰ Event orchestrator cron jobs scheduled:');
  console.log('  - Calendar sync: Daily at 00:30 JST');
  console.log('  - Pre-event notifications: Hourly');
  console.log('  - Event status check: Every 30 minutes');
  console.log('  - Weekly summary: Mondays at 09:00 JST');
}

/**
 * Manual event calendar initialization
 */
export async function initializeEventsNow() {
  console.log('🚀 Manual event calendar initialization...');
  
  try {
    await eventsService.initializeEventCalendar();
    
    const activeEvents = await eventsService.getActiveEvents();
    const upcomingEvents = await eventsService.getUpcomingEvents();
    
    console.log(`✅ Calendar initialized:`);
    console.log(`  - Active events: ${activeEvents.length}`);
    console.log(`  - Upcoming events (7 days): ${upcomingEvents.length}`);
    
    return {
      active: activeEvents,
      upcoming: upcomingEvents
    };
  } catch (error) {
    console.error('❌ Manual initialization failed:', error);
    throw error;
  }
}

/**
 * Get current event status for debugging
 */
export async function getCurrentEventStatus() {
  try {
    const currentEvent = await eventsService.getCurrentEvent();
    const cadenceMultiplier = await eventsService.getPostingCadenceMultiplier();
    
    return {
      currentEvent,
      cadenceMultiplier,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Failed to get event status:', error);
    throw error;
  }
}