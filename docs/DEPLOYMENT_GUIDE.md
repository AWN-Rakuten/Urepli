# Urepli Deployment Guide

## Overview

This guide covers the complete deployment process for Urepli, from development to production environments. It includes containerization, cloud deployment, scaling strategies, and monitoring setup.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Development Deployment](#development-deployment)
3. [Docker Containerization](#docker-containerization)
4. [Cloud Deployment](#cloud-deployment)
5. [Production Setup](#production-setup)
6. [Scaling & Load Balancing](#scaling--load-balancing)
7. [Monitoring & Logging](#monitoring--logging)
8. [Security Configuration](#security-configuration)
9. [Backup & Recovery](#backup--recovery)
10. [CI/CD Pipeline](#cicd-pipeline)

## Prerequisites

### System Requirements

#### Minimum Requirements (Development)
- **CPU**: 4 cores, 2.4GHz
- **RAM**: 8GB
- **Storage**: 50GB SSD
- **OS**: Ubuntu 20.04+, macOS 11+, Windows 10+

#### Recommended Requirements (Production)
- **CPU**: 8+ cores, 3.0GHz
- **RAM**: 32GB+
- **Storage**: 500GB+ SSD
- **Network**: 1Gbps+ connection

#### Software Dependencies
```bash
# Node.js and npm
node --version  # v18.0.0+
npm --version   # v8.0.0+

# Docker and Docker Compose
docker --version         # v20.0.0+
docker-compose --version # v2.0.0+

# PostgreSQL
psql --version  # v14.0+

# Redis
redis-server --version  # v6.0+

# Git
git --version  # v2.30+
```

## Development Deployment

### Local Development Setup

#### 1. Environment Setup
```bash
# Clone repository
git clone https://github.com/AWN-Rakuten/Urepli.git
cd Urepli

# Install dependencies
npm install

# Install global tools
npm install -g tsx typescript n8n@latest

# Setup environment variables
cp .env.example .env
```

#### 2. Database Setup
```bash
# Start PostgreSQL (Ubuntu/Debian)
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
CREATE DATABASE urepli;
CREATE USER urepli_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE urepli TO urepli_user;
\q

# Run migrations
npm run db:push
```

#### 3. Redis Setup
```bash
# Start Redis
sudo systemctl start redis
sudo systemctl enable redis

# Verify Redis connection
redis-cli ping
# Should return: PONG
```

#### 4. Environment Configuration
```bash
# .env file configuration
cat > .env << EOF
# Application
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

# Database
DATABASE_URL="postgresql://urepli_user:secure_password@localhost:5432/urepli"
REDIS_URL="redis://localhost:6379"

# Authentication
JWT_SECRET=$(openssl rand -hex 32)
JWT_EXPIRES_IN=24h

# AI Services
GOOGLE_GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key

# N8N Integration
N8N_WEBHOOK_URL=http://localhost:5678
N8N_API_KEY=your_n8n_api_key

# Social Media APIs (Optional for development)
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
TIKTOK_CLIENT_KEY=your_tiktok_client_key
TIKTOK_CLIENT_SECRET=your_tiktok_client_secret

# Japanese Affiliate Networks
A8NET_API_KEY=your_a8net_api_key
A8NET_SECRET_KEY=your_a8net_secret_key
A8NET_AFFILIATE_ID=your_a8net_affiliate_id
RAKUTEN_APPLICATION_ID=your_rakuten_app_id
RAKUTEN_AFFILIATE_ID=your_rakuten_affiliate_id

# Storage (Development - Local)
STORAGE_TYPE=local
STORAGE_PATH=./uploads

# Logging
LOG_LEVEL=debug
LOG_FORMAT=combined
EOF
```

#### 5. Start Development Services
```bash
# Start N8N (in separate terminal)
n8n start --tunnel

# Start main application
npm run dev

# Application will be available at:
# Frontend: http://localhost:5173
# API: http://localhost:3000
# N8N: http://localhost:5678
```

## Docker Containerization

### Docker Setup

#### 1. Dockerfile
```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    chromium \
    chromium-chromedriver \
    ffmpeg \
    python3 \
    py3-pip \
    build-base

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start application
CMD ["npm", "start"]
```

#### 2. Docker Compose Configuration
```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://urepli_user:${DB_PASSWORD}@postgres:5432/urepli
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - postgres
      - redis
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=urepli
      - POSTGRES_USER=urepli_user
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U urepli_user -d urepli"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  n8n:
    image: n8nio/n8n:latest
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=0.0.0.0
      - N8N_PORT=5678
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=n8n_user
      - DB_POSTGRESDB_PASSWORD=${N8N_DB_PASSWORD}
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
      - WEBHOOK_URL=https://${DOMAIN}/webhook/
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=${N8N_AUTH_USER}
      - N8N_BASIC_AUTH_PASSWORD=${N8N_AUTH_PASSWORD}
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      - postgres
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
      - n8n
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  n8n_data:
```

#### 3. Environment Configuration
```bash
# .env.docker
DB_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)
N8N_DB_PASSWORD=$(openssl rand -base64 32)
N8N_ENCRYPTION_KEY=$(openssl rand -hex 32)
N8N_AUTH_USER=admin
N8N_AUTH_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -hex 32)
DOMAIN=your-domain.com
```

#### 4. Build and Deploy
```bash
# Build and start services
docker-compose up -d --build

# View logs
docker-compose logs -f app

# Scale services
docker-compose up -d --scale app=3

# Stop services
docker-compose down
```

## Cloud Deployment

### AWS Deployment

#### 1. Infrastructure Setup (Terraform)
```hcl
# infrastructure/main.tf
provider "aws" {
  region = var.aws_region
}

# VPC Configuration
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "urepli-vpc"
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "urepli-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "urepli-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets           = aws_subnet.public[*].id

  enable_deletion_protection = true
}

# RDS PostgreSQL
resource "aws_db_instance" "postgres" {
  identifier     = "urepli-postgres"
  engine         = "postgres"
  engine_version = "15.3"
  instance_class = "db.t3.medium"
  
  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_type         = "gp3"
  storage_encrypted    = true
  
  db_name  = "urepli"
  username = "urepli_user"
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  skip_final_snapshot = false
  final_snapshot_identifier = "urepli-postgres-final-snapshot"
  
  tags = {
    Name = "urepli-postgres"
  }
}

# ElastiCache Redis
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "urepli-redis"
  description                = "Redis cluster for Urepli"
  
  node_type                  = "cache.t3.micro"
  port                       = 6379
  parameter_group_name       = "default.redis7"
  
  num_cache_clusters         = 2
  automatic_failover_enabled = true
  multi_az_enabled          = true
  
  subnet_group_name = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                = var.redis_auth_token
  
  tags = {
    Name = "urepli-redis"
  }
}

# S3 Bucket for media storage
resource "aws_s3_bucket" "media" {
  bucket = "urepli-media-${random_string.bucket_suffix.result}"
}

resource "aws_s3_bucket_versioning" "media" {
  bucket = aws_s3_bucket.media.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_encryption" "media" {
  bucket = aws_s3_bucket.media.id

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
}

# CloudFront distribution
resource "aws_cloudfront_distribution" "media" {
  origin {
    domain_name = aws_s3_bucket.media.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.media.id}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.media.cloudfront_access_identity_path
    }
  }

  enabled = true
  
  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.media.id}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
```

#### 2. ECS Task Definition
```json
{
  "family": "urepli-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "app",
      "image": "your-ecr-repo/urepli:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:urepli/database-url"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:urepli/jwt-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/urepli-app",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:3000/health || exit 1"
        ],
        "interval": 30,
        "timeout": 10,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

#### 3. Deployment Script
```bash
#!/bin/bash
# deploy-aws.sh

set -e

# Configuration
AWS_REGION="us-west-2"
ECR_REPOSITORY="your-account.dkr.ecr.us-west-2.amazonaws.com/urepli"
CLUSTER_NAME="urepli-cluster"
SERVICE_NAME="urepli-app"

# Build and push Docker image
echo "Building Docker image..."
docker build -t urepli:latest .

echo "Tagging image for ECR..."
docker tag urepli:latest $ECR_REPOSITORY:latest
docker tag urepli:latest $ECR_REPOSITORY:$(git rev-parse --short HEAD)

echo "Pushing image to ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPOSITORY
docker push $ECR_REPOSITORY:latest
docker push $ECR_REPOSITORY:$(git rev-parse --short HEAD)

echo "Updating ECS service..."
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $SERVICE_NAME \
  --force-new-deployment \
  --region $AWS_REGION

echo "Waiting for deployment to complete..."
aws ecs wait services-stable \
  --cluster $CLUSTER_NAME \
  --services $SERVICE_NAME \
  --region $AWS_REGION

echo "Deployment completed successfully!"
```

### Google Cloud Platform Deployment

#### 1. GKE Deployment Configuration
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: urepli-app
  labels:
    app: urepli-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: urepli-app
  template:
    metadata:
      labels:
        app: urepli-app
    spec:
      containers:
      - name: app
        image: gcr.io/PROJECT_ID/urepli:latest
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
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: urepli-secrets
              key: redis-url
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
          initialDelaySeconds: 60
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10

---
apiVersion: v1
kind: Service
metadata:
  name: urepli-service
spec:
  selector:
    app: urepli-app
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: urepli-ingress
  annotations:
    kubernetes.io/ingress.global-static-ip-name: urepli-ip
    networking.gke.io/managed-certificates: urepli-ssl-cert
spec:
  rules:
  - host: api.urepli.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: urepli-service
            port:
              number: 80
```

#### 2. Cloud SQL and Redis Configuration
```yaml
# cloudsql-proxy.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cloudsql-proxy
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cloudsql-proxy
  template:
    metadata:
      labels:
        app: cloudsql-proxy
    spec:
      serviceAccountName: cloudsql-proxy
      containers:
      - name: cloudsql-proxy
        image: gcr.io/cloudsql-docker/gce-proxy:1.33.2
        command:
          - "/cloud_sql_proxy"
          - "-instances=PROJECT_ID:REGION:INSTANCE_NAME=tcp:0.0.0.0:5432"
        securityContext:
          runAsNonRoot: true
        resources:
          requests:
            memory: "64Mi"
            cpu: "250m"
          limits:
            memory: "128Mi"
            cpu: "500m"

---
apiVersion: v1
kind: Service
metadata:
  name: cloudsql-proxy-service
spec:
  ports:
  - port: 5432
    targetPort: 5432
  selector:
    app: cloudsql-proxy
```

## Production Setup

### Environment Configuration

#### 1. Production Environment Variables
```bash
# .env.production
NODE_ENV=production
PORT=3000

# Database (Production)
DATABASE_URL="postgresql://user:password@prod-db:5432/urepli"
DATABASE_POOL_MAX=20
DATABASE_POOL_MIN=5

# Redis (Production)
REDIS_URL="redis://prod-redis:6379"
REDIS_PASSWORD=secure_redis_password

# Authentication
JWT_SECRET=your_super_secure_jwt_secret_32_chars
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=7d

# AI Services
GOOGLE_GEMINI_API_KEY=your_production_gemini_key
OPENAI_API_KEY=your_production_openai_key

# Storage (Production - AWS S3)
STORAGE_TYPE=s3
AWS_S3_BUCKET=urepli-media-production
AWS_S3_REGION=us-west-2
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
CDN_URL=https://d123456789.cloudfront.net

# Social Media APIs (Production)
FACEBOOK_APP_ID=your_production_facebook_app_id
FACEBOOK_APP_SECRET=your_production_facebook_secret
TIKTOK_CLIENT_KEY=your_production_tiktok_key
TIKTOK_CLIENT_SECRET=your_production_tiktok_secret
INSTAGRAM_CLIENT_ID=your_production_instagram_id
INSTAGRAM_CLIENT_SECRET=your_production_instagram_secret

# Affiliate Networks (Production)
A8NET_API_KEY=your_production_a8net_key
A8NET_SECRET_KEY=your_production_a8net_secret
RAKUTEN_APPLICATION_ID=your_production_rakuten_id

# Security
CORS_ORIGIN=https://dashboard.urepli.com,https://api.urepli.com
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=1000

# Monitoring
LOG_LEVEL=info
LOG_FORMAT=json
SENTRY_DSN=your_sentry_dsn
NEW_RELIC_LICENSE_KEY=your_newrelic_key

# SSL/TLS
SSL_CERT_PATH=/etc/ssl/certs/urepli.crt
SSL_KEY_PATH=/etc/ssl/private/urepli.key

# N8N Production
N8N_HOST=n8n.urepli.com
N8N_PROTOCOL=https
N8N_WEBHOOK_URL=https://api.urepli.com/webhook/
N8N_ENCRYPTION_KEY=your_n8n_encryption_key_32_chars
```

#### 2. SSL/TLS Configuration
```bash
# Generate SSL certificates (Let's Encrypt)
sudo apt install certbot
sudo certbot certonly --standalone -d api.urepli.com -d dashboard.urepli.com

# Or use existing certificates
sudo mkdir -p /etc/ssl/urepli
sudo cp your-certificate.crt /etc/ssl/urepli/
sudo cp your-private-key.key /etc/ssl/urepli/
sudo chmod 644 /etc/ssl/urepli/*.crt
sudo chmod 600 /etc/ssl/urepli/*.key
```

#### 3. Nginx Configuration
```nginx
# /etc/nginx/sites-available/urepli
upstream app_servers {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    keepalive 32;
}

upstream n8n_servers {
    server 127.0.0.1:5678;
    keepalive 8;
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=upload_limit:10m rate=2r/s;

# API Server
server {
    listen 443 ssl http2;
    server_name api.urepli.com;

    ssl_certificate /etc/ssl/urepli/api.urepli.com.crt;
    ssl_certificate_key /etc/ssl/urepli/api.urepli.com.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript;

    location / {
        limit_req zone=api_limit burst=20 nodelay;
        
        proxy_pass http://app_servers;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /upload {
        limit_req zone=upload_limit burst=5 nodelay;
        client_max_body_size 100M;
        
        proxy_pass http://app_servers;
        proxy_request_buffering off;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /webhook {
        proxy_pass http://n8n_servers;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# N8N Server
server {
    listen 443 ssl http2;
    server_name n8n.urepli.com;

    ssl_certificate /etc/ssl/urepli/n8n.urepli.com.crt;
    ssl_certificate_key /etc/ssl/urepli/n8n.urepli.com.key;

    location / {
        proxy_pass http://n8n_servers;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name api.urepli.com n8n.urepli.com;
    return 301 https://$server_name$request_uri;
}
```

## Scaling & Load Balancing

### Horizontal Scaling

#### 1. Application Scaling
```bash
# Docker Compose scaling
docker-compose up -d --scale app=5

# Kubernetes scaling
kubectl scale deployment urepli-app --replicas=10

# Auto-scaling configuration
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: urepli-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: urepli-app
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

#### 2. Database Scaling
```sql
-- PostgreSQL read replicas
-- Master-slave setup for read scaling
CREATE PUBLICATION urepli_pub FOR ALL TABLES;

-- On read replica
CREATE SUBSCRIPTION urepli_sub 
CONNECTION 'host=master-db port=5432 user=replicator dbname=urepli' 
PUBLICATION urepli_pub;

-- Connection pooling with PgBouncer
[databases]
urepli_master = host=master-db port=5432 dbname=urepli
urepli_read = host=read-replica-db port=5432 dbname=urepli

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
```

#### 3. Redis Clustering
```redis
# Redis Cluster configuration
redis-cli --cluster create \
  redis1:6379 redis2:6379 redis3:6379 \
  redis4:6379 redis5:6379 redis6:6379 \
  --cluster-replicas 1
```

### Performance Optimization

#### 1. Application Performance
```typescript
// Performance monitoring middleware
import { performance } from 'perf_hooks';

app.use((req, res, next) => {
  const start = performance.now();
  
  res.on('finish', () => {
    const duration = performance.now() - start;
    console.log(`${req.method} ${req.path} - ${duration.toFixed(2)}ms`);
  });
  
  next();
});

// Database query optimization
const userRepository = {
  async findWithPosts(userId: string) {
    return await db.user.findUnique({
      where: { id: userId },
      include: {
        posts: {
          select: {
            id: true,
            title: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });
  }
};

// Caching strategy
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

app.get('/api/trending', async (req, res) => {
  const cacheKey = 'trending_posts';
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.json(cached.data);
  }
  
  const trendingPosts = await getTrendingPosts();
  cache.set(cacheKey, {
    data: trendingPosts,
    timestamp: Date.now()
  });
  
  res.json(trendingPosts);
});
```

## Monitoring & Logging

### Application Monitoring

#### 1. Health Checks
```typescript
// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    uptime: process.uptime(),
    checks: {
      database: 'unknown',
      redis: 'unknown',
      external_apis: 'unknown'
    }
  };

  try {
    // Database check
    await db.$queryRaw`SELECT 1`;
    health.checks.database = 'healthy';
  } catch (error) {
    health.checks.database = 'unhealthy';
    health.status = 'unhealthy';
  }

  try {
    // Redis check
    await redis.ping();
    health.checks.redis = 'healthy';
  } catch (error) {
    health.checks.redis = 'unhealthy';
    health.status = 'unhealthy';
  }

  try {
    // External API checks
    const geminiResponse = await fetch(`${process.env.GEMINI_API_URL}/health`);
    health.checks.external_apis = geminiResponse.ok ? 'healthy' : 'unhealthy';
  } catch (error) {
    health.checks.external_apis = 'unhealthy';
  }

  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});
```

#### 2. Prometheus Metrics
```typescript
// Prometheus metrics configuration
import prometheus from 'prom-client';

// Create metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status']
});

const httpRequestTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status']
});

const activeConnections = new prometheus.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

// Metrics middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    
    httpRequestDuration
      .labels(req.method, route, res.statusCode.toString())
      .observe(duration);
      
    httpRequestTotal
      .labels(req.method, route, res.statusCode.toString())
      .inc();
  });
  
  next();
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(prometheus.register.metrics());
});
```

#### 3. Grafana Dashboard Configuration
```json
{
  "dashboard": {
    "id": null,
    "title": "Urepli Application Dashboard",
    "tags": ["urepli", "production"],
    "timezone": "browser",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph", 
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])",
            "legendFormat": "5xx errors"
          }
        ]
      }
    ]
  }
}
```

### Logging Configuration

#### 1. Structured Logging
```typescript
// Winston logger configuration
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'urepli-api',
    version: process.env.npm_package_version
  },
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'logs/combined.log'
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Request logging middleware
app.use((req, res, next) => {
  logger.info({
    type: 'request',
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  next();
});
```

#### 2. ELK Stack Configuration
```yaml
# docker-compose.elk.yml
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.5.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms1g -Xmx1g"
      - xpack.security.enabled=false
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"

  logstash:
    image: docker.elastic.co/logstash/logstash:8.5.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf:ro
    ports:
      - "5044:5044"
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:8.5.0
    ports:
      - "5601:5601"
    environment:
      ELASTICSEARCH_HOSTS: http://elasticsearch:9200
    depends_on:
      - elasticsearch

volumes:
  elasticsearch_data:
```

This comprehensive deployment guide provides everything needed to deploy Urepli from development to production environments with proper scaling, monitoring, and security configurations.