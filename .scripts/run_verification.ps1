# Run verification: counts and 5 sample rows for key tables
# This script reads .env.local for SUPABASE_URL and SERVICE_ROLE_KEY (does not print keys)

$envPath = Join-Path (Get-Location) '.env.local'
if (-not (Test-Path $envPath)) {
  Write-Error ".env.local not found at $envPath"
  exit 1
}

$raw = Get-Content $envPath -Raw
$SUPABASE_URL = ([regex]::Match($raw,'SUPABASE_URL=(.+?)\r?\n')).Groups[1].Value.Trim()
$SRK = ([regex]::Match($raw,'SUPABASE_SERVICE_ROLE_KEY=(.+?)(?:\r?\n|$)', [System.Text.RegularExpressions.RegexOptions]::Singleline)).Groups[1].Value.Trim()

if (-not $SUPABASE_URL -or -not $SRK) {
  Write-Error 'Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env.local'
  exit 1
}

$headers = @{ Authorization = "Bearer $SRK"; apikey = $SRK; Prefer='count=exact' }
$tables = @('scraped_properties','apartments')

foreach ($table in $tables) {
  Write-Output "`n--- $table ---`n"
  $uriCount = $SUPABASE_URL + '/rest/v1/' + $table + '?select=id&limit=0'
  try { $r = Invoke-WebRequest -Uri $uriCount -Headers $headers -Method GET -ErrorAction Stop } catch { Write-Output ('Error fetching headers for ' + $table + ': ' + $_.Exception.Message); continue }
  $cr = 'N/A'
  if ($r.Headers.Keys -contains 'Content-Range') { $cr = $r.Headers['Content-Range'] } elseif ($r.Headers.Keys -contains 'content-range') { $cr = $r.Headers['content-range'] } elseif ($r.Headers.Keys -contains 'x-total-count') { $cr = $r.Headers['x-total-count'] }
  Write-Output ('Count header: ' + $cr)
  $uriSample = $SUPABASE_URL + '/rest/v1/' + $table + '?select=*&limit=5'
  try { $rows = Invoke-RestMethod -Uri $uriSample -Headers $headers -Method GET -ErrorAction Stop } catch { Write-Output ('Error fetching sample rows for ' + $table + ': ' + $_.Exception.Message); continue }
  $rows | ConvertTo-Json -Depth 8 | Write-Output
}

Write-Output "`nVerification complete."
