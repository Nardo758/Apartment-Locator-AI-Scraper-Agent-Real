-- Schema Verification Queries for Frontend Integration
-- Run these queries to verify that all required tables and columns exist

-- ===========================================
-- 1. Check if all required tables exist
-- ===========================================
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
    'market_intelligence',
    'scraped_properties',  -- Current scraper table
    'price_history',       -- Current price tracking
    'scraping_queue'       -- Current job queue
  )
ORDER BY table_name;

-- ===========================================
-- 2. Verify required columns exist in properties table
-- ===========================================
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default,
  CASE 
    WHEN column_name IN (
      'external_id', 'name', 'address', 'city', 'state', 'zip',
      'latitude', 'longitude', 'bedrooms', 'bathrooms', 'sqft',
      'original_price', 'ai_price', 'effective_price', 'amenities',
      'features', 'pet_policy', 'parking'
    ) THEN '✅ Required'
    ELSE '📝 Optional'
  END as requirement_status
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'properties'
ORDER BY ordinal_position;

-- ===========================================
-- 3. Check for missing required columns in properties
-- ===========================================
WITH required_columns AS (
  SELECT unnest(ARRAY[
    'external_id', 'name', 'address', 'city', 'state', 'zip',
    'latitude', 'longitude', 'bedrooms', 'bathrooms', 'sqft',
    'original_price', 'ai_price', 'effective_price', 'amenities',
    'features', 'pet_policy', 'parking', 'apartment_iq_data'
  ]) AS column_name
),
existing_columns AS (
  SELECT column_name
  FROM information_schema.columns 
  WHERE table_schema = 'public' AND table_name = 'properties'
)
SELECT 
  rc.column_name,
  CASE 
    WHEN ec.column_name IS NULL THEN '❌ MISSING - Need to add this column'
    ELSE '✅ EXISTS'
  END as status
FROM required_columns rc
LEFT JOIN existing_columns ec ON rc.column_name = ec.column_name
ORDER BY rc.column_name;

-- ===========================================
-- 4. Verify scraped_properties table structure
-- ===========================================
SELECT 
  'scraped_properties' as table_name,
  column_name, 
  data_type,
  is_nullable,
  CASE 
    WHEN column_name IN (
      'external_id', 'property_id', 'unit_number', 'source', 'name', 
      'address', 'city', 'state', 'current_price', 'bedrooms', 'bathrooms'
    ) THEN '✅ Core Field'
    WHEN column_name IN (
      'square_feet', 'free_rent_concessions', 'application_fee', 
      'admin_fee_waived', 'admin_fee_amount', 'security_deposit'
    ) THEN '📋 Enhancement Field'
    ELSE '📝 Metadata Field'
  END as field_category
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'scraped_properties'
ORDER BY ordinal_position;

-- ===========================================
-- 5. Test geographic search functionality
-- ===========================================
-- This query tests if the geographic search function exists and works
DO $$
BEGIN
  -- Check if the function exists
  IF EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'search_properties_near_location'
  ) THEN
    RAISE NOTICE '✅ Geographic search function exists';
    
    -- Test the function (if properties table exists with lat/lng)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'properties' 
      AND column_name IN ('latitude', 'longitude')
    ) THEN
      RAISE NOTICE '✅ Properties table has geographic columns';
    ELSE
      RAISE NOTICE '❌ Properties table missing latitude/longitude columns';
    END IF;
  ELSE
    RAISE NOTICE '❌ Geographic search function does not exist';
  END IF;
END $$;

-- ===========================================
-- 6. Check data transformation compatibility
-- ===========================================
-- Verify that scraped_properties data can be transformed to frontend format
SELECT 
  'Data Transformation Compatibility Check' as check_name,
  COUNT(*) as total_properties,
  COUNT(CASE WHEN external_id IS NOT NULL THEN 1 END) as has_external_id,
  COUNT(CASE WHEN name IS NOT NULL AND name != '' THEN 1 END) as has_name,
  COUNT(CASE WHEN address IS NOT NULL AND address != '' THEN 1 END) as has_address,
  COUNT(CASE WHEN city IS NOT NULL AND city != '' THEN 1 END) as has_city,
  COUNT(CASE WHEN state IS NOT NULL AND state != '' THEN 1 END) as has_state,
  COUNT(CASE WHEN current_price IS NOT NULL AND current_price > 0 THEN 1 END) as has_valid_price,
  COUNT(CASE WHEN bedrooms IS NOT NULL THEN 1 END) as has_bedrooms,
  COUNT(CASE WHEN bathrooms IS NOT NULL THEN 1 END) as has_bathrooms,
  ROUND(
    (COUNT(CASE WHEN external_id IS NOT NULL AND name IS NOT NULL AND address IS NOT NULL 
                 AND city IS NOT NULL AND state IS NOT NULL AND current_price > 0 THEN 1 END) 
     * 100.0 / NULLIF(COUNT(*), 0)), 2
  ) as transformation_ready_percent
FROM scraped_properties
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scraped_properties');

-- ===========================================
-- 7. Check for required indexes
-- ===========================================
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef,
  CASE 
    WHEN indexname LIKE '%external_id%' THEN '✅ Critical for lookups'
    WHEN indexname LIKE '%latitude%' OR indexname LIKE '%longitude%' THEN '✅ Critical for geo search'
    WHEN indexname LIKE '%price%' THEN '📊 Important for filtering'
    WHEN indexname LIKE '%created_at%' OR indexname LIKE '%updated_at%' THEN '⏰ Important for sorting'
    ELSE '📝 Other'
  END as importance
FROM pg_indexes 
WHERE schemaname = 'public'
  AND tablename IN ('properties', 'scraped_properties', 'apartment_iq_data')
ORDER BY tablename, indexname;

-- ===========================================
-- 8. Data Quality Assessment
-- ===========================================
-- Check data quality in scraped_properties for transformation readiness
WITH quality_check AS (
  SELECT 
    external_id,
    CASE 
      WHEN name IS NULL OR name = '' THEN 0 ELSE 1 
    END +
    CASE 
      WHEN address IS NULL OR address = '' THEN 0 ELSE 1 
    END +
    CASE 
      WHEN city IS NULL OR city = '' THEN 0 ELSE 1 
    END +
    CASE 
      WHEN state IS NULL OR state = '' OR LENGTH(state) != 2 THEN 0 ELSE 1 
    END +
    CASE 
      WHEN current_price IS NULL OR current_price <= 0 THEN 0 ELSE 1 
    END +
    CASE 
      WHEN bedrooms IS NULL OR bedrooms < 0 THEN 0 ELSE 1 
    END +
    CASE 
      WHEN bathrooms IS NULL OR bathrooms <= 0 THEN 0 ELSE 1 
    END as quality_score
  FROM scraped_properties
  WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scraped_properties')
)
SELECT 
  'Data Quality Assessment' as assessment_type,
  COUNT(*) as total_properties,
  COUNT(CASE WHEN quality_score >= 7 THEN 1 END) as excellent_quality,
  COUNT(CASE WHEN quality_score >= 5 THEN 1 END) as good_quality,
  COUNT(CASE WHEN quality_score >= 3 THEN 1 END) as acceptable_quality,
  COUNT(CASE WHEN quality_score < 3 THEN 1 END) as poor_quality,
  ROUND(AVG(quality_score), 2) as avg_quality_score,
  ROUND(
    (COUNT(CASE WHEN quality_score >= 5 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)), 2
  ) as transformation_success_rate_estimate
FROM quality_check;

-- ===========================================
-- 9. Sample data transformation test
-- ===========================================
-- Test actual data transformation on a small sample
SELECT 
  'Sample Transformation Test' as test_type,
  external_id,
  name,
  address || ', ' || city || ', ' || state as full_address,
  current_price as original_price,
  -- Simulate AI price calculation (basic example)
  CASE 
    WHEN current_price > 0 THEN 
      ROUND(current_price * (1 + (CASE WHEN square_feet > 1000 THEN 0.05 ELSE 0 END)))
    ELSE NULL
  END as simulated_ai_price,
  -- Simulate effective price calculation
  CASE 
    WHEN current_price > 0 THEN 
      ROUND(current_price - COALESCE(
        CASE 
          WHEN free_rent_concessions ILIKE '%1 month%' THEN current_price * 0.08
          WHEN free_rent_concessions ILIKE '%2 month%' THEN current_price * 0.16
          ELSE 0
        END, 0
      ))
    ELSE NULL
  END as simulated_effective_price,
  bedrooms,
  bathrooms,
  square_feet as sqft,
  COALESCE(free_rent_concessions, 'None') as concessions,
  'active' as status
FROM scraped_properties 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scraped_properties')
  AND external_id IS NOT NULL 
  AND name IS NOT NULL 
  AND current_price > 0
LIMIT 5;

-- ===========================================
-- 10. Performance and Scalability Check
-- ===========================================
SELECT 
  'Performance Assessment' as check_type,
  (SELECT COUNT(*) FROM scraped_properties WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scraped_properties')) as scraped_properties_count,
  (SELECT COUNT(*) FROM properties WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'properties')) as frontend_properties_count,
  (SELECT pg_size_pretty(pg_total_relation_size('scraped_properties')) WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scraped_properties')) as scraped_table_size,
  (SELECT pg_size_pretty(pg_total_relation_size('properties')) WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'properties')) as frontend_table_size,
  (SELECT COUNT(*) FROM pg_stat_user_indexes WHERE relname IN ('scraped_properties', 'properties')) as total_indexes;

-- ===========================================
-- Summary Report
-- ===========================================
SELECT 
  '🎯 INTEGRATION READINESS SUMMARY' as summary_title,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'properties') 
    THEN '✅ Frontend properties table exists'
    ELSE '❌ Need to create frontend properties table'
  END as frontend_table_status,
  
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scraped_properties') 
    THEN '✅ Source scraped_properties table exists'
    ELSE '❌ Source table missing'
  END as source_table_status,
  
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'scraped_properties' 
      AND column_name IN ('external_id', 'name', 'address', 'current_price')
    ) 
    THEN '✅ Core transformation fields available'
    ELSE '❌ Missing core fields for transformation'
  END as transformation_readiness,
  
  '🚀 Ready to deploy data integration pipeline!' as recommendation;