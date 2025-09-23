-- 20250923123000_touch_and_dom.sql
-- Add a trigger to update timestamps and a view to compute days-on-market

BEGIN;

-- Trigger function to update updated_at and last_seen_at
CREATE OR REPLACE FUNCTION public.touch_scraped_properties()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  NEW.last_seen_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_scraped_properties ON scraped_properties;
CREATE TRIGGER trg_touch_scraped_properties
BEFORE UPDATE ON scraped_properties
FOR EACH ROW
EXECUTE FUNCTION public.touch_scraped_properties();

-- View to compute days-on-market (integer days)
CREATE OR REPLACE VIEW scraped_properties_with_dom AS
SELECT
  sp.*,
  FLOOR(EXTRACT(epoch FROM (NOW() - sp.first_seen_at)) / 86400)::int AS days_on_market
FROM scraped_properties sp;

COMMIT;
