#!/usr/bin/env npx tsx
/**
 * Script to populate Japanese affiliate marketing events
 * Run with: npx tsx scripts/populate-events.ts
 */

import { eventsOrchestrator } from '../server/services/events-orchestrator.service';

async function main() {
  console.log('🗓️ Populating Japanese affiliate marketing events...');
  
  try {
    // Populate 5と0の日 for next 3 months
    await eventsOrchestrator.populateFiveZeroDays(3);
    console.log('✅ Successfully populated 5と0の日 events');
    
    // Set example SPU event for this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    await eventsOrchestrator.setSPUEvent(startOfMonth, endOfMonth, 16);
    console.log('✅ Set SPU event for current month (16x points)');
    
    // Check what events are active
    await eventsOrchestrator.activateCurrentEvents();
    const activeEvents = await eventsOrchestrator.getActiveEvents();
    const upcomingEvents = await eventsOrchestrator.getUpcomingEvents(7);
    
    console.log('\n📅 Event Status:');
    console.log(`Active events: ${activeEvents.length}`);
    console.log(`Upcoming events (7 days): ${upcomingEvents.length}`);
    
    if (activeEvents.length > 0) {
      console.log('\n🔥 Active Events:');
      activeEvents.forEach(event => {
        console.log(`  - ${event.code}: ${event.metadata?.badge_text || 'No description'}`);
      });
    }
    
    if (upcomingEvents.length > 0) {
      console.log('\n📆 Upcoming Events:');
      upcomingEvents.slice(0, 5).forEach(event => {
        const startDate = new Date(event.start_ts).toLocaleDateString('ja-JP');
        console.log(`  - ${startDate}: ${event.code} - ${event.metadata?.badge_text || 'No description'}`);
      });
    }
    
    // Get event boost settings
    const boostSettings = await eventsOrchestrator.getEventBoostSettings();
    console.log('\n⚡ Current Boost Settings:');
    console.log(`  Posting multiplier: ${boostSettings.posting_multiplier}x`);
    console.log(`  Badge text: ${boostSettings.badge_text}`);
    console.log(`  Urgency level: ${boostSettings.urgency_level}`);
    if (boostSettings.points_multiplier) {
      console.log(`  Points multiplier: ${boostSettings.points_multiplier}x`);
    }
    
    console.log('\n🎉 Event population completed successfully!');
    
  } catch (error) {
    console.error('❌ Error populating events:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().then(() => process.exit(0));
}