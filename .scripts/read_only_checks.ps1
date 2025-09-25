# Safe read-only checks for Supabase PostgREST
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File .\.scripts\read_only_checks.ps1

$envPath = Join-Path (Get-Location) '.env.local'
if (-not (Test-Path $envPath)) {
  Write-Error ".env.local not found at $envPath"
  exit 1
}

$content = Get-Content $envPath
$SUPABASE_URL = ($content | Select-String -Pattern '^SUPABASE_URL=(.+)$' | ForEach-Object { $_.Matches[0].Groups[1].Value.Trim() })[0]
$SRK = ($content | Select-String -Pattern '^SUPABASE_SERVICE_ROLE_KEY=(.+)$' | ForEach-Object { $_.Matches[0].Groups[1].Value.Trim() })[0]

if (-not $SUPABASE_URL -or -not $SRK) {
  Write-Error "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  exit 1
}

$headers = @{
  Authorization = "Bearer $SRK"
  apikey = $SRK
  Prefer = 'count=exact'
}

foreach ($table in @('scraped_properties','apartments')) {
  Write-Output "`n--- $table ---`n"

  $uriCount = $SUPABASE_URL + '/rest/v1/' + $table + '?select=id&limit=0'
  try {
    $r = Invoke-WebRequest -Uri $uriCount -Headers $headers -Method GET -ErrorAction Stop
  } catch {
    Write-Output ('Error fetching headers for ' + $table + ': ' + $_.Exception.Message)
    continue
  }

  $cr = 'N/A'
  if ($r.Headers.Keys -contains 'Content-Range') { $cr = $r.Headers['Content-Range'] }
  elseif ($r.Headers.Keys -contains 'content-range') { $cr = $r.Headers['content-range'] }
  elseif ($r.Headers.Keys -contains 'x-total-count') { $cr = $r.Headers['x-total-count'] }
  Write-Output ('Count header: ' + $cr)

  $uriSample = $SUPABASE_URL + '/rest/v1/' + $table + '?select=*&limit=5'
  try {
    $rows = Invoke-RestMethod -Uri $uriSample -Headers $headers -Method GET -ErrorAction Stop
  } catch {
    Write-Output ('Error fetching sample rows for ' + $table + ': ' + $_.Exception.Message)
    continue
  }

  try {
    $rows | ConvertTo-Json -Depth 8 | Write-Output
  } catch {
    Write-Output 'Error converting rows to JSON'
  }
}

Write-Output "`nDone."
