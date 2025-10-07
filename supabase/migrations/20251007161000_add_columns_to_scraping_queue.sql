-- Add missing columns expected by rpc_upsert_property_and_enqueue
ALTER TABLE IF EXISTS public.scraping_queue
    ADD COLUMN IF NOT EXISTS property_source_id bigint,
    ADD COLUMN IF NOT EXISTS priority integer,
    ADD COLUMN IF NOT EXISTS metadata jsonb;

-- index on property_source_id for quicker queries
CREATE INDEX IF NOT EXISTS idx_scraping_queue_property_source_id ON public.scraping_queue (property_source_id);
