-- Migration: create failed_scrapes table and RPC to reprocess

BEGIN;

-- Create failed_scrapes table to store schema validation failures and other unrecoverable items
CREATE TABLE IF NOT EXISTS public.failed_scrapes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  external_id text NOT NULL,
  payload jsonb NOT NULL,
  error jsonb,
  requeue_count integer DEFAULT 0,
  requeued_at timestamptz NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_failed_scrapes_external_id ON public.failed_scrapes (external_id);
CREATE INDEX IF NOT EXISTS idx_failed_scrapes_created_at ON public.failed_scrapes (created_at);

-- RPC to reprocess failed scrapes: inserts into scraping_queue for items not already queued or processed
CREATE OR REPLACE FUNCTION public.reprocess_failed_scrapes(p_limit integer DEFAULT 100)
RETURNS TABLE(reprocessed bigint, skipped bigint) AS $$
DECLARE
  r record;
  v_reprocessed bigint := 0;
  v_skipped bigint := 0;
BEGIN
  FOR r IN SELECT * FROM public.failed_scrapes ORDER BY created_at LIMIT p_limit LOOP
    -- Check if the external_id already exists in scraping_queue or scraped_properties
    IF EXISTS (SELECT 1 FROM public.scraping_queue WHERE external_id = r.external_id) OR
       EXISTS (SELECT 1 FROM public.scraped_properties WHERE external_id = r.external_id) THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    -- Insert back into scraping_queue with minimal payload; preserve payload in metadata
    INSERT INTO public.scraping_queue (external_id, url, source, status, metadata, created_at)
    VALUES (
      r.external_id,
      (r.payload ->> 'listing_url')::text,
      (r.payload ->> 'source')::text,
      'queued',
      jsonb_build_object('failed_scrape_id', r.id, 'original_payload', r.payload),
      now()
    );

    UPDATE public.failed_scrapes SET requeue_count = requeue_count + 1, requeued_at = now() WHERE id = r.id;
    v_reprocessed := v_reprocessed + 1;
  END LOOP;

  reprocessed := v_reprocessed;
  skipped := v_skipped;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
