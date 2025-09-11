# Urepli API Documentation

## Overview

The Urepli API provides comprehensive endpoints for social media automation, content generation, affiliate marketing, and analytics. All endpoints support JSON requests and responses with JWT-based authentication.

## Base URL
```
Production: https://api.urepli.com/v1
Development: http://localhost:3000/api
```

## Authentication

### JWT Token Authentication
```bash
# Include in all requests
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

### Getting an Access Token
```bash
POST /auth/login
{
  "email": "user@example.com", 
  "password": "secure_password"
}

# Response
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "role": "premium"
  },
  "expiresIn": "24h"
}
```

## Content Generation

### Generate AI Content
```bash
POST /content/generate
```

**Request Body:**
```json
{
  "theme": "スマートフォン比較",
  "platform": "tiktok",
  "contentType": "video_script",
  "duration": 30,
  "language": "japanese",
  "tone": "enthusiastic",
  "targetAudience": "young_adults",
  "includeAffiliate": true,
  "affiliateCategories": ["electronics", "mobile"],
  "customPrompt": "最新iPhone vs Android比較"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "content_abc123",
    "script": "今日は最新スマートフォンを比較します！...",
    "title": "2024年最新！iPhone vs Android徹底比較",
    "description": "どちらがコスパ最強？詳細レビュー",
    "hashtags": ["#スマホ", "#比較", "#レビュー", "#iPhone", "#Android"],
    "duration": 30,
    "affiliateProducts": [
      {
        "name": "iPhone 15 Pro",
        "price": "¥159,800",
        "commission": "¥2,500",
        "link": "https://a8.net/affiliate/link/..."
      }
    ],
    "thumbnail": {
      "url": "https://cdn.urepli.com/thumbnails/thumb_123.jpg",
      "alt": "iPhone vs Android comparison"
    }
  },
  "metadata": {
    "generatedAt": "2024-01-15T10:30:00Z",
    "model": "gemini-pro",
    "processingTime": "2.3s"
  }
}
```

### Generate Video from Script
```bash
POST /content/video/generate
```

**Request Body:**
```json
{
  "script": "今日は最新スマートフォンを比較します！",
  "style": "modern_japanese",
  "duration": 30,
  "aspectRatio": "9:16",
  "voiceOver": {
    "enabled": true,
    "voice": "japanese_female_young",
    "speed": 1.0
  },
  "visuals": {
    "backgroundType": "gradient",
    "textAnimation": "fade_in",
    "includeSubtitles": true
  },
  "branding": {
    "watermark": true,
    "colorScheme": "brand_colors"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "videoId": "video_xyz789",
    "status": "processing",
    "estimatedTime": "3-5 minutes",
    "downloadUrl": null,
    "preview": {
      "thumbnailUrl": "https://cdn.urepli.com/previews/preview_xyz789.jpg",
      "duration": 30
    }
  },
  "webhookUrl": "https://your-webhook.com/video-ready"
}
```

### Get Video Generation Status
```bash
GET /content/video/{videoId}/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "videoId": "video_xyz789",
    "status": "completed",
    "progress": 100,
    "downloadUrl": "https://cdn.urepli.com/videos/video_xyz789.mp4",
    "thumbnailUrl": "https://cdn.urepli.com/thumbnails/thumb_xyz789.jpg",
    "metadata": {
      "duration": 30.5,
      "resolution": "1080x1920",
      "fileSize": "15.2MB",
      "format": "mp4"
    }
  }
}
```

## Social Media Management

### Multi-Platform Posting
```bash
POST /social/post
```

**Request Body:**
```json
{
  "content": {
    "type": "video",
    "mediaUrl": "https://cdn.urepli.com/videos/video_xyz789.mp4",
    "thumbnailUrl": "https://cdn.urepli.com/thumbnails/thumb_xyz789.jpg",
    "caption": "最新スマートフォン比較！どちらがお得？\n\n詳細レビューはプロフィールから👆\n\n#スマホ #比較 #レビュー",
    "duration": 30
  },
  "platforms": ["tiktok", "instagram", "youtube"],
  "accounts": ["account_tiktok_1", "account_ig_main", "account_yt_channel"],
  "scheduling": {
    "publishNow": false,
    "scheduledTime": "2024-01-15T18:00:00Z",
    "timezone": "Asia/Tokyo"
  },
  "optimization": {
    "autoOptimize": true,
    "platformSpecific": {
      "tiktok": {
        "includeEffects": true,
        "autoHashtags": true
      },
      "instagram": {
        "postToStory": true,
        "enableShopping": false
      },
      "youtube": {
        "category": "Science & Technology",
        "visibility": "public"
      }
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "postId": "post_abc123",
    "results": [
      {
        "platform": "tiktok",
        "account": "account_tiktok_1",
        "status": "published",
        "postUrl": "https://tiktok.com/@user/video/123456789",
        "postId": "7123456789",
        "publishedAt": "2024-01-15T18:00:00Z"
      },
      {
        "platform": "instagram",
        "account": "account_ig_main", 
        "status": "scheduled",
        "scheduledFor": "2024-01-15T18:00:00Z",
        "postId": "pending_ig_456"
      },
      {
        "platform": "youtube",
        "account": "account_yt_channel",
        "status": "processing",
        "postId": "upload_yt_789",
        "estimatedPublishTime": "2024-01-15T18:05:00Z"
      }
    ],
    "summary": {
      "totalPlatforms": 3,
      "successful": 1,
      "scheduled": 1,
      "processing": 1,
      "failed": 0
    }
  }
}
```

### Account Management
```bash
GET /social/accounts
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accounts": [
      {
        "id": "account_tiktok_1",
        "platform": "tiktok",
        "username": "@tech_reviewer_jp",
        "displayName": "Tech Reviewer Japan",
        "status": "active",
        "health": {
          "score": 95,
          "lastActivity": "2024-01-15T17:30:00Z",
          "violations": 0,
          "restrictions": false
        },
        "metrics": {
          "followers": 45780,
          "following": 234,
          "posts": 156,
          "engagementRate": 8.5
        },
        "automation": {
          "enabled": true,
          "dailyPostLimit": 3,
          "engagementRate": "medium"
        }
      }
    ],
    "summary": {
      "total": 8,
      "active": 7,
      "restricted": 0,
      "pending": 1
    }
  }
}
```

### Engagement Automation
```bash
POST /social/engage
```

**Request Body:**
```json
{
  "action": "auto_engagement",
  "platforms": ["tiktok", "instagram"],
  "targets": {
    "hashtags": ["#tech", "#スマホ", "#レビュー"],
    "users": ["@competitor1", "@influencer2"],
    "locations": ["Tokyo", "Osaka"]
  },
  "engagement": {
    "likes": {
      "enabled": true,
      "rate": 50,
      "randomDelay": "30-180s"
    },
    "follows": {
      "enabled": true,
      "rate": 20,
      "unfollowAfter": "7d"
    },
    "comments": {
      "enabled": true,
      "rate": 10,
      "templates": ["素晴らしい投稿！", "いいね！", "参考になります"]
    }
  },
  "schedule": {
    "timezone": "Asia/Tokyo",
    "activeHours": ["09:00", "22:00"],
    "pauseDays": ["sunday"]
  }
}
```

## Affiliate Marketing

### Search Products
```bash
GET /affiliate/products/search
```

**Query Parameters:**
```
?category=electronics
&platform=a8net
&minCommission=1000
&maxPrice=50000
&sortBy=commission
&sortOrder=desc
&limit=20
&keyword=スマートフォン
```

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "a8_product_123",
        "platform": "a8net",
        "name": "iPhone 15 Pro 128GB",
        "description": "最新iPhone 15 Pro...",
        "price": {
          "amount": 159800,
          "currency": "JPY",
          "formatted": "¥159,800"
        },
        "commission": {
          "amount": 2500,
          "rate": 1.56,
          "type": "percentage"
        },
        "merchant": {
          "name": "Apple Store Japan",
          "rating": 4.8
        },
        "images": [
          "https://cdn.affiliate.com/iphone15pro_main.jpg"
        ],
        "category": "electronics",
        "tags": ["smartphone", "apple", "premium"],
        "performance": {
          "conversionRate": 3.2,
          "averageOrderValue": 159800,
          "clicks30d": 1250
        }
      }
    ],
    "pagination": {
      "total": 157,
      "page": 1,
      "limit": 20,
      "hasNext": true
    }
  }
}
```

### Generate Affiliate Links
```bash
POST /affiliate/links/generate
```

**Request Body:**
```json
{
  "productId": "a8_product_123",
  "platform": "a8net",
  "customParams": {
    "source": "tiktok_video",
    "campaign": "smartphone_comparison_2024",
    "medium": "social_video"
  },
  "trackingId": "track_abc123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "linkId": "link_abc123",
    "shortUrl": "https://urepli.link/abc123",
    "fullUrl": "https://a8.net/affiliate/...",
    "qrCode": "https://cdn.urepli.com/qr/abc123.png",
    "tracking": {
      "enabled": true,
      "trackingId": "track_abc123",
      "analytics": "https://dashboard.urepli.com/links/abc123"
    },
    "expires": "2024-12-31T23:59:59Z"
  }
}
```

### Track Performance
```bash
GET /affiliate/performance
```

**Query Parameters:**
```
?timeframe=30d
&platform=all
&metric=revenue
&groupBy=day
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalClicks": 15670,
      "totalConversions": 478,
      "totalRevenue": 2856000,
      "totalCommission": 156780,
      "conversionRate": 3.05,
      "averageOrderValue": 5975
    },
    "byPlatform": {
      "a8net": {
        "clicks": 8450,
        "conversions": 267,
        "revenue": 1634000,
        "commission": 89870
      },
      "rakuten": {
        "clicks": 4230,
        "conversions": 134,
        "revenue": 789000,
        "commission": 43450
      },
      "amazon": {
        "clicks": 2990,
        "conversions": 77,
        "revenue": 433000,
        "commission": 23460
      }
    },
    "topProducts": [
      {
        "productId": "a8_product_123",
        "name": "iPhone 15 Pro",
        "clicks": 2340,
        "conversions": 78,
        "revenue": 456000,
        "commission": 25680
      }
    ],
    "timeline": [
      {
        "date": "2024-01-15",
        "clicks": 567,
        "conversions": 18,
        "revenue": 89500,
        "commission": 4890
      }
    ]
  }
}
```

## Analytics & Insights

### Performance Dashboard
```bash
GET /analytics/dashboard
```

**Query Parameters:**
```
?timeframe=7d
&platforms=tiktok,instagram
&accounts=account_1,account_2
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalPosts": 42,
      "totalViews": 1250000,
      "totalEngagements": 125000,
      "engagementRate": 10.0,
      "newFollowers": 2340,
      "revenue": 156000,
      "roi": 4.2
    },
    "byPlatform": {
      "tiktok": {
        "posts": 25,
        "views": 890000,
        "likes": 89000,
        "shares": 12000,
        "comments": 3400,
        "followers": 45780,
        "newFollowers": 1560
      },
      "instagram": {
        "posts": 17,
        "views": 360000,
        "likes": 18000,
        "shares": 2100,
        "comments": 890,
        "followers": 23450,
        "newFollowers": 780
      }
    },
    "topPosts": [
      {
        "postId": "post_abc123",
        "platform": "tiktok",
        "title": "iPhone vs Android比較",
        "publishedAt": "2024-01-14T18:00:00Z",
        "views": 156000,
        "engagements": 15600,
        "engagementRate": 10.0,
        "revenue": 12500
      }
    ],
    "insights": [
      {
        "type": "trend",
        "message": "TikTokの投稿が平均より30%高いエンゲージメント率",
        "confidence": 0.85
      },
      {
        "type": "recommendation", 
        "message": "18:00-20:00の投稿時間が最も効果的",
        "confidence": 0.92
      }
    ]
  }
}
```

### Content Performance Analysis
```bash
GET /analytics/content/{contentId}/performance
```

**Response:**
```json
{
  "success": true,
  "data": {
    "contentId": "content_abc123",
    "title": "iPhone vs Android比較",
    "publishedAt": "2024-01-14T18:00:00Z",
    "platforms": {
      "tiktok": {
        "postUrl": "https://tiktok.com/@user/video/123",
        "views": 156000,
        "likes": 15600,
        "shares": 2100,
        "comments": 450,
        "playTime": {
          "average": 18.5,
          "completion": 62
        }
      },
      "instagram": {
        "postUrl": "https://instagram.com/p/ABC123",
        "views": 45000,
        "likes": 4500,
        "shares": 320,
        "comments": 180,
        "saves": 890
      }
    },
    "demographics": {
      "age": {
        "18-24": 35,
        "25-34": 42,
        "35-44": 18,
        "45+": 5
      },
      "gender": {
        "male": 58,
        "female": 42
      },
      "location": {
        "Tokyo": 28,
        "Osaka": 15,
        "Nagoya": 8,
        "Other": 49
      }
    },
    "affiliatePerformance": {
      "clicks": 1240,
      "conversions": 38,
      "revenue": 456000,
      "commission": 25680,
      "conversionRate": 3.06
    }
  }
}
```

## Automation & Workflows

### Create Automation Campaign
```bash
POST /automation/campaigns
```

**Request Body:**
```json
{
  "name": "Japanese Tech Review Campaign",
  "description": "Automated tech product reviews for Japanese market",
  "settings": {
    "frequency": "daily",
    "postsPerDay": 2,
    "platforms": ["tiktok", "instagram", "youtube"],
    "contentTypes": ["product_review", "comparison", "unboxing"]
  },
  "targeting": {
    "demographics": {
      "country": "JP",
      "age": [18, 45],
      "interests": ["technology", "smartphones", "gadgets"]
    },
    "keywords": ["スマホ", "レビュー", "比較", "新製品"],
    "hashtags": ["#tech", "#review", "#smartphone"]
  },
  "content": {
    "themes": [
      "最新スマートフォン比較",
      "ガジェットレビュー", 
      "コスパ最強製品紹介"
    ],
    "tone": "enthusiastic",
    "language": "japanese",
    "includeAffiliate": true
  },
  "schedule": {
    "timezone": "Asia/Tokyo",
    "postingTimes": ["12:00", "19:00"],
    "excludeDays": ["sunday"],
    "endDate": "2024-06-30"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "campaignId": "campaign_abc123",
    "status": "active",
    "createdAt": "2024-01-15T10:00:00Z",
    "nextExecution": "2024-01-16T12:00:00Z",
    "estimatedPosts": 300,
    "estimatedReach": 2500000,
    "budget": {
      "estimated": 150000,
      "currency": "JPY"
    }
  }
}
```

### Get Campaign Status
```bash
GET /automation/campaigns/{campaignId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "campaignId": "campaign_abc123",
    "name": "Japanese Tech Review Campaign",
    "status": "active",
    "progress": {
      "totalPosts": 42,
      "successfulPosts": 40,
      "failedPosts": 2,
      "scheduledPosts": 15
    },
    "performance": {
      "totalViews": 1500000,
      "totalEngagements": 150000,
      "newFollowers": 3200,
      "revenue": 245000,
      "roi": 3.8
    },
    "nextActions": [
      {
        "type": "content_generation",
        "scheduledFor": "2024-01-16T11:00:00Z",
        "theme": "新作スマートフォンレビュー"
      },
      {
        "type": "posting",
        "scheduledFor": "2024-01-16T12:00:00Z",
        "platforms": ["tiktok", "instagram"]
      }
    ]
  }
}
```

## Webhooks

### Register Webhook
```bash
POST /webhooks/register
```

**Request Body:**
```json
{
  "url": "https://your-app.com/webhook/urepli",
  "events": [
    "content.generated",
    "video.ready", 
    "post.published",
    "post.failed",
    "engagement.milestone",
    "campaign.completed"
  ],
  "secret": "your_webhook_secret"
}
```

### Webhook Events

#### Content Generated
```json
{
  "event": "content.generated",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "contentId": "content_abc123",
    "type": "video_script",
    "title": "iPhone vs Android比較",
    "status": "completed"
  }
}
```

#### Post Published
```json
{
  "event": "post.published",
  "timestamp": "2024-01-15T18:00:00Z", 
  "data": {
    "postId": "post_abc123",
    "platform": "tiktok",
    "account": "account_tiktok_1",
    "postUrl": "https://tiktok.com/@user/video/123456789"
  }
}
```

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid platform specified",
    "details": {
      "field": "platforms",
      "validValues": ["tiktok", "instagram", "youtube", "facebook"]
    }
  },
  "requestId": "req_abc123"
}
```

### Common Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Invalid request parameters |
| `UNAUTHORIZED` | 401 | Invalid or missing authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `PLATFORM_ERROR` | 502 | External platform error |
| `CONTENT_GENERATION_FAILED` | 503 | AI content generation failed |
| `AUTOMATION_PAUSED` | 503 | Automation temporarily paused |

## Rate Limits

### Default Limits
| Endpoint Category | Requests per Hour | Requests per Day |
|------------------|-------------------|------------------|
| Content Generation | 100 | 500 |
| Social Media Posting | 200 | 1000 |
| Analytics | 500 | 5000 |
| Affiliate API | 300 | 2000 |
| Webhooks | 1000 | 10000 |

### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642271400
X-RateLimit-Retry-After: 3600
```

## SDKs and Libraries

### JavaScript/Node.js
```bash
npm install @urepli/sdk
```

```javascript
import { UrepliSDK } from '@urepli/sdk';

const urepli = new UrepliSDK({
  apiKey: 'your_api_key',
  baseUrl: 'https://api.urepli.com/v1'
});

// Generate content
const content = await urepli.content.generate({
  theme: 'スマートフォン比較',
  platform: 'tiktok',
  language: 'japanese'
});

// Post to social media
const post = await urepli.social.post({
  content: content,
  platforms: ['tiktok', 'instagram']
});
```

### Python
```bash
pip install urepli-sdk
```

```python
from urepli import UrepliSDK

urepli = UrepliSDK(
    api_key='your_api_key',
    base_url='https://api.urepli.com/v1'
)

# Generate content
content = urepli.content.generate(
    theme='スマートフォン比較',
    platform='tiktok',
    language='japanese'
)

# Post to social media
post = urepli.social.post(
    content=content,
    platforms=['tiktok', 'instagram']
)
```

This comprehensive API documentation covers all major endpoints and functionality of the Urepli platform, providing developers with everything needed to integrate and build upon the automation capabilities.