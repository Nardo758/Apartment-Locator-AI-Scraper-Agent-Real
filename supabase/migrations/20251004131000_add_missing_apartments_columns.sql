-- Migration: Add missing columns referenced by integration tests to `apartments` table
-- Adds columns with IF NOT EXISTS guards so migration is idempotent.

BEGIN;

ALTER TABLE public.apartments
  ADD COLUMN IF NOT EXISTS external_id text;

ALTER TABLE public.apartments
  ADD COLUMN IF NOT EXISTS source text;

ALTER TABLE public.apartments
  ADD COLUMN IF NOT EXISTS title text;

ALTER TABLE public.apartments
  ADD COLUMN IF NOT EXISTS address text;

ALTER TABLE public.apartments
  ADD COLUMN IF NOT EXISTS city text;

ALTER TABLE public.apartments
  ADD COLUMN IF NOT EXISTS state text;

ALTER TABLE public.apartments
  ADD COLUMN IF NOT EXISTS rent_price int;

ALTER TABLE public.apartments
  ADD COLUMN IF NOT EXISTS rent_amount int;

ALTER TABLE public.apartments
  ADD COLUMN IF NOT EXISTS bedrooms int;

ALTER TABLE public.apartments
  ADD COLUMN IF NOT EXISTS bathrooms numeric;

ALTER TABLE public.apartments
  ADD COLUMN IF NOT EXISTS free_rent_concessions text;

ALTER TABLE public.apartments
  ADD COLUMN IF NOT EXISTS application_fee int;

ALTER TABLE public.apartments
  ADD COLUMN IF NOT EXISTS admin_fee_amount int;

ALTER TABLE public.apartments
  ADD COLUMN IF NOT EXISTS security_deposit int;

ALTER TABLE public.apartments
  ADD COLUMN IF NOT EXISTS scraped_at timestamptz;

COMMIT;
