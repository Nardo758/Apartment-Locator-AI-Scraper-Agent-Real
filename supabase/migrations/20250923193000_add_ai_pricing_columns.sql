-- Add AI pricing and ranking columns to scraped_properties
ALTER TABLE IF EXISTS public.scraped_properties
  ADD COLUMN IF NOT EXISTS ai_price INTEGER,
  ADD COLUMN IF NOT EXISTS effective_price INTEGER,
  ADD COLUMN IF NOT EXISTS market_position VARCHAR(20),
  ADD COLUMN IF NOT EXISTS percentile_rank INTEGER;

-- Optionally create an index to help queries that order by percentile or market_position
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_scraped_properties_percentile_rank'
      AND n.nspname = 'public'
  ) THEN
    CREATE INDEX idx_scraped_properties_percentile_rank ON public.scraped_properties(percentile_rank);
  END IF;
END$$;
