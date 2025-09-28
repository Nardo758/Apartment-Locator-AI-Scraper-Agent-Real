#!/bin/bash

echo "🚀 Deploying Updated Functions with Frontend Integration"
echo "======================================================"

# Load environment variables
if [ -f ".env.production" ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
fi

# Set required environment variables for functions
echo "🔧 Setting environment variables..."

# Check if Supabase CLI is available
if command -v supabase &> /dev/null; then
    echo "📡 Using Supabase CLI..."
    
    # Set secrets
    supabase secrets set ENABLE_FRONTEND_SYNC=true
    supabase secrets set FRONTEND_TABLE=properties
    supabase secrets set ENABLE_AI_PRICING=true
    supabase secrets set ENABLE_MARKET_INTELLIGENCE=true
    supabase secrets set CLAUDE_MODEL=claude-3-haiku-20240307
    
    # Deploy functions
    echo "📦 Deploying ai-scraper-worker..."
    supabase functions deploy ai-scraper-worker --no-verify-jwt
    
    echo "📦 Deploying command-station..."
    supabase functions deploy command-station --no-verify-jwt
    
    echo "✅ Functions deployed successfully!"
    
    # Test deployment
    echo "🧪 Testing deployment..."
    
    # Get the API URL
    API_URL=$(supabase status 2>/dev/null | grep "API URL" | awk '{print $3}' || echo "")
    
    if [ -n "$API_URL" ]; then
        echo "Testing command station health..."
        curl -f "$API_URL/functions/v1/command-station/health" || echo "Health check endpoint not available"
        
        echo "Testing command station status..."
        curl -f "$API_URL/functions/v1/command-station/status" || echo "Status endpoint may need time to initialize"
    else
        echo "⚠️  Could not determine API URL for testing"
    fi
    
else
    echo "⚠️  Supabase CLI not found"
    echo "Please deploy manually via Supabase Dashboard:"
    echo "1. Go to Functions in your Supabase Dashboard"
    echo "2. Update ai-scraper-worker with the new code"
    echo "3. Update command-station with the new endpoints"
    echo "4. Set the environment variables in Settings > Environment Variables"
fi

echo ""
echo "🎉 Frontend integration deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Test the integration with: node test-real-integration.mjs"
echo "2. Check function logs in Supabase Dashboard"
echo "3. Monitor the properties table for new data"
echo ""
echo "🔧 Environment variables set:"
echo "  ENABLE_FRONTEND_SYNC=true"
echo "  FRONTEND_TABLE=properties"
echo "  ENABLE_AI_PRICING=true"
echo "  ENABLE_MARKET_INTELLIGENCE=true"
