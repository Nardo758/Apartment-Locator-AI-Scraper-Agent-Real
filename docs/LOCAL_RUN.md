# Local run guide

This document explains how to run the minimal local integration pipeline for the
claude-queue-builder function.

Prerequisites

- Docker Desktop (or Docker Engine) and docker compose available from PowerShell
- Python 3.10+ on PATH
- Deno on PATH (for running the function locally)

Quick start

1. Start the local pipeline (powershell): .\scripts\run_local_pipeline.ps1

What the script does

- Starts Postgres using `docker-compose.local.yml` (expects a service named
  `postgres`) on host port 54331
- Waits for the DB to be reachable
- Applies migrations using `scripts/apply_migrations_to_staging.py` (uses
  POSTGRES_URI in the current session)
- Starts the Deno function at `supabase/functions/claude-queue-builder/index.ts`
  with `FUNCTIONS_PORT=54321`
- Runs the integration test `scripts/tests/test_claude_queue_integration.py`
  which POSTs to the function and runs SQL queries to verify side-effects

Service role key (writes)

- By default the function runs in "dry" mode and will skip persistence unless
  you provide a SUPABASE_SERVICE_ROLE_KEY in your environment before running the
  script.
- To test full persistence, set the key in PowerShell like this:
  $env:SUPABASE_SERVICE_ROLE_KEY = 'your-service-role-key'

Notes & troubleshooting

- The helper is intentionally minimal; it assumes ports 54331 and 54321 are
  free. Adjust parameters when running the script.
- If migrations fail due to permission or missing shims, ensure you used a fresh
  Postgres instance (the migration shims are designed to run on plain Postgres
  in CI).
- If Docker pulls fail for the supabase image, the local compose file uses
  `postgres:15` to avoid supabase image pulls.
