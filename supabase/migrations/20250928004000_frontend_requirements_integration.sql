-- Frontend Requirements Integration Migration
-- Migration: 20250928004000_frontend_requirements_integration.sql
-- This migration creates frontend-compatible tables while preserving existing scraper functionality

BEGIN;

-- ============================================================================
-- 1. CREATE FRONTEND-COMPATIBLE PROPERTIES TABLE
-- ============================================================================

-- Create the main properties table that the frontend expects
CREATE TABLE IF NOT EXISTS public.properties (
    -- Basic Identifiers
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT UNIQUE, -- Maps to scraped_properties.external_id
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip TEXT,
    
    -- Geographic Data (required for frontend map functionality)
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Physical Specifications
    bedrooms INTEGER NOT NULL,
    bathrooms DECIMAL(3, 1) NOT NULL,
    sqft INTEGER NOT NULL DEFAULT 0,
    year_built INTEGER,
    property_type TEXT DEFAULT 'apartment',
    
    -- Pricing Intelligence (core frontend requirement)
    original_price INTEGER NOT NULL, -- Maps to scraped_properties.current_price
    ai_price INTEGER NOT NULL,       -- AI-enhanced price
    effective_price INTEGER NOT NULL, -- Price after concessions
    rent_per_sqft DECIMAL(10, 2),
    savings INTEGER DEFAULT 0,       -- Calculated savings from AI pricing
    
    -- Market Intelligence (ApartmentIQ features)
    match_score INTEGER CHECK (match_score >= 0 AND match_score <= 100),
    success_rate DECIMAL(5, 2) CHECK (success_rate >= 0 AND success_rate <= 100),
    days_vacant INTEGER DEFAULT 0,
    market_velocity TEXT CHECK (market_velocity IN ('hot', 'normal', 'slow', 'stale')) DEFAULT 'normal',
    
    -- Availability
    availability TEXT,
    availability_type TEXT CHECK (availability_type IN ('immediate', 'soon', 'waitlist')) DEFAULT 'immediate',
    
    -- Features & Amenities
    features TEXT[] DEFAULT '{}',
    amenities TEXT[] DEFAULT '{}',
    pet_policy TEXT,
    parking TEXT,
    
    -- Enhanced Pricing Data (ApartmentIQ)
    apartment_iq_data JSONB DEFAULT '{}',
    
    -- Relationships to existing system
    property_source_id BIGINT REFERENCES public.property_sources(id),
    scraped_property_id BIGINT, -- Reference to scraped_properties
    
    -- Status & Timestamps
    is_active BOOLEAN DEFAULT TRUE,
    source_url TEXT,
    images TEXT[] DEFAULT '{}',
    last_scraped TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on properties table
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Create policies for properties
CREATE POLICY "Service role full access" ON public.properties
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users read access" ON public.properties
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Anonymous users read active properties" ON public.properties
    FOR SELECT USING (is_active = true);

-- Create performance indexes
CREATE INDEX idx_properties_location ON public.properties(city, state);
CREATE INDEX idx_properties_coordinates ON public.properties(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX idx_properties_price_range ON public.properties(original_price, effective_price);
CREATE INDEX idx_properties_bedrooms ON public.properties(bedrooms);
CREATE INDEX idx_properties_market_velocity ON public.properties(market_velocity);
CREATE INDEX idx_properties_availability ON public.properties(availability_type);
CREATE INDEX idx_properties_active ON public.properties(is_active) WHERE is_active = true;
CREATE INDEX idx_properties_external_id ON public.properties(external_id);
CREATE INDEX idx_properties_match_score ON public.properties(match_score DESC) WHERE match_score IS NOT NULL;

-- ============================================================================
-- 2. CREATE USER PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
    -- Identity & Authentication
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    has_completed_social_signup BOOLEAN DEFAULT FALSE,
    has_completed_ai_programming BOOLEAN DEFAULT FALSE,
    
    -- Basic Preferences
    location TEXT,
    bedrooms TEXT,
    budget INTEGER,
    max_budget INTEGER,
    current_rent INTEGER,
    
    -- Work & Commute
    work_address TEXT,
    max_commute INTEGER DEFAULT 30,
    max_drive_time INTEGER,
    transportation TEXT,
    work_frequency TEXT,
    work_schedule TEXT,
    employment_type TEXT,
    
    -- Lifestyle & Preferences
    household_size TEXT,
    lifestyle TEXT,
    pet_info TEXT,
    preferred_amenities TEXT[] DEFAULT '{}',
    deal_breakers TEXT[] DEFAULT '{}',
    priorities TEXT[] DEFAULT '{}',
    
    -- Location Intelligence
    other_locations JSONB DEFAULT '[]',
    points_of_interest JSONB DEFAULT '[]',
    search_radius INTEGER DEFAULT 25,
    
    -- AI & Search
    ai_preferences JSONB DEFAULT '{}',
    search_criteria JSONB DEFAULT '{}',
    
    -- Financial
    gross_income INTEGER,
    credit_score TEXT,
    income_verified BOOLEAN DEFAULT FALSE,
    
    -- Negotiation
    negotiation_comfort TEXT,
    rental_history TEXT,
    
    -- Timeline
    move_timeline TEXT,
    lease_duration TEXT,
    lease_expiration DATE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on user profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for user profiles
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access" ON public.user_profiles
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- 3. CREATE ENHANCED APARTMENTIQ DATA TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.apartment_iq_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    
    -- Enhanced pricing
    current_rent INTEGER,
    original_rent INTEGER,
    effective_rent INTEGER,
    concession_value INTEGER DEFAULT 0,
    concession_type TEXT,
    concession_urgency TEXT CHECK (concession_urgency IN ('none', 'standard', 'aggressive', 'desperate')) DEFAULT 'none',
    
    -- Market timing
    days_on_market INTEGER DEFAULT 0,
    first_seen TIMESTAMPTZ,
    market_velocity TEXT CHECK (market_velocity IN ('hot', 'normal', 'slow', 'stale')) DEFAULT 'normal',
    
    -- Competitive analysis
    market_position TEXT CHECK (market_position IN ('below_market', 'at_market', 'above_market')) DEFAULT 'at_market',
    percentile_rank INTEGER CHECK (percentile_rank >= 1 AND percentile_rank <= 100),
    
    -- Quality scores
    amenity_score INTEGER CHECK (amenity_score >= 1 AND amenity_score <= 100),
    location_score INTEGER CHECK (location_score >= 1 AND location_score <= 100),
    management_score INTEGER CHECK (management_score >= 1 AND management_score <= 100),
    
    -- Risk assessment
    lease_probability DECIMAL(3, 2) CHECK (lease_probability >= 0 AND lease_probability <= 1),
    negotiation_potential INTEGER CHECK (negotiation_potential >= 1 AND negotiation_potential <= 10),
    urgency_score INTEGER CHECK (urgency_score >= 1 AND urgency_score <= 10),
    
    -- Trends
    rent_trend TEXT CHECK (rent_trend IN ('increasing', 'stable', 'decreasing')) DEFAULT 'stable',
    rent_change_percent DECIMAL(5, 2),
    concession_trend TEXT CHECK (concession_trend IN ('none', 'increasing', 'decreasing')) DEFAULT 'none',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.apartment_iq_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.apartment_iq_data
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users read access" ON public.apartment_iq_data
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX idx_apartment_iq_property ON public.apartment_iq_data(property_id);
CREATE INDEX idx_apartment_iq_market ON public.apartment_iq_data(market_velocity, percentile_rank);
CREATE INDEX idx_apartment_iq_urgency ON public.apartment_iq_data(urgency_score DESC);

-- ============================================================================
-- 4. CREATE RENTAL OFFERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rental_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    
    -- Offer details
    offer_amount INTEGER NOT NULL,
    proposed_move_in_date DATE,
    lease_duration INTEGER, -- in months
    special_requests TEXT,
    
    -- Status tracking
    status TEXT CHECK (status IN ('draft', 'submitted', 'under_review', 'accepted', 'rejected', 'countered')) DEFAULT 'draft',
    
    -- AI-generated insights
    success_probability DECIMAL(3, 2),
    negotiation_strategy JSONB DEFAULT '{}',
    expected_savings INTEGER,
    
    -- Response tracking
    landlord_response TEXT,
    counter_offer_amount INTEGER,
    final_agreement_amount INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.rental_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own offers" ON public.rental_offers
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role full access" ON public.rental_offers
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- 5. CREATE MARKET INTELLIGENCE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.market_intelligence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location TEXT NOT NULL, -- City, state format
    location_type TEXT CHECK (location_type IN ('neighborhood', 'city', 'metro')) DEFAULT 'city',
    
    -- Market metrics
    average_rent INTEGER,
    rent_per_sqft DECIMAL(10, 2),
    vacancy_rate DECIMAL(5, 2),
    days_on_market_avg INTEGER,
    concession_prevalence DECIMAL(5, 2),
    
    -- Trends
    rent_trend TEXT CHECK (rent_trend IN ('increasing', 'stable', 'decreasing')) DEFAULT 'stable',
    rent_change_ytd DECIMAL(5, 2),
    market_velocity TEXT CHECK (market_velocity IN ('hot', 'normal', 'slow', 'stale')) DEFAULT 'normal',
    
    -- Supply & demand
    new_listings_weekly INTEGER,
    price_reductions_weekly INTEGER,
    leasing_velocity INTEGER,
    
    -- Intelligence data
    insights JSONB DEFAULT '{}',
    recommendations JSONB DEFAULT '{}',
    
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.market_intelligence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.market_intelligence
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users read access" ON public.market_intelligence
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX idx_market_intelligence_location ON public.market_intelligence(location);
CREATE INDEX idx_market_intelligence_timeliness ON public.market_intelligence(calculated_at, valid_until);

-- ============================================================================
-- 6. CREATE UTILITY FUNCTIONS
-- ============================================================================

-- Update triggers for updated_at columns
CREATE TRIGGER update_properties_updated_at 
    BEFORE UPDATE ON public.properties 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON public.user_profiles 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_apartment_iq_data_updated_at 
    BEFORE UPDATE ON public.apartment_iq_data 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rental_offers_updated_at 
    BEFORE UPDATE ON public.rental_offers 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 7. CREATE GEOGRAPHIC SEARCH FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.search_properties_near_location(
    lat DECIMAL,
    lng DECIMAL,
    radius_km INTEGER DEFAULT 10,
    min_bedrooms INTEGER DEFAULT NULL,
    max_bedrooms INTEGER DEFAULT NULL,
    min_price INTEGER DEFAULT NULL,
    max_price INTEGER DEFAULT NULL,
    user_id_param UUID DEFAULT NULL
)
RETURNS TABLE(
    id UUID,
    name TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    bedrooms INTEGER,
    bathrooms DECIMAL,
    sqft INTEGER,
    original_price INTEGER,
    ai_price INTEGER,
    effective_price INTEGER,
    distance_km DECIMAL,
    match_score INTEGER,
    market_velocity TEXT,
    availability_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.address,
        p.city,
        p.state,
        p.bedrooms,
        p.bathrooms,
        p.sqft,
        p.original_price,
        p.ai_price,
        p.effective_price,
        (6371 * acos(
            cos(radians(lat)) * cos(radians(p.latitude)) * 
            cos(radians(p.longitude) - radians(lng)) + 
            sin(radians(lat)) * sin(radians(p.latitude))
        ))::DECIMAL as distance_km,
        p.match_score,
        p.market_velocity,
        p.availability_type
    FROM public.properties p
    WHERE p.is_active = true
        AND p.latitude IS NOT NULL 
        AND p.longitude IS NOT NULL
        AND (min_bedrooms IS NULL OR p.bedrooms >= min_bedrooms)
        AND (max_bedrooms IS NULL OR p.bedrooms <= max_bedrooms)
        AND (min_price IS NULL OR p.effective_price >= min_price)
        AND (max_price IS NULL OR p.effective_price <= max_price)
        AND (6371 * acos(
            cos(radians(lat)) * cos(radians(p.latitude)) * 
            cos(radians(p.longitude) - radians(lng)) + 
            sin(radians(lat)) * sin(radians(p.latitude))
        )) <= radius_km
    ORDER BY 
        CASE WHEN user_id_param IS NOT NULL THEN p.match_score END DESC NULLS LAST,
        distance_km ASC;
END;
$$;

-- ============================================================================
-- 8. CREATE MATCH SCORE CALCULATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_property_match_score(
    property_id_param UUID,
    user_id_param UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    user_prefs RECORD;
    property_data RECORD;
    score INTEGER := 50; -- Base score
    budget_score INTEGER := 0;
    location_score INTEGER := 0;
    amenity_score INTEGER := 0;
BEGIN
    -- Get user preferences
    SELECT * INTO user_prefs 
    FROM public.user_profiles 
    WHERE user_profiles.user_id = user_id_param;
    
    -- Get property data
    SELECT * INTO property_data
    FROM public.properties p
    WHERE p.id = property_id_param;
    
    -- If no user preferences, return base score
    IF user_prefs IS NULL OR property_data IS NULL THEN
        RETURN score;
    END IF;
    
    -- Budget matching (30% weight)
    IF user_prefs.max_budget IS NOT NULL THEN
        IF property_data.effective_price <= user_prefs.max_budget THEN
            budget_score := 30;
        ELSIF property_data.effective_price <= user_prefs.max_budget * 1.1 THEN
            budget_score := 20;
        ELSIF property_data.effective_price <= user_prefs.max_budget * 1.2 THEN
            budget_score := 10;
        END IF;
    END IF;
    
    -- Bedroom matching (20% weight)
    IF user_prefs.bedrooms IS NOT NULL THEN
        IF property_data.bedrooms = user_prefs.bedrooms::INTEGER THEN
            score := score + 20;
        ELSIF ABS(property_data.bedrooms - user_prefs.bedrooms::INTEGER) = 1 THEN
            score := score + 10;
        END IF;
    END IF;
    
    -- Amenity matching (20% weight)
    IF user_prefs.preferred_amenities IS NOT NULL AND array_length(user_prefs.preferred_amenities, 1) > 0 THEN
        amenity_score := (
            SELECT COUNT(*) * 5
            FROM unnest(user_prefs.preferred_amenities) AS pref_amenity
            WHERE pref_amenity = ANY(property_data.amenities)
        );
        amenity_score := LEAST(amenity_score, 20);
    END IF;
    
    -- Calculate final score
    score := score + budget_score + amenity_score;
    
    -- Ensure score is within bounds
    RETURN LEAST(GREATEST(score, 0), 100);
END;
$$;

-- ============================================================================
-- 9. CREATE DATA TRANSFORMATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.transform_scraped_to_properties()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    scraped_row RECORD;
    property_row RECORD;
    transformed_count INTEGER := 0;
    ai_price_calculated INTEGER;
    effective_price_calculated INTEGER;
BEGIN
    -- Transform scraped_properties to properties table
    FOR scraped_row IN 
        SELECT * FROM public.scraped_properties 
        WHERE updated_at > NOW() - INTERVAL '1 hour' -- Only recent updates
        OR id NOT IN (SELECT scraped_property_id FROM public.properties WHERE scraped_property_id IS NOT NULL)
    LOOP
        -- Calculate AI price (placeholder logic - replace with your AI logic)
        ai_price_calculated := scraped_row.current_price;
        
        -- Calculate effective price (accounting for concessions)
        effective_price_calculated := scraped_row.current_price;
        IF scraped_row.free_rent_concessions IS NOT NULL THEN
            effective_price_calculated := scraped_row.current_price * 0.95; -- 5% discount for concessions
        END IF;
        
        -- Check if property already exists
        SELECT * INTO property_row 
        FROM public.properties 
        WHERE external_id = scraped_row.external_id;
        
        IF property_row IS NULL THEN
            -- Insert new property
            INSERT INTO public.properties (
                external_id,
                name,
                address,
                city,
                state,
                zip,
                bedrooms,
                bathrooms,
                sqft,
                original_price,
                ai_price,
                effective_price,
                rent_per_sqft,
                availability,
                availability_type,
                property_source_id,
                scraped_property_id,
                source_url,
                last_scraped,
                created_at,
                updated_at
            ) VALUES (
                scraped_row.external_id,
                scraped_row.name,
                scraped_row.address,
                scraped_row.city,
                scraped_row.state,
                NULL, -- zip not in scraped_properties
                scraped_row.bedrooms,
                scraped_row.bathrooms,
                COALESCE(scraped_row.square_feet, 0),
                scraped_row.current_price,
                ai_price_calculated,
                effective_price_calculated,
                CASE 
                    WHEN scraped_row.square_feet > 0 THEN effective_price_calculated::DECIMAL / scraped_row.square_feet
                    ELSE NULL 
                END,
                scraped_row.status,
                CASE 
                    WHEN scraped_row.status = 'active' THEN 'immediate'
                    ELSE 'soon'
                END,
                scraped_row.property_source_id,
                scraped_row.id,
                scraped_row.listing_url,
                scraped_row.scraped_at,
                scraped_row.created_at,
                scraped_row.updated_at
            );
            
            transformed_count := transformed_count + 1;
        ELSE
            -- Update existing property
            UPDATE public.properties SET
                name = scraped_row.name,
                address = scraped_row.address,
                city = scraped_row.city,
                state = scraped_row.state,
                bedrooms = scraped_row.bedrooms,
                bathrooms = scraped_row.bathrooms,
                sqft = COALESCE(scraped_row.square_feet, 0),
                original_price = scraped_row.current_price,
                ai_price = ai_price_calculated,
                effective_price = effective_price_calculated,
                rent_per_sqft = CASE 
                    WHEN scraped_row.square_feet > 0 THEN effective_price_calculated::DECIMAL / scraped_row.square_feet
                    ELSE rent_per_sqft 
                END,
                availability = scraped_row.status,
                availability_type = CASE 
                    WHEN scraped_row.status = 'active' THEN 'immediate'
                    ELSE availability_type
                END,
                last_scraped = scraped_row.scraped_at,
                updated_at = NOW()
            WHERE external_id = scraped_row.external_id;
        END IF;
    END LOOP;
    
    RETURN transformed_count;
END;
$$;

-- ============================================================================
-- 10. GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions to service role
GRANT ALL ON public.properties TO service_role;
GRANT ALL ON public.user_profiles TO service_role;
GRANT ALL ON public.apartment_iq_data TO service_role;
GRANT ALL ON public.rental_offers TO service_role;
GRANT ALL ON public.market_intelligence TO service_role;

-- Grant read permissions to authenticated users
GRANT SELECT ON public.properties TO authenticated;
GRANT SELECT ON public.apartment_iq_data TO authenticated;
GRANT SELECT ON public.market_intelligence TO authenticated;

-- Grant anonymous read access to properties only
GRANT SELECT ON public.properties TO anon;

-- Grant function execution permissions
GRANT EXECUTE ON FUNCTION public.search_properties_near_location(DECIMAL, DECIMAL, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_properties_near_location(DECIMAL, DECIMAL, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.calculate_property_match_score(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transform_scraped_to_properties() TO service_role;

-- ============================================================================
-- 11. INITIAL DATA TRANSFORMATION
-- ============================================================================

-- Transform existing scraped_properties data
SELECT public.transform_scraped_to_properties();

-- Add comments for documentation
COMMENT ON TABLE public.properties IS 'Frontend-compatible properties table with enhanced pricing and market intelligence';
COMMENT ON TABLE public.user_profiles IS 'User preferences and profile data for personalized property matching';
COMMENT ON TABLE public.apartment_iq_data IS 'Enhanced market intelligence and pricing analysis for properties';
COMMENT ON TABLE public.rental_offers IS 'User-generated rental offers and negotiation tracking';
COMMENT ON TABLE public.market_intelligence IS 'Market-wide intelligence and trends data';

COMMENT ON FUNCTION public.search_properties_near_location IS 'Geographic search with filtering and user-specific matching';
COMMENT ON FUNCTION public.calculate_property_match_score IS 'Calculate personalized match score for user-property pairs';
COMMENT ON FUNCTION public.transform_scraped_to_properties IS 'Transform scraped data to frontend-compatible format';

COMMIT;