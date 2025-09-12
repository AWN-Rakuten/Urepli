# Japanese Affiliate Revenue Optimization Guide

## Overview

This guide covers the comprehensive Japanese affiliate marketing features implemented in Urepli, designed to maximize revenue through intelligent network routing, event-aware posting, and compliance automation.

## Features

### 1. Multi-Network Integration

#### Supported Networks
- **Rakuten Ichiba** - Japan's largest e-commerce platform
- **Yahoo! Shopping** - Yahoo Japan's shopping platform  
- **Amazon Japan** - Amazon's Japanese marketplace
- **ValueCommerce** - Affiliate network (planned)
- **A8.net** - Japan's largest affiliate service provider (planned)

#### API Configuration

Add these environment variables to your `.env` file:

```bash
# Rakuten Affiliate Program
RAKUTEN_APPLICATION_ID=your_application_id
RAKUTEN_AFFILIATE_ID=your_affiliate_id

# Yahoo Shopping API  
YAHOO_APP_ID=your_app_id

# Amazon Product Advertising API (Japan)
AMAZON_PAAPI_ACCESS_KEY=your_access_key
AMAZON_PAAPI_SECRET_KEY=your_secret_key
AMAZON_ASSOCIATE_TAG=your_associate_tag

# LINE Messaging API (for notifications)
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
LINE_CHANNEL_SECRET=your_channel_secret
```

### 2. Expected Revenue per Click (eRPC) Optimization

The system automatically calculates eRPC for each offer using:

```
eRPC = price_jpy × (commission_bps / 10000) × cvr_proxy
```

- **price_jpy**: Product price in Japanese Yen
- **commission_bps**: Commission rate in basis points (300 = 3%)
- **cvr_proxy**: Conversion rate proxy learned from historical data

#### Usage Example

```javascript
// Search and get best eRPC offers
const offers = await getBestOfferByERPC('iPhone', 10);

// Calculate eRPC for a specific offer
const erpc = calculateERPC({
  price_jpy: 50000,
  commission_bps: 300,  // 3%
  cvr_proxy: 0.04      // 4% conversion rate
});
// Result: eRPC = 50000 × 0.03 × 0.04 = ¥60
```

### 3. Thompson Sampling Bandit Optimization

Automatically learns which affiliate links perform best for each post using Thompson Sampling.

#### API Usage

```javascript
// Choose best variant for a post
const variantId = await thompsonSamplingBandit.chooseVariant('post_123');

// Record metrics for learning
await thompsonSamplingBandit.recordClick(variantId);
await thompsonSamplingBandit.recordConversion(variantId, 1500); // ¥1500 revenue
```

### 4. Japanese Event Orchestration

#### Supported Events

1. **5と0の日** (5 & 0 Days)
   - 5th, 10th, 15th, 20th, 25th, 30th of each month
   - Rakuten Card users get 2x points
   - Auto-populated for next 3 months

2. **SPU (Super Point Up Program)**
   - Monthly Rakuten point multiplier campaigns
   - Typically 15-20x points when conditions met

3. **楽天スーパーSALE (Rakuten Super Sale)**
   - Quarterly major sale events
   - Up to 50% discounts + point multipliers

4. **お買い物マラソン (Shopping Marathon)**
   - Monthly campaign with progressive point multipliers
   - Up to 10x points for multiple shop purchases

#### Event Management

```javascript
// Check active events
const activeEvents = await eventsOrchestrator.getActiveEvents();

// Get boost settings for current events  
const boostSettings = await eventsOrchestrator.getEventBoostSettings();
// Returns: { posting_multiplier: 2.5, badge_text: '楽天スーパーSALE開催中！', urgency_level: 'high' }

// Populate 5と0の日 events
await eventsOrchestrator.populateFiveZeroDays(3); // Next 3 months
```

### 5. Compliance Automation

Automatically handles Japanese stealth marketing regulations (ステマ規制) effective October 2023.

#### Required Disclosures

```javascript
// Generate compliant disclosure
const disclosure = complianceService.getJapaneseDisclosure({
  networks: ['rakuten', 'amazon'],
  platform: 'instagram',
  include_amazon_associates: true
});

// Result for Instagram:
// "【PR】本コンテンツには広告（アフィリエイトリンク）を含みます。 As an Amazon Associate I earn from qualifying purchases."
```

#### Auto-Injection

```javascript
const content = "Check out this great iPhone deal!";
const compliantContent = complianceService.injectDisclosure(content, {
  networks: ['rakuten'],
  platform: 'tiktok'
});

// Result:
// "#PR #広告 本コンテンツには広告（アフィリエイトリンク）を含みます。\n\nCheck out this great iPhone deal!"
```

### 6. LINE Messaging Integration

Send targeted deal notifications via LINE with rich Flex messages.

#### Deal Notifications

```javascript
// Send deal notification
await lineService.sendDealNotification('user_id', {
  title: 'iPhone 15 Pro 最安値！',
  price: 159800,
  original_price: 179800,
  shop_name: '楽天市場',
  affiliate_url: 'https://affiliate.rakuten.co.jp/...',
  image_url: 'https://image.url/iphone.jpg',
  badge_text: '楽天スーパーSALE',
  discount_percentage: 11,
  points_multiplier: 10
});
```

#### Broadcast to Multiple Users

```javascript
const users = ['user1', 'user2', 'user3'];
const result = await lineService.broadcastDeal(users, dealData);
// Returns: { sent: 2, failed: 1 }
```

## API Endpoints

### Core Affiliate APIs

#### `GET /api/affiliate/search`
Search offers across networks with eRPC optimization.

**Parameters:**
- `keyword` (required): Search term
- `limit`: Max results (default: 10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "offer_123",
      "network_name": "rakuten", 
      "title": "iPhone 15 Pro",
      "price_jpy": 159800,
      "commission_bps": 300,
      "affiliate_url": "https://...",
      "eRPC": 1917.6,
      "commission": 4794
    }
  ]
}
```

#### `GET /api/affiliate/best-offer`
Get bandit-optimized link for a specific post.

**Parameters:**
- `postId` (required): Post identifier
- `keyword` (optional): Fallback search term

#### `POST /api/affiliate/record-metric`
Record click/conversion for bandit learning.

**Body:**
```json
{
  "variant_id": "variant_123",
  "type": "conversion",
  "revenue_jpy": 1500
}
```

### Event Management APIs

#### `GET /api/affiliate/events/active`
Get currently active Japanese shopping events.

#### `GET /api/affiliate/events/calendar`
Get upcoming events calendar.

#### `POST /api/affiliate/events/populate-5-0-days`
Populate 5と0の日 events.

### Compliance APIs  

#### `POST /api/affiliate/compliance/check`
Validate content compliance.

#### `POST /api/affiliate/compliance/inject`
Auto-inject required disclosures.

#### `GET /api/affiliate/compliance/guidelines/:platform`
Get platform-specific compliance guidelines.

## n8n Workflow Integration

### Pre-built Templates

#### 1. Daily Trend Discovery
- **Schedule**: 05:00 JST daily
- **Flow**: Trends → Best Offers → AI Content → Compliance → Social Post

#### 2. Event Day Boost  
- **Schedule**: 04:30, 09:30, 19:30 JST on event days
- **Flow**: Check Events → LINE Broadcast → Boosted Posting

#### 3. Nightly Learning
- **Schedule**: 02:00 JST daily  
- **Flow**: Update CVR → Retrain Bandits → Performance Report

### Manual Workflow Triggers

```javascript
// Trigger affiliate content generation
const response = await fetch('/api/n8n/trigger/affiliate-content', {
  method: 'POST',
  body: JSON.stringify({
    keyword: 'Nintendo Switch',
    target_platforms: ['instagram', 'tiktok'],
    event_boost: true
  })
});
```

## Frontend Components

### AffiliateHub Component

```jsx
import { AffiliateHub } from './components/affiliate/AffiliateHub';

