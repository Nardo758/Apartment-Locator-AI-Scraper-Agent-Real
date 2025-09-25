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
Ensure your `.env.local` file is properly configured:

```bash
# Copy template if needed
cp .env.local.template .env.local

# Edit with your values
# Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
# Optional: GEOCODER_PROVIDER, GEOCODER_API_KEY, BATCH_SIZE
```

### 3. Dependencies Installed
```bash
# Install required packages
npm install @supabase/supabase-js node-geocoder
```

## Geocoding Providers

### Free Option: OpenStreetMap (Default)
```bash
# No API key required
export GEOCODER_PROVIDER=openstreetmap
```
- **Pros**: Free, no rate limits
- **Cons**: Lower accuracy, slower responses
- **Best for**: Development, testing, small datasets

### Paid Options (Recommended for Production)

#### Google Geocoding API
```bash
export GEOCODER_PROVIDER=google
export GEOCODER_API_KEY=your-google-api-key
```
- **Rate limit**: 50 requests/second
- **Cost**: $5 per 1,000 requests
- **Best for**: High accuracy requirements

#### Mapbox Geocoding API
```bash
export GEOCODER_PROVIDER=mapbox
export GEOCODER_API_KEY=your-mapbox-access-token
```
- **Rate limit**: 600 requests/minute
- **Cost**: $0.75 per 1,000 requests
- **Best for**: Cost-effective with good accuracy

## Execution Methods

### Method 1: Orchestrated Backfill (Recommended)

#### Step 1: Check Current Status
```bash
node scripts/backfill_location_data.js status
```

#### Step 2: Run Complete Backfill Process
```bash
# This will:
# 1. Backfill ZIP codes from addresses
# 2. Geocode properties to get coordinates
# 3. Show progress and final status
node scripts/backfill_location_data.js complete
```

### Method 2: Individual Components

#### Step 1: ZIP Code Backfill (Optional)
```bash
# First, see what's possible
node scripts/backfill_zip_codes.js report

# Run the backfill
node scripts/backfill_zip_codes.js backfill

# Validate results
node scripts/backfill_zip_codes.js validate
```

#### Step 2: Coordinate Geocoding
```bash
# Single batch
node scripts/geocode_properties.js

# Or use the orchestrator for multiple batches
node scripts/backfill_location_data.js geocode
```

### Method 3: Continuous Background Processing
```bash
# Run continuous backfill (good for cron jobs)
node scripts/backfill_location_data.js continuous

# With custom interval (default: 60 minutes)
export BACKFILL_INTERVAL_MINUTES=30
node scripts/backfill_location_data.js continuous
```

## Environment Variables

### Required
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key with database access

### Geocoding Configuration
- `GEOCODER_PROVIDER`: openstreetmap|google|mapbox (default: openstreetmap)
- `GEOCODER_API_KEY`: API key for paid providers
- `BATCH_SIZE`: Properties per batch (default: 100)
- `DRY_RUN`: Set to true for testing without database writes

### Performance Tuning
- `MAX_CONCURRENT_REQUESTS`: Concurrent geocoding requests (default: 5)
- `REQUEST_DELAY_MS`: Delay between requests (default: 1000ms)
- `RETRY_ATTEMPTS`: Number of retries for failed requests (default: 3)

## Production Setup

### 1. Use Paid Geocoding Provider
```bash
# Google (recommended for accuracy)
export GEOCODER_PROVIDER=google
export GEOCODER_API_KEY=your-google-api-key

# Or Mapbox (recommended for cost)
export GEOCODER_PROVIDER=mapbox
export GEOCODER_API_KEY=your-mapbox-access-token
```

### 2. Optimize Batch Size
```bash
# For Google (50 req/sec limit)
export BATCH_SIZE=50
export REQUEST_DELAY_MS=1200

# For Mapbox (600 req/min limit) 
export BATCH_SIZE=100
export REQUEST_DELAY_MS=6000
```

### 3. Setup Monitoring
```bash
# Enable detailed logging
export DEBUG=true
export LOG_LEVEL=debug
```

### 4. Schedule Regular Updates
```bash
# Add to crontab for new properties
# Run every 4 hours
0 */4 * * * cd /path/to/project && node scripts/backfill_location_data.js geocode >> geocoding.log 2>&1

# Or run continuous process
# Run once per hour  
0 * * * * cd /path/to/project && timeout 3600 node scripts/backfill_location_data.js continuous >> geocoding.log 2>&1
```

## Troubleshooting

### Common Issues

#### 1. Rate Limiting
```bash
# Symptoms: "Rate limit exceeded" errors
# Solution: Increase delays or reduce batch size
export REQUEST_DELAY_MS=2000
export BATCH_SIZE=25
```

#### 2. Invalid Coordinates
```bash
# Clean up invalid data
node scripts/backfill_location_data.js cleanup
```

#### 3. Missing API Keys
```bash
# Check configuration
echo $GEOCODER_PROVIDER
echo $GEOCODER_API_KEY

# Verify .env.local is loaded
node -e "console.log(process.env.GEOCODER_PROVIDER)"
```

#### 4. Database Connection Issues
```bash
# Test connection
node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
client.from('scraped_properties').select('id').limit(1).then(console.log);
"
```

### Performance Monitoring

#### Check Progress
```bash
# Status every 5 minutes during processing
watch -n 300 "node scripts/backfill_location_data.js status"
```

#### Monitor Logs
```bash
# Watch live logs  
tail -f geocoding.log

# Count successful updates
grep "Property id=" geocoding.log | wc -l
```

#### Database Queries
```sql
-- Check completion rates
SELECT 
  COUNT(*) as total,
  COUNT(zip_code) as with_zip,
  COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as with_coords,
  ROUND((COUNT(zip_code)::decimal / COUNT(*)) * 100, 1) as zip_percent,
  ROUND((COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END)::decimal / COUNT(*)) * 100, 1) as coord_percent
FROM scraped_properties;

-- Find properties with issues
SELECT id, external_id, address, city, state, zip_code, latitude, longitude
FROM scraped_properties 
WHERE address IS NOT NULL 
  AND (latitude IS NULL OR longitude IS NULL)
LIMIT 10;
```

## Cost Estimates

### Google Geocoding
- **Rate**: $5 per 1,000 requests
- **10K properties**: ~$50
- **100K properties**: ~$500

### Mapbox Geocoding  
- **Rate**: $0.75 per 1,000 requests
- **10K properties**: ~$7.50
- **100K properties**: ~$75

### OpenStreetMap
- **Rate**: Free
- **All properties**: $0 (but slower and less accurate)

## Next Steps After Geocoding

1. **Verify Results**
   ```bash
   node scripts/verify_migration_success.js
   ```

2. **Test Location Features**
   ```sql
   -- Test radius search
   SELECT COUNT(*) FROM scraped_properties 
   WHERE latitude BETWEEN 40.7 AND 40.8 
   AND longitude BETWEEN -74.0 AND -73.9;
   ```

3. **Update Application Code**
   - Add location-based search filters
   - Implement map visualization
   - Add radius/distance calculations

4. **Monitor Ongoing Geocoding**
   - Set up automated geocoding for new properties
   - Monitor geocoding success rates
   - Update addresses that fail geocoding

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review logs in `geocoding.log`
3. Run status checks and verification scripts
4. Check database directly with SQL queries