-- Migration: Add rpc_merge_apartments_to_scraped_v1
-- Adds ai_provenance column and a batch RPC to merge apartments rows into scraped_properties

BEGIN;

ALTER TABLE IF EXISTS public.scraped_properties
  ADD COLUMN IF NOT EXISTS ai_provenance jsonb;

CREATE OR REPLACE FUNCTION public.rpc_merge_apartments_to_scraped_v1(p_rows jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
  rec jsonb;
  r public.scraped_properties%ROWTYPE;
  now_ts timestamptz := now();
  processed int := 0;
  new_amenities jsonb;
  apt_amen jsonb;
  scr_amen jsonb;
  merged_amen jsonb;
BEGIN
  FOR rec IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    -- Normalize amenity fields to jsonb arrays if present
    apt_amen := CASE WHEN (rec ? 'amenities') THEN (CASE WHEN jsonb_typeof(rec->'amenities') = 'array' THEN rec->'amenities' ELSE to_jsonb(array[rec->>'amenities']) END) ELSE NULL END;

    -- Try to locate existing scraped_properties row by external_id or property_id+unit_number
    r := NULL;
    IF (rec ? 'external_id') THEN
      BEGIN
        SELECT * INTO r FROM public.scraped_properties WHERE external_id = rec->>'external_id' LIMIT 1;
      EXCEPTION WHEN others THEN
        r := NULL;
      END;
    END IF;

    IF r IS NULL THEN
      BEGIN
        SELECT * INTO r FROM public.scraped_properties WHERE property_id = rec->>'property_id' AND unit_number = rec->>'unit_number' LIMIT 1;
      EXCEPTION WHEN others THEN
        r := NULL;
      END;
    END IF;

    -- Build provenance object for this merge
    -- provenance contains source='apartments', timestamp, and a snapshot of incoming apartment fields
    IF rec IS NULL THEN
      CONTINUE;
    END IF;

    IF r IS NULL THEN
      -- Insert a new scraped_properties row based on apartment
      INSERT INTO public.scraped_properties (
        property_id,
        unit_number,
        unit,
        name,
        address,
        source,
        city,
        state,
        current_price,
        bedrooms,
        bathrooms,
        square_feet,
        listing_url,
        amenities,
        free_rent_concessions,
        application_fee,
        admin_fee_waived,
        admin_fee_amount,
        security_deposit,
        ai_price,
        effective_price,
        latitude,
        longitude,
        zip_code,
        ai_provider,
        ai_raw,
        ai_provenance,
        created_at,
        updated_at
      )
      VALUES (
        (rec->>'property_id')::text,
        (rec->>'unit_number')::text,
        (rec->>'unit')::text,
        (rec->>'title')::text,
        (rec->>'address')::text,
        (rec->>'source')::text,
        (rec->>'city')::text,
        (rec->>'state')::text,
        CASE WHEN (rec->>'rent_price') IS NULL THEN NULL ELSE (rec->>'rent_price')::int END,
        CASE WHEN (rec->>'bedrooms') IS NULL THEN NULL ELSE (rec->>'bedrooms')::int END,
  CASE WHEN (rec->>'bathrooms') IS NULL THEN NULL ELSE (rec->>'bathrooms')::numeric END,
  NULL,
  NULL,
  apt_amen,
        (rec->>'free_rent_concessions')::text,
        CASE WHEN (rec->>'application_fee') IS NULL OR trim(rec->>'application_fee') = '' THEN NULL ELSE (rec->>'application_fee')::int END,
        NULL,
        CASE WHEN (rec->>'admin_fee_amount') IS NULL OR trim(rec->>'admin_fee_amount') = '' THEN NULL ELSE (rec->>'admin_fee_amount')::int END,
        CASE WHEN (rec->>'security_deposit') IS NULL OR trim(rec->>'security_deposit') = '' THEN NULL ELSE (rec->>'security_deposit')::int END,
        CASE WHEN (rec->>'rent_price') IS NULL OR trim(rec->>'rent_price') = '' THEN NULL ELSE (rec->>'rent_price')::int END,
        CASE WHEN (rec->>'rent_price') IS NULL OR trim(rec->>'rent_price') = '' THEN NULL ELSE (rec->>'rent_price')::int END,
        CASE WHEN (rec->>'latitude') IS NULL OR trim(rec->>'latitude') = '' THEN NULL ELSE (rec->>'latitude')::numeric END,
        CASE WHEN (rec->>'longitude') IS NULL OR trim(rec->>'longitude') = '' THEN NULL ELSE (rec->>'longitude')::numeric END,
        (rec->>'zip_code')::text,
        (rec->>'ai_provider')::text,
        CASE WHEN rec ? 'ai_raw' THEN rec->'ai_raw' ELSE NULL END,
        jsonb_build_object('source','apartments','at', now_ts, 'apartment', rec),
        now_ts,
        now_ts
      ) RETURNING * INTO r;

      -- Optionally add price_history entry
      IF r.current_price IS NOT NULL THEN
        INSERT INTO public.price_history (external_id, price, recorded_at)
          VALUES (r.external_id, r.current_price, now_ts);
      END IF;

    ELSE
      -- Merge fields: prefer scraped values unless apartment has richer data for specific fields
      -- Name/address: keep scraped unless blank
      UPDATE public.scraped_properties SET
        name = COALESCE(NULLIF(public.scraped_properties.name,''), (rec->>'title')::text),
        address = COALESCE(NULLIF(public.scraped_properties.address,''), (rec->>'address')::text),
        ai_price = COALESCE((rec->>'rent_price')::int, public.scraped_properties.ai_price),
        effective_price = COALESCE((rec->>'rent_price')::int, public.scraped_properties.effective_price),
        ai_provider = COALESCE((rec->>'ai_provider')::text, public.scraped_properties.ai_provider),
        ai_raw = COALESCE(CASE WHEN rec ? 'ai_raw' THEN rec->'ai_raw' ELSE NULL END, public.scraped_properties.ai_raw),
        amenities = (
          CASE
            WHEN public.scraped_properties.amenities IS NULL AND apt_amen IS NOT NULL THEN apt_amen
            WHEN public.scraped_properties.amenities IS NOT NULL AND apt_amen IS NULL THEN public.scraped_properties.amenities
            WHEN public.scraped_properties.amenities IS NOT NULL AND apt_amen IS NOT NULL THEN (
              -- union arrays by concatenation then remove duplicates
              (SELECT jsonb_agg(DISTINCT elem) FROM (
                SELECT jsonb_array_elements_text(public.scraped_properties.amenities) AS elem
                UNION
                SELECT jsonb_array_elements_text(apt_amen) AS elem
              ) s)
            )
            ELSE public.scraped_properties.amenities
          END
        ),
        ai_provenance = jsonb_build_object('merged_from','apartments','at', now_ts, 'apartment', rec, 'previous_provenance', public.scraped_properties.ai_provenance),
        updated_at = now_ts
      WHERE id = r.id
      RETURNING * INTO r;

      -- If price changed (compare current_price to new effective/ai price), insert price_history
      INSERT INTO public.price_history (external_id, price, recorded_at)
      SELECT r.external_id, new_price, now_ts
      FROM (
        SELECT COALESCE((rec->>'rent_price')::int, r.effective_price, r.ai_price) AS new_price
      ) AS nv
      WHERE r.current_price IS DISTINCT FROM nv.new_price;
    END IF;

    processed := processed + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'processed', processed);
END;
$function$;

COMMIT;
