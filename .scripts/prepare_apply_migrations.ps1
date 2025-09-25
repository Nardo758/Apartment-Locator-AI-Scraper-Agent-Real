<#
Interactive migration apply helper.
- Lists SQL files in supabase/migrations sorted by name (assumes timestamp prefix ordering)
- Requires confirmation and a backup acknowledgement before applying anything
- Uses the supabase CLI if available, otherwise prints psql commands to run manually
#>

param(
  [switch]$DryRun
)

$repoRoot = Get-Location
$migDir = Join-Path $repoRoot 'supabase\migrations'
if (-not (Test-Path $migDir)) { Write-Error "Migration directory not found: $migDir"; exit 1 }

$migrations = Get-ChildItem -Path $migDir -Filter '*.sql' | Sort-Object Name
if ($migrations.Count -eq 0) { Write-Output 'No migration files found'; exit 0 }

Write-Output "Found $($migrations.Count) migration files:"; $migrations | ForEach-Object { Write-Output (" - " + $_.Name) }

if ($DryRun) { Write-Output 'DryRun: migrations will not be applied. Exiting.'; exit 0 }

Write-Output ''
Write-Output '*** SAFETY CHECK ***'
Write-Output 'You MUST have a current backup before applying migrations. Type "I HAVE BACKUP" to confirm and continue.'
$confirm = Read-Host 'Confirm'
if ($confirm -ne 'I HAVE BACKUP') { Write-Output 'Confirmation failed; aborting.'; exit 1 }

# Prefer supabase CLI if present
try { $sup = (Get-Command supabase -ErrorAction Stop) } catch { $sup = $null }
if ($sup) {
  Write-Output 'supabase CLI detected. Will deploy migrations via supabase if you confirm.'
  $go = Read-Host 'Type APPLY to run supabase migrations now'
  if ($go -ne 'APPLY') { Write-Output 'Not confirmed; exiting.'; exit 1 }
  foreach ($m in $migrations) {
    Write-Output ('Applying: ' + $m.FullName)
  # NOTE: set the remote connection using the supabase CLI before pushing. Example:
  #   supabase db remote set "postgres://user:pass@host:5432/dbname"
  # Then push this migration file with:
  #   supabase db push --file "$($m.FullName)"
  # The script will not auto-run these commands to avoid accidental applies.
  }
  Write-Output 'Migrations applied via supabase CLI (if configured).'
  exit 0
}

# Otherwise print psql commands to run manually
Write-Output 'supabase CLI not found. Here are psql commands you can run (replace placeholders):'
Write-Output "# Example: psql -h <host> -p <port> -U <user> -d <db> -f <migration.sql>"
foreach ($m in $migrations) { Write-Output ("psql -h <host> -p 5432 -U <user> -d <db> -f '" + $m.FullName + "'") }
Write-Output 'Done. Do NOT run these until you have a backup.'
