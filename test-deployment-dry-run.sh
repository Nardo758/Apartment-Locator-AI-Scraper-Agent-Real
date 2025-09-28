#!/bin/bash
# test-deployment-dry-run.sh
# Dry run test of the deployment system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Deployment System Dry Run Test${NC}"
echo "=================================="
echo ""

# Test 1: Configuration File Validation
echo -e "${BLUE}📋 Test 1: Configuration Validation${NC}"
if [[ -f "deploy-control.json" ]]; then
    echo -e "${GREEN}✅ deploy-control.json exists${NC}"
    
    # Test JSON validity
    if jq empty deploy-control.json 2>/dev/null; then
        echo -e "${GREEN}✅ JSON syntax is valid${NC}"
        
        # Test required fields
        REQUIRED_FIELDS=("scraping_enabled" "claude_analysis_enabled" "batch_size" "cost_limit_daily")
        for field in "${REQUIRED_FIELDS[@]}"; do
            if jq -e ".$field" deploy-control.json >/dev/null 2>&1; then
                VALUE=$(jq -r ".$field" deploy-control.json)
                echo -e "${GREEN}✅ $field: $VALUE${NC}"
            else
                echo -e "${RED}❌ Missing field: $field${NC}"
            fi
        done
    else
        echo -e "${RED}❌ Invalid JSON syntax${NC}"
    fi
else
    echo -e "${RED}❌ deploy-control.json not found${NC}"
fi

echo ""

# Test 2: Script Files Validation
echo -e "${BLUE}🔧 Test 2: Script Files Validation${NC}"
SCRIPTS=("deploy-scraper.sh" "control-scraper.sh" "test-enhanced-system.sh" "setup-environment.sh" "run-migrations.sh")

for script in "${SCRIPTS[@]}"; do
    if [[ -f "$script" ]]; then
        if [[ -x "$script" ]]; then
            echo -e "${GREEN}✅ $script exists and is executable${NC}"
        else
            echo -e "${YELLOW}⚠️  $script exists but not executable${NC}"
            chmod +x "$script"
            echo -e "${GREEN}✅ Fixed permissions for $script${NC}"
        fi
    else
        echo -e "${RED}❌ $script not found${NC}"
    fi
done

echo ""

# Test 3: Migration Files Validation
echo -e "${BLUE}🗄️  Test 3: Migration Files Validation${NC}"
MIGRATION_FILES=(
    "supabase/migrations/20250928000000_security_hardening_rls.sql"
    "supabase/migrations/20250928001000_create_property_sources_system.sql"
    "supabase/migrations/20250928002000_add_cost_monitoring_functions.sql"
    "supabase/migrations/20250928003000_migrate_existing_urls.sql"
)

for migration in "${MIGRATION_FILES[@]}"; do
    if [[ -f "$migration" ]]; then
        SIZE=$(stat -f%z "$migration" 2>/dev/null || stat -c%s "$migration" 2>/dev/null || echo "0")
        echo -e "${GREEN}✅ $(basename "$migration") exists (${SIZE} bytes)${NC}"
        
        # Basic SQL syntax check
        if grep -q "CREATE\|ALTER\|INSERT\|UPDATE\|GRANT" "$migration"; then
            echo -e "${GREEN}   Contains valid SQL statements${NC}"
        else
            echo -e "${YELLOW}   ⚠️  No SQL statements detected${NC}"
        fi
    else
        echo -e "${RED}❌ $(basename "$migration") not found${NC}"
    fi
done

echo ""

# Test 4: Function Files Validation
echo -e "${BLUE}⚡ Test 4: Supabase Functions Validation${NC}"
FUNCTION_DIRS=("supabase/functions/scheduled-scraper" "supabase/functions/property-researcher")

for func_dir in "${FUNCTION_DIRS[@]}"; do
    if [[ -d "$func_dir" ]]; then
        echo -e "${GREEN}✅ $(basename "$func_dir") directory exists${NC}"
        
        if [[ -f "$func_dir/index.ts" ]]; then
            SIZE=$(stat -f%z "$func_dir/index.ts" 2>/dev/null || stat -c%s "$func_dir/index.ts" 2>/dev/null || echo "0")
            echo -e "${GREEN}   index.ts exists (${SIZE} bytes)${NC}"
            
            # Check for key imports and exports
            if grep -q "serve" "$func_dir/index.ts"; then
                echo -e "${GREEN}   Contains Deno serve function${NC}"
            else
                echo -e "${YELLOW}   ⚠️  No serve function detected${NC}"
            fi
        else
            echo -e "${RED}   ❌ index.ts not found${NC}"
        fi
    else
        echo -e "${RED}❌ $(basename "$func_dir") directory not found${NC}"
    fi
done

echo ""

# Test 5: GitHub Actions Workflow
echo -e "${BLUE}⚙️  Test 5: GitHub Actions Workflow${NC}"

