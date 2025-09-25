# Location Fields Migration & Backfill Package

This package provides a complete solution for adding latitude, longitude, and ZIP code fields to the `scraped_properties` table, with comprehensive verification and backfill capabilities.

## 📁 Files Included

### Migration Files
- `supabase/migrations/20250925083520_add_location_fields_to_scraped_properties.sql` - Idempotent migration
- `docs/LOCATION_MIGRATION_PLAN.md` - Complete migration planning document

### Verification Scripts  
- `scripts/verify_schema_pre_migration.js` - Pre-migration validation
- `scripts/verify_migration_success.js` - Post-migration verification
- `verification_output_template.json` - Expected verification results

### Backfill Scripts
- `scripts/backfill_zip_codes.js` - Extract ZIP codes from addresses
- `scripts/backfill_location_data.js` - Orchestrator for complete backfill process
- `scripts/geocode_properties.js` - Existing geocoding script (compatible)

### Configuration
- `.env.local.template` - Environment configuration template  
- `docs/GEOCODING_EXECUTION_GUIDE.md` - Detailed execution instructions

## 🚀 Quick Start

### 1. Pre-Migration Setup
```bash
# Verify current state
node scripts/verify_schema_pre_migration.js

# Configure environment
cp .env.local.template .env.local
# Edit .env.local with your values
```

### 2. Apply Migration  
```bash
# Local development
supabase migration up --local

# Production (after staging verification)
supabase db push --project-ref your-project-ref
```

### 3. Verify Migration
```bash
# Confirm migration success
node scripts/verify_migration_success.js
```

### 4. Backfill Location Data
```bash
# Complete automated backfill
node scripts/backfill_location_data.js complete

# Or step by step:
node scripts/backfill_zip_codes.js backfill
node scripts/geocode_properties.js
```

## 📋 Migration Details

### New Database Schema
```sql
-- New columns added to scraped_properties:
ALTER TABLE scraped_properties ADD COLUMN latitude DECIMAL(10,8);
ALTER TABLE scraped_properties ADD COLUMN longitude DECIMAL(11,8);  
ALTER TABLE scraped_properties ADD COLUMN zip_code VARCHAR(10);

-- New indexes for performance:
CREATE INDEX idx_scraped_properties_location ON scraped_properties (latitude, longitude);
CREATE INDEX idx_scraped_properties_zip_code ON scraped_properties (zip_code);

-- Constraints for data validation:
ALTER TABLE scraped_properties ADD CONSTRAINT check_latitude_range CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));
ALTER TABLE scraped_properties ADD CONSTRAINT check_longitude_range CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));
```

### Migration Features
- ✅ **Idempotent** - Safe to run multiple times
- ✅ **Nullable columns** - No impact on existing data
- ✅ **Automatic constraints** - Validates coordinate ranges  
- ✅ **Performance indexes** - Optimized for location queries
- ✅ **Comprehensive verification** - Pre and post-migration checks

## 🔧 Configuration Options

### Environment Variables
```bash
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Geocoding (optional)
GEOCODER_PROVIDER=openstreetmap  # or google, mapbox
GEOCODER_API_KEY=your-api-key    # for paid providers
BATCH_SIZE=100                   # properties per batch
DRY_RUN=false                    # set true for testing

# Performance tuning
REQUEST_DELAY_MS=1000           # delay between API calls
MAX_CONCURRENT_REQUESTS=5       # concurrent geocoding requests
```

### Geocoding Providers
| Provider | Cost | Rate Limit | Accuracy | Setup Required |
|----------|------|------------|----------|----------------|
| OpenStreetMap | Free | None | Good | No API key |
| Google | $5/1K requests | 50/sec | Excellent | API key required |
| Mapbox | $0.75/1K requests | 600/min | Very Good | API key required |

## 📊 Usage Examples

### Check Status
```bash
# See current completion rates
node scripts/backfill_location_data.js status
```

### ZIP Code Extraction
```bash
# See extraction potential  
node scripts/backfill_zip_codes.js report

# Extract ZIP codes from addresses
node scripts/backfill_zip_codes.js backfill

# Validate extracted ZIP codes
node scripts/backfill_zip_codes.js validate
```

### Geocoding Operations
```bash
# Single batch geocoding
node scripts/geocode_properties.js

# Complete geocoding process
node scripts/backfill_location_data.js geocode

# Continuous background processing
node scripts/backfill_location_data.js continuous
```

