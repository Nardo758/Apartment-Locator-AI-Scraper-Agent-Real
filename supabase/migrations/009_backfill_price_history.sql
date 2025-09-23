-- 009_backfill_price_history.sql
-- Backfill price_history with current prices from scraped_properties for listings that don't have history

BEGIN;

INSERT INTO price_history (external_id, price, change_type, recorded_at)
SELECT sp.external_id, sp.current_price, 'scraped', COALESCE(sp.scraped_at, NOW())
FROM scraped_properties sp
LEFT JOIN price_history ph ON ph.external_id = sp.external_id
WHERE sp.current_price IS NOT NULL
  AND ph.id IS NULL;

COMMIT;