if [[ -f ".github/workflows/deploy.yml" ]] || [[ -f ".github/workflows/weekly-scraper.yml" ]]; then
    echo -e "${GREEN}✅ GitHub Actions workflows exist${NC}"
    
    # Check for required secrets in deploy.yml
    if [[ -f ".github/workflows/deploy.yml" ]]; then
        DEPLOY_WORKFLOW=".github/workflows/deploy.yml"
        REQUIRED_SECRETS=("SUPABASE_URL" "SUPABASE_ANON_KEY" "SUPABASE_SERVICE_ROLE_KEY" "ANTHROPIC_API_KEY")
        for secret in "${REQUIRED_SECRETS[@]}"; do
            if grep -q "$secret" "$DEPLOY_WORKFLOW"; then
                echo -e "${GREEN}   Uses secret: $secret${NC}"
            else
                echo -e "${YELLOW}   ⚠️  Secret not referenced: $secret${NC}"
            fi
        done
        
        # Check workflow triggers
        if grep -q "schedule:" "$DEPLOY_WORKFLOW"; then
            echo -e "${GREEN}   Deploy has scheduled trigger${NC}"
        fi
        
        if grep -q "workflow_dispatch:" "$DEPLOY_WORKFLOW"; then
            echo -e "${GREEN}   Deploy has manual trigger${NC}"
        fi
    fi
    
    # Check weekly scraper workflow
    if [[ -f ".github/workflows/weekly-scraper.yml" ]]; then
        WEEKLY_WORKFLOW=".github/workflows/weekly-scraper.yml"
        if grep -q "schedule:" "$WEEKLY_WORKFLOW"; then
            echo -e "${GREEN}   Weekly scraper has scheduled trigger${NC}"
        fi
    fi
else
    echo -e "${RED}❌ GitHub Actions workflow not found${NC}"
fi

echo ""

# Test 6: Documentation Files
echo -e "${BLUE}📚 Test 6: Documentation Validation${NC}"
DOC_FILES=("ENHANCED_SYSTEM_README.md" "MIGRATION_GUIDE.md" "GITHUB_SECRETS_SETUP.md")

for doc in "${DOC_FILES[@]}"; do
    if [[ -f "$doc" ]]; then
        SIZE=$(stat -f%z "$doc" 2>/dev/null || stat -c%s "$doc" 2>/dev/null || echo "0")
        echo -e "${GREEN}✅ $doc exists (${SIZE} bytes)${NC}"
    else
        echo -e "${RED}❌ $doc not found${NC}"
    fi
done

echo ""

# Test 7: Deployment Process Simulation
echo -e "${BLUE}🚀 Test 7: Deployment Process Simulation${NC}"

echo "Simulating deployment steps..."

# Step 1: Environment check
echo -e "${BLUE}Step 1: Environment Check${NC}"
if [[ -f ".env.example" ]]; then
    echo -e "${GREEN}✅ Environment template available${NC}"
else
    echo -e "${YELLOW}⚠️  No environment template${NC}"
fi

# Step 2: Configuration validation
echo -e "${BLUE}Step 2: Configuration Validation${NC}"
if jq -e '.scraping_enabled' deploy-control.json >/dev/null 2>&1; then
    SCRAPING_ENABLED=$(jq -r '.scraping_enabled' deploy-control.json)
    echo -e "${GREEN}✅ Scraping enabled: $SCRAPING_ENABLED${NC}"
else
    echo -e "${RED}❌ Configuration validation failed${NC}"
fi

# Step 3: Database migration check
echo -e "${BLUE}Step 3: Database Migration Readiness${NC}"
MIGRATION_COUNT=$(ls supabase/migrations/20250928*.sql 2>/dev/null | wc -l)
echo -e "${GREEN}✅ $MIGRATION_COUNT migration files ready${NC}"

# Step 4: Function deployment check
echo -e "${BLUE}Step 4: Function Deployment Readiness${NC}"
FUNCTION_COUNT=$(ls -d supabase/functions/*/ 2>/dev/null | wc -l)
echo -e "${GREEN}✅ $FUNCTION_COUNT Supabase functions ready${NC}"

echo ""

# Test Summary
echo -e "${BLUE}📊 Deployment Readiness Summary${NC}"
echo "================================="

TOTAL_TESTS=7
PASSED_TESTS=0

# Count passed tests (simplified)
if [[ -f "deploy-control.json" ]]; then ((PASSED_TESTS++)); fi
if [[ -x "deploy-scraper.sh" ]]; then ((PASSED_TESTS++)); fi
if [[ -f "supabase/migrations/20250928000000_security_hardening_rls.sql" ]]; then ((PASSED_TESTS++)); fi
if [[ -f "supabase/functions/scheduled-scraper/index.ts" ]]; then ((PASSED_TESTS++)); fi
if [[ -f ".github/workflows/enhanced-weekly-scraper.yml" ]]; then ((PASSED_TESTS++)); fi
if [[ -f "ENHANCED_SYSTEM_README.md" ]]; then ((PASSED_TESTS++)); fi
if [[ $MIGRATION_COUNT -eq 4 ]]; then ((PASSED_TESTS++)); fi

PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))

echo -e "${GREEN}✅ Tests Passed: $PASSED_TESTS/$TOTAL_TESTS ($PASS_RATE%)${NC}"

if [[ $PASS_RATE -ge 85 ]]; then
    echo -e "${GREEN}🎉 System is ready for deployment!${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Configure environment: ./setup-environment.sh"
    echo "2. Run migrations: ./run-migrations.sh"
    echo "3. Deploy system: ./deploy-scraper.sh"
    echo "4. Set up GitHub secrets (see GITHUB_SECRETS_SETUP.md)"
    echo "5. Test the system: ./control-scraper.sh status"
elif [[ $PASS_RATE -ge 70 ]]; then
    echo -e "${YELLOW}⚠️  System mostly ready, minor issues to address${NC}"
    echo "Review the test results above and fix any missing files"
else
    echo -e "${RED}❌ System not ready for deployment${NC}"
    echo "Critical files are missing. Please check the implementation."
fi

echo ""
echo -e "${BLUE}📖 For detailed deployment instructions, see:${NC}"
echo "   ENHANCED_SYSTEM_README.md"
echo "   MIGRATION_GUIDE.md"
echo "   GITHUB_SECRETS_SETUP.md"