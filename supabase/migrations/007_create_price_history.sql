-- 007_create_price_history.sql
-- Create price_history table to track price changes for listings

CREATE TABLE IF NOT EXISTS price_history (
  id BIGSERIAL PRIMARY KEY,
  external_id VARCHAR NOT NULL REFERENCES scraped_properties(external_id),
  price INTEGER NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  change_type VARCHAR DEFAULT 'scraped'
);

CREATE INDEX IF NOT EXISTS idx_price_history_external_id ON price_history(external_id, recorded_at);
