-- 001_initial_schema.sql
-- Initial schema for apartment scraper

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Apartments table
CREATE TABLE IF NOT EXISTS apartments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  title TEXT,
  price NUMERIC,
  meta JSONB,
  created_at timestamptz DEFAULT now()
);

-- Scrape job queue
CREATE TABLE IF NOT EXISTS scrape_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  payload JSONB,
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz
);

-- AI results / analysis
CREATE TABLE IF NOT EXISTS ai_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES scrape_jobs(id) ON DELETE SET NULL,
  result JSONB,
  model TEXT,
  created_at timestamptz DEFAULT now()
);
