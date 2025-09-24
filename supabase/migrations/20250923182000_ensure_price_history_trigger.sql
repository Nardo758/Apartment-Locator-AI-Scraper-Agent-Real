-- 20250923182000_ensure_price_history_trigger.sql
-- Idempotent creation of price_history table, trigger & function. Safe to run multiple times.

-- Create table if it does not exist (non-destructive)
CREATE TABLE IF NOT EXISTS public.price_history (
  id BIGSERIAL PRIMARY KEY,
  external_id VARCHAR NOT NULL,
  price INTEGER NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  change_type VARCHAR DEFAULT 'scraped'
);

-- Ensure index exists
CREATE INDEX IF NOT EXISTS idx_price_history_external_id ON public.price_history (external_id, recorded_at);

-- Create or replace function to record price history when current_price changes
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'price_history_record_change') THEN
    CREATE OR REPLACE FUNCTION public.price_history_record_change()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
    BEGIN
      IF TG_OP = 'INSERT' THEN
        INSERT INTO public.price_history (external_id, price, change_type)
        VALUES (NEW.external_id, NEW.current_price, 'initial');
        RETURN NEW;
      ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.current_price IS DISTINCT FROM OLD.current_price THEN
          INSERT INTO public.price_history (external_id, price, change_type)
          VALUES (
            NEW.external_id,
            NEW.current_price,
            CASE
              WHEN OLD.current_price IS NULL THEN 'initial'
              WHEN NEW.current_price > OLD.current_price THEN 'increased'
              WHEN NEW.current_price < OLD.current_price THEN 'decreased'
              ELSE 'unchanged'
            END
          );
        END IF;
        RETURN NEW;
      END IF;
      RETURN NULL;
    END;
    $$;
  ELSE
    -- Replace to ensure definition is up-to-date
    CREATE OR REPLACE FUNCTION public.price_history_record_change()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
    BEGIN
      IF TG_OP = 'INSERT' THEN
        INSERT INTO public.price_history (external_id, price, change_type)
        VALUES (NEW.external_id, NEW.current_price, 'initial');
        RETURN NEW;
      ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.current_price IS DISTINCT FROM OLD.current_price THEN
          INSERT INTO public.price_history (external_id, price, change_type)
          VALUES (
            NEW.external_id,
            NEW.current_price,
            CASE
              WHEN OLD.current_price IS NULL THEN 'initial'
              WHEN NEW.current_price > OLD.current_price THEN 'increased'
              WHEN NEW.current_price < OLD.current_price THEN 'decreased'
              ELSE 'unchanged'
            END
          );
        END IF;
        RETURN NEW;
      END IF;
      RETURN NULL;
    END;
    $$;
  END IF;
END $do$;

-- Create trigger if not exists
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'trg_price_history_on_change' AND c.relname = 'scraped_properties'
  ) THEN
    CREATE TRIGGER trg_price_history_on_change
    AFTER INSERT OR UPDATE OF current_price ON public.scraped_properties
    FOR EACH ROW EXECUTE FUNCTION public.price_history_record_change();
  END IF;
END $do$;
