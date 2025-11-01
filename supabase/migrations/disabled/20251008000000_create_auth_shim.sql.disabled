-- Minimal auth shim for CI environments that don't run full Supabase
-- Creates schema `auth` and a stub function auth.role() used by RLS policies
-- Idempotent: safe to apply multiple times

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
        PERFORM pg_catalog.set_config('search_path', '', false);
        EXECUTE 'CREATE SCHEMA auth';
    END IF;
END$$;

-- Create a stub auth.role() function returning text. Many migrations expect this
-- to exist and to be callable in RLS policies. Make it SECURITY DEFINER and
-- return 'service_role' when called in CI so policies that check for service_role pass.

CREATE OR REPLACE FUNCTION auth.role()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN 'service_role';
END;
$$ SECURITY DEFINER;

-- Ensure the function has the correct schema qualification when referenced.
COMMENT ON FUNCTION auth.role() IS 'Shim function for CI: returns service_role';
