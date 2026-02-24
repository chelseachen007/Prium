#!/bin/bash

# Stop on error
set -e

echo "🚀 Starting deployment..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found! Creating from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Created .env from .env.example"
    else
        echo "❌ Error: .env.example not found. Please create .env manually."
        exit 1
    fi
fi

# Load environment variables
source .env

echo "🔧 Using configuration:"
echo "   Server Port: ${SERVER_PORT:-3001}"
echo "   Web Port: ${WEB_PORT:-80}"
echo "   Database URL: ${DATABASE_URL}"

# Pull latest code (optional, uncomment if needed)
# git pull origin main

echo "📦 Building and starting containers..."
docker-compose up -d --build

echo "🗄️ Running database migrations..."
docker-compose exec server npx prisma migrate deploy

echo "✅ Deployment complete! Web accessible at http://localhost:${WEB_PORT:-80}"
