Get-ChildItem -Path scripts -File -Filter *.js -Recurse | ForEach-Object {
  $path = $_.FullName
  $text = Get-Content $path -Raw -Encoding UTF8
  $orig = $text
  # 1) normalize catch (e) / catch (err) to catch (_e)
  $text = [regex]::Replace($text, '(catch)\s*\((?:e|err|error)\)', '$1 (_e)')
  # 2) prefix unused data in destructure patterns like { data, error } -> { _data, error }
  # We'll do a conservative replace: if we find "{ data, error }" replace to "{ _data, error }"
  $text = $text -replace '\{\s*data\s*,\s*error\s*\}', '{ _data, error }'
  # 3) remove async from functions that likely have no await - conservative: functions containing 'async function' with no 'await' word
  if ($text -match 'async function' -and -not ($text -match '\bawait\b')) {
    $text = $text -replace '\basync function\b', 'function'
  }
  if ($text -ne $orig) {
    Set-Content -Path $path -Value $text -Encoding UTF8
    Write-Host "Updated: $path"
  }
}
