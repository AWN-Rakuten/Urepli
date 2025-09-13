# MCP Server API Documentation

## Overview

The Urepli Model Context Protocol (MCP) Server provides a comprehensive, commercial-grade API for social media automation, content generation, and profit optimization. This permanent server integrates AI models, browser automation, and advanced analytics to create a zero-gap monetization system.

## Features

### 🚀 Core Capabilities
- **AI-Powered Content Generation**: Using Google Gemini and optimization algorithms
- **Multi-Platform Social Media Automation**: Browser-based posting without API limitations
- **Advanced Video Generation**: Integration with latest open-source tools
- **n8n Workflow Management**: Visual automation workflow creation
- **Real-Time Profit Analytics**: ML-powered revenue optimization
- **A8.net Affiliate Integration**: Japanese market affiliate automation
- **Referral Campaign System**: Automated referral marketing with tracking
- **Campaign Optimization**: AI-driven performance enhancement

### 🔒 Security & Performance
- **Rate Limiting**: 10 requests/second per client
- **Connection Management**: Up to 1000 concurrent connections
- **Auto-cleanup**: Inactive connection management
- **Error Handling**: Comprehensive error recovery
- **Health Monitoring**: Real-time server health checks

## API Endpoints

### WebSocket Connection
```
ws://localhost:3001/mcp-ws
```

### GUI Dashboard
```
http://localhost:3001/mcp
```

## MCP Protocol Methods

### 1. Initialize Connection

**Method**: `initialize`

**Request**:
```json
{
  "id": "1",
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "clientInfo": {
      "name": "Client Name",
      "version": "1.0.0"
    }
  },
  "jsonrpc": "2.0"
}
```

**Response**:
```json
{
  "id": "1",
  "result": {
    "protocolVersion": "2024-11-05",
    "serverInfo": {
      "name": "Urepli MCP Server - Commercial Grade",
      "version": "1.0.0",
      "description": "Comprehensive social media automation with AI optimization"
    },
    "capabilities": {
      "models": ["gemini-pro", "gemini-vision", "bandit-optimizer"],
      "tools": [
        "social-media-poster",
        "video-generator", 
        "n8n-workflow-creator",
        "browser-automator",
        "profit-calculator",
        "content-optimizer",
        "a8net-integration",
        "referral-generator",
        "campaign-optimizer"
      ],
      "resources": [
        "social-accounts",
        "content-library",
        "automation-templates",
        "analytics-data",
        "optimization-history",
        "affiliate-networks",
        "referral-campaigns"
      ],
      "features": {
        "socialMediaAutomation": true,
        "videoGeneration": true,
        "n8nIntegration": true,
        "browserAutomation": true,
        "profitAnalytics": true,
        "a8netIntegration": true,
        "referralSystem": true,
        "campaignOptimization": true
      }
    }
  },
  "jsonrpc": "2.0"
}
```

### 2. Social Media Automation

**Method**: `tools/call`

**Tool**: `social-media-poster`

**Request**:
```json
{
  "id": "2",
  "method": "tools/call",
  "params": {
    "name": "social-media-poster",
    "arguments": {
      "platform": "tiktok",
      "content": "MNPで月1万円節約！最新キャリア比較情報 #MNP #節約 #格安SIM",
      "accounts": ["@account1", "@account2"],
      "schedule": "2024-01-15T20:00:00+09:00"
    }
  },
  "jsonrpc": "2.0"
}
```

**Response**:
```json
{
  "id": "2",
  "result": {
    "content": {
      "success": true,
      "platform": "tiktok",
      "accountsPosted": 2,
      "scheduled": true,
      "estimatedReach": 5500,
      "message": "Content queued for posting to tiktok"
    }
  },
  "jsonrpc": "2.0"
}
```

### 3. Video Generation

**Method**: `tools/call`

**Tool**: `video-generator`

**Request**:
```json
{
  "id": "3",
  "method": "tools/call",
  "params": {
    "name": "video-generator",
    "arguments": {
      "script": "格安SIMで月額料金を大幅削減！主要キャリアとの比較解説。",
      "style": "modern",
      "voice": "ja-JP-Wavenet-F",
      "platform": "tiktok"
    }
  },
  "jsonrpc": "2.0"
}
```

**Response**:
```json
{
  "id": "3",
  "result": {
    "content": {
      "success": true,
      "originalScript": "格安SIMで月額料金を大幅削減！...",
      "optimizedScript": "【注目】格安SIMで月1万円節約する方法...",
      "style": "modern",
      "voice": "ja-JP-Wavenet-F",
      "estimatedDuration": 45,
      "generationId": "gen_1705123456_abc123"
    }
  },
  "jsonrpc": "2.0"
}
```

