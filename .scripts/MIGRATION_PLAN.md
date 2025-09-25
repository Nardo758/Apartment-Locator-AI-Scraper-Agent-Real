Migration plan — safe, idempotent, verifiable

Goal
- Safely apply the schema and data migrations present in `supabase/migrations/` to the production Supabase project. Ensure we have verification steps, dry-runs, and a backup strategy before any destructive or irreversible change.

Overview
1. Verify current data shape (read-only) and capture counts + samples for `scraped_properties` and `apartments`.
2. Backup the database (Supabase snapshot or pg_dump) before applying migrations.
3. Apply SQL migrations in `supabase/migrations/` in chronological order using a vetted tool (psql or supabase CLI). Each migration file should be idempotent; if not, guard it or convert it to an idempotent form first.
4. Run post-migration verification queries to confirm schema changes and data expectations.
5. Run backfill scripts in DRY_RUN mode, inspect results, and then run them for real.

Safety checklist (must complete before apply)
- [ ] Take a DB backup (Supabase UI snapshot or `pg_dump`).
- [ ] Run `./.scripts/run_verification.ps1` and capture its output (counts + samples).
- [ ] Confirm the migration SQL files are idempotent (wrap each `CREATE`/`INSERT` in `IF NOT EXISTS` or SQL `DO` guards).
- [ ] Open a maintenance window if the migrations will cause downtime or heavy locks.
- [ ] Ensure service-role keys / CI tokens are available and rotated if needed after the operation.

Commands & templates
- Backup (Supabase UI recommended) or CLI (if supabase CLI installed):
  - supabase projects backup (check supabase CLI docs) or
  - psql/pg_dump template (PowerShell):

    $pg_host = '<host>'
    $pg_port = 5432
    $pg_db = '<db>'
    $pg_user = '<user>'
    $pg_password = '<password>'
    $env:PGPASSWORD = $pg_password
    pg_dump -h $pg_host -p $pg_port -U $pg_user -F c -b -v -f "backup.dump" $pg_db

- Apply migrations (two safe options):
  - Prefer manual review + psql: run each migration file in order with psql -f <file>
  - If you use Supabase CLI and trust it: use that tool's migration deployment command (check your local `supabase` CLI version/docs).

Post-migration verification
- Re-run `./.scripts/run_verification.ps1` and compare counts/samples.
- Run targeted SQL checks for important columns (e.g., title mapping, geolocation, price not null where expected).

Backfills
- Use existing scripts with a DRY_RUN flag. Example:
  - node scripts/populate_ai_pricing.js --dry-run
  - or set DRY_RUN=true and run the script
- Inspect results and metrics (row counts, errors) before running for real.

Rollback strategy
- If something goes wrong, restore from backup (pg_restore or Supabase UI snapshot).
- For non-destructive changes, write compensating SQL that reverts structural changes if possible.

When you're ready
- Reply with: "apply migrations" to let me proceed with the apply step. I'll still require explicit confirmation that you have a backup and accept the risk. If you reply "plan only", I'll stop after preparing the scripts and the verification output and won't run any apply commands.

Files created by this plan:
- .scripts/run_verification.ps1  — run read-only checks and produce counts + sample rows
- .scripts/prepare_apply_migrations.ps1 — interactive script that lists migrations and will apply them only after confirmation and when supabase CLI is present (or prints psql commands to run manually)

Notes
- I will not apply migrations automatically without your explicit confirmation and backup acknowledgement.
- If you want, I can also open a PR with the idempotency fixes for any migration files that aren't safe.
