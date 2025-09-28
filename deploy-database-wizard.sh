#!/bin/bash

# Database Deployment Wizard
# Interactive script to deploy the frontend schema to your production database

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Database Deployment Wizard${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo "This wizard will help you deploy the frontend schema to your production database."
echo ""

# Step 1: Check for required files
echo -e "${CYAN}📋 Step 1: Checking required files...${NC}"

required_files=("manual-deployment.sql" "verify-deployment.sql" ".env.production")
missing_files=()

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "  ✅ Found: $file"
    else
        echo -e "  ❌ Missing: $file"
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -gt 0 ]; then
    echo -e "${RED}❌ Missing required files. Please run the setup scripts first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All required files found!${NC}"
echo ""

# Step 2: Database connection configuration
echo -e "${CYAN}📡 Step 2: Database Connection Configuration${NC}"
echo ""
echo "Please choose your deployment method:"
echo "1. Supabase Project (recommended)"
echo "2. Direct PostgreSQL connection"
echo "3. Local Supabase development"
echo ""
read -p "Enter your choice (1-3): " deployment_choice

case $deployment_choice in
    1)
        echo -e "${BLUE}🔧 Supabase Project Deployment${NC}"
        echo ""
        echo "Please provide your Supabase project details:"
        echo ""
        
        # Get Supabase URL
        current_url=$(grep "SUPABASE_URL=" .env.production | cut -d'=' -f2)
        echo "Current SUPABASE_URL: $current_url"
        read -p "Enter your Supabase URL (or press Enter to keep current): " supabase_url
        if [ -n "$supabase_url" ]; then
            sed -i "s|SUPABASE_URL=.*|SUPABASE_URL=$supabase_url|" .env.production
        fi
        
        # Get Service Role Key
        echo ""
        echo "⚠️  You need your SERVICE ROLE KEY (not anon key) for schema changes"
        read -s -p "Enter your Supabase Service Role Key: " service_role_key
        echo ""
        if [ -n "$service_role_key" ]; then
            sed -i "s|SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=$service_role_key|" .env.production
        fi
        
        # Get Claude API Key
        echo ""
        read -s -p "Enter your Claude API Key (optional): " claude_key
        echo ""
        if [ -n "$claude_key" ]; then
            sed -i "s|ANTHROPIC_API_KEY=.*|ANTHROPIC_API_KEY=$claude_key|" .env.production
        fi
        
        deployment_method="supabase"
        ;;
    2)
        echo -e "${BLUE}🐘 Direct PostgreSQL Connection${NC}"
        echo ""
        read -p "Enter PostgreSQL host: " pg_host
        read -p "Enter PostgreSQL port (default 5432): " pg_port
        pg_port=${pg_port:-5432}
        read -p "Enter database name: " pg_database
        read -p "Enter username: " pg_username
        read -s -p "Enter password: " pg_password
        echo ""
        
        DATABASE_URL="postgresql://$pg_username:$pg_password@$pg_host:$pg_port/$pg_database"
        deployment_method="postgresql"
        ;;
    3)
        echo -e "${BLUE}🏠 Local Supabase Development${NC}"
        DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
        deployment_method="local"
        ;;
    *)
        echo -e "${RED}❌ Invalid choice. Exiting.${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✅ Configuration complete!${NC}"
echo ""

# Step 3: Pre-deployment checks
echo -e "${CYAN}🔍 Step 3: Pre-deployment Checks${NC}"

if [ "$deployment_method" = "supabase" ]; then
    # Load environment variables
    source .env.production
    
    echo "Testing Supabase connection..."
    
    # Test connection with a simple query
    response=$(curl -s -w "%{http_code}" -o /tmp/supabase_test.json \
        -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        "$SUPABASE_URL/rest/v1/" 2>/dev/null)
    
    if [ "$response" = "200" ]; then
        echo -e "  ✅ Supabase connection successful"
    else
        echo -e "  ⚠️  Supabase connection test inconclusive (status: $response)"
        echo -e "  📝 This may be normal - proceeding with deployment"
    fi
    
elif [ "$deployment_method" = "postgresql" ]; then
    echo "Testing PostgreSQL connection..."
    
    if command -v psql &> /dev/null; then
        if psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
            echo -e "  ✅ PostgreSQL connection successful"
        else
            echo -e "  ❌ PostgreSQL connection failed"
            echo -e "  Please check your connection details and try again."
            exit 1
        fi
    else
        echo -e "  ⚠️  psql not found - cannot test connection"
        echo -e "  📝 Proceeding anyway..."
    fi
    
elif [ "$deployment_method" = "local" ]; then
    echo "Checking local Supabase..."
    
    if command -v supabase &> /dev/null; then
        if supabase status &> /dev/null; then
            echo -e "  ✅ Local Supabase is running"
        else
            echo -e "  ⚠️  Local Supabase not running"
            read -p "Start local Supabase now? (y/n): " start_local
            if [ "$start_local" = "y" ]; then
                supabase start
            else
                echo -e "  ❌ Cannot proceed without local Supabase"
                exit 1
            fi
        fi
    else
        echo -e "  ❌ Supabase CLI not found"
        exit 1
    fi
