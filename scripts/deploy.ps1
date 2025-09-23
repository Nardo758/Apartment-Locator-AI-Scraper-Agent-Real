#!/usr/bin/env pwsh
param(
  [string]$projectRef = "your-project-ref"
)
Write-Host "Deploying functions and database migrations to Supabase project: $projectRef"
supabase db push --project $projectRef
supabase functions deploy --project $projectRef --all
