#!/bin/bash

# AI Social Campaign Launcher - Startup Script
# This script helps you get started quickly with the campaign launcher

set -e

echo "🚀 AI Social Campaign Launcher - Quick Start"
echo "============================================"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ Created .env file. Please edit it with your API keys before proceeding."
    echo "📖 Required API keys:"
    echo "   - CAMPAIGN_GEMINI_API_KEY (for AI video generation)"
    echo "   - CAMPAIGN_TIKTOK_CLIENT_ID & CAMPAIGN_TIKTOK_CLIENT_SECRET (for TikTok posting)"
    echo "   - CAMPAIGN_INSTAGRAM_ACCESS_TOKEN (for Instagram posting)"
    echo "   - CAMPAIGN_YOUTUBE_CLIENT_ID & CAMPAIGN_YOUTUBE_CLIENT_SECRET (for YouTube posting)"
    echo ""
    echo "💡 You can run the system without API keys for demo purposes, but video generation and social posting will be simulated."
    echo ""
    read -p "Do you want to continue with demo mode? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Please edit .env file and run this script again."
        exit 1
    fi
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p videos logs

# Start services
echo "🐳 Starting Docker services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check if API is responding
echo "🔍 Checking API health..."
for i in {1..30}; do
    if curl -s http://localhost:8000/health > /dev/null; then
        echo "✅ API is healthy!"
        break
    fi
    echo "   Waiting for API... ($i/30)"
    sleep 2
done

# Check if services are running
echo "📊 Service Status:"
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✅ FastAPI: Running (http://localhost:8000)"
    echo "✅ API Docs: http://localhost:8000/docs"
else
    echo "❌ FastAPI: Not responding"
fi

if curl -s http://localhost:9090 > /dev/null; then
    echo "✅ MinIO Console: Running (http://localhost:9090)"
    echo "   Username: minioadmin"
    echo "   Password: minioadmin"
else
    echo "❌ MinIO: Not responding"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📚 Quick Start Guide:"
echo "1. Open API documentation: http://localhost:8000/docs"
echo "2. Create your first campaign using the examples:"
echo "   python examples/simple_example.py"
echo "3. Monitor campaigns in the API docs or via API calls"
echo "4. Check MinIO console for uploaded videos: http://localhost:9090"
echo ""
echo "📝 Example Commands:"
echo "   # View logs"
echo "   docker-compose logs -f api"
echo ""
echo "   # Stop services"
echo "   docker-compose down"
echo ""
echo "   # Restart services"
echo "   docker-compose restart"
echo ""
echo "🇯🇵 日本語ドキュメント: README.md"
echo "🆘 Support: Check GitHub Issues"