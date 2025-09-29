-- 003_update_scraped_properties.sql
-- Alter scraped_properties to match new schema requirements
BEGIN;

-- If a primary key exists on external_id, drop it so we can add id as BIGSERIAL PK
ALTER TABLE IF EXISTS scraped_properties DROP CONSTRAINT IF EXISTS scraped_properties_pkey;

-- Add id BIGSERIAL if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='scraped_properties' AND column_name='id'
    ) THEN
        ALTER TABLE scraped_properties ADD COLUMN id BIGSERIAL;
    END IF;
END$$;

-- Make id the primary key if not already
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_index i
        JOIN pg_class c ON c.oid = i.indrelid
        JOIN pg_attribute a ON a.attrelid = c.oid
        WHERE c.relname = 'scraped_properties' AND i.indisprimary = true
    ) THEN
        ALTER TABLE scraped_properties ADD PRIMARY KEY (id);
    END IF;
END$$;

-- Alter column types safely
ALTER TABLE scraped_properties ALTER COLUMN state TYPE VARCHAR(2) USING state::varchar(2);
ALTER TABLE scraped_properties ALTER COLUMN current_price TYPE INTEGER USING (current_price::integer);
ALTER TABLE scraped_properties ALTER COLUMN bedrooms TYPE INTEGER USING (bedrooms::integer);
ALTER TABLE scraped_properties ALTER COLUMN bathrooms TYPE DECIMAL(2,1) USING (bathrooms::numeric);

-- Add new columns if they do not exist
ALTER TABLE scraped_properties ADD COLUMN IF NOT EXISTS free_rent_concessions TEXT;
ALTER TABLE scraped_properties ADD COLUMN IF NOT EXISTS application_fee INTEGER;
ALTER TABLE scraped_properties ADD COLUMN IF NOT EXISTS admin_fee_waived BOOLEAN DEFAULT FALSE;
ALTER TABLE scraped_properties ADD COLUMN IF NOT EXISTS admin_fee_amount INTEGER;
ALTER TABLE scraped_properties ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE scraped_properties ADD COLUMN IF NOT EXISTS last_scraped TIMESTAMPTZ;
ALTER TABLE scraped_properties ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE scraped_properties ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

COMMIT;
