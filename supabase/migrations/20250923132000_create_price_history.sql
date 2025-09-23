-- 20250923132000_create_price_history.sql
-- Create the price_history table and index

CREATE TABLE IF NOT EXISTS price_history (
    id BIGSERIAL PRIMARY KEY,
    external_id VARCHAR NOT NULL REFERENCES scraped_properties(external_id),
    price INTEGER NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    change_type VARCHAR DEFAULT 'scraped'  -- scraped, increased, decreased
);

CREATE INDEX IF NOT EXISTS idx_price_history_external_id ON price_history(external_id, recorded_at);
