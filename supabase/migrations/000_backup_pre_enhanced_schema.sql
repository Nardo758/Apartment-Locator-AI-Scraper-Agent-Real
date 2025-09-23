-- 000_backup_pre_enhanced_schema.sql
-- Create simple backups of current tables before applying the enhanced (destructive) schema

BEGIN;

-- Note: these create-if-not-exists backups to avoid overwriting existing backups
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'scraped_properties_backup_pre_enhanced') THEN
    EXECUTE 'CREATE TABLE scraped_properties_backup_pre_enhanced AS TABLE scraped_properties';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'scraping_queue_backup_pre_enhanced') THEN
    EXECUTE 'CREATE TABLE scraping_queue_backup_pre_enhanced AS TABLE scraping_queue';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'price_history_backup_pre_enhanced') THEN
    EXECUTE 'CREATE TABLE price_history_backup_pre_enhanced AS TABLE price_history';
  END IF;
END$$;

COMMIT;
