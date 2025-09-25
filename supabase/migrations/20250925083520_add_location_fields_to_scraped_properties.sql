-- Migration: Add latitude, longitude, and zip_code to scraped_properties
-- This migration is idempotent and can be safely run multiple times
-- Date: 2025-09-25
-- Purpose: Add geographic location fields to support mapping and location-based features

-- Check if columns exist before adding them (idempotent)
DO $$
BEGIN
    -- Add latitude column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'scraped_properties' 
        AND column_name = 'latitude'
    ) THEN
        ALTER TABLE scraped_properties ADD COLUMN latitude DECIMAL(10,8);
        RAISE NOTICE 'Added latitude column to scraped_properties';
    ELSE
        RAISE NOTICE 'latitude column already exists in scraped_properties';
    END IF;

    -- Add longitude column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'scraped_properties' 
        AND column_name = 'longitude'
    ) THEN
        ALTER TABLE scraped_properties ADD COLUMN longitude DECIMAL(11,8);
        RAISE NOTICE 'Added longitude column to scraped_properties';
    ELSE
        RAISE NOTICE 'longitude column already exists in scraped_properties';
    END IF;

    -- Add zip_code column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'scraped_properties' 
        AND column_name = 'zip_code'
    ) THEN
        ALTER TABLE scraped_properties ADD COLUMN zip_code VARCHAR(10);
        RAISE NOTICE 'Added zip_code column to scraped_properties';
    ELSE
        RAISE NOTICE 'zip_code column already exists in scraped_properties';
    END IF;
END$$;

-- Add indexes for location-based queries (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_scraped_properties_location 
ON scraped_properties (latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scraped_properties_zip_code 
ON scraped_properties (zip_code) 
WHERE zip_code IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN scraped_properties.latitude IS 'Property latitude for mapping and distance calculations (-90 to 90)';
COMMENT ON COLUMN scraped_properties.longitude IS 'Property longitude for mapping and distance calculations (-180 to 180)';
COMMENT ON COLUMN scraped_properties.zip_code IS 'Property ZIP/postal code extracted from address or geocoding';

-- Add constraints to ensure valid coordinate ranges (only if column exists and constraint doesn't exist)
DO $$
BEGIN
    -- Add latitude constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_schema = 'public' 
        AND constraint_name = 'check_latitude_range'
    ) THEN
        ALTER TABLE scraped_properties 
        ADD CONSTRAINT check_latitude_range 
        CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));
        RAISE NOTICE 'Added latitude range constraint';
    END IF;

    -- Add longitude constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_schema = 'public' 
        AND constraint_name = 'check_longitude_range'
    ) THEN
        ALTER TABLE scraped_properties 
        ADD CONSTRAINT check_longitude_range 
        CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));
        RAISE NOTICE 'Added longitude range constraint';
    END IF;
END$$;