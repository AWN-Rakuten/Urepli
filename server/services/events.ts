/**
 * Japanese Market Events Orchestrator
 * Manages SPU, 5と0の日, スーパーSALE events with automated scheduling and badges
 */

import { db } from '../db';
import { eventsCalendar } from '../../shared/schema';
import { eq, gte, lte, and } from 'drizzle-orm';
import { addDays, format, startOfDay, endOfDay } from 'date-fns';

export interface JapaneseEvent {
  id: string;
  code: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  metadata: {
    pointMultiplier?: number;
    badge?: string;
    description?: string;
    urgencyLevel?: 'low' | 'medium' | 'high' | 'critical';
    backgroundColor?: string;
    textColor?: string;
  };
}

export interface EventSchedule {
  spu: Date[];
  fiveZeroDays: Date[];
  superSale: Date[];
  okaimonoMarathon: Date[];
}

/**
 * Japanese Market Events Service
 */
export class EventsService {

  /**
   * Initialize and populate event calendar for the next 6 months
   */
  async initializeEventCalendar(): Promise<void> {
    console.log('🗓️ Initializing Japanese market events calendar...');
    
    const schedule = this.generateEventSchedule(6);
    
    // Clear existing future events
    await db.delete(eventsCalendar)
      .where(gte(eventsCalendar.start_ts, new Date()));
    
    // Insert SPU events (monthly)
    for (const date of schedule.spu) {
      await this.createEvent({
        code: 'SPU',
        startDate: startOfDay(date),
        endDate: endOfDay(date),
        metadata: {
          pointMultiplier: 2,
          badge: 'スーパーポイントアップ',
          description: 'スーパーポイントアップデー開催中！',
          urgencyLevel: 'medium',
          backgroundColor: '#ff4444',
          textColor: '#ffffff'
        }
      });
    }
    
    // Insert 5と0の日 events (twice monthly: 5th and 20th)
    for (const date of schedule.fiveZeroDays) {
      await this.createEvent({
        code: '5-0-day',
        startDate: startOfDay(date),
        endDate: endOfDay(date),
        metadata: {
          pointMultiplier: 5,
          badge: '5と0の日',
          description: '5と0の日限定ポイントアップ！',
          urgencyLevel: 'high',
          backgroundColor: '#ff6600',
          textColor: '#ffffff'
        }
      });
    }
    
    // Insert Super Sale events (quarterly)
    for (const date of schedule.superSale) {
      const endDate = addDays(date, 3); // 4-day event
      await this.createEvent({
        code: 'SUPER_SALE',
        startDate: startOfDay(date),
        endDate: endOfDay(endDate),
        metadata: {
          pointMultiplier: 10,
          badge: 'スーパーSALE',
          description: 'スーパーSALE開催中！最大50%OFF',
          urgencyLevel: 'critical',
          backgroundColor: '#ff0000',
          textColor: '#ffffff'
        }
      });
    }
    
    // Insert Okaimono Marathon (twice yearly)
    for (const date of schedule.okaimonoMarathon) {
      const endDate = addDays(date, 6); // 7-day event
      await this.createEvent({
        code: 'OKAIMONO',
        startDate: startOfDay(date),
        endDate: endOfDay(endDate),
        metadata: {
          pointMultiplier: 3,
          badge: 'お買い物マラソン',
          description: 'お買い物マラソン開催中！',
          urgencyLevel: 'medium',
          backgroundColor: '#0066cc',
          textColor: '#ffffff'
        }
      });
    }
    
    console.log('✅ Event calendar initialized successfully');
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

    return activeEvents.map(event => ({
      id: event.id,
      code: event.code,
      name: event.metadata?.badge || event.code,
      startDate: event.start_ts,
      endDate: event.end_ts,
      isActive: event.is_active,
      metadata: event.metadata || {}
    }));
  }

  /**
   * Get upcoming events (next 7 days)
   */
  async getUpcomingEvents(): Promise<JapaneseEvent[]> {
    const now = new Date();
    const weekFromNow = addDays(now, 7);
    
    const upcomingEvents = await db.select()
      .from(eventsCalendar)
      .where(
        and(
          gte(eventsCalendar.start_ts, now),
          lte(eventsCalendar.start_ts, weekFromNow)
        )
      );

    return upcomingEvents.map(event => ({
      id: event.id,
      code: event.code,
      name: event.metadata?.badge || event.code,
      startDate: event.start_ts,
      endDate: event.end_ts,
      isActive: event.is_active,
      metadata: event.metadata || {}
    }));
  }

