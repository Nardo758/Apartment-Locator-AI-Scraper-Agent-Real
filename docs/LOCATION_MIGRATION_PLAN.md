# Location Fields Migration Plan

## Overview
This document outlines the plan to add latitude, longitude, and zip_code fields to the `scraped_properties` table to enable location-based features and mapping functionality.

## Migration Details

### File: `20250925083520_add_location_fields_to_scraped_properties.sql`

#### New Columns Added:
1. **latitude** (DECIMAL(10,8))
   - Stores property latitude coordinates
   - Range: -90 to 90 degrees
   - Nullable (allows NULL for properties not yet geocoded)
   
2. **longitude** (DECIMAL(11,8))
   - Stores property longitude coordinates  
   - Range: -180 to 180 degrees
   - Nullable (allows NULL for properties not yet geocoded)
   
3. **zip_code** (VARCHAR(10))
   - Stores ZIP/postal code
   - Can be extracted from address or obtained via geocoding
   - Nullable

#### Indexes Created:
- `idx_scraped_properties_location`: Composite index on (latitude, longitude) for location queries
- `idx_scraped_properties_zip_code`: Index on zip_code for ZIP-based searches

#### Constraints Added:
- `check_latitude_range`: Ensures latitude is between -90 and 90
- `check_longitude_range`: Ensures longitude is between -180 and 180

## Pre-Migration Steps

1. **Backup Database**
    # Create backup before migration
    pg_dump -h <host> -U <user> -d <database> > backup_pre_location_migration_$(date +%Y%m%d_%H%M%S).sql

2. **Verify Current Schema**
    # Run verification script
    node scripts/verify_schema_pre_migration.js

3. **Check Disk Space**
    -- Estimate space needed for new columns (run this query)
    SELECT 
        COUNT(*) as total_properties,
        pg_size_pretty(COUNT(*) * (8 + 8 + 50)) as estimated_additional_space
    FROM scraped_properties;

## Migration Execution

### Development Environment
    # Apply migration locally
    supabase db reset --local
    # OR if already applied:
    supabase migration up --local

### Production Environment  
    # Apply migration to staging first
    supabase db push --project-ref <staging-ref>

    # Verify staging results
    node scripts/verify_migration_success.js --env staging

    # Apply to production
    supabase db push --project-ref <production-ref>

## Post-Migration Steps

1. **Verify Migration Success**
    node scripts/verify_migration_success.js

2. **Run Backfill Scripts** (Optional - can be done gradually)
    # Populate zip codes from existing addresses
    node scripts/backfill_zip_codes.js
    
    # Geocode properties to populate lat/lng
    node scripts/geocode_properties.js

3. **Monitor Performance**
    # Check query performance with new indexes
    node scripts/check_location_query_performance.js

## Rollback Procedure

If issues arise, the migration can be rolled back:

    -- Emergency rollback script
    -- WARNING: This will permanently delete location data

    -- Remove constraints
    ALTER TABLE scraped_properties DROP CONSTRAINT IF EXISTS check_latitude_range;
    ALTER TABLE scraped_properties DROP CONSTRAINT IF EXISTS check_longitude_range;

    -- Remove indexes
    DROP INDEX IF EXISTS idx_scraped_properties_location;
    DROP INDEX IF EXISTS idx_scraped_properties_zip_code;

    -- Remove columns (THIS WILL DELETE DATA!)
    ALTER TABLE scraped_properties DROP COLUMN IF EXISTS latitude;
    ALTER TABLE scraped_properties DROP COLUMN IF EXISTS longitude;  
    ALTER TABLE scraped_properties DROP COLUMN IF EXISTS zip_code;

## Verification Checklist

### Pre-Migration
- [ ] Database backup completed
- [ ] Disk space sufficient 
- [ ] Pre-migration verification script passes
- [ ] Team notification sent

### Post-Migration  
- [ ] All columns exist with correct types
- [ ] Indexes created successfully
- [ ] Constraints active and functioning
- [ ] No breaking changes to existing queries
- [ ] Geocoding script runs successfully
- [ ] Performance within acceptable range

## Expected Downtime
- **Local/Dev**: ~30 seconds
- **Staging**: ~1-2 minutes  
- **Production**: ~2-5 minutes (depends on table size)

## Risk Assessment

### Low Risk
- Migration is idempotent (safe to re-run)
- Adds nullable columns (no data requirements)
- No existing functionality affected

### Mitigation Strategies
- Gradual backfill approach (not required immediately)
- Comprehensive testing in staging environment
- Quick rollback procedure documented
- Monitoring scripts in place

## Dependencies

### Scripts Required
- `scripts/verify_schema_pre_migration.js`
- `scripts/verify_migration_success.js` 
- `scripts/backfill_zip_codes.js`
- `scripts/geocode_properties.js` (already exists)

### Environment Variables Needed
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEOCODER_PROVIDER` (for backfill)
- `GEOCODER_API_KEY` (if using paid provider)

## Success Criteria

1. All new columns exist with correct data types
2. Indexes created and functioning
3. Constraints prevent invalid coordinates
4. Existing functionality unaffected
5. Geocoding script successfully populates coordinates
6. Location-based queries perform acceptably

## Monitoring

Post-migration monitoring should include:
- Query performance metrics
- Geocoding success rates  
- Error rates in location-based features
- Database size growth

## Next Steps After Migration

1. Implement location-based search features
2. Add mapping functionality to UI
3. Create location analytics dashboard
4. Implement radius-based property searches
5. Add market analysis by geographic region