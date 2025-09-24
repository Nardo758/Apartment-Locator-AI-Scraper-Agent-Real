-- 20250923183000_create_scraping_costs.sql
-- Idempotent creation of scraping_costs table for daily cost tracking

CREATE TABLE IF NOT EXISTS public.scraping_costs (
  id BIGSERIAL PRIMARY KEY,
  date DATE DEFAULT CURRENT_DATE,
  properties_scraped INTEGER DEFAULT 0,
  ai_requests INTEGER DEFAULT 0,
  estimated_cost DECIMAL(10,4) DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_scraping_costs_date ON public.scraping_costs (date);
