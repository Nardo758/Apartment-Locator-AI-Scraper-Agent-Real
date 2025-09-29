
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

-- Ensure all required columns exist in apartments table
DO $COLUMNS$ 
BEGIN
    -- Add external_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'apartments' 
        AND column_name = 'external_id'
    ) THEN
        ALTER TABLE public.apartments ADD COLUMN external_id TEXT;
    END IF;
    
    -- Add rent_price column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'apartments' 
        AND column_name = 'rent_price'
    ) THEN
        ALTER TABLE public.apartments ADD COLUMN rent_price INTEGER;
    END IF;
    
    -- Add rent_amount column if it doesn't exist (some schemas might expect this)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'apartments' 
        AND column_name = 'rent_amount'
    ) THEN
        ALTER TABLE public.apartments ADD COLUMN rent_amount INTEGER;
    END IF;
    
    -- Add other columns that might be missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'apartments' 
        AND column_name = 'source'
    ) THEN
        ALTER TABLE public.apartments ADD COLUMN source TEXT DEFAULT 'legacy_migration';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'apartments' 
        AND column_name = 'amenities'
    ) THEN
        ALTER TABLE public.apartments ADD COLUMN amenities JSONB DEFAULT '[]';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'apartments' 
        AND column_name = 'scraped_at'
    ) THEN
        ALTER TABLE public.apartments ADD COLUMN scraped_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'apartments' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.apartments ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    -- Add property_type column if it doesn't exist (add with default, then set NOT NULL)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'apartments' 
        AND column_name = 'property_type'
    ) THEN
        ALTER TABLE public.apartments ADD COLUMN property_type VARCHAR(50) DEFAULT 'apartment';
    END IF;
    
    -- Ensure existing NULL values are filled and column has proper default
    UPDATE public.apartments SET property_type = 'apartment' WHERE property_type IS NULL;
    ALTER TABLE public.apartments ALTER COLUMN property_type SET DEFAULT 'apartment';
    
    -- Make sure column is NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'apartments' 
        AND column_name = 'property_type'
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE public.apartments ALTER COLUMN property_type SET NOT NULL;
    END IF;
    
    -- Add description column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'apartments' 
        AND column_name = 'description'
    ) THEN
        ALTER TABLE public.apartments ADD COLUMN description TEXT;
    END IF;
    
    -- Add contact_info column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'apartments' 
        AND column_name = 'contact_info'
    ) THEN
        ALTER TABLE public.apartments ADD COLUMN contact_info JSONB DEFAULT '{}';
    END IF;
    
    -- Create the unique index if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'apartments_external_id_key'
    ) THEN
        CREATE UNIQUE INDEX apartments_external_id_key 
        ON public.apartments (external_id);
    END IF;
END $COLUMNS$;

-- Migrate data from scraped_properties
INSERT INTO public.apartments (
    external_id,
    title,
    address,
    city,
    state,
    rent_price,
    rent_amount,
    bedrooms,
    bathrooms,
    square_feet,
    amenities,
    is_active,
    scraped_at,
    property_type
)
SELECT 
    sp.external_id,
    COALESCE(NULLIF(sp.name, ''), sp.address) AS title,
    sp.address,
    sp.city,
    sp.state,
    COALESCE(sp.current_price, 0) AS rent_price,
    COALESCE(sp.current_price, 0) AS rent_amount,
    sp.bedrooms,
    sp.bathrooms,
    sp.square_feet,
    COALESCE(sp.amenities, '[]'::jsonb) AS amenities,
    (sp.status = 'active') AS is_active,
    sp.scraped_at,
    'apartment' AS property_type
FROM public.scraped_properties sp
WHERE sp.external_id IS NOT NULL
  AND sp.current_price IS NOT NULL
ON CONFLICT (external_id) DO NOTHING;

-- Additional columns are now handled in the column check section above

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
