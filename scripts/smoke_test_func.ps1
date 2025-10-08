# Lightweight PowerShell smoke test for claude-queue-builder
# Usage: set $env:SUPABASE_URL (or rely on default http://127.0.0.1:54322/functions/v1) and run this script.
$func = $env:SUPABASE_URL
if (-not $func) { $func = 'http://127.0.0.1:54322/functions/v1' }
$name = $env:FUNC_NAME
if (-not $name) { $name = 'command-center' }
$uri = "$func/$name"
Write-Host "Calling $uri"
try {
    $resp = Invoke-RestMethod -Method Post -Uri $uri -Body (@{ test_mode = $false } | ConvertTo-Json) -ContentType 'application/json' -TimeoutSec 30
    Write-Host "Status: OK"
    $resp | ConvertTo-Json -Depth 5
    exit 0
} catch {
    Write-Host "Smoke test failed:" $_.Exception.Message
    exit 2
}
