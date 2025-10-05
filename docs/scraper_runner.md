# Running the scraper push to Supabase

This document explains how to run the included scraper runner locally or in GitHub Actions.

## Local run

1. Copy `.env.local.template` to `.env.local` and fill in `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
2. Install dependencies from `requirements.txt`.

```powershell
python -m venv .venv; .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python scripts/run_scraper_to_supabase.py --payload scripts/sample_scrape_payload.json
```

## GitHub Actions

Use the workflow `/.github/workflows/run_scraper.yml` and configure repository secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Trigger the workflow from the Actions tab or via `workflow_dispatch`.

## Security notes

- Do not commit `.env.local` with real secret values. Use the template and keep secrets in your local key store or CI secrets.
- Prefer routing scrapers through a trusted server or Edge Function if scrapers run on untrusted hosts.
