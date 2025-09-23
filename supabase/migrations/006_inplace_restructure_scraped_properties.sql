-- 006_inplace_restructure_scraped_properties.sql
-- In-place restructure of scraped_properties to add property_id/unit_number, generated external_id, and new columns

BEGIN;

-- 1) Add property_id and unit_number if missing
ALTER TABLE IF EXISTS scraped_properties
  ADD COLUMN IF NOT EXISTS property_id VARCHAR,
  ADD COLUMN IF NOT EXISTS unit_number VARCHAR;

-- 2) Populate property_id/unit_number from existing external_id when possible
--    Attempt to split on first underscore; this is a best-effort mapping for legacy values
UPDATE scraped_properties
SET property_id = COALESCE(property_id, split_part(external_id, '_', 1)),
    unit_number = COALESCE(unit_number, split_part(external_id, '_', 2))
WHERE external_id IS NOT NULL
  AND (property_id IS NULL OR unit_number IS NULL);

-- 3) Add other new columns
ALTER TABLE IF EXISTS scraped_properties
  ADD COLUMN IF NOT EXISTS unit VARCHAR,
  ADD COLUMN IF NOT EXISTS square_feet INTEGER,
  ADD COLUMN IF NOT EXISTS security_deposit INTEGER,
  ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'active';

-- If there is an older last_scraped column, use it to populate last_seen_at (best effort)
UPDATE scraped_properties
SET last_seen_at = COALESCE(last_seen_at, last_scraped)
WHERE last_scraped IS NOT NULL;

-- 4) Replace existing external_id (if non-generated) with a generated stored column
DO $$
BEGIN
  -- Drop legacy external_id column if it exists and is not generated
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='scraped_properties' AND column_name='external_id' AND COALESCE(is_generated,'') <> 'ALWAYS'
  ) THEN
    ALTER TABLE scraped_properties DROP COLUMN IF EXISTS external_id;
  END IF;

  -- Add generated external_id if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='scraped_properties' AND column_name='external_id' AND is_generated = 'ALWAYS'
  ) THEN
    ALTER TABLE scraped_properties
      ADD COLUMN external_id VARCHAR GENERATED ALWAYS AS (property_id || '_' || unit_number) STORED UNIQUE;
  END IF;
END$$;

-- 5) Ensure property_id/unit_number are NOT NULL if all rows have values
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM scraped_properties WHERE property_id IS NULL) THEN
    ALTER TABLE scraped_properties ALTER COLUMN property_id SET NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM scraped_properties WHERE unit_number IS NULL) THEN
    ALTER TABLE scraped_properties ALTER COLUMN unit_number SET NOT NULL;
  END IF;
END$$;

-- 6) Add indexes
CREATE INDEX IF NOT EXISTS idx_scraped_properties_days_market ON scraped_properties (first_seen_at, last_seen_at);
CREATE INDEX IF NOT EXISTS idx_scraped_properties_unit_lookup ON scraped_properties (property_id, unit_number);

COMMIT;
