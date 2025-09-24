-- Add geographic columns and zip_code to scraped_properties
ALTER TABLE IF EXISTS public.scraped_properties
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8),
  ADD COLUMN IF NOT EXISTS zip_code VARCHAR(10);

-- Create GIST index for spatial queries using point(longitude, latitude)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE tablename='scraped_properties' AND indexname='idx_scraped_properties_coordinates'
  ) THEN
    -- Attempt to create a gist index on a point constructed from longitude and latitude
    EXECUTE 'CREATE INDEX idx_scraped_properties_coordinates ON public.scraped_properties USING gist (point(longitude, latitude));';
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Could not create GIST index idx_scraped_properties_coordinates: %', SQLERRM;
END$$ LANGUAGE plpgsql;
