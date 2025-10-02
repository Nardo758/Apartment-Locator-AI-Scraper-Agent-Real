-- 20251001000000_agent_system_tables.sql
-- Migration to create tables for the two-agent apartment scraper system
-- Property Discovery Agent (Claude) → properties_basic
-- Rental Data Agent (Vision) → rental_prices

BEGIN;

-- ============================================================================
-- DATABASE 1: Property Basics (Claude-Managed)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.properties_basic (
    id BIGSERIAL PRIMARY KEY,
    property_name TEXT NOT NULL,
    property_url TEXT UNIQUE NOT NULL,
    year_built INTEGER,
    total_units INTEGER,
    property_type TEXT,
    management_company TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    website_complexity TEXT CHECK (website_complexity IN ('simple', 'medium', 'complex')) DEFAULT 'medium',
    priority_level TEXT CHECK (priority_level IN ('high', 'medium', 'low')) DEFAULT 'medium',
    last_verified DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on properties_basic table
ALTER TABLE public.properties_basic ENABLE ROW LEVEL SECURITY;

-- Create policies for properties_basic
CREATE POLICY "Service role full access" ON public.properties_basic
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users read access" ON public.properties_basic
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create indexes for properties_basic
CREATE INDEX idx_properties_basic_url ON public.properties_basic(property_url);
CREATE INDEX idx_properties_basic_location ON public.properties_basic(city, state);
CREATE INDEX idx_properties_basic_priority ON public.properties_basic(priority_level, website_complexity);
CREATE INDEX idx_properties_basic_confidence ON public.properties_basic(confidence_score DESC);
CREATE INDEX idx_properties_basic_verified ON public.properties_basic(last_verified);

-- ============================================================================
-- DATABASE 2: Rental Data (Vision Agent-Managed)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rental_prices (
    id BIGSERIAL PRIMARY KEY,
    property_id BIGINT NOT NULL REFERENCES public.properties_basic(id) ON DELETE CASCADE,
    floorplan_name TEXT NOT NULL,
    bedrooms INTEGER NOT NULL,
    bathrooms DECIMAL(3,1) NOT NULL,
    sqft INTEGER,
    monthly_rent DECIMAL(10,2) NOT NULL,
    lease_term_months INTEGER DEFAULT 12,
    concessions TEXT, -- e.g., "$500 off first month, 2 months free"
    availability_date DATE,
    availability_status TEXT CHECK (availability_status IN ('available', 'waitlist', 'occupied')) DEFAULT 'available',
    extracted_at TIMESTAMPTZ DEFAULT NOW(),
    data_source TEXT DEFAULT 'vision_agent', -- 'vision_agent', 'claude_agent', 'direct_api', etc.
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    extraction_method TEXT DEFAULT 'automated', -- 'automated', 'manual', 'api'
    raw_data JSONB DEFAULT '{}', -- Store original extraction data for debugging
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on rental_prices table
ALTER TABLE public.rental_prices ENABLE ROW LEVEL SECURITY;

-- Create policies for rental_prices
CREATE POLICY "Service role full access" ON public.rental_prices
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users read access" ON public.rental_prices
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create indexes for rental_prices
CREATE INDEX idx_rental_prices_property ON public.rental_prices(property_id);
CREATE INDEX idx_rental_prices_bedrooms ON public.rental_prices(bedrooms, bathrooms);
CREATE INDEX idx_rental_prices_rent ON public.rental_prices(monthly_rent);
CREATE INDEX idx_rental_prices_availability ON public.rental_prices(availability_date, availability_status);
CREATE INDEX idx_rental_prices_extracted ON public.rental_prices(extracted_at DESC);
CREATE INDEX idx_rental_prices_data_source ON public.rental_prices(data_source);

-- ============================================================================
-- ADDITIONAL TABLES FOR AGENT SYSTEM
-- ============================================================================

-- Agent processing queue for rental data extraction
CREATE TABLE IF NOT EXISTS public.agent_processing_queue (
    id BIGSERIAL PRIMARY KEY,
    property_id BIGINT NOT NULL REFERENCES public.properties_basic(id) ON DELETE CASCADE,
    agent_type TEXT NOT NULL CHECK (agent_type IN ('discovery', 'rental_vision', 'rental_claude')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    priority INTEGER DEFAULT 1,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    processing_started_at TIMESTAMPTZ,
    processing_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on agent_processing_queue
ALTER TABLE public.agent_processing_queue ENABLE ROW LEVEL SECURITY;

-- Create policies for agent_processing_queue
CREATE POLICY "Service role full access" ON public.agent_processing_queue
    FOR ALL USING (auth.role() = 'service_role');

-- Create indexes for agent_processing_queue
CREATE INDEX idx_agent_queue_status ON public.agent_processing_queue(status, priority DESC);
CREATE INDEX idx_agent_queue_property ON public.agent_processing_queue(property_id, agent_type);
CREATE INDEX idx_agent_queue_created ON public.agent_processing_queue(created_at);

-- Cost tracking table for agent usage
CREATE TABLE IF NOT EXISTS public.agent_costs (
    id BIGSERIAL PRIMARY KEY,
    agent_type TEXT NOT NULL,
    operation_type TEXT NOT NULL, -- 'discovery', 'rental_extraction', 'vision_analysis', etc.
    cost_usd DECIMAL(10,4) NOT NULL,
    tokens_used INTEGER,
    processing_time_seconds DECIMAL(8,2),
    property_id BIGINT REFERENCES public.properties_basic(id),
    success BOOLEAN DEFAULT TRUE,
    error_details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on agent_costs
ALTER TABLE public.agent_costs ENABLE ROW LEVEL SECURITY;

-- Create policies for agent_costs
CREATE POLICY "Service role full access" ON public.agent_costs
    FOR ALL USING (auth.role() = 'service_role');

-- Create indexes for agent_costs
CREATE INDEX idx_agent_costs_type ON public.agent_costs(agent_type, operation_type);
CREATE INDEX idx_agent_costs_date ON public.agent_costs(created_at DESC);
CREATE INDEX idx_agent_costs_property ON public.agent_costs(property_id);

-- ============================================================================
-- FUNCTIONS FOR AGENT SYSTEM
-- ============================================================================

-- Function to get next property for processing
CREATE OR REPLACE FUNCTION get_next_agent_property(
    agent_type_param TEXT DEFAULT NULL,
    priority_level_param TEXT DEFAULT NULL
)
RETURNS TABLE (
    property_id BIGINT,
    property_name TEXT,
    property_url TEXT,
    priority_level TEXT,
    website_complexity TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        pb.id,
        pb.property_name,
        pb.property_url,
        pb.priority_level,
        pb.website_complexity
    FROM public.properties_basic pb
    LEFT JOIN public.agent_processing_queue apq ON pb.id = apq.property_id
        AND apq.agent_type = agent_type_param
        AND apq.status IN ('pending', 'processing')
    WHERE apq.id IS NULL -- Not currently being processed
        AND (priority_level_param IS NULL OR pb.priority_level = priority_level_param)
    ORDER BY
        CASE pb.priority_level
            WHEN 'high' THEN 1
            WHEN 'medium' THEN 2
            WHEN 'low' THEN 3
        END,
        pb.created_at ASC
    LIMIT 1;
END;
$$;

-- Function to update property priority based on criteria
CREATE OR REPLACE FUNCTION update_property_priorities()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    updated_count INTEGER := 0;
BEGIN
    -- Update high priority for luxury/large properties
    UPDATE public.properties_basic
    SET priority_level = 'high'
    WHERE total_units > 200
       OR property_type IN ('luxury', 'high-rise')
       OR management_company IN ('CBRE', 'Greystar', 'Equity Residential', 'AvalonBay');

    -- Update medium priority for medium-sized properties
    UPDATE public.properties_basic
    SET priority_level = 'medium'
    WHERE total_units BETWEEN 50 AND 200
      AND priority_level = 'low';

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$;

COMMIT;