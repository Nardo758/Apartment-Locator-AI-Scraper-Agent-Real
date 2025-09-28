#!/bin/bash
# control-scraper.sh
# One-command deployment & control system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ACTION=${1:-"help"}
CONFIG_FILE="deploy-control.json"

# Ensure config file exists
if [[ ! -f "$CONFIG_FILE" ]]; then
    echo -e "${RED}❌ $CONFIG_FILE not found${NC}"
    exit 1
fi

case $ACTION in
    "deploy")
        echo -e "${BLUE}🚀 Deploying scraper system...${NC}"
        ./deploy-scraper.sh
        ;;
        
    "enable")
        echo -e "${BLUE}🔄 Enabling scraping...${NC}"
        jq '.scraping_enabled = true' $CONFIG_FILE > tmp.json && mv tmp.json $CONFIG_FILE
        echo -e "${GREEN}✅ Scraping ENABLED${NC}"
        echo "Run './control-scraper.sh deploy' to apply changes"
        ;;
        
    "disable")
        echo -e "${BLUE}🔄 Disabling scraping...${NC}"
        jq '.scraping_enabled = false' $CONFIG_FILE > tmp.json && mv tmp.json $CONFIG_FILE
        echo -e "${YELLOW}🚫 Scraping DISABLED${NC}"
        echo "Changes will take effect on next deployment"
        ;;
        
    "status")
        echo -e "${BLUE}📊 Scraper Status${NC}"
        echo "=================="
        
        SCRAPING_STATUS=$(jq -r '.scraping_enabled' $CONFIG_FILE)
        CLAUDE_STATUS=$(jq -r '.claude_analysis_enabled' $CONFIG_FILE)
        ENVIRONMENT=$(jq -r '.environment' $CONFIG_FILE)
        DAILY_LIMIT=$(jq -r '.cost_limit_daily' $CONFIG_FILE)
        BATCH_SIZE=$(jq -r '.batch_size' $CONFIG_FILE)
        
        if [[ "$SCRAPING_STATUS" == "true" ]]; then
            echo -e "Scraping: ${GREEN}ENABLED${NC}"
        else
            echo -e "Scraping: ${RED}DISABLED${NC}"
        fi
        
        if [[ "$CLAUDE_STATUS" == "true" ]]; then
            echo -e "Claude Analysis: ${GREEN}ENABLED${NC}"
        else
            echo -e "Claude Analysis: ${RED}DISABLED${NC}"
        fi
        
        echo "Environment: $ENVIRONMENT"
        echo "Daily Cost Limit: \$$DAILY_LIMIT"
        echo "Batch Size: $BATCH_SIZE"
        echo "Schedule: $(jq -r '.schedule' $CONFIG_FILE)"
        echo "Regions: $(jq -r '.regions | join(", ")' $CONFIG_FILE)"
        
        # Show next scheduled run if possible
        if command -v node &> /dev/null; then
            NEXT_RUN=$(node -e "
                const schedule = '$(jq -r '.schedule' $CONFIG_FILE)';
                try {
                    const parser = require('cron-parser');
                    const interval = parser.parseExpression(schedule);
                    console.log(interval.next().toString());
                } catch (e) {
                    console.log('Unable to parse schedule');
                }
            " 2>/dev/null || echo "Unable to calculate")
            echo "Next Scheduled Run: $NEXT_RUN"
        fi
        
        # Check if Supabase is configured
        if [[ -n "$SUPABASE_URL" ]]; then
            echo -e "Supabase: ${GREEN}CONFIGURED${NC}"
        else
            echo -e "Supabase: ${RED}NOT CONFIGURED${NC}"
        fi
        
        if [[ -n "$ANTHROPIC_API_KEY" ]]; then
            echo -e "Anthropic API: ${GREEN}CONFIGURED${NC}"
        else
            echo -e "Anthropic API: ${RED}NOT CONFIGURED${NC}"
        fi
        ;;
        
    "run-now")
        echo -e "${BLUE}⚡ Running scraper immediately...${NC}"
        
        if [[ -z "$SUPABASE_URL" ]] || [[ -z "$SUPABASE_ANON_KEY" ]]; then
            echo -e "${RED}❌ SUPABASE_URL and SUPABASE_ANON_KEY must be set${NC}"
            exit 1
        fi
        
        SUPABASE_PROJECT_URL=$(echo $SUPABASE_URL | sed 's/https:\/\///')
        
        echo "Triggering scheduled scraper..."
        RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
            "https://$SUPABASE_PROJECT_URL/functions/v1/scheduled-scraper" \
            -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
            -H "Content-Type: application/json")
        
        HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
        BODY=$(echo "$RESPONSE" | head -n -1)
        
        if [[ "$HTTP_CODE" == "200" ]]; then
            echo -e "${GREEN}✅ Scraper executed successfully${NC}"
            echo "Response: $BODY"
        else
            echo -e "${RED}❌ Scraper execution failed (HTTP $HTTP_CODE)${NC}"
            echo "Response: $BODY"
            exit 1
        fi
        ;;
        
    "config")
        echo -e "${BLUE}⚙️  Configuration Editor${NC}"
        echo "======================="
        
        if command -v jq &> /dev/null; then
            echo "Current configuration:"
            jq '.' $CONFIG_FILE
        else
            echo "Install 'jq' for better configuration viewing"
            cat $CONFIG_FILE
        fi
        
        echo ""
        echo "Edit $CONFIG_FILE manually or use:"
        echo "  ./control-scraper.sh set-limit <amount>    - Set daily cost limit"
        echo "  ./control-scraper.sh set-batch <size>      - Set batch size"
        echo "  ./control-scraper.sh add-region <region>   - Add region"
        ;;
        
    "set-limit")
        if [[ -z "$2" ]]; then
            echo -e "${RED}❌ Usage: ./control-scraper.sh set-limit <amount>${NC}"
            exit 1
        fi
        
        NEW_LIMIT=$2
        jq ".cost_limit_daily = $NEW_LIMIT" $CONFIG_FILE > tmp.json && mv tmp.json $CONFIG_FILE
        echo -e "${GREEN}✅ Daily cost limit set to \$$NEW_LIMIT${NC}"
        ;;
        
    "set-batch")
        if [[ -z "$2" ]]; then
            echo -e "${RED}❌ Usage: ./control-scraper.sh set-batch <size>${NC}"
            exit 1
        fi
        
        NEW_BATCH=$2
        jq ".batch_size = $NEW_BATCH" $CONFIG_FILE > tmp.json && mv tmp.json $CONFIG_FILE
        echo -e "${GREEN}✅ Batch size set to $NEW_BATCH${NC}"
        ;;
        
    "add-region")
        if [[ -z "$2" ]]; then
            echo -e "${RED}❌ Usage: ./control-scraper.sh add-region <region>${NC}"
            exit 1
        fi
        
        NEW_REGION=$2
        jq ".regions += [\"$NEW_REGION\"] | .regions |= unique" $CONFIG_FILE > tmp.json && mv tmp.json $CONFIG_FILE
        echo -e "${GREEN}✅ Region '$NEW_REGION' added${NC}"
        ;;
        
    "logs")
        echo -e "${BLUE}📋 Recent Scraping Logs${NC}"
        echo "====================="
        
        if [[ -n "$SUPABASE_URL" ]] && [[ -n "$SUPABASE_SERVICE_ROLE_KEY" ]]; then
            # Query recent scraping logs from database
            echo "Fetching logs from database..."
            # This would require a proper query to scraping_logs table
            echo "Logs feature requires database query implementation"
        else
            echo -e "${YELLOW}⚠️  Database connection not configured${NC}"
        fi
        ;;
        
    "costs")
        echo -e "${BLUE}💰 Cost Analysis${NC}"
        echo "================"
        
        if [[ -n "$SUPABASE_URL" ]] && [[ -n "$SUPABASE_SERVICE_ROLE_KEY" ]]; then
            echo "Fetching cost data from database..."
            echo "Cost analysis feature requires database query implementation"
        else
            echo -e "${YELLOW}⚠️  Database connection not configured${NC}"
        fi
        ;;
        
    "help"|*)
        echo -e "${BLUE}🎛️  Property Scraper Control System${NC}"
        echo "===================================="
        echo ""
        echo "Usage: ./control-scraper.sh [command] [options]"
        echo ""
        echo "Commands:"
        echo "  deploy              Deploy the scraper system"
        echo "  enable              Enable scraping"
        echo "  disable             Disable scraping"
        echo "  status              Show current status"
        echo "  run-now             Run scraper immediately"
        echo "  config              View/edit configuration"
        echo "  logs                View recent scraping logs"
        echo "  costs               View cost analysis"
        echo ""
        echo "Configuration commands:"
        echo "  set-limit <amount>  Set daily cost limit"
        echo "  set-batch <size>    Set batch size"
        echo "  add-region <region> Add scraping region"
        echo ""
        echo "Examples:"
        echo "  ./control-scraper.sh status"
        echo "  ./control-scraper.sh set-limit 100"
        echo "  ./control-scraper.sh add-region miami"
        echo "  ./control-scraper.sh run-now"
        ;;
esac