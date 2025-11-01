-- Quick fix: Create upsert_property_discovery_and_source function
-- This is the minimal function needed for claude-queue-builder to work

-- Combined RPC: upsert discovery then upsert source and optionally enqueue; returns JSONB
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
AS $$
DECLARE
  source_id BIGINT;
  result JSONB;
BEGIN
  -- Upsert into property_sources
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
    metadata = COALESCE(EXCLUDED.metadata, public.property_sources.metadata),
    updated_at = NOW()
  RETURNING id INTO source_id;

  -- Optionally enqueue into scraping_queue
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
$$;

-- Grant execute to service_role and anon
GRANT EXECUTE ON FUNCTION public.upsert_property_discovery_and_source(
  TEXT, TEXT, INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, 
  DECIMAL, TEXT, TEXT, TEXT, BOOLEAN
) TO service_role;

GRANT EXECUTE ON FUNCTION public.upsert_property_discovery_and_source(
  TEXT, TEXT, INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, 
  DECIMAL, TEXT, TEXT, TEXT, BOOLEAN
) TO anon;

-- Quick test
SELECT 'Function created successfully!' as status;
