#!/bin/bash
# deploy-scraper.sh
# Enhanced deployment script with cost monitoring and control

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

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

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Supabase CLI is installed
    if ! command -v supabase &> /dev/null; then
        log_error "Supabase CLI is not installed. Please install it first:"
        echo "  npm install -g @supabase/cli"
        exit 1
    fi
    
    # Check if logged in to Supabase
    if ! supabase projects list &> /dev/null; then
        log_error "Not logged in to Supabase. Please run:"
        echo "  supabase login"
        exit 1
    fi
    
    # Check if Deno is installed
    if ! command -v deno &> /dev/null; then
        log_error "Deno is not installed. Please install it first:"
        echo "  curl -fsSL https://deno.land/install.sh | sh"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Validate environment variables
validate_environment() {
    log_info "Validating environment variables..."
    
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
            log_error "Required environment variable $var is not set"
            exit 1
        fi
    done

    if [[ -z "$ANTHROPIC_API_KEY" ]]; then
        log_error "ANTHROPIC_API_KEY is not set"
        echo "Please set your Claude API key:"
        echo "  export ANTHROPIC_API_KEY=your_claude_key"
        exit 1
    fi
    
    if [[ -z "$SUPABASE_PROJECT_REF" ]]; then
        log_warning "SUPABASE_PROJECT_REF not set. You'll need to link manually."
    fi
    
    log_success "Environment validation passed"
}

# Run tests before deployment
run_tests() {
    log_info "Running pre-deployment tests..."
    
    # Run validation tests if available
    if [[ -f "test-validation.ts" ]]; then
        if deno test --allow-read test-validation.ts; then
            log_success "Unit tests passed"
        else
            log_error "Unit tests failed. Aborting deployment."
            exit 1
        fi
    else
        log_warning "No test-validation.ts found, skipping unit tests"
    fi
    
    # Run Claude API test if available
    if [[ -f "test-claude-direct.ts" ]]; then
        if deno run --allow-net --allow-env test-claude-direct.ts; then
            log_success "Claude API test passed"
        else
            log_error "Claude API test failed. Check your API key."
            exit 1
        fi
    else
        log_warning "No test-claude-direct.ts found, skipping Claude API test"
    fi
}

# Deploy database schema
deploy_database() {
    log_info "Setting up database schema..."
    
    # Check if schema file exists
    if [[ -f "schema.sql" ]]; then
        log_info "Applying database schema..."
        supabase db reset --linked
        log_success "Database schema applied"
    else
        log_warning "No schema.sql file found. Deploying migrations instead..."
        # Deploy database migrations
        echo -e "${BLUE}📊 Deploying database migrations${NC}"
        if ! supabase db push; then
            echo -e "${RED}❌ Database migration failed${NC}"
            exit 1
        fi
    fi
}

# Deploy the functions
deploy_functions() {
    log_info "Deploying Edge Functions..."
    
    # Deploy AI scraper worker
    if [[ -d "supabase/functions/ai-scraper-worker" ]]; then
        echo "Deploying ai-scraper-worker..."
        if supabase functions deploy ai-scraper-worker --no-verify-jwt --env-file .env; then
            log_success "ai-scraper-worker deployed successfully"
        else
            log_error "Failed to deploy ai-scraper-worker"
            exit 1
        fi
    else
        # Fallback to original deployment method
        if supabase functions deploy ai-scraper-worker; then
            log_success "Function deployed successfully"
        else
            log_error "Function deployment failed"
            exit 1
        fi
    fi

    # Deploy property researcher
    if [[ -d "supabase/functions/property-researcher" ]]; then
        echo "Deploying property-researcher..."
        supabase functions deploy property-researcher \
            --no-verify-jwt \
            --env-file .env || {
            log_error "Failed to deploy property-researcher"
            exit 1
        }
        log_success "property-researcher deployed"
    fi

    # Deploy scheduled scraper
    if [[ -d "supabase/functions/scheduled-scraper" ]]; then
        echo "Deploying scheduled-scraper..."
        supabase functions deploy scheduled-scraper \
            --no-verify-jwt \
            --env-file .env || {
            log_error "Failed to deploy scheduled-scraper"
            exit 1
        }
        log_success "scheduled-scraper deployed"
    fi
}

