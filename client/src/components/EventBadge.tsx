/**
 * Japanese Market Event Badge Component
 * Displays active event badges with proper styling and animations
 */

import React from 'react';

export interface EventBadgeProps {
  eventCode: string;
  eventName: string;
  urgencyLevel?: 'low' | 'medium' | 'high' | 'critical';
  backgroundColor?: string;
  textColor?: string;
  pointMultiplier?: number;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  onClick?: () => void;
}

/**
 * Event Badge Component
 */
export const EventBadge: React.FC<EventBadgeProps> = ({
  eventCode,
  eventName,
  urgencyLevel = 'medium',
  backgroundColor,
  textColor = '#ffffff',
  pointMultiplier,
  size = 'md',
  animated = true,
  onClick
}) => {
  
  // Default colors based on urgency level
  const getDefaultColor = (level: string) => {
    switch (level) {
      case 'critical': return '#ff0000';
      case 'high': return '#ff6600';
      case 'medium': return '#ff4444';
      case 'low': return '#0066cc';
      default: return '#ff4444';
    }
  };

  // Size configurations
  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm': return 'px-2 py-1 text-xs';
      case 'md': return 'px-3 py-1.5 text-sm';
      case 'lg': return 'px-4 py-2 text-base';
      default: return 'px-3 py-1.5 text-sm';
    }
  };

  const bgColor = backgroundColor || getDefaultColor(urgencyLevel);
  const sizeClasses = getSizeClasses(size);
  
  const baseClasses = `
    inline-flex items-center gap-1 rounded-full font-bold 
    ${sizeClasses}
    ${onClick ? 'cursor-pointer hover:opacity-90' : ''}
    ${animated ? 'animate-pulse' : ''}
    transition-all duration-200
    shadow-lg
  `.trim();

  const pulseKeyframes = `
    @keyframes eventPulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.8; transform: scale(1.05); }
    }
  `;

  return (
    <>
      <style>{pulseKeyframes}</style>
      <div
        className={baseClasses}
        style={{
          backgroundColor: bgColor,
          color: textColor,
          animation: animated && urgencyLevel === 'critical' ? 'eventPulse 2s infinite' : undefined
        }}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        <span className="font-bold">{eventName}</span>
        
        {pointMultiplier && pointMultiplier > 1 && (
          <span className="bg-white bg-opacity-20 px-1.5 py-0.5 rounded-full text-xs">
            {pointMultiplier}倍
          </span>
        )}
        
        {urgencyLevel === 'critical' && (
          <span className="animate-bounce">🔥</span>
        )}
      </div>
    </>
  );
};

/**
 * Event Badge List Component
 */
export interface EventBadgeListProps {
  events: Array<{
    code: string;
    name: string;
    urgencyLevel?: 'low' | 'medium' | 'high' | 'critical';
    backgroundColor?: string;
    pointMultiplier?: number;
  }>;
  size?: 'sm' | 'md' | 'lg';
  maxDisplay?: number;
  onEventClick?: (eventCode: string) => void;
}

export const EventBadgeList: React.FC<EventBadgeListProps> = ({
  events,
  size = 'md',
  maxDisplay = 3,
  onEventClick
}) => {
  const displayEvents = events.slice(0, maxDisplay);
  const remainingCount = Math.max(0, events.length - maxDisplay);

  if (events.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {displayEvents.map((event) => (
        <EventBadge
          key={event.code}
          eventCode={event.code}
          eventName={event.name}
          urgencyLevel={event.urgencyLevel}
          backgroundColor={event.backgroundColor}
          pointMultiplier={event.pointMultiplier}
          size={size}
          onClick={onEventClick ? () => onEventClick(event.code) : undefined}
        />
      ))}
      
      {remainingCount > 0 && (
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
          +{remainingCount}
        </span>
      )}
    </div>
  );
};

/**
 * Event Status Indicator
 */
export interface EventStatusProps {
  hasActiveEvents: boolean;
  eventCount: number;
  nextEventDate?: Date;
  className?: string;
}

export const EventStatus: React.FC<EventStatusProps> = ({
  hasActiveEvents,
  eventCount,
  nextEventDate,
  className = ''
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1">
        <div
          className={`w-2 h-2 rounded-full ${
            hasActiveEvents ? 'bg-red-500 animate-pulse' : 'bg-gray-300'
          }`}
        />
        <span className="text-sm font-medium">
          {hasActiveEvents ? 'イベント開催中' : 'イベント待機中'}
        </span>
      </div>
      
      {eventCount > 0 && (
        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
          {eventCount}件
        </span>
      )}
      
      {nextEventDate && !hasActiveEvents && (
        <span className="text-xs text-gray-500">
          次回: {nextEventDate.toLocaleDateString('ja-JP')}
        </span>
      )}
    </div>
  );
};

/**
 * Pre-built event badges for common Japanese events
 */
export const prebuiltEventBadges = {
  SPU: (props?: Partial<EventBadgeProps>) => (
    <EventBadge
      eventCode="SPU"
      eventName="スーパーポイントアップ"
      urgencyLevel="medium"
      backgroundColor="#ff4444"
      pointMultiplier={2}
      {...props}
    />
  ),
  
  FIVE_ZERO: (props?: Partial<EventBadgeProps>) => (
    <EventBadge
      eventCode="5-0-day"
      eventName="5と0の日"
      urgencyLevel="high"
      backgroundColor="#ff6600"
      pointMultiplier={5}
      {...props}
    />
  ),
  
  SUPER_SALE: (props?: Partial<EventBadgeProps>) => (
    <EventBadge
      eventCode="SUPER_SALE"
      eventName="スーパーSALE"
      urgencyLevel="critical"
      backgroundColor="#ff0000"
      pointMultiplier={10}
      animated={true}
      {...props}
    />
  ),
  
  OKAIMONO: (props?: Partial<EventBadgeProps>) => (
    <EventBadge
      eventCode="OKAIMONO"
      eventName="お買い物マラソン"
      urgencyLevel="medium"
      backgroundColor="#0066cc"
      pointMultiplier={3}
      {...props}
    />
  )
};

export default EventBadge;