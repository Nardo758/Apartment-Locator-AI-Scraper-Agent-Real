
-- Idempotent migration: scraped_properties → apartments
BEGIN;

-- Create apartments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.apartments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT,
    source TEXT DEFAULT 'legacy_migration',
    title TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code VARCHAR(10),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    rent_price INTEGER,
    bedrooms INTEGER,
    bathrooms DECIMAL(3,1),
    square_feet INTEGER,
    amenities JSONB DEFAULT '[]',
    images JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    scraped_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure external_id column exists and create unique index idempotently
DO $INDEX$ 
BEGIN
    -- First ensure the column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'apartments' 
        AND column_name = 'external_id'
    ) THEN
        ALTER TABLE public.apartments ADD COLUMN external_id TEXT;
    END IF;
    
    -- Then create the index if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'apartments_external_id_key'
    ) THEN
        CREATE UNIQUE INDEX apartments_external_id_key 
        ON public.apartments (external_id);
    END IF;
END $INDEX$;

-- Migrate data from scraped_properties
INSERT INTO public.apartments (
    external_id,
    title,
    address,
    city,
    state,
    rent_price,
    bedrooms,
    bathrooms,
    square_feet,
    amenities,
    is_active,
    scraped_at
)
SELECT 
    sp.external_id,
    COALESCE(NULLIF(sp.name, ''), sp.address) AS title,
    sp.address,
    sp.city,
    sp.state,
    sp.current_price AS rent_price,
    sp.bedrooms,
    sp.bathrooms,
    sp.square_feet,
    COALESCE(sp.amenities, '[]'::jsonb) AS amenities,
    (sp.status = 'active') AS is_active,
    sp.scraped_at
FROM public.scraped_properties sp
WHERE sp.external_id IS NOT NULL
ON CONFLICT (external_id) DO NOTHING;

-- Add any missing columns that might be in your frontend schema
ALTER TABLE public.apartments 
ADD COLUMN IF NOT EXISTS property_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS contact_info JSONB DEFAULT '{}';

COMMIT;

-- Verify migration results
DO $$
DECLARE
    migrated_count INTEGER;
    total_legacy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO migrated_count FROM public.apartments;
    SELECT COUNT(*) INTO total_legacy_count FROM public.scraped_properties 
    WHERE external_id IS NOT NULL;
    
    RAISE NOTICE 'Migration complete: % rows migrated out of % legacy records', 
        migrated_count, total_legacy_count;
END $$;
