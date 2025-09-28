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
