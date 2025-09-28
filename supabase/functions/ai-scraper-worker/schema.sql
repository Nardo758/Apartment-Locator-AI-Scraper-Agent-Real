-- ===================================
-- Production Database Schema
-- Claude-Powered AI Apartment Scraper
-- ===================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================================
-- APARTMENTS TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS apartments (
    id BIGSERIAL PRIMARY KEY,
    external_id TEXT UNIQUE NOT NULL,
    source TEXT NOT NULL,
    title TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    rent_price NUMERIC,
    rent_amount NUMERIC, -- Backup field for compatibility
    bedrooms INTEGER,
    bathrooms NUMERIC(3,1),
    square_feet INTEGER,
    free_rent_concessions TEXT,
    application_fee NUMERIC,
    admin_fee_waived BOOLEAN DEFAULT false,
    admin_fee_amount NUMERIC,
    pet_fee NUMERIC,
    security_deposit NUMERIC,
    is_active BOOLEAN DEFAULT true,
    scraped_at TIMESTAMPTZ DEFAULT NOW(),
    source_url TEXT,
    source_name TEXT,
    scraping_job_id INTEGER,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Additional fields for future expansion
    property_type TEXT, -- apartment, house, condo, etc.
    lease_term TEXT,    -- 12-month, month-to-month, etc.
    amenities JSONB,    -- Structured amenity data
    contact_info JSONB, -- Phone, email, etc.
    images JSONB,       -- Array of image URLs
    
    -- Search optimization
    search_vector TSVECTOR
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_apartments_external_id ON apartments(external_id);
CREATE INDEX IF NOT EXISTS idx_apartments_source ON apartments(source);
CREATE INDEX IF NOT EXISTS idx_apartments_city_state ON apartments(city, state);
CREATE INDEX IF NOT EXISTS idx_apartments_price_range ON apartments(rent_price) WHERE rent_price IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_apartments_bedrooms ON apartments(bedrooms) WHERE bedrooms IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_apartments_active ON apartments(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_apartments_scraped_at ON apartments(scraped_at);
CREATE INDEX IF NOT EXISTS idx_apartments_search_vector ON apartments USING GIN(search_vector);

-- ===================================
-- SCRAPING COSTS TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS scraping_costs (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    properties_scraped INTEGER DEFAULT 0,
    ai_requests INTEGER DEFAULT 0,
    tokens_used INTEGER DEFAULT 0,
    estimated_cost NUMERIC(10,6) DEFAULT 0,
    
    -- Provider breakdown
    claude_requests INTEGER DEFAULT 0,
    claude_tokens INTEGER DEFAULT 0,
    claude_cost NUMERIC(10,6) DEFAULT 0,
    
    openai_requests INTEGER DEFAULT 0,
    openai_tokens INTEGER DEFAULT 0,
    openai_cost NUMERIC(10,6) DEFAULT 0,
    
    -- Additional metrics
    avg_response_time NUMERIC(8,2), -- milliseconds
    success_rate NUMERIC(5,4),      -- 0.0 to 1.0
    error_count INTEGER DEFAULT 0,
    
    -- Detailed breakdown
    details JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for cost tracking
CREATE INDEX IF NOT EXISTS idx_scraping_costs_date ON scraping_costs(date);
CREATE INDEX IF NOT EXISTS idx_scraping_costs_cost ON scraping_costs(estimated_cost);

-- ===================================
-- SCRAPING JOBS TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS scraping_jobs (
    id BIGSERIAL PRIMARY KEY,
    job_name TEXT NOT NULL,
    source TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, running, completed, failed
    
    -- Job configuration
    target_urls TEXT[],
    batch_size INTEGER DEFAULT 5,
    delay_ms INTEGER DEFAULT 1000,
    max_retries INTEGER DEFAULT 3,
    
    -- Progress tracking
    total_properties INTEGER DEFAULT 0,
    processed_properties INTEGER DEFAULT 0,
    successful_properties INTEGER DEFAULT 0,
    failed_properties INTEGER DEFAULT 0,
    
    -- Timing
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    estimated_completion TIMESTAMPTZ,
    
    -- Results
    total_cost NUMERIC(10,6) DEFAULT 0,
    avg_accuracy NUMERIC(5,4),
    
    -- Metadata
    created_by TEXT,
    notes TEXT,
    configuration JSONB,
    error_log JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for job tracking
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_status ON scraping_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_source ON scraping_jobs(source);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_created_at ON scraping_jobs(created_at);

-- ===================================
-- ERROR LOGS TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS error_logs (
    id BIGSERIAL PRIMARY KEY,
    error_type TEXT NOT NULL,
    error_message TEXT NOT NULL,
    error_details JSONB,
    
    -- Context
    function_name TEXT DEFAULT 'ai-scraper-worker',
    request_id TEXT,
    external_id TEXT,
    source_url TEXT,
    
    -- Classification
    severity TEXT DEFAULT 'error', -- info, warning, error, critical
    is_resolved BOOLEAN DEFAULT false,
    
    -- Timing
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    
    -- Additional context
    user_agent TEXT,
    ip_address INET,
    request_data JSONB,
    response_data JSONB
);

-- Create indexes for error tracking
CREATE INDEX IF NOT EXISTS idx_error_logs_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_occurred_at ON error_logs(occurred_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_unresolved ON error_logs(is_resolved) WHERE is_resolved = false;

-- ===================================
-- FUNCTIONS AND TRIGGERS
-- ===================================

-- Update timestamps automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_apartments_updated_at 
    BEFORE UPDATE ON apartments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scraping_costs_updated_at 
    BEFORE UPDATE ON scraping_costs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scraping_jobs_updated_at 
    BEFORE UPDATE ON scraping_jobs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Search vector update function
CREATE OR REPLACE FUNCTION update_apartments_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.address, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.city, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.state, '')), 'C');
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply search vector trigger
CREATE TRIGGER update_apartments_search_vector_trigger
    BEFORE INSERT OR UPDATE ON apartments
    FOR EACH ROW EXECUTE FUNCTION update_apartments_search_vector();

-- ===================================
-- COST TRACKING RPC FUNCTION
-- ===================================
CREATE OR REPLACE FUNCTION rpc_inc_scraping_costs(
    p_date DATE,
    p_properties_scraped INTEGER DEFAULT 1,
    p_ai_requests INTEGER DEFAULT 1,
    p_tokens_used INTEGER DEFAULT 0,
    p_estimated_cost NUMERIC DEFAULT 0,
    p_details JSONB DEFAULT '{}'::jsonb,
    p_provider TEXT DEFAULT 'claude',
    p_response_time NUMERIC DEFAULT NULL,
    p_success BOOLEAN DEFAULT true
)
RETURNS void AS $$
DECLARE
    current_success_rate NUMERIC;
    total_requests INTEGER;
    successful_requests INTEGER;
BEGIN
    -- Insert or update daily costs
    INSERT INTO scraping_costs (
        date, 
        properties_scraped, 
        ai_requests, 
        tokens_used, 
        estimated_cost, 
        details,
        claude_requests,
        claude_tokens,
        claude_cost,
        error_count
    ) VALUES (
        p_date, 
        p_properties_scraped, 
        p_ai_requests, 
        p_tokens_used, 
        p_estimated_cost, 
        p_details,
        CASE WHEN p_provider = 'claude' THEN p_ai_requests ELSE 0 END,
        CASE WHEN p_provider = 'claude' THEN p_tokens_used ELSE 0 END,
        CASE WHEN p_provider = 'claude' THEN p_estimated_cost ELSE 0 END,
        CASE WHEN p_success THEN 0 ELSE 1 END
    )
    ON CONFLICT (date) DO UPDATE SET
        properties_scraped = scraping_costs.properties_scraped + p_properties_scraped,
        ai_requests = scraping_costs.ai_requests + p_ai_requests,
        tokens_used = scraping_costs.tokens_used + p_tokens_used,
        estimated_cost = scraping_costs.estimated_cost + p_estimated_cost,
        claude_requests = scraping_costs.claude_requests + 
            CASE WHEN p_provider = 'claude' THEN p_ai_requests ELSE 0 END,
        claude_tokens = scraping_costs.claude_tokens + 
            CASE WHEN p_provider = 'claude' THEN p_tokens_used ELSE 0 END,
        claude_cost = scraping_costs.claude_cost + 
            CASE WHEN p_provider = 'claude' THEN p_estimated_cost ELSE 0 END,
        error_count = scraping_costs.error_count + 
            CASE WHEN p_success THEN 0 ELSE 1 END,
        details = scraping_costs.details || p_details,
        updated_at = NOW();
    
    -- Update success rate
    SELECT ai_requests, ai_requests - error_count 
    INTO total_requests, successful_requests
    FROM scraping_costs 
    WHERE date = p_date;
    
    IF total_requests > 0 THEN
        current_success_rate := successful_requests::NUMERIC / total_requests::NUMERIC;
        
        UPDATE scraping_costs 
        SET success_rate = current_success_rate
        WHERE date = p_date;
    END IF;
    
    -- Update average response time if provided
    IF p_response_time IS NOT NULL THEN
        UPDATE scraping_costs 
        SET avg_response_time = COALESCE(
            (avg_response_time * (ai_requests - 1) + p_response_time) / ai_requests,
            p_response_time
        )
        WHERE date = p_date;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- UTILITY FUNCTIONS
-- ===================================

-- Get daily cost summary
CREATE OR REPLACE FUNCTION get_daily_cost_summary(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
    date DATE,
    properties_scraped INTEGER,
    total_cost NUMERIC,
    avg_cost_per_property NUMERIC,
    success_rate NUMERIC,
    avg_response_time NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sc.date,
        sc.properties_scraped,
        sc.estimated_cost as total_cost,
        CASE 
            WHEN sc.properties_scraped > 0 THEN sc.estimated_cost / sc.properties_scraped 
            ELSE 0 
        END as avg_cost_per_property,
        sc.success_rate,
        sc.avg_response_time
    FROM scraping_costs sc
    WHERE sc.date >= CURRENT_DATE - INTERVAL '1 day' * p_days
    ORDER BY sc.date DESC;
END;
$$ LANGUAGE plpgsql;

-- Get apartment statistics
CREATE OR REPLACE FUNCTION get_apartment_stats()
RETURNS TABLE (
    total_apartments BIGINT,
    active_apartments BIGINT,
    avg_rent NUMERIC,
    cities_count BIGINT,
    sources_count BIGINT,
    latest_scrape TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_apartments,
        COUNT(*) FILTER (WHERE is_active = true) as active_apartments,
        AVG(rent_price) as avg_rent,
        COUNT(DISTINCT city) as cities_count,
        COUNT(DISTINCT source) as sources_count,
        MAX(scraped_at) as latest_scrape
    FROM apartments;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- ROW LEVEL SECURITY (Optional)
-- ===================================

-- Enable RLS on sensitive tables
-- ALTER TABLE scraping_costs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Example RLS policy (customize as needed)
-- CREATE POLICY "Users can view their own scraping costs" ON scraping_costs
--     FOR SELECT USING (auth.uid()::text = created_by);

-- ===================================
-- INITIAL DATA AND CONFIGURATION
-- ===================================

-- Insert initial configuration if needed
INSERT INTO scraping_costs (date, properties_scraped, ai_requests, tokens_used, estimated_cost)
VALUES (CURRENT_DATE, 0, 0, 0, 0)
ON CONFLICT (date) DO NOTHING;

-- ===================================
-- VIEWS FOR REPORTING
-- ===================================

-- Daily performance view
CREATE OR REPLACE VIEW daily_performance AS
SELECT 
    date,
    properties_scraped,
    estimated_cost,
    CASE 
        WHEN properties_scraped > 0 THEN estimated_cost / properties_scraped 
        ELSE 0 
    END as cost_per_property,
    success_rate,
    avg_response_time,
    error_count
FROM scraping_costs
ORDER BY date DESC;

-- Monthly summary view
CREATE OR REPLACE VIEW monthly_summary AS
SELECT 
    DATE_TRUNC('month', date) as month,
    SUM(properties_scraped) as total_properties,
    SUM(estimated_cost) as total_cost,
    AVG(success_rate) as avg_success_rate,
    AVG(avg_response_time) as avg_response_time,
    SUM(error_count) as total_errors
FROM scraping_costs
GROUP BY DATE_TRUNC('month', date)
ORDER BY month DESC;

-- Active apartments view
CREATE OR REPLACE VIEW active_apartments AS
SELECT 
    id,
    external_id,
    source,
    title,
    address,
    city,
    state,
    rent_price,
    bedrooms,
    bathrooms,
    scraped_at
FROM apartments
WHERE is_active = true
ORDER BY scraped_at DESC;

-- ===================================
-- COMPLETION MESSAGE
-- ===================================

DO $$
BEGIN
    RAISE NOTICE 'Database schema setup completed successfully!';
    RAISE NOTICE 'Tables created: apartments, scraping_costs, scraping_jobs, error_logs';
    RAISE NOTICE 'Functions created: rpc_inc_scraping_costs, get_daily_cost_summary, get_apartment_stats';
    RAISE NOTICE 'Views created: daily_performance, monthly_summary, active_apartments';
    RAISE NOTICE 'Ready for Claude-powered apartment scraping!';
END $$;