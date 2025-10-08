-- Idempotent shim for CI: create minimal auth.users table and auth.uid() function
-- This lets migrations that reference auth.users or call auth.uid() run in a plain
-- Postgres instance (like our CI service container).

BEGIN;

-- Ensure auth schema exists
CREATE SCHEMA IF NOT EXISTS auth;

-- Minimal users table to satisfy foreign key references in frontend migrations.
-- Keep columns minimal and optional to avoid constraints in CI.
CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stub auth.uid() function: returns NULL by default. Some migrations call auth.uid()
-- inside RLS policies; returning NULL makes those policies use the anonymous
-- behavior in CI. Implemented as STABLE so it's callable in expressions.
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID AS $$
BEGIN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

COMMIT;
