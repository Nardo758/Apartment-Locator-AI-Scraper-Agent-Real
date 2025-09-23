-- 20250923173500_backfill_scoring_data.sql                     -- Backfill initial scoring data

-- Backfill price_change_count first so volatility_score can use it if needed
UPDATE scraped_properties 
SET 
    price_change_count = (
        SELECT COUNT(*) 
        FROM price_history 
        WHERE price_history.external_id = scraped_properties.external_id
    )
WHERE price_change_count IS NULL;

-- Now set a reasonable volatility_score based on observed price changes
UPDATE scraped_properties 
SET 
    volatility_score = CASE 
        WHEN COALESCE(price_change_count,0) > 5 THEN 80
        WHEN COALESCE(price_change_count,0) > 2 THEN 60
        WHEN COALESCE(price_change_count,0) > 0 THEN 40
        ELSE 20
    END
WHERE volatility_score IS NULL;

-- Default priority_score for queue entries that don't have one
UPDATE scraping_queue 
SET priority_score = 50 
WHERE priority_score IS NULL;
