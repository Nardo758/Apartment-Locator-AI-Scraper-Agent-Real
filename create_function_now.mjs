#!/usr/bin/env node
/**
 * Create the missing database function via Supabase REST API
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = 'https://jdymvpasjsdbryatscux.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const functionSQL = `
CREATE OR REPLACE FUNCTION public.upsert_property_discovery_and_source(
  p_property_name TEXT,
  p_property_url TEXT,
  p_year_built INTEGER DEFAULT NULL,
  p_total_units INTEGER DEFAULT NULL,
  p_property_type TEXT DEFAULT NULL,
  p_management_company TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_state TEXT DEFAULT NULL,
  p_zip_code TEXT DEFAULT NULL,
  p_confidence_score DECIMAL(3,2) DEFAULT 0.5,
  p_website_complexity TEXT DEFAULT 'unknown',
  p_priority_level TEXT DEFAULT 'medium',
  p_website_type TEXT DEFAULT 'unknown',
  p_enqueue_for_scraping BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  source_id BIGINT;
  result JSONB;
BEGIN
  INSERT INTO public.property_sources (
    url, 
    property_name,
    region, 
    priority,
    scrape_frequency,
    expected_units,
    metadata,
    created_at,
    updated_at
  ) VALUES (
    p_property_url,
    p_property_name,
    p_state,
    CASE p_priority_level
      WHEN 'critical' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 5
      WHEN 'low' THEN 8
      ELSE 5
    END,
    'weekly',
    p_total_units,
    jsonb_build_object(
      'discovery_data', jsonb_build_object(
        'year_built', p_year_built,
        'total_units', p_total_units,
        'property_type', p_property_type,
        'management_company', p_management_company,
        'confidence_score', p_confidence_score,
        'website_complexity', p_website_complexity,
        'website_type', p_website_type
      )
    ),
    NOW(),
    NOW()
  )
  ON CONFLICT (url) DO UPDATE SET
    property_name = COALESCE(EXCLUDED.property_name, public.property_sources.property_name),
    region = COALESCE(EXCLUDED.region, public.property_sources.region),
    priority = COALESCE(EXCLUDED.priority, public.property_sources.priority),
    expected_units = COALESCE(EXCLUDED.expected_units, public.property_sources.expected_units),
    metadata = public.property_sources.metadata || EXCLUDED.metadata,
    updated_at = NOW()
  RETURNING id INTO source_id;

  IF p_enqueue_for_scraping THEN
    INSERT INTO public.scraping_queue (
      url, 
      source, 
      status, 
      property_source_id,
      created_at
    )
    SELECT 
      p_property_url,
      COALESCE(p_website_type, 'discovery'),
      'queued',
      source_id,
      NOW()
    WHERE NOT EXISTS (
      SELECT 1 
      FROM public.scraping_queue 
      WHERE property_source_id = source_id 
        AND url = p_property_url 
        AND status IN ('pending','processing','queued')
    );
  END IF;

  result := jsonb_build_object(
    'property_source_id', source_id,
    'status', 'completed',
    'enqueued', p_enqueue_for_scraping
  );

  RETURN result;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.upsert_property_discovery_and_source(TEXT, TEXT, INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DECIMAL, TEXT, TEXT, TEXT, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.upsert_property_discovery_and_source(TEXT, TEXT, INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DECIMAL, TEXT, TEXT, TEXT, BOOLEAN) TO anon;
`;

console.log('\n🔧 Creating database function...\n');
console.log('This will fix the integration so properties can be saved to the database.\n');

try {
    // Execute the SQL directly
    const { data, error } = await supabase.rpc('exec', { sql: functionSQL });
    
    if (error) {
        console.error('❌ Error creating function via RPC:', error.message);
        console.log('\n💡 Trying alternative approach...\n');
        
        // Try using the connection string approach
        throw error;
    }
    
    console.log('✅ Function created successfully!\n');
    
} catch (error) {
    console.log('⚠️  Direct creation failed. Using manual SQL approach...\n');
    console.log('Please run this SQL in Supabase Dashboard:\n');
    console.log('https://supabase.com/dashboard/project/jdymvpasjsdbryatscux/sql/new\n');
    console.log('=' .repeat(70));
    console.log(functionSQL);
    console.log('='.repeat(70));
    console.log('\nOr I can guide you through the dashboard...');
    process.exit(1);
}

console.log('🧪 Testing the integration...\n');

// Import and run the test
import('./test_full_integration.mjs');
