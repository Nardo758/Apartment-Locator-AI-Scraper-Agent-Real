-- Migration: add ai_provider and ai_raw columns to scraped_properties and ensure unique index on (property_id, unit_number)

BEGIN;

ALTER TABLE IF EXISTS public.scraped_properties
  ADD COLUMN IF NOT EXISTS ai_provider text;

ALTER TABLE IF EXISTS public.scraped_properties
  ADD COLUMN IF NOT EXISTS ai_raw jsonb;

-- Create a unique index on (property_id, unit_number) to support ON CONFLICT upserts
CREATE UNIQUE INDEX IF NOT EXISTS idx_scraped_properties_prop_unit_unique
  ON public.scraped_properties (property_id, unit_number);

COMMIT;

-- Safe create-index using pg_class check (avoids dialects that don't support IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND c.relname = 'idx_scraped_properties_prop_unit_unique'
      AND n.nspname = 'public'
  ) THEN
    CREATE UNIQUE INDEX idx_scraped_properties_prop_unit_unique
      ON public.scraped_properties (property_id, unit_number);
  END IF;
END$$;
