-- Create DB roles expected by security hardening migration (idempotent shim)
-- This migration is intended for local/CI environments that don't provide
-- Supabase-managed roles (service_role, authenticated, anon).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
END
$$;

-- Grant membership relationships if desired (no-op if roles were created elsewhere)
-- Note: these are optional and can be removed if they conflict with production.
DO $$
BEGIN
  -- Ensure 'authenticated' and 'anon' exist before attempting to grant
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    -- keep service_role separate; no grants here by default
    NULL;
  END IF;
END
$$;
