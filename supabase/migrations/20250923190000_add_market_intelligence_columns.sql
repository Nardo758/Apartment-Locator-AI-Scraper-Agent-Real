-- Add market intelligence columns to scraped_properties (idempotent)
BEGIN;

ALTER TABLE IF EXISTS public.scraped_properties
  ADD COLUMN IF NOT EXISTS days_on_market INTEGER,
  ADD COLUMN IF NOT EXISTS market_velocity VARCHAR(20),
  ADD COLUMN IF NOT EXISTS concession_value INTEGER,
  ADD COLUMN IF NOT EXISTS concession_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for market analysis
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_scraped_properties_market' AND n.nspname = 'public'
  ) THEN
    CREATE INDEX idx_scraped_properties_market ON public.scraped_properties(days_on_market, market_velocity);
  END IF;
END$$;

COMMIT;
