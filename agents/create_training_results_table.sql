-- CREATE TABLE for training extraction results
-- Run this in Supabase SQL editor (Project -> SQL) or via psql

CREATE TABLE public.training_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  site_key text,
  url text,
  timestamp timestamptz,
  chosen_expr text,
  error text,
  extraction jsonb,
  created_at timestamptz DEFAULT now()
);

-- Recommended indexes
CREATE INDEX IF NOT EXISTS idx_training_results_site_key ON public.training_results(site_key);
CREATE INDEX IF NOT EXISTS idx_training_results_created_at ON public.training_results(created_at);
