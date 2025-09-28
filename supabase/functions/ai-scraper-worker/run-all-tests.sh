#!/bin/bash

# AI Scraper Worker - Complete Test Suite Runner
# This script runs all available tests for the ai-scraper-worker function

echo "🚀 AI Scraper Worker - Complete Test Suite"
echo "=========================================="
echo ""

# Check if Deno is installed
if ! command -v deno &> /dev/null; then
    echo "❌ Deno is not installed. Please install it first:"
    echo "   curl -fsSL https://deno.land/install.sh | sh"
    exit 1
fi

echo "✅ Deno $(deno --version | head -1) detected"
echo ""

# 1. Function Analysis
echo "📊 Step 1: Function Structure Analysis"
echo "--------------------------------------"
deno run --allow-read analyze-function.ts
echo ""

# 2. Validation Tests
echo "🧪 Step 2: Validation Unit Tests"
echo "--------------------------------"
deno run --allow-read test-validation.ts
echo ""

# 3. Check for environment variables (for integration tests)
echo "🔍 Step 3: Environment Check"
echo "----------------------------"
ENV_READY=true

if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  OPENAI_API_KEY not set"
    ENV_READY=false
fi

if [ -z "$SUPABASE_URL" ]; then
    echo "⚠️  SUPABASE_URL not set"
    ENV_READY=false
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "⚠️  SUPABASE_SERVICE_ROLE_KEY not set"
    ENV_READY=false
fi

if [ "$ENV_READY" = true ]; then
    echo "✅ Environment variables are configured"
    echo ""
    
    # Check if function server is running
    echo "🌐 Step 4: Integration Test Readiness"
    echo "------------------------------------"
    
    if curl -s http://localhost:54321/functions/v1/ai-scraper-worker > /dev/null 2>&1; then
        echo "✅ Function server is running at http://localhost:54321"
        echo ""
        
        echo "🔥 Step 5: Running Integration Tests"
        echo "----------------------------------"
        deno run --allow-net --allow-env --allow-read test-ai-scraper.ts
    else
        echo "⚠️  Function server is not running"
        echo "   To run integration tests:"
        echo "   1. supabase functions serve ai-scraper-worker --env-file .env.local"
        echo "   2. deno run --allow-net --allow-env --allow-read test-ai-scraper.ts"
    fi
else
    echo "⚠️  Environment not ready for integration tests"
    echo "   Create .env.local with required variables:"
    echo "   - OPENAI_API_KEY"
    echo "   - SUPABASE_URL" 
    echo "   - SUPABASE_SERVICE_ROLE_KEY"
fi

echo ""
echo "🎉 Test suite completed!"
echo ""
echo "📚 Available Commands:"
echo "   Analysis:    deno run --allow-read analyze-function.ts"
echo "   Validation:  deno run --allow-read test-validation.ts"
echo "   Integration: deno run --allow-net --allow-env --allow-read test-ai-scraper.ts"
echo "   Start server: supabase functions serve ai-scraper-worker --env-file .env.local"
echo ""
echo "📖 For detailed documentation: cat README.md"