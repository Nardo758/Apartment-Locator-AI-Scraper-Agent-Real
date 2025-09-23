-- 20250923161000_ensure_price_history_trigger.sql
-- Idempotent creation of price_history trigger & function. Safe to run multiple times.

-- Function: record price_history when current_price changes
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'price_history_record_change') THEN
    CREATE OR REPLACE FUNCTION public.price_history_record_change()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      IF TG_OP = 'INSERT' THEN
        INSERT INTO public.price_history (external_id, price, change_type) VALUES (NEW.external_id, NEW.current_price, 'scraped');
        RETURN NEW;
      ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.current_price IS DISTINCT FROM OLD.current_price THEN
          INSERT INTO public.price_history (external_id, price, change_type)
          VALUES (NEW.external_id, NEW.current_price, CASE WHEN NEW.current_price > OLD.current_price THEN 'increased' ELSE 'decreased' END);
        END IF;
        RETURN NEW;
      END IF;
      RETURN NULL;
    END;
    $$;
  ELSE
    -- Replace to ensure definition is up-to-date
    CREATE OR REPLACE FUNCTION public.price_history_record_change()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      IF TG_OP = 'INSERT' THEN
        INSERT INTO public.price_history (external_id, price, change_type) VALUES (NEW.external_id, NEW.current_price, 'scraped');
        RETURN NEW;
      ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.current_price IS DISTINCT FROM OLD.current_price THEN
          INSERT INTO public.price_history (external_id, price, change_type)
          VALUES (NEW.external_id, NEW.current_price, CASE WHEN NEW.current_price > OLD.current_price THEN 'increased' ELSE 'decreased' END);
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
