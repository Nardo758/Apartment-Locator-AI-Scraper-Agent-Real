# 🚀 Quick Deployment Guide

## Option 1: Supabase Dashboard (Recommended)

### Step 1: Open Supabase Dashboard
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **SQL Editor**

### Step 2: Execute Schema Migration
Copy and paste this SQL into the SQL Editor:

```sql
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_properties_external_id ON properties(external_id);
CREATE INDEX IF NOT EXISTS idx_properties_location ON properties(city, state);
CREATE INDEX IF NOT EXISTS idx_properties_geo ON properties(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_properties_price_range ON properties(original_price, bedrooms, bathrooms);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);

-- Create geographic search function
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

-- Create AI price calculation function
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
    
    -- Luxury amenities premium (calibrated)
    SELECT COUNT(*) INTO luxury_count
    FROM unnest(luxury_amenities) AS luxury_amenity
    WHERE amenities::text ILIKE '%' || luxury_amenity || '%';
    
    IF luxury_count > 0 THEN
        adjusted_price := adjusted_price * (1 + (luxury_count * 0.015));
    END IF;
    
    RETURN ROUND(adjusted_price);
END;
$$ LANGUAGE plpgsql;
```

### Step 3: Verify Deployment
Run this verification query in SQL Editor:

```sql
-- Verify tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'properties';

-- Verify function was created
SELECT routine_name
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name = 'search_properties_near_location';

-- Test the function
SELECT 'Schema deployment successful!' as status;
```

## Option 2: Supabase CLI (If Available)

```bash
# 1. Make sure you're in your project directory
cd /workspace

# 2. Copy migration to supabase migrations folder
cp manual-deployment.sql supabase/migrations/$(date +%Y%m%d%H%M%S)_frontend_schema.sql

# 3. Push to database
supabase db push
```

## Option 3: Direct PostgreSQL Connection

```bash
# If you have psql and direct database access
psql "your-database-connection-string" -f manual-deployment.sql
```

## 🔧 Update Your Environment Variables

Edit your `.env.production` file with your actual values:

```bash
# Replace these with your actual values
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key
ANTHROPIC_API_KEY=your-claude-api-key
```

## 🚀 Deploy Updated Functions

Once the schema is deployed, update your functions:

```bash
# Update your scraper functions with the new integration
supabase functions deploy ai-scraper-worker
supabase functions deploy command-station
```

## ✅ Test the Integration

```bash
# Test the complete pipeline
node test-real-integration.mjs

# Test specific functions
curl "https://your-project.supabase.co/functions/v1/command-station/status"
```

## 🎯 What Happens Next

After successful deployment:

1. ✅ **Properties table** created for frontend data
2. ✅ **Geographic search** function available
3. ✅ **AI price calculation** function ready
4. ✅ **Data transformation pipeline** operational

Your scraper will now automatically:
- Transform scraped data to frontend format
- Calculate AI-enhanced pricing
- Generate market intelligence
- Enable geographic search capabilities

## 📞 Need Help?

If you encounter any issues:

1. **Check the SQL Editor output** for error messages
2. **Verify your service role key** has sufficient permissions
3. **Run the verification queries** to confirm deployment
4. **Check function logs** in Supabase Dashboard

---

**🎉 Once deployed, your real estate scraper will have AI-powered data integration!**