-- 20250923120000_recreate_price_history_trigger.sql
-- Recreate price_history trigger and FK from migration 008

BEGIN;

-- Drop any existing FK from price_history to scraped_properties and recreate with ON DELETE SET NULL
DO $$
DECLARE cname text;
BEGIN
  SELECT conname INTO cname FROM pg_constraint
  WHERE conrelid = 'price_history'::regclass AND confrelid = 'scraped_properties'::regclass
  LIMIT 1;
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE price_history DROP CONSTRAINT %I', cname);
  END IF;
  EXECUTE 'ALTER TABLE price_history ADD CONSTRAINT fk_price_history_external_id FOREIGN KEY (external_id) REFERENCES scraped_properties(external_id) ON DELETE SET NULL';
END$$;

-- Create the trigger function to insert into price_history on insert or when current_price changes
CREATE OR REPLACE FUNCTION public.price_history_record_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.current_price IS NOT NULL THEN
      INSERT INTO price_history (external_id, price, change_type, recorded_at)
      VALUES (NEW.external_id, NEW.current_price, 'scraped', NOW());
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.current_price IS DISTINCT FROM OLD.current_price THEN
      INSERT INTO price_history (external_id, price, change_type, recorded_at)
      VALUES (
        NEW.external_id,
        NEW.current_price,
        CASE WHEN OLD.current_price IS NULL THEN 'scraped' WHEN NEW.current_price > OLD.current_price THEN 'increased' WHEN NEW.current_price < OLD.current_price THEN 'decreased' ELSE 'scraped' END,
        NOW()
      );
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger (after) for inserts and updates of current_price
DROP TRIGGER IF EXISTS trg_price_history_on_change ON scraped_properties;
CREATE TRIGGER trg_price_history_on_change
AFTER INSERT OR UPDATE OF current_price ON scraped_properties
FOR EACH ROW
EXECUTE FUNCTION public.price_history_record_change();

COMMIT;
