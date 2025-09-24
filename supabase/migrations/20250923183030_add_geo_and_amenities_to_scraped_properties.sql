-- Add latitude/longitude, square_footage, and amenities to scraped_properties
ALTER TABLE IF EXISTS public.scraped_properties
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8),
  ADD COLUMN IF NOT EXISTS square_footage INTEGER,
  ADD COLUMN IF NOT EXISTS amenities JSONB;

-- index for geo queries (optional)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='scraped_properties' AND indexname='idx_scraped_properties_geo') THEN
    CREATE INDEX idx_scraped_properties_geo ON public.scraped_properties USING gist (ll_to_earth(COALESCE(latitude,0::numeric)::double precision, COALESCE(longitude,0::numeric)::double precision));
  END IF;
EXCEPTION WHEN undefined_function THEN
  -- gist earth extension not available; skip index creation
  RAISE NOTICE 'earthdistance extension or ll_to_earth not available; skipping geo index creation';
END$$ LANGUAGE plpgsql;
