-- 010_update_scraping_queue.sql
-- Enhance scraping_queue schema in-place: add id PK, external_id FK, property_id/unit_number, priority, data, error, timestamps

BEGIN;

-- Add id BIGSERIAL primary key if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='scraping_queue' AND column_name='id'
  ) THEN
    ALTER TABLE scraping_queue ADD COLUMN id BIGSERIAL;
  END IF;
END$$;

-- Make id primary key if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_index i JOIN pg_class c ON c.oid = i.indrelid WHERE c.relname = 'scraping_queue' AND i.indisprimary = true
  ) THEN
    ALTER TABLE scraping_queue ADD PRIMARY KEY (id);
  END IF;
END$$;

-- Add external_id, property_id, unit_number, priority, data, error, timestamps
ALTER TABLE IF EXISTS scraping_queue
  ADD COLUMN IF NOT EXISTS external_id VARCHAR,
  ADD COLUMN IF NOT EXISTS property_id VARCHAR,
  ADD COLUMN IF NOT EXISTS unit_number VARCHAR,
  ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS data JSONB,
  ADD COLUMN IF NOT EXISTS error TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Attempt to populate external_id/property_id/unit_number from URL or existing fields (best-effort)
-- Here we try to set external_id if url contains a recognizable slug; this is placeholder logic.
UPDATE scraping_queue
SET external_id = COALESCE(external_id, split_part(url, '/', array_length(string_to_array(url, '/'), 1)))
WHERE external_id IS NULL AND url IS NOT NULL;

-- Add FK from scraping_queue.external_id to scraped_properties.external_id if not exists
DO $$
DECLARE cname text;
BEGIN
  SELECT conname INTO cname FROM pg_constraint
  WHERE conrelid = 'scraping_queue'::regclass AND confrelid = 'scraped_properties'::regclass
  LIMIT 1;
  IF cname IS NULL THEN
    ALTER TABLE scraping_queue ADD CONSTRAINT fk_scraping_queue_external_id FOREIGN KEY (external_id) REFERENCES scraped_properties(external_id) ON DELETE SET NULL;
  END IF;
END$$;

-- Ensure indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_scraping_queue_status ON scraping_queue(status);
CREATE INDEX IF NOT EXISTS idx_scraping_queue_external_id ON scraping_queue(external_id);
CREATE INDEX IF NOT EXISTS idx_scraping_queue_property_unit ON scraping_queue(property_id, unit_number);

COMMIT;
