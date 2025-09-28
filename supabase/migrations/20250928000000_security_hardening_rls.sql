-- Security Hardening: Enable RLS on all tables
-- Migration: 20250928000000_security_hardening_rls.sql
-- This migration enables Row Level Security (RLS) on all tables and creates secure policies

-- Enable RLS on all tables
ALTER TABLE public.apartments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrape_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraped_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraping_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraping_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraping_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraping_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_intelligence ENABLE ROW LEVEL SECURITY;

-- Create secure policies for service role (full access for backend operations)
CREATE POLICY "Service role full access" ON public.apartments
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON public.scrape_jobs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON public.ai_results
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON public.scraped_properties
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON public.price_history
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON public.scraping_queue
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON public.scraping_logs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON public.scraping_cache
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON public.scraping_costs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON public.property_intelligence
    FOR ALL USING (auth.role() = 'service_role');

-- Create read-only policies for authenticated users (for dashboard/analytics)
CREATE POLICY "Authenticated users read access" ON public.apartments
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users read access" ON public.scraped_properties
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users read access" ON public.price_history
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users read access" ON public.property_intelligence
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create policies for anonymous users (public read access to apartments only)
CREATE POLICY "Anonymous users read apartments" ON public.apartments
    FOR SELECT USING (true);

-- Secure all existing functions with proper search_path
-- Update functions to use security definer with explicit search path

-- Secure the price history trigger function
CREATE OR REPLACE FUNCTION public.price_history_record_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

-- Secure the updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Secure the get_next_scraping_batch function
CREATE OR REPLACE FUNCTION public.get_next_scraping_batch(batch_size INTEGER DEFAULT 50)
RETURNS TABLE(
  id BIGINT,
  external_id VARCHAR,
  property_id VARCHAR,
  unit_number VARCHAR,
  url VARCHAR,
  source VARCHAR,
  priority INTEGER,
  data JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.scraping_queue 
  SET status = 'processing', started_at = NOW()
  WHERE id IN (
    SELECT sq.id 
    FROM public.scraping_queue sq
    WHERE sq.status = 'pending'
    ORDER BY sq.priority DESC, sq.created_at ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING 
    scraping_queue.id,
    scraping_queue.external_id,
    scraping_queue.property_id,
    scraping_queue.unit_number,
    scraping_queue.url,
    scraping_queue.source,
    scraping_queue.priority,
    scraping_queue.data;
END;
$$;

-- Secure the bulk upsert function
CREATE OR REPLACE FUNCTION public.rpc_bulk_upsert_properties(properties_data JSONB)
RETURNS TABLE(upserted_count INTEGER, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  property_record JSONB;
  upsert_count INTEGER := 0;
BEGIN
  FOR property_record IN SELECT jsonb_array_elements(properties_data)
  LOOP
    BEGIN
      INSERT INTO public.scraped_properties (
        external_id, source, name, address, city, state, current_price,
        bedrooms, bathrooms, square_feet, listing_url, scraped_at
      )
      VALUES (
        (property_record->>'external_id')::VARCHAR,
        (property_record->>'source')::VARCHAR,
        (property_record->>'name')::VARCHAR,
        (property_record->>'address')::VARCHAR,
        (property_record->>'city')::VARCHAR,
        (property_record->>'state')::VARCHAR,
        (property_record->>'current_price')::INTEGER,
        (property_record->>'bedrooms')::INTEGER,
        (property_record->>'bathrooms')::DECIMAL(2,1),
        (property_record->>'square_feet')::INTEGER,
        (property_record->>'listing_url')::VARCHAR,
        NOW()
      )
      ON CONFLICT (external_id) DO UPDATE SET
        current_price = EXCLUDED.current_price,
        last_seen_at = NOW(),
        scraped_at = NOW(),
        updated_at = NOW();
      
      upsert_count := upsert_count + 1;
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT 0, SQLERRM;
      RETURN;
    END;
  END LOOP;
  
  RETURN QUERY SELECT upsert_count, NULL::TEXT;
END;
$$;

-- Secure cost tracking function
CREATE OR REPLACE FUNCTION public.rpc_inc_scraping_costs(
  operation_type TEXT,
  cost_amount DECIMAL(10,4),
  metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.scraping_costs (operation_type, cost, metadata, recorded_at)
  VALUES (operation_type, cost_amount, metadata, NOW());
  
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$;

-- Grant necessary permissions to service role
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Grant read permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.apartments TO authenticated;
GRANT SELECT ON public.scraped_properties TO authenticated;
GRANT SELECT ON public.price_history TO authenticated;
GRANT SELECT ON public.property_intelligence TO authenticated;

-- Grant minimal permissions to anonymous users
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.apartments TO anon;

-- Add security comments
COMMENT ON POLICY "Service role full access" ON public.apartments IS 'Full access for backend scraping operations';
COMMENT ON POLICY "Authenticated users read access" ON public.apartments IS 'Read-only access for authenticated dashboard users';
COMMENT ON POLICY "Anonymous users read apartments" ON public.apartments IS 'Public read access to apartment listings';

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Security hardening complete: RLS enabled on all tables, functions secured with search_path';
END $$;