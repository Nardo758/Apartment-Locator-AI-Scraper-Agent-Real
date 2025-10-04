-- Migration: Add rpc_bulk_upsert_properties_v2 that upserts extended fields
-- This function is a safe, additive v2 RPC. It upserts many of the newer columns
-- and preserves existing price_history insertion behavior.

CREATE OR REPLACE FUNCTION public.rpc_bulk_upsert_properties_v2(p_rows jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
  rec jsonb;
  r record;
  new_price int;
  now_ts timestamptz := now();
  inserted_count int := 0;
BEGIN
  FOR rec IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    -- Expect keys: property_id, unit_number, unit, name, address, source, city, state,
    -- current_price, bedrooms, bathrooms, square_feet, listing_url,
    -- amenities, free_rent_concessions, application_fee, admin_fee_waived, admin_fee_amount,
    -- security_deposit, ai_price, effective_price, latitude, longitude, zip_code, ai_provider, ai_raw

    INSERT INTO public.scraped_properties (
      property_id, unit_number, unit, name, address, source, city, state,
      current_price, bedrooms, bathrooms, square_feet, listing_url,
      amenities, free_rent_concessions, application_fee, admin_fee_waived, admin_fee_amount, security_deposit,
      ai_price, effective_price, latitude, longitude, zip_code, ai_provider, ai_raw, created_at, updated_at
    )
    VALUES (
  (rec->>'property_id')::text,
  (rec->>'unit_number')::text,
  (rec->>'unit')::text,
  (rec->>'name')::text,
  (rec->>'address')::text,
  (rec->>'source')::text,
  (rec->>'city')::text,
  (rec->>'state')::text,
      CASE WHEN (rec->>'current_price') IS NULL THEN NULL ELSE ((rec->>'current_price')::int) END,
      CASE WHEN (rec->>'bedrooms') IS NULL THEN NULL ELSE (rec->>'bedrooms')::int END,
      CASE WHEN (rec->>'bathrooms') IS NULL THEN NULL ELSE (rec->>'bathrooms')::numeric END,
      CASE WHEN (rec->>'square_feet') IS NULL THEN NULL ELSE (rec->>'square_feet')::int END,
      (rec->>'listing_url')::text,
      CASE WHEN rec ? 'amenities' THEN rec->'amenities' ELSE NULL END,
      (rec->>'free_rent_concessions')::text,
      CASE WHEN (rec->>'application_fee') IS NULL OR trim(rec->>'application_fee') = '' THEN NULL ELSE (rec->>'application_fee')::int END,
      CASE WHEN (rec->>'admin_fee_waived') IS NULL THEN NULL ELSE (rec->>'admin_fee_waived')::boolean END,
      CASE WHEN (rec->>'admin_fee_amount') IS NULL OR trim(rec->>'admin_fee_amount') = '' THEN NULL ELSE (rec->>'admin_fee_amount')::int END,
      CASE WHEN (rec->>'security_deposit') IS NULL OR trim(rec->>'security_deposit') = '' THEN NULL ELSE (rec->>'security_deposit')::int END,
      CASE WHEN (rec->>'ai_price') IS NULL OR trim(rec->>'ai_price') = '' THEN NULL ELSE (rec->>'ai_price')::int END,
      CASE WHEN (rec->>'effective_price') IS NULL OR trim(rec->>'effective_price') = '' THEN NULL ELSE (rec->>'effective_price')::int END,
      CASE WHEN (rec->>'latitude') IS NULL OR trim(rec->>'latitude') = '' THEN NULL ELSE (rec->>'latitude')::numeric END,
      CASE WHEN (rec->>'longitude') IS NULL OR trim(rec->>'longitude') = '' THEN NULL ELSE (rec->>'longitude')::numeric END,
      (rec->>'zip_code')::text,
      (rec->>'ai_provider')::text,
      CASE WHEN rec ? 'ai_raw' THEN rec->'ai_raw' ELSE NULL END,
      now_ts, now_ts
    )
  ON CONFLICT (property_id, unit_number) DO UPDATE SET
      name = EXCLUDED.name,
      address = EXCLUDED.address,
      current_price = EXCLUDED.current_price,
      bedrooms = EXCLUDED.bedrooms,
      bathrooms = EXCLUDED.bathrooms,
      square_feet = EXCLUDED.square_feet,
      listing_url = EXCLUDED.listing_url,
      amenities = COALESCE(EXCLUDED.amenities, public.scraped_properties.amenities),
      free_rent_concessions = COALESCE(EXCLUDED.free_rent_concessions, public.scraped_properties.free_rent_concessions),
      application_fee = COALESCE(EXCLUDED.application_fee, public.scraped_properties.application_fee),
      admin_fee_waived = COALESCE(EXCLUDED.admin_fee_waived, public.scraped_properties.admin_fee_waived),
      admin_fee_amount = COALESCE(EXCLUDED.admin_fee_amount, public.scraped_properties.admin_fee_amount),
      security_deposit = COALESCE(EXCLUDED.security_deposit, public.scraped_properties.security_deposit),
      ai_price = COALESCE(EXCLUDED.ai_price, public.scraped_properties.ai_price),
      effective_price = COALESCE(EXCLUDED.effective_price, public.scraped_properties.effective_price),
      latitude = COALESCE(EXCLUDED.latitude, public.scraped_properties.latitude),
      longitude = COALESCE(EXCLUDED.longitude, public.scraped_properties.longitude),
      zip_code = COALESCE(EXCLUDED.zip_code, public.scraped_properties.zip_code),
      ai_provider = COALESCE(EXCLUDED.ai_provider, public.scraped_properties.ai_provider),
      ai_raw = COALESCE(EXCLUDED.ai_raw, public.scraped_properties.ai_raw),
      updated_at = now_ts;

    -- Insert into price_history if price changed. Use canonical external_id from the table (may be generated).
    SELECT external_id, current_price INTO r FROM public.scraped_properties WHERE property_id = (rec->>'property_id') AND unit_number = (rec->>'unit_number');
    IF FOUND THEN
      new_price := CASE WHEN (rec->>'current_price') IS NULL OR trim(rec->>'current_price') = '' THEN NULL ELSE (rec->>'current_price')::int END;
      IF r.current_price IS DISTINCT FROM new_price THEN
        INSERT INTO public.price_history (external_id, price, recorded_at)
        VALUES (r.external_id, new_price, now_ts);
      END IF;
    END IF;

    inserted_count := inserted_count + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'inserted', inserted_count);
END;
$function$;

COMMENT ON FUNCTION public.rpc_bulk_upsert_properties_v2(jsonb) IS 'v2: bulk upsert with extended fields and ai provenance metadata';
