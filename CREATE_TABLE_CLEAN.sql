CREATE TABLE IF NOT EXISTS public.property_sources (
    id BIGSERIAL PRIMARY KEY,
    url TEXT NOT NULL UNIQUE,
    property_name TEXT,
    website_name TEXT,
    region TEXT,
    priority INTEGER DEFAULT 5,
    scrape_frequency TEXT DEFAULT 'weekly',
    expected_units INTEGER,
    metadata JSONB DEFAULT '{}'::JSONB,
    active BOOLEAN DEFAULT true,
    last_scraped_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_sources_url ON public.property_sources(url);
CREATE INDEX IF NOT EXISTS idx_property_sources_region ON public.property_sources(region);
CREATE INDEX IF NOT EXISTS idx_property_sources_priority ON public.property_sources(priority);
CREATE INDEX IF NOT EXISTS idx_property_sources_active ON public.property_sources(active);

CREATE OR REPLACE FUNCTION public.update_property_sources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS property_sources_updated_at ON public.property_sources;
CREATE TRIGGER property_sources_updated_at
    BEFORE UPDATE ON public.property_sources
    FOR EACH ROW
    EXECUTE FUNCTION public.update_property_sources_updated_at();

GRANT ALL ON public.property_sources TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.property_sources TO anon;
GRANT ALL ON SEQUENCE property_sources_id_seq TO service_role;
GRANT USAGE ON SEQUENCE property_sources_id_seq TO anon;
