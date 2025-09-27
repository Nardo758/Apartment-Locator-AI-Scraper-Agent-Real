-- sql-lint: disable
-- eslint-disable
-- Create function to update days_on_market and schedule it daily at 2 AM (idempotent)
BEGIN;

-- Create or replace the function
CREATE OR REPLACE FUNCTION public.update_days_on_market()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update days_on_market for active properties
  UPDATE public.scraped_properties
  SET days_on_market = FLOOR(EXTRACT(EPOCH FROM (NOW() - first_seen_at)) / 86400)
  WHERE status = 'active' AND first_seen_at IS NOT NULL;
END;
$$;

-- If pg_cron or cron.schedule is available, schedule the job. Attempt a safe creation.
DO $MAIN$
BEGIN
  -- Check for the existence of the cron.schedule function (available in Supabase via the pg_cron extension wrapper)
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'schedule' AND pg_function_is_visible(oid)) THEN
    -- Use a deterministic job name; if a job with that jobname exists, do nothing.
    IF NOT EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'update-days-on-market'
    ) THEN
      PERFORM cron.schedule(
        'update-days-on-market',
        '0 2 * * *',
        $CRON$UPDATE public.scraped_properties
          SET days_on_market = FLOOR(EXTRACT(EPOCH FROM (NOW() - first_seen_at)) / 86400)
          WHERE status = 'active' AND first_seen_at IS NOT NULL$CRON$
      );
    END IF;
  ELSE
    -- If cron.schedule not available, insert a notice so migration doesn't fail.
    RAISE NOTICE 'cron.schedule not available; please schedule update_days_on_market via your job scheduler';
  END IF;
END$MAIN$;

COMMIT;
