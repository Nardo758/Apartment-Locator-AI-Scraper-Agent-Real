#!/bin/bash

# Production Deployment Script
set -e

echo "🚀 Deploying to Production..."

# Load environment variables
if [ -f ".env.production" ]; then
    export $(cat .env.production | xargs)
fi

# Deploy functions
echo "📡 Deploying functions..."
supabase functions deploy ai-scraper-worker --no-verify-jwt
supabase functions deploy command-station --no-verify-jwt
supabase functions deploy scraper-orchestrator --no-verify-jwt

# Test deployment
echo "🧪 Testing deployment..."
curl -f "https://$(supabase status | grep 'API URL' | awk '{print $3}' | sed 's|https://||')/functions/v1/command-station/health" || {
    echo "❌ Health check failed"
    exit 1
}

echo "✅ Production deployment completed!"
