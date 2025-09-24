-- RPC to compute percentile rank of a property within its zip_code based on current_price
-- Returns integer percentile (0-100) or NULL if not computable
CREATE OR REPLACE FUNCTION public.rpc_compute_percentile(p_external_id TEXT)
RETURNS INTEGER AS $$
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
$$ LANGUAGE plpgsql VOLATILE;
