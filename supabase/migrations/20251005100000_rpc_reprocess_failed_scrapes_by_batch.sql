-- Migration: RPC to reprocess failed_scrapes by training batch

BEGIN;

-- Reprocess items from failed_scrapes for a specific training batch where training_status = 'fixed'
CREATE OR REPLACE FUNCTION public.rpc_reprocess_failed_scrapes_by_batch(p_batch_id UUID, p_limit integer DEFAULT 100)
RETURNS TABLE(reprocessed bigint, skipped bigint, errors jsonb) AS $$
DECLARE
  r record;
  v_reprocessed bigint := 0;
  v_skipped bigint := 0;
  v_errors jsonb := '[]'::jsonb;
BEGIN
  FOR r IN
    SELECT * FROM public.failed_scrapes
    WHERE training_batch_id = p_batch_id
      AND training_status = 'fixed'
    ORDER BY created_at
    LIMIT p_limit
  LOOP
    BEGIN
      -- Skip if already queued or already scraped
      IF EXISTS (SELECT 1 FROM public.scraping_queue WHERE external_id = r.external_id) OR
         EXISTS (SELECT 1 FROM public.scraped_properties WHERE external_id = r.external_id) THEN
        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;

      INSERT INTO public.scraping_queue (external_id, url, source, status, metadata, created_at)
      VALUES (
        r.external_id,
        (r.payload ->> 'listing_url')::text,
        (r.payload ->> 'source')::text,
        'queued',
        jsonb_build_object('failed_scrape_id', r.id, 'training_batch_id', r.training_batch_id, 'original_payload', r.payload),
        now()
      );

      UPDATE public.failed_scrapes SET requeue_count = requeue_count + 1, requeued_at = now(), training_status = 'requeued' WHERE id = r.id;
      v_reprocessed := v_reprocessed + 1;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || jsonb_build_object('id', r.id, 'error', SQLERRM);
    END;
  END LOOP;

  reprocessed := v_reprocessed;
  skipped := v_skipped;
  errors := v_errors;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
