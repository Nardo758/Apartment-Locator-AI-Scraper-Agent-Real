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

# Normalize accidental boolean positional bindings:
# If the user calls the script like: .\scripts\run_local_pipeline.ps1 -StartFunctionInBackground $true
# PowerShell may treat the $true as a positional argument and bind it to $PostgresPort. Detect that and normalize.
if ($PostgresPort -is [bool]) {
    $detected = [bool]$PostgresPort
    Write-Warning "Detected boolean value passed for the first positional parameter; assuming you intended -StartFunctionInBackground. Normalizing PostgresPort to default 54331 and StartFunctionInBackground=$detected"
    $StartFunctionInBackground = $detected
    $PostgresPort = 54331
}
if ($FunctionsPort -is [bool]) {
    $detected = [bool]$FunctionsPort
    Write-Warning "Detected boolean value passed for the second positional parameter; assuming you intended -StartFunctionInBackground. Normalizing FunctionsPort to default 54321 and StartFunctionInBackground=$detected"
    $StartFunctionInBackground = $detected
    $FunctionsPort = 54321
}

# If the boolean was converted to an integer (1) by positional binding into the typed int parameter,
# detect the pattern: PostgresPort==1 and StartFunctionInBackground explicitly requested.
# Normalize back to defaults so we don't try to connect to port 1.
if (($PostgresPort -eq 1) -and ($StartFunctionInBackground -eq $true) -and $PSBoundParameters.ContainsKey('StartFunctionInBackground')) {
    Write-Warning "Detected numeric 1 in PostgresPort while StartFunctionInBackground was explicitly set — normalizing PostgresPort to default 54331"
    $PostgresPort = 54331
}
if (($FunctionsPort -eq 1) -and ($StartFunctionInBackground -eq $true) -and $PSBoundParameters.ContainsKey('StartFunctionInBackground')) {
    Write-Warning "Detected numeric 1 in FunctionsPort while StartFunctionInBackground was explicitly set — normalizing FunctionsPort to default 54321"
    $FunctionsPort = 54321
}

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
Write-Host "Applying migrations using scripts/apply_migrations_to_staging.py (--yes to avoid interactive prompt)"
try {
    # Pass --yes so the script does not prompt interactively when run from this helper
    python scripts/apply_migrations_to_staging.py --yes
} catch {
    Write-Warning "Applying migrations failed. Check that Python is available and the script exists."
    throw $_
}

# 5) Start the Deno function (background or foreground depending on flag)
$functionPath = 'supabase/functions/claude-queue-builder/index.ts'
if ($StartFunctionInBackground) {
    Write-Host "Starting Deno function in background (FUNCTIONS_PORT=${FunctionsPort}) using Start-Process so we get a real OS process. PID will be stored in .run_local_pipeline_deno.pid"
    # Capture current service key so the child process can inherit it
    $serviceKey = $env:SUPABASE_SERVICE_ROLE_KEY
    $env:FUNCTIONS_PORT = "${FunctionsPort}"
    $fPath = $functionPath
    # Start Deno via Start-Process. This creates a real OS process we can Stop-Process later.
    $startInfo = Start-Process -FilePath deno -ArgumentList @('run','-A','--unstable',$fPath) -PassThru
    Start-Sleep -Seconds 2
    if ($startInfo -and $startInfo.Id) {
        $startInfo.Id | Out-File -FilePath .run_local_pipeline_deno.pid -Encoding ascii
        Write-Host "Deno started as process Id=$($startInfo.Id). PID written to .run_local_pipeline_deno.pid"
    } else {
        Write-Warning "Failed to start Deno as a process. Consider running deno manually (see README)."
    }
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
Write-Host "To stop the background Deno process started by this helper, run: if (Test-Path .run_local_pipeline_deno.pid) { Get-Content .run_local_pipeline_deno.pid | ForEach-Object { Stop-Process -Id ([int]$_) -ErrorAction SilentlyContinue } ; Remove-Item .run_local_pipeline_deno.pid }"
