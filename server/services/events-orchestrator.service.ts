import { db } from '../db';
import { eventsCalendar } from '../../shared/schema';
import { eq, and, lte, gte, sql } from 'drizzle-orm';
import { addDays, addMonths, format, isSameDay } from 'date-fns';

export interface JapaneseEvent {
  id: string;
  code: 'SPU' | '5-0-day' | 'SUPER_SALE' | 'OKAIMONO' | 'OTHER';
  start_ts: Date;
  end_ts: Date;
  metadata?: Record<string, any>;
  is_active: boolean;
}

export interface EventBoostSettings {
  posting_multiplier: number;
  badge_text: string;
  points_multiplier?: number;
  urgency_level: 'low' | 'medium' | 'high';
}

export class EventsOrchestrator {
  
  /**
   * Populate upcoming "5と0の日" events (5th, 10th, 15th, 20th, 25th, 30th of each month)
   */
  async populateFiveZeroDays(months: number = 3): Promise<void> {
    const events = [];
    const now = new Date();
    
    for (let i = 0; i < months; i++) {
      const targetMonth = addMonths(now, i);
      const year = targetMonth.getFullYear();
      const month = targetMonth.getMonth();
      
      // Days that qualify for 5と0の日
      const fiveZeroDays = [5, 10, 15, 20, 25, 30];
      
      for (const day of fiveZeroDays) {
        // Check if day exists in the month (handle February, etc.)
        const eventDate = new Date(year, month, day);
        if (eventDate.getMonth() === month && eventDate.getDate() === day) {
          const startDate = new Date(year, month, day, 0, 0, 0);
          const endDate = new Date(year, month, day, 23, 59, 59);
          
          events.push({
            code: '5-0-day' as const,
            start_ts: startDate,
            end_ts: endDate,
            metadata: {
              day_type: '5-0-day',
              points_multiplier: 2, // Typical 2x points for Rakuten Card users
              badge_text: '本日「5と0」の日—楽天カードでポイントUP',
              description: 'Rakuten Card users get 2x points on 5 and 0 days'
            },
            is_active: false
          });
        }
      }
    }
    
    // Insert events, ignore duplicates
    if (events.length > 0) {
      await db.insert(eventsCalendar)
        .values(events)
        .onConflictDoNothing();
    }
  }

  /**
   * Get currently active events
   */
  async getActiveEvents(): Promise<JapaneseEvent[]> {
    const now = new Date();
    
    const activeEvents = await db.select()
      .from(eventsCalendar)
      .where(
        and(
          lte(eventsCalendar.start_ts, now),
          gte(eventsCalendar.end_ts, now),
          eq(eventsCalendar.is_active, true)
        )
      );
    
    return activeEvents;
  }

  /**
   * Get upcoming events in the next N days
   */
  async getUpcomingEvents(days: number = 7): Promise<JapaneseEvent[]> {
    const now = new Date();
    const futureDate = addDays(now, days);
    
    const upcomingEvents = await db.select()
      .from(eventsCalendar)
      .where(
        and(
          gte(eventsCalendar.start_ts, now),
          lte(eventsCalendar.start_ts, futureDate)
        )
      );
    
    return upcomingEvents;
  }

  /**
   * Check if today is a special event day
   */
  async isTodayEventDay(): Promise<boolean> {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    const todayEvents = await db.select()
      .from(eventsCalendar)
      .where(
        and(
          lte(eventsCalendar.start_ts, todayEnd),
          gte(eventsCalendar.end_ts, todayStart)
        )
      )
      .limit(1);
    
    return todayEvents.length > 0;
  }

