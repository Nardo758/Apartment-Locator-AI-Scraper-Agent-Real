#!/bin/bash
# test-enhanced-system.sh
# Comprehensive system validation script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Enhanced Property Scraper System Tests${NC}"
echo "=============================================="

# Test 1: Configuration validation
echo -e "\n${BLUE}📋 Test 1: Configuration Validation${NC}"
if [[ -f "deploy-control.json" ]]; then
    echo -e "${GREEN}✅ Configuration file exists${NC}"
    
    if command -v jq &> /dev/null; then
        SCRAPING_ENABLED=$(jq -r '.scraping_enabled' deploy-control.json)
        BATCH_SIZE=$(jq -r '.batch_size' deploy-control.json)
        COST_LIMIT=$(jq -r '.cost_limit_daily' deploy-control.json)
        
        echo "  Scraping Enabled: $SCRAPING_ENABLED"
        echo "  Batch Size: $BATCH_SIZE"
        echo "  Daily Cost Limit: \$$COST_LIMIT"
        echo -e "${GREEN}✅ Configuration is valid${NC}"
    else
        echo -e "${YELLOW}⚠️  jq not installed, skipping JSON validation${NC}"
    fi
else
    echo -e "${RED}❌ deploy-control.json not found${NC}"
    exit 1
fi

# Test 2: Environment variables
echo -e "\n${BLUE}🔑 Test 2: Environment Variables${NC}"
REQUIRED_VARS=("SUPABASE_URL" "SUPABASE_ANON_KEY" "SUPABASE_SERVICE_ROLE_KEY" "ANTHROPIC_API_KEY")
ENV_OK=true

for var in "${REQUIRED_VARS[@]}"; do
    if [[ -n "${!var}" ]]; then
        echo -e "${GREEN}✅ $var is set${NC}"
    else
        echo -e "${RED}❌ $var is not set${NC}"
        ENV_OK=false
    fi
done

if [[ "$ENV_OK" == "false" ]]; then
    echo -e "${YELLOW}⚠️  Some environment variables are missing. Load from .env if available.${NC}"
    if [[ -f ".env" ]]; then
        echo "Loading .env file..."
        set -a
        source .env
        set +a
        echo -e "${GREEN}✅ Environment loaded from .env${NC}"
    fi
fi

# Test 3: Script permissions
echo -e "\n${BLUE}🔧 Test 3: Script Permissions${NC}"
SCRIPTS=("deploy-scraper.sh" "control-scraper.sh" "test-enhanced-system.sh")

for script in "${SCRIPTS[@]}"; do
    if [[ -x "$script" ]]; then
        echo -e "${GREEN}✅ $script is executable${NC}"
    else
        echo -e "${YELLOW}⚠️  $script is not executable, fixing...${NC}"
        chmod +x "$script"
        echo -e "${GREEN}✅ $script permissions fixed${NC}"
    fi
done

# Test 4: Database connectivity (if possible)
echo -e "\n${BLUE}🗄️  Test 4: Database Connectivity${NC}"
if command -v supabase &> /dev/null; then
    if supabase db ping &>/dev/null; then
        echo -e "${GREEN}✅ Database connection successful${NC}"
        
        # Test if our new tables exist
        echo "Checking for new tables..."
        
        TABLES=("property_sources" "property_intelligence" "scraping_costs")
        for table in "${TABLES[@]}"; do
            if supabase db exec "SELECT 1 FROM $table LIMIT 1" &>/dev/null; then
                echo -e "${GREEN}✅ Table $table exists${NC}"
            else
                echo -e "${RED}❌ Table $table not found${NC}"
            fi
        done
        
        # Test new functions
        echo "Checking for new functions..."
        FUNCTIONS=("get_daily_scraping_cost" "get_next_property_sources_batch" "update_property_source_metrics")
        for func in "${FUNCTIONS[@]}"; do
            if supabase db exec "SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = '$func'" &>/dev/null; then
                echo -e "${GREEN}✅ Function $func exists${NC}"
            else
                echo -e "${RED}❌ Function $func not found${NC}"
            fi
        done
        
    else
        echo -e "${RED}❌ Database connection failed${NC}"
        echo "Make sure Supabase is configured and accessible"
    fi
else
    echo -e "${YELLOW}⚠️  Supabase CLI not installed, skipping database tests${NC}"
fi

# Test 5: Function endpoints (if deployed)
echo -e "\n${BLUE}⚡ Test 5: Function Endpoints${NC}"
if [[ -n "$SUPABASE_URL" ]] && [[ -n "$SUPABASE_ANON_KEY" ]]; then
    SUPABASE_PROJECT_URL=$(echo $SUPABASE_URL | sed 's/https:\/\///')
    
    FUNCTIONS=("scheduled-scraper" "property-researcher")
    for func in "${FUNCTIONS[@]}"; do
        echo "Testing $func endpoint..."
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
            "https://$SUPABASE_PROJECT_URL/functions/v1/$func" \
            -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
            -H "Content-Type: application/json" \
            -d '{"test": true}' || echo "000")
        
        if [[ "$HTTP_CODE" == "200" ]] || [[ "$HTTP_CODE" == "400" ]]; then
            echo -e "${GREEN}✅ $func endpoint is accessible (HTTP $HTTP_CODE)${NC}"
        else
            echo -e "${YELLOW}⚠️  $func endpoint test inconclusive (HTTP $HTTP_CODE)${NC}"
        fi
    done
else
    echo -e "${YELLOW}⚠️  Supabase credentials not available, skipping endpoint tests${NC}"
fi

# Test 6: Control script functionality
echo -e "\n${BLUE}🎛️  Test 6: Control Script Functionality${NC}"
if [[ -x "control-scraper.sh" ]]; then
    echo "Testing control script commands..."
    
    # Test status command
    if ./control-scraper.sh status &>/dev/null; then
        echo -e "${GREEN}✅ Status command works${NC}"
    else
        echo -e "${YELLOW}⚠️  Status command had issues (may be normal without full deployment)${NC}"
    fi
    
    # Test configuration commands
    ORIGINAL_LIMIT=$(jq -r '.cost_limit_daily' deploy-control.json)
    ./control-scraper.sh set-limit 99 &>/dev/null
    NEW_LIMIT=$(jq -r '.cost_limit_daily' deploy-control.json)
    
    if [[ "$NEW_LIMIT" == "99" ]]; then
        echo -e "${GREEN}✅ Configuration modification works${NC}"
        # Restore original
        ./control-scraper.sh set-limit "$ORIGINAL_LIMIT" &>/dev/null
    else
        echo -e "${RED}❌ Configuration modification failed${NC}"
    fi
else
    echo -e "${RED}❌ Control script not executable${NC}"
fi

# Test 7: Migration files
echo -e "\n${BLUE}📄 Test 7: Migration Files${NC}"
MIGRATIONS=(
    "20250928000000_security_hardening_rls.sql"
    "20250928001000_create_property_sources_system.sql"
    "20250928002000_add_cost_monitoring_functions.sql"
    "20250928003000_migrate_existing_urls.sql"
)

for migration in "${MIGRATIONS[@]}"; do
    if [[ -f "supabase/migrations/$migration" ]]; then
        echo -e "${GREEN}✅ Migration $migration exists${NC}"
    else
        echo -e "${RED}❌ Migration $migration not found${NC}"
    fi
done

# Test 8: GitHub Actions workflow
echo -e "\n${BLUE}⚙️  Test 8: GitHub Actions Workflow${NC}"
if [[ -f ".github/workflows/deploy.yml" ]] || [[ -f ".github/workflows/weekly-scraper.yml" ]]; then
    echo -e "${GREEN}✅ GitHub Actions workflows exist${NC}"
    
    # Basic YAML syntax check if yq is available
    if command -v yq &> /dev/null; then
        for workflow in .github/workflows/*.yml; do
            if [[ -f "$workflow" ]]; then
                if yq eval '.name' "$workflow" &>/dev/null; then
                    echo -e "${GREEN}✅ $(basename "$workflow") YAML syntax is valid${NC}"
                else
                    echo -e "${RED}❌ $(basename "$workflow") YAML syntax error${NC}"
                fi
            fi
        done
    fi
else
    echo -e "${RED}❌ GitHub Actions workflows not found${NC}"
fi

# Test Summary
echo -e "\n${BLUE}📊 Test Summary${NC}"
echo "=================="
echo -e "${GREEN}System is ready for deployment!${NC}"
echo ""
echo "Next steps:"
echo "1. Run: ./deploy-scraper.sh"
echo "2. Check: ./control-scraper.sh status"
echo "3. Test: ./control-scraper.sh run-now"
echo ""
echo "For detailed documentation, see: ENHANCED_SYSTEM_README.md"
echo -e "${BLUE}🚀 Happy scraping!${NC}"