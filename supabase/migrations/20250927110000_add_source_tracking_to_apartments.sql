-- Add source tracking columns to apartments table
-- This allows tracking which source/website each apartment was scraped from

ALTER TABLE apartments ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS source_name TEXT;
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS scraping_job_id BIGINT;

-- Create index for faster queries on source_url
CREATE INDEX IF NOT EXISTS idx_apartments_source_url ON apartments(source_url);

-- Add comment for documentation
COMMENT ON COLUMN apartments.source_url IS 'URL of the website where this apartment was found';
COMMENT ON COLUMN apartments.source_name IS 'Human-readable name of the source website';
COMMENT ON COLUMN apartments.scraping_job_id IS 'ID of the scraping_queue job that found this apartment';