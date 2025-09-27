-- Add website type tracking to sources table
-- Migration: 20250927120000_add_website_type_tracking.sql

-- Add columns for website type classification and scraping strategy
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sources' AND column_name = 'website_type') THEN
        ALTER TABLE sources ADD COLUMN website_type TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sources' AND column_name = 'scraping_strategy') THEN
        ALTER TABLE sources ADD COLUMN scraping_strategy TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sources' AND column_name = 'last_scraping_success') THEN
        ALTER TABLE sources ADD COLUMN last_scraping_success BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN sources.website_type IS 'Type of real estate website: property_marketing, listing_aggregator, property_manager, brokerage, unknown';
COMMENT ON COLUMN sources.scraping_strategy IS 'Scraping approach to use: property_marketing, listing_aggregator, property_manager, generic';
COMMENT ON COLUMN sources.last_scraping_success IS 'Whether the last scraping attempt was successful';

-- Update existing sources with known website types based on URL patterns
UPDATE sources SET
  website_type = CASE
    WHEN url LIKE '%eloraatbuckhead%' THEN 'property_marketing'
    WHEN url LIKE '%apartments.com%' THEN 'listing_aggregator'
    WHEN url LIKE '%zillow%' THEN 'listing_aggregator'
    WHEN url LIKE '%realtor.com%' THEN 'listing_aggregator'
    WHEN url LIKE '%greystar%' THEN 'property_manager'
    WHEN url LIKE '%bhmanagement%' THEN 'property_manager'
    WHEN url LIKE '%equityapartments%' THEN 'property_manager'
    WHEN url LIKE '%coldwellbanker%' THEN 'brokerage'
    WHEN url LIKE '%century21%' THEN 'brokerage'
    WHEN url LIKE '%remax%' THEN 'brokerage'
    ELSE 'unknown'
  END,
  scraping_strategy = CASE
    WHEN url LIKE '%eloraatbuckhead%' THEN 'property_marketing'
    WHEN url LIKE '%apartments.com%' THEN 'listing_aggregator'
    WHEN url LIKE '%zillow%' THEN 'listing_aggregator'
    WHEN url LIKE '%realtor.com%' THEN 'listing_aggregator'
    WHEN url LIKE '%greystar%' THEN 'property_marketing'
    WHEN url LIKE '%bhmanagement%' THEN 'property_marketing'
    WHEN url LIKE '%equityapartments%' THEN 'property_marketing'
    WHEN url LIKE '%coldwellbanker%' THEN 'generic'
    WHEN url LIKE '%century21%' THEN 'generic'
    WHEN url LIKE '%remax%' THEN 'generic'
    ELSE 'generic'
  END;

-- Create indexes for better query performance
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'sources' AND indexname = 'idx_sources_website_type') THEN
        CREATE INDEX idx_sources_website_type ON sources(website_type);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'sources' AND indexname = 'idx_sources_scraping_strategy') THEN
        CREATE INDEX idx_sources_scraping_strategy ON sources(scraping_strategy);
    END IF;
END $$;