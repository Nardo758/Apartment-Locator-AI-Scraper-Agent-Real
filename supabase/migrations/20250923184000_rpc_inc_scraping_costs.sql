-- Idempotent: CREATE OR REPLACE ensures the function is updated if it exists.
CREATE OR REPLACE FUNCTION public.rpc_inc_scraping_costs(
  p_date date,
  p_properties_scraped integer DEFAULT 0,
  p_ai_requests integer DEFAULT 0,
  p_tokens_used bigint DEFAULT 0,
  p_estimated_cost numeric DEFAULT 0,
  p_details jsonb DEFAULT '{}'::jsonb
) RETURNS void AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
