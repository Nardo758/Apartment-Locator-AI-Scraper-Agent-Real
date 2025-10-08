-- Migration: create command_center tables
-- Run: psql or via migration tooling

-- Central scraper control
CREATE TABLE IF NOT EXISTS command_center_control (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scraper_name TEXT NOT NULL UNIQUE,
  is_running BOOLEAN DEFAULT false,
  is_paused BOOLEAN DEFAULT false,
  current_operation TEXT,
  last_started TIMESTAMPTZ,
  last_completed TIMESTAMPTZ,
  last_error TEXT,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  current_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Regional targeting
CREATE TABLE IF NOT EXISTS command_center_regions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  region_code TEXT NOT NULL UNIQUE,
  region_name TEXT NOT NULL,
  state_code TEXT,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 5,
  search_queries JSONB DEFAULT '[]',
  website_types TEXT[] DEFAULT '{}',
  max_daily_scrapes INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scheduling system
CREATE TABLE IF NOT EXISTS command_center_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scraper_name TEXT NOT NULL,
  schedule_type TEXT CHECK (schedule_type IN ('immediate', 'hourly', 'daily', 'weekly', 'monthly')),
  cron_expression TEXT,
  is_active BOOLEAN DEFAULT true,
  next_run TIMESTAMPTZ,
  last_run TIMESTAMPTZ,
  parameters JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Operation logs
CREATE TABLE IF NOT EXISTS command_center_logs (
  id BIGSERIAL PRIMARY KEY,
  scraper_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  parameters JSONB,
  status TEXT CHECK (status IN ('success', 'error', 'warning')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
