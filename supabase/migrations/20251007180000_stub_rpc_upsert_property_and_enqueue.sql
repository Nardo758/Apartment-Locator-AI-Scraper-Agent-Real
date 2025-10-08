-- Defensive stub for rpc_upsert_property_and_enqueue to avoid migration ordering issues in local/dev
-- This creates a minimal function signature that will be replaced by the full implementation migration.
CREATE OR REPLACE FUNCTION public.rpc_upsert_property_and_enqueue(p_row jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Minimal stub: return an informative jsonb object so migrations that call/comment the function don't fail.
  RETURN jsonb_build_object('ok', false, 'message', 'stub rpc_upsert_property_and_enqueue executed');
END;
$function$;
