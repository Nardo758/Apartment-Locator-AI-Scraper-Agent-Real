Short README — AI pricing backfill and advanced pricing integration

This repository contains a lightweight, heuristic AI pricing engine and a backfill script
to populate `ai_price`, `effective_price`, and `market_position` for existing rows.

Backfill script
- Path: `scripts/populate_ai_pricing.js`
- Usage (dry-run):
  ```powershell
  $env:SUPABASE_URL='https://<your-project>.supabase.co'
  $env:SUPABASE_SERVICE_ROLE_KEY='<service-role-key>'
  $env:DRY_RUN='1'
  $env:BATCH_SIZE='50'
  node .\scripts\populate_ai_pricing.js
  ```
- To enable percentile computation (requires RPC migration applied):
  ```powershell
  $env:COMPUTE_PERCENTILE='1'
  node .\scripts\populate_ai_pricing.js
  ```

Integrating an advanced pricing engine
- By default the repository uses a simple heuristic implementation at `src/lib/pricing-engine.ts`.
- To plug in a more advanced pricing engine (for example, the one in your other repo), you have two options:
  1. Copy your advanced module into this repo at `src/lib/pricing-engine.advanced.js` (or `.ts`) and ensure it exports `async function computeAiPricing(supabase, property)`.
  2. Or set an environment variable `PRICING_ADVANCED_MODULE_PATH` to a Node-resolvable path to your module (absolute path or relative to repo root). Example:
     ```powershell
     $env:PRICING_ADVANCED_MODULE_PATH='C:\path\to\your\pricing-engine-advanced.js'
     ```
- When present, the runtime will attempt to require that module and call its `computeAiPricing` function. If loading fails, the system falls back to the built-in heuristic.

Notes
- The backfill script is idempotent and only updates rows that have `ai_price IS NULL` (so you can safely re-run after adjusting logic).
- I did not run the backfill; you control when to execute it. Consider running a dry-run first and reviewing a small batch.
