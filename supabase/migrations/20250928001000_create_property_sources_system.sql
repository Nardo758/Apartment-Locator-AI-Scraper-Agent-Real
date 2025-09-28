-- URL Management System: Create property_sources table
-- Migration: 20250928001000_create_property_sources_system.sql
-- This creates the centralized URL management system for property scraping

-- Create the property_sources table for URL management
CREATE TABLE IF NOT EXISTS public.property_sources (
    id BIGSERIAL PRIMARY KEY,
    url TEXT UNIQUE NOT NULL,
    property_name TEXT,
    website_name TEXT,
    is_active BOOLEAN DEFAULT true,
    scrape_frequency TEXT DEFAULT 'weekly' CHECK (scrape_frequency IN ('daily', 'weekly', 'monthly')),
    last_scraped TIMESTAMPTZ,
    next_scrape TIMESTAMPTZ DEFAULT NOW(),
    priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 10),
    expected_units INTEGER,
    region TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Quality metrics
    success_rate DECIMAL(5,2) DEFAULT 100.0,
    avg_units_found INTEGER DEFAULT 0,
    last_error TEXT,
    consecutive_failures INTEGER DEFAULT 0,
    
    -- Cost tracking
    avg_cost_per_scrape DECIMAL(10,4) DEFAULT 0,
    total_cost DECIMAL(10,2) DEFAULT 0,
    
    -- Intelligence tracking
    claude_analyzed BOOLEAN DEFAULT false,
    claude_confidence INTEGER,
    intelligence_last_updated TIMESTAMPTZ
);

-- Enable RLS immediately
ALTER TABLE public.property_sources ENABLE ROW LEVEL SECURITY;

-- Create secure policies
CREATE POLICY "Service role full access" ON public.property_sources
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users read access" ON public.property_sources
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create indexes for performance
CREATE INDEX idx_property_sources_active_priority ON public.property_sources (is_active, priority DESC, next_scrape ASC);
CREATE INDEX idx_property_sources_next_scrape ON public.property_sources (next_scrape) WHERE is_active = true;
CREATE INDEX idx_property_sources_region ON public.property_sources (region) WHERE is_active = true;
CREATE INDEX idx_property_sources_website ON public.property_sources (website_name);
CREATE INDEX idx_property_sources_success_rate ON public.property_sources (success_rate DESC);

-- Create function to calculate next scrape time based on frequency
CREATE OR REPLACE FUNCTION public.calculate_next_scrape_time(
    frequency TEXT,
    base_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    CASE frequency
        WHEN 'daily' THEN
            RETURN base_time + INTERVAL '1 day';
        WHEN 'weekly' THEN
            RETURN base_time + INTERVAL '1 week';
        WHEN 'monthly' THEN
            RETURN base_time + INTERVAL '1 month';
        ELSE
            RETURN base_time + INTERVAL '1 week'; -- Default to weekly
    END CASE;
END;
$$;

-- Create function to update scraping metrics
CREATE OR REPLACE FUNCTION public.update_property_source_metrics(
    source_id BIGINT,
    units_found INTEGER,
    scrape_cost DECIMAL(10,4) DEFAULT 0,
    success BOOLEAN DEFAULT true,
    error_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    current_avg_units INTEGER;
    current_total_cost DECIMAL(10,2);
    current_avg_cost DECIMAL(10,4);
    scrape_count INTEGER;
BEGIN
    -- Get current metrics
    SELECT avg_units_found, total_cost, avg_cost_per_scrape
    INTO current_avg_units, current_total_cost, current_avg_cost
    FROM public.property_sources
    WHERE id = source_id;
    
    -- Calculate scrape count (rough estimate)
    scrape_count := GREATEST(1, ROUND(current_total_cost / NULLIF(current_avg_cost, 0)));
    
    -- Update metrics
    UPDATE public.property_sources
    SET 
        last_scraped = NOW(),
        next_scrape = public.calculate_next_scrape_time(scrape_frequency, NOW()),
        avg_units_found = ROUND((current_avg_units * scrape_count + units_found) / (scrape_count + 1)),
        total_cost = current_total_cost + scrape_cost,
        avg_cost_per_scrape = (current_total_cost + scrape_cost) / (scrape_count + 1),
        consecutive_failures = CASE WHEN success THEN 0 ELSE consecutive_failures + 1 END,
        last_error = CASE WHEN success THEN NULL ELSE error_message END,
        success_rate = CASE 
            WHEN success THEN LEAST(100.0, success_rate + (100.0 - success_rate) * 0.1)
            ELSE GREATEST(0.0, success_rate - 10.0)
        END,
        updated_at = NOW()
    WHERE id = source_id;
    
    -- Auto-disable sources with too many consecutive failures
    UPDATE public.property_sources
    SET is_active = false
    WHERE id = source_id AND consecutive_failures >= 5;
    
    RETURN true;
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Create function to get next batch of URLs to scrape
CREATE OR REPLACE FUNCTION public.get_next_property_sources_batch(
    batch_size INTEGER DEFAULT 10,
    region_filter TEXT DEFAULT NULL
)
RETURNS TABLE(
    id BIGINT,
    url TEXT,
    property_name TEXT,
    website_name TEXT,
    priority INTEGER,
    expected_units INTEGER,
    metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ps.id,
        ps.url,
        ps.property_name,
        ps.website_name,
        ps.priority,
        ps.expected_units,
        ps.metadata
    FROM public.property_sources ps
    WHERE ps.is_active = true
        AND ps.next_scrape <= NOW()
        AND (region_filter IS NULL OR ps.region = region_filter)
        AND ps.consecutive_failures < 5
    ORDER BY 
        ps.priority DESC,
        ps.success_rate DESC,
        ps.next_scrape ASC
    LIMIT batch_size;
END;
$$;

-- Create function to add property source
CREATE OR REPLACE FUNCTION public.add_property_source(
    source_url TEXT,
    source_property_name TEXT DEFAULT NULL,
    source_website_name TEXT DEFAULT NULL,
    source_region TEXT DEFAULT NULL,
    source_priority INTEGER DEFAULT 1,
    source_frequency TEXT DEFAULT 'weekly',
    source_expected_units INTEGER DEFAULT NULL,
    source_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    new_id BIGINT;
BEGIN
    INSERT INTO public.property_sources (
        url, property_name, website_name, region, priority, 
        scrape_frequency, expected_units, metadata
    )
    VALUES (
        source_url, source_property_name, source_website_name, 
        source_region, source_priority, source_frequency, 
        source_expected_units, source_metadata
    )
    RETURNING id INTO new_id;
    
    RETURN new_id;
END;
$$;

-- Create updated_at trigger for property_sources
CREATE TRIGGER update_property_sources_updated_at
    BEFORE UPDATE ON public.property_sources
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add relationship between scraped_properties and property_sources
ALTER TABLE public.scraped_properties 
ADD COLUMN IF NOT EXISTS property_source_id BIGINT REFERENCES public.property_sources(id);

ALTER TABLE public.scraping_queue 
ADD COLUMN IF NOT EXISTS property_source_id BIGINT REFERENCES public.property_sources(id);

-- Create index for the new relationships
CREATE INDEX IF NOT EXISTS idx_scraped_properties_source_id ON public.scraped_properties (property_source_id);
CREATE INDEX IF NOT EXISTS idx_scraping_queue_source_id ON public.scraping_queue (property_source_id);

-- Insert sample property sources (can be customized based on existing data)
INSERT INTO public.property_sources (url, property_name, website_name, region, priority, scrape_frequency, expected_units) VALUES
    ('https://www.apartments.com/atlanta-ga/', 'Atlanta Apartments', 'apartments.com', 'atlanta', 8, 'weekly', 100),
    ('https://www.rent.com/georgia/atlanta-apartments', 'Atlanta Rent Listings', 'rent.com', 'atlanta', 7, 'weekly', 80),
    ('https://www.zillow.com/atlanta-ga/rentals/', 'Atlanta Zillow Rentals', 'zillow.com', 'atlanta', 9, 'daily', 150),
    ('https://www.apartmentguide.com/apartments/Georgia/Atlanta/', 'Atlanta Apartment Guide', 'apartmentguide.com', 'atlanta', 6, 'weekly', 60)
ON CONFLICT (url) DO NOTHING;

-- Grant permissions
GRANT SELECT ON public.property_sources TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_property_sources_batch(INTEGER, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_property_source_metrics(BIGINT, INTEGER, DECIMAL, BOOLEAN, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.add_property_source(TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, INTEGER, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.calculate_next_scrape_time(TEXT, TIMESTAMPTZ) TO service_role;

-- Add helpful comments
COMMENT ON TABLE public.property_sources IS 'Centralized URL management system for property scraping';
COMMENT ON COLUMN public.property_sources.url IS 'Base URL for property listings';
COMMENT ON COLUMN public.property_sources.scrape_frequency IS 'How often to scrape: daily, weekly, monthly';
COMMENT ON COLUMN public.property_sources.priority IS 'Scraping priority (1-10, higher is more important)';
COMMENT ON COLUMN public.property_sources.success_rate IS 'Success rate percentage (0-100)';
COMMENT ON COLUMN public.property_sources.consecutive_failures IS 'Number of consecutive scraping failures';
COMMENT ON COLUMN public.property_sources.claude_analyzed IS 'Whether Claude has analyzed this property source';

-- Log migration completion
DO $$
DECLARE
    sources_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO sources_count FROM public.property_sources;
    RAISE NOTICE 'Property sources system created. Initial sources: %', sources_count;
END $$;