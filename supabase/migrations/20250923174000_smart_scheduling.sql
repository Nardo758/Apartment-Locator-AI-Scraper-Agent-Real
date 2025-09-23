-- 20250923174000_smart_scheduling.sql
-- Smart scheduling: schema additions, scoring function, prioritized view, batch picker, and metrics updater

-- Add scheduling columns to scraping_queue
ALTER TABLE IF EXISTS public.scraping_queue
  ADD COLUMN IF NOT EXISTS priority_score INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS last_successful_scrape TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scrape_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS success_rate DECIMAL(3,2) DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS avg_scrape_duration INTEGER;

-- Add volatility tracking to scraped_properties
ALTER TABLE IF EXISTS public.scraped_properties
  ADD COLUMN IF NOT EXISTS volatility_score INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS price_change_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_price_change TIMESTAMPTZ;

-- Create scoring function
CREATE OR REPLACE FUNCTION public.calculate_priority_score(
    p_property_id VARCHAR,
    p_days_since_last_scrape INTEGER,
    p_volatility_score INTEGER,
    p_success_rate DECIMAL,
    p_scrape_attempts INTEGER
) RETURNS INTEGER AS $$
DECLARE
    base_score INTEGER := 50;
    time_score INTEGER;
    volatility_component INTEGER;
    reliability_score INTEGER;
BEGIN
    -- Time-based scoring (more days = higher priority)
    time_score := LEAST(p_days_since_last_scrape * 5, 30);

    -- Volatility-based scoring (scale 0-100 -> 0-30)
    volatility_component := (p_volatility_score * 30 / 100)::int;

    -- Reliability-based scoring (higher success rate -> slightly lower priority)
    reliability_score := CASE 
        WHEN p_success_rate > 0.9 THEN -10 
        WHEN p_success_rate > 0.7 THEN 0
        ELSE 10 
    END;

    -- Attempt-based penalty (too many failures -> lower priority)
    IF p_scrape_attempts > 3 AND p_success_rate < 0.5 THEN
        reliability_score := reliability_score - 20;
    END IF;

    RETURN base_score + time_score + volatility_component + reliability_score;
END;
$$ LANGUAGE plpgsql;

-- View for smart batch selection
CREATE OR REPLACE VIEW public.scraping_queue_prioritized AS
SELECT 
    sq.*,
    COALESCE(sp.volatility_score, 50) AS volatility_score,
    COALESCE(sp.price_change_count, 0) AS price_change_count,
    sp.last_price_change,
    COALESCE(FLOOR(EXTRACT(epoch FROM (NOW() - sq.last_successful_scrape))/86400)::int, 99) AS days_since_last_scrape,
    public.calculate_priority_score(
        sq.property_id,
        COALESCE(FLOOR(EXTRACT(epoch FROM (NOW() - sq.last_successful_scrape))/86400)::int, 99),
        COALESCE(sp.volatility_score, 50),
        COALESCE(sq.success_rate, 1.0),
        COALESCE(sq.scrape_attempts, 0)
    ) AS calculated_score
FROM public.scraping_queue sq
LEFT JOIN public.scraped_properties sp ON sq.external_id = sp.external_id
WHERE sq.status = 'pending';

-- Function to get next batch for processing
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
            SELECT sq.id
            FROM public.scraping_queue sq
            WHERE sq.status = 'pending'
            ORDER BY public.calculate_priority_score(
                sq.property_id,
                COALESCE(FLOOR(EXTRACT(epoch FROM (NOW() - sq.last_successful_scrape))/86400)::int, 99),
                COALESCE((SELECT volatility_score FROM public.scraped_properties sp WHERE sp.external_id = sq.external_id), 50),
                COALESCE(sq.success_rate, 1.0),
                COALESCE(sq.scrape_attempts, 0)
            ) DESC, sq.created_at ASC
            LIMIT batch_size
        ), locked AS (
            SELECT id FROM candidates FOR UPDATE SKIP LOCKED
        )
        UPDATE public.scraping_queue q
        SET status = 'processing', started_at = NOW(), scrape_attempts = COALESCE(q.scrape_attempts,0) + 1
        FROM locked
        WHERE q.id = locked.id
        RETURNING q.id, q.external_id, q.url, q.source, q.priority_score,
            CASE 
                WHEN q.priority_score >= 70 THEN 'gpt-4-turbo-preview'
                WHEN q.priority_score >= 40 THEN 'gpt-3.5-turbo-16k'
                ELSE 'gpt-3.5-turbo'
            END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update scoring after scrape completion
CREATE OR REPLACE FUNCTION public.update_scraping_metrics(
    p_external_id VARCHAR,
    p_success BOOLEAN,
    p_duration INTEGER,
    p_price_changed BOOLEAN
) RETURNS VOID AS $$
BEGIN
    -- Update queue metrics
    UPDATE public.scraping_queue
    SET 
        last_successful_scrape = CASE WHEN p_success THEN NOW() ELSE last_successful_scrape END,
        success_rate = (
            (COALESCE(success_rate,1.0) * COALESCE(scrape_attempts,0) + CASE WHEN p_success THEN 1 ELSE 0 END)::DECIMAL
            / (COALESCE(scrape_attempts,0) + 1)
        ),
        avg_scrape_duration = COALESCE(
            (COALESCE(avg_scrape_duration,0) * COALESCE(scrape_attempts,0) + COALESCE(p_duration,0))::DECIMAL / (COALESCE(scrape_attempts,0) + 1),
            p_duration
        )
    WHERE external_id = p_external_id;
    
    -- Update property volatility if price changed
    IF p_price_changed THEN
        UPDATE public.scraped_properties 
        SET 
            price_change_count = COALESCE(price_change_count,0) + 1,
            last_price_change = NOW(),
            volatility_score = LEAST(COALESCE(volatility_score,50) + 10, 100)
        WHERE external_id = p_external_id;
    ELSE
        -- Gradually decrease volatility score for stable properties
        UPDATE public.scraped_properties 
        SET volatility_score = GREATEST(COALESCE(volatility_score,50) - 1, 0)
        WHERE external_id = p_external_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
