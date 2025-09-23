-- 005_alter_scraped_properties.sql
-- Idempotent alterations to scraped_properties: add missing columns and ensure correct types

BEGIN;

ALTER TABLE IF EXISTS scraped_properties
  ADD COLUMN IF NOT EXISTS free_rent_concessions TEXT,
  ADD COLUMN IF NOT EXISTS application_fee INTEGER,
  ADD COLUMN IF NOT EXISTS admin_fee_waived BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS admin_fee_amount INTEGER,
  ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_scraped TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Type changes with safe USING casts when necessary
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='scraped_properties' AND column_name='state') THEN
    EXECUTE 'ALTER TABLE scraped_properties ALTER COLUMN state TYPE VARCHAR(2) USING state::varchar(2)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='scraped_properties' AND column_name='current_price') THEN
    EXECUTE 'ALTER TABLE scraped_properties ALTER COLUMN current_price TYPE INTEGER USING (current_price::integer)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='scraped_properties' AND column_name='bathrooms') THEN
    EXECUTE 'ALTER TABLE scraped_properties ALTER COLUMN bathrooms TYPE DECIMAL(2,1) USING (bathrooms::numeric)';
  END IF;
END$$;

COMMIT;
