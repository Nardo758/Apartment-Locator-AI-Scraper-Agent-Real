-- Migration: 20251006120000_create_property_discovery_and_upsert.sql
-- Creates property_discovery table, upsert_property_discovery function
-- and upsert_property_source_and_enqueue helper RPC

BEGIN;

-- Create property_discovery table
CREATE TABLE IF NOT EXISTS public.property_discovery (
    id BIGSERIAL PRIMARY KEY,
    property_name TEXT NOT NULL,
    property_url TEXT NOT NULL UNIQUE,
    year_built INTEGER,
    total_units INTEGER,
    property_type TEXT,
    management_company TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
  zip_code TEXT,
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1) DEFAULT 0.5,
  website_complexity TEXT CHECK (website_complexity IN ('simple', 'medium', 'complex', 'unknown')) DEFAULT 'unknown',
  priority_level TEXT CHECK (priority_level IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  website_type TEXT CHECK (website_type IN ('jonah', 'mixed_media', 'yardi_rent_cafe', 'entrada', 'other', 'unknown')) DEFAULT 'unknown',
    last_verified DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_discovery_city_state ON public.property_discovery(city, state);
CREATE INDEX IF NOT EXISTS idx_property_discovery_priority ON public.property_discovery(priority_level);
CREATE INDEX IF NOT EXISTS idx_property_discovery_confidence ON public.property_discovery(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_property_discovery_last_verified ON public.property_discovery(last_verified);

-- Trigger to keep updated_at current
CREATE OR REPLACE FUNCTION public.update_property_discovery_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS property_discovery_updated_at ON public.property_discovery;
CREATE TRIGGER property_discovery_updated_at
    BEFORE UPDATE ON public.property_discovery
    FOR EACH ROW
    EXECUTE FUNCTION public.update_property_discovery_updated_at();

-- Upsert function for property_discovery (user provided implementation)
CREATE OR REPLACE FUNCTION public.upsert_property_discovery(
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
  p_website_type TEXT DEFAULT 'unknown'
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  discovery_id BIGINT;
BEGIN
  INSERT INTO public.property_discovery (
    property_name, property_url, year_built, total_units, property_type,
    management_company, address, city, state, zip_code, confidence_score,
    website_complexity, priority_level, website_type
  ) VALUES (
    p_property_name, p_property_url, p_year_built, p_total_units, p_property_type,
    p_management_company, p_address, p_city, p_state, p_zip_code, p_confidence_score,
    p_website_complexity, p_priority_level, p_website_type
  )
  ON CONFLICT (property_url) 
  DO UPDATE SET
    property_name = EXCLUDED.property_name,
    year_built = COALESCE(EXCLUDED.year_built, public.property_discovery.year_built),
    total_units = COALESCE(EXCLUDED.total_units, public.property_discovery.total_units),
    property_type = COALESCE(EXCLUDED.property_type, public.property_discovery.property_type),
    management_company = COALESCE(EXCLUDED.management_company, public.property_discovery.management_company),
    address = COALESCE(EXCLUDED.address, public.property_discovery.address),
    city = COALESCE(EXCLUDED.city, public.property_discovery.city),
    state = COALESCE(EXCLUDED.state, public.property_discovery.state),
    zip_code = COALESCE(EXCLUDED.zip_code, public.property_discovery.zip_code),
  confidence_score = EXCLUDED.confidence_score,
  website_complexity = EXCLUDED.website_complexity,
  priority_level = EXCLUDED.priority_level,
  website_type = EXCLUDED.website_type,
    last_verified = CURRENT_DATE,
    updated_at = NOW()
  RETURNING id INTO discovery_id;
  
  RETURN discovery_id;
END;
$$;

-- Upsert helper: insert/update property_sources and optionally enqueue a scraping_queue job
CREATE OR REPLACE FUNCTION public.upsert_property_source_and_enqueue(
  p_url TEXT,
  p_property_name TEXT DEFAULT NULL,
  p_website_name TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL,
  p_priority INTEGER DEFAULT 1,
  p_scrape_frequency TEXT DEFAULT 'weekly',
  p_expected_units INTEGER DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB,
  p_enqueue BOOLEAN DEFAULT FALSE
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  src_id BIGINT;
  has_metadata BOOLEAN := EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'metadata');
  has_property_cols BOOLEAN := EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'property_id')
                        AND EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'unit_number');
  insert_sql TEXT;
BEGIN
  -- Upsert into property_sources
  INSERT INTO public.property_sources (url, property_name, website_name, region, priority, scrape_frequency, expected_units, metadata)
  VALUES (p_url, p_property_name, p_website_name, p_region, p_priority, p_scrape_frequency, p_expected_units, p_metadata)
  ON CONFLICT (url) DO UPDATE SET
    property_name = COALESCE(EXCLUDED.property_name, public.property_sources.property_name),
    website_name = COALESCE(EXCLUDED.website_name, public.property_sources.website_name),
    region = COALESCE(EXCLUDED.region, public.property_sources.region),
    priority = COALESCE(EXCLUDED.priority, public.property_sources.priority),
    expected_units = COALESCE(EXCLUDED.expected_units, public.property_sources.expected_units),
    metadata = COALESCE(EXCLUDED.metadata, public.property_sources.metadata),
    updated_at = NOW()
  RETURNING id INTO src_id;

  -- Optionally enqueue into scraping_queue using resilient SQL that adapts to schema
  IF p_enqueue THEN
    IF has_metadata THEN
      insert_sql := format($f$
        INSERT INTO public.scraping_queue (external_id, url, source, status, metadata, property_source_id, created_at)
        SELECT NULL, %L, %L, 'queued', %L::jsonb, %s, NOW()
        WHERE NOT EXISTS (
          SELECT 1 FROM public.scraping_queue WHERE property_source_id = %s AND url = %L AND status IN ('pending','processing','queued')
        )
      $f$, p_url, COALESCE(p_website_name, 'discovery'), to_jsonb(p_metadata)::text, src_id, src_id, p_url);
    ELSE
      insert_sql := format($f$
        INSERT INTO public.scraping_queue (external_id, url, source, status, property_source_id, created_at)
        SELECT NULL, %L, %L, 'queued', %s, NOW()
        WHERE NOT EXISTS (
          SELECT 1 FROM public.scraping_queue WHERE property_source_id = %s AND url = %L AND status IN ('pending','processing','queued')
        )
      $f$, p_url, COALESCE(p_website_name, 'discovery'), src_id, src_id, p_url);
    END IF;

    EXECUTE insert_sql;
  END IF;

  RETURN src_id;
END;
$$;

-- Grant execute to service_role
GRANT EXECUTE ON FUNCTION public.upsert_property_discovery(TEXT, TEXT, INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DECIMAL, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.upsert_property_source_and_enqueue(TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, INTEGER, JSONB, BOOLEAN) TO service_role;

COMMIT;

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
  discovery_id BIGINT;
  source_id BIGINT;
  result JSONB;
BEGIN
  -- Upsert into property_discovery
  SELECT public.upsert_property_discovery(
    p_property_name, p_property_url, p_year_built, p_total_units, p_property_type,
    p_management_company, p_address, p_city, p_state, p_zip_code, p_confidence_score,
    p_website_complexity, p_priority_level, p_website_type
  ) INTO discovery_id;
  
  -- Upsert into property_sources + optionally enqueue (uses discovery_id in metadata)
  SELECT public.upsert_property_source_and_enqueue(
    p_property_url,
    p_property_name,
    NULL,
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
    jsonb_build_object('discovery_data', jsonb_build_object(
      'year_built', p_year_built,
      'total_units', p_total_units,
      'property_type', p_property_type,
      'management_company', p_management_company,
      'confidence_score', p_confidence_score,
      'website_complexity', p_website_complexity,
      'website_type', p_website_type,
      'discovery_id', discovery_id
    )),
    p_enqueue_for_scraping
  ) INTO source_id;

  result := jsonb_build_object(
    'discovery_id', discovery_id,
    'property_source_id', source_id,
    'status', 'completed'
  );

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_property_discovery_and_source(TEXT, TEXT, INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DECIMAL, TEXT, TEXT, TEXT, BOOLEAN) TO service_role;
