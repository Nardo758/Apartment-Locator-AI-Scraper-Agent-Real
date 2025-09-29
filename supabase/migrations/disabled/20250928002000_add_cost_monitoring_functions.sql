-- Cost Monitoring and Statistics Functions
-- Migration: 20250928002000_add_cost_monitoring_functions.sql

-- Function to get daily scraping cost
CREATE OR REPLACE FUNCTION public.get_daily_scraping_cost(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(cost DECIMAL(10,4))
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT COALESCE(SUM(sc.cost), 0)::DECIMAL(10,4) as cost
  FROM public.scraping_costs sc
  WHERE DATE(sc.recorded_at) = target_date;
END;
$$;

-- Function to get daily scraping statistics
CREATE OR REPLACE FUNCTION public.get_daily_scraping_stats(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
  total_cost DECIMAL(10,4),
  total_properties INTEGER,
  total_operations INTEGER,
  success_rate DECIMAL(5,2),
  avg_cost_per_property DECIMAL(10,4),
  top_operations JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  daily_cost DECIMAL(10,4);
  property_count INTEGER;
  operation_count INTEGER;
  successful_ops INTEGER;
  avg_cost DECIMAL(10,4);
  success_pct DECIMAL(5,2);
  top_ops JSONB;
BEGIN
  -- Get total daily cost
  SELECT COALESCE(SUM(sc.cost), 0) INTO daily_cost
  FROM public.scraping_costs sc
  WHERE DATE(sc.recorded_at) = target_date;
  
  -- Get total properties processed (from metadata)
  SELECT COALESCE(SUM((sc.metadata->>'properties_processed')::INTEGER), 0) INTO property_count
  FROM public.scraping_costs sc
  WHERE DATE(sc.recorded_at) = target_date
    AND sc.metadata ? 'properties_processed';
  
  -- Get operation count
  SELECT COUNT(*) INTO operation_count
  FROM public.scraping_costs sc
  WHERE DATE(sc.recorded_at) = target_date;
  
  -- Calculate success rate (operations with properties > 0)
  SELECT COUNT(*) INTO successful_ops
  FROM public.scraping_costs sc
  WHERE DATE(sc.recorded_at) = target_date
    AND (sc.metadata->>'properties_processed')::INTEGER > 0;
  
  success_pct := CASE 
    WHEN operation_count > 0 THEN (successful_ops::DECIMAL / operation_count::DECIMAL * 100)
    ELSE 0 
  END;
  
  -- Calculate average cost per property
  avg_cost := CASE 
    WHEN property_count > 0 THEN daily_cost / property_count
    ELSE 0 
  END;
  
  -- Get top operation types
  SELECT jsonb_agg(
    jsonb_build_object(
      'operation_type', operation_type,
      'count', op_count,
      'total_cost', total_cost
    )
  ) INTO top_ops
  FROM (
    SELECT 
      sc.operation_type,
      COUNT(*) as op_count,
      SUM(sc.cost) as total_cost
    FROM public.scraping_costs sc
    WHERE DATE(sc.recorded_at) = target_date
    GROUP BY sc.operation_type
    ORDER BY total_cost DESC
    LIMIT 5
  ) top_operations;
  
  RETURN QUERY SELECT 
    daily_cost,
    property_count,
    operation_count,
    success_pct,
    avg_cost,
    COALESCE(top_ops, '[]'::jsonb);
END;
$$;

-- Function to get weekly cost trends
CREATE OR REPLACE FUNCTION public.get_weekly_cost_trends(weeks_back INTEGER DEFAULT 4)
RETURNS TABLE(
  week_start DATE,
  total_cost DECIMAL(10,4),
  total_properties INTEGER,
  avg_daily_cost DECIMAL(10,4),
  success_rate DECIMAL(5,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  WITH weekly_stats AS (
    SELECT 
      DATE_TRUNC('week', sc.recorded_at)::DATE as week_start,
      SUM(sc.cost) as week_cost,
      SUM(COALESCE((sc.metadata->>'properties_processed')::INTEGER, 0)) as week_properties,
      COUNT(*) as total_ops,
      COUNT(CASE WHEN (sc.metadata->>'properties_processed')::INTEGER > 0 THEN 1 END) as successful_ops
    FROM public.scraping_costs sc
    WHERE sc.recorded_at >= CURRENT_DATE - INTERVAL '%s weeks' % weeks_back
    GROUP BY DATE_TRUNC('week', sc.recorded_at)
    ORDER BY week_start DESC
  )
  SELECT 
    ws.week_start,
    ws.week_cost,
    ws.week_properties,
    (ws.week_cost / 7)::DECIMAL(10,4) as avg_daily_cost,
    CASE 
      WHEN ws.total_ops > 0 THEN (ws.successful_ops::DECIMAL / ws.total_ops::DECIMAL * 100)::DECIMAL(5,2)
      ELSE 0::DECIMAL(5,2)
    END as success_rate
  FROM weekly_stats ws;
END;
$$;

-- Function to get property source performance metrics
CREATE OR REPLACE FUNCTION public.get_property_source_performance(days_back INTEGER DEFAULT 30)
RETURNS TABLE(
  source_id BIGINT,
  property_name TEXT,
  website_name TEXT,
  region TEXT,
  success_rate DECIMAL(5,2),
  avg_units_found INTEGER,
  total_cost DECIMAL(10,2),
  avg_cost_per_scrape DECIMAL(10,4),
  last_scraped TIMESTAMPTZ,
  consecutive_failures INTEGER,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.id,
    ps.property_name,
    ps.website_name,
    ps.region,
    ps.success_rate,
    ps.avg_units_found,
    ps.total_cost,
    ps.avg_cost_per_scrape,
    ps.last_scraped,
    ps.consecutive_failures,
    ps.is_active
  FROM public.property_sources ps
  WHERE ps.last_scraped >= CURRENT_DATE - INTERVAL '%s days' % days_back
     OR ps.last_scraped IS NULL
  ORDER BY ps.success_rate DESC, ps.total_cost DESC;
END;
$$;

-- Function to identify underperforming sources
CREATE OR REPLACE FUNCTION public.get_underperforming_sources(
  min_success_rate DECIMAL DEFAULT 50.0,
  min_scrapes INTEGER DEFAULT 3
)
RETURNS TABLE(
  source_id BIGINT,
  property_name TEXT,
  website_name TEXT,
  success_rate DECIMAL(5,2),
  consecutive_failures INTEGER,
  avg_units_found INTEGER,
  recommendation TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.id,
    ps.property_name,
    ps.website_name,
    ps.success_rate,
    ps.consecutive_failures,
    ps.avg_units_found,
    CASE 
      WHEN ps.consecutive_failures >= 5 THEN 'DISABLE - Too many consecutive failures'
      WHEN ps.success_rate < min_success_rate AND ps.avg_units_found < 5 THEN 'REVIEW - Low success rate and unit count'
      WHEN ps.success_rate < min_success_rate THEN 'MONITOR - Low success rate'
      WHEN ps.avg_units_found < 3 THEN 'INVESTIGATE - Very low unit yield'
      ELSE 'OPTIMIZE - Below threshold'
    END as recommendation
  FROM public.property_sources ps
  WHERE ps.is_active = true
    AND (
      ps.success_rate < min_success_rate 
      OR ps.consecutive_failures >= 3
      OR ps.avg_units_found < 5
    )
    AND COALESCE(ps.total_cost / NULLIF(ps.avg_cost_per_scrape, 0), 0) >= min_scrapes
  ORDER BY ps.consecutive_failures DESC, ps.success_rate ASC;
END;
$$;

-- Function to get cost projections
CREATE OR REPLACE FUNCTION public.get_cost_projections(days_ahead INTEGER DEFAULT 30)
RETURNS TABLE(
  projection_date DATE,
  projected_daily_cost DECIMAL(10,4),
  projected_monthly_cost DECIMAL(10,2),
  confidence_level TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  avg_daily_cost DECIMAL(10,4);
  cost_variance DECIMAL(10,4);
  trend_factor DECIMAL(5,3);
BEGIN
  -- Calculate average daily cost over last 14 days
  SELECT AVG(daily_cost), STDDEV(daily_cost) INTO avg_daily_cost, cost_variance
  FROM (
    SELECT 
      DATE(sc.recorded_at) as cost_date,
      SUM(sc.cost) as daily_cost
    FROM public.scraping_costs sc
    WHERE sc.recorded_at >= CURRENT_DATE - INTERVAL '14 days'
    GROUP BY DATE(sc.recorded_at)
  ) daily_costs;
  
  -- Calculate trend (simple linear trend over last 7 vs previous 7 days)
  WITH recent_avg AS (
    SELECT AVG(daily_cost) as recent_cost
    FROM (
      SELECT DATE(sc.recorded_at), SUM(sc.cost) as daily_cost
      FROM public.scraping_costs sc
      WHERE sc.recorded_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(sc.recorded_at)
    ) recent
  ),
  previous_avg AS (
    SELECT AVG(daily_cost) as previous_cost
    FROM (
      SELECT DATE(sc.recorded_at), SUM(sc.cost) as daily_cost
      FROM public.scraping_costs sc
      WHERE sc.recorded_at >= CURRENT_DATE - INTERVAL '14 days'
        AND sc.recorded_at < CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(sc.recorded_at)
    ) previous
  )
  SELECT 
    CASE 
      WHEN p.previous_cost > 0 THEN (r.recent_cost / p.previous_cost)
      ELSE 1.0
    END INTO trend_factor
  FROM recent_avg r, previous_avg p;
  
  -- Set defaults if no data
  avg_daily_cost := COALESCE(avg_daily_cost, 5.0);
  cost_variance := COALESCE(cost_variance, 1.0);
  trend_factor := COALESCE(trend_factor, 1.0);
  
  RETURN QUERY
  SELECT 
    CURRENT_DATE + i as projection_date,
    (avg_daily_cost * POWER(trend_factor, i::DECIMAL / 7))::DECIMAL(10,4) as projected_daily_cost,
    (avg_daily_cost * POWER(trend_factor, i::DECIMAL / 7) * 30)::DECIMAL(10,2) as projected_monthly_cost,
    CASE 
      WHEN cost_variance < avg_daily_cost * 0.2 THEN 'HIGH'
      WHEN cost_variance < avg_daily_cost * 0.5 THEN 'MEDIUM'
      ELSE 'LOW'
    END as confidence_level
  FROM generate_series(1, days_ahead) i;
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_scraping_costs_recorded_date ON public.scraping_costs (DATE(recorded_at));
CREATE INDEX IF NOT EXISTS idx_scraping_costs_operation_type ON public.scraping_costs (operation_type);
CREATE INDEX IF NOT EXISTS idx_scraping_costs_metadata_properties ON public.scraping_costs USING GIN (metadata) 
  WHERE metadata ? 'properties_processed';

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_daily_scraping_cost(DATE) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_daily_scraping_stats(DATE) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_weekly_cost_trends(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_property_source_performance(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_underperforming_sources(DECIMAL, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_cost_projections(INTEGER) TO service_role;

-- Grant read access to authenticated users for dashboard
GRANT EXECUTE ON FUNCTION public.get_daily_scraping_stats(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_weekly_cost_trends(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_property_source_performance(INTEGER) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION public.get_daily_scraping_cost(DATE) IS 'Get total scraping cost for a specific date';
COMMENT ON FUNCTION public.get_daily_scraping_stats(DATE) IS 'Get comprehensive scraping statistics for a date';
COMMENT ON FUNCTION public.get_weekly_cost_trends(INTEGER) IS 'Get weekly cost trends for analysis';
COMMENT ON FUNCTION public.get_property_source_performance(INTEGER) IS 'Get performance metrics for property sources';
COMMENT ON FUNCTION public.get_underperforming_sources(DECIMAL, INTEGER) IS 'Identify property sources that need attention';
COMMENT ON FUNCTION public.get_cost_projections(INTEGER) IS 'Project future costs based on historical data';

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Cost monitoring functions created successfully';
END $$;