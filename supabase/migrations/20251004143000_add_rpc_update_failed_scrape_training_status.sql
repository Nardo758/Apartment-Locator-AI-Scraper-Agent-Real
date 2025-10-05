-- Migration: add RPC to update training status for a batch

BEGIN;

CREATE OR REPLACE FUNCTION public.rpc_update_failed_scrape_training_status(p_batch_id UUID, p_status TEXT)
RETURNS TABLE(updated_count bigint) AS $$
DECLARE
  v_count bigint := 0;
BEGIN
  UPDATE public.failed_scrapes
  SET training_status = p_status, training_updated_at = now()
  WHERE training_batch_id = p_batch_id
  RETURNING 1 INTO v_count;

  updated_count := (SELECT COUNT(*) FROM public.failed_scrapes WHERE training_batch_id = p_batch_id);
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
