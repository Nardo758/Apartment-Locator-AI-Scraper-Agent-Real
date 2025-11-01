# Load Environment Variables from .env file
# Run this before using control-panel.mjs

Write-Host ""
Write-Host "Loading environment variables from .env file..." -ForegroundColor Cyan

$envFile = ".env"

if (-not (Test-Path $envFile)) {
    Write-Host "Error: .env file not found!" -ForegroundColor Red
    exit 1
}

# Read and parse .env file
Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    
    # Skip empty lines and comments
    if ($line -and -not $line.StartsWith("#")) {
        # Split on first = sign
        $parts = $line -split '=', 2
        
        if ($parts.Count -eq 2) {
            $key = $parts[0].Trim()
            $value = $parts[1].Trim()
            
            # Remove quotes if present
            if ($value.StartsWith('"') -and $value.EndsWith('"')) {
                $value = $value.Substring(1, $value.Length - 2)
            }
            
            # Set environment variable
            [Environment]::SetEnvironmentVariable($key, $value, 'Process')
            
            # Show what was loaded (hide sensitive values)
            if ($key -like "*KEY*" -or $key -like "*SECRET*" -or $key -like "*PASSWORD*") {
                Write-Host "   Loaded: $key = ****...****" -ForegroundColor Green
            } else {
                Write-Host "   Loaded: $key = $value" -ForegroundColor Green
            }
        }
    }
}

Write-Host ""
Write-Host "Environment variables loaded successfully!" -ForegroundColor Green
Write-Host "You can now run: node control-panel.mjs status" -ForegroundColor Cyan
Write-Host ""