### Data Cleanup
```bash
# Remove invalid coordinates
node scripts/backfill_location_data.js cleanup
```

## 🔍 Verification & Monitoring

### Migration Verification
```bash
# Before migration
node scripts/verify_schema_pre_migration.js

# After migration  
node scripts/verify_migration_success.js
```

### Progress Monitoring
```sql
-- Check completion rates
SELECT 
  COUNT(*) as total_properties,
  COUNT(zip_code) as properties_with_zip,
  COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as properties_with_coords,
  ROUND((COUNT(zip_code)::decimal / COUNT(*)) * 100, 2) as zip_completion_rate,
  ROUND((COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END)::decimal / COUNT(*)) * 100, 2) as coord_completion_rate
FROM scraped_properties;
```

### Performance Queries
```sql
-- Test location-based queries
SELECT COUNT(*) FROM scraped_properties 
WHERE latitude BETWEEN 40.7 AND 40.8 
AND longitude BETWEEN -74.0 AND -73.9;

-- Find properties needing geocoding
SELECT id, external_id, address, city, state 
FROM scraped_properties 
WHERE latitude IS NULL 
LIMIT 10;
```

## 🎯 Production Checklist

### Pre-Migration
- [ ] Database backup created
- [ ] Migration tested in staging environment
- [ ] Disk space verified (check estimated space requirements)
- [ ] Downtime window scheduled
- [ ] Team notified

### Migration Execution
- [ ] Pre-migration verification passed
- [ ] Migration applied successfully  
- [ ] Post-migration verification passed
- [ ] Existing functionality confirmed working
- [ ] New indexes created and active

### Post-Migration  
- [ ] Backfill scripts configured and tested
- [ ] Geocoding provider set up (if using paid service)
- [ ] Monitoring queries validated
- [ ] Application code updated for new features
- [ ] Ongoing geocoding process established

## 🛟 Troubleshooting

### Common Issues

**Migration fails to apply**
- Check database permissions
- Verify no conflicting columns exist
- Review pre-migration verification output

**Geocoding rate limiting**
- Increase `REQUEST_DELAY_MS`
- Reduce `BATCH_SIZE`  
- Switch to higher-limit provider

**Invalid coordinate data**
- Run cleanup script: `node scripts/backfill_location_data.js cleanup`
- Check constraint violations in database logs

**Performance issues**
- Verify indexes were created
- Check query execution plans
- Monitor database metrics

### Support Resources
- Review `docs/LOCATION_MIGRATION_PLAN.md` for detailed migration plan
- Check `docs/GEOCODING_EXECUTION_GUIDE.md` for geocoding setup
- Use verification scripts to diagnose issues
- Check database logs for constraint violations

## 🔄 Rollback Procedure

If migration needs to be rolled back:

```sql
-- WARNING: This will delete location data permanently
-- Remove constraints
ALTER TABLE scraped_properties DROP CONSTRAINT IF EXISTS check_latitude_range;
ALTER TABLE scraped_properties DROP CONSTRAINT IF EXISTS check_longitude_range;

-- Remove indexes  
DROP INDEX IF EXISTS idx_scraped_properties_location;
DROP INDEX IF EXISTS idx_scraped_properties_zip_code;

-- Remove columns (DESTRUCTIVE)
ALTER TABLE scraped_properties DROP COLUMN IF EXISTS latitude;
ALTER TABLE scraped_properties DROP COLUMN IF EXISTS longitude;
ALTER TABLE scraped_properties DROP COLUMN IF EXISTS zip_code;
```

## 📈 Expected Outcomes

### Immediate Benefits
- Location-based property searches
- Map visualization capabilities
- Distance calculations between properties
- ZIP code filtering and analytics

### Performance Impact
- Minimal impact on existing queries
- New indexes improve location query performance  
- Nullable columns add minimal storage overhead

### Cost Considerations
- Free geocoding with OpenStreetMap
- Paid geocoding costs $0.75-$5 per 1,000 properties
- One-time setup cost for comprehensive location data

## 🔮 Future Enhancements

With location data in place, you can implement:
- Radius-based property searches
- Market analysis by geographic region
- Commute time calculations
- School district integration
- Crime data overlays
- Transit accessibility scores
- Neighborhood boundary detection

## 📞 Support

This migration package is designed to be comprehensive and self-contained. All necessary scripts, documentation, and verification tools are included.

For additional support:
1. Review the detailed documentation in `docs/`
2. Run verification scripts to identify issues
3. Check logs and database output
4. Use the troubleshooting guide above