# MNP Dashboard

## Overview

MNP Dashboard is an AI-powered content automation platform designed for the Japanese market. It combines machine learning bandit algorithms with automated content generation to create, optimize, and distribute marketing content across multiple platforms (TikTok, Instagram, YouTube). The system leverages Google's Gemini AI for Japanese script generation, Google Cloud Text-to-Speech for voice synthesis, and implements a multi-armed bandit algorithm for performance optimization based on ROAS (Return on Ad Spend).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite for build tooling
- **UI Library**: Shadcn/UI components with Radix UI primitives for accessibility
- **Styling**: Tailwind CSS with custom design system and dark theme
- **State Management**: TanStack React Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Component Structure**: Modular dashboard components (MetricsGrid, WorkflowVisualization, BanditOptimization, ContentLibrary, AutomationLogs)

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle with PostgreSQL support
- **Storage**: Abstracted storage interface with in-memory implementation (production-ready for database integration)
- **Services**: Modular service architecture (GeminiService, WorkflowService, BanditAlgorithmService)
- **Development**: Vite middleware integration for seamless development experience

### Data Storage Architecture
- **Database**: PostgreSQL configured via Drizzle with migrations
- **Schema Design**: 
  - Users table for authentication
  - Workflows table for automation pipeline management
  - Bandit Arms table for A/B testing and optimization
  - Content table for generated media tracking
  - Automation Logs table for system monitoring
  - API Configuration table for external service credentials
- **Storage Pattern**: Repository pattern with interface abstraction for easy database switching

### AI and Content Generation
- **Content Generation**: Google Gemini API for Japanese marketing script creation
- **Voice Synthesis**: Google Cloud Text-to-Speech with Japanese voices
- **Optimization Algorithm**: Multi-armed bandit implementation using Thompson sampling for platform allocation
- **Performance Metrics**: ROAS-based optimization with profit/cost tracking per content variant

### External Service Integration Architecture
- **AI Services**: Google Gemini for content generation with prompt engineering for Japanese market
- **Cloud Services**: Google Cloud TTS and Storage for media processing
- **Social Platforms**: Integration endpoints for TikTok, Instagram, YouTube publishing
- **Analytics**: Performance tracking with revenue attribution and cost analysis
- **Workflow Engine**: Integration points for n8n workflow automation

## External Dependencies

### Core AI Services
- **Google Gemini API**: Content script generation with Japanese localization
- **Google Cloud Text-to-Speech**: Voice synthesis for video content
- **Google Cloud Storage**: Media file storage and CDN distribution

### Database and Infrastructure
- **PostgreSQL**: Primary database via Neon or similar cloud provider
- **Drizzle ORM**: Type-safe database operations and migrations

### Social Media APIs
- **TikTok API**: Content publishing and analytics (optional)
- **Instagram Graph API**: Reels and post publishing (optional)
- **YouTube Data API**: Video uploads and metadata management (optional)

### Development and Deployment
- **Vite**: Frontend build tooling and development server
- **TypeScript**: Type safety across the entire stack
- **Tailwind CSS**: Utility-first styling framework
- **React Query**: Server state management and caching

### Optional Workflow Automation
- **n8n**: External workflow automation platform for content pipeline orchestration
- **Make.com**: Alternative webhook-based automation integration

The system is designed with modularity in mind, allowing individual services to be enabled/disabled based on available API credentials while maintaining core functionality through graceful degradation.