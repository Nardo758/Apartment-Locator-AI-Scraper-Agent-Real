-- 20250923130000_recreate_scraped_properties.sql
-- Drop and recreate scraped_properties with enhanced schema

DROP TABLE IF EXISTS scraped_properties CASCADE;

CREATE TABLE scraped_properties (
    id BIGSERIAL PRIMARY KEY,
    
    -- Composite unique ID: property_id + unit_number
    property_id VARCHAR NOT NULL,
    unit_number VARCHAR NOT NULL,
    external_id VARCHAR GENERATED ALWAYS AS (property_id || '_' || unit_number) STORED UNIQUE,
    
    source VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    address VARCHAR NOT NULL,
    unit VARCHAR,
    city VARCHAR NOT NULL,
    state VARCHAR(2) NOT NULL,
    
    -- Pricing and details
    current_price INTEGER NOT NULL,
    bedrooms INTEGER NOT NULL,
    bathrooms DECIMAL(2,1) NOT NULL,
    square_feet INTEGER,
    
    -- Fees and concessions
    free_rent_concessions TEXT,
    application_fee INTEGER,
    admin_fee_waived BOOLEAN DEFAULT FALSE,
    admin_fee_amount INTEGER,
    security_deposit INTEGER,
    
    -- Days on market tracking
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR DEFAULT 'active',
    
    -- URLs and timestamps
    listing_url VARCHAR NOT NULL,
    scraped_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient days-on-market queries
CREATE INDEX idx_scraped_properties_days_market ON scraped_properties (first_seen_at, last_seen_at);
CREATE INDEX idx_scraped_properties_unit_lookup ON scraped_properties (property_id, unit_number);
