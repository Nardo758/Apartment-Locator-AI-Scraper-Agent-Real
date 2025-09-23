#!/usr/bin/env bash
set -euo pipefail
echo "Deploying Apartment Scraper..."
supabase db push
supabase functions deploy --no-verify-jwt --all
echo "Deployment complete!"
