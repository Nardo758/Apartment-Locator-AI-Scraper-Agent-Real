#!/usr/bin/env -S deno run --allow-read

/**
 * Configuration Validation Script for GitHub Actions
 * Validates deployment configuration files before deployment
 */

interface DeployConfig {
  supabase?: {
    projectId?: string;
    functions?: string[];
    migrations?: string[];
  };
  scraper?: {
    batchSize?: number;
    dailyCostLimit?: number;
    enableAIPricing?: boolean;
    enableFrontendSync?: boolean;
  };
  monitoring?: {
    enableSlackNotifications?: boolean;
    enableCostTracking?: boolean;
  };
}

async function validateConfig(): Promise<void> {
  console.log("🔍 Validating deployment configuration...");
  
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if deploy-control.json exists
  try {
    const configText = await Deno.readTextFile("deploy-control.json");
    const config: DeployConfig = JSON.parse(configText);
    
    console.log("✅ deploy-control.json found and parsed successfully");
    
    // Validate Supabase configuration
    if (!config.supabase?.projectId) {
      warnings.push("Supabase project ID not specified in config");
    }
    
    // Validate scraper configuration
    if (config.scraper) {
      if (config.scraper.batchSize && (config.scraper.batchSize < 1 || config.scraper.batchSize > 1000)) {
        errors.push("Batch size must be between 1 and 1000");
      }
      
      if (config.scraper.dailyCostLimit && config.scraper.dailyCostLimit < 0) {
        errors.push("Daily cost limit cannot be negative");
      }
    }
    
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      warnings.push("deploy-control.json not found, using default configuration");
    } else {
      errors.push(`Failed to parse deploy-control.json: ${error.message}`);
    }
  }

  // Check for required deployment files
  const requiredFiles = [
    "deno.json",
    "src/main.ts"
  ];

  for (const file of requiredFiles) {
    try {
      await Deno.stat(file);
      console.log(`✅ ${file} found`);
    } catch {
      errors.push(`Required file missing: ${file}`);
    }
  }

  // Check for Supabase configuration
  try {
    await Deno.stat("supabase/config.toml");
    console.log("✅ Supabase configuration found");
  } catch {
    warnings.push("supabase/config.toml not found - make sure Supabase is initialized");
  }

  // Check for database migrations
  try {
    const migrations = [];
    for await (const entry of Deno.readDir("supabase/migrations")) {
      if (entry.name.endsWith(".sql")) {
        migrations.push(entry.name);
      }
    }
    if (migrations.length > 0) {
      console.log(`✅ Found ${migrations.length} database migration(s)`);
    } else {
      warnings.push("No database migrations found");
    }
  } catch {
    warnings.push("supabase/migrations directory not found");
  }

  // Check for Edge Functions
  try {
    const functions = [];
    for await (const entry of Deno.readDir("supabase/functions")) {
      if (entry.isDirectory) {
        functions.push(entry.name);
      }
    }
    if (functions.length > 0) {
      console.log(`✅ Found ${functions.length} Edge Function(s): ${functions.join(", ")}`);
    } else {
      warnings.push("No Edge Functions found");
    }
  } catch {
    warnings.push("supabase/functions directory not found");
  }

  // Print results
  console.log("\n📊 Validation Results:");
  
  if (warnings.length > 0) {
    console.log("\n⚠️  Warnings:");
    warnings.forEach(warning => console.log(`   • ${warning}`));
  }
  
  if (errors.length > 0) {
    console.log("\n❌ Errors:");
    errors.forEach(error => console.log(`   • ${error}`));
    console.log("\n💥 Configuration validation failed!");
    Deno.exit(1);
  }
  
  console.log("\n✅ Configuration validation passed!");
  
  if (warnings.length === 0) {
    console.log("🎉 No warnings - configuration is optimal!");
  }
}

if (import.meta.main) {
  await validateConfig();
}