  /**
   * Get event boost settings based on active events
   */
  async getEventBoostSettings(): Promise<EventBoostSettings> {
    const activeEvents = await this.getActiveEvents();
    
    if (activeEvents.length === 0) {
      return {
        posting_multiplier: 1.0,
        badge_text: '',
        urgency_level: 'low'
      };
    }

    // Priority order: SUPER_SALE > OKAIMONO > SPU > 5-0-day
    const prioritizedEvent = activeEvents.find(e => e.code === 'SUPER_SALE') ||
                           activeEvents.find(e => e.code === 'OKAIMONO') ||
                           activeEvents.find(e => e.code === 'SPU') ||
                           activeEvents.find(e => e.code === '5-0-day');

    if (!prioritizedEvent) {
      return {
        posting_multiplier: 1.0,
        badge_text: '',
        urgency_level: 'low'
      };
    }

    switch (prioritizedEvent.code) {
      case 'SUPER_SALE':
        return {
          posting_multiplier: 2.5,
          badge_text: '楽天スーパーSALE開催中—半額以下も！',
          points_multiplier: prioritizedEvent.metadata?.points_multiplier || 3,
          urgency_level: 'high'
        };
      
      case 'OKAIMONO':
        return {
          posting_multiplier: 2.0,
          badge_text: 'お買い物マラソン開催中—ポイント最大10倍！',
          points_multiplier: prioritizedEvent.metadata?.points_multiplier || 10,
          urgency_level: 'high'
        };
      
      case 'SPU':
        return {
          posting_multiplier: 1.5,
          badge_text: `今月ポイント+${prioritizedEvent.metadata?.points_multiplier || 16}倍（SPU適用時）`,
          points_multiplier: prioritizedEvent.metadata?.points_multiplier || 16,
          urgency_level: 'medium'
        };
      
      case '5-0-day':
        return {
          posting_multiplier: 1.3,
          badge_text: '本日「5と0」の日—楽天カードでポイントUP',
          points_multiplier: prioritizedEvent.metadata?.points_multiplier || 2,
          urgency_level: 'medium'
        };
      
      default:
        return {
          posting_multiplier: 1.0,
          badge_text: '',
          urgency_level: 'low'
        };
    }
  }

  /**
   * Activate events that should be active now
   */
  async activateCurrentEvents(): Promise<void> {
    const now = new Date();
    
    // Activate events that should be active
    await db.update(eventsCalendar)
      .set({ is_active: true })
      .where(
        and(
          lte(eventsCalendar.start_ts, now),
          gte(eventsCalendar.end_ts, now),
          eq(eventsCalendar.is_active, false)
        )
      );
    
    // Deactivate events that should no longer be active
    await db.update(eventsCalendar)
      .set({ is_active: false })
      .where(
        and(
          sql`${eventsCalendar.end_ts} < ${now}`,
          eq(eventsCalendar.is_active, true)
        )
      );
  }

  /**
   * Create or update SPU event
   */
  async setSPUEvent(startDate: Date, endDate: Date, pointsMultiplier: number): Promise<void> {
    await db.insert(eventsCalendar)
      .values({
        code: 'SPU',
        start_ts: startDate,
        end_ts: endDate,
        metadata: {
          points_multiplier: pointsMultiplier,
          badge_text: `今月ポイント+${pointsMultiplier}倍（SPU適用時）`,
          description: 'Super Point Up Program active'
        },
        is_active: false
      })
      .onConflictDoUpdate({
        target: [eventsCalendar.code, eventsCalendar.start_ts],
        set: {
          end_ts: endDate,
          metadata: {
            points_multiplier: pointsMultiplier,
            badge_text: `今月ポイント+${pointsMultiplier}倍（SPU適用時）`,
            description: 'Super Point Up Program active'
          }
        }
      });
  }

  /**
   * Get event calendar for display
   */
  async getEventCalendar(days: number = 30): Promise<JapaneseEvent[]> {
    const now = new Date();
    const futureDate = addDays(now, days);
    
    const events = await db.select()
      .from(eventsCalendar)
      .where(
        and(
          gte(eventsCalendar.end_ts, now),
          lte(eventsCalendar.start_ts, futureDate)
        )
      )
      .orderBy(eventsCalendar.start_ts);
    
    return events;
  }
}

export const eventsOrchestrator = new EventsOrchestrator();