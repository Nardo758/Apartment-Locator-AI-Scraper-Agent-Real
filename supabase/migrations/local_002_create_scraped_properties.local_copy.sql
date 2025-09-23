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
