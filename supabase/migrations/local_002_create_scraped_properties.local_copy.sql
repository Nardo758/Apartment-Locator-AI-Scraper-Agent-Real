-- 002_create_scraped_properties.sql
-- Create scraped_properties table and insert a test row
-- 002_create_scraped_properties.sql
-- Create scraped_properties table with requested schema

CREATE TABLE IF NOT EXISTS scraped_properties (
  id BIGSERIAL PRIMARY KEY,
  external_id VARCHAR NOT NULL UNIQUE,
  source VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  address VARCHAR NOT NULL,
  city VARCHAR NOT NULL,
  state VARCHAR(2) NOT NULL,
  current_price INTEGER NOT NULL,
  bedrooms INTEGER NOT NULL,
  bathrooms DECIMAL(2,1) NOT NULL,
  free_rent_concessions TEXT,
  application_fee INTEGER,
  admin_fee_waived BOOLEAN DEFAULT FALSE,
  admin_fee_amount INTEGER,
  listing_url VARCHAR NOT NULL,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  last_scraped TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optional: insert a single test row if you want. Commented out by default.
/*
INSERT INTO scraped_properties (
  external_id, source, name, address, city, state, current_price, bedrooms, bathrooms, listing_url
) VALUES (
  'real_test_1', 'apartments_com', 'To be scraped', 'To be scraped', 'To be scraped', 'CA', 0, 0, 0.0,
  'https://www.apartments.com/example')
ON CONFLICT (external_id) DO NOTHING;
*/

-- Non-destructive upgrades to keep this local copy compatible with canonical migrations
ALTER TABLE IF EXISTS scraped_properties
    ADD COLUMN IF NOT EXISTS property_id VARCHAR,
    ADD COLUMN IF NOT EXISTS unit_number VARCHAR,
    ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'active';

-- Add generated external_id if external_id is missing but property_id/unit_number present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='scraped_properties' AND column_name='external_id'
    ) THEN
        -- cannot create GENERATED column if external_id already exists; skip
        RAISE NOTICE 'external_id column missing; please recreate table if you want a GENERATED ALWAYS AS expression';
    END IF;
END$$;
