-- Ensure the full rpc_upsert_property_and_enqueue implementation exists (idempotent)
CREATE OR REPLACE FUNCTION public.rpc_upsert_property_and_enqueue(
  p_row jsonb,
  p_property_source_id integer DEFAULT NULL,
  p_priority integer DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
  rec jsonb := p_row;
  now_ts timestamptz := now();
  canonical record;
  inserted_queue record;
  prop_id text;
BEGIN
  prop_id := (rec->>'property_id')::text;
  IF prop_id IS NULL OR trim(prop_id) = '' THEN
    RAISE EXCEPTION 'property_id is required in rpc_upsert_property_and_enqueue';
  END IF;

  INSERT INTO public.scraped_properties (
    property_id, unit_number, name, address, source, city, state, listing_url,
    current_price, bedrooms, bathrooms, created_at, updated_at
  ) VALUES (
    (rec->>'property_id')::text,
    COALESCE((rec->>'unit_number')::text, ''),
    COALESCE((rec->>'name')::text, ''),
    COALESCE((rec->>'address')::text, ''),
    COALESCE((rec->>'source')::text, 'discovery'),
    COALESCE((rec->>'city')::text, ''),
    COALESCE((rec->>'state')::text, ''),
    COALESCE((rec->>'listing_url')::text, ''),
    COALESCE(NULLIF((rec->>'current_price'), '')::int, 0),
    COALESCE(NULLIF((rec->>'bedrooms'), '')::int, 0),
    COALESCE(NULLIF((rec->>'bathrooms'), '')::numeric, 0.0),
    now_ts, now_ts
  )
  ON CONFLICT (property_id, unit_number) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, public.scraped_properties.name),
    address = COALESCE(EXCLUDED.address, public.scraped_properties.address),
    source = COALESCE(EXCLUDED.source, public.scraped_properties.source),
    city = COALESCE(EXCLUDED.city, public.scraped_properties.city),
    state = COALESCE(EXCLUDED.state, public.scraped_properties.state),
    listing_url = COALESCE(EXCLUDED.listing_url, public.scraped_properties.listing_url),
    current_price = COALESCE(EXCLUDED.current_price, public.scraped_properties.current_price, 0),
    bedrooms = COALESCE(EXCLUDED.bedrooms, public.scraped_properties.bedrooms, 0),
    bathrooms = COALESCE(EXCLUDED.bathrooms, public.scraped_properties.bathrooms, 0.0),
    updated_at = now_ts;

  SELECT property_id, external_id, id INTO canonical FROM public.scraped_properties
    WHERE property_id = (rec->>'property_id')::text AND unit_number = (rec->>'unit_number')::text
    LIMIT 1;

  IF NOT FOUND THEN
    canonical := (SELECT (rec->>'property_id')::text AS property_id, (rec->>'property_id')::text AS external_id, NULL::int AS id);
  END IF;

  INSERT INTO public.scraping_queue (
    external_id, property_id, unit_number, url, source, status, property_source_id, priority, metadata, created_at
  ) VALUES (
    COALESCE(canonical.external_id::text, (rec->>'property_id')::text),
    COALESCE(canonical.property_id::text, (rec->>'property_id')::text),
    COALESCE((rec->>'unit_number')::text, ''),
    (rec->>'listing_url')::text,
    (rec->>'source')::text,
    'queued',
    COALESCE(p_property_source_id, NULL),
    COALESCE(p_priority, NULL),
    COALESCE(p_metadata, NULL),
    now_ts
  )
  RETURNING * INTO inserted_queue;

  RETURN jsonb_build_object('ok', true, 'scraped', jsonb_build_object('property_id', canonical.property_id, 'external_id', canonical.external_id), 'queue', to_jsonb(inserted_queue));
EXCEPTION WHEN others THEN
  RETURN jsonb_build_object('ok', false, 'error', sqlstate, 'message', SQLERRM);
END;
$function$;
