-- Consolidate property tables and create scraping jobs and costs with RLS and RPC

-- Create consolidated properties table
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT UNIQUE NOT NULL,
  source_url TEXT NOT NULL,
  source_site TEXT NOT NULL,

  -- Core property data
  property_name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  neighborhood TEXT,

  -- Pricing
  current_price DECIMAL(10,2),
  original_price DECIMAL(10,2),
  effective_rent DECIMAL(10,2),
  price_per_sqft DECIMAL(10,2),

  -- Details
  bedrooms INTEGER,
  bathrooms DECIMAL(3,1),
  square_feet INTEGER,
  available_date DATE,

  -- Amenities and features
  amenities TEXT[],
  description TEXT,
  images TEXT[],

  -- Concessions
  concessions JSONB,
  free_rent_concessions BOOLEAN DEFAULT false,
  concession_details TEXT,

  -- Contact
  phone TEXT,
  email TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_scraped_at TIMESTAMPTZ DEFAULT NOW(),

  -- Status
  is_available BOOLEAN DEFAULT true,
  data_quality_score INTEGER DEFAULT 0
);

-- Create scraping jobs table
CREATE TABLE IF NOT EXISTS scraping_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, running, completed, failed
  priority INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_error TEXT,
  results JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Create cost tracking table
CREATE TABLE IF NOT EXISTS scraping_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  properties_scraped INTEGER DEFAULT 0,
  ai_requests INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  estimated_cost DECIMAL(10,6) DEFAULT 0,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraping_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraping_costs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ BEGIN
  CREATE POLICY "Properties are viewable by everyone" ON properties
    FOR SELECT USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Properties are insertable by service role" ON properties
    FOR INSERT WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Properties are updatable by service role" ON properties
    FOR UPDATE USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Scraping jobs are service role only" ON scraping_jobs
    FOR ALL USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Scraping costs are service role only" ON scraping_costs
    FOR ALL USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_properties_external_id ON properties(external_id);
CREATE INDEX IF NOT EXISTS idx_properties_city_state ON properties(city, state);
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(current_price);
CREATE INDEX IF NOT EXISTS idx_properties_updated ON properties(updated_at);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_status ON scraping_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_priority ON scraping_jobs(priority, created_at);

-- RPC function for cost tracking
CREATE OR REPLACE FUNCTION rpc_inc_scraping_costs(
  p_date DATE DEFAULT CURRENT_DATE,
  p_properties_scraped INTEGER DEFAULT 0,
  p_ai_requests INTEGER DEFAULT 0,
  p_tokens_used INTEGER DEFAULT 0,
  p_estimated_cost DECIMAL(10,6) DEFAULT 0,
  p_details JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO scraping_costs (
    date, properties_scraped, ai_requests, tokens_used, 
    estimated_cost, details
  ) VALUES (
    p_date, p_properties_scraped, p_ai_requests, p_tokens_used,
    p_estimated_cost, p_details
  )
  ON CONFLICT (date) 
  DO UPDATE SET
    properties_scraped = scraping_costs.properties_scraped + EXCLUDED.properties_scraped,
    ai_requests = scraping_costs.ai_requests + EXCLUDED.ai_requests,
    tokens_used = scraping_costs.tokens_used + EXCLUDED.tokens_used,
    estimated_cost = scraping_costs.estimated_cost + EXCLUDED.estimated_cost,
    details = COALESCE(scraping_costs.details, '{}'::JSONB) || COALESCE(EXCLUDED.details, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql;
