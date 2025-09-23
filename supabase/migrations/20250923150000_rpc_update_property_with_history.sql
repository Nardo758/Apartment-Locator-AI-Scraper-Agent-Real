-- 20250923150000_rpc_update_property_with_history.sql
-- Creates an RPC to atomically update a scraped_properties row and insert a price_history record if the price changed.

create or replace function public.rpc_update_property_with_history(
  p_external_id text,
  p_payload jsonb
) returns table(id bigint) language plpgsql security definer as $$
declare
  v_current_price integer;
  v_new_price integer;
  v_change_type text;
begin
  -- Lock the target row to prevent races
  select current_price into v_current_price
  from public.scraped_properties
  where external_id = p_external_id
  for update;

  if not found then
    raise exception 'no scraped_properties row for external_id %', p_external_id;
  end if;

  -- Extract new price if provided in payload
  if (p_payload ? 'current_price') then
    v_new_price := (p_payload->>'current_price')::integer;
  else
    v_new_price := null;
  end if;

  -- Update commonly-updated fields if present in the JSON payload.
  -- Keep this list intentionally conservative to avoid SQL injection surface or schema mismatch.
  update public.scraped_properties
  set
    current_price = coalesce(v_new_price, current_price),
    name = coalesce(nullif(p_payload->>'name',''), name),
    address = coalesce(nullif(p_payload->>'address',''), address),
    unit = coalesce(nullif(p_payload->>'unit',''), unit),
    bedrooms = coalesce( (p_payload->>'bedrooms')::int, bedrooms),
    bathrooms = coalesce( (p_payload->>'bathrooms')::numeric, bathrooms),
    square_feet = coalesce( (p_payload->>'square_feet')::int, square_feet),
    status = coalesce(nullif(p_payload->>'status',''), status),
    listing_url = coalesce(nullif(p_payload->>'listing_url',''), listing_url),
    last_seen_at = now(),
    updated_at = now()
  where external_id = p_external_id
  returning id into id;

  -- Insert into price_history if the price changed (and both old & new prices are non-null)
  if v_new_price is not null and v_current_price is not null and v_new_price <> v_current_price then
    v_change_type := case when v_new_price > v_current_price then 'increased' else 'decreased' end;
    insert into public.price_history (external_id, price, change_type) values (p_external_id, v_new_price, v_change_type);
  end if;

  return;
end;
$$;

-- It's recommended to push this migration and then grant execute to the appropriate roles if you want non-service-role callers
-- Example (run after push if desired):
-- GRANT EXECUTE ON FUNCTION public.rpc_update_property_with_history(text, jsonb) TO authenticated;
