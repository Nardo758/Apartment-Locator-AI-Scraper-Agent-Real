#!/bin/bash
# setup-environment.sh
# Interactive environment setup for Enhanced Property Scraper System

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Enhanced Property Scraper - Environment Setup${NC}"
echo "=================================================="
echo ""

# Check if .env already exists
if [[ -f ".env" ]]; then
    echo -e "${YELLOW}⚠️  .env file already exists${NC}"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
fi

# Copy template
cp .env.example .env
echo -e "${GREEN}✅ Created .env file from template${NC}"
echo ""

# Function to update env variable
update_env_var() {
    local var_name=$1
    local var_description=$2
    local is_required=$3
    local current_value=$(grep "^$var_name=" .env | cut -d'=' -f2-)
    
    echo -e "${BLUE}$var_description${NC}"
    if [[ "$is_required" == "true" ]]; then
        echo -e "${RED}[REQUIRED]${NC}"
    else
        echo -e "${YELLOW}[OPTIONAL]${NC}"
    fi
    
    if [[ -n "$current_value" && "$current_value" != *"your-"* && "$current_value" != *"example"* ]]; then
        echo "Current value: $current_value"
        read -p "Keep current value? (Y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Nn]$ ]]; then
            read -p "Enter new value: " new_value
            sed -i "s|^$var_name=.*|$var_name=$new_value|" .env
        fi
    else
        if [[ "$is_required" == "true" ]]; then
            while true; do
                read -p "Enter value: " new_value
                if [[ -n "$new_value" ]]; then
                    sed -i "s|^$var_name=.*|$var_name=$new_value|" .env
                    break
                else
                    echo -e "${RED}This field is required!${NC}"
                fi
            done
        else
            read -p "Enter value (or press Enter to skip): " new_value
            if [[ -n "$new_value" ]]; then
                sed -i "s|^$var_name=.*|$var_name=$new_value|" .env
            fi
        fi
    fi
    echo ""
}

echo -e "${BLUE}📋 Let's configure your environment variables...${NC}"
echo ""

# Required variables
echo -e "${BLUE}=== REQUIRED CONFIGURATION ===${NC}"
echo ""

update_env_var "SUPABASE_URL" "🗄️  Supabase Project URL (from your Supabase dashboard)" "true"
update_env_var "SUPABASE_ANON_KEY" "🔑 Supabase Anonymous Key (from your Supabase dashboard)" "true"
update_env_var "SUPABASE_SERVICE_ROLE_KEY" "🔐 Supabase Service Role Key (from your Supabase dashboard)" "true"
update_env_var "ANTHROPIC_API_KEY" "🤖 Anthropic API Key (from https://console.anthropic.com/)" "true"

# Optional variables
echo -e "${BLUE}=== OPTIONAL CONFIGURATION ===${NC}"
echo ""

echo -e "${YELLOW}The following settings have sensible defaults but can be customized:${NC}"
echo ""

read -p "Do you want to customize scraper settings? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    update_env_var "BATCH_SIZE" "📦 Batch size for scraping operations (default: 50)" "false"
    update_env_var "DAILY_COST_LIMIT" "💰 Daily cost limit in USD (default: 50)" "false"
    update_env_var "SCRAPING_REGIONS" "🌍 Regions to scrape (comma-separated, default: atlanta,new-york,chicago,miami,dallas)" "false"
fi

read -p "Do you want to set up monitoring alerts? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    update_env_var "SLACK_WEBHOOK_URL" "📢 Slack webhook URL for notifications" "false"
    update_env_var "ALERT_EMAIL" "📧 Email for alerts" "false"
fi

# Validate configuration
echo -e "${BLUE}🔍 Validating configuration...${NC}"

# Source the .env file
set -a
source .env
set +a

# Check required variables
REQUIRED_VARS=("SUPABASE_URL" "SUPABASE_ANON_KEY" "SUPABASE_SERVICE_ROLE_KEY" "ANTHROPIC_API_KEY")
VALIDATION_PASSED=true

for var in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!var}" ]] || [[ "${!var}" == *"your-"* ]] || [[ "${!var}" == *"example"* ]]; then
        echo -e "${RED}❌ $var is not properly configured${NC}"
        VALIDATION_PASSED=false
    else
        echo -e "${GREEN}✅ $var is configured${NC}"
    fi
done

if [[ "$VALIDATION_PASSED" == "false" ]]; then
    echo ""
    echo -e "${RED}❌ Configuration validation failed!${NC}"
    echo "Please edit .env manually to fix the missing values."
    exit 1
fi

# Test Supabase connection
echo ""
echo -e "${BLUE}🔗 Testing Supabase connection...${NC}"
if command -v curl &> /dev/null; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        "$SUPABASE_URL/rest/v1/" \
        -H "apikey: $SUPABASE_ANON_KEY" || echo "000")
    
    if [[ "$HTTP_CODE" == "200" ]]; then
        echo -e "${GREEN}✅ Supabase connection successful${NC}"
    else
        echo -e "${YELLOW}⚠️  Supabase connection test inconclusive (HTTP $HTTP_CODE)${NC}"
        echo "This may be normal - the connection will be tested again during deployment."
    fi
else
    echo -e "${YELLOW}⚠️  curl not available, skipping connection test${NC}"
fi

# Test Anthropic API
echo -e "${BLUE}🤖 Testing Anthropic API...${NC}"
if command -v curl &> /dev/null; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "x-api-key: $ANTHROPIC_API_KEY" \
        -H "anthropic-version: 2023-06-01" \
        "https://api.anthropic.com/v1/messages" \
        -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":10,"messages":[{"role":"user","content":"test"}]}' || echo "000")
    
    if [[ "$HTTP_CODE" == "200" ]]; then
        echo -e "${GREEN}✅ Anthropic API connection successful${NC}"
    elif [[ "$HTTP_CODE" == "400" ]]; then
        echo -e "${GREEN}✅ Anthropic API key is valid${NC}"
    else
        echo -e "${YELLOW}⚠️  Anthropic API test inconclusive (HTTP $HTTP_CODE)${NC}"
        echo "Please verify your API key is correct."
    fi
else
    echo -e "${YELLOW}⚠️  curl not available, skipping API test${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Environment setup complete!${NC}"
echo ""
echo -e "${BLUE}📋 Summary:${NC}"
echo "  ✅ .env file created and configured"
echo "  ✅ Required variables validated"
echo "  ✅ Connection tests completed"
echo ""
echo -e "${BLUE}🚀 Next steps:${NC}"
echo "  1. Run: ./test-enhanced-system.sh"
echo "  2. Run: ./deploy-scraper.sh"
echo "  3. Run: ./control-scraper.sh status"
echo ""
echo -e "${YELLOW}💡 Tip: Keep your .env file secure and never commit it to git!${NC}"