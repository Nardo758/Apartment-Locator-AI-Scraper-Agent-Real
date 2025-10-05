
\restrict evFz15qvMzjbLpworjk7W4Anq0GtzWJgS4S23Bgo7gB6FNnXNHDMbaI2PYluaKA


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."add_property_source"("source_url" "text", "source_property_name" "text" DEFAULT NULL::"text", "source_website_name" "text" DEFAULT NULL::"text", "source_region" "text" DEFAULT NULL::"text", "source_priority" integer DEFAULT 1, "source_frequency" "text" DEFAULT 'weekly'::"text", "source_expected_units" integer DEFAULT NULL::integer, "source_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    new_id BIGINT;
BEGIN
    INSERT INTO public.property_sources (
        url, property_name, website_name, region, priority, 
        scrape_frequency, expected_units, metadata
    )
    VALUES (
        source_url, source_property_name, source_website_name, 
        source_region, source_priority, source_frequency, 
        source_expected_units, source_metadata
    )
    RETURNING id INTO new_id;
    
    RETURN new_id;
END;
$$;


ALTER FUNCTION "public"."add_property_source"("source_url" "text", "source_property_name" "text", "source_website_name" "text", "source_region" "text", "source_priority" integer, "source_frequency" "text", "source_expected_units" integer, "source_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_next_scrape_time"("frequency" "text", "base_time" timestamp with time zone DEFAULT "now"()) RETURNS timestamp with time zone
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    CASE frequency
        WHEN 'daily' THEN
            RETURN base_time + INTERVAL '1 day';
        WHEN 'weekly' THEN
            RETURN base_time + INTERVAL '1 week';
        WHEN 'monthly' THEN
            RETURN base_time + INTERVAL '1 month';
        ELSE
            RETURN base_time + INTERVAL '1 week'; -- Default to weekly
    END CASE;
END;
$$;


ALTER FUNCTION "public"."calculate_next_scrape_time"("frequency" "text", "base_time" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_priority_score"("p_property_id" character varying, "p_days_since_last_scrape" integer, "p_volatility_score" integer, "p_success_rate" numeric, "p_scrape_attempts" integer) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    base_score INTEGER := 50;
    time_score INTEGER;
    volatility_component INTEGER;
    reliability_score INTEGER;
BEGIN
    -- Time-based scoring (more days = higher priority)
    time_score := LEAST(p_days_since_last_scrape * 5, 30);

    -- Volatility-based scoring (scale 0-100 -> 0-30)
    volatility_component := (p_volatility_score * 30 / 100)::int;

    -- Reliability-based scoring (higher success rate -> slightly lower priority)
    reliability_score := CASE 
        WHEN p_success_rate > 0.9 THEN -10 
        WHEN p_success_rate > 0.7 THEN 0
        ELSE 10 
    END;

    -- Attempt-based penalty (too many failures -> lower priority)
    IF p_scrape_attempts > 3 AND p_success_rate < 0.5 THEN
        reliability_score := reliability_score - 20;
    END IF;

    RETURN base_score + time_score + volatility_component + reliability_score;
END;
$$;


ALTER FUNCTION "public"."calculate_priority_score"("p_property_id" character varying, "p_days_since_last_scrape" integer, "p_volatility_score" integer, "p_success_rate" numeric, "p_scrape_attempts" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_property_match_score"("property_id_param" "uuid", "user_id_param" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    user_prefs RECORD;
    property_data RECORD;
    score INTEGER := 50; -- Base score
    budget_score INTEGER := 0;
    location_score INTEGER := 0;
    amenity_score INTEGER := 0;
BEGIN
    -- Get user preferences
    SELECT * INTO user_prefs 
    FROM public.user_profiles 
    WHERE user_profiles.user_id = user_id_param;
    
    -- Get property data
    SELECT * INTO property_data
    FROM public.properties p
    WHERE p.id = property_id_param;
    
    -- If no user preferences, return base score
    IF user_prefs IS NULL OR property_data IS NULL THEN
        RETURN score;
    END IF;
    
    -- Budget matching (30% weight)
    IF user_prefs.max_budget IS NOT NULL THEN
        IF property_data.effective_price <= user_prefs.max_budget THEN
            budget_score := 30;
        ELSIF property_data.effective_price <= user_prefs.max_budget * 1.1 THEN
            budget_score := 20;
        ELSIF property_data.effective_price <= user_prefs.max_budget * 1.2 THEN
            budget_score := 10;
        END IF;
    END IF;
    
    -- Bedroom matching (20% weight)
    IF user_prefs.bedrooms IS NOT NULL THEN
        IF property_data.bedrooms = user_prefs.bedrooms::INTEGER THEN
            score := score + 20;
        ELSIF ABS(property_data.bedrooms - user_prefs.bedrooms::INTEGER) = 1 THEN
            score := score + 10;
        END IF;
    END IF;
    
    -- Amenity matching (20% weight)
    IF user_prefs.preferred_amenities IS NOT NULL AND array_length(user_prefs.preferred_amenities, 1) > 0 THEN
        amenity_score := (
            SELECT COUNT(*) * 5
            FROM unnest(user_prefs.preferred_amenities) AS pref_amenity
            WHERE pref_amenity = ANY(property_data.amenities)
        );
        amenity_score := LEAST(amenity_score, 20);
    END IF;
    
    -- Calculate final score
    score := score + budget_score + amenity_score;
    
    -- Ensure score is within bounds
    RETURN LEAST(GREATEST(score, 0), 100);
END;
$$;


ALTER FUNCTION "public"."calculate_property_match_score"("property_id_param" "uuid", "user_id_param" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calculate_property_match_score"("property_id_param" "uuid", "user_id_param" "uuid") IS 'Calculate personalized match score for user-property pairs';



CREATE OR REPLACE FUNCTION "public"."cleanup_old_data"("days_to_keep" integer DEFAULT 30) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  deleted_count INTEGER := 0;
  cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
  cutoff_date := NOW() - (days_to_keep || ' days')::INTERVAL;
  
  -- Clean old system events
  WITH deleted AS (
    DELETE FROM system_events WHERE created_at < cutoff_date RETURNING 1
  )
  SELECT deleted_count + COUNT(*) INTO deleted_count FROM deleted;
  
  -- Clean old scraping logs
  WITH deleted AS (
    DELETE FROM scraping_logs WHERE created_at < cutoff_date RETURNING 1
  )
  SELECT deleted_count + COUNT(*) INTO deleted_count FROM deleted;
  
  -- Clean old performance snapshots
  WITH deleted AS (
    DELETE FROM performance_snapshots WHERE snapshot_time < cutoff_date RETURNING 1
  )
  SELECT deleted_count + COUNT(*) INTO deleted_count FROM deleted;
  
  -- Clean completed queue items older than cutoff
  WITH deleted AS (
    DELETE FROM scraping_queue 
    WHERE status IN ('completed', 'failed') 
      AND processed_at < cutoff_date 
    RETURNING 1
  )
  SELECT deleted_count + COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_data"("days_to_keep" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_database_size"() RETURNS TABLE("size" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY SELECT pg_database_size(current_database());
END;
$$;


ALTER FUNCTION "public"."get_database_size"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_next_agent_property"("agent_type_param" "text" DEFAULT NULL::"text", "priority_level_param" "text" DEFAULT NULL::"text") RETURNS TABLE("property_id" bigint, "property_name" "text", "property_url" "text", "priority_level" "text", "website_complexity" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        pb.id,
        pb.property_name,
        pb.property_url,
        pb.priority_level,
        pb.website_complexity
    FROM public.properties_basic pb
    LEFT JOIN public.agent_processing_queue apq ON pb.id = apq.property_id
        AND apq.agent_type = agent_type_param
        AND apq.status IN ('pending', 'processing')
    WHERE apq.id IS NULL -- Not currently being processed
        AND (priority_level_param IS NULL OR pb.priority_level = priority_level_param)
    ORDER BY
        CASE pb.priority_level
            WHEN 'high' THEN 1
            WHEN 'medium' THEN 2
            WHEN 'low' THEN 3
        END,
        pb.created_at ASC
    LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_next_agent_property"("agent_type_param" "text", "priority_level_param" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_next_property_sources_batch"("batch_size" integer DEFAULT 10, "region_filter" "text" DEFAULT NULL::"text") RETURNS TABLE("id" bigint, "url" "text", "property_name" "text", "website_name" "text", "priority" integer, "expected_units" integer, "metadata" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ps.id,
        ps.url,
        ps.property_name,
        ps.website_name,
        ps.priority,
        ps.expected_units,
        ps.metadata
    FROM public.property_sources ps
    WHERE ps.is_active = true
        AND ps.next_scrape <= NOW()
        AND (region_filter IS NULL OR ps.region = region_filter)
        AND ps.consecutive_failures < 5
    ORDER BY 
        ps.priority DESC,
        ps.success_rate DESC,
        ps.next_scrape ASC
    LIMIT batch_size;
END;
$$;


ALTER FUNCTION "public"."get_next_property_sources_batch"("batch_size" integer, "region_filter" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_next_scraping_batch"("batch_size" integer DEFAULT 50) RETURNS TABLE("queue_id" bigint, "external_id" character varying, "url" character varying, "source" character varying, "priority_score" integer, "ai_model" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    WITH candidates AS (
      SELECT q.id
      FROM public.scraping_queue q
      WHERE q.status = 'pending'
      ORDER BY public.calculate_priority_score(
        q.property_id,
        COALESCE(FLOOR(EXTRACT(epoch FROM (NOW() - q.last_successful_scrape))/86400)::int, 99),
        COALESCE((SELECT sp.volatility_score FROM public.scraped_properties sp WHERE sp.external_id = q.external_id), 50),
        COALESCE(q.success_rate, 1.0),
        COALESCE(q.scrape_attempts, 0)
      ) DESC, q.created_at ASC
      LIMIT batch_size
    ), locked AS (
      SELECT id FROM candidates FOR UPDATE SKIP LOCKED
    )
    UPDATE public.scraping_queue sq
    SET status = 'processing', started_at = NOW(), scrape_attempts = COALESCE(sq.scrape_attempts,0) + 1
    FROM locked
    WHERE sq.id = locked.id
    RETURNING sq.id, sq.external_id, sq.url, sq.source, sq.priority_score,
      CASE 
        WHEN sq.priority_score >= 70 THEN 'gpt-4-turbo-preview'
        WHEN sq.priority_score >= 40 THEN 'gpt-3.5-turbo-16k'
        ELSE 'gpt-3.5-turbo'
      END;
END;
$$;


ALTER FUNCTION "public"."get_next_scraping_batch"("batch_size" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_queue_stats"() RETURNS TABLE("pending" bigint, "processing" bigint, "completed" bigint, "failed" bigint, "total" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'processing') as processing,
    COUNT(*) FILTER (WHERE status = 'completed') as completed,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    COUNT(*) as total
  FROM scraping_queue;
END;
$$;


ALTER FUNCTION "public"."get_queue_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_property_changed"("old_data" "jsonb", "new_data" "jsonb", "significant_fields" "text"[]) RETURNS boolean
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."has_property_changed"("old_data" "jsonb", "new_data" "jsonb", "significant_fields" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_property_changed_default"("old_data" "jsonb", "new_data" "jsonb") RETURNS boolean
    LANGUAGE "sql"
    AS $$
  SELECT public.has_property_changed(old_data, new_data, array['current_price','status','listing_url','bedrooms','bathrooms','square_feet','name','address']);
$$;


ALTER FUNCTION "public"."has_property_changed_default"("old_data" "jsonb", "new_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."price_history_record_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.price_history (external_id, price, change_type)
    VALUES (NEW.external_id, NEW.current_price, 'scraped');
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND OLD.current_price != NEW.current_price THEN
    INSERT INTO public.price_history (external_id, price, change_type)
    VALUES (NEW.external_id, NEW.current_price, 
      CASE 
        WHEN NEW.current_price > OLD.current_price THEN 'increased'
        ELSE 'decreased'
      END
    );
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."price_history_record_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reprocess_failed_scrapes"("p_limit" integer DEFAULT 100) RETURNS TABLE("reprocessed" bigint, "skipped" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  r record;
  v_reprocessed bigint := 0;
  v_skipped bigint := 0;
BEGIN
  FOR r IN SELECT * FROM public.failed_scrapes ORDER BY created_at LIMIT p_limit LOOP
    -- Check if the external_id already exists in scraping_queue or scraped_properties
    IF EXISTS (SELECT 1 FROM public.scraping_queue WHERE external_id = r.external_id) OR
       EXISTS (SELECT 1 FROM public.scraped_properties WHERE external_id = r.external_id) THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    -- Insert back into scraping_queue with minimal payload; preserve payload in metadata
    INSERT INTO public.scraping_queue (external_id, url, source, status, metadata, created_at)
    VALUES (
      r.external_id,
      (r.payload ->> 'listing_url')::text,
      (r.payload ->> 'source')::text,
      'queued',
      jsonb_build_object('failed_scrape_id', r.id, 'original_payload', r.payload),
      now()
    );

    UPDATE public.failed_scrapes SET requeue_count = requeue_count + 1, requeued_at = now() WHERE id = r.id;
    v_reprocessed := v_reprocessed + 1;
  END LOOP;

  reprocessed := v_reprocessed;
  skipped := v_skipped;
  RETURN NEXT;
END;
$$;


ALTER FUNCTION "public"."reprocess_failed_scrapes"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_bulk_upsert_properties"("p_rows" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
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
$_$;


ALTER FUNCTION "public"."rpc_bulk_upsert_properties"("p_rows" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_bulk_upsert_properties_v2"("p_rows" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."rpc_bulk_upsert_properties_v2"("p_rows" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_bulk_upsert_properties_v2"("p_rows" "jsonb") IS 'v2: bulk upsert with extended fields and ai provenance metadata';



CREATE OR REPLACE FUNCTION "public"."rpc_compute_percentile"("p_external_id" "text") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  p_zip TEXT;
  p_price NUMERIC;
  pct NUMERIC;
BEGIN
  SELECT zip_code, current_price INTO p_zip, p_price FROM public.scraped_properties WHERE external_id = p_external_id LIMIT 1;
  IF p_zip IS NULL OR p_price IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT roundup * 100 INTO pct FROM (
    SELECT (rank() OVER (ORDER BY current_price) - 1)::float / NULLIF(count(*) OVER (),0) AS frac
    FROM public.scraped_properties
    WHERE zip_code = p_zip AND current_price IS NOT NULL
  ) t LIMIT 1;

  -- Fallback: compute percentile via count if window failed
  IF pct IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN CAST(ROUND(pct * 100) AS INTEGER);
END;
$$;


ALTER FUNCTION "public"."rpc_compute_percentile"("p_external_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_inc_scraping_costs"("operation_type" "text", "cost_amount" numeric, "metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  INSERT INTO public.scraping_costs (operation_type, cost, metadata, recorded_at)
  VALUES (operation_type, cost_amount, metadata, NOW());
  
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."rpc_inc_scraping_costs"("operation_type" "text", "cost_amount" numeric, "metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_inc_scraping_costs"("p_date" "date", "p_properties_scraped" integer DEFAULT 0, "p_ai_requests" integer DEFAULT 0, "p_tokens_used" integer DEFAULT 0, "p_estimated_cost" numeric DEFAULT 0, "p_details" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO scraping_costs (
    date,
    properties_scraped,
    ai_requests,
    tokens_used,
    estimated_cost,
    details
  ) VALUES (
    p_date,
    p_properties_scraped,
    p_ai_requests,
    p_tokens_used,
    p_estimated_cost,
    p_details
  )
  ON CONFLICT (date) DO UPDATE SET
    properties_scraped = scraping_costs.properties_scraped + p_properties_scraped,
    ai_requests = scraping_costs.ai_requests + p_ai_requests,
    tokens_used = scraping_costs.tokens_used + p_tokens_used,
    estimated_cost = scraping_costs.estimated_cost + p_estimated_cost,
    details = COALESCE(scraping_costs.details, '{}'::jsonb) || p_details;
END;
$$;


ALTER FUNCTION "public"."rpc_inc_scraping_costs"("p_date" "date", "p_properties_scraped" integer, "p_ai_requests" integer, "p_tokens_used" integer, "p_estimated_cost" numeric, "p_details" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_inc_scraping_costs"("p_date" "date", "p_properties_scraped" integer DEFAULT 0, "p_ai_requests" integer DEFAULT 0, "p_tokens_used" bigint DEFAULT 0, "p_estimated_cost" numeric DEFAULT 0, "p_details" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.scraping_costs (date, properties_scraped, ai_requests, tokens_used, estimated_cost, details, created_at)
  VALUES (p_date, p_properties_scraped, p_ai_requests, p_tokens_used, p_estimated_cost, p_details, now())
  ON CONFLICT (date) DO UPDATE
  SET
    properties_scraped = public.scraping_costs.properties_scraped + EXCLUDED.properties_scraped,
    ai_requests = public.scraping_costs.ai_requests + EXCLUDED.ai_requests,
    tokens_used = public.scraping_costs.tokens_used + EXCLUDED.tokens_used,
    estimated_cost = public.scraping_costs.estimated_cost + EXCLUDED.estimated_cost,
    details = jsonb_set(coalesce(public.scraping_costs.details, '{}'::jsonb), '{last_update}', to_jsonb(now()) );
END;
$$;


ALTER FUNCTION "public"."rpc_inc_scraping_costs"("p_date" "date", "p_properties_scraped" integer, "p_ai_requests" integer, "p_tokens_used" bigint, "p_estimated_cost" numeric, "p_details" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_merge_apartments_to_scraped_v1"("p_rows" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."rpc_merge_apartments_to_scraped_v1"("p_rows" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_reprocess_failed_scrapes_by_batch"("p_batch_id" "uuid", "p_limit" integer DEFAULT 100) RETURNS TABLE("reprocessed" bigint, "skipped" bigint, "errors" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  r record;
  v_reprocessed bigint := 0;
  v_skipped bigint := 0;
  v_errors jsonb := '[]'::jsonb;
BEGIN
  FOR r IN
    SELECT * FROM public.failed_scrapes
    WHERE training_batch_id = p_batch_id
      AND training_status = 'fixed'
    ORDER BY created_at
    LIMIT p_limit
  LOOP
    BEGIN
      -- Skip if already queued or already scraped
      IF EXISTS (SELECT 1 FROM public.scraping_queue WHERE external_id = r.external_id) OR
         EXISTS (SELECT 1 FROM public.scraped_properties WHERE external_id = r.external_id) THEN
        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;

      INSERT INTO public.scraping_queue (external_id, url, source, status, metadata, created_at)
      VALUES (
        r.external_id,
        (r.payload ->> 'listing_url')::text,
        (r.payload ->> 'source')::text,
        'queued',
        jsonb_build_object('failed_scrape_id', r.id, 'training_batch_id', r.training_batch_id, 'original_payload', r.payload),
        now()
      );

      UPDATE public.failed_scrapes SET requeue_count = requeue_count + 1, requeued_at = now(), training_status = 'requeued' WHERE id = r.id;
      v_reprocessed := v_reprocessed + 1;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || jsonb_build_object('id', r.id, 'error', SQLERRM);
    END;
  END LOOP;

  reprocessed := v_reprocessed;
  skipped := v_skipped;
  errors := v_errors;
  RETURN NEXT;
END;
$$;


ALTER FUNCTION "public"."rpc_reprocess_failed_scrapes_by_batch"("p_batch_id" "uuid", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_update_failed_scrape_training_status"("p_batch_id" "uuid", "p_status" "text") RETURNS TABLE("updated_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_count bigint := 0;
BEGIN
  UPDATE public.failed_scrapes
  SET training_status = p_status, training_updated_at = now()
  WHERE training_batch_id = p_batch_id
  RETURNING 1 INTO v_count;

  updated_count := (SELECT COUNT(*) FROM public.failed_scrapes WHERE training_batch_id = p_batch_id);
  RETURN NEXT;
END;
$$;


ALTER FUNCTION "public"."rpc_update_failed_scrape_training_status"("p_batch_id" "uuid", "p_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_update_property_with_history"("p_external_id" "text", "p_payload" "jsonb") RETURNS TABLE("id" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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


ALTER FUNCTION "public"."rpc_update_property_with_history"("p_external_id" "text", "p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_properties_near_location"("lat" numeric, "lng" numeric, "radius_km" integer DEFAULT 10, "min_bedrooms" integer DEFAULT NULL::integer, "max_bedrooms" integer DEFAULT NULL::integer, "min_price" integer DEFAULT NULL::integer, "max_price" integer DEFAULT NULL::integer, "user_id_param" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "name" "text", "address" "text", "city" "text", "state" "text", "bedrooms" integer, "bathrooms" numeric, "sqft" integer, "original_price" integer, "ai_price" integer, "effective_price" integer, "distance_km" numeric, "match_score" integer, "market_velocity" "text", "availability_type" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.address,
        p.city,
        p.state,
        p.bedrooms,
        p.bathrooms,
        p.sqft,
        p.original_price,
        p.ai_price,
        p.effective_price,
        (6371 * acos(
            cos(radians(lat)) * cos(radians(p.latitude)) * 
            cos(radians(p.longitude) - radians(lng)) + 
            sin(radians(lat)) * sin(radians(p.latitude))
        ))::DECIMAL as distance_km,
        p.match_score,
        p.market_velocity,
        p.availability_type
    FROM public.properties p
    WHERE p.is_active = true
        AND p.latitude IS NOT NULL 
        AND p.longitude IS NOT NULL
        AND (min_bedrooms IS NULL OR p.bedrooms >= min_bedrooms)
        AND (max_bedrooms IS NULL OR p.bedrooms <= max_bedrooms)
        AND (min_price IS NULL OR p.effective_price >= min_price)
        AND (max_price IS NULL OR p.effective_price <= max_price)
        AND (6371 * acos(
            cos(radians(lat)) * cos(radians(p.latitude)) * 
            cos(radians(p.longitude) - radians(lng)) + 
            sin(radians(lat)) * sin(radians(p.latitude))
        )) <= radius_km
    ORDER BY 
        CASE WHEN user_id_param IS NOT NULL THEN p.match_score END DESC NULLS LAST,
        distance_km ASC;
END;
$$;


ALTER FUNCTION "public"."search_properties_near_location"("lat" numeric, "lng" numeric, "radius_km" integer, "min_bedrooms" integer, "max_bedrooms" integer, "min_price" integer, "max_price" integer, "user_id_param" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."search_properties_near_location"("lat" numeric, "lng" numeric, "radius_km" integer, "min_bedrooms" integer, "max_bedrooms" integer, "min_price" integer, "max_price" integer, "user_id_param" "uuid") IS 'Geographic search with filtering and user-specific matching';



CREATE OR REPLACE FUNCTION "public"."touch_scraped_properties"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at := NOW();
  NEW.last_seen_at := NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."touch_scraped_properties"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."transform_scraped_to_properties"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    scraped_row RECORD;
    property_row RECORD;
    transformed_count INTEGER := 0;
    ai_price_calculated INTEGER;
    effective_price_calculated INTEGER;
BEGIN
    -- Transform scraped_properties to properties table
    FOR scraped_row IN 
        SELECT * FROM public.scraped_properties 
        WHERE updated_at > NOW() - INTERVAL '1 hour' -- Only recent updates
        OR id NOT IN (SELECT scraped_property_id FROM public.properties WHERE scraped_property_id IS NOT NULL)
    LOOP
        -- Calculate AI price (placeholder logic - replace with your AI logic)
        ai_price_calculated := scraped_row.current_price;
        
        -- Calculate effective price (accounting for concessions)
        effective_price_calculated := scraped_row.current_price;
        IF scraped_row.free_rent_concessions IS NOT NULL THEN
            effective_price_calculated := scraped_row.current_price * 0.95; -- 5% discount for concessions
        END IF;
        
        -- Check if property already exists
        SELECT * INTO property_row 
        FROM public.properties 
        WHERE external_id = scraped_row.external_id;
        
        IF property_row IS NULL THEN
            -- Insert new property
            INSERT INTO public.properties (
                external_id,
                name,
                address,
                city,
                state,
                zip,
                bedrooms,
                bathrooms,
                sqft,
                original_price,
                ai_price,
                effective_price,
                rent_per_sqft,
                availability,
                availability_type,
                property_source_id,
                scraped_property_id,
                source_url,
                last_scraped,
                created_at,
                updated_at
            ) VALUES (
                scraped_row.external_id,
                scraped_row.name,
                scraped_row.address,
                scraped_row.city,
                scraped_row.state,
                NULL, -- zip not in scraped_properties
                scraped_row.bedrooms,
                scraped_row.bathrooms,
                COALESCE(scraped_row.square_feet, 0),
                scraped_row.current_price,
                ai_price_calculated,
                effective_price_calculated,
                CASE 
                    WHEN scraped_row.square_feet > 0 THEN effective_price_calculated::DECIMAL / scraped_row.square_feet
                    ELSE NULL 
                END,
                scraped_row.status,
                CASE 
                    WHEN scraped_row.status = 'active' THEN 'immediate'
                    ELSE 'soon'
                END,
                scraped_row.property_source_id,
                scraped_row.id,
                scraped_row.listing_url,
                scraped_row.scraped_at,
                scraped_row.created_at,
                scraped_row.updated_at
            );
            
            transformed_count := transformed_count + 1;
        ELSE
            -- Update existing property
            UPDATE public.properties SET
                name = scraped_row.name,
                address = scraped_row.address,
                city = scraped_row.city,
                state = scraped_row.state,
                bedrooms = scraped_row.bedrooms,
                bathrooms = scraped_row.bathrooms,
                sqft = COALESCE(scraped_row.square_feet, 0),
                original_price = scraped_row.current_price,
                ai_price = ai_price_calculated,
                effective_price = effective_price_calculated,
                rent_per_sqft = CASE 
                    WHEN scraped_row.square_feet > 0 THEN effective_price_calculated::DECIMAL / scraped_row.square_feet
                    ELSE rent_per_sqft 
                END,
                availability = scraped_row.status,
                availability_type = CASE 
                    WHEN scraped_row.status = 'active' THEN 'immediate'
                    ELSE availability_type
                END,
                last_scraped = scraped_row.scraped_at,
                updated_at = NOW()
            WHERE external_id = scraped_row.external_id;
        END IF;
    END LOOP;
    
    RETURN transformed_count;
END;
$$;


ALTER FUNCTION "public"."transform_scraped_to_properties"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."transform_scraped_to_properties"() IS 'Transform scraped data to frontend-compatible format';



CREATE OR REPLACE FUNCTION "public"."update_days_on_market"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Update days_on_market for active properties
  UPDATE public.scraped_properties
  SET days_on_market = FLOOR(EXTRACT(EPOCH FROM (NOW() - first_seen_at)) / 86400)
  WHERE status = 'active' AND first_seen_at IS NOT NULL;
END;
$$;


ALTER FUNCTION "public"."update_days_on_market"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_property_priorities"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    updated_count INTEGER := 0;
BEGIN
    -- Update high priority for luxury/large properties
    UPDATE public.properties_basic
    SET priority_level = 'high'
    WHERE total_units > 200
       OR property_type IN ('luxury', 'high-rise')
       OR management_company IN ('CBRE', 'Greystar', 'Equity Residential', 'AvalonBay');

    -- Update medium priority for medium-sized properties
    UPDATE public.properties_basic
    SET priority_level = 'medium'
    WHERE total_units BETWEEN 50 AND 200
      AND priority_level = 'low';

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$;


ALTER FUNCTION "public"."update_property_priorities"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_property_source_metrics"("source_id" bigint, "units_found" integer, "scrape_cost" numeric DEFAULT 0, "success" boolean DEFAULT true, "error_message" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    current_avg_units INTEGER;
    current_total_cost DECIMAL(10,2);
    current_avg_cost DECIMAL(10,4);
    scrape_count INTEGER;
BEGIN
    -- Get current metrics
    SELECT avg_units_found, total_cost, avg_cost_per_scrape
    INTO current_avg_units, current_total_cost, current_avg_cost
    FROM public.property_sources
    WHERE id = source_id;
    
    -- Calculate scrape count (rough estimate)
    scrape_count := GREATEST(1, ROUND(current_total_cost / NULLIF(current_avg_cost, 0)));
    
    -- Update metrics
    UPDATE public.property_sources
    SET 
        last_scraped = NOW(),
        next_scrape = public.calculate_next_scrape_time(scrape_frequency, NOW()),
        avg_units_found = ROUND((current_avg_units * scrape_count + units_found) / (scrape_count + 1)),
        total_cost = current_total_cost + scrape_cost,
        avg_cost_per_scrape = (current_total_cost + scrape_cost) / (scrape_count + 1),
        consecutive_failures = CASE WHEN success THEN 0 ELSE consecutive_failures + 1 END,
        last_error = CASE WHEN success THEN NULL ELSE error_message END,
        success_rate = CASE 
            WHEN success THEN LEAST(100.0, success_rate + (100.0 - success_rate) * 0.1)
            ELSE GREATEST(0.0, success_rate - 10.0)
        END,
        updated_at = NOW()
    WHERE id = source_id;
    
    -- Auto-disable sources with too many consecutive failures
    UPDATE public.property_sources
    SET is_active = false
    WHERE id = source_id AND consecutive_failures >= 5;
    
    RETURN true;
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$;


ALTER FUNCTION "public"."update_property_source_metrics"("source_id" bigint, "units_found" integer, "scrape_cost" numeric, "success" boolean, "error_message" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_queue_status"("p_id" bigint, "p_status" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE scraping_queue 
  SET 
    status = p_status,
    updated_at = NOW(),
    processed_at = CASE WHEN p_status IN ('completed', 'failed') THEN NOW() ELSE processed_at END
  WHERE id = p_id;
END;
$$;


ALTER FUNCTION "public"."update_queue_status"("p_id" bigint, "p_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_scraping_metrics"("p_external_id" character varying, "p_success" boolean, "p_duration" integer, "p_price_changed" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Update queue metrics
    UPDATE public.scraping_queue
    SET 
        last_successful_scrape = CASE WHEN p_success THEN NOW() ELSE last_successful_scrape END,
        success_rate = (
            (COALESCE(success_rate,1.0) * COALESCE(scrape_attempts,0) + CASE WHEN p_success THEN 1 ELSE 0 END)::DECIMAL
            / (COALESCE(scrape_attempts,0) + 1)
        ),
        avg_scrape_duration = COALESCE(
            (COALESCE(avg_scrape_duration,0) * COALESCE(scrape_attempts,0) + COALESCE(p_duration,0))::DECIMAL / (COALESCE(scrape_attempts,0) + 1),
            p_duration
        )
    WHERE external_id = p_external_id;
    
    -- Update property volatility if price changed
    IF p_price_changed THEN
        UPDATE public.scraped_properties 
        SET 
            price_change_count = COALESCE(price_change_count,0) + 1,
            last_price_change = NOW(),
            volatility_score = LEAST(COALESCE(volatility_score,50) + 10, 100)
        WHERE external_id = p_external_id;
    ELSE
        -- Gradually decrease volatility score for stable properties
        UPDATE public.scraped_properties 
        SET volatility_score = GREATEST(COALESCE(volatility_score,50) - 1, 0)
        WHERE external_id = p_external_id;
    END IF;
END;
$$;


ALTER FUNCTION "public"."update_scraping_metrics"("p_external_id" character varying, "p_success" boolean, "p_duration" integer, "p_price_changed" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."agent_costs" (
    "id" bigint NOT NULL,
    "agent_type" "text" NOT NULL,
    "operation_type" "text" NOT NULL,
    "cost_usd" numeric(10,4) NOT NULL,
    "tokens_used" integer,
    "processing_time_seconds" numeric(8,2),
    "property_id" bigint,
    "success" boolean DEFAULT true,
    "error_details" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."agent_costs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."agent_costs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."agent_costs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."agent_costs_id_seq" OWNED BY "public"."agent_costs"."id";



CREATE TABLE IF NOT EXISTS "public"."agent_processing_queue" (
    "id" bigint NOT NULL,
    "property_id" bigint NOT NULL,
    "agent_type" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "priority" integer DEFAULT 1,
    "retry_count" integer DEFAULT 0,
    "max_retries" integer DEFAULT 3,
    "error_message" "text",
    "processing_started_at" timestamp with time zone,
    "processing_completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "agent_processing_queue_agent_type_check" CHECK (("agent_type" = ANY (ARRAY['discovery'::"text", 'rental_vision'::"text", 'rental_claude'::"text"]))),
    CONSTRAINT "agent_processing_queue_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."agent_processing_queue" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."agent_processing_queue_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."agent_processing_queue_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."agent_processing_queue_id_seq" OWNED BY "public"."agent_processing_queue"."id";



CREATE TABLE IF NOT EXISTS "public"."ai_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid",
    "result" "jsonb",
    "model" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ai_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."apartment_iq_data" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid",
    "current_rent" integer,
    "original_rent" integer,
    "effective_rent" integer,
    "concession_value" integer DEFAULT 0,
    "concession_type" "text",
    "concession_urgency" "text" DEFAULT 'none'::"text",
    "days_on_market" integer DEFAULT 0,
    "first_seen" timestamp with time zone,
    "market_velocity" "text" DEFAULT 'normal'::"text",
    "market_position" "text" DEFAULT 'at_market'::"text",
    "percentile_rank" integer,
    "amenity_score" integer,
    "location_score" integer,
    "management_score" integer,
    "lease_probability" numeric(3,2),
    "negotiation_potential" integer,
    "urgency_score" integer,
    "rent_trend" "text" DEFAULT 'stable'::"text",
    "rent_change_percent" numeric(5,2),
    "concession_trend" "text" DEFAULT 'none'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "apartment_iq_data_amenity_score_check" CHECK ((("amenity_score" >= 1) AND ("amenity_score" <= 100))),
    CONSTRAINT "apartment_iq_data_concession_trend_check" CHECK (("concession_trend" = ANY (ARRAY['none'::"text", 'increasing'::"text", 'decreasing'::"text"]))),
    CONSTRAINT "apartment_iq_data_concession_urgency_check" CHECK (("concession_urgency" = ANY (ARRAY['none'::"text", 'standard'::"text", 'aggressive'::"text", 'desperate'::"text"]))),
    CONSTRAINT "apartment_iq_data_lease_probability_check" CHECK ((("lease_probability" >= (0)::numeric) AND ("lease_probability" <= (1)::numeric))),
    CONSTRAINT "apartment_iq_data_location_score_check" CHECK ((("location_score" >= 1) AND ("location_score" <= 100))),
    CONSTRAINT "apartment_iq_data_management_score_check" CHECK ((("management_score" >= 1) AND ("management_score" <= 100))),
    CONSTRAINT "apartment_iq_data_market_position_check" CHECK (("market_position" = ANY (ARRAY['below_market'::"text", 'at_market'::"text", 'above_market'::"text"]))),
    CONSTRAINT "apartment_iq_data_market_velocity_check" CHECK (("market_velocity" = ANY (ARRAY['hot'::"text", 'normal'::"text", 'slow'::"text", 'stale'::"text"]))),
    CONSTRAINT "apartment_iq_data_negotiation_potential_check" CHECK ((("negotiation_potential" >= 1) AND ("negotiation_potential" <= 10))),
    CONSTRAINT "apartment_iq_data_percentile_rank_check" CHECK ((("percentile_rank" >= 1) AND ("percentile_rank" <= 100))),
    CONSTRAINT "apartment_iq_data_rent_trend_check" CHECK (("rent_trend" = ANY (ARRAY['increasing'::"text", 'stable'::"text", 'decreasing'::"text"]))),
    CONSTRAINT "apartment_iq_data_urgency_score_check" CHECK ((("urgency_score" >= 1) AND ("urgency_score" <= 10)))
);


ALTER TABLE "public"."apartment_iq_data" OWNER TO "postgres";


COMMENT ON TABLE "public"."apartment_iq_data" IS 'Enhanced market intelligence and pricing analysis for properties';



CREATE TABLE IF NOT EXISTS "public"."apartments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "source" "text" NOT NULL,
    "url" "text" NOT NULL,
    "title" "text",
    "price" numeric,
    "meta" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "source_url" "text",
    "source_name" "text",
    "scraping_job_id" bigint,
    "intelligence_confidence" integer,
    "intelligence_source" "text",
    "researched_at" timestamp with time zone,
    "year_built" integer,
    "unit_count" integer,
    "building_type" "text",
    "neighborhood" "text",
    "transit_access" "text",
    "walk_score" integer,
    "external_id" "text",
    "address" "text",
    "city" "text",
    "state" "text",
    "rent_price" integer,
    "rent_amount" integer,
    "bedrooms" integer,
    "bathrooms" numeric,
    "free_rent_concessions" "text",
    "application_fee" integer,
    "admin_fee_amount" integer,
    "security_deposit" integer,
    "scraped_at" timestamp with time zone
);


ALTER TABLE "public"."apartments" OWNER TO "postgres";


COMMENT ON COLUMN "public"."apartments"."source_url" IS 'URL of the website where this apartment was found';



COMMENT ON COLUMN "public"."apartments"."source_name" IS 'Human-readable name of the source website';



COMMENT ON COLUMN "public"."apartments"."scraping_job_id" IS 'ID of the scraping_queue job that found this apartment';



COMMENT ON COLUMN "public"."apartments"."intelligence_confidence" IS 'AI confidence score (0-100) for property intelligence data';



COMMENT ON COLUMN "public"."apartments"."intelligence_source" IS 'Source of intelligence data: claude, claude_fallback, manual, etc.';



COMMENT ON COLUMN "public"."apartments"."researched_at" IS 'Timestamp when property was last analyzed by AI';



COMMENT ON COLUMN "public"."apartments"."year_built" IS 'Year the property was constructed';



COMMENT ON COLUMN "public"."apartments"."unit_count" IS 'Total number of units in the property';



COMMENT ON COLUMN "public"."apartments"."building_type" IS 'Type of building: high-rise, mid-rise, garden-style, townhome, etc.';



COMMENT ON COLUMN "public"."apartments"."neighborhood" IS 'Neighborhood name or description';



COMMENT ON COLUMN "public"."apartments"."transit_access" IS 'Description of public transit options';



COMMENT ON COLUMN "public"."apartments"."walk_score" IS 'Walkability score (0-100)';



CREATE TABLE IF NOT EXISTS "public"."batch_jobs" (
    "id" bigint NOT NULL,
    "batch_id" "text" NOT NULL,
    "status" "text" NOT NULL,
    "batch_size" integer,
    "properties_processed" integer DEFAULT 0,
    "start_time" timestamp with time zone,
    "end_time" timestamp with time zone,
    "estimated_duration" "text",
    "errors" "jsonb",
    CONSTRAINT "batch_jobs_status_check" CHECK (("status" = ANY (ARRAY['started'::"text", 'running'::"text", 'completed'::"text", 'failed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."batch_jobs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."batch_jobs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."batch_jobs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."batch_jobs_id_seq" OWNED BY "public"."batch_jobs"."id";



CREATE TABLE IF NOT EXISTS "public"."failed_scrapes" (
    "id" bigint NOT NULL,
    "external_id" "text" NOT NULL,
    "payload" "jsonb" NOT NULL,
    "error" "jsonb",
    "requeue_count" integer DEFAULT 0,
    "requeued_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "training_batch_id" "uuid",
    "training_priority" integer DEFAULT 1,
    "training_notes" "text",
    "training_status" "text" DEFAULT 'pending'::"text",
    "training_updated_at" timestamp with time zone
);


ALTER TABLE "public"."failed_scrapes" OWNER TO "postgres";


ALTER TABLE "public"."failed_scrapes" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."failed_scrapes_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."market_intelligence" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "location" "text" NOT NULL,
    "location_type" "text" DEFAULT 'city'::"text",
    "average_rent" integer,
    "rent_per_sqft" numeric(10,2),
    "vacancy_rate" numeric(5,2),
    "days_on_market_avg" integer,
    "concession_prevalence" numeric(5,2),
    "rent_trend" "text" DEFAULT 'stable'::"text",
    "rent_change_ytd" numeric(5,2),
    "market_velocity" "text" DEFAULT 'normal'::"text",
    "new_listings_weekly" integer,
    "price_reductions_weekly" integer,
    "leasing_velocity" integer,
    "insights" "jsonb" DEFAULT '{}'::"jsonb",
    "recommendations" "jsonb" DEFAULT '{}'::"jsonb",
    "calculated_at" timestamp with time zone DEFAULT "now"(),
    "valid_until" timestamp with time zone,
    CONSTRAINT "market_intelligence_location_type_check" CHECK (("location_type" = ANY (ARRAY['neighborhood'::"text", 'city'::"text", 'metro'::"text"]))),
    CONSTRAINT "market_intelligence_market_velocity_check" CHECK (("market_velocity" = ANY (ARRAY['hot'::"text", 'normal'::"text", 'slow'::"text", 'stale'::"text"]))),
    CONSTRAINT "market_intelligence_rent_trend_check" CHECK (("rent_trend" = ANY (ARRAY['increasing'::"text", 'stable'::"text", 'decreasing'::"text"])))
);


ALTER TABLE "public"."market_intelligence" OWNER TO "postgres";


COMMENT ON TABLE "public"."market_intelligence" IS 'Market-wide intelligence and trends data';



CREATE TABLE IF NOT EXISTS "public"."performance_snapshots" (
    "id" bigint NOT NULL,
    "snapshot_time" timestamp with time zone DEFAULT "now"(),
    "metrics" "jsonb" NOT NULL,
    "alerts" "jsonb" DEFAULT '[]'::"jsonb"
);


ALTER TABLE "public"."performance_snapshots" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."performance_snapshots_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."performance_snapshots_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."performance_snapshots_id_seq" OWNED BY "public"."performance_snapshots"."id";



CREATE TABLE IF NOT EXISTS "public"."price_history" (
    "id" bigint NOT NULL,
    "external_id" character varying NOT NULL,
    "price" integer NOT NULL,
    "recorded_at" timestamp with time zone DEFAULT "now"(),
    "change_type" character varying DEFAULT 'scraped'::character varying
);


ALTER TABLE "public"."price_history" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."price_history_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."price_history_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."price_history_id_seq" OWNED BY "public"."price_history"."id";



CREATE TABLE IF NOT EXISTS "public"."properties" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "external_id" "text",
    "name" "text" NOT NULL,
    "address" "text" NOT NULL,
    "city" "text" NOT NULL,
    "state" "text" NOT NULL,
    "zip" "text",
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "bedrooms" integer NOT NULL,
    "bathrooms" numeric(3,1) NOT NULL,
    "sqft" integer DEFAULT 0 NOT NULL,
    "year_built" integer,
    "property_type" "text" DEFAULT 'apartment'::"text",
    "original_price" integer NOT NULL,
    "ai_price" integer NOT NULL,
    "effective_price" integer NOT NULL,
    "rent_per_sqft" numeric(10,2),
    "savings" integer DEFAULT 0,
    "match_score" integer,
    "success_rate" numeric(5,2),
    "days_vacant" integer DEFAULT 0,
    "market_velocity" "text" DEFAULT 'normal'::"text",
    "availability" "text",
    "availability_type" "text" DEFAULT 'immediate'::"text",
    "features" "text"[] DEFAULT '{}'::"text"[],
    "amenities" "text"[] DEFAULT '{}'::"text"[],
    "pet_policy" "text",
    "parking" "text",
    "apartment_iq_data" "jsonb" DEFAULT '{}'::"jsonb",
    "property_source_id" bigint,
    "scraped_property_id" bigint,
    "is_active" boolean DEFAULT true,
    "source_url" "text",
    "images" "text"[] DEFAULT '{}'::"text"[],
    "last_scraped" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "properties_availability_type_check" CHECK (("availability_type" = ANY (ARRAY['immediate'::"text", 'soon'::"text", 'waitlist'::"text"]))),
    CONSTRAINT "properties_market_velocity_check" CHECK (("market_velocity" = ANY (ARRAY['hot'::"text", 'normal'::"text", 'slow'::"text", 'stale'::"text"]))),
    CONSTRAINT "properties_match_score_check" CHECK ((("match_score" >= 0) AND ("match_score" <= 100))),
    CONSTRAINT "properties_success_rate_check" CHECK ((("success_rate" >= (0)::numeric) AND ("success_rate" <= (100)::numeric)))
);


ALTER TABLE "public"."properties" OWNER TO "postgres";


COMMENT ON TABLE "public"."properties" IS 'Frontend-compatible properties table with enhanced pricing and market intelligence';



CREATE TABLE IF NOT EXISTS "public"."properties_basic" (
    "id" bigint NOT NULL,
    "property_name" "text" NOT NULL,
    "property_url" "text" NOT NULL,
    "year_built" integer,
    "total_units" integer,
    "property_type" "text",
    "management_company" "text",
    "address" "text",
    "city" "text",
    "state" "text",
    "zip_code" "text",
    "confidence_score" numeric(3,2),
    "website_complexity" "text" DEFAULT 'medium'::"text",
    "priority_level" "text" DEFAULT 'medium'::"text",
    "last_verified" "date" DEFAULT CURRENT_DATE,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "properties_basic_confidence_score_check" CHECK ((("confidence_score" >= (0)::numeric) AND ("confidence_score" <= (1)::numeric))),
    CONSTRAINT "properties_basic_priority_level_check" CHECK (("priority_level" = ANY (ARRAY['high'::"text", 'medium'::"text", 'low'::"text"]))),
    CONSTRAINT "properties_basic_website_complexity_check" CHECK (("website_complexity" = ANY (ARRAY['simple'::"text", 'medium'::"text", 'complex'::"text"])))
);


ALTER TABLE "public"."properties_basic" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."properties_basic_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."properties_basic_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."properties_basic_id_seq" OWNED BY "public"."properties_basic"."id";



CREATE TABLE IF NOT EXISTS "public"."property_intelligence" (
    "id" bigint NOT NULL,
    "source_url" "text" NOT NULL,
    "property_name" "text" NOT NULL,
    "year_built" integer,
    "unit_count" integer,
    "property_type" "text",
    "building_type" "text",
    "amenities" "text"[],
    "neighborhood" "text",
    "transit_access" "text",
    "walk_score" integer,
    "confidence_score" integer DEFAULT 0,
    "research_timestamp" timestamp with time zone DEFAULT "now"(),
    "research_source" "text" DEFAULT 'claude'::"text",
    "raw_research_data" "jsonb"
);


ALTER TABLE "public"."property_intelligence" OWNER TO "postgres";


COMMENT ON TABLE "public"."property_intelligence" IS 'Detailed property intelligence data from AI analysis';



COMMENT ON COLUMN "public"."property_intelligence"."source_url" IS 'URL of the property listing that was analyzed';



COMMENT ON COLUMN "public"."property_intelligence"."property_name" IS 'Name of the property as found in the listing';



COMMENT ON COLUMN "public"."property_intelligence"."confidence_score" IS 'AI confidence score (0-100) for this analysis';



COMMENT ON COLUMN "public"."property_intelligence"."research_source" IS 'AI service used: claude, openai, etc.';



COMMENT ON COLUMN "public"."property_intelligence"."raw_research_data" IS 'Raw JSON response from AI service for debugging';



CREATE SEQUENCE IF NOT EXISTS "public"."property_intelligence_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."property_intelligence_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."property_intelligence_id_seq" OWNED BY "public"."property_intelligence"."id";



CREATE TABLE IF NOT EXISTS "public"."property_sources" (
    "id" bigint NOT NULL,
    "url" "text" NOT NULL,
    "property_name" "text",
    "website_name" "text",
    "is_active" boolean DEFAULT true,
    "scrape_frequency" "text" DEFAULT 'weekly'::"text",
    "last_scraped" timestamp with time zone,
    "next_scrape" timestamp with time zone DEFAULT "now"(),
    "priority" integer DEFAULT 1,
    "expected_units" integer,
    "region" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "success_rate" numeric(5,2) DEFAULT 100.0,
    "avg_units_found" integer DEFAULT 0,
    "last_error" "text",
    "consecutive_failures" integer DEFAULT 0,
    "avg_cost_per_scrape" numeric(10,4) DEFAULT 0,
    "total_cost" numeric(10,2) DEFAULT 0,
    "claude_analyzed" boolean DEFAULT false,
    "claude_confidence" integer,
    "intelligence_last_updated" timestamp with time zone,
    CONSTRAINT "property_sources_priority_check" CHECK ((("priority" >= 1) AND ("priority" <= 10))),
    CONSTRAINT "property_sources_scrape_frequency_check" CHECK (("scrape_frequency" = ANY (ARRAY['daily'::"text", 'weekly'::"text", 'monthly'::"text"])))
);


ALTER TABLE "public"."property_sources" OWNER TO "postgres";


COMMENT ON TABLE "public"."property_sources" IS 'Centralized URL management system for property scraping';



COMMENT ON COLUMN "public"."property_sources"."url" IS 'Base URL for property listings';



COMMENT ON COLUMN "public"."property_sources"."scrape_frequency" IS 'How often to scrape: daily, weekly, monthly';



COMMENT ON COLUMN "public"."property_sources"."priority" IS 'Scraping priority (1-10, higher is more important)';



COMMENT ON COLUMN "public"."property_sources"."success_rate" IS 'Success rate percentage (0-100)';



COMMENT ON COLUMN "public"."property_sources"."consecutive_failures" IS 'Number of consecutive scraping failures';



COMMENT ON COLUMN "public"."property_sources"."claude_analyzed" IS 'Whether Claude has analyzed this property source';



CREATE SEQUENCE IF NOT EXISTS "public"."property_sources_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."property_sources_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."property_sources_id_seq" OWNED BY "public"."property_sources"."id";



CREATE TABLE IF NOT EXISTS "public"."rental_offers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "property_id" "uuid",
    "offer_amount" integer NOT NULL,
    "proposed_move_in_date" "date",
    "lease_duration" integer,
    "special_requests" "text",
    "status" "text" DEFAULT 'draft'::"text",
    "success_probability" numeric(3,2),
    "negotiation_strategy" "jsonb" DEFAULT '{}'::"jsonb",
    "expected_savings" integer,
    "landlord_response" "text",
    "counter_offer_amount" integer,
    "final_agreement_amount" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "rental_offers_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'submitted'::"text", 'under_review'::"text", 'accepted'::"text", 'rejected'::"text", 'countered'::"text"])))
);


ALTER TABLE "public"."rental_offers" OWNER TO "postgres";


COMMENT ON TABLE "public"."rental_offers" IS 'User-generated rental offers and negotiation tracking';



CREATE TABLE IF NOT EXISTS "public"."rental_prices" (
    "id" bigint NOT NULL,
    "property_id" bigint NOT NULL,
    "floorplan_name" "text" NOT NULL,
    "bedrooms" integer NOT NULL,
    "bathrooms" numeric(3,1) NOT NULL,
    "sqft" integer,
    "monthly_rent" numeric(10,2) NOT NULL,
    "lease_term_months" integer DEFAULT 12,
    "concessions" "text",
    "availability_date" "date",
    "availability_status" "text" DEFAULT 'available'::"text",
    "extracted_at" timestamp with time zone DEFAULT "now"(),
    "data_source" "text" DEFAULT 'vision_agent'::"text",
    "confidence_score" numeric(3,2),
    "extraction_method" "text" DEFAULT 'automated'::"text",
    "raw_data" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "lease_term" "text",
    CONSTRAINT "rental_prices_availability_status_check" CHECK (("availability_status" = ANY (ARRAY['available'::"text", 'waitlist'::"text", 'occupied'::"text"]))),
    CONSTRAINT "rental_prices_confidence_score_check" CHECK ((("confidence_score" >= (0)::numeric) AND ("confidence_score" <= (1)::numeric)))
);


ALTER TABLE "public"."rental_prices" OWNER TO "postgres";


COMMENT ON COLUMN "public"."rental_prices"."lease_term" IS 'Descriptive lease term (e.g., "12 months", "6 months", "month-to-month", "flexible")';



CREATE SEQUENCE IF NOT EXISTS "public"."rental_prices_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."rental_prices_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."rental_prices_id_seq" OWNED BY "public"."rental_prices"."id";



CREATE TABLE IF NOT EXISTS "public"."scrape_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "apartment_url" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "attempt_count" integer DEFAULT 0 NOT NULL,
    "payload" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "started_at" timestamp with time zone,
    "finished_at" timestamp with time zone
);


ALTER TABLE "public"."scrape_jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scraped_properties" (
    "id" bigint NOT NULL,
    "property_id" character varying NOT NULL,
    "unit_number" character varying NOT NULL,
    "external_id" character varying GENERATED ALWAYS AS (((("property_id")::"text" || '_'::"text") || ("unit_number")::"text")) STORED,
    "source" character varying NOT NULL,
    "name" character varying NOT NULL,
    "address" character varying NOT NULL,
    "unit" character varying,
    "city" character varying NOT NULL,
    "state" character varying(2) NOT NULL,
    "current_price" integer NOT NULL,
    "bedrooms" integer NOT NULL,
    "bathrooms" numeric(2,1) NOT NULL,
    "square_feet" integer,
    "free_rent_concessions" "text",
    "application_fee" integer,
    "admin_fee_waived" boolean DEFAULT false,
    "admin_fee_amount" integer,
    "security_deposit" integer,
    "first_seen_at" timestamp with time zone DEFAULT "now"(),
    "last_seen_at" timestamp with time zone DEFAULT "now"(),
    "status" character varying DEFAULT 'active'::character varying,
    "listing_url" character varying NOT NULL,
    "scraped_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "volatility_score" integer DEFAULT 50,
    "price_change_count" integer DEFAULT 0,
    "last_price_change" timestamp with time zone,
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "square_footage" integer,
    "amenities" "jsonb",
    "zip_code" character varying(10),
    "days_on_market" integer,
    "market_velocity" character varying(20),
    "concession_value" integer,
    "concession_type" character varying(50),
    "unit_features" "jsonb" DEFAULT '[]'::"jsonb",
    "pet_policy" character varying(100),
    "parking_info" character varying(100),
    "property_type" character varying(50),
    "ai_price" integer,
    "effective_price" integer,
    "market_position" character varying(20),
    "percentile_rank" integer,
    "property_source_id" bigint,
    "ai_provider" "text",
    "ai_raw" "jsonb",
    "ai_provenance" "jsonb"
);


ALTER TABLE "public"."scraped_properties" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."scraped_properties_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."scraped_properties_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."scraped_properties_id_seq" OWNED BY "public"."scraped_properties"."id";



CREATE TABLE IF NOT EXISTS "public"."scraping_costs" (
    "date" "date" NOT NULL,
    "properties_scraped" integer DEFAULT 0,
    "ai_requests" integer DEFAULT 0,
    "tokens_used" integer DEFAULT 0,
    "estimated_cost" numeric(10,6) DEFAULT 0,
    "details" "jsonb"
);


ALTER TABLE "public"."scraping_costs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scraping_logs" (
    "id" bigint NOT NULL,
    "scraping_queue_id" bigint,
    "status" "text" NOT NULL,
    "response_time_ms" integer,
    "scrape_duration_ms" integer,
    "confidence_score" double precision,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "scraping_logs_confidence_score_check" CHECK ((("confidence_score" >= (0)::double precision) AND ("confidence_score" <= (1)::double precision))),
    CONSTRAINT "scraping_logs_status_check" CHECK (("status" = ANY (ARRAY['success'::"text", 'error'::"text", 'warning'::"text"])))
);


ALTER TABLE "public"."scraping_logs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."scraping_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."scraping_logs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."scraping_logs_id_seq" OWNED BY "public"."scraping_logs"."id";



CREATE TABLE IF NOT EXISTS "public"."scraping_queue" (
    "id" bigint NOT NULL,
    "external_id" character varying NOT NULL,
    "property_id" character varying NOT NULL,
    "unit_number" character varying NOT NULL,
    "url" character varying NOT NULL,
    "source" character varying NOT NULL,
    "status" character varying DEFAULT 'pending'::character varying,
    "priority" integer DEFAULT 1,
    "data" "jsonb",
    "error" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "priority_tier" integer DEFAULT 2,
    "last_change_date" timestamp with time zone,
    "change_frequency" integer,
    "priority_score" integer DEFAULT 50,
    "last_successful_scrape" timestamp with time zone,
    "scrape_attempts" integer DEFAULT 0,
    "success_rate" numeric(3,2) DEFAULT 1.0,
    "avg_scrape_duration" integer,
    "property_source_id" bigint
);


ALTER TABLE "public"."scraping_queue" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."scraping_queue_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."scraping_queue_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."scraping_queue_id_seq" OWNED BY "public"."scraping_queue"."id";



CREATE OR REPLACE VIEW "public"."scraping_queue_prioritized" AS
 SELECT "sq"."id",
    "sq"."external_id",
    "sq"."property_id",
    "sq"."unit_number",
    "sq"."url",
    "sq"."source",
    "sq"."status",
    "sq"."priority",
    "sq"."data",
    "sq"."error",
    "sq"."created_at",
    "sq"."started_at",
    "sq"."completed_at",
    "sq"."priority_tier",
    "sq"."last_change_date",
    "sq"."change_frequency",
    "sq"."priority_score",
    "sq"."last_successful_scrape",
    "sq"."scrape_attempts",
    "sq"."success_rate",
    "sq"."avg_scrape_duration",
    COALESCE("sp"."volatility_score", 50) AS "volatility_score",
    COALESCE("sp"."price_change_count", 0) AS "price_change_count",
    "sp"."last_price_change",
    COALESCE(("floor"((EXTRACT(epoch FROM ("now"() - "sq"."last_successful_scrape")) / (86400)::numeric)))::integer, 99) AS "days_since_last_scrape",
    "public"."calculate_priority_score"("sq"."property_id", COALESCE(("floor"((EXTRACT(epoch FROM ("now"() - "sq"."last_successful_scrape")) / (86400)::numeric)))::integer, 99), COALESCE("sp"."volatility_score", 50), COALESCE("sq"."success_rate", 1.0), COALESCE("sq"."scrape_attempts", 0)) AS "calculated_score"
   FROM ("public"."scraping_queue" "sq"
     LEFT JOIN "public"."scraped_properties" "sp" ON ((("sq"."external_id")::"text" = ("sp"."external_id")::"text")))
  WHERE (("sq"."status")::"text" = 'pending'::"text");


ALTER VIEW "public"."scraping_queue_prioritized" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sources" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "url" "text" NOT NULL,
    "priority" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "website_type" "text",
    "scraping_strategy" "text",
    "last_scraping_success" boolean DEFAULT false,
    CONSTRAINT "sources_priority_check" CHECK (("priority" = ANY (ARRAY['Low'::"text", 'Medium'::"text", 'High'::"text"])))
);


ALTER TABLE "public"."sources" OWNER TO "postgres";


COMMENT ON COLUMN "public"."sources"."website_type" IS 'Type of real estate website: property_marketing, listing_aggregator, property_manager, brokerage, unknown';



COMMENT ON COLUMN "public"."sources"."scraping_strategy" IS 'Scraping approach to use: property_marketing, listing_aggregator, property_manager, generic';



COMMENT ON COLUMN "public"."sources"."last_scraping_success" IS 'Whether the last scraping attempt was successful';



CREATE SEQUENCE IF NOT EXISTS "public"."sources_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."sources_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."sources_id_seq" OWNED BY "public"."sources"."id";



CREATE TABLE IF NOT EXISTS "public"."system_config" (
    "config_key" "text" NOT NULL,
    "config_value" "jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."system_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_events" (
    "id" bigint NOT NULL,
    "event_type" "text" NOT NULL,
    "event_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."system_events" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."system_events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."system_events_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."system_events_id_seq" OWNED BY "public"."system_events"."id";



CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "user_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "has_completed_social_signup" boolean DEFAULT false,
    "has_completed_ai_programming" boolean DEFAULT false,
    "location" "text",
    "bedrooms" "text",
    "budget" integer,
    "max_budget" integer,
    "current_rent" integer,
    "work_address" "text",
    "max_commute" integer DEFAULT 30,
    "max_drive_time" integer,
    "transportation" "text",
    "work_frequency" "text",
    "work_schedule" "text",
    "employment_type" "text",
    "household_size" "text",
    "lifestyle" "text",
    "pet_info" "text",
    "preferred_amenities" "text"[] DEFAULT '{}'::"text"[],
    "deal_breakers" "text"[] DEFAULT '{}'::"text"[],
    "priorities" "text"[] DEFAULT '{}'::"text"[],
    "other_locations" "jsonb" DEFAULT '[]'::"jsonb",
    "points_of_interest" "jsonb" DEFAULT '[]'::"jsonb",
    "search_radius" integer DEFAULT 25,
    "ai_preferences" "jsonb" DEFAULT '{}'::"jsonb",
    "search_criteria" "jsonb" DEFAULT '{}'::"jsonb",
    "gross_income" integer,
    "credit_score" "text",
    "income_verified" boolean DEFAULT false,
    "negotiation_comfort" "text",
    "rental_history" "text",
    "move_timeline" "text",
    "lease_duration" "text",
    "lease_expiration" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_profiles" IS 'User preferences and profile data for personalized property matching';



CREATE TABLE IF NOT EXISTS "public"."worker_health" (
    "worker_name" "text" NOT NULL,
    "status" "text" NOT NULL,
    "last_ping" timestamp with time zone DEFAULT "now"(),
    "version" "text",
    "metadata" "jsonb",
    CONSTRAINT "worker_health_status_check" CHECK (("status" = ANY (ARRAY['healthy'::"text", 'degraded'::"text", 'down'::"text"])))
);


ALTER TABLE "public"."worker_health" OWNER TO "postgres";


ALTER TABLE ONLY "public"."agent_costs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."agent_costs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."agent_processing_queue" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."agent_processing_queue_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."batch_jobs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."batch_jobs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."performance_snapshots" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."performance_snapshots_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."price_history" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."price_history_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."properties_basic" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."properties_basic_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."property_intelligence" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."property_intelligence_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."property_sources" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."property_sources_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."rental_prices" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."rental_prices_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."scraped_properties" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."scraped_properties_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."scraping_logs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."scraping_logs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."scraping_queue" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."scraping_queue_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."sources" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."sources_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."system_events" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."system_events_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."agent_costs"
    ADD CONSTRAINT "agent_costs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_processing_queue"
    ADD CONSTRAINT "agent_processing_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_results"
    ADD CONSTRAINT "ai_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."apartment_iq_data"
    ADD CONSTRAINT "apartment_iq_data_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."apartments"
    ADD CONSTRAINT "apartments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."apartments"
    ADD CONSTRAINT "apartments_url_key" UNIQUE ("url");



ALTER TABLE ONLY "public"."batch_jobs"
    ADD CONSTRAINT "batch_jobs_batch_id_key" UNIQUE ("batch_id");



ALTER TABLE ONLY "public"."batch_jobs"
    ADD CONSTRAINT "batch_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."failed_scrapes"
    ADD CONSTRAINT "failed_scrapes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."market_intelligence"
    ADD CONSTRAINT "market_intelligence_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."performance_snapshots"
    ADD CONSTRAINT "performance_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."price_history"
    ADD CONSTRAINT "price_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."properties_basic"
    ADD CONSTRAINT "properties_basic_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."properties_basic"
    ADD CONSTRAINT "properties_basic_property_url_key" UNIQUE ("property_url");



ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "properties_external_id_key" UNIQUE ("external_id");



ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "properties_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_intelligence"
    ADD CONSTRAINT "property_intelligence_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_intelligence"
    ADD CONSTRAINT "property_intelligence_source_url_key" UNIQUE ("source_url");



ALTER TABLE ONLY "public"."property_sources"
    ADD CONSTRAINT "property_sources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_sources"
    ADD CONSTRAINT "property_sources_url_key" UNIQUE ("url");



ALTER TABLE ONLY "public"."rental_offers"
    ADD CONSTRAINT "rental_offers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rental_prices"
    ADD CONSTRAINT "rental_prices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scrape_jobs"
    ADD CONSTRAINT "scrape_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scraped_properties"
    ADD CONSTRAINT "scraped_properties_external_id_key" UNIQUE ("external_id");



ALTER TABLE ONLY "public"."scraped_properties"
    ADD CONSTRAINT "scraped_properties_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scraping_costs"
    ADD CONSTRAINT "scraping_costs_pkey" PRIMARY KEY ("date");



ALTER TABLE ONLY "public"."scraping_logs"
    ADD CONSTRAINT "scraping_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scraping_queue"
    ADD CONSTRAINT "scraping_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sources"
    ADD CONSTRAINT "sources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sources"
    ADD CONSTRAINT "sources_url_key" UNIQUE ("url");



ALTER TABLE ONLY "public"."system_config"
    ADD CONSTRAINT "system_config_pkey" PRIMARY KEY ("config_key");



ALTER TABLE ONLY "public"."system_events"
    ADD CONSTRAINT "system_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."worker_health"
    ADD CONSTRAINT "worker_health_pkey" PRIMARY KEY ("worker_name");



CREATE INDEX "idx_agent_costs_date" ON "public"."agent_costs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_agent_costs_property" ON "public"."agent_costs" USING "btree" ("property_id");



CREATE INDEX "idx_agent_costs_type" ON "public"."agent_costs" USING "btree" ("agent_type", "operation_type");



CREATE INDEX "idx_agent_queue_created" ON "public"."agent_processing_queue" USING "btree" ("created_at");



CREATE INDEX "idx_agent_queue_property" ON "public"."agent_processing_queue" USING "btree" ("property_id", "agent_type");



CREATE INDEX "idx_agent_queue_status" ON "public"."agent_processing_queue" USING "btree" ("status", "priority" DESC);



CREATE INDEX "idx_apartment_iq_market" ON "public"."apartment_iq_data" USING "btree" ("market_velocity", "percentile_rank");



CREATE INDEX "idx_apartment_iq_property" ON "public"."apartment_iq_data" USING "btree" ("property_id");



CREATE INDEX "idx_apartment_iq_urgency" ON "public"."apartment_iq_data" USING "btree" ("urgency_score" DESC);



CREATE INDEX "idx_apartments_intelligence_confidence" ON "public"."apartments" USING "btree" ("intelligence_confidence");



CREATE INDEX "idx_apartments_intelligence_source" ON "public"."apartments" USING "btree" ("intelligence_source");



CREATE INDEX "idx_apartments_researched_at" ON "public"."apartments" USING "btree" ("researched_at");



CREATE INDEX "idx_apartments_source_url" ON "public"."apartments" USING "btree" ("source_url");



CREATE INDEX "idx_batch_jobs_created" ON "public"."batch_jobs" USING "btree" ("start_time" DESC);



CREATE INDEX "idx_batch_jobs_status" ON "public"."batch_jobs" USING "btree" ("status");



CREATE INDEX "idx_failed_scrapes_created_at" ON "public"."failed_scrapes" USING "btree" ("created_at");



CREATE INDEX "idx_failed_scrapes_external_id" ON "public"."failed_scrapes" USING "btree" ("external_id");



CREATE INDEX "idx_failed_scrapes_training_batch_id" ON "public"."failed_scrapes" USING "btree" ("training_batch_id");



CREATE INDEX "idx_market_intelligence_location" ON "public"."market_intelligence" USING "btree" ("location");



CREATE INDEX "idx_market_intelligence_timeliness" ON "public"."market_intelligence" USING "btree" ("calculated_at", "valid_until");



CREATE INDEX "idx_performance_snapshots_time" ON "public"."performance_snapshots" USING "btree" ("snapshot_time" DESC);



CREATE INDEX "idx_price_history_external_id" ON "public"."price_history" USING "btree" ("external_id", "recorded_at");



CREATE INDEX "idx_price_history_tracking" ON "public"."price_history" USING "btree" ("external_id", "recorded_at");



CREATE INDEX "idx_properties_active" ON "public"."properties" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_properties_availability" ON "public"."properties" USING "btree" ("availability_type");



CREATE INDEX "idx_properties_basic_confidence" ON "public"."properties_basic" USING "btree" ("confidence_score" DESC);



CREATE INDEX "idx_properties_basic_location" ON "public"."properties_basic" USING "btree" ("city", "state");



CREATE INDEX "idx_properties_basic_priority" ON "public"."properties_basic" USING "btree" ("priority_level", "website_complexity");



CREATE INDEX "idx_properties_basic_url" ON "public"."properties_basic" USING "btree" ("property_url");



CREATE INDEX "idx_properties_basic_verified" ON "public"."properties_basic" USING "btree" ("last_verified");



CREATE INDEX "idx_properties_bedrooms" ON "public"."properties" USING "btree" ("bedrooms");



CREATE INDEX "idx_properties_coordinates" ON "public"."properties" USING "btree" ("latitude", "longitude") WHERE (("latitude" IS NOT NULL) AND ("longitude" IS NOT NULL));



CREATE INDEX "idx_properties_external_id" ON "public"."properties" USING "btree" ("external_id");



CREATE INDEX "idx_properties_location" ON "public"."properties" USING "btree" ("city", "state");



CREATE INDEX "idx_properties_market_velocity" ON "public"."properties" USING "btree" ("market_velocity");



CREATE INDEX "idx_properties_match_score" ON "public"."properties" USING "btree" ("match_score" DESC) WHERE ("match_score" IS NOT NULL);



CREATE INDEX "idx_properties_price_range" ON "public"."properties" USING "btree" ("original_price", "effective_price");



CREATE INDEX "idx_property_intelligence_confidence" ON "public"."property_intelligence" USING "btree" ("confidence_score");



CREATE INDEX "idx_property_intelligence_url" ON "public"."property_intelligence" USING "btree" ("source_url");



CREATE INDEX "idx_property_sources_active_priority" ON "public"."property_sources" USING "btree" ("is_active", "priority" DESC, "next_scrape");



CREATE INDEX "idx_property_sources_next_scrape" ON "public"."property_sources" USING "btree" ("next_scrape") WHERE ("is_active" = true);



CREATE INDEX "idx_property_sources_region" ON "public"."property_sources" USING "btree" ("region") WHERE ("is_active" = true);



CREATE INDEX "idx_property_sources_success_rate" ON "public"."property_sources" USING "btree" ("success_rate" DESC);



CREATE INDEX "idx_property_sources_website" ON "public"."property_sources" USING "btree" ("website_name");



CREATE INDEX "idx_queue_priority" ON "public"."scraping_queue" USING "btree" ("priority", "status");



CREATE INDEX "idx_queue_schedule_priority_tier" ON "public"."scraping_queue" USING "btree" ("priority_tier", "status", "created_at");



CREATE INDEX "idx_rental_prices_availability" ON "public"."rental_prices" USING "btree" ("availability_date", "availability_status");



CREATE INDEX "idx_rental_prices_bedrooms" ON "public"."rental_prices" USING "btree" ("bedrooms", "bathrooms");



CREATE INDEX "idx_rental_prices_data_source" ON "public"."rental_prices" USING "btree" ("data_source");



CREATE INDEX "idx_rental_prices_extracted" ON "public"."rental_prices" USING "btree" ("extracted_at" DESC);



CREATE INDEX "idx_rental_prices_lease_term" ON "public"."rental_prices" USING "btree" ("lease_term");



CREATE INDEX "idx_rental_prices_property" ON "public"."rental_prices" USING "btree" ("property_id");



CREATE INDEX "idx_rental_prices_rent" ON "public"."rental_prices" USING "btree" ("monthly_rent");



CREATE INDEX "idx_scraped_properties_amenities" ON "public"."scraped_properties" USING "gin" ("amenities");



CREATE INDEX "idx_scraped_properties_coordinates" ON "public"."scraped_properties" USING "gist" ("point"(("longitude")::double precision, ("latitude")::double precision));



CREATE INDEX "idx_scraped_properties_days_market" ON "public"."scraped_properties" USING "btree" ("first_seen_at", "last_seen_at");



CREATE INDEX "idx_scraped_properties_market" ON "public"."scraped_properties" USING "btree" ("days_on_market", "market_velocity");



CREATE INDEX "idx_scraped_properties_percentile_rank" ON "public"."scraped_properties" USING "btree" ("percentile_rank");



CREATE UNIQUE INDEX "idx_scraped_properties_prop_unit_unique" ON "public"."scraped_properties" USING "btree" ("property_id", "unit_number");



CREATE INDEX "idx_scraped_properties_source_id" ON "public"."scraped_properties" USING "btree" ("property_source_id");



CREATE INDEX "idx_scraped_properties_unit_features" ON "public"."scraped_properties" USING "gin" ("unit_features");



CREATE INDEX "idx_scraped_properties_unit_lookup" ON "public"."scraped_properties" USING "btree" ("property_id", "unit_number");



CREATE INDEX "idx_scraping_costs_date" ON "public"."scraping_costs" USING "btree" ("date" DESC);



CREATE INDEX "idx_scraping_logs_created" ON "public"."scraping_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_scraping_logs_status" ON "public"."scraping_logs" USING "btree" ("status");



CREATE INDEX "idx_scraping_queue_source_id" ON "public"."scraping_queue" USING "btree" ("property_source_id");



CREATE INDEX "idx_sources_scraping_strategy" ON "public"."sources" USING "btree" ("scraping_strategy");



CREATE INDEX "idx_sources_website_type" ON "public"."sources" USING "btree" ("website_type");



CREATE INDEX "idx_system_events_created" ON "public"."system_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_system_events_type" ON "public"."system_events" USING "btree" ("event_type");



CREATE OR REPLACE TRIGGER "trg_price_history_on_change" AFTER INSERT OR UPDATE OF "current_price" ON "public"."scraped_properties" FOR EACH ROW EXECUTE FUNCTION "public"."price_history_record_change"();



CREATE OR REPLACE TRIGGER "update_apartment_iq_data_updated_at" BEFORE UPDATE ON "public"."apartment_iq_data" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_properties_updated_at" BEFORE UPDATE ON "public"."properties" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_property_sources_updated_at" BEFORE UPDATE ON "public"."property_sources" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_rental_offers_updated_at" BEFORE UPDATE ON "public"."rental_offers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_sources_updated_at" BEFORE UPDATE ON "public"."sources" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_profiles_updated_at" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."agent_costs"
    ADD CONSTRAINT "agent_costs_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties_basic"("id");



ALTER TABLE ONLY "public"."agent_processing_queue"
    ADD CONSTRAINT "agent_processing_queue_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties_basic"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_results"
    ADD CONSTRAINT "ai_results_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."scrape_jobs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."apartment_iq_data"
    ADD CONSTRAINT "apartment_iq_data_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "properties_property_source_id_fkey" FOREIGN KEY ("property_source_id") REFERENCES "public"."property_sources"("id");



ALTER TABLE ONLY "public"."rental_offers"
    ADD CONSTRAINT "rental_offers_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rental_offers"
    ADD CONSTRAINT "rental_offers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rental_prices"
    ADD CONSTRAINT "rental_prices_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties_basic"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scraped_properties"
    ADD CONSTRAINT "scraped_properties_property_source_id_fkey" FOREIGN KEY ("property_source_id") REFERENCES "public"."property_sources"("id");



ALTER TABLE ONLY "public"."scraping_queue"
    ADD CONSTRAINT "scraping_queue_property_source_id_fkey" FOREIGN KEY ("property_source_id") REFERENCES "public"."property_sources"("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Anonymous users read active properties" ON "public"."properties" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anonymous users read apartments" ON "public"."apartments" FOR SELECT USING (true);



COMMENT ON POLICY "Anonymous users read apartments" ON "public"."apartments" IS 'Public read access to apartment listings';



CREATE POLICY "Authenticated users read access" ON "public"."apartment_iq_data" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users read access" ON "public"."apartments" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



COMMENT ON POLICY "Authenticated users read access" ON "public"."apartments" IS 'Read-only access for authenticated dashboard users';



CREATE POLICY "Authenticated users read access" ON "public"."market_intelligence" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users read access" ON "public"."price_history" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users read access" ON "public"."properties" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users read access" ON "public"."properties_basic" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users read access" ON "public"."property_intelligence" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users read access" ON "public"."property_sources" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users read access" ON "public"."rental_prices" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users read access" ON "public"."scraped_properties" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Service role can do anything" ON "public"."sources" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access" ON "public"."agent_costs" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access" ON "public"."agent_processing_queue" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access" ON "public"."ai_results" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access" ON "public"."apartment_iq_data" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access" ON "public"."apartments" USING (("auth"."role"() = 'service_role'::"text"));



COMMENT ON POLICY "Service role full access" ON "public"."apartments" IS 'Full access for backend scraping operations';



CREATE POLICY "Service role full access" ON "public"."market_intelligence" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access" ON "public"."price_history" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access" ON "public"."properties" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access" ON "public"."properties_basic" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access" ON "public"."property_intelligence" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access" ON "public"."property_sources" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access" ON "public"."rental_offers" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access" ON "public"."rental_prices" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access" ON "public"."scrape_jobs" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access" ON "public"."scraped_properties" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access" ON "public"."scraping_costs" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access" ON "public"."scraping_logs" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access" ON "public"."scraping_queue" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access" ON "public"."user_profiles" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Users can insert own profile" ON "public"."user_profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own offers" ON "public"."rental_offers" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."user_profiles" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own profile" ON "public"."user_profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."agent_costs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_processing_queue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_results" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."apartment_iq_data" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."apartments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."market_intelligence" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."price_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."properties" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."properties_basic" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."property_intelligence" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."property_sources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rental_offers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rental_prices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scrape_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scraped_properties" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scraping_costs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scraping_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scraping_queue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";































































































































































GRANT ALL ON FUNCTION "public"."add_property_source"("source_url" "text", "source_property_name" "text", "source_website_name" "text", "source_region" "text", "source_priority" integer, "source_frequency" "text", "source_expected_units" integer, "source_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."add_property_source"("source_url" "text", "source_property_name" "text", "source_website_name" "text", "source_region" "text", "source_priority" integer, "source_frequency" "text", "source_expected_units" integer, "source_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_property_source"("source_url" "text", "source_property_name" "text", "source_website_name" "text", "source_region" "text", "source_priority" integer, "source_frequency" "text", "source_expected_units" integer, "source_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_next_scrape_time"("frequency" "text", "base_time" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_next_scrape_time"("frequency" "text", "base_time" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_next_scrape_time"("frequency" "text", "base_time" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_priority_score"("p_property_id" character varying, "p_days_since_last_scrape" integer, "p_volatility_score" integer, "p_success_rate" numeric, "p_scrape_attempts" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_priority_score"("p_property_id" character varying, "p_days_since_last_scrape" integer, "p_volatility_score" integer, "p_success_rate" numeric, "p_scrape_attempts" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_priority_score"("p_property_id" character varying, "p_days_since_last_scrape" integer, "p_volatility_score" integer, "p_success_rate" numeric, "p_scrape_attempts" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_property_match_score"("property_id_param" "uuid", "user_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_property_match_score"("property_id_param" "uuid", "user_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_property_match_score"("property_id_param" "uuid", "user_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_data"("days_to_keep" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_data"("days_to_keep" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_data"("days_to_keep" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_database_size"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_database_size"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_database_size"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_next_agent_property"("agent_type_param" "text", "priority_level_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_next_agent_property"("agent_type_param" "text", "priority_level_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_next_agent_property"("agent_type_param" "text", "priority_level_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_next_property_sources_batch"("batch_size" integer, "region_filter" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_next_property_sources_batch"("batch_size" integer, "region_filter" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_next_property_sources_batch"("batch_size" integer, "region_filter" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_next_scraping_batch"("batch_size" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_next_scraping_batch"("batch_size" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_next_scraping_batch"("batch_size" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_queue_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_queue_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_queue_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_property_changed"("old_data" "jsonb", "new_data" "jsonb", "significant_fields" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."has_property_changed"("old_data" "jsonb", "new_data" "jsonb", "significant_fields" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_property_changed"("old_data" "jsonb", "new_data" "jsonb", "significant_fields" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."has_property_changed_default"("old_data" "jsonb", "new_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."has_property_changed_default"("old_data" "jsonb", "new_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_property_changed_default"("old_data" "jsonb", "new_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."price_history_record_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."price_history_record_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."price_history_record_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reprocess_failed_scrapes"("p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."reprocess_failed_scrapes"("p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."reprocess_failed_scrapes"("p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_bulk_upsert_properties"("p_rows" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_bulk_upsert_properties"("p_rows" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_bulk_upsert_properties"("p_rows" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_bulk_upsert_properties_v2"("p_rows" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_bulk_upsert_properties_v2"("p_rows" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_bulk_upsert_properties_v2"("p_rows" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_compute_percentile"("p_external_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_compute_percentile"("p_external_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_compute_percentile"("p_external_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_inc_scraping_costs"("operation_type" "text", "cost_amount" numeric, "metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_inc_scraping_costs"("operation_type" "text", "cost_amount" numeric, "metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_inc_scraping_costs"("operation_type" "text", "cost_amount" numeric, "metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_inc_scraping_costs"("p_date" "date", "p_properties_scraped" integer, "p_ai_requests" integer, "p_tokens_used" integer, "p_estimated_cost" numeric, "p_details" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_inc_scraping_costs"("p_date" "date", "p_properties_scraped" integer, "p_ai_requests" integer, "p_tokens_used" integer, "p_estimated_cost" numeric, "p_details" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_inc_scraping_costs"("p_date" "date", "p_properties_scraped" integer, "p_ai_requests" integer, "p_tokens_used" integer, "p_estimated_cost" numeric, "p_details" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_inc_scraping_costs"("p_date" "date", "p_properties_scraped" integer, "p_ai_requests" integer, "p_tokens_used" bigint, "p_estimated_cost" numeric, "p_details" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_inc_scraping_costs"("p_date" "date", "p_properties_scraped" integer, "p_ai_requests" integer, "p_tokens_used" bigint, "p_estimated_cost" numeric, "p_details" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_inc_scraping_costs"("p_date" "date", "p_properties_scraped" integer, "p_ai_requests" integer, "p_tokens_used" bigint, "p_estimated_cost" numeric, "p_details" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_merge_apartments_to_scraped_v1"("p_rows" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_merge_apartments_to_scraped_v1"("p_rows" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_merge_apartments_to_scraped_v1"("p_rows" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_reprocess_failed_scrapes_by_batch"("p_batch_id" "uuid", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_reprocess_failed_scrapes_by_batch"("p_batch_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_reprocess_failed_scrapes_by_batch"("p_batch_id" "uuid", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_update_failed_scrape_training_status"("p_batch_id" "uuid", "p_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_update_failed_scrape_training_status"("p_batch_id" "uuid", "p_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_update_failed_scrape_training_status"("p_batch_id" "uuid", "p_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_update_property_with_history"("p_external_id" "text", "p_payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_update_property_with_history"("p_external_id" "text", "p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_update_property_with_history"("p_external_id" "text", "p_payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_properties_near_location"("lat" numeric, "lng" numeric, "radius_km" integer, "min_bedrooms" integer, "max_bedrooms" integer, "min_price" integer, "max_price" integer, "user_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."search_properties_near_location"("lat" numeric, "lng" numeric, "radius_km" integer, "min_bedrooms" integer, "max_bedrooms" integer, "min_price" integer, "max_price" integer, "user_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_properties_near_location"("lat" numeric, "lng" numeric, "radius_km" integer, "min_bedrooms" integer, "max_bedrooms" integer, "min_price" integer, "max_price" integer, "user_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_scraped_properties"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_scraped_properties"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_scraped_properties"() TO "service_role";



GRANT ALL ON FUNCTION "public"."transform_scraped_to_properties"() TO "anon";
GRANT ALL ON FUNCTION "public"."transform_scraped_to_properties"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."transform_scraped_to_properties"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_days_on_market"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_days_on_market"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_days_on_market"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_property_priorities"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_property_priorities"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_property_priorities"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_property_source_metrics"("source_id" bigint, "units_found" integer, "scrape_cost" numeric, "success" boolean, "error_message" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_property_source_metrics"("source_id" bigint, "units_found" integer, "scrape_cost" numeric, "success" boolean, "error_message" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_property_source_metrics"("source_id" bigint, "units_found" integer, "scrape_cost" numeric, "success" boolean, "error_message" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_queue_status"("p_id" bigint, "p_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_queue_status"("p_id" bigint, "p_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_queue_status"("p_id" bigint, "p_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_scraping_metrics"("p_external_id" character varying, "p_success" boolean, "p_duration" integer, "p_price_changed" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_scraping_metrics"("p_external_id" character varying, "p_success" boolean, "p_duration" integer, "p_price_changed" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_scraping_metrics"("p_external_id" character varying, "p_success" boolean, "p_duration" integer, "p_price_changed" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."agent_costs" TO "anon";
GRANT ALL ON TABLE "public"."agent_costs" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_costs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."agent_costs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."agent_costs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."agent_costs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."agent_processing_queue" TO "anon";
GRANT ALL ON TABLE "public"."agent_processing_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_processing_queue" TO "service_role";



GRANT ALL ON SEQUENCE "public"."agent_processing_queue_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."agent_processing_queue_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."agent_processing_queue_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."ai_results" TO "anon";
GRANT ALL ON TABLE "public"."ai_results" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_results" TO "service_role";



GRANT ALL ON TABLE "public"."apartment_iq_data" TO "anon";
GRANT ALL ON TABLE "public"."apartment_iq_data" TO "authenticated";
GRANT ALL ON TABLE "public"."apartment_iq_data" TO "service_role";



GRANT ALL ON TABLE "public"."apartments" TO "anon";
GRANT ALL ON TABLE "public"."apartments" TO "authenticated";
GRANT ALL ON TABLE "public"."apartments" TO "service_role";



GRANT ALL ON TABLE "public"."batch_jobs" TO "anon";
GRANT ALL ON TABLE "public"."batch_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."batch_jobs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."batch_jobs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."batch_jobs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."batch_jobs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."failed_scrapes" TO "anon";
GRANT ALL ON TABLE "public"."failed_scrapes" TO "authenticated";
GRANT ALL ON TABLE "public"."failed_scrapes" TO "service_role";



GRANT ALL ON SEQUENCE "public"."failed_scrapes_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."failed_scrapes_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."failed_scrapes_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."market_intelligence" TO "anon";
GRANT ALL ON TABLE "public"."market_intelligence" TO "authenticated";
GRANT ALL ON TABLE "public"."market_intelligence" TO "service_role";



GRANT ALL ON TABLE "public"."performance_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."performance_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."performance_snapshots" TO "service_role";



GRANT ALL ON SEQUENCE "public"."performance_snapshots_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."performance_snapshots_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."performance_snapshots_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."price_history" TO "anon";
GRANT ALL ON TABLE "public"."price_history" TO "authenticated";
GRANT ALL ON TABLE "public"."price_history" TO "service_role";



GRANT ALL ON SEQUENCE "public"."price_history_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."price_history_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."price_history_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."properties" TO "anon";
GRANT ALL ON TABLE "public"."properties" TO "authenticated";
GRANT ALL ON TABLE "public"."properties" TO "service_role";



GRANT ALL ON TABLE "public"."properties_basic" TO "anon";
GRANT ALL ON TABLE "public"."properties_basic" TO "authenticated";
GRANT ALL ON TABLE "public"."properties_basic" TO "service_role";



GRANT ALL ON SEQUENCE "public"."properties_basic_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."properties_basic_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."properties_basic_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."property_intelligence" TO "anon";
GRANT ALL ON TABLE "public"."property_intelligence" TO "authenticated";
GRANT ALL ON TABLE "public"."property_intelligence" TO "service_role";



GRANT ALL ON SEQUENCE "public"."property_intelligence_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."property_intelligence_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."property_intelligence_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."property_sources" TO "anon";
GRANT ALL ON TABLE "public"."property_sources" TO "authenticated";
GRANT ALL ON TABLE "public"."property_sources" TO "service_role";



GRANT ALL ON SEQUENCE "public"."property_sources_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."property_sources_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."property_sources_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."rental_offers" TO "anon";
GRANT ALL ON TABLE "public"."rental_offers" TO "authenticated";
GRANT ALL ON TABLE "public"."rental_offers" TO "service_role";



GRANT ALL ON TABLE "public"."rental_prices" TO "anon";
GRANT ALL ON TABLE "public"."rental_prices" TO "authenticated";
GRANT ALL ON TABLE "public"."rental_prices" TO "service_role";



GRANT ALL ON SEQUENCE "public"."rental_prices_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."rental_prices_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."rental_prices_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."scrape_jobs" TO "anon";
GRANT ALL ON TABLE "public"."scrape_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."scrape_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."scraped_properties" TO "anon";
GRANT ALL ON TABLE "public"."scraped_properties" TO "authenticated";
GRANT ALL ON TABLE "public"."scraped_properties" TO "service_role";



GRANT ALL ON SEQUENCE "public"."scraped_properties_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."scraped_properties_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."scraped_properties_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."scraping_costs" TO "anon";
GRANT ALL ON TABLE "public"."scraping_costs" TO "authenticated";
GRANT ALL ON TABLE "public"."scraping_costs" TO "service_role";



GRANT ALL ON TABLE "public"."scraping_logs" TO "anon";
GRANT ALL ON TABLE "public"."scraping_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."scraping_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."scraping_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."scraping_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."scraping_logs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."scraping_queue" TO "anon";
GRANT ALL ON TABLE "public"."scraping_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."scraping_queue" TO "service_role";



GRANT ALL ON SEQUENCE "public"."scraping_queue_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."scraping_queue_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."scraping_queue_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."scraping_queue_prioritized" TO "anon";
GRANT ALL ON TABLE "public"."scraping_queue_prioritized" TO "authenticated";
GRANT ALL ON TABLE "public"."scraping_queue_prioritized" TO "service_role";



GRANT ALL ON TABLE "public"."sources" TO "anon";
GRANT ALL ON TABLE "public"."sources" TO "authenticated";
GRANT ALL ON TABLE "public"."sources" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sources_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sources_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sources_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."system_config" TO "anon";
GRANT ALL ON TABLE "public"."system_config" TO "authenticated";
GRANT ALL ON TABLE "public"."system_config" TO "service_role";



GRANT ALL ON TABLE "public"."system_events" TO "anon";
GRANT ALL ON TABLE "public"."system_events" TO "authenticated";
GRANT ALL ON TABLE "public"."system_events" TO "service_role";



GRANT ALL ON SEQUENCE "public"."system_events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."system_events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."system_events_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."worker_health" TO "anon";
GRANT ALL ON TABLE "public"."worker_health" TO "authenticated";
GRANT ALL ON TABLE "public"."worker_health" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























\unrestrict evFz15qvMzjbLpworjk7W4Anq0GtzWJgS4S23Bgo7gB6FNnXNHDMbaI2PYluaKA

RESET ALL;
