import React from 'react';
import { Calendar, Zap, Star } from 'lucide-react';

interface EventBadgeProps {
  code: 'SPU' | '5-0-day' | 'SUPER_SALE' | 'OKAIMONO' | 'OTHER';
  badgeText: string;
  pointsMultiplier?: number;
  urgencyLevel: 'low' | 'medium' | 'high';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const EventBadge: React.FC<EventBadgeProps> = ({
  code,
  badgeText,
  pointsMultiplier,
  urgencyLevel,
  size = 'md',
  className = ''
}) => {
  const getEventStyles = () => {
    switch (code) {
      case 'SUPER_SALE':
        return {
          container: 'bg-gradient-to-r from-red-500 to-red-600 text-white border-red-700',
          icon: <Zap className="w-4 h-4" />,
          pulse: urgencyLevel === 'high'
        };
      case 'OKAIMONO':
        return {
          container: 'bg-gradient-to-r from-purple-500 to-purple-600 text-white border-purple-700',
          icon: <Star className="w-4 h-4" />,
          pulse: urgencyLevel === 'high'
        };
      case 'SPU':
        return {
          container: 'bg-gradient-to-r from-orange-500 to-orange-600 text-white border-orange-700',
          icon: <Star className="w-4 h-4" />,
          pulse: false
        };
      case '5-0-day':
        return {
          container: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-700',
          icon: <Calendar className="w-4 h-4" />,
          pulse: false
        };
      default:
        return {
          container: 'bg-gray-500 text-white border-gray-600',
          icon: <Calendar className="w-4 h-4" />,
          pulse: false
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs';
      case 'lg':
        return 'px-6 py-3 text-lg';
      default:
        return 'px-4 py-2 text-sm';
    }
  };

  const getUrgencyStyles = () => {
    if (urgencyLevel === 'high') {
      return 'animate-pulse shadow-lg';
    }
    return 'shadow-md';
  };

  const styles = getEventStyles();
  const sizeStyles = getSizeStyles();
  const urgencyStyles = getUrgencyStyles();

  return (
    <div 
      className={`
        inline-flex items-center space-x-2 rounded-lg font-bold border-2 
        ${styles.container} ${sizeStyles} ${urgencyStyles} ${className}
      `}
    >
      {styles.icon}
      <span>{badgeText}</span>
      {pointsMultiplier && (
        <span className="bg-white bg-opacity-20 px-2 py-0.5 rounded text-xs font-extrabold">
          {pointsMultiplier}倍
        </span>
      )}
      
      {styles.pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
        </span>
      )}
    </div>
  );
};

// Pre-configured event badges for common scenarios
export const SuperSaleBadge: React.FC<{ pointsMultiplier?: number }> = ({ pointsMultiplier = 3 }) => (
  <EventBadge
    code="SUPER_SALE"
    badgeText="楽天スーパーSALE開催中！"
    pointsMultiplier={pointsMultiplier}
    urgencyLevel="high"
  />
);

export const FiveZeroDayBadge: React.FC = () => (
  <EventBadge
    code="5-0-day"
    badgeText="本日「5と0」の日"
    pointsMultiplier={2}
    urgencyLevel="medium"
  />
);

export const SPUBadge: React.FC<{ pointsMultiplier?: number }> = ({ pointsMultiplier = 16 }) => (
  <EventBadge
    code="SPU"
    badgeText={`今月ポイント+${pointsMultiplier}倍`}
    pointsMultiplier={pointsMultiplier}
    urgencyLevel="medium"
  />
);

export const OkaimonoBadge: React.FC<{ pointsMultiplier?: number }> = ({ pointsMultiplier = 10 }) => (
  <EventBadge
    code="OKAIMONO"
    badgeText="お買い物マラソン開催中！"
    pointsMultiplier={pointsMultiplier}
    urgencyLevel="high"
  />
);