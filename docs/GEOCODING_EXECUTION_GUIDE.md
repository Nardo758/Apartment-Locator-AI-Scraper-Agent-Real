# Geocoding Execution Instructions

## Overview
This document provides step-by-step instructions for running the geocoding scripts after the location fields migration has been applied.

## Prerequisites

### 1. Migration Applied
Ensure the location fields migration has been successfully applied:
```bash
# Verify migration status
node scripts/verify_migration_success.js
```
### 2. Environment Configuration

Ensure your `.env.local` file is properly configured.

      # Copy template if needed
      cp .env.local.template .env.local

      # Edit with your values
      # Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
      # Optional: GEOCODER_PROVIDER, GEOCODER_API_KEY, BATCH_SIZE

### 3. Dependencies Installed

      # Install required packages
      npm install @supabase/supabase-js node-geocoder

Mapbox and Google are common providers. Set provider and key with environment variables.

      # For Google (recommended for accuracy)
      export GEOCODER_PROVIDER=google
      export GEOCODER_API_KEY=your-google-api-key

      # Or Mapbox (recommended for cost)
      export GEOCODER_PROVIDER=mapbox
      export GEOCODER_API_KEY=your-mapbox-access-token

### Backfill / Orchestration

Run the orchestrator or individual components depending on need:

      # Run the orchestrator to perform a complete backfill
      node scripts/backfill_location_data.js complete

      # Backfill zip codes only
      node scripts/backfill_zip_codes.js backfill

      # Run geocoding (single batch)
      node scripts/geocode_properties.js

      # Or use the orchestrator for multiple batches
      node scripts/backfill_location_data.js geocode

      # Continuous background processing (for cron)
      node scripts/backfill_location_data.js continuous

Scheduling example (run hourly via crontab):

      # enable detailed logging
      export DEBUG=true
      export LOG_LEVEL=debug
      0 * * * * cd /path/to/project ; timeout 3600 node scripts/backfill_location_data.js continuous >> geocoding.log 2>&1

Rate limit recommendations (example):

      # For Google (50 req/sec limit)
      export BATCH_SIZE=50
      export REQUEST_DELAY_MS=1200

      # For Mapbox (600 req/min limit)
      export BATCH_SIZE=100
      export REQUEST_DELAY_MS=6000

Troubleshooting: invalid coordinates / rate limits

      # Symptoms: "Rate limit exceeded" errors
      # Solution: Increase delays or reduce batch size
      export REQUEST_DELAY_MS=2000
      export BATCH_SIZE=25

Check configuration and test connection:

      # Check provider env vars
      echo $GEOCODER_PROVIDER
      echo $GEOCODER_API_KEY

      # Verify .env.local is loaded
      node -e "console.log(process.env.GEOCODER_PROVIDER)"

      # Test connection against Supabase
      node -e "const { createClient } = require('@supabase/supabase-js'); const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); client.from('scraped_properties').select('id').limit(1).then(console.log);"

Monitor logs and runtime status

      # Follow live logs
      tail -f geocoding.log

      # Periodic status checks (every 5 minutes)
      watch -n 300 "node scripts/backfill_location_data.js status"

Database queries (examples)

      # Count successful updates from the log
      grep "Property id=" geocoding.log | wc -l

      -- Check completion rates
      SELECT 
         COUNT(*) as total,
         COUNT(zip_code) as with_zip,
         COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as with_coords,
         ROUND((COUNT(zip_code)::decimal / COUNT(*)) * 100, 1) as zip_percent,
         ROUND((COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END)::decimal / COUNT(*)) * 100, 1) as coord_percent
      FROM scraped_properties;

      -- Find properties with missing coordinates
      SELECT id, external_id, address, city, state, zip_code, latitude, longitude
      FROM scraped_properties 
      WHERE address IS NOT NULL 
         AND (latitude IS NULL OR longitude IS NULL)
      LIMIT 10;

Cost estimate (example)

      -- Rate: $0.75 per 1,000 requests
      -- 10K properties: ~$7.50
      -- 100K properties: ~$75

Next steps after geocoding

      # Verify migration success
      node scripts/verify_migration_success.js

      # Test radius search
      -- SQL
      SELECT COUNT(*) FROM scraped_properties 
      WHERE latitude BETWEEN 40.7 AND 40.8 
      AND longitude BETWEEN -74.0 AND -73.9;

Verify results

      node scripts/verify_migration_success.js

Update application code

      - Add location-based search filters
      - Implement map visualization
      - Add radius/distance calculations

Monitor ongoing geocoding

      - Set up automated geocoding for new properties
      - Monitor geocoding success rates
      - Update addresses that fail geocoding

Support

For issues or questions:
1. Check the troubleshooting section above
2. Review logs in `geocoding.log`
3. Run status checks and verification scripts
4. Check database directly with SQL queries