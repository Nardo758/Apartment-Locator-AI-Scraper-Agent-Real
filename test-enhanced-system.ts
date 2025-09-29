#!/usr/bin/env -S deno run --allow-read --allow-env --allow-net

/**
 * Enhanced System Test Script
 * Validates configuration, environment variables, and system health
 */

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color: string, message: string) {
  console.log(`${color}${message}${colors.reset}`);
}

async function main() {
  log(colors.blue, '🧪 Enhanced Property Scraper System Tests');
  log(colors.blue, '==============================================');

  let allPassed = true;

  // Test 1: Configuration validation
  log(colors.blue, '\n📋 Test 1: Configuration Validation');

  try {
    const configText = await Deno.readTextFile('deploy-control.json');
    const config = JSON.parse(configText);

    log(colors.green, '✅ Configuration file exists');

    console.log(`  Scraping Enabled: ${config.scraping_enabled}`);
    console.log(`  Batch Size: ${config.batch_size}`);
    console.log(`  Daily Cost Limit: $${config.cost_limit_daily}`);
    log(colors.green, '✅ Configuration is valid');
  } catch (_error) {
    log(colors.red, '❌ deploy-control.json not found or invalid');
    allPassed = false;
  }

  // Test 2: Environment variables
  log(colors.blue, '\n🔑 Test 2: Environment Variables');

  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'ANTHROPIC_API_KEY'
  ];

  for (const varName of requiredVars) {
    const value = Deno.env.get(varName);
    if (value && value.trim() !== '') {
      log(colors.green, `✅ ${varName} is set`);
    } else {
      log(colors.red, `❌ ${varName} is not set`);
      allPassed = false;
    }
  }

  // Test 3: Supabase connectivity
  log(colors.blue, '\n🌐 Test 3: Supabase Connectivity');

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (supabaseUrl && supabaseKey) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
          'apikey': supabaseKey,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        log(colors.green, '✅ Supabase connection healthy');
      } else {
        log(colors.red, '❌ Supabase connection failed');
        allPassed = false;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      log(colors.red, `❌ Supabase connection error: ${message}`);
      allPassed = false;
    }
  } else {
    log(colors.yellow, '⚠️ Skipping Supabase connectivity test - missing environment variables');
  }

  // Test 4: Edge Functions check
  log(colors.blue, '\n⚡ Test 4: Edge Functions');

  const functionDirs = [
    'supabase/functions/command-station',
    'supabase/functions/ai-scraper-worker',
    'supabase/functions/property-researcher',
    'supabase/functions/scheduled-scraper'
  ];

  for (const dir of functionDirs) {
    try {
      await Deno.stat(`${dir}/index.ts`);
      log(colors.green, `✅ ${dir} exists`);
    } catch {
      log(colors.red, `❌ ${dir} not found`);
      allPassed = false;
    }
  }

  // Summary
  log(colors.blue, '\n📊 Test Summary');

  if (allPassed) {
    log(colors.green, '✅ All tests passed!');
    Deno.exit(0);
  } else {
    log(colors.red, '❌ Some tests failed');
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}