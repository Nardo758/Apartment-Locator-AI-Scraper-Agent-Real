$in='deno_lint_full.txt'
$outRule='deno_lint_rule_counts.json'
$outTopFiles='deno_lint_top_files.json'
$text = Get-Content $in -Raw -Encoding UTF8
$clean = [regex]::Replace($text, "`e\[[\d;]*[A-Za-z]", '')
$lines = $clean -split "`r?`n"
$ruleCounts = @{}
$fileCounts = @{}
$ruleFiles = @{}
for($i=0;$i -lt $lines.Length;$i++){
  $line = $lines[$i]
  if ($line -match "error\[([^\]]+)\]") {
    $rule = $matches[1]
    if(-not $ruleCounts.ContainsKey($rule)){ $ruleCounts[$rule]=0 }
    $ruleCounts[$rule]++
    # look ahead for a line that starts with --> and includes a path
    for($j=$i+1;$j -lt [Math]::Min($lines.Length,$i+20);$j++){
      $ln = $lines[$j].Trim()
      if ($ln -match "^-->\s*$") { continue }
      if ($ln -match '^[A-Za-z]:(\\[^:]+)+:\d+:\d+') {
        $file = ($ln -split ':')[0..2] -join ':'
        if(-not $fileCounts.ContainsKey($file)){ $fileCounts[$file]=0 }
        $fileCounts[$file]++
        if(-not $ruleFiles.ContainsKey($rule)){ $ruleFiles[$rule]=@{} }
        if(-not $ruleFiles[$rule].ContainsKey($file)){ $ruleFiles[$rule][$file]=0 }
        $ruleFiles[$rule][$file]++
        break
      }
      if ($ln -match '^[A-Za-z]:(\\.*)$') {
        # try to extract path from this line
        $m = [regex]::Match($ln,'([A-Za-z]:(\\[^:]+)+):\d+:\d+')
        if ($m.Success) {
          $file = $m.Groups[1].Value
          if(-not $fileCounts.ContainsKey($file)){ $fileCounts[$file]=0 }
          $fileCounts[$file]++
          if(-not $ruleFiles.ContainsKey($rule)){ $ruleFiles[$rule]=@{} }
          if(-not $ruleFiles[$rule].ContainsKey($file)){ $ruleFiles[$rule][$file]=0 }
          $ruleFiles[$rule][$file]++
          break
        }
      }
    }
  }
}
$ruleArray = $ruleCounts.GetEnumerator() | Sort-Object -Property Value -Descending | ForEach-Object { 
  $rf = @()
  if ($ruleFiles.ContainsKey($_.Key)) { 
    $rf = $ruleFiles[$_.Key].GetEnumerator() | Sort-Object -Property Value -Descending | Select-Object -First 5 | ForEach-Object { @{ file=$_.Key; count=$_.Value } }
  }
  [PSCustomObject]@{rule=$_.Key; count=$_.Value; topFiles = $rf }
}
$topFilesArray = $fileCounts.GetEnumerator() | Sort-Object -Property Value -Descending | ForEach-Object { [PSCustomObject]@{file=$_.Key; count=$_.Value} }
$ruleArray | ConvertTo-Json -Depth 5 | Set-Content $outRule -Encoding UTF8
$topFilesArray | ConvertTo-Json -Depth 5 | Set-Content $outTopFiles -Encoding UTF8
Write-Host 'DONE'
