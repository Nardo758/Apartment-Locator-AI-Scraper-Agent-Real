-- Learning Queue for Scraper Training
-- Stores URLs that failed to scrape properly for manual review and training

CREATE TABLE IF NOT EXISTS scraper_learning_queue (
    id BIGSERIAL PRIMARY KEY,
    url TEXT NOT NULL UNIQUE,
    property_name TEXT,
    domain TEXT,
    failure_reason TEXT,
    extraction_method TEXT, -- 'universal', 'template', 'vision'
    attempts INT DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending', -- 'pending', 'in_review', 'trained', 'skipped'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_learning_queue_status ON scraper_learning_queue(status);
CREATE INDEX IF NOT EXISTS idx_learning_queue_domain ON scraper_learning_queue(domain);
CREATE INDEX IF NOT EXISTS idx_learning_queue_created ON scraper_learning_queue(created_at DESC);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_learning_queue_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_learning_queue_timestamp
    BEFORE UPDATE ON scraper_learning_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_learning_queue_timestamp();

COMMENT ON TABLE scraper_learning_queue IS 'Queue of URLs that failed to scrape - used for training and improving the scraper';
COMMENT ON COLUMN scraper_learning_queue.failure_reason IS 'Why the scrape failed: missing_data, invalid_bathrooms, no_pricing, etc.';
COMMENT ON COLUMN scraper_learning_queue.extraction_method IS 'Which extraction method was attempted';
COMMENT ON COLUMN scraper_learning_queue.status IS 'pending=needs review, in_review=being worked on, trained=template created, skipped=cannot scrape';
