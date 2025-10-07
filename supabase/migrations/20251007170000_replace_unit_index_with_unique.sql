-- Replace any non-unique index on (property_id, unit_number) with a unique index
-- This migration is defensive/idempotent: it drops the non-unique index if present
-- and creates the unique index if it doesn't exist.

DROP INDEX IF EXISTS idx_properties_unit_lookup;
CREATE UNIQUE INDEX IF NOT EXISTS uq_scraped_properties_property_unit ON public.scraped_properties (property_id, unit_number);