  /**
   * Check if there's an active event right now
   */
  async getCurrentEvent(): Promise<JapaneseEvent | null> {
    const activeEvents = await this.getActiveEvents();
    
    if (activeEvents.length === 0) {
      return null;
    }
    
    // Return highest priority event (critical > high > medium > low)
    const priorityOrder = ['critical', 'high', 'medium', 'low'];
    
    activeEvents.sort((a, b) => {
      const aPriority = priorityOrder.indexOf(a.metadata.urgencyLevel || 'low');
      const bPriority = priorityOrder.indexOf(b.metadata.urgencyLevel || 'low');
      return aPriority - bPriority;
    });
    
    return activeEvents[0];
  }

  /**
   * Generate event badge HTML/CSS for UI
   */
  generateEventBadge(event: JapaneseEvent): string {
    const { badge, backgroundColor, textColor } = event.metadata;
    
    return `
      <div class="event-badge" style="
        background-color: ${backgroundColor || '#ff4444'};
        color: ${textColor || '#ffffff'};
        padding: 4px 12px;
        border-radius: 16px;
        font-weight: bold;
        font-size: 12px;
        display: inline-block;
        margin: 2px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        animation: pulse 2s infinite;
      ">
        ${badge || event.code}
      </div>
    `;
  }

  /**
   * Get content posting cadence multiplier based on active events
   */
  async getPostingCadenceMultiplier(): Promise<number> {
    const currentEvent = await this.getCurrentEvent();
    
    if (!currentEvent) {
      return 1.0; // Normal posting frequency
    }
    
    // Increase posting frequency based on event priority
    switch (currentEvent.metadata.urgencyLevel) {
      case 'critical': return 3.0; // 3x more posts during Super Sale
      case 'high': return 2.5;     // 2.5x more during 5と0の日
      case 'medium': return 1.8;   // 1.8x more during SPU
      default: return 1.2;         // 1.2x more during minor events
    }
  }

  /**
   * Send LINE notification before peak events
   */
  async sendPreEventNotifications(): Promise<void> {
    const upcomingEvents = await this.getUpcomingEvents();
    
    // Filter events starting within 1-2 hours
    const now = new Date();
    const notificationWindow = 2 * 60 * 60 * 1000; // 2 hours in ms
    
    const imminent = upcomingEvents.filter(event => {
      const timeUntilStart = event.startDate.getTime() - now.getTime();
      return timeUntilStart > 0 && timeUntilStart <= notificationWindow;
    });
    
    for (const event of imminent) {
      try {
        await this.sendLINENotification(event);
        console.log(`📱 Sent LINE notification for ${event.name}`);
      } catch (error) {
        console.error(`Failed to send LINE notification for ${event.name}:`, error);
      }
    }
  }

  /**
   * Private helper methods
   */
  private async createEvent(eventData: {
    code: string;
    startDate: Date;
    endDate: Date;
    metadata: any;
  }) {
    await db.insert(eventsCalendar).values({
      code: eventData.code,
      start_ts: eventData.startDate,
      end_ts: eventData.endDate,
      metadata: eventData.metadata,
      is_active: true
    });
  }

  private generateEventSchedule(months: number): EventSchedule {
    const now = new Date();
    const schedule: EventSchedule = {
      spu: [],
      fiveZeroDays: [],
      superSale: [],
      okaimonoMarathon: []
    };
    
    for (let i = 0; i < months; i++) {
      const currentMonth = new Date(now.getFullYear(), now.getMonth() + i, 1);
      
      // SPU: 1st of every month
      schedule.spu.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1));
      
      // 5と0の日: 5th and 20th of every month
      schedule.fiveZeroDays.push(
        new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 5),
        new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 20)
      );
      
      // Super Sale: Quarterly (March, June, September, December)
      if ([2, 5, 8, 11].includes(currentMonth.getMonth())) {
        schedule.superSale.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 4));
      }
      
      // Okaimono Marathon: Twice yearly (May and November)
      if ([4, 10].includes(currentMonth.getMonth())) {
        schedule.okaimonoMarathon.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 15));
      }
    }
    
    return schedule;
  }

  private async sendLINENotification(event: JapaneseEvent): Promise<void> {
    // Placeholder for LINE notification integration
    // This would integrate with LINE Messaging API
    
    const message = {
      type: 'flex',
      altText: `${event.name}まもなく開始！`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: event.name,
              weight: 'bold',
              size: 'lg',
              color: '#ffffff'
            }
          ],
          backgroundColor: event.metadata.backgroundColor,
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: event.metadata.description || 'イベント開始まであと少し！',
              wrap: true
            },
            {
              type: 'text',
              text: `開始時刻: ${format(event.startDate, 'MM/dd HH:mm')}`,
              size: 'sm',
              color: '#666666'
            }
          ]
        }
      }
    };
    
    console.log('📱 Would send LINE notification:', message);
    // TODO: Implement actual LINE API call
  }
}

export const eventsService = new EventsService();