#!/bin/bash

# ===================================
# Claude-Powered AI Scraper Deployment Script
# ===================================

set -e  # Exit on any error

echo "🚀 Deploying Claude-Powered AI Apartment Scraper"
echo "================================================="

# Configuration
PROJECT_NAME="ai-scraper-worker"
FUNCTION_NAME="ai-scraper-worker"

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
    
    # Run validation tests
    if deno test --allow-read test-validation.ts; then
        log_success "Unit tests passed"
    else
        log_error "Unit tests failed. Aborting deployment."
        exit 1
    fi
    
    # Run Claude API test
    if deno run --allow-net --allow-env test-claude-direct.ts; then
        log_success "Claude API test passed"
    else
        log_error "Claude API test failed. Check your API key."
        exit 1
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
        log_warning "No schema.sql file found. Make sure your database is set up."
    fi
}

# Deploy the function
deploy_function() {
    log_info "Deploying Edge Function..."
    
    # Deploy the function
    if supabase functions deploy $FUNCTION_NAME; then
        log_success "Function deployed successfully"
    else
        log_error "Function deployment failed"
        exit 1
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
    
    # Get project URL
    PROJECT_URL=$(supabase status | grep "API URL" | awk '{print $3}')
    FUNCTION_URL="${PROJECT_URL}/functions/v1/${FUNCTION_NAME}"
    
    # Test the deployed function
    RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
        -d '{
            "source": "deployment-test",
            "cleanHtml": "<div><h1>Test Apartment</h1><div>123 Test St, Austin, TX</div><div>$2000/month</div><div>2 bed, 1 bath</div></div>",
            "external_id": "deploy-test-1"
        }' || echo "ERROR")
    
    if echo "$RESPONSE" | grep -q '"status":"ok"'; then
        log_success "Deployment test passed"
        echo "Response: $RESPONSE"
    else
        log_error "Deployment test failed"
        echo "Response: $RESPONSE"
        exit 1
    fi
}

# Generate deployment report
generate_report() {
    log_info "Generating deployment report..."
    
    cat > deployment-report.md << EOF
# Deployment Report
**Date:** $(date)
**Function:** $FUNCTION_NAME
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
- Logs: \`supabase functions logs $FUNCTION_NAME\`
EOF
    
    log_success "Deployment report generated: deployment-report.md"
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
    deploy_function
    set_environment_variables
    test_deployment
    generate_report
    
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
    echo "🔗 Function URL: ${PROJECT_URL}/functions/v1/${FUNCTION_NAME}"
    echo "📖 Documentation: deploy.md"
    echo "🔍 Logs: supabase functions logs $FUNCTION_NAME"
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