function Dashboard() {
  return (
    <div>
      <AffiliateHub />
    </div>
  );
}
```

### Event Badges

```jsx
import { 
  SuperSaleBadge, 
  FiveZeroDayBadge, 
  SPUBadge, 
  EventBadge 
} from './components/affiliate/EventBadge';

// Pre-configured badges
<SuperSaleBadge pointsMultiplier={3} />
<FiveZeroDayBadge />
<SPUBadge pointsMultiplier={16} />

// Custom badge
<EventBadge 
  code="OKAIMONO"
  badgeText="お買い物マラソン開催中！"
  pointsMultiplier={10}
  urgencyLevel="high" 
/>
```

## Setup Instructions

### 1. Database Migration

```bash
npm run db:push
```

### 2. Populate Initial Events

```bash
npx tsx scripts/populate-events.ts
```

### 3. Test API Credentials

```bash
# Test Rakuten API
curl "http://localhost:3000/api/affiliate/rakuten/search?keyword=iPhone&hits=5"

# Test multi-network search
curl "http://localhost:3000/api/affiliate/multi-search?keyword=Nintendo&networks[]=rakuten&networks[]=amazon"
```

### 4. Configure n8n Workflows

Import the workflow template:
```bash
# In n8n interface, import:
data/n8n-templates/jp-affiliate-flywheel.json
```

## Performance Monitoring

### Key Metrics to Track

1. **eRPC by Network**: Track which networks provide best revenue
2. **Conversion Rates**: Monitor CVR proxy accuracy  
3. **Event Performance**: Revenue lift during Japanese events
4. **Compliance Score**: Ensure all content has required disclosures
5. **Bandit Performance**: A/B test win rates and confidence intervals

### Analytics Endpoints

```javascript
// Network performance (last 30 days)
const networkStats = await fetch('/api/affiliate/analytics/networks?days=30');

// Variant performance for specific post  
const variantStats = await fetch('/api/affiliate/analytics/variants?postId=post_123');
```

## Best Practices

### 1. Event Timing
- Schedule posts 1-2 hours before peak shopping times
- Increase posting frequency by 1.5-2.5x during events
- Use urgency messaging during Super Sale periods

### 2. Compliance
- Always include disclosure at content beginning for visual platforms
- Use platform-specific disclosure formats
- Monitor CAA guidance updates for regulation changes

### 3. Link Optimization  
- Let bandit learn for at least 100 clicks before trusting results
- Update CVR proxies weekly based on actual conversion data
- Test multiple creative variants per offer

### 4. Network Selection
- Prioritize Rakuten for Japanese consumers (highest trust)
- Use Amazon for international products and Prime-eligible items
- Yahoo Shopping for competitive pricing comparison

## Troubleshooting

### Common Issues

**API Rate Limits**
- Implement exponential backoff for API calls
- Use bulk operations where available
- Cache results for popular search terms

**Compliance Failures**  
- Check disclosure text matches current CAA requirements
- Ensure Amazon Associates disclosure for all Amazon links
- Verify platform-specific formatting requirements

**Low Conversion Rates**
- Review landing page experience  
- Check affiliate link tracking setup
- Verify attribution window settings

### Debug Mode

Enable debug logging:
```bash
DEBUG=affiliate:* npm run dev
```

## Legal Considerations

### Japanese Stealth Marketing Rules (ステマ規制)
- Effective October 1, 2023
- Requires clear disclosure of paid partnerships
- Applies to all affiliate content creation
- Non-compliance can result in business orders from CAA

### Affiliate Network Terms
- Respect each network's posting frequency limits
- Follow brand usage guidelines  
- Maintain required disclosure placement
- Monitor for policy updates regularly

For the latest compliance guidance, refer to:
- [Consumer Affairs Agency (CAA)](https://www.caa.go.jp/policies/policy/representation/fair_labeling/stealth_marketing/)
- [Amazon Associates Operating Agreement](https://affiliate.amazon.co.jp/help/operating/agreement)
- [Rakuten Affiliate Terms](https://affiliate.rakuten.co.jp/rule/)