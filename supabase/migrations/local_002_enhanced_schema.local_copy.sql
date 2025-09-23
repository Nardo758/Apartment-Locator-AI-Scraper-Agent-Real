-- NOTE: This file was renamed to 002_enhanced_schema.local_copy.sql to avoid migration version conflicts.
-- Original filename: 002_enhanced_schema.sql
-- To keep a copy of the original destructive migration, it has been retained here as a local copy.
-- WARNING: This migration drops and recreates core tables (destructive). Run only after taking backups.

-- Enhanced schema with days-on-market tracking and unit numbers

-- Drop existing tables if they exist
DROP TABLE IF EXISTS price_history CASCADE;
DROP TABLE IF EXISTS scraping_queue CASCADE;
DROP TABLE IF EXISTS scraped_properties CASCADE;

-- Main properties table with unit tracking
CREATE TABLE scraped_properties (
    id BIGSERIAL PRIMARY KEY,
    property_id VARCHAR NOT NULL,
    unit_number VARCHAR NOT NULL,
    external_id VARCHAR GENERATED ALWAYS AS (property_id || '_' || unit_number) STORED UNIQUE,
    source VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    address VARCHAR NOT NULL,
    unit VARCHAR,
    city VARCHAR NOT NULL,
    state VARCHAR(2) NOT NULL,
    current_price INTEGER NOT NULL,
    bedrooms INTEGER NOT NULL,
    bathrooms DECIMAL(2,1) NOT NULL,
    square_feet INTEGER,
    free_rent_concessions TEXT,
    application_fee INTEGER,
    admin_fee_waived BOOLEAN DEFAULT FALSE,
    admin_fee_amount INTEGER,
    security_deposit INTEGER,
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR DEFAULT 'active',
    listing_url VARCHAR NOT NULL,
    scraped_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price history tracking
CREATE TABLE price_history (
    id BIGSERIAL PRIMARY KEY,
    external_id VARCHAR NOT NULL REFERENCES scraped_properties(external_id),
    price INTEGER NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    change_type VARCHAR DEFAULT 'scraped'
);

-- Enhanced scraping queue
CREATE TABLE scraping_queue (
    id BIGSERIAL PRIMARY KEY,
    external_id VARCHAR NOT NULL REFERENCES scraped_properties(external_id),
    property_id VARCHAR NOT NULL,
    unit_number VARCHAR NOT NULL,
    url VARCHAR NOT NULL,
    source VARCHAR NOT NULL,
    status VARCHAR DEFAULT 'pending',
    priority INTEGER DEFAULT 1,
    data JSONB,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMptz
);

-- Indexes for performance
CREATE INDEX idx_properties_days_market ON scraped_properties (first_seen_at, last_seen_at);
CREATE INDEX idx_properties_unit_lookup ON scraped_properties (property_id, unit_number);
CREATE INDEX idx_price_history_tracking ON price_history (external_id, recorded_at);
CREATE INDEX idx_queue_priority ON scraping_queue (priority, status);
