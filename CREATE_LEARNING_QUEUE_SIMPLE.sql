-- Learning Queue for Scraper Training
-- Run this in Supabase SQL Editor

-- Drop existing table if needed (optional)
DROP TABLE IF EXISTS scraper_learning_queue CASCADE;

-- Create the table
CREATE TABLE scraper_learning_queue (
    id BIGSERIAL PRIMARY KEY,
    url TEXT NOT NULL UNIQUE,
    property_name TEXT,
    domain TEXT,
    failure_reason TEXT,
    extraction_method TEXT DEFAULT 'universal',
    attempts INT DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_learning_queue_status ON scraper_learning_queue(status);
CREATE INDEX idx_learning_queue_domain ON scraper_learning_queue(domain);
CREATE INDEX idx_learning_queue_created ON scraper_learning_queue(created_at DESC);

-- Grant permissions
GRANT ALL ON scraper_learning_queue TO service_role;
GRANT ALL ON scraper_learning_queue TO anon;
GRANT ALL ON scraper_learning_queue TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE scraper_learning_queue_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE scraper_learning_queue_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE scraper_learning_queue_id_seq TO authenticated;

-- Verify table was created
SELECT 'Learning queue table created successfully!' AS status;
