#!/bin/bash
# deploy-scraper.sh
# Enhanced deployment script with cost monitoring and control

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Property Scraper Deployment System${NC}"
echo "========================================"

# Load configuration
if [[ ! -f "deploy-control.json" ]]; then
    echo -e "${RED}❌ deploy-control.json not found${NC}"
    exit 1
fi

CONFIG=$(cat deploy-control.json)

# Check if scraping is enabled
SCRAPING_ENABLED=$(echo $CONFIG | jq -r '.scraping_enabled')
if [[ "$SCRAPING_ENABLED" != "true" ]]; then
    echo -e "${YELLOW}🚫 Scraping is disabled in configuration${NC}"
    echo "To enable: ./control-scraper.sh enable"
    exit 0
fi

# Load environment variables
if [[ -f ".env" ]]; then
    echo -e "${GREEN}📄 Loading environment variables${NC}"
    source .env
else
    echo -e "${YELLOW}⚠️  No .env file found, using system environment${NC}"
fi

# Validate required environment variables
REQUIRED_VARS=("SUPABASE_URL" "SUPABASE_ANON_KEY" "SUPABASE_SERVICE_ROLE_KEY" "ANTHROPIC_API_KEY")
for var in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!var}" ]]; then
        echo -e "${RED}❌ Required environment variable $var is not set${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅ Environment variables validated${NC}"

# Deploy database migrations
echo -e "${BLUE}📊 Deploying database migrations${NC}"
if ! supabase db push; then
    echo -e "${RED}❌ Database migration failed${NC}"
    exit 1
fi

# Deploy Supabase functions
echo -e "${BLUE}⚡ Deploying Supabase functions${NC}"

# Deploy AI scraper worker
if [[ -d "supabase/functions/ai-scraper-worker" ]]; then
    echo "Deploying ai-scraper-worker..."
    supabase functions deploy ai-scraper-worker \
        --no-verify-jwt \
        --env-file .env || {
        echo -e "${RED}❌ Failed to deploy ai-scraper-worker${NC}"
        exit 1
    }
    echo -e "${GREEN}✅ ai-scraper-worker deployed${NC}"
fi

# Deploy property researcher
if [[ -d "supabase/functions/property-researcher" ]]; then
    echo "Deploying property-researcher..."
    supabase functions deploy property-researcher \
        --no-verify-jwt \
        --env-file .env || {
        echo -e "${RED}❌ Failed to deploy property-researcher${NC}"
        exit 1
    }
    echo -e "${GREEN}✅ property-researcher deployed${NC}"
fi

# Deploy scheduled scraper
if [[ -d "supabase/functions/scheduled-scraper" ]]; then
    echo "Deploying scheduled-scraper..."
    supabase functions deploy scheduled-scraper \
        --no-verify-jwt \
        --env-file .env || {
        echo -e "${RED}❌ Failed to deploy scheduled-scraper${NC}"
        exit 1
    }
    echo -e "${GREEN}✅ scheduled-scraper deployed${NC}"
fi

# Test deployment health
echo -e "${BLUE}🔍 Running deployment health checks${NC}"

# Check database connectivity
echo "Testing database connection..."
if ! supabase db ping; then
    echo -e "${RED}❌ Database connection failed${NC}"
    exit 1
fi

# Check if tables exist
TABLES=("property_sources" "scraped_properties" "scraping_queue" "property_intelligence")
for table in "${TABLES[@]}"; do
    if supabase db exec "SELECT 1 FROM $table LIMIT 1" &>/dev/null; then
        echo -e "${GREEN}✅ Table $table exists and accessible${NC}"
    else
        echo -e "${RED}❌ Table $table not accessible${NC}"
        exit 1
    fi
done

# Test function deployment
SUPABASE_PROJECT_URL=$(echo $SUPABASE_URL | sed 's/https:\/\///')
echo "Testing function endpoints..."
if curl -s -f "https://$SUPABASE_PROJECT_URL/functions/v1/scheduled-scraper" -H "Authorization: Bearer $SUPABASE_ANON_KEY" &>/dev/null; then
    echo -e "${GREEN}✅ Functions are accessible${NC}"
else
    echo -e "${YELLOW}⚠️  Function endpoint test inconclusive${NC}"
fi

# Display configuration summary
echo ""
echo -e "${BLUE}📋 Deployment Configuration Summary${NC}"
echo "===================================="
echo "Scraping Enabled: $(echo $CONFIG | jq -r '.scraping_enabled')"
echo "Claude Analysis: $(echo $CONFIG | jq -r '.claude_analysis_enabled')"
echo "Schedule: $(echo $CONFIG | jq -r '.schedule')"
echo "Batch Size: $(echo $CONFIG | jq -r '.batch_size')"
echo "Daily Limit: $$(echo $CONFIG | jq -r '.cost_limit_daily')"
echo "Regions: $(echo $CONFIG | jq -r '.regions | join(", ")')"
echo "Environment: $(echo $CONFIG | jq -r '.environment')"

# Show next scheduled run
if command -v node &> /dev/null; then
    NEXT_RUN=$(node -e "
        const schedule = '$(echo $CONFIG | jq -r '.schedule')';
        const parser = require('cron-parser');
        const interval = parser.parseExpression(schedule);
        console.log(interval.next().toString());
    " 2>/dev/null || echo "Unable to calculate")
    echo "Next Scheduled Run: $NEXT_RUN"
fi

echo ""
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${BLUE}🎯 Scraper Status: ENABLED${NC}"
echo ""
echo "Control commands:"
echo "  ./control-scraper.sh status    - Check current status"
echo "  ./control-scraper.sh disable   - Disable scraping"
echo "  ./control-scraper.sh run-now   - Run scraper immediately"
echo ""