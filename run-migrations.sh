#!/bin/bash
# run-migrations.sh
# Script to help run database migrations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🗄️  Database Migration Helper${NC}"
echo "================================"
echo ""

# Check if environment is configured
if [[ ! -f ".env" ]]; then
    echo -e "${RED}❌ .env file not found${NC}"
    echo "Please run: ./setup-environment.sh first"
    exit 1
fi

# Load environment
set -a
source .env
set +a

# Validate required variables
if [[ -z "$SUPABASE_URL" ]] || [[ -z "$SUPABASE_SERVICE_ROLE_KEY" ]]; then
    echo -e "${RED}❌ Missing required environment variables${NC}"
    echo "Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
    exit 1
fi

echo -e "${GREEN}✅ Environment loaded${NC}"
echo "Project URL: $SUPABASE_URL"
echo ""

# Check if Supabase CLI is available
if command -v supabase &> /dev/null; then
    echo -e "${BLUE}🔧 Using Supabase CLI method${NC}"
    
    # Check if project is linked
    if [[ ! -f ".supabase/config.toml" ]]; then
        echo -e "${YELLOW}⚠️  Project not linked. Attempting to link...${NC}"
        
        # Extract project ID from URL
        PROJECT_ID=$(echo $SUPABASE_URL | sed 's/https:\/\///' | sed 's/\.supabase\.co//')
        
        echo "Linking to project: $PROJECT_ID"
        supabase link --project-ref "$PROJECT_ID" || {
            echo -e "${RED}❌ Failed to link project${NC}"
            echo "Please run: supabase link --project-ref your-project-id"
            exit 1
        }
    fi
    
    echo -e "${BLUE}📊 Running database migrations...${NC}"
    supabase db push || {
        echo -e "${RED}❌ Migration failed${NC}"
        exit 1
    }
    
    echo -e "${GREEN}✅ Migrations completed successfully${NC}"
    
else
    echo -e "${YELLOW}⚠️  Supabase CLI not found${NC}"
    echo ""
    echo -e "${BLUE}📋 Manual migration options:${NC}"
    echo ""
    echo "Option 1: Install Supabase CLI and re-run this script"
    echo "  brew install supabase/tap/supabase  # macOS"
    echo "  curl -fsSL https://get.supabase.com | sh  # Linux"
    echo ""
    echo "Option 2: Use Supabase Dashboard SQL Editor"
    echo "  1. Go to: https://supabase.com/dashboard"
    echo "  2. Select your project"
    echo "  3. Go to SQL Editor"
    echo "  4. Run each migration file in order:"
    echo ""
    
    # List migration files in order
    MIGRATION_FILES=(
        "supabase/migrations/20250928000000_security_hardening_rls.sql"
        "supabase/migrations/20250928001000_create_property_sources_system.sql"
        "supabase/migrations/20250928002000_add_cost_monitoring_functions.sql"
        "supabase/migrations/20250928003000_migrate_existing_urls.sql"
    )
    
    for i in "${!MIGRATION_FILES[@]}"; do
        file="${MIGRATION_FILES[$i]}"
        if [[ -f "$file" ]]; then
            echo -e "     ${BLUE}$((i+1)). ${file}${NC} ✅"
        else
            echo -e "     ${RED}$((i+1)). ${file}${NC} ❌ (missing)"
        fi
    done
    
    echo ""
    echo "Option 3: Use psql with direct connection"
    echo "  See MIGRATION_GUIDE.md for detailed instructions"
    echo ""
    
    read -p "Do you want to open the migration files for manual execution? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}📄 Migration file contents:${NC}"
        echo ""
        
        for file in "${MIGRATION_FILES[@]}"; do
            if [[ -f "$file" ]]; then
                echo -e "${BLUE}=== $(basename "$file") ===${NC}"
                echo "File location: $file"
                echo "Copy this content to Supabase SQL Editor:"
                echo ""
                echo "---"
                head -20 "$file"
                echo "... (file continues - copy full content)"
                echo "---"
                echo ""
                read -p "Press Enter to continue to next file..."
                echo ""
            fi
        done
    fi
fi

# Verification step
echo -e "${BLUE}🔍 Migration verification${NC}"
echo "========================"

# Test database connection
echo "Testing database connection..."
RESPONSE=$(curl -s -w "%{http_code}" \
    "$SUPABASE_URL/rest/v1/property_sources?select=count" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -o /tmp/supabase_test.json)

HTTP_CODE=$(echo "$RESPONSE" | tail -c 4)

if [[ "$HTTP_CODE" == "200" ]]; then
    PROPERTY_SOURCES_COUNT=$(cat /tmp/supabase_test.json | grep -o '"count":[0-9]*' | cut -d':' -f2 || echo "0")
    echo -e "${GREEN}✅ Database connection successful${NC}"
    echo "Property sources table accessible with $PROPERTY_SOURCES_COUNT records"
    
    # Test a function
    echo "Testing cost monitoring function..."
    FUNC_RESPONSE=$(curl -s -w "%{http_code}" \
        "$SUPABASE_URL/rest/v1/rpc/get_daily_scraping_cost" \
        -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        -H "Content-Type: application/json" \
        -d '{}' \
        -o /tmp/supabase_func_test.json)
    
    FUNC_HTTP_CODE=$(echo "$FUNC_RESPONSE" | tail -c 4)
    
    if [[ "$FUNC_HTTP_CODE" == "200" ]]; then
        echo -e "${GREEN}✅ Cost monitoring functions working${NC}"
    else
        echo -e "${YELLOW}⚠️  Cost monitoring functions may need migration${NC}"
    fi
    
else
    echo -e "${RED}❌ Database connection failed (HTTP $HTTP_CODE)${NC}"
    echo "This suggests migrations may not be complete"
fi

# Cleanup temp files
rm -f /tmp/supabase_test.json /tmp/supabase_func_test.json

echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
if [[ "$HTTP_CODE" == "200" ]]; then
    echo "✅ Migrations appear successful!"
    echo "1. Run: ./test-enhanced-system.sh"
    echo "2. Run: ./deploy-scraper.sh"
    echo "3. Run: ./control-scraper.sh status"
else
    echo "⚠️  Migrations may be incomplete"
    echo "1. Check MIGRATION_GUIDE.md for manual steps"
    echo "2. Verify all migration files were executed"
    echo "3. Check Supabase Dashboard for errors"
fi

echo ""
echo "For detailed migration instructions, see: MIGRATION_GUIDE.md"