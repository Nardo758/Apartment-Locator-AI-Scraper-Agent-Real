# Diagnostic for SUPABASE_URL parsing
$path = Join-Path (Get-Location) '.env.local'
if (-not (Test-Path $path)) { Write-Error ".env.local not found at $path"; exit 1 }
$raw = Get-Content $path -Raw
Write-Output "RAW LENGTH: $($raw.Length)"
Write-Output "RAW (escaped):"
($raw -replace "\r", "\\r" -replace "\n", "\\n") | Write-Output

# Extract lines robustly
$lines = $raw -split "\r?\n"
for ($i=0; $i -lt $lines.Length; $i++) { Write-Output ("{0:D3}: [{1}]" -f $i, $lines[$i]) }

$urlLine = ($lines | Where-Object { $_ -match '^SUPABASE_URL=' })[0]
if (-not $urlLine) { Write-Error 'No SUPABASE_URL line found'; exit 1 }
$url = $urlLine -replace '^SUPABASE_URL=' , ''
Write-Output "\nEXTRACTED URL: [$url]"
Write-Output ('Length: ' + $url.Length)
Write-Output "Chars and codes:"
for ($i=0; $i -lt $url.Length; $i++) {
  $ch = $url[$i]
  $code = [int][char]$ch
  Write-Output ("{0:D2}: '{1}' 0x{2:X2}" -f $i, $ch, $code)
}

# Try parse URI
try {
  $u = [uri]$url
  Write-Output ('Parsed scheme: ' + $u.Scheme)
  Write-Output ('Parsed host: ' + $u.Host)
  Write-Output ('AbsoluteUri: ' + $u.AbsoluteUri)
} catch {
  Write-Output ('Uri parse failed: ' + $_.Exception.Message)
}

# Try DNS
try {
  Write-Output "`nResolve-DnsName for host: $($u.Host)"
  Resolve-DnsName -Name $u.Host -ErrorAction Stop | Select-Object -First 5 | Format-Table -AutoSize
} catch {
  Write-Output ('DNS resolve failed: ' + $_.Exception.Message)
}
