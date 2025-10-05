-- Migration: add training pipeline fields to failed_scrapes

BEGIN;

ALTER TABLE public.failed_scrapes
  ADD COLUMN IF NOT EXISTS training_batch_id UUID NULL,
  ADD COLUMN IF NOT EXISTS training_priority INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS training_notes TEXT NULL,
  ADD COLUMN IF NOT EXISTS training_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS training_updated_at TIMESTAMP WITH TIME ZONE NULL;

CREATE INDEX IF NOT EXISTS idx_failed_scrapes_training_batch_id ON public.failed_scrapes (training_batch_id);

COMMIT;
