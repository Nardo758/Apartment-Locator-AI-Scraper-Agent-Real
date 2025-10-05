Failed Scrapes → Training Bridge

Overview

This admin bridge exports rows from `failed_scrapes`, groups them into batches by normalized error type, writes per-batch files in canonical JSONL format, and marks the DB rows with `training_batch_id` and `training_status`.

Quick usage

  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/failed_scrapes_training.js --limit=500 --batch-size=50 --dry-run

New options (important)

-- --redact: redact probable PII (emails, phone numbers) from payload before export
-- --out-dir: output directory for batches (default: tmp/training_batches)
-- --schema-version: schema version string included in each record (default: v1)
-- --redact-fields: comma-separated list of specific payload fields to redact (e.g. contact_email,phone,owner_name,address)
-- --address-hash: how to handle address redaction when using --redact-fields for address. Choices: sha1 (default) or geohash (geohash placeholder returned if geocoding unavailable)

Canonical JSONL schema (recommended)

Each line is a JSON object with the following keys:

- id (int) — failed_scrapes.id
- external_id (string)
- training_batch_id (uuid)
- error_type (string) — normalized error category
- error (object|string) — original error payload
- payload (object) — original (or redacted) scraped payload
- source (string|null) — payload.source if available
- listing_url (string|null) — payload.listing_url if available
- created_at (ISO timestamp)
- training_priority (int)
- training_notes (string|null)
- schema_version (string)
- metadata (object) — exported_by, exported_at, exporter_version

Example record:

  {"id":123,"external_id":"prop_abc","training_batch_id":"f47ac10b-...","error_type":"missing_field","error":{"message":"missing bedrooms"},"payload":{"listing_url":"https://...","source":"zillow"},"source":"zillow","listing_url":"https://...","created_at":"2025-10-04T12:00:00Z","training_priority":1,"training_notes":null,"schema_version":"v1","metadata":{"exported_by":"failed_scrapes_training.js","exported_at":"2025-10-04T12:12:00Z","exporter_version":"v1"}}

Batch files and sidecars

- One JSONL file per batch: `ts__<error_type>__<offset>__<batch_id>.jsonl`
- Sidecar metadata JSON with keys: batch_id, error_type, item_count, priority, schema_version, checksum_sha1, exported_at, exported_by
- Files are written with write-once semantics; existing files will not be overwritten.

Quality features implemented

- Optional PII redaction via `--redact` (emails and phone-like patterns replaced with placeholders)
- Data validation: records are produced from DB rows and include required canonical fields
- Integrity: each JSONL file gets a SHA1 checksum saved in the metadata sidecar

Integration notes

- After training/manual review, call the RPC `rpc_update_failed_scrape_training_status(batch_id UUID, status TEXT)` to update `training_status` for the batch.
- To reprocess items marked as `fixed`, call the existing `reprocess_failed_scrapes` (or I can add a targeted RPC that reprocesses by batch_id).

Next steps

- Add an integration test that runs the script in dry-run against a local Supabase and validates row selection and updates (I can add this next).
- If you want stronger PII redaction rules (e.g., name/entity redaction), provide a list of fields to anonymize and I will implement a schema-based redaction.

Security reminder

- The exported batch files may contain user-provided text. Use `--redact` for PII-sensitive environments and restrict file storage to a secure location.
