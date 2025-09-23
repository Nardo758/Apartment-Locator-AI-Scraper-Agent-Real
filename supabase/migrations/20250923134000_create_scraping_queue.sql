-- 20250923134000_create_scraping_queue.sql
-- Create scraping_queue table

CREATE TABLE IF NOT EXISTS scraping_queue (
    id BIGSERIAL PRIMARY KEY,
    external_id VARCHAR NOT NULL REFERENCES scraped_properties(external_id),
    property_id VARCHAR NOT NULL,
    unit_number VARCHAR NOT NULL,
    url VARCHAR NOT NULL,
    source VARCHAR NOT NULL,
    status VARCHAR DEFAULT 'pending',
    priority INTEGER DEFAULT 1,
    data JSONB,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);
