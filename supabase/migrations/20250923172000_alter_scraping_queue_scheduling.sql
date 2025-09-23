-- 20250923172000_alter_scraping_queue_scheduling.sql
-- Add smart scheduling columns to scraping_queue

ALTER TABLE IF EXISTS public.scraping_queue
ADD COLUMN IF NOT EXISTS priority_tier INTEGER DEFAULT 2;

ALTER TABLE IF EXISTS public.scraping_queue
ADD COLUMN IF NOT EXISTS last_change_date TIMESTAMPTZ;

ALTER TABLE IF EXISTS public.scraping_queue
ADD COLUMN IF NOT EXISTS change_frequency INTEGER; -- days between changes

-- Index to help find high-priority and stale rows
CREATE INDEX IF NOT EXISTS idx_queue_schedule_priority_tier ON public.scraping_queue (priority_tier, status, created_at);
