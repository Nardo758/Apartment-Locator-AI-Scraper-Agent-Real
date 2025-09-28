#!/bin/bash

# Command Station Deployment Script
# Real Estate Scraper Command Station

set -e

echo "🚀 Deploying Real Estate Scraper Command Station..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found. Please install it first:${NC}"
    echo "npm install -g supabase"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "index.ts" ]; then
    echo -e "${RED}❌ Please run this script from the command-station directory${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Pre-deployment checks...${NC}"

# Check required files
required_files=("index.ts" "controller.ts" "dashboard.ts" "metrics.ts" "config-manager.ts")
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ Missing required file: $file${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Found: $file${NC}"
done

# Check environment variables
echo -e "${BLUE}🔐 Checking environment variables...${NC}"
if [ -z "$SUPABASE_PROJECT_ID" ]; then
    echo -e "${YELLOW}⚠️  SUPABASE_PROJECT_ID not set. Using default project.${NC}"
fi

# Option 1: Deploy as separate function
echo -e "${BLUE}🎯 Deployment Options:${NC}"
echo "1. Deploy as separate command-station function (RECOMMENDED)"
echo "2. Integrate with existing ai-scraper-worker"
echo "3. Deploy both options"

read -p "Choose option (1-3): " option

case $option in
    1|3)
        echo -e "${BLUE}🚀 Deploying command-station as separate function...${NC}"
        
        # Create function directory if it doesn't exist
        mkdir -p ../supabase/functions/command-station
        
        # Copy files to supabase functions directory
        cp -r ./* ../supabase/functions/command-station/
        
        # Deploy the function
        cd ../
        supabase functions deploy command-station --no-verify-jwt
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Command station deployed successfully!${NC}"
        else
            echo -e "${RED}❌ Deployment failed${NC}"
            exit 1
        fi
        
        cd command-station
        ;;
esac

case $option in
    2|3)
        echo -e "${BLUE}🔗 Integrating with ai-scraper-worker...${NC}"
        
        # Check if ai-scraper-worker exists
        if [ ! -d "../supabase/functions/ai-scraper-worker" ]; then
            echo -e "${RED}❌ ai-scraper-worker function not found${NC}"
            exit 1
        fi
        
        # Copy command station files to ai-scraper-worker
        mkdir -p ../supabase/functions/ai-scraper-worker/command-station
        cp ./* ../supabase/functions/ai-scraper-worker/command-station/
        
        echo -e "${YELLOW}⚠️  Integration files copied. You'll need to manually update the ai-scraper-worker index.ts to include command station routes.${NC}"
        ;;
esac

# Create database table for configuration if it doesn't exist
echo -e "${BLUE}🗄️  Setting up configuration table...${NC}"

cat > ../supabase/migrations/$(date +%Y%m%d%H%M%S)_create_system_config.sql << 'EOF'
-- Create system_config table for command station configuration
CREATE TABLE IF NOT EXISTS system_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    config JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on key for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(key);

-- Enable RLS
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access
CREATE POLICY "Service role can manage system config" ON system_config
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Insert default configuration
INSERT INTO system_config (key, config) 
VALUES (
    'command_station_config',
    '{
        "scrapingEnabled": true,
        "claudeEnabled": true,
        "batchSize": 50,
        "dailyCostLimit": 50,
        "schedule": "0 0 * * 0",
        "maxRetries": 3,
        "timeoutMs": 30000,
        "alertThresholds": {
            "errorRate": 0.05,
            "responseTime": 5000,
            "costLimit": 45,
            "memoryUsage": 0.8
        },
        "integrations": {
            "supabase": {
                "enabled": true
            },
            "claude": {
                "enabled": true,
                "model": "claude-3-haiku-20240307",
                "maxTokens": 4096
            },
            "monitoring": {
                "enabled": false
            }
        }
    }'::jsonb
)
ON CONFLICT (key) DO NOTHING;
EOF

# Run the migration
cd ../
supabase db push

echo -e "${GREEN}✅ Database migration completed!${NC}"

# Display access information
echo -e "${BLUE}🌐 Command Station Access Points:${NC}"
echo ""
echo -e "${GREEN}Main Dashboard:${NC}"
echo "curl \"https://$(supabase status | grep 'API URL' | awk '{print $3}' | sed 's|https://||')/functions/v1/command-station/status\""
echo ""
echo -e "${GREEN}Control Commands:${NC}"
echo "# Enable scraping"
echo "curl -X POST \"https://$(supabase status | grep 'API URL' | awk '{print $3}' | sed 's|https://||')/functions/v1/command-station/enable-scraping\""
echo ""
echo "# Disable scraping"
echo "curl -X POST \"https://$(supabase status | grep 'API URL' | awk '{print $3}' | sed 's|https://||')/functions/v1/command-station/disable-scraping\""
echo ""
echo "# Run immediate batch"
echo "curl -X POST \"https://$(supabase status | grep 'API URL' | awk '{print $3}' | sed 's|https://||')/functions/v1/command-station/run-now\""
echo ""
echo "# Get metrics"
echo "curl \"https://$(supabase status | grep 'API URL' | awk '{print $3}' | sed 's|https://||')/functions/v1/command-station/metrics\""
echo ""
echo -e "${YELLOW}📝 Note: Replace the URL with your actual Supabase project URL in production${NC}"

# Create a simple test script
cat > test-command-station.sh << 'EOF'
#!/bin/bash

# Test script for Command Station
BASE_URL="https://your-project.supabase.co/functions/v1/command-station"

echo "🧪 Testing Command Station..."

echo "1. Health check..."
curl -s "$BASE_URL/health" | jq .

echo -e "\n2. System status..."
curl -s "$BASE_URL/status" | jq .

echo -e "\n3. Metrics..."
curl -s "$BASE_URL/metrics" | jq .

echo -e "\n✅ Tests completed!"
EOF

chmod +x test-command-station.sh

echo -e "${GREEN}🎉 Command Station deployment completed successfully!${NC}"
echo -e "${BLUE}📄 Test script created: test-command-station.sh${NC}"
echo -e "${YELLOW}📚 Don't forget to update your environment variables and test the endpoints!${NC}"

cd command-station