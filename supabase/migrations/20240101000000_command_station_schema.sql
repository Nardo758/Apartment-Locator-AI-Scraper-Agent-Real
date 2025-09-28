-- Command Station Database Schema Migration
-- This migration creates all necessary tables and functions for the Command Station

-- System configuration table
CREATE TABLE IF NOT EXISTS system_config (
  config_key TEXT PRIMARY KEY,
  config_value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System events log for audit trail
CREATE TABLE IF NOT EXISTS system_events (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Batch job tracking
CREATE TABLE IF NOT EXISTS batch_jobs (
  id BIGSERIAL PRIMARY KEY,
  batch_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started', 'running', 'completed', 'failed', 'cancelled')),
  batch_size INTEGER,
  properties_processed INTEGER DEFAULT 0,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  estimated_duration TEXT,
  errors JSONB
);

-- Scraping queue (enhance existing or create new)
CREATE TABLE IF NOT EXISTS scraping_queue (
  id BIGSERIAL PRIMARY KEY,
  external_id TEXT,
  source TEXT,
  url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  priority INTEGER DEFAULT 5,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Scraping logs (enhance existing or create new)
CREATE TABLE IF NOT EXISTS scraping_logs (
  id BIGSERIAL PRIMARY KEY,
  scraping_queue_id BIGINT REFERENCES scraping_queue(id),
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'warning')),
  response_time_ms INTEGER,
  scrape_duration_ms INTEGER,
  confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cost tracking (enhance existing or create new)
CREATE TABLE IF NOT EXISTS scraping_costs (
  date DATE PRIMARY KEY,
  properties_scraped INTEGER DEFAULT 0,
  ai_requests INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  estimated_cost DECIMAL(10,6) DEFAULT 0,
  details JSONB
);

-- Worker health tracking
CREATE TABLE IF NOT EXISTS worker_health (
  worker_name TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
  last_ping TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version TEXT,
  metadata JSONB
);

-- Performance metrics snapshots
CREATE TABLE IF NOT EXISTS performance_snapshots (
  id BIGSERIAL PRIMARY KEY,
  snapshot_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metrics JSONB NOT NULL,
  alerts JSONB DEFAULT '[]'::jsonb
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_system_events_type ON system_events(event_type);
CREATE INDEX IF NOT EXISTS idx_system_events_created ON system_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_status ON batch_jobs(status);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_created ON batch_jobs(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_scraping_queue_status ON scraping_queue(status);
CREATE INDEX IF NOT EXISTS idx_scraping_queue_created ON scraping_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scraping_queue_priority ON scraping_queue(priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_scraping_logs_status ON scraping_logs(status);
CREATE INDEX IF NOT EXISTS idx_scraping_logs_created ON scraping_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scraping_costs_date ON scraping_costs(date DESC);
CREATE INDEX IF NOT EXISTS idx_performance_snapshots_time ON performance_snapshots(snapshot_time DESC);

-- Function to increment scraping costs (if not exists)
CREATE OR REPLACE FUNCTION rpc_inc_scraping_costs(
  p_date DATE,
  p_properties_scraped INTEGER DEFAULT 0,
  p_ai_requests INTEGER DEFAULT 0,
  p_tokens_used INTEGER DEFAULT 0,
  p_estimated_cost DECIMAL(10,6) DEFAULT 0,
  p_details JSONB DEFAULT '{}'::jsonb
) RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql;

-- Function to get database size
CREATE OR REPLACE FUNCTION get_database_size() 
RETURNS TABLE(size BIGINT) AS $$
BEGIN
  RETURN QUERY SELECT pg_database_size(current_database());
END;
$$ LANGUAGE plpgsql;

-- Function to update scraping queue status
CREATE OR REPLACE FUNCTION update_queue_status(
  p_id BIGINT,
  p_status TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE scraping_queue 
  SET 
    status = p_status,
    updated_at = NOW(),
    processed_at = CASE WHEN p_status IN ('completed', 'failed') THEN NOW() ELSE processed_at END
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get queue statistics
CREATE OR REPLACE FUNCTION get_queue_stats()
RETURNS TABLE(
  pending BIGINT,
  processing BIGINT,
  completed BIGINT,
  failed BIGINT,
  total BIGINT
) AS $$
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
$$ LANGUAGE plpgsql;

-- Function to clean old data
CREATE OR REPLACE FUNCTION cleanup_old_data(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
  cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
  cutoff_date := NOW() - (days_to_keep || ' days')::INTERVAL;
  
  -- Clean old system events
  DELETE FROM system_events WHERE created_at < cutoff_date;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Clean old scraping logs
  DELETE FROM scraping_logs WHERE created_at < cutoff_date;
  GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
  
  -- Clean old performance snapshots
  DELETE FROM performance_snapshots WHERE snapshot_time < cutoff_date;
  GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
  
  -- Clean completed queue items older than cutoff
  DELETE FROM scraping_queue 
  WHERE status IN ('completed', 'failed') 
    AND processed_at < cutoff_date;
  GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Insert default system configuration
INSERT INTO system_config (config_key, config_value) 
VALUES ('scraper_system', '{
  "scrapingEnabled": true,
  "claudeEnabled": true,
  "batchSize": 50,
  "dailyCostLimit": 50,
  "schedule": "0 0 * * 0",
  "maxConcurrentJobs": 5,
  "enableCostTracking": true,
  "claudeModel": "claude-3-haiku-20240307",
  "retryAttempts": 3,
  "timeoutMs": 30000,
  "alertThresholds": {
    "dailyCost": 40,
    "errorRate": 0.15,
    "queueSize": 100
  },
  "features": {
    "autoRetry": true,
    "smartBatching": true,
    "costOptimization": true,
    "realTimeMonitoring": true
  }
}'::jsonb)
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  updated_at = NOW();

-- Insert initial worker health records
INSERT INTO worker_health (worker_name, status, version, metadata)
VALUES 
  ('ai-scraper-worker', 'healthy', '1.0.0', '{"description": "AI processing worker"}'::jsonb),
  ('scraper-orchestrator', 'healthy', '1.0.0', '{"description": "Batch orchestration worker"}'::jsonb),
  ('scraper-worker', 'healthy', '1.0.0', '{"description": "Data collection worker"}'::jsonb),
  ('command-station', 'healthy', '1.0.0', '{"description": "Command and control interface"}'::jsonb)
ON CONFLICT (worker_name) DO UPDATE SET
  last_ping = NOW(),
  version = EXCLUDED.version,
  metadata = EXCLUDED.metadata;

-- Create a view for system dashboard
CREATE OR REPLACE VIEW system_dashboard AS
SELECT 
  -- System status
  (SELECT COUNT(*) FROM scraping_queue WHERE status = 'pending') as queue_pending,
  (SELECT COUNT(*) FROM scraping_queue WHERE status = 'processing') as queue_processing,
  (SELECT COUNT(*) FROM scraping_queue WHERE status = 'failed') as queue_failed,
  
  -- Today's metrics
  (SELECT COALESCE(properties_scraped, 0) FROM scraping_costs WHERE date = CURRENT_DATE) as properties_today,
  (SELECT COALESCE(ai_requests, 0) FROM scraping_costs WHERE date = CURRENT_DATE) as ai_requests_today,
  (SELECT COALESCE(estimated_cost, 0) FROM scraping_costs WHERE date = CURRENT_DATE) as cost_today,
  
  -- Recent performance
  (SELECT COUNT(*) FROM scraping_logs WHERE created_at >= NOW() - INTERVAL '1 hour') as logs_last_hour,
  (SELECT COUNT(*) FROM scraping_logs WHERE created_at >= NOW() - INTERVAL '1 hour' AND status = 'error') as errors_last_hour,
  
  -- Worker health
  (SELECT COUNT(*) FROM worker_health WHERE status = 'healthy') as healthy_workers,
  (SELECT COUNT(*) FROM worker_health) as total_workers;

-- Row Level Security (optional - enable if needed)
-- ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE batch_jobs ENABLE ROW LEVEL SECURITY;

-- Grant permissions for service role
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
-- GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;