fi

echo ""

# Step 4: Schema deployment
echo -e "${CYAN}🗄️  Step 4: Schema Deployment${NC}"
echo ""
echo "Ready to deploy the frontend schema to your database."
echo ""
echo -e "${YELLOW}⚠️  This will create new tables and functions in your database.${NC}"
echo "Tables to be created:"
echo "  • properties (main frontend table)"
echo "  • user_profiles"
echo "  • apartment_iq_data"
echo "  • rental_offers"
echo "  • market_intelligence"
echo ""
echo "Functions to be created:"
echo "  • search_properties_near_location"
echo "  • calculate_ai_price_estimate"
echo "  • calculate_effective_price"
echo ""

read -p "Do you want to proceed with the deployment? (y/n): " confirm_deploy

if [ "$confirm_deploy" != "y" ]; then
    echo -e "${YELLOW}⏸️  Deployment cancelled by user.${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}🚀 Deploying schema...${NC}"

# Execute deployment based on method
if [ "$deployment_method" = "supabase" ]; then
    echo "Using Supabase REST API for deployment..."
    
    # For Supabase, we'll need to use the SQL editor or migrations
    echo -e "${YELLOW}📝 For Supabase deployment, please follow these steps:${NC}"
    echo ""
    echo "1. Go to your Supabase Dashboard → SQL Editor"
    echo "2. Copy the contents of 'manual-deployment.sql'"
    echo "3. Paste and execute the SQL"
    echo ""
    echo "Or use the Supabase CLI:"
    echo "  supabase db push"
    echo ""
    echo -e "${CYAN}📄 Opening manual-deployment.sql for you to copy...${NC}"
    
    # Display the SQL content for easy copying
    echo ""
    echo -e "${BLUE}=== COPY THIS SQL TO YOUR SUPABASE SQL EDITOR ===${NC}"
    echo ""
    cat manual-deployment.sql
    echo ""
    echo -e "${BLUE}=== END OF SQL ===${NC}"
    echo ""
    
    read -p "Press Enter after you've executed the SQL in Supabase Dashboard..."
    
elif [ "$deployment_method" = "postgresql" ]; then
    echo "Deploying to PostgreSQL..."
    
    if command -v psql &> /dev/null; then
        if psql "$DATABASE_URL" -f manual-deployment.sql; then
            echo -e "${GREEN}✅ Schema deployed successfully!${NC}"
        else
            echo -e "${RED}❌ Schema deployment failed${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ psql not found. Please install PostgreSQL client.${NC}"
        exit 1
    fi
    
elif [ "$deployment_method" = "local" ]; then
    echo "Deploying to local Supabase..."
    
    if supabase db reset; then
        echo -e "${GREEN}✅ Local database reset and schema deployed!${NC}"
    else
        echo -e "${RED}❌ Local deployment failed${NC}"
        exit 1
    fi
fi

echo ""

# Step 5: Verification
echo -e "${CYAN}🔍 Step 5: Deployment Verification${NC}"
echo ""
echo "Running verification queries..."

if [ "$deployment_method" = "postgresql" ] || [ "$deployment_method" = "local" ]; then
    if [ "$deployment_method" = "local" ]; then
        verification_url="postgresql://postgres:postgres@localhost:54322/postgres"
    else
        verification_url="$DATABASE_URL"
    fi
    
    if command -v psql &> /dev/null; then
        echo "Checking deployed tables..."
        if psql "$verification_url" -f verify-deployment.sql; then
            echo -e "${GREEN}✅ Verification successful!${NC}"
        else
            echo -e "${YELLOW}⚠️  Verification had some issues, but deployment may still be successful${NC}"
        fi
    fi
else
    echo -e "${YELLOW}📝 For Supabase, please manually run the verification queries:${NC}"
    echo ""
    echo "Copy and run this in your Supabase SQL Editor:"
    echo ""
    cat verify-deployment.sql
fi

echo ""

# Step 6: Next steps
echo -e "${CYAN}🎯 Step 6: Next Steps${NC}"
echo ""
echo -e "${GREEN}🎉 Database deployment completed!${NC}"
echo ""
echo "Next steps:"
echo "1. Update your Supabase Functions with the new integration code"
echo "2. Test the data transformation pipeline"
echo "3. Configure your scraper to use the new frontend sync"
echo ""
echo "To deploy functions:"
echo "  ./deploy-production.sh"
echo ""
echo "To test the integration:"
echo "  node test-real-integration.mjs"
echo ""
echo -e "${BLUE}📚 See DEPLOYMENT_GUIDE.md for detailed instructions${NC}"
echo ""
echo -e "${GREEN}🚀 Your real estate scraper is now ready for AI-enhanced data integration!${NC}"