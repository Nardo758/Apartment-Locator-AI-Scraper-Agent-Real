# Test Script - Run after applying SQL fix
# This navigates to the repo and runs the integration test

Write-Host "`n🧪 Testing Claude + SERP Integration After Database Fix`n" -ForegroundColor Green

# Navigate to repo
Set-Location "C:\Users\Leon\Apartment-Locator-AI-Scraper-Agent-Real"

Write-Host "📍 Current directory: $PWD`n" -ForegroundColor Cyan

Write-Host "Running integration test...`n" -ForegroundColor Yellow

# Run the test
node test_full_integration.mjs

Write-Host "`n✅ Test complete!`n" -ForegroundColor Green
