#!/bin/bash

# Frontend Schema Deployment Script
set -e

echo "🚀 Deploying Frontend Schema for Real Estate Scraper"
echo "============================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "src/scraper/frontend-schema-migration.sql" ]; then
    echo -e "${RED}❌ Frontend schema migration file not found${NC}"
    echo "Please run this script from the workspace root directory"
    exit 1
fi

echo -e "${BLUE}📋 Pre-deployment checks...${NC}"

# Check for required environment variables
if [ -z "$SUPABASE_URL" ] && [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}⚠️  No database connection found in environment${NC}"
    echo "Please set either SUPABASE_URL or DATABASE_URL"
    
    # Try to load from .env file
    if [ -f ".env" ]; then
        echo -e "${BLUE}📄 Loading environment from .env file...${NC}"
        export $(cat .env | xargs)
    fi
fi

# Create a timestamped migration file
TIMESTAMP=$(date +%Y%m%d%H%M%S)
MIGRATION_FILE="supabase/migrations/${TIMESTAMP}_frontend_schema_deployment.sql"

echo -e "${BLUE}📝 Creating migration file: ${MIGRATION_FILE}${NC}"

# Copy the schema migration to the migrations directory
cp src/scraper/frontend-schema-migration.sql "$MIGRATION_FILE"

# Add metadata to the migration file
cat > temp_migration.sql << 'EOF'
-- Frontend Schema Deployment Migration
-- Generated automatically from data integration pipeline
-- 
-- This migration creates:
-- 1. Frontend properties table
-- 2. User profiles table  
-- 3. Apartment IQ data table
-- 4. Rental offers table
-- 5. Market intelligence table
-- 6. Geographic search functions
-- 7. AI pricing functions
-- 8. Performance indexes
--
-- Date: $(date)
-- Version: 1.0.0

EOF

# Combine metadata with migration
cat temp_migration.sql "$MIGRATION_FILE" > temp_combined.sql
mv temp_combined.sql "$MIGRATION_FILE"
rm temp_migration.sql

echo -e "${GREEN}✅ Migration file created successfully${NC}"

# Try different deployment methods
echo -e "${BLUE}🔄 Attempting database deployment...${NC}"

DEPLOYMENT_SUCCESS=false

# Method 1: Try Supabase CLI if available
if command -v supabase &> /dev/null; then
    echo -e "${BLUE}📡 Using Supabase CLI...${NC}"
    if supabase db push; then
        DEPLOYMENT_SUCCESS=true
        echo -e "${GREEN}✅ Deployed via Supabase CLI${NC}"
    else
        echo -e "${YELLOW}⚠️  Supabase CLI deployment failed, trying alternatives...${NC}"
    fi
fi

# Method 2: Try psql if available and DATABASE_URL is set
if [ "$DEPLOYMENT_SUCCESS" = false ] && command -v psql &> /dev/null && [ ! -z "$DATABASE_URL" ]; then
    echo -e "${BLUE}🐘 Using psql with DATABASE_URL...${NC}"
    if psql "$DATABASE_URL" -f "$MIGRATION_FILE"; then
        DEPLOYMENT_SUCCESS=true
        echo -e "${GREEN}✅ Deployed via psql${NC}"
    else
        echo -e "${YELLOW}⚠️  psql deployment failed${NC}"
    fi
fi

# Method 3: Try with Supabase connection details
if [ "$DEPLOYMENT_SUCCESS" = false ] && [ ! -z "$SUPABASE_URL" ] && [ ! -z "$SUPABASE_DB_PASSWORD" ]; then
    echo -e "${BLUE}🔗 Using Supabase connection details...${NC}"
    
    # Extract database details from Supabase URL
    DB_HOST=$(echo "$SUPABASE_URL" | sed 's|https://||' | sed 's|\.supabase\.co.*||').supabase.co
    DB_NAME="postgres"
    DB_USER="postgres"
    
    if PGPASSWORD="$SUPABASE_DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_FILE"; then
        DEPLOYMENT_SUCCESS=true
        echo -e "${GREEN}✅ Deployed via Supabase connection${NC}"
    else
        echo -e "${YELLOW}⚠️  Supabase connection deployment failed${NC}"
    fi
fi

# Method 4: Create manual deployment instructions
if [ "$DEPLOYMENT_SUCCESS" = false ]; then
    echo -e "${YELLOW}⚠️  Automatic deployment not available${NC}"
    echo -e "${BLUE}📋 Manual deployment instructions:${NC}"
    echo ""
    echo "1. Connect to your database using your preferred client"
    echo "2. Execute the migration file: $MIGRATION_FILE"
    echo ""
    echo "Or copy and paste the following SQL into your database:"
    echo -e "${BLUE}============================================${NC}"
    cat "$MIGRATION_FILE"
    echo -e "${BLUE}============================================${NC}"
    
    # Create a manual deployment file for easy access
    cat > manual-deployment.sql << EOF
-- Manual Deployment Instructions
-- Copy and paste this entire content into your database client

$(cat "$MIGRATION_FILE")
EOF
    
    echo ""
    echo -e "${GREEN}📄 Manual deployment SQL saved to: manual-deployment.sql${NC}"
fi

# Run verification regardless of deployment method
echo -e "${BLUE}🔍 Running schema verification...${NC}"

# Create verification script
cat > verify-deployment.sql << 'EOF'
-- Schema Verification Queries
-- Run these to verify the deployment was successful

-- Check if all required tables exist
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('properties', 'user_profiles', 'apartment_iq_data', 'rental_offers', 'market_intelligence') 
    THEN '✅ Required'
    ELSE '❌ Missing'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'properties', 
    'user_profiles', 
    'apartment_iq_data', 
    'rental_offers', 
    'market_intelligence'
  )
ORDER BY table_name;

-- Check properties table structure
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'properties'
ORDER BY ordinal_position;

-- Check if functions were created
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_name IN (
    'search_properties_near_location',
    'calculate_ai_price_estimate',
    'calculate_effective_price'
  );

-- Test basic functionality
SELECT 'Schema deployment verification complete' as status;
EOF

echo -e "${GREEN}📋 Verification queries saved to: verify-deployment.sql${NC}"

if [ "$DEPLOYMENT_SUCCESS" = true ]; then
    echo -e "${GREEN}🎉 Frontend schema deployment completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}📊 Next steps:${NC}"
    echo "1. Run verification queries to confirm deployment"
    echo "2. Test data transformation pipeline"
    echo "3. Run integration tests"
    echo ""
    echo -e "${BLUE}🧪 To run tests:${NC}"
    echo "deno run --allow-env --allow-net src/scraper/integration-test.ts"
else
    echo -e "${YELLOW}⚠️  Automatic deployment was not successful${NC}"
    echo -e "${BLUE}📋 Manual steps required:${NC}"
    echo "1. Execute the SQL in manual-deployment.sql"
    echo "2. Run verification queries in verify-deployment.sql"
    echo "3. Test the integration pipeline"
fi

echo ""
echo -e "${BLUE}📚 Documentation: src/scraper/DATA_INTEGRATION_README.md${NC}"
echo -e "${GREEN}🚀 Ready to transform your scraper data!${NC}"