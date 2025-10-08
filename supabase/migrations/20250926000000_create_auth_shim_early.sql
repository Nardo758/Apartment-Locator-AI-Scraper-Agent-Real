-- Early auth shim to satisfy Supabase-specific auth.role() references
-- This migration intentionally uses straightforward SQL so it's portable
-- and will be applied before 20250927100000_create_sources_table.sql

CREATE SCHEMA IF NOT EXISTS auth;

-- Create a simple auth.role() function returning 'service_role'
-- Use SQL-language function for maximum portability
CREATE OR REPLACE FUNCTION auth.role()
RETURNS TEXT
LANGUAGE sql
AS $$
  SELECT 'service_role';
$$;

COMMENT ON FUNCTION auth.role() IS 'Early shim: returns service_role for CI';