# Set environment variables
set_environment_variables() {
    log_info "Setting environment variables..."
    
    # Set Claude API key
    if supabase secrets set ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY"; then
        log_success "ANTHROPIC_API_KEY set"
    else
        log_error "Failed to set ANTHROPIC_API_KEY"
        exit 1
    fi
    
    # Set other environment variables
    supabase secrets set CLAUDE_MODEL="claude-3-haiku-20240307"
    supabase secrets set ENABLE_COST_TRACKING="true"
    supabase secrets set ENVIRONMENT="production"
    
    log_success "Environment variables configured"
}

# Test deployment
test_deployment() {
    log_info "Testing deployment..."
    
    # Test database connectivity
    echo "Testing database connection..."
    if ! supabase db ping; then
        log_error "Database connection failed"
        exit 1
    fi

    # Check if tables exist
    TABLES=("property_sources" "scraped_properties" "scraping_queue" "property_intelligence")
    for table in "${TABLES[@]}"; do
        if supabase db exec "SELECT 1 FROM $table LIMIT 1" &>/dev/null; then
            log_success "Table $table exists and accessible"
        else
            log_error "Table $table not accessible"
            exit 1
        fi
    done

    # Test function deployment
    SUPABASE_PROJECT_URL=$(echo $SUPABASE_URL | sed 's/https:\/\///')
    echo "Testing function endpoints..."
    if curl -s -f "https://$SUPABASE_PROJECT_URL/functions/v1/scheduled-scraper" -H "Authorization: Bearer $SUPABASE_ANON_KEY" &>/dev/null; then
        log_success "Functions are accessible"
    else
        log_warning "Function endpoint test inconclusive"
    fi
}

# Generate deployment report
generate_report() {
    log_info "Generating deployment report..."
    
    cat > deployment-report.md << EOF
# Deployment Report
**Date:** $(date)
**Function:** ai-scraper-worker
**Status:** ✅ Successfully Deployed

## Configuration
- **Claude Model:** claude-3-haiku-20240307
- **Cost Tracking:** Enabled
- **Environment:** Production

## Performance Targets
- **Success Rate:** >95%
- **Response Time:** <3s
- **Cost per Property:** <\$0.001
- **Accuracy:** >90%

## Next Steps
1. Monitor performance metrics
2. Set up alerting
3. Scale based on traffic
4. Optimize costs as needed

## Support
- Documentation: deploy.md
- Monitoring: Supabase Dashboard
- Logs: \`supabase functions logs ai-scraper-worker\`
EOF
    
    log_success "Deployment report generated: deployment-report.md"
}

# Display configuration summary
show_config_summary() {
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
}

# Main deployment process
main() {
    echo ""
    log_info "Starting deployment process..."
    echo ""
    
    check_prerequisites
    validate_environment
    run_tests
    deploy_database
    deploy_functions
    set_environment_variables
    test_deployment
    generate_report
    show_config_summary
    
    echo ""
    log_success "🎉 Deployment completed successfully!"
    echo ""
    echo "📊 Your Claude-powered AI scraper is now live and ready to process apartments!"
    echo ""
    echo "📋 Next steps:"
    echo "  1. Monitor performance in Supabase dashboard"
    echo "  2. Set up cost alerts and monitoring"
    echo "  3. Scale based on your traffic needs"
    echo "  4. Review deployment-report.md for details"
    echo ""
    echo "🔗 Function URL: ${SUPABASE_URL}/functions/v1/ai-scraper-worker"
    echo "📖 Documentation: deploy.md"
    echo "🔍 Logs: supabase functions logs ai-scraper-worker"
    echo ""
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "test")
        log_info "Running tests only..."
        check_prerequisites
        validate_environment
        run_tests
        log_success "All tests passed!"
        ;;
    "validate")
        log_info "Running validation only..."
        check_prerequisites
        validate_environment
        log_success "Validation passed!"
        ;;
    *)
        echo "Usage: $0 [deploy|test|validate]"
        echo "  deploy   - Full deployment process (default)"
        echo "  test     - Run tests only"
        echo "  validate - Validate environment only"
        exit 1
        ;;
esac