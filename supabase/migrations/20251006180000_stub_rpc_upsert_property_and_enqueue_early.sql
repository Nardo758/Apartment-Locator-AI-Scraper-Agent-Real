-- Early stub to satisfy migrations that reference rpc_upsert_property_and_enqueue(jsonb)
-- Create a minimal function with the single-jsonb signature so COMMENT / GRANT
-- statements targeting that signature succeed. The real implementation will replace
-- this later via CREATE OR REPLACE.

BEGIN;

CREATE OR REPLACE FUNCTION public.rpc_upsert_property_and_enqueue(p_row jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN jsonb_build_object('ok', false, 'message', 'stub rpc_upsert_property_and_enqueue executed');
END;
$$;

COMMENT ON FUNCTION public.rpc_upsert_property_and_enqueue(jsonb) IS 'Stub RPC to allow migrations to run in CI';

COMMIT;
