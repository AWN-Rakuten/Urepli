/**
 * Short-form Content Presets for TikTok/Instagram Reels/YouTube Shorts
 * Japanese market optimized templates
 */

export interface ShortsPreset {
  id: string;
  name: string;
  description: string;
  format: 'vertical' | 'square';
  duration: number; // seconds
  segments: ShortsSegment[];
  jpOptimizations: JPOptimization;
}

export interface ShortsSegment {
  name: string;
  duration: number;
  description: string;
  shotType: string;
  jpText?: string;
  transitions: string[];
}

export interface JPOptimization {
  subtitleBurnIn: boolean;
  faceFirstFrame: boolean;
  soundStrategy: 'trending' | 'original' | 'silent';
  hashtagStrategy: 'trend-heavy' | 'searchable' | 'mixed';
  eventBadgeSupport: boolean;
}

/**
 * Core Japanese market presets
 */
export const shortsPresets: ShortsPreset[] = [
  {
    id: 'jp-viral-unboxing',
    name: 'Japanese Viral Unboxing',
    description: 'Product unboxing optimized for Japanese audience with face-first approach',
    format: 'vertical',
    duration: 20,
    segments: [
      {
        name: 'Hook - Face + Product',
        duration: 2,
        description: 'Close-up of face holding product with surprised expression',
        shotType: 'close-up',
        jpText: '今日はこれを開封！',
        transitions: ['quick-cut', 'zoom-in']
      },
      {
        name: 'Open Loop - Preview',
        duration: 3,
        description: 'Quick preview of what\'s inside/result without revealing all',
        shotType: 'medium',
        jpText: 'まさかこんなものが...',
        transitions: ['fade', 'slide']
      },
      {
        name: 'Unboxing Demo',
        duration: 10,
        description: 'Hands-on unboxing with reaction shots',
        shotType: 'top-down',
        jpText: 'パッケージから出すと...',
        transitions: ['cut', 'dissolve']
      },
      {
        name: 'Result + CTA',
        duration: 5,
        description: 'Final result with call-to-action and affiliate link mention',
        shotType: 'medium',
        jpText: 'リンクは概要欄に',
        transitions: ['fade-out']
      }
    ],
    jpOptimizations: {
      subtitleBurnIn: true,
      faceFirstFrame: true,
      soundStrategy: 'trending',
      hashtagStrategy: 'mixed',
      eventBadgeSupport: true
    }
  },

  {
    id: 'jp-before-after',
    name: 'Japanese Before/After Transformation',
    description: 'Before/after format popular in Japanese beauty/lifestyle content',
    format: 'vertical',
    duration: 25,
    segments: [
      {
        name: 'Hook - Problem State',
        duration: 2,
        description: 'Show the "before" state with concerned expression',
        shotType: 'close-up',
        jpText: 'この悩み、解決したい',
        transitions: ['quick-cut']
      },
      {
        name: 'Solution Introduction',
        duration: 3,
        description: 'Introduce the product as solution',
        shotType: 'medium',
        jpText: 'これを使ってみた結果...',
        transitions: ['slide', 'zoom']
      },
      {
        name: 'Process Demo',
        duration: 12,
        description: 'Show application/usage process step by step',
        shotType: 'various',
        jpText: 'こうやって使います',
        transitions: ['cut', 'dissolve', 'wipe']
      },
      {
        name: 'After Results',
        duration: 5,
        description: 'Reveal transformation with excitement',
        shotType: 'close-up',
        jpText: 'すごい変化！',
        transitions: ['reveal', 'fade']
      },
      {
        name: 'CTA + Disclosure',
        duration: 3,
        description: 'Call to action with proper disclosure',
        shotType: 'medium',
        jpText: '詳細はリンクから',
        transitions: ['fade-out']
      }
    ],
    jpOptimizations: {
      subtitleBurnIn: true,
      faceFirstFrame: true,
      soundStrategy: 'original',
      hashtagStrategy: 'searchable',
      eventBadgeSupport: true
    }
  },

  {
    id: 'jp-price-comparison',
    name: 'Japanese Price Comparison',
    description: 'Price/deal focused content for deal-conscious Japanese market',
    format: 'vertical',
    duration: 15,
    segments: [
      {
        name: 'Hook - Price Shock',
        duration: 2,
        description: 'Shocked reaction to seeing a good price',
        shotType: 'close-up',
        jpText: 'この価格、信じられない！',
        transitions: ['quick-cut']
      },
      {
        name: 'Price Reveal',
        duration: 3,
        description: 'Show the actual price with comparison',
        shotType: 'screen-share',
        jpText: '通常￥XX→今だけ￥XX',
        transitions: ['slide', 'zoom']
      },
      {
        name: 'Product Showcase',
        duration: 7,
        description: 'Quick product features highlighting value',
        shotType: 'product-focused',
        jpText: 'この機能でこの価格',
        transitions: ['cut', 'pan']
      },
      {
        name: 'Urgency CTA',
        duration: 3,
        description: 'Time-sensitive call to action',
        shotType: 'medium',
        jpText: '今すぐチェック！',
        transitions: ['fade-out']
      }
    ],
    jpOptimizations: {
      subtitleBurnIn: true,
      faceFirstFrame: true,
      soundStrategy: 'trending',
      hashtagStrategy: 'trend-heavy',
      eventBadgeSupport: true
    }
  },

  {
    id: 'jp-ranking-review',
    name: 'Japanese Ranking Review',
    description: 'Top 3/5 style review popular in Japanese consumer content',
    format: 'vertical',
    duration: 30,
    segments: [
      {
        name: 'Hook - Ranking Tease',
        duration: 2,
        description: 'Tease the ranking with excitement',
        shotType: 'close-up',
        jpText: 'ベスト3を発表します！',
        transitions: ['quick-cut']
      },
      {
        name: 'Ranking Setup',
        duration: 3,
        description: 'Explain the criteria and setup',
        shotType: 'medium',
        jpText: '実際に使って比較しました',
        transitions: ['slide']
      },
      {
        name: 'Item Reviews',
        duration: 20,
        description: 'Go through each item with pros/cons',
        shotType: 'product-focused',
        jpText: '第◯位は...',
        transitions: ['cut', 'wipe', 'dissolve']
      },
      {
        name: 'Winner + Links',
        duration: 5,
        description: 'Announce winner and provide links',
        shotType: 'medium',
        jpText: '1位はこちら！リンクは概要欄',
        transitions: ['celebration', 'fade-out']
      }
    ],
    jpOptimizations: {
      subtitleBurnIn: true,
      faceFirstFrame: true,
      soundStrategy: 'trending',
      hashtagStrategy: 'mixed',
      eventBadgeSupport: false
    }
  }
];

/**
 * Event-specific preset modifiers for Japanese market events
 */
export const eventPresetModifiers = {
  'SPU': {
    badgeText: 'スーパーポイントアップ',
    urgencyMultiplier: 1.5,
    colorScheme: 'red-gold',
    additionalSegments: [
      {
        name: 'SPU Badge Display',
        duration: 2,
        description: 'Show SPU badge and point multiplier',
        shotType: 'graphics',
        jpText: '今だけポイント◯倍！',
        transitions: ['fade-in', 'bounce']
      }
    ]
  },
  '5-0-day': {
    badgeText: '5と0の日',
    urgencyMultiplier: 2.0,
    colorScheme: 'red-white',
    additionalSegments: [
      {
        name: '5-0 Day Badge',
        duration: 2,
        description: 'Show 5 and 0 day special badge',
        shotType: 'graphics',
        jpText: '5と0の日限定！',
        transitions: ['slide-in', 'pulse']
      }
    ]
  },
  'SUPER_SALE': {
    badgeText: 'スーパーSALE',
    urgencyMultiplier: 2.5,
    colorScheme: 'red-yellow',
    additionalSegments: [
      {
        name: 'Super Sale Badge',
        duration: 3,
        description: 'Show super sale badge with countdown',
        shotType: 'graphics',
        jpText: 'スーパーSALE開催中！',
        transitions: ['zoom-in', 'flash']
      }
    ]
  }
};

/**
 * Get preset by ID
 */
export function getPresetById(id: string): ShortsPreset | undefined {
  return shortsPresets.find(preset => preset.id === id);
}

/**
 * Get presets by format
 */
export function getPresetsByFormat(format: 'vertical' | 'square'): ShortsPreset[] {
  return shortsPresets.filter(preset => preset.format === format);
}

/**
 * Get presets by duration range
 */
export function getPresetsByDuration(minDuration: number, maxDuration: number): ShortsPreset[] {
  return shortsPresets.filter(preset => 
    preset.duration >= minDuration && preset.duration <= maxDuration
  );
}

/**
 * Apply event modifier to preset
 */
export function applyEventModifier(preset: ShortsPreset, eventCode: keyof typeof eventPresetModifiers): ShortsPreset {
  const modifier = eventPresetModifiers[eventCode];
  if (!modifier) return preset;

  return {
    ...preset,
    id: `${preset.id}-${eventCode.toLowerCase()}`,
    name: `${preset.name} (${modifier.badgeText})`,
    duration: Math.ceil(preset.duration * modifier.urgencyMultiplier),
    segments: [
      ...preset.segments,
      ...modifier.additionalSegments
    ]
  };
}

/**
 * Get trending sound recommendations for preset
 */
export function getSoundRecommendations(preset: ShortsPreset): string[] {
  const baseRecommendations = [
    'trending-jp-pop',
    'viral-tiktok-sound', 
    'upbeat-instrumental',
    'calm-background-music'
  ];

  // Customize based on preset type
  if (preset.id.includes('unboxing')) {
    return ['unboxing-music', 'surprise-sound', ...baseRecommendations];
  }
  
  if (preset.id.includes('before-after')) {
    return ['transformation-music', 'reveal-sound', ...baseRecommendations];
  }
  
  if (preset.id.includes('price')) {
    return ['deal-alert-sound', 'exciting-music', ...baseRecommendations];
  }

  return baseRecommendations;
}