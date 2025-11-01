# Start Supabase Functions with Environment Variables
# This script ensures functions have access to SERP_API_KEY and other env vars

Write-Host "`n🚀 Starting Supabase Functions with Environment Variables`n" -ForegroundColor Green

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    Write-Host "Please create .env file with required keys" -ForegroundColor Yellow
    exit 1
}

# Load environment variables
Write-Host "📋 Loading environment variables from .env..." -ForegroundColor Cyan
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $key = $matches[1]
        $value = $matches[2]
        [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
        
        # Hide sensitive values in output
        if ($key -match "KEY|SECRET|TOKEN") {
            $displayValue = $value.Substring(0, [Math]::Min(10, $value.Length)) + "..."
        } else {
            $displayValue = $value
        }
        Write-Host "   ✓ $key = $displayValue" -ForegroundColor Gray
    }
}

Write-Host "`n✅ Environment variables loaded`n" -ForegroundColor Green

# Copy .env to functions directory
Write-Host "📁 Copying environment to supabase/functions/.env..." -ForegroundColor Cyan
Copy-Item .env supabase/functions/.env -Force
Write-Host "   ✓ Environment file copied`n" -ForegroundColor Gray

Write-Host "🔧 Starting Supabase Functions..." -ForegroundColor Yellow
Write-Host "   (Press Ctrl+C to stop)`n" -ForegroundColor Gray

# Start Supabase functions
supabase functions serve --env-file supabase/functions/.env
