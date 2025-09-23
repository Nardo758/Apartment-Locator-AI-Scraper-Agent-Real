-- 20250923170000_grant_rpc_execute.sql
-- Grant EXECUTE on RPCs to the authenticated role (idempotent)

DO $do$
BEGIN
  PERFORM 1 FROM pg_proc WHERE proname = 'rpc_update_property_with_history';
  IF FOUND THEN
    BEGIN
      EXECUTE 'GRANT EXECUTE ON FUNCTION public.rpc_update_property_with_history(text, jsonb) TO authenticated';
    EXCEPTION WHEN others THEN
      -- ignore errors (e.g., already granted)
      NULL;
    END;
  END IF;

  PERFORM 1 FROM pg_proc WHERE proname = 'rpc_bulk_upsert_properties';
  IF FOUND THEN
    BEGIN
      EXECUTE 'GRANT EXECUTE ON FUNCTION public.rpc_bulk_upsert_properties(jsonb) TO authenticated';
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END IF;
END $do$;
