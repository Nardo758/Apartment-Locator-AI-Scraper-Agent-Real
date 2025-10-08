This PR contains small defensive migrations and a function wiring fix to make
the claude-queue-builder end-to-end on staging/local.

Changes:

- supabase/migrations/20251007150000_add_unique_index_scraped_properties.sql
  - Ensure there's a unique index on (property_id, unit_number) used by
    rpc_upsert_property_and_enqueue ON CONFLICT.
- supabase/migrations/20251007161000_add_columns_to_scraping_queue.sql
  - Add missing columns expected by the RPC: property_source_id (bigint),
    priority (integer), metadata (jsonb).
- supabase/migrations/20251007170000_replace_unit_index_with_unique.sql
  - Defensive migration to drop any legacy non-unique index and create the
    unique index.
- supabase/functions/claude-queue-builder/index.ts
  - Compute stable external_id and call atomic RPC with property_source_id,
    priority, metadata so discovered rows are persisted and enqueued.

Verification steps performed locally:

- Applied migrations locally and confirmed "All migrations applied
  successfully".
- Replaced legacy non-unique index with unique index and verified via pg_indexes
  and pg_index.
- Added scraping_queue columns and backfilled metadata from existing data field.
- Invoked the local claude-queue-builder function and confirmed RPC now returns
  ok and inserts rows into scraping_queue with property_source_id and metadata.

Notes:

- The migration files are defensive/idempotent. They should be safe to run on
  staging and production.
- Consider adding an explicit UNIQUE constraint on
  scraped_properties(property_id, unit_number) if you prefer a named constraint
  (index is sufficient for ON CONFLICT behavior).

Please review and merge. If you'd like, I can also add a small integration test
to CI that calls the function and asserts that scraping_queue receives entries.
