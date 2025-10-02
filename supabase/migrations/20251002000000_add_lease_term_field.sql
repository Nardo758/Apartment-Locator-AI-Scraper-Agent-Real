-- 20251002000000_add_lease_term_field.sql
-- Add lease_term field to rental_prices table for storing descriptive lease term information

BEGIN;

-- Add lease_term column to rental_prices table
ALTER TABLE public.rental_prices
ADD COLUMN IF NOT EXISTS lease_term TEXT;

-- Add comment to document the field
COMMENT ON COLUMN public.rental_prices.lease_term IS 'Descriptive lease term (e.g., "12 months", "6 months", "month-to-month", "flexible")';

-- Create index for lease_term searches
CREATE INDEX IF NOT EXISTS idx_rental_prices_lease_term ON public.rental_prices(lease_term);

COMMIT;