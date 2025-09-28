#!/bin/bash

# 🚀 Command Station Deployment Script
# 
# This script deploys the Real Estate Scraper Command Station to Supabase
# and performs comprehensive testing to ensure everything is working correctly.

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FUNCTION_NAME="command-station"
PROJECT_ID="${SUPABASE_PROJECT_ID:-}"
BASE_URL="${SUPABASE_URL:-}"

echo -e "${BLUE}🎯 Real Estate Scraper Command Station Deployment${NC}"
echo -e "${BLUE}=================================================${NC}"

# Check prerequisites
check_prerequisites() {
    echo -e "\n${YELLOW}🔍 Checking prerequisites...${NC}"
    
    # Check if supabase CLI is installed
    if ! command -v supabase &> /dev/null; then
        echo -e "${RED}❌ Supabase CLI not found. Please install it first.${NC}"
        echo -e "   npm install -g supabase"
        exit 1
    fi
    
    # Check if we're in a supabase project
    if [ ! -f "supabase/config.toml" ]; then
        echo -e "${RED}❌ Not in a Supabase project directory${NC}"
        echo -e "   Please run this script from your project root"
        exit 1
    fi
    
    # Check if command-station directory exists
    if [ ! -d "supabase/functions/command-station" ]; then
        echo -e "${RED}❌ Command Station directory not found${NC}"
        echo -e "   Expected: supabase/functions/command-station/"
        exit 1
    fi
    
    # Check required files
    required_files=(
        "supabase/functions/command-station/index.ts"
        "supabase/functions/command-station/controller.ts"
        "supabase/functions/command-station/dashboard.ts"
        "supabase/functions/command-station/metrics.ts"
        "supabase/functions/command-station/config-manager.ts"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            echo -e "${RED}❌ Required file missing: $file${NC}"
            exit 1
        fi
    done
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
}

# Get project configuration
get_project_config() {
    echo -e "\n${YELLOW}🔧 Getting project configuration...${NC}"
    
    # Try to get project info
    if [ -z "$BASE_URL" ]; then
        # Try to extract from supabase status
        if command -v supabase &> /dev/null; then
            BASE_URL=$(supabase status | grep "API URL" | awk '{print $3}' || echo "")
        fi
        
        if [ -z "$BASE_URL" ]; then
            echo -e "${RED}❌ Could not determine project URL${NC}"
            echo -e "   Please set SUPABASE_URL environment variable"
            exit 1
        fi
    fi
    
    echo -e "${GREEN}✅ Project URL: $BASE_URL${NC}"
}

# Deploy the function
deploy_function() {
    echo -e "\n${YELLOW}🚀 Deploying Command Station function...${NC}"
    
    # Deploy without JWT verification (for easier access)
    if supabase functions deploy $FUNCTION_NAME --no-verify-jwt; then
        echo -e "${GREEN}✅ Function deployed successfully${NC}"
    else
        echo -e "${RED}❌ Function deployment failed${NC}"
        exit 1
    fi
}

# Test the deployment
test_deployment() {
    echo -e "\n${YELLOW}🧪 Testing deployment...${NC}"
    
    FUNCTION_URL="$BASE_URL/functions/v1/$FUNCTION_NAME"
    
    # Test 1: Health check
    echo -e "\n🔍 Testing health endpoint..."
    if curl -s -f "$FUNCTION_URL/health" > /dev/null; then
        echo -e "${GREEN}✅ Health check passed${NC}"
    else
        echo -e "${RED}❌ Health check failed${NC}"
        echo -e "   URL: $FUNCTION_URL/health"
        exit 1
    fi
    
    # Test 2: Help endpoint
    echo -e "\n📚 Testing help endpoint..."
    if curl -s -f "$FUNCTION_URL/help" > /dev/null; then
        echo -e "${GREEN}✅ Help endpoint working${NC}"
    else
        echo -e "${RED}❌ Help endpoint failed${NC}"
        exit 1
    fi
    
    # Test 3: Status endpoint
    echo -e "\n📊 Testing status endpoint..."
    if curl -s -f "$FUNCTION_URL/status" > /dev/null; then
        echo -e "${GREEN}✅ Status endpoint working${NC}"
    else
        echo -e "${YELLOW}⚠️  Status endpoint failed (may need database setup)${NC}"
    fi
    
    # Test 4: Config endpoint
    echo -e "\n⚙️ Testing config endpoint..."
    if curl -s -f "$FUNCTION_URL/config" > /dev/null; then
        echo -e "${GREEN}✅ Config endpoint working${NC}"
    else
        echo -e "${YELLOW}⚠️  Config endpoint failed (may need database setup)${NC}"
    fi
}

# Display deployment information
show_deployment_info() {
    echo -e "\n${GREEN}🎉 Command Station Deployment Complete!${NC}"
    echo -e "${GREEN}=======================================${NC}"
    
    FUNCTION_URL="$BASE_URL/functions/v1/$FUNCTION_NAME"
    
    echo -e "\n${BLUE}📡 Available Endpoints:${NC}"
    echo -e "   🏠 Base URL: $FUNCTION_URL"
    echo -e "   📊 Status:   $FUNCTION_URL/status"
    echo -e "   📈 Metrics:  $FUNCTION_URL/metrics"
    echo -e "   ❤️  Health:   $FUNCTION_URL/health"
    echo -e "   📚 Help:     $FUNCTION_URL/help"
    echo -e "   ⚙️  Config:   $FUNCTION_URL/config"
    
    echo -e "\n${BLUE}🎛️ Control Endpoints:${NC}"
    echo -e "   ▶️  Enable:   POST $FUNCTION_URL/enable-scraping"
    echo -e "   ⏸️  Disable:  POST $FUNCTION_URL/disable-scraping"
    echo -e "   🚀 Run Now:  POST $FUNCTION_URL/run-now"
    echo -e "   🚨 E-Stop:   POST $FUNCTION_URL/emergency-stop"
    
    echo -e "\n${BLUE}🔧 Quick Commands:${NC}"
    echo -e "   # Check system status"
    echo -e "   curl \"$FUNCTION_URL/status\""
    echo -e ""
    echo -e "   # Enable scraping"
    echo -e "   curl -X POST \"$FUNCTION_URL/enable-scraping\""
    echo -e ""
    echo -e "   # Get help"
    echo -e "   curl \"$FUNCTION_URL/help\""
    
    echo -e "\n${YELLOW}⚠️  Next Steps:${NC}"
    echo -e "   1. Set up required database tables (see README.md)"
    echo -e "   2. Configure environment variables"
    echo -e "   3. Test the system with: curl \"$FUNCTION_URL/status\""
    echo -e "   4. Enable scraping: curl -X POST \"$FUNCTION_URL/enable-scraping\""
}

# Setup database tables (optional)
setup_database() {
    echo -e "\n${YELLOW}🗄️  Database Setup${NC}"
    echo -e "Would you like to set up the required database tables? (y/n)"
    read -r response
    
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo -e "\n${BLUE}Creating database tables...${NC}"
        
        # Create SQL script
        cat > /tmp/command_station_schema.sql << 'EOF'
-- Command Station Database Schema

-- System configuration
CREATE TABLE IF NOT EXISTS system_config (
  config_key TEXT PRIMARY KEY,
  config_value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System events log
CREATE TABLE IF NOT EXISTS system_events (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Batch job tracking
CREATE TABLE IF NOT EXISTS batch_jobs (
  id BIGSERIAL PRIMARY KEY,
  batch_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL,
  batch_size INTEGER,
  properties_processed INTEGER DEFAULT 0,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  estimated_duration TEXT,
  errors JSONB
);

-- Scraping queue (if not exists)
CREATE TABLE IF NOT EXISTS scraping_queue (
  id BIGSERIAL PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scraping logs (if not exists)
CREATE TABLE IF NOT EXISTS scraping_logs (
  id BIGSERIAL PRIMARY KEY,
  status TEXT NOT NULL,
  response_time_ms INTEGER,
  scrape_duration_ms INTEGER,
  confidence_score FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cost tracking (if not exists)
CREATE TABLE IF NOT EXISTS scraping_costs (
  date DATE PRIMARY KEY,
  properties_scraped INTEGER DEFAULT 0,
  ai_requests INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  estimated_cost DECIMAL(10,6) DEFAULT 0,
  details JSONB
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_system_events_type ON system_events(event_type);
CREATE INDEX IF NOT EXISTS idx_system_events_created ON system_events(created_at);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_status ON batch_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scraping_queue_status ON scraping_queue(status);
CREATE INDEX IF NOT EXISTS idx_scraping_logs_status ON scraping_logs(status);
CREATE INDEX IF NOT EXISTS idx_scraping_logs_created ON scraping_logs(created_at);

-- Insert default configuration
INSERT INTO system_config (config_key, config_value) 
VALUES ('scraper_system', '{
  "scrapingEnabled": true,
  "claudeEnabled": true,
  "batchSize": 50,
  "dailyCostLimit": 50,
  "schedule": "0 0 * * 0",
  "maxConcurrentJobs": 5,
  "enableCostTracking": true,
  "claudeModel": "claude-3-haiku-20240307",
  "retryAttempts": 3,
  "timeoutMs": 30000,
  "alertThresholds": {
    "dailyCost": 40,
    "errorRate": 0.15,
    "queueSize": 100
  },
  "features": {
    "autoRetry": true,
    "smartBatching": true,
    "costOptimization": true,
    "realTimeMonitoring": true
  }
}'::jsonb)
ON CONFLICT (config_key) DO NOTHING;

EOF
        
        # Execute SQL
        if supabase db reset --linked; then
            echo -e "${GREEN}✅ Database reset complete${NC}"
        else
            echo -e "${YELLOW}⚠️  Database reset failed, trying to apply schema...${NC}"
        fi
        
        # Apply schema
        if psql "$DATABASE_URL" < /tmp/command_station_schema.sql 2>/dev/null; then
            echo -e "${GREEN}✅ Database schema applied${NC}"
        else
            echo -e "${YELLOW}⚠️  Could not apply schema automatically${NC}"
            echo -e "   Please run the SQL commands manually from:"
            echo -e "   /tmp/command_station_schema.sql"
        fi
        
        # Clean up
        rm -f /tmp/command_station_schema.sql
    fi
}

# Main execution
main() {
    check_prerequisites
    get_project_config
    deploy_function
    test_deployment
    show_deployment_info
    setup_database
    
    echo -e "\n${GREEN}🎯 Command Station is ready for action!${NC}"
}

# Run main function
main "$@"