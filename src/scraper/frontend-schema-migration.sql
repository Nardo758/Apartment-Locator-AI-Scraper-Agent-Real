-- Frontend Schema Migration
-- Creates the frontend-compatible schema for property data integration

-- ===========================================
-- 1. Create main properties table for frontend
-- ===========================================
CREATE TABLE IF NOT EXISTS properties (
    id BIGSERIAL PRIMARY KEY,
    external_id VARCHAR UNIQUE NOT NULL,
    name VARCHAR NOT NULL,
    address VARCHAR NOT NULL,
    city VARCHAR NOT NULL,
    state VARCHAR(2) NOT NULL,
    zip VARCHAR(10),
    
    -- Geographic data for location-based searches
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Property specifications
    bedrooms INTEGER NOT NULL DEFAULT 0,
    bathrooms DECIMAL(3,1) NOT NULL DEFAULT 1.0,
    sqft INTEGER,
    
    -- Pricing information
    original_price INTEGER NOT NULL,
    ai_price INTEGER,
    effective_price INTEGER,
    market_rent INTEGER,
    rent_estimate_low INTEGER,
    rent_estimate_high INTEGER,
    
    -- Property details (stored as JSON arrays/objects)
    amenities JSONB DEFAULT '[]'::jsonb,
    features JSONB DEFAULT '[]'::jsonb,
    pet_policy VARCHAR,
    parking VARCHAR,
    
    -- Fees and concessions
    application_fee INTEGER,
    admin_fee_amount INTEGER,
    admin_fee_waived BOOLEAN DEFAULT FALSE,
    security_deposit INTEGER,
    free_rent_concessions TEXT,
    
    -- Market intelligence (stored as JSONB for flexibility)
    apartment_iq_data JSONB,
    
    -- Metadata
    listing_url VARCHAR NOT NULL,
    source VARCHAR NOT NULL,
    status VARCHAR DEFAULT 'active',
    first_seen_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ,
    days_on_market INTEGER,
    price_changes INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- 2. Create user profiles table
-- ===========================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR UNIQUE,
    full_name VARCHAR,
    
    -- Search preferences
    preferred_locations JSONB DEFAULT '[]'::jsonb,
    max_budget INTEGER,
    min_bedrooms INTEGER DEFAULT 0,
    max_bedrooms INTEGER,
    min_bathrooms DECIMAL(3,1) DEFAULT 1.0,
    max_bathrooms DECIMAL(3,1),
    preferred_amenities JSONB DEFAULT '[]'::jsonb,
    
    -- Notification settings
    email_notifications BOOLEAN DEFAULT TRUE,
    price_drop_alerts BOOLEAN DEFAULT TRUE,
    new_listing_alerts BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- 3. Create apartment IQ data table
-- ===========================================
CREATE TABLE IF NOT EXISTS apartment_iq_data (
    id BIGSERIAL PRIMARY KEY,
    property_external_id VARCHAR REFERENCES properties(external_id) ON DELETE CASCADE,
    
    -- Market analysis
    market_position VARCHAR CHECK (market_position IN ('below_market', 'at_market', 'above_market')),
    confidence_score DECIMAL(4,3) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    price_trend VARCHAR CHECK (price_trend IN ('increasing', 'stable', 'decreasing')),
    demand_level VARCHAR CHECK (demand_level IN ('low', 'medium', 'high')),
    competitiveness_score INTEGER CHECK (competitiveness_score >= 0 AND competitiveness_score <= 100),
    recommendation TEXT,
    
    -- Market data
    comparable_properties JSONB DEFAULT '[]'::jsonb,
    market_metrics JSONB,
    
    -- Timestamps
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- 4. Create rental offers table
-- ===========================================
CREATE TABLE IF NOT EXISTS rental_offers (
    id BIGSERIAL PRIMARY KEY,
    property_external_id VARCHAR REFERENCES properties(external_id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Offer details
    offered_rent INTEGER NOT NULL,
    move_in_date DATE,
    lease_length_months INTEGER DEFAULT 12,
    additional_terms TEXT,
    
    -- Status tracking
    status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
    landlord_response TEXT,
    response_date TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- 5. Create market intelligence table
-- ===========================================
CREATE TABLE IF NOT EXISTS market_intelligence (
    id BIGSERIAL PRIMARY KEY,
    area_name VARCHAR NOT NULL,
    city VARCHAR NOT NULL,
    state VARCHAR(2) NOT NULL,
    zip_codes JSONB DEFAULT '[]'::jsonb,
    
    -- Market metrics
    median_rent INTEGER,
    avg_rent INTEGER,
    rent_range_low INTEGER,
    rent_range_high INTEGER,
    vacancy_rate DECIMAL(4,3),
    avg_days_on_market INTEGER,
    
    -- Trend data
    month_over_month_change DECIMAL(4,3),
    year_over_year_change DECIMAL(4,3),
    seasonal_trends JSONB,
    
    -- Property type breakdown
    studio_avg_rent INTEGER,
    one_bed_avg_rent INTEGER,
    two_bed_avg_rent INTEGER,
    three_bed_avg_rent INTEGER,
    
    -- Area characteristics
    walkability_score INTEGER,
    transit_score INTEGER,
    bike_score INTEGER,
    nearby_amenities JSONB DEFAULT '[]'::jsonb,
    
    -- Data freshness
    data_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- 6. Create indexes for performance
-- ===========================================

-- Properties table indexes
CREATE INDEX IF NOT EXISTS idx_properties_external_id ON properties(external_id);
CREATE INDEX IF NOT EXISTS idx_properties_location ON properties(city, state);
CREATE INDEX IF NOT EXISTS idx_properties_geo ON properties(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_properties_price_range ON properties(original_price, bedrooms, bathrooms);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_created ON properties(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_properties_updated ON properties(updated_at DESC);

-- Geographic search index (PostGIS-style if available)
-- CREATE INDEX IF NOT EXISTS idx_properties_geo_point ON properties USING GIST (ll_to_earth(latitude, longitude));

-- User profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- Apartment IQ data indexes
CREATE INDEX IF NOT EXISTS idx_apartment_iq_property ON apartment_iq_data(property_external_id);
CREATE INDEX IF NOT EXISTS idx_apartment_iq_updated ON apartment_iq_data(last_updated DESC);

-- Rental offers indexes
CREATE INDEX IF NOT EXISTS idx_rental_offers_property ON rental_offers(property_external_id);
CREATE INDEX IF NOT EXISTS idx_rental_offers_user ON rental_offers(user_id);
CREATE INDEX IF NOT EXISTS idx_rental_offers_status ON rental_offers(status);

-- Market intelligence indexes
CREATE INDEX IF NOT EXISTS idx_market_intelligence_location ON market_intelligence(city, state);
CREATE INDEX IF NOT EXISTS idx_market_intelligence_date ON market_intelligence(data_date DESC);

-- ===========================================
-- 7. Create geographic search function
-- ===========================================
CREATE OR REPLACE FUNCTION search_properties_near_location(
    search_lat DECIMAL(10,8),
    search_lng DECIMAL(11,8),
    radius_miles INTEGER DEFAULT 10,
    min_bedrooms INTEGER DEFAULT 0,
    max_bedrooms INTEGER DEFAULT 10,
    min_price INTEGER DEFAULT 0,
    max_price INTEGER DEFAULT 50000
)
RETURNS TABLE(
    external_id VARCHAR,
    name VARCHAR,
    address VARCHAR,
    city VARCHAR,
    state VARCHAR,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    bedrooms INTEGER,
    bathrooms DECIMAL(3,1),
    original_price INTEGER,
    ai_price INTEGER,
    effective_price INTEGER,
    distance_miles DECIMAL(6,2),
    amenities JSONB,
    apartment_iq_data JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.external_id,
        p.name,
        p.address,
        p.city,
        p.state,
        p.latitude,
        p.longitude,
        p.bedrooms,
        p.bathrooms,
        p.original_price,
        p.ai_price,
        p.effective_price,
        -- Calculate distance using Haversine formula (approximate)
        ROUND(
            (3959 * ACOS(
                COS(RADIANS(search_lat)) * 
                COS(RADIANS(p.latitude)) * 
                COS(RADIANS(p.longitude) - RADIANS(search_lng)) + 
                SIN(RADIANS(search_lat)) * 
                SIN(RADIANS(p.latitude))
            ))::DECIMAL, 2
        ) as distance_miles,
        p.amenities,
        p.apartment_iq_data
    FROM properties p
    WHERE p.status = 'active'
        AND p.latitude IS NOT NULL 
        AND p.longitude IS NOT NULL
        AND p.bedrooms >= min_bedrooms 
        AND p.bedrooms <= max_bedrooms
        AND p.original_price >= min_price 
        AND p.original_price <= max_price
        -- Distance filter (approximate)
        AND (
            3959 * ACOS(
                COS(RADIANS(search_lat)) * 
                COS(RADIANS(p.latitude)) * 
                COS(RADIANS(p.longitude) - RADIANS(search_lng)) + 
                SIN(RADIANS(search_lat)) * 
                SIN(RADIANS(p.latitude))
            )
        ) <= radius_miles
    ORDER BY distance_miles ASC, p.original_price ASC;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- 8. Create data transformation helper functions
-- ===========================================

-- Function to calculate AI price suggestions
CREATE OR REPLACE FUNCTION calculate_ai_price_estimate(
    base_price INTEGER,
    bedrooms INTEGER,
    bathrooms DECIMAL(3,1),
    sqft INTEGER,
    amenities JSONB,
    market_rent INTEGER DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    adjusted_price DECIMAL;
    luxury_amenities TEXT[] := ARRAY['pool', 'gym', 'concierge', 'doorman', 'rooftop'];
    luxury_count INTEGER;
BEGIN
    adjusted_price := base_price;
    
    -- Market rent adjustment (30% weight)
    IF market_rent IS NOT NULL AND market_rent > 0 THEN
        adjusted_price := adjusted_price + ((market_rent - base_price) * 0.3);
    END IF;
    
    -- Size premium
    IF sqft IS NOT NULL AND sqft > 1000 THEN
        adjusted_price := adjusted_price * 1.05;
    END IF;
    
    -- Luxury amenities premium
    SELECT COUNT(*) INTO luxury_count
    FROM unnest(luxury_amenities) AS luxury_amenity
    WHERE amenities::text ILIKE '%' || luxury_amenity || '%';
    
    IF luxury_count > 0 THEN
        adjusted_price := adjusted_price * (1 + (luxury_count * 0.02));
    END IF;
    
    RETURN ROUND(adjusted_price);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate effective price with concessions
CREATE OR REPLACE FUNCTION calculate_effective_price(
    base_price INTEGER,
    concessions TEXT,
    application_fee INTEGER DEFAULT NULL,
    admin_fee INTEGER DEFAULT NULL,
    admin_fee_waived BOOLEAN DEFAULT FALSE
)
RETURNS INTEGER AS $$
DECLARE
    effective_price DECIMAL;
    concession_value INTEGER := 0;
    monthly_fees DECIMAL := 0;
BEGIN
    effective_price := base_price;
    
    -- Parse concession value
    IF concessions IS NOT NULL THEN
        -- Look for "X months free" pattern
        IF concessions ILIKE '%1 month%free%' THEN
            concession_value := base_price * 0.08; -- Amortized over 12 months
        ELSIF concessions ILIKE '%2 month%free%' THEN
            concession_value := base_price * 0.16;
        END IF;
        
        effective_price := effective_price - concession_value;
    END IF;
    
    -- Add monthly equivalent of fees
    IF application_fee IS NOT NULL AND NOT admin_fee_waived THEN
        monthly_fees := monthly_fees + (application_fee / 12.0);
    END IF;
    
    IF admin_fee IS NOT NULL AND NOT admin_fee_waived THEN
        monthly_fees := monthly_fees + (admin_fee / 12.0);
    END IF;
    
    effective_price := effective_price + monthly_fees;
    
    RETURN GREATEST(ROUND(effective_price), 0);
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- 9. Create triggers for automatic updates
-- ===========================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers to all tables
CREATE TRIGGER update_properties_updated_at
    BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rental_offers_updated_at
    BEFORE UPDATE ON rental_offers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_market_intelligence_updated_at
    BEFORE UPDATE ON market_intelligence
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- 10. Create RLS policies (if needed)
-- ===========================================

-- Enable RLS on user-specific tables
-- ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE rental_offers ENABLE ROW LEVEL SECURITY;

-- Create policies for user data access
-- CREATE POLICY "Users can view own profile" ON user_profiles
--     FOR SELECT USING (auth.uid() = user_id);

-- CREATE POLICY "Users can update own profile" ON user_profiles
--     FOR UPDATE USING (auth.uid() = user_id);

-- CREATE POLICY "Users can view own offers" ON rental_offers
--     FOR SELECT USING (auth.uid() = user_id);

-- ===========================================
-- 11. Insert sample data for testing (optional)
-- ===========================================

-- Sample market intelligence data
INSERT INTO market_intelligence (
    area_name, city, state, zip_codes,
    median_rent, avg_rent, rent_range_low, rent_range_high,
    vacancy_rate, avg_days_on_market,
    month_over_month_change, year_over_year_change,
    studio_avg_rent, one_bed_avg_rent, two_bed_avg_rent, three_bed_avg_rent,
    walkability_score, transit_score, bike_score,
    data_date
) VALUES 
(
    'Downtown', 'Austin', 'TX', '["78701", "78702", "78703"]'::jsonb,
    2800, 2850, 1800, 4500,
    0.045, 28,
    0.025, 0.12,
    2200, 2600, 3200, 4100,
    95, 85, 75,
    CURRENT_DATE
),
(
    'South Bay', 'San Francisco', 'CA', '["94105", "94107", "94158"]'::jsonb,
    4200, 4350, 2800, 7500,
    0.038, 21,
    0.015, 0.08,
    3200, 4000, 5200, 6800,
    88, 92, 82,
    CURRENT_DATE
) ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;