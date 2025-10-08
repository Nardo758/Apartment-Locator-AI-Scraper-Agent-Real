<#
Runs a reproducible local pipeline to start Postgres, apply migrations, start the claude-queue-builder function, and run the integration test.

Usage:
  PS> .\scripts\run_local_pipeline.ps1            # uses defaults
  PS> .\scripts\run_local_pipeline.ps1 -StartFunctionInBackground $true

Notes:
- Requires PowerShell (Windows). Docker and Python must be installed and on PATH.
- Expects docker-compose.local.yml at repo root with a service named 'postgres'.
- The script will set POSTGRES_URI and FUNCTIONS_PORT in the current process for commands it runs.
- To run the function with real write access, export SUPABASE_SERVICE_ROLE_KEY in your environment before running.
#>

param(
    [int]$PostgresPort = 54331,
    [int]$FunctionsPort = 54321,
    [string]$PostgresUser = 'postgres',
    [string]$PostgresPassword = 'postgres',
    [string]$PostgresDb = 'postgres',
    [string]$ComposeFile = 'docker-compose.local.yml',
    [switch]$StartFunctionInBackground = $true
)

Set-StrictMode -Version Latest

Write-Host "Starting local pipeline: postgres on port $PostgresPort, functions port $FunctionsPort"

# 1) Start Postgres via docker-compose
Write-Host "Bringing up Postgres via: docker compose -f $ComposeFile up -d postgres"
try {
    docker compose -f $ComposeFile up -d postgres | Out-Null
} catch {
    Write-Warning "docker compose up failed. Make sure Docker Desktop is running and you can run 'docker compose' from PowerShell.";
    throw $_
}

# 2) Wait for Postgres to accept connections
$maxAttempts = 60
$attempt = 0
Write-Host "Waiting for Postgres to become reachable on 127.0.0.1:$PostgresPort"
while ($attempt -lt $maxAttempts) {
    $attempt++
    $res = Test-NetConnection -ComputerName 127.0.0.1 -Port $PostgresPort -WarningAction SilentlyContinue
    if ($res.TcpTestSucceeded) { break }
    Start-Sleep -Seconds 1
}
if (-not $res.TcpTestSucceeded) {
    throw "Postgres did not become reachable on port $PostgresPort after $maxAttempts seconds. Check Docker logs and retry."
}
Write-Host "Postgres is reachable (attempt $attempt)."

# 3) Export env vars for subsequent commands in this script
$env:POSTGRES_URI = "postgresql://${PostgresUser}:${PostgresPassword}@127.0.0.1:${PostgresPort}/${PostgresDb}"
$env:FUNCTIONS_PORT = "${FunctionsPort}"
Write-Host "Exported POSTGRES_URI and FUNCTIONS_PORT for this session."

# 4) Apply migrations
Write-Host "Applying migrations using scripts/apply_migrations_to_staging.py"
try {
    python scripts/apply_migrations_to_staging.py --yes
} catch {
    Write-Warning "Applying migrations failed. Check that Python is available and the script exists."
    throw $_
}

# 5) Start the Deno function (background or foreground depending on flag)
$functionPath = 'supabase/functions/claude-queue-builder/index.ts'
if ($StartFunctionInBackground) {
    Write-Host "Starting Deno function in background (FUNCTIONS_PORT=${FunctionsPort}) using Start-Job so env vars are explicitly set in the child runspace."
    # Capture current service key so the background job can set it explicitly in its environment
    $serviceKey = $env:SUPABASE_SERVICE_ROLE_KEY
    $funcPort = "${FunctionsPort}"
    $fPath = $functionPath
    # Start a background PowerShell job that sets the env vars and runs deno. This ensures the child process sees the service key.
    $job = Start-Job -ScriptBlock {
        param($skey, $port, $path)
        $env:SUPABASE_SERVICE_ROLE_KEY = $skey
        $env:FUNCTIONS_PORT = $port
        # Run deno; this will block inside the job until stopped.
        deno run -A --unstable $path
    } -ArgumentList $serviceKey, $funcPort, $fPath
    Start-Sleep -Seconds 2
    Write-Host "Deno started as background job (Id=$($job.Id)). Use Get-Job and Receive-Job to inspect output or Stop-Job to stop it." 
} else {
    Write-Host "Starting Deno function in foreground (will block this shell). Run with -StartFunctionInBackground to run it detached."
    $env:FUNCTIONS_PORT = "${FunctionsPort}"
    deno run -A --unstable $functionPath
}

# 6) Run the integration test (will POST to http://127.0.0.1:FUNCTIONS_PORT/functions/v1/claude-queue-builder)
Write-Host "Running integration test: python scripts/tests/test_claude_queue_integration.py"
try {
    python scripts/tests/test_claude_queue_integration.py
} catch {
    Write-Warning "Integration test failed. Inspect output above."
    throw $_
}

Write-Host "Local pipeline complete. If you started Deno in background, stop it manually or run 'Get-Process deno | Stop-Process'."
