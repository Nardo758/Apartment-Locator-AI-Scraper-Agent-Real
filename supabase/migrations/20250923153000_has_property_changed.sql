-- 20250923153000_has_property_changed.sql
-- Utility function to detect whether significant fields changed between two JSONB blobs.
-- Supports dot-separated nested keys (e.g. 'amenities.parking') and null-safe comparison.

CREATE OR REPLACE FUNCTION public.has_property_changed(
  old_data jsonb,
  new_data jsonb,
  significant_fields text[]
) RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  fld text;
  old_val text;
  new_val text;
  path_parts text[];
  tmp jsonb;
BEGIN
  IF significant_fields IS NULL OR array_length(significant_fields,1) = 0 THEN
    RETURN FALSE;
  END IF;

  FOREACH fld IN ARRAY significant_fields LOOP
    -- support dot-separated paths for nested JSON
    IF position('.' in fld) > 0 THEN
      path_parts := string_to_array(fld, '.');
      tmp := old_data;
      FOREACH fld IN ARRAY path_parts LOOP
        IF tmp IS NULL THEN
          tmp := NULL;
          EXIT;
        END IF;
        tmp := tmp -> fld;
      END LOOP;
      old_val := case when tmp is null then null else tmp::text end;

      tmp := new_data;
      FOREACH fld IN ARRAY path_parts LOOP
        IF tmp IS NULL THEN
          tmp := NULL;
          EXIT;
        END IF;
        tmp := tmp -> fld;
      END LOOP;
      new_val := case when tmp is null then null else tmp::text end;
    ELSE
      old_val := old_data ->> fld;
      new_val := new_data ->> fld;
    END IF;

    -- normalize explicit 'null' and empty string to NULL for comparison
    IF old_val = 'null' OR old_val = '' THEN
      old_val := NULL;
    END IF;
    IF new_val = 'null' OR new_val = '' THEN
      new_val := NULL;
    END IF;

    IF old_val IS DISTINCT FROM new_val THEN
      RETURN TRUE;
    END IF;
  END LOOP;

  RETURN FALSE;
END;
$$;

-- Helper wrapper with a default set of significant fields commonly used when deciding whether to record a change.
CREATE OR REPLACE FUNCTION public.has_property_changed_default(old_data jsonb, new_data jsonb)
RETURNS boolean LANGUAGE sql AS $$
  SELECT public.has_property_changed(old_data, new_data, array['current_price','status','listing_url','bedrooms','bathrooms','square_feet','name','address']);
$$;

-- Usage examples (for psql or Supabase SQL editor):
-- SELECT public.has_property_changed('{"current_price":1000}'::jsonb, '{"current_price":1100}'::jsonb, ARRAY['current_price']); -- returns true
-- SELECT public.has_property_changed_default('{"current_price":1000}'::jsonb, '{"current_price":1000}'::jsonb); -- returns false
