-- 20250923160000_rpc_bulk_upsert_properties.sql
-- Bulk upsert RPC: accepts a jsonb array of property objects and upserts them.
-- For each item it will upsert scraped_properties and insert a price_history record when the price changes.

create or replace function public.rpc_bulk_upsert_properties(p_rows jsonb)
returns jsonb language plpgsql security definer as $$
declare
  rec jsonb;
  ext_id text;
  v_old_price integer;
  v_new_price integer;
  v_change_type text;
  result jsonb := '[]'::jsonb;
begin
  -- Expect p_rows to be a JSON array
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'rpc_bulk_upsert_properties expects a JSON array';
  end if;

  for rec in select * from jsonb_array_elements(p_rows) loop
    -- compute external id
    ext_id := (rec ->> 'property_id') || '_' || (rec ->> 'unit_number');

    -- get current price with lock to avoid races per row
    select current_price into v_old_price
    from public.scraped_properties
    where external_id = ext_id
    for update;

    -- upsert using INSERT ... ON CONFLICT
    -- We'll try to insert and if conflict on external_id then update selected fields
    execute format($f$
      INSERT INTO public.scraped_properties (
        property_id, unit_number, unit, name, address, source, city, state, current_price, bedrooms, bathrooms, square_feet, listing_url, first_seen_at, last_seen_at, created_at, updated_at
      ) VALUES (%L, %L, %L, %L, %L, %L, %L, %L, %s, %s, %s, %s, %L, now(), now(), now(), now())
      ON CONFLICT (external_id) DO UPDATE
      SET current_price = EXCLUDED.current_price,
          last_seen_at = now(),
          updated_at = now(),
          listing_url = EXCLUDED.listing_url,
          bedrooms = EXCLUDED.bedrooms,
          bathrooms = EXCLUDED.bathrooms,
          name = EXCLUDED.name,
          address = EXCLUDED.address,
          source = EXCLUDED.source
      RETURNING id, current_price
    $f$,
    rec ->> 'property_id',
    rec ->> 'unit_number',
    rec ->> 'unit',
    rec ->> 'name',
    rec ->> 'address',
    rec ->> 'source',
    rec ->> 'city',
    rec ->> 'state',
    coalesce((rec ->> 'current_price')::text,'null'),
    coalesce((rec ->> 'bedrooms')::text,'null'),
    coalesce((rec ->> 'bathrooms')::text,'null'),
    coalesce((rec ->> 'square_feet')::text,'null'),
    rec ->> 'listing_url'
    ) into rec;

    -- rec now holds the returned id and current_price from RETURNING
    v_new_price := (rec ->> 'current_price')::int;

    -- Compare and insert price_history if changed and both are non-null
    if v_old_price is not null and v_new_price is not null and v_new_price <> v_old_price then
      v_change_type := case when v_new_price > v_old_price then 'increased' else 'decreased' end;
      insert into public.price_history (external_id, price, change_type) values (ext_id, v_new_price, v_change_type);
    end if;

    -- append to result: external_id and id
    result := result || jsonb_build_array(jsonb_build_object('external_id', ext_id, 'id', rec ->> 'id'));
  end loop;

  return result;
end;
$$;

