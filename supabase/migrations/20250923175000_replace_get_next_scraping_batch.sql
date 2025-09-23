-- 20250923175000_replace_get_next_scraping_batch.sql
-- Replace get_next_scraping_batch with a corrected implementation that avoids FOR UPDATE on outer joins

CREATE OR REPLACE FUNCTION public.get_next_scraping_batch(batch_size INTEGER DEFAULT 50)
RETURNS TABLE(
    queue_id BIGINT,
    external_id VARCHAR,
    url VARCHAR,
    source VARCHAR,
    priority_score INTEGER,
    ai_model VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    WITH candidates AS (
      SELECT q.id
      FROM public.scraping_queue q
      WHERE q.status = 'pending'
      ORDER BY public.calculate_priority_score(
        q.property_id,
        COALESCE(FLOOR(EXTRACT(epoch FROM (NOW() - q.last_successful_scrape))/86400)::int, 99),
        COALESCE((SELECT sp.volatility_score FROM public.scraped_properties sp WHERE sp.external_id = q.external_id), 50),
        COALESCE(q.success_rate, 1.0),
        COALESCE(q.scrape_attempts, 0)
      ) DESC, q.created_at ASC
      LIMIT batch_size
    ), locked AS (
      SELECT id FROM candidates FOR UPDATE SKIP LOCKED
    )
    UPDATE public.scraping_queue sq
    SET status = 'processing', started_at = NOW(), scrape_attempts = COALESCE(sq.scrape_attempts,0) + 1
    FROM locked
    WHERE sq.id = locked.id
    RETURNING sq.id, sq.external_id, sq.url, sq.source, sq.priority_score,
      CASE 
        WHEN sq.priority_score >= 70 THEN 'gpt-4-turbo-preview'
        WHEN sq.priority_score >= 40 THEN 'gpt-3.5-turbo-16k'
        ELSE 'gpt-3.5-turbo'
      END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
