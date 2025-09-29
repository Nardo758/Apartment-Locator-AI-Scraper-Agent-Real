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