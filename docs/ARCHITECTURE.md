# Urepli System Architecture

## Overview

Urepli is built on a modern, scalable microservices architecture designed for high-performance social media automation. The system leverages cutting-edge AI technologies, robust automation frameworks, and enterprise-grade infrastructure to deliver a comprehensive solution for content creation, multi-platform distribution, and revenue optimization.

## Table of Contents
1. [High-Level Architecture](#high-level-architecture)
2. [Core Components](#core-components)
3. [Data Flow Architecture](#data-flow-architecture)
4. [Microservices Design](#microservices-design)
5. [Integration Architecture](#integration-architecture)
6. [Security Architecture](#security-architecture)
7. [Scalability & Performance](#scalability--performance)
8. [Deployment Architecture](#deployment-architecture)

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Client Layer                              │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐ │
│  │  Web App    │ │  Mobile     │ │   Admin     │ │   3rd Party     │ │
│  │ (React/TS)  │ │   Apps      │ │ Dashboard   │ │  Integrations   │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        API Gateway Layer                            │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐ │
│  │    NGINX    │ │    Rate     │ │    Load     │ │      SSL/TLS    │ │
│  │   Reverse   │ │  Limiting   │ │  Balancer   │ │   Termination   │ │
│  │    Proxy    │ │   & Auth    │ │             │ │                 │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Application Services Layer                      │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                  Core API Services                             │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │ │
│  │  │   Content   │ │   Social    │ │  Affiliate  │ │   User    │ │ │
│  │  │  Service    │ │   Media     │ │  Marketing  │ │ Management│ │ │
│  │  │             │ │  Service    │ │   Service   │ │  Service  │ │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                 Automation Services                            │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │ │
│  │  │    N8N      │ │   Browser   │ │  AI/ML      │ │Analytics  │ │ │
│  │  │ Workflows   │ │ Automation  │ │ Pipeline    │ │ Service   │ │ │
│  │  │             │ │  Service    │ │             │ │           │ │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Integration Layer                              │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐ │
│  │   Social    │ │     AI      │ │  Affiliate  │ │    Storage      │ │
│  │  Platform   │ │   APIs      │ │  Networks   │ │   Services      │ │
│  │    APIs     │ │ (Gemini/GPT)│ │ (A8/Rakuten)│ │  (S3/CDN)       │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Data Layer                                    │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐ │
│  │ PostgreSQL  │ │    Redis    │ │ ClickHouse  │ │   File Storage  │ │
│  │ (Primary)   │ │  (Cache)    │ │ (Analytics) │ │    (Media)      │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Frontend Application Layer

#### Web Application (React + TypeScript)
```typescript
// Architecture: Single Page Application (SPA)
// Framework: React 18 with TypeScript
// Build Tool: Vite
// Styling: Tailwind CSS + Radix UI
// State Management: React Query + Zustand

// Component Architecture
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (buttons, inputs, etc.)
│   ├── forms/          # Form components
│   ├── charts/         # Analytics and visualization
│   └── layout/         # Layout components
├── pages/              # Page-level components
│   ├── dashboard/      # Dashboard and overview
│   ├── campaigns/      # Campaign management
│   ├── content/        # Content creation and management
│   ├── analytics/      # Analytics and reporting
│   └── settings/       # User and system settings
├── hooks/              # Custom React hooks
├── lib/                # Utility functions and configurations
├── stores/             # State management stores
└── types/              # TypeScript type definitions
```

#### Key Frontend Features
- **Real-time Updates**: WebSocket connections for live data
- **Responsive Design**: Mobile-first responsive interface
- **Offline Support**: Service workers for offline functionality
- **Performance**: Code splitting and lazy loading
- **Internationalization**: Multi-language support (Japanese/English)

### 2. Backend API Layer

#### Core API Service (Node.js + Express)
```typescript
// Architecture: RESTful API with GraphQL endpoints
// Framework: Express.js with TypeScript
// ORM: Drizzle ORM with PostgreSQL
// Authentication: JWT with refresh tokens
// Validation: Zod schema validation

// Service Architecture
server/
├── routes/             # API route handlers
│   ├── auth/          # Authentication routes
│   ├── content/       # Content management
│   ├── social/        # Social media operations
│   ├── affiliate/     # Affiliate marketing
│   ├── analytics/     # Analytics and reporting
│   └── automation/    # Automation workflows
├── services/          # Business logic services
│   ├── content/       # Content generation services
│   ├── social/        # Social media services
│   ├── affiliate/     # Affiliate management
│   ├── ai/           # AI/ML services
│   └── automation/    # Automation engines
├── middleware/        # Express middleware
├── config/           # Configuration management
├── db/              # Database schemas and migrations
└── utils/           # Utility functions
```

#### API Design Principles
- **RESTful Design**: Consistent REST API patterns
- **GraphQL Support**: Flexible data querying for complex operations
- **Microservices Ready**: Modular design for easy service extraction
- **Version Control**: API versioning strategy
- **Documentation**: Auto-generated OpenAPI documentation

### 3. Automation Engine Layer

#### N8N Workflow Engine
```typescript
// N8N Integration Architecture
// Version: 1.19.4+ with custom Japanese nodes
// Deployment: Docker containers with horizontal scaling
// Custom Nodes: @urepli/n8n-nodes-japanese-pack

// Workflow Categories
workflows/
├── content-generation/    # AI content creation workflows
├── social-posting/       # Multi-platform posting workflows
├── engagement/          # Automated engagement workflows
├── affiliate/           # Affiliate marketing workflows
├── analytics/           # Data collection and analysis workflows
└── maintenance/         # System maintenance workflows
```

#### Browser Automation Service
```typescript
// Multi-browser automation with anti-detection
// Frameworks: Playwright + Puppeteer + Botasaurus
// Features: Proxy rotation, session management, human simulation

class BrowserAutomationCluster {
  private browsers: Map<string, Browser> = new Map();
  private proxyRotator: ProxyRotator;
  private sessionManager: SessionManager;

  async createSession(platform: string, account: string): Promise<string> {
    const proxy = await this.proxyRotator.getProxy();
    const browser = await this.createBrowser({
      proxy,
      userAgent: this.generateUserAgent(),
      viewport: this.randomViewport()
    });
    
    const sessionId = `${platform}_${account}_${Date.now()}`;
    this.browsers.set(sessionId, browser);
    
    return sessionId;
  }

  async executeAction(sessionId: string, action: AutomationAction): Promise<any> {
    const browser = this.browsers.get(sessionId);
    if (!browser) throw new Error('Session not found');

    // Implement human-like delays and behaviors
    await this.simulateHumanBehavior();
    
    return await action.execute(browser);
  }
}
```

### 4. AI/ML Pipeline

#### Content Generation Pipeline
```typescript
// Multi-modal AI content generation
// Primary: Google Gemini Pro
// Fallback: OpenAI GPT-4
// Specialized: Japanese language models

class AIContentPipeline {
  private geminiService: GeminiService;
  private videoGenerator: ComfyUIService;
  private contentOptimizer: ContentOptimizer;

  async generateContent(request: ContentRequest): Promise<GeneratedContent> {
    // 1. Generate base content
    const baseContent = await this.geminiService.generateContent({
      prompt: this.buildPrompt(request),
      model: 'gemini-pro',
      parameters: {
        temperature: 0.7,
        maxTokens: 2000,
        topP: 0.9
      }
    });

    // 2. Optimize for platforms
    const optimizedContent = await this.contentOptimizer.optimizeForPlatforms(
      baseContent, 
      request.targetPlatforms
    );

    // 3. Generate video if required
    let videoUrl = null;
    if (request.includeVideo) {
      videoUrl = await this.videoGenerator.createVideo({
        script: optimizedContent.script,
        style: request.videoStyle,
        duration: request.duration
      });
    }

    return {
      content: optimizedContent,
      videoUrl,
      metadata: {
        generatedAt: new Date(),
        model: 'gemini-pro',
        confidence: baseContent.confidence
      }
    };
  }
}
```

#### Analytics and ML Engine
```typescript
// Real-time analytics with ML-powered insights
// Database: ClickHouse for time-series data
// ML Framework: TensorFlow.js for client-side predictions

class MLAnalyticsEngine {
  private clickhouse: ClickHouseClient;
  private models: Map<string, MLModel> = new Map();

  async predictPerformance(content: Content, platform: string): Promise<PerformancePrediction> {
    const features = this.extractFeatures(content, platform);
    const model = this.models.get(`${platform}_performance`);
    
    if (!model) {
      throw new Error(`Model not found for platform: ${platform}`);
    }

    const prediction = await model.predict(features);
    
    return {
      expectedViews: prediction.views,
      expectedEngagement: prediction.engagement,
      confidence: prediction.confidence,
      recommendations: await this.generateRecommendations(features, prediction)
    };
  }

  async updateModels(): Promise<void> {
    // Retrain models with latest performance data
    const trainingData = await this.clickhouse.query(`
      SELECT * FROM content_performance 
      WHERE created_at > now() - INTERVAL 30 DAY
    `);

    for (const platform of ['tiktok', 'instagram', 'youtube']) {
      const platformData = trainingData.filter(d => d.platform === platform);
      await this.trainModel(platform, platformData);
    }
  }
}
```

## Data Flow Architecture

### 1. Content Creation Flow
```
User Request → AI Content Generation → Content Optimization → Platform Adaptation → Video Generation → Quality Check → Approval → Publishing Queue → Multi-Platform Distribution → Performance Tracking
```

### 2. Social Media Automation Flow
```
Trigger Event → Account Selection → Content Preparation → Browser Session → Human Simulation → Platform Posting → Result Validation → Performance Logging → Next Action Scheduling
```

### 3. Affiliate Revenue Flow
```
Content Creation → Product Discovery → Affiliate Link Generation → Link Integration → Content Publishing → Click Tracking → Conversion Monitoring → Commission Calculation → Revenue Reporting
```

### 4. Analytics Data Flow
```
Platform APIs → Data Normalization → Real-time Processing → ClickHouse Storage → ML Analysis → Insight Generation → Dashboard Updates → Automated Optimization
```

## Microservices Design

### Service Communication Architecture
```typescript
// Event-driven microservices with message queues
// Message Broker: Redis Streams
// Communication: gRPC for internal, REST for external

// Service Registry
interface ServiceRegistry {
  services: {
    contentService: ServiceInstance;
    socialMediaService: ServiceInstance;
    affiliateService: ServiceInstance;
    analyticsService: ServiceInstance;
    automationService: ServiceInstance;
  };
}

// Event Bus
class EventBus {
  private redis: Redis;

  async publish(event: string, data: any): Promise<void> {
    await this.redis.xadd(`events:${event}`, '*', 'data', JSON.stringify(data));
  }

  async subscribe(event: string, handler: EventHandler): Promise<void> {
    const stream = `events:${event}`;
    while (true) {
      const messages = await this.redis.xread('COUNT', 1, 'BLOCK', 0, 'STREAMS', stream, '$');
      for (const message of messages) {
        await handler(JSON.parse(message.data));
      }
    }
  }
}
```

### Service Isolation and Scaling
```yaml
# Kubernetes deployment configuration
apiVersion: apps/v1
kind: Deployment
metadata:
  name: content-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: content-service
  template:
    metadata:
      labels:
        app: content-service
    spec:
      containers:
      - name: content-service
        image: urepli/content-service:latest
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        env:
        - name: SERVICE_NAME
          value: "content-service"
        - name: REDIS_URL
          value: "redis://redis-cluster:6379"
```

## Integration Architecture

### External Service Integrations
```typescript
// Adapter pattern for external service integrations
// Each service has its own adapter with unified interface

interface SocialMediaAdapter {
  post(content: Content, account: Account): Promise<PostResult>;
  getAnalytics(postId: string): Promise<AnalyticsData>;
  authenticate(credentials: Credentials): Promise<AuthToken>;
}

class TikTokAdapter implements SocialMediaAdapter {
  private client: TikTokBusinessAPI;

  async post(content: Content, account: Account): Promise<PostResult> {
    // TikTok-specific posting logic
    const result = await this.client.createVideo({
      video_url: content.videoUrl,
      text: content.caption,
      privacy_level: 'PUBLIC_TO_EVERYONE'
    });

    return {
      success: true,
      postId: result.data.video_id,
      postUrl: `https://tiktok.com/@${account.username}/video/${result.data.video_id}`,
      publishedAt: new Date()
    };
  }
}

class InstagramAdapter implements SocialMediaAdapter {
  private client: InstagramGraphAPI;

  async post(content: Content, account: Account): Promise<PostResult> {
    // Instagram-specific posting logic
    const mediaId = await this.client.createMedia({
      image_url: content.imageUrl,
      caption: content.caption,
      access_token: account.accessToken
    });

    const result = await this.client.publishMedia({
      creation_id: mediaId,
      access_token: account.accessToken
    });

    return {
      success: true,
      postId: result.id,
      postUrl: `https://instagram.com/p/${result.id}`,
      publishedAt: new Date()
    };
  }
}
```

### API Rate Limiting and Circuit Breakers
```typescript
// Rate limiting and circuit breaker patterns
class RateLimitedAPI {
  private rateLimiter: RateLimiter;
  private circuitBreaker: CircuitBreaker;

  constructor(private adapter: SocialMediaAdapter) {
    this.rateLimiter = new RateLimiter({
      tokensPerInterval: 100,
      interval: 'hour'
    });

    this.circuitBreaker = new CircuitBreaker(this.adapter, {
      timeout: 30000,
      errorThresholdPercentage: 50,
      resetTimeout: 60000
    });
  }

  async post(content: Content, account: Account): Promise<PostResult> {
    await this.rateLimiter.removeTokens(1);
    return await this.circuitBreaker.fire(content, account);
  }
}
```

## Security Architecture

### Authentication and Authorization
```typescript
// Multi-layer security with JWT and OAuth2
class SecurityManager {
  private jwtService: JWTService;
  private oauthService: OAuthService;
  private permissionService: PermissionService;

  async authenticate(request: AuthRequest): Promise<AuthToken> {
    // 1. Validate credentials
    const user = await this.validateCredentials(request.email, request.password);
    
    // 2. Generate tokens
    const accessToken = await this.jwtService.generateAccessToken(user);
    const refreshToken = await this.jwtService.generateRefreshToken(user);
    
    // 3. Store session
    await this.storeSession(user.id, refreshToken);
    
    return {
      accessToken,
      refreshToken,
      expiresIn: 3600,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    };
  }

  async authorize(token: string, resource: string, action: string): Promise<boolean> {
    const user = await this.jwtService.verifyToken(token);
    return await this.permissionService.hasPermission(user.id, resource, action);
  }
}
```

### Data Encryption and Privacy
```typescript
// End-to-end encryption for sensitive data
class EncryptionService {
  private key: Buffer;

  constructor() {
    this.key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
  }

  encrypt(data: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', this.key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  decrypt(encryptedData: string): string {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipher('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

## Scalability & Performance

### Horizontal Scaling Strategy
```typescript
// Auto-scaling based on metrics
class AutoScaler {
  private metricsCollector: MetricsCollector;
  private kubernetesClient: K8sClient;

  async monitor(): Promise<void> {
    const metrics = await this.metricsCollector.getMetrics();
    
    for (const service of ['content-service', 'social-media-service', 'analytics-service']) {
      const currentMetrics = metrics[service];
      const scalingDecision = this.makeScalingDecision(currentMetrics);
      
      if (scalingDecision.action !== 'none') {
        await this.scaleService(service, scalingDecision);
      }
    }
  }

  private makeScalingDecision(metrics: ServiceMetrics): ScalingDecision {
    const cpuThreshold = 70;
    const memoryThreshold = 80;
    const requestRateThreshold = 1000;

    if (metrics.cpuUsage > cpuThreshold || 
        metrics.memoryUsage > memoryThreshold ||
        metrics.requestRate > requestRateThreshold) {
      return {
        action: 'scale_up',
        replicas: Math.min(metrics.currentReplicas * 2, 20)
      };
    }

    if (metrics.cpuUsage < 30 && 
        metrics.memoryUsage < 40 && 
        metrics.requestRate < 200 &&
        metrics.currentReplicas > 2) {
      return {
        action: 'scale_down',
        replicas: Math.max(Math.floor(metrics.currentReplicas / 2), 2)
      };
    }

    return { action: 'none' };
  }
}
```

### Caching Strategy
```typescript
// Multi-layer caching strategy
class CacheManager {
  private redis: Redis;
  private memoryCache: LRUCache;
  private cdnCache: CDNClient;

  async get(key: string, level: CacheLevel = 'all'): Promise<any> {
    // 1. Check memory cache first (fastest)
    if (level === 'all' || level === 'memory') {
      const memoryResult = this.memoryCache.get(key);
      if (memoryResult) return memoryResult;
    }

    // 2. Check Redis cache (fast)
    if (level === 'all' || level === 'redis') {
      const redisResult = await this.redis.get(key);
      if (redisResult) {
        const parsed = JSON.parse(redisResult);
        this.memoryCache.set(key, parsed);
        return parsed;
      }
    }

    // 3. Check CDN cache (for static content)
    if (level === 'all' || level === 'cdn') {
      const cdnResult = await this.cdnCache.get(key);
      if (cdnResult) return cdnResult;
    }

    return null;
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    // Store in all cache layers
    this.memoryCache.set(key, value);
    await this.redis.setex(key, ttl, JSON.stringify(value));
    
    // CDN cache for static content
    if (this.isStaticContent(key)) {
      await this.cdnCache.set(key, value, ttl);
    }
  }
}
```

### Performance Monitoring
```typescript
// Real-time performance monitoring
class PerformanceMonitor {
  private metrics: PrometheusRegistry;

  constructor() {
    this.setupMetrics();
  }

  private setupMetrics(): void {
    // HTTP request metrics
    this.httpRequestDuration = new prometheus.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5]
    });

    // Business metrics
    this.contentGenerationRate = new prometheus.Counter({
      name: 'content_generation_total',
      help: 'Total number of content pieces generated',
      labelNames: ['type', 'platform']
    });

    this.socialMediaPosts = new prometheus.Counter({
      name: 'social_media_posts_total',
      help: 'Total number of social media posts',
      labelNames: ['platform', 'status']
    });

    // Resource metrics
    this.databaseConnections = new prometheus.Gauge({
      name: 'database_connections_active',
      help: 'Number of active database connections'
    });
  }

  trackContentGeneration(type: string, platform: string): void {
    this.contentGenerationRate.labels(type, platform).inc();
  }

  trackSocialPost(platform: string, status: string): void {
    this.socialMediaPosts.labels(platform, status).inc();
  }
}
```

## Deployment Architecture

### Container Orchestration
```yaml
# Production Kubernetes deployment
apiVersion: v1
kind: Namespace
metadata:
  name: urepli-production

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: urepli-api
  namespace: urepli-production
spec:
  replicas: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2
      maxUnavailable: 1
  selector:
    matchLabels:
      app: urepli-api
  template:
    metadata:
      labels:
        app: urepli-api
    spec:
      containers:
      - name: api
        image: urepli/api:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: urepli-secrets
              key: database-url
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 15
          periodSeconds: 10

---
apiVersion: v1
kind: Service
metadata:
  name: urepli-api-service
  namespace: urepli-production
spec:
  selector:
    app: urepli-api
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: urepli-ingress
  namespace: urepli-production
  annotations:
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - api.urepli.com
    secretName: urepli-tls
  rules:
  - host: api.urepli.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: urepli-api-service
            port:
              number: 80
```

This comprehensive architecture documentation provides a complete overview of Urepli's system design, from high-level architecture to detailed implementation patterns. The system is designed for scalability, performance, and maintainability while ensuring security and reliability for production use.