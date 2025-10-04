# Integration tests for Supabase RPC and apartments upsert

Requirements:

- Node.js installed (for the JS integration test scripts)
- Environment variables set:
  - SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY)

Scripts:

- `node scripts/test_rpc_v2.js`  # builds payload and posts to rpc_bulk_upsert_properties_v2 if env vars set
- `node scripts/integration_test_rpc_v2.js`  # posts payload to rpc_bulk_upsert_properties_v2 and queries `scraped_properties` & `price_history`
- `node scripts/integration_test_apartments_upsert.js`  # simulates Claude worker upsert into `apartments`

Notes:

- Run these first against a staging/dev Supabase. Do NOT run against production unless you know the impact.
- The migration file `supabase/migrations/20251004120000_rpc_bulk_upsert_properties_v2.sql` defines the v2 RPC; apply it to your DB before running the RPC tests.