### 4. A8.net Integration

**Method**: `a8net/integrate`

**Request**:
```json
{
  "id": "4",
  "method": "a8net/integrate",
  "params": {
    "apiKey": "your_a8net_api_key",
    "partnerConfig": {
      "categories": ["telecom", "finance", "career"],
      "minCommission": 500,
      "autoLinkInsertion": true
    }
  },
  "jsonrpc": "2.0"
}
```

**Response**:
```json
{
  "id": "4",
  "result": {
    "success": true,
    "partnerId": "partner_1705123456_xyz789",
    "availablePrograms": [
      {
        "id": "prog_1",
        "name": "格安SIM比較",
        "commission": "500-2000円",
        "category": "telecom"
      },
      {
        "id": "prog_2",
        "name": "クレジットカード",
        "commission": "3000-15000円",
        "category": "finance"
      }
    ],
    "automationRules": {
      "autoLinkInsertion": true,
      "performanceTracking": true,
      "payoutThreshold": 5000
    }
  },
  "jsonrpc": "2.0"
}
```

### 5. Referral Campaign Creation

**Method**: `referral/create-campaign`

**Request**:
```json
{
  "id": "5",
  "method": "referral/create-campaign",
  "params": {
    "campaignName": "MNP節約紹介キャンペーン",
    "targetAudience": "tech-savvy-professionals",
    "incentiveStructure": {
      "tier1": { "referrals": "1-10", "reward": 500 },
      "tier2": { "referrals": "11-50", "reward": 1000 },
      "tier3": { "referrals": "51+", "reward": 2000 }
    }
  },
  "jsonrpc": "2.0"
}
```

**Response**:
```json
{
  "id": "5",
  "result": {
    "success": true,
    "campaign": {
      "id": "camp_1705123456_ref123",
      "name": "MNP節約紹介キャンペーン",
      "status": "active",
      "referralCode": "REF_1705123456",
      "incentiveStructure": {
        "tier1": { "referrals": "1-10", "reward": 500 },
        "tier2": { "referrals": "11-50", "reward": 1000 },
        "tier3": { "referrals": "51+", "reward": 2000 }
      },
      "automationSettings": {
        "autoShare": true,
        "platforms": ["tiktok", "instagram", "youtube"],
        "contentGeneration": true,
        "performanceTracking": true
      },
      "projectedRevenue": {
        "month1": 50000,
        "month3": 200000,
        "month6": 500000
      },
      "trackingUrl": "https://urepli.com/ref/track_1705123456_abc"
    }
  },
  "jsonrpc": "2.0"
}
```

### 6. Campaign Optimization

**Method**: `campaign/optimize`

**Request**:
```json
{
  "id": "6",
  "method": "campaign/optimize",
  "params": {
    "campaignId": "camp_1705123456_ref123",
    "optimizationType": "full"
  },
  "jsonrpc": "2.0"
}
```

**Response**:
```json
{
  "id": "6",
  "result": {
    "success": true,
    "optimization": {
      "campaignId": "camp_1705123456_ref123",
      "optimizationType": "full",
      "recommendations": [
        {
          "type": "timing",
          "current": "10:00-12:00 JST",
          "recommended": "20:00-22:00 JST",
          "expectedImprovement": "25% engagement increase",
          "confidence": 0.92
        },
        {
          "type": "content",
          "current": "Static posts",
          "recommended": "Video content with trending audio",
          "expectedImprovement": "40% reach increase",
          "confidence": 0.87
        }
      ],
      "projectedResults": {
        "revenueIncrease": "120-150%",
        "costReduction": "30-40%",
        "timeToBreakeven": "14-21 days"
      },
      "implementationPlan": {
        "phase1": "Schedule optimization (immediate)",
        "phase2": "Content format testing (3 days)",
        "phase3": "Advanced targeting (7 days)",
        "phase4": "Full automation rollout (14 days)"
      }
    }
  },
  "jsonrpc": "2.0"
}
```

### 7. Profit Analytics

**Method**: `tools/call`

**Tool**: `profit-calculator`

**Request**:
```json
{
  "id": "7",
  "method": "tools/call",
  "params": {
    "name": "profit-calculator",
    "arguments": {
      "timeframe": "month",
      "platforms": ["tiktok", "instagram", "youtube"],
      "includeForecasting": true
    }
  },
  "jsonrpc": "2.0"
}
```

**Response**:
```json
{
  "id": "7",
  "result": {
    "content": {
      "success": true,
      "timeframe": "month",
      "currentProfit": {
        "total": 125000,
        "byPlatform": {
          "tiktok": 55000,
          "instagram": 40000,
          "youtube": 25000,
          "twitter": 5000
        }
      },
      "forecasting": {
        "nextWeek": 145000,
        "nextMonth": 580000,
        "confidence": 85
      },
      "optimization": {
        "recommendedSchedule": {
          "tiktok": ["19:00-21:00", "12:00-13:00"],
          "instagram": ["20:00-22:00", "08:00-09:00"],
          "youtube": ["18:00-20:00", "21:00-22:00"]
        },
        "expectedImprovement": 15
      }
    }
  },
  "jsonrpc": "2.0"
}
```

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| -32700 | Parse error | Invalid JSON received |
| -32600 | Invalid Request | Request does not conform to JSON-RPC 2.0 |
| -32601 | Method not found | Method does not exist |
| -32602 | Invalid params | Invalid method parameters |
| -32603 | Internal error | Server internal error |
| -32002 | Client not found | Client session not found |
| 429 | Rate limit exceeded | Client exceeded rate limit |
| 1008 | Server at capacity | Maximum connections reached |

## Rate Limiting

- **Limit**: 10 requests per second per client
- **Bucket Algorithm**: Token bucket with refill
- **Response**: HTTP 429 when exceeded
- **Reset**: Continuous refill at 10 tokens/second

## Connection Management

- **Maximum Connections**: 1000 concurrent
- **Inactive Timeout**: 5 minutes
- **Auto-cleanup**: Every 60 seconds
- **Health Check**: Real-time monitoring

## GUI Dashboard Features

### Real-Time Monitoring
- **Connection Status**: Live connection count
- **Performance Metrics**: Request/response timing
- **Error Tracking**: Error rate and patterns
- **Resource Usage**: Memory and CPU monitoring

### Tool Execution
- **One-Click Tools**: Execute common tools via GUI
- **Parameter Forms**: User-friendly parameter input
- **Result Display**: Formatted JSON results
- **History**: Previous execution results

### Configuration
- **API Settings**: Configure API keys and credentials
- **Automation Rules**: Set up automation parameters
- **Performance Tuning**: Adjust rate limits and timeouts
- **Monitoring Alerts**: Set up performance alerts

## Integration Examples

### JavaScript Client
```javascript
const ws = new WebSocket('ws://localhost:3001/mcp-ws');

ws.onopen = () => {
  // Initialize connection
  ws.send(JSON.stringify({
    id: '1',
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      clientInfo: { name: 'My Client', version: '1.0.0' }
    },
    jsonrpc: '2.0'
  }));
};

ws.onmessage = (event) => {
  const response = JSON.parse(event.data);
  console.log('MCP Response:', response);
};

// Execute social media posting
function postContent(platform, content) {
  ws.send(JSON.stringify({
    id: Date.now().toString(),
    method: 'tools/call',
    params: {
      name: 'social-media-poster',
      arguments: { platform, content }
    },
    jsonrpc: '2.0'
  }));
}
```

### Python Client
```python
import asyncio
import websockets
import json

async def mcp_client():
    uri = "ws://localhost:3001/mcp-ws"
    async with websockets.connect(uri) as websocket:
        # Initialize
        init_request = {
            "id": "1",
            "method": "initialize", 
            "params": {
                "protocolVersion": "2024-11-05",
                "clientInfo": {"name": "Python Client", "version": "1.0.0"}
            },
            "jsonrpc": "2.0"
        }
        await websocket.send(json.dumps(init_request))
        
        # Execute tool
        tool_request = {
            "id": "2",
            "method": "tools/call",
            "params": {
                "name": "profit-calculator",
                "arguments": {"timeframe": "week", "includeForecasting": True}
            },
            "jsonrpc": "2.0"
        }
        await websocket.send(json.dumps(tool_request))
        
        # Receive responses
        async for message in websocket:
            response = json.loads(message)
            print(f"MCP Response: {response}")

asyncio.run(mcp_client())
```

## Deployment

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3001
CMD ["npm", "run", "start:mcp"]
```

### Environment Variables
```env
MCP_PORT=3001
MCP_MAX_CONNECTIONS=1000
MCP_RATE_LIMIT=10
GEMINI_API_KEY=your_gemini_key
A8NET_API_KEY=your_a8net_key
```

### Production Considerations
- **Load Balancing**: Use nginx or HAProxy for multiple instances
- **SSL/TLS**: Enable HTTPS for production deployment
- **Monitoring**: Implement comprehensive logging and monitoring
- **Backup**: Regular backup of configuration and data
- **Scaling**: Horizontal scaling with Redis clustering

This MCP server provides a comprehensive foundation for commercial-grade social media automation with zero gaps in the monetization pipeline.