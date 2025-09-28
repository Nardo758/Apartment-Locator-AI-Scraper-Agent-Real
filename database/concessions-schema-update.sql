-- Enhanced schema for concessions and property website data

-- Update property_intelligence table to support concessions
ALTER TABLE property_intelligence 
ADD COLUMN IF NOT EXISTS concessions TEXT[],
ADD COLUMN IF NOT EXISTS free_rent_offers TEXT[],
ADD COLUMN IF NOT EXISTS base_rent_by_unit JSONB,
ADD COLUMN IF NOT EXISTS fees JSONB,
ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'property_website',
ADD COLUMN IF NOT EXISTS concession_expiry DATE,
ADD COLUMN IF NOT EXISTS special_offers JSONB;

-- Enhanced apartments table with concession support
ALTER TABLE apartments 
ADD COLUMN IF NOT EXISTS concessions_applied BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS concession_details TEXT,
ADD COLUMN IF NOT EXISTS effective_rent DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS net_effective_rent DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS base_rent DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS intelligence_confidence DECIMAL(3,2);

-- Create concession_analytics table for market tracking
CREATE TABLE IF NOT EXISTS concession_analytics (
    id SERIAL PRIMARY KEY,
    market_name TEXT NOT NULL,
    analysis_date DATE NOT NULL,
    total_properties INTEGER NOT NULL DEFAULT 0,
    properties_with_concessions INTEGER NOT NULL DEFAULT 0,
    concession_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    free_rent_offers INTEGER NOT NULL DEFAULT 0,
    waived_fees INTEGER NOT NULL DEFAULT 0,
    reduced_deposits INTEGER NOT NULL DEFAULT 0,
    average_discount DECIMAL(5,2) NOT NULL DEFAULT 0,
    total_discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    market_analysis JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(market_name, analysis_date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_apartments_concessions_applied 
ON apartments(concessions_applied) WHERE concessions_applied = true;

CREATE INDEX IF NOT EXISTS idx_apartments_effective_rent 
ON apartments(effective_rent) WHERE effective_rent IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_property_intelligence_concessions 
ON property_intelligence USING GIN(concessions) WHERE concessions IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_concession_analytics_market_date 
ON concession_analytics(market_name, analysis_date);

-- Add comments for documentation
COMMENT ON COLUMN apartments.concessions_applied IS 'Whether this property has active concessions';
COMMENT ON COLUMN apartments.concession_details IS 'Text description of concession offers';
COMMENT ON COLUMN apartments.effective_rent IS 'Rent after applying concessions';
COMMENT ON COLUMN apartments.net_effective_rent IS 'Net effective rent over lease term';
COMMENT ON COLUMN apartments.base_rent IS 'Base rent before concessions';
COMMENT ON COLUMN apartments.intelligence_confidence IS 'AI confidence score for extracted data';

COMMENT ON TABLE concession_analytics IS 'Market-wide concession tracking and analytics';
COMMENT ON COLUMN concession_analytics.concession_rate IS 'Percentage of properties offering concessions';
COMMENT ON COLUMN concession_analytics.average_discount IS 'Average discount percentage across properties';

-- Create function to update property concession status
CREATE OR REPLACE FUNCTION update_concession_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Automatically set concessions_applied if concession_details is not empty
    IF NEW.concession_details IS NOT NULL AND NEW.concession_details != '' THEN
        NEW.concessions_applied = true;
    END IF;
    
    -- Calculate effective rent if base_rent is available
    IF NEW.base_rent IS NOT NULL AND NEW.effective_rent IS NULL THEN
        NEW.effective_rent = NEW.base_rent; -- Default to base rent if no calculation
    END IF;
    
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic concession status updates
DROP TRIGGER IF EXISTS trigger_update_concession_status ON apartments;
CREATE TRIGGER trigger_update_concession_status
    BEFORE INSERT OR UPDATE ON apartments
    FOR EACH ROW
    EXECUTE FUNCTION update_concession_status();

-- Create view for concession analytics
CREATE OR REPLACE VIEW concession_summary AS
SELECT 
    COUNT(*) as total_properties,
    COUNT(*) FILTER (WHERE concessions_applied = true) as properties_with_concessions,
    ROUND(
        (COUNT(*) FILTER (WHERE concessions_applied = true)::DECIMAL / COUNT(*)) * 100, 
        2
    ) as concession_rate,
    AVG(effective_rent) FILTER (WHERE effective_rent IS NOT NULL) as avg_effective_rent,
    AVG(base_rent) FILTER (WHERE base_rent IS NOT NULL) as avg_base_rent,
    AVG(
        CASE 
            WHEN base_rent > 0 AND effective_rent IS NOT NULL 
            THEN ((base_rent - effective_rent) / base_rent) * 100 
        END
    ) as avg_discount_percentage,
    COUNT(*) FILTER (WHERE concession_details ILIKE '%free%') as free_rent_count,
    COUNT(*) FILTER (WHERE concession_details ILIKE '%waived%') as waived_fees_count,
    COUNT(*) FILTER (WHERE concession_details ILIKE '%deposit%') as deposit_offers_count
FROM apartments 
WHERE is_active = true;

-- Create function to calculate market concession metrics
CREATE OR REPLACE FUNCTION calculate_concession_metrics(market_filter TEXT DEFAULT NULL)
RETURNS TABLE(
    metric_name TEXT,
    metric_value DECIMAL,
    metric_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'concession_rate'::TEXT,
        ROUND((COUNT(*) FILTER (WHERE concessions_applied = true)::DECIMAL / COUNT(*)) * 100, 2),
        COUNT(*) FILTER (WHERE concessions_applied = true)
    FROM apartments 
    WHERE is_active = true 
    AND (market_filter IS NULL OR city ILIKE market_filter)
    
    UNION ALL
    
    SELECT 
        'average_discount'::TEXT,
        ROUND(AVG(
            CASE 
                WHEN base_rent > 0 AND effective_rent IS NOT NULL 
                THEN ((base_rent - effective_rent) / base_rent) * 100 
            END
        ), 2),
        COUNT(*) FILTER (WHERE base_rent > 0 AND effective_rent IS NOT NULL)
    FROM apartments 
    WHERE is_active = true 
    AND concessions_applied = true
    AND (market_filter IS NULL OR city ILIKE market_filter);
END;
$$ LANGUAGE plpgsql;

-- Insert initial data for testing
INSERT INTO concession_analytics (
    market_name, 
    analysis_date, 
    total_properties, 
    properties_with_concessions,
    concession_rate,
    market_analysis
) VALUES (
    'atlanta',
    CURRENT_DATE,
    0,
    0,
    0.0,
    '{"status": "initialized", "note": "Initial setup - data will be populated by scraper"}'::jsonb
) ON CONFLICT (market_name, analysis_date) DO NOTHING;