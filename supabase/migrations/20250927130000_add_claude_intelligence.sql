-- Add Claude AI intelligence columns to apartments table
-- Migration: 20250927130000_add_claude_intelligence.sql

-- Add intelligence columns to apartments table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'apartments' AND column_name = 'intelligence_confidence') THEN
        ALTER TABLE apartments ADD COLUMN intelligence_confidence INTEGER;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'apartments' AND column_name = 'intelligence_source') THEN
        ALTER TABLE apartments ADD COLUMN intelligence_source TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'apartments' AND column_name = 'researched_at') THEN
        ALTER TABLE apartments ADD COLUMN researched_at TIMESTAMPTZ;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'apartments' AND column_name = 'year_built') THEN
        ALTER TABLE apartments ADD COLUMN year_built INTEGER;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'apartments' AND column_name = 'unit_count') THEN
        ALTER TABLE apartments ADD COLUMN unit_count INTEGER;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'apartments' AND column_name = 'building_type') THEN
        ALTER TABLE apartments ADD COLUMN building_type TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'apartments' AND column_name = 'neighborhood') THEN
        ALTER TABLE apartments ADD COLUMN neighborhood TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'apartments' AND column_name = 'transit_access') THEN
        ALTER TABLE apartments ADD COLUMN transit_access TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'apartments' AND column_name = 'walk_score') THEN
        ALTER TABLE apartments ADD COLUMN walk_score INTEGER;
    END IF;
END $$;

-- Create property_intelligence table for storing detailed research data
CREATE TABLE IF NOT EXISTS property_intelligence (
  id BIGSERIAL PRIMARY KEY,
  source_url TEXT UNIQUE NOT NULL,
  property_name TEXT NOT NULL,
  year_built INTEGER,
  unit_count INTEGER,
  property_type TEXT,
  building_type TEXT,
  amenities TEXT[],
  neighborhood TEXT,
  transit_access TEXT,
  walk_score INTEGER,
  confidence_score INTEGER DEFAULT 0,
  research_timestamp TIMESTAMPTZ DEFAULT NOW(),
  research_source TEXT DEFAULT 'claude',
  raw_research_data JSONB
);

-- Create indexes for better performance
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'property_intelligence' AND indexname = 'idx_property_intelligence_url') THEN
        CREATE INDEX idx_property_intelligence_url ON property_intelligence(source_url);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'property_intelligence' AND indexname = 'idx_property_intelligence_confidence') THEN
        CREATE INDEX idx_property_intelligence_confidence ON property_intelligence(confidence_score);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'apartments' AND indexname = 'idx_apartments_intelligence_confidence') THEN
        CREATE INDEX idx_apartments_intelligence_confidence ON apartments(intelligence_confidence);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'apartments' AND indexname = 'idx_apartments_intelligence_source') THEN
        CREATE INDEX idx_apartments_intelligence_source ON apartments(intelligence_source);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'apartments' AND indexname = 'idx_apartments_researched_at') THEN
        CREATE INDEX idx_apartments_researched_at ON apartments(researched_at);
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN apartments.intelligence_confidence IS 'AI confidence score (0-100) for property intelligence data';
COMMENT ON COLUMN apartments.intelligence_source IS 'Source of intelligence data: claude, claude_fallback, manual, etc.';
COMMENT ON COLUMN apartments.researched_at IS 'Timestamp when property was last analyzed by AI';
COMMENT ON COLUMN apartments.year_built IS 'Year the property was constructed';
COMMENT ON COLUMN apartments.unit_count IS 'Total number of units in the property';
COMMENT ON COLUMN apartments.building_type IS 'Type of building: high-rise, mid-rise, garden-style, townhome, etc.';
COMMENT ON COLUMN apartments.neighborhood IS 'Neighborhood name or description';
COMMENT ON COLUMN apartments.transit_access IS 'Description of public transit options';
COMMENT ON COLUMN apartments.walk_score IS 'Walkability score (0-100)';

COMMENT ON TABLE property_intelligence IS 'Detailed property intelligence data from AI analysis';
COMMENT ON COLUMN property_intelligence.source_url IS 'URL of the property listing that was analyzed';
COMMENT ON COLUMN property_intelligence.property_name IS 'Name of the property as found in the listing';
COMMENT ON COLUMN property_intelligence.confidence_score IS 'AI confidence score (0-100) for this analysis';
COMMENT ON COLUMN property_intelligence.research_source IS 'AI service used: claude, openai, etc.';
COMMENT ON COLUMN property_intelligence.raw_research_data IS 'Raw JSON response from AI service for debugging';

-- Verify migration results
DO $$
DECLARE
    apartments_count INTEGER;
    intelligence_table_exists BOOLEAN;
BEGIN
    SELECT COUNT(*) INTO apartments_count FROM apartments;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'property_intelligence'
    ) INTO intelligence_table_exists;
    
    RAISE NOTICE 'Claude intelligence migration complete. Apartments table has % rows, property_intelligence table exists: %', 
        apartments_count, intelligence_table_exists;
END $$;