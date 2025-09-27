-- Create sources table for scraping sources
CREATE TABLE IF NOT EXISTS public.sources (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    priority TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;

-- Create policy for service role (full access)
CREATE POLICY "Service role can do anything" ON public.sources
    FOR ALL USING (auth.role() = 'service_role');

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sources_updated_at
    BEFORE UPDATE ON public.sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();