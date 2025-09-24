-- Add detailed amenities and related columns to scraped_properties (idempotent)
BEGIN;

ALTER TABLE IF EXISTS public.scraped_properties
  ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS unit_features JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS pet_policy VARCHAR(100),
  ADD COLUMN IF NOT EXISTS parking_info VARCHAR(100),
  ADD COLUMN IF NOT EXISTS property_type VARCHAR(50);

-- Create GIN indexes for fast array/jsonb containment searches
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_scraped_properties_amenities' AND n.nspname = 'public'
  ) THEN
    CREATE INDEX idx_scraped_properties_amenities ON public.scraped_properties USING GIN (amenities);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_scraped_properties_unit_features' AND n.nspname = 'public'
  ) THEN
    CREATE INDEX idx_scraped_properties_unit_features ON public.scraped_properties USING GIN (unit_features);
  END IF;
END$$;

COMMIT;
