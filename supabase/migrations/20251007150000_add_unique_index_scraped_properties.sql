-- Create unique index to support ON CONFLICT(property_id, unit_number) in rpc_upsert_property_and_enqueue
-- This index is created IF NOT EXISTS so repeated applies are safe.
CREATE UNIQUE INDEX IF NOT EXISTS uq_scraped_properties_property_unit
  ON public.scraped_properties (property_id, unit_number);

-- Safety note: If duplicates exist for the (property_id, unit_number) pair this statement will fail.
-- In that case, deduplicate rows first or investigate the data before creating the unique index.
