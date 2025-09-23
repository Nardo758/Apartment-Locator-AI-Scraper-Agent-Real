-- 004_create_scraping_tables.sql
-- Create tables for job management, logs, and caching

-- scraping_queue: stores pending/processing jobs
CREATE TABLE IF NOT EXISTS scraping_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id VARCHAR NOT NULL,
  source VARCHAR NOT NULL,
  url TEXT NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  attempt_count INTEGER NOT NULL DEFAULT 0,
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  available_at TIMESTAMPTZ,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_scraping_queue_status ON scraping_queue(status);
CREATE INDEX IF NOT EXISTS idx_scraping_queue_available_at ON scraping_queue(available_at);

-- scraping_logs: append-only logs for job runs and errors
CREATE TABLE IF NOT EXISTS scraping_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES scraping_queue(id) ON DELETE SET NULL,
  level VARCHAR NOT NULL DEFAULT 'info', -- info, warn, error
  message TEXT NOT NULL,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_scraping_logs_job_id ON scraping_logs(job_id);

-- scraping_cache: store fetched HTML or computed embeddings for performance
CREATE TABLE IF NOT EXISTS scraping_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  source VARCHAR NOT NULL,
  html TEXT,
  etag VARCHAR,
  content_hash VARCHAR,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_scraping_cache_fetched_at ON scraping_cache(fetched_at);
