-- Migrate Existing URLs to Property Sources System
-- Migration: 20250928003000_migrate_existing_urls.sql

-- Create function to extract domain from URL
CREATE OR REPLACE FUNCTION public.extract_domain(url TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE 
    WHEN url ~ 'apartments\.com' THEN 'apartments.com'
    WHEN url ~ 'rent\.com' THEN 'rent.com'
    WHEN url ~ 'zillow\.com' THEN 'zillow.com'
    WHEN url ~ 'apartmentguide\.com' THEN 'apartmentguide.com'
    WHEN url ~ 'realtor\.com' THEN 'realtor.com'
    WHEN url ~ 'padmapper\.com' THEN 'padmapper.com'
    WHEN url ~ 'apartmentlist\.com' THEN 'apartmentlist.com'
    ELSE SUBSTRING(url FROM 'https?://(?:www\.)?([^/]+)')
  END;
END;
$$;

-- Create function to extract region from URL or address
CREATE OR REPLACE FUNCTION public.extract_region(url TEXT, address TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Try to extract from URL first
  IF url ~ '(?i)(atlanta|atl)' OR address ~ '(?i)(atlanta|ga)' THEN
    RETURN 'atlanta';
  ELSIF url ~ '(?i)(new-york|nyc|manhattan|brooklyn)' OR address ~ '(?i)(new york|ny)' THEN
    RETURN 'new-york';
  ELSIF url ~ '(?i)chicago' OR address ~ '(?i)(chicago|il)' THEN
    RETURN 'chicago';
  ELSIF url ~ '(?i)miami' OR address ~ '(?i)(miami|fl)' THEN
    RETURN 'miami';
  ELSIF url ~ '(?i)dallas' OR address ~ '(?i)(dallas|tx)' THEN
    RETURN 'dallas';
  ELSIF url ~ '(?i)houston' OR address ~ '(?i)houston' THEN
    RETURN 'houston';
  ELSIF url ~ '(?i)austin' OR address ~ '(?i)austin' THEN
    RETURN 'austin';
  ELSIF url ~ '(?i)(los-angeles|la)' OR address ~ '(?i)(los angeles|ca)' THEN
    RETURN 'los-angeles';
  ELSIF url ~ '(?i)seattle' OR address ~ '(?i)(seattle|wa)' THEN
    RETURN 'seattle';
  ELSIF url ~ '(?i)denver' OR address ~ '(?i)(denver|co)' THEN
    RETURN 'denver';
  ELSE
    RETURN 'other';
  END IF;
END;
$$;

-- Migrate from apartments table
DO $$
DECLARE
  apartment_record RECORD;
  new_source_id BIGINT;
BEGIN
  RAISE NOTICE 'Starting migration of existing URLs from apartments table...';
  
  FOR apartment_record IN 
    SELECT DISTINCT 
      url, 
      source,
      title,
      MAX(created_at) as latest_created
    FROM public.apartments 
    WHERE url IS NOT NULL
    GROUP BY url, source, title
  LOOP
    BEGIN
      -- Try to insert new property source
      INSERT INTO public.property_sources (
        url,
        property_name,
        website_name,
        region,
        priority,
        scrape_frequency,
        expected_units,
        metadata,
        last_scraped,
        created_at
      )
      VALUES (
        apartment_record.url,
        COALESCE(apartment_record.title, 'Imported Property'),
        public.extract_domain(apartment_record.url),
        public.extract_region(apartment_record.url),
        CASE 
          WHEN public.extract_domain(apartment_record.url) = 'zillow.com' THEN 9
          WHEN public.extract_domain(apartment_record.url) = 'apartments.com' THEN 8
          WHEN public.extract_domain(apartment_record.url) = 'rent.com' THEN 7
          ELSE 5
        END,
        'weekly',
        NULL, -- Will be learned over time
        jsonb_build_object(
          'migrated_from', 'apartments_table',
          'original_source', apartment_record.source,
          'migration_date', NOW()
        ),
        apartment_record.latest_created,
        apartment_record.latest_created
      )
      RETURNING id INTO new_source_id;
      
      RAISE NOTICE 'Migrated apartment URL: % -> property_source_id: %', apartment_record.url, new_source_id;
      
    EXCEPTION WHEN unique_violation THEN
      -- URL already exists, skip
      RAISE NOTICE 'Skipping duplicate URL: %', apartment_record.url;
    END;
  END LOOP;
END $$;

-- Migrate from scraped_properties table
DO $$
DECLARE
  property_record RECORD;
  new_source_id BIGINT;
  existing_source_id BIGINT;
BEGIN
  RAISE NOTICE 'Starting migration of existing URLs from scraped_properties table...';
  
  FOR property_record IN 
    SELECT DISTINCT 
      listing_url, 
      source,
      name,
      address,
      city,
      state,
      MAX(created_at) as latest_created,
      COUNT(*) as unit_count
    FROM public.scraped_properties 
    WHERE listing_url IS NOT NULL
    GROUP BY listing_url, source, name, address, city, state
  LOOP
    BEGIN
      -- Check if property source already exists
      SELECT id INTO existing_source_id
      FROM public.property_sources
      WHERE url = property_record.listing_url;
      
      IF existing_source_id IS NULL THEN
        -- Insert new property source
        INSERT INTO public.property_sources (
          url,
          property_name,
          website_name,
          region,
          priority,
          scrape_frequency,
          expected_units,
          metadata,
          last_scraped,
          created_at
        )
        VALUES (
          property_record.listing_url,
          property_record.name,
          public.extract_domain(property_record.listing_url),
          public.extract_region(property_record.listing_url, property_record.city || ', ' || property_record.state),
          CASE 
            WHEN public.extract_domain(property_record.listing_url) = 'zillow.com' THEN 9
            WHEN public.extract_domain(property_record.listing_url) = 'apartments.com' THEN 8
            WHEN public.extract_domain(property_record.listing_url) = 'rent.com' THEN 7
            ELSE 5
          END,
          'weekly',
          property_record.unit_count,
          jsonb_build_object(
            'migrated_from', 'scraped_properties_table',
            'original_source', property_record.source,
            'property_address', property_record.address,
            'city', property_record.city,
            'state', property_record.state,
            'migration_date', NOW()
          ),
          property_record.latest_created,
          property_record.latest_created
        )
        RETURNING id INTO new_source_id;
        
        -- Update scraped_properties with the new property_source_id
        UPDATE public.scraped_properties
        SET property_source_id = new_source_id
        WHERE listing_url = property_record.listing_url;
        
        RAISE NOTICE 'Migrated property URL: % -> property_source_id: %, updated % units', 
          property_record.listing_url, new_source_id, property_record.unit_count;
      ELSE
        -- Update existing property source with better data
        UPDATE public.property_sources
        SET 
          property_name = COALESCE(property_name, property_record.name),
          expected_units = GREATEST(COALESCE(expected_units, 0), property_record.unit_count),
          metadata = metadata || jsonb_build_object(
            'updated_from_scraped_properties', NOW(),
            'scraped_units_found', property_record.unit_count
          )
        WHERE id = existing_source_id;
        
        -- Update scraped_properties with the existing property_source_id
        UPDATE public.scraped_properties
        SET property_source_id = existing_source_id
        WHERE listing_url = property_record.listing_url;
        
        RAISE NOTICE 'Updated existing property source: % (id: %), linked % units', 
          property_record.listing_url, existing_source_id, property_record.unit_count;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error migrating property URL %: %', property_record.listing_url, SQLERRM;
    END;
  END LOOP;
END $$;

-- Update scraping_queue with property_source_id
DO $$
DECLARE
  queue_record RECORD;
  source_id BIGINT;
BEGIN
  RAISE NOTICE 'Updating scraping_queue with property_source_id...';
  
  FOR queue_record IN 
    SELECT id, url
    FROM public.scraping_queue 
    WHERE property_source_id IS NULL AND url IS NOT NULL
  LOOP
    -- Find matching property source
    SELECT ps.id INTO source_id
    FROM public.property_sources ps
    WHERE ps.url = queue_record.url;
    
    IF source_id IS NOT NULL THEN
      UPDATE public.scraping_queue
      SET property_source_id = source_id
      WHERE id = queue_record.id;
    END IF;
  END LOOP;
END $$;

-- Clean up and optimize property sources
DO $$
DECLARE
  total_sources INTEGER;
  active_sources INTEGER;
  by_region RECORD;
BEGIN
  -- Update success rates based on scraped data
  UPDATE public.property_sources ps
  SET 
    success_rate = CASE 
      WHEN scraped_count > 0 THEN LEAST(100.0, scraped_count::DECIMAL / expected_units::DECIMAL * 100)
      ELSE 100.0
    END,
    avg_units_found = COALESCE(scraped_count, 0)
  FROM (
    SELECT 
      property_source_id,
      COUNT(*) as scraped_count
    FROM public.scraped_properties
    WHERE property_source_id IS NOT NULL
    GROUP BY property_source_id
  ) scraped_stats
  WHERE ps.id = scraped_stats.property_source_id;
  
  -- Get statistics
  SELECT COUNT(*) INTO total_sources FROM public.property_sources;
  SELECT COUNT(*) INTO active_sources FROM public.property_sources WHERE is_active = true;
  
  RAISE NOTICE 'Property sources migration complete:';
  RAISE NOTICE '  Total sources: %', total_sources;
  RAISE NOTICE '  Active sources: %', active_sources;
  
  -- Show breakdown by region
  FOR by_region IN
    SELECT 
      region,
      COUNT(*) as count,
      AVG(success_rate) as avg_success_rate
    FROM public.property_sources
    WHERE is_active = true
    GROUP BY region
    ORDER BY count DESC
  LOOP
    RAISE NOTICE '  Region %: % sources (%.1f%% avg success rate)', 
      by_region.region, by_region.count, by_region.avg_success_rate;
  END LOOP;
END $$;

-- Drop temporary functions
DROP FUNCTION public.extract_domain(TEXT);
DROP FUNCTION public.extract_region(TEXT, TEXT);

-- Update next_scrape times to spread out initial scraping
UPDATE public.property_sources
SET next_scrape = NOW() + (RANDOM() * INTERVAL '7 days')
WHERE next_scrape <= NOW();

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'URL migration completed successfully. Property sources are ready for scheduled scraping.';
END $$;