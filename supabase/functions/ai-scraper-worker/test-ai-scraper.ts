#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

/**
 * Test script for ai-scraper-worker Supabase Edge Function
 * 
 * This script tests the AI scraper function by making HTTP requests
 * to the locally running Supabase Edge Function server.
 * 
 * Usage:
 * 1. Start the function locally: supabase functions serve ai-scraper-worker --env-file .env.local
 * 2. Run this test: deno run --allow-net --allow-env --allow-read test-ai-scraper.ts
 */

interface TestProperty {
  id: number;
  source: string;
  url: string;
  cleanHtml: string;
  external_id: string;
  source_url: string;
  source_name: string;
  scraping_job_id: number;
}

// Sample apartment HTML data for testing
const generateTestProperties = (): TestProperty[] => {
  const sampleHtmlTemplates = [
    {
      source: "apartments.com",
      html: `
        <div class="apartment-details">
          <h1 class="property-title">Luxury Downtown Apartments</h1>
          <div class="address">123 Main Street, Austin, TX 78701</div>
          <div class="price">$2,500/month</div>
          <div class="bedrooms">2 bedrooms</div>
          <div class="bathrooms">2 bathrooms</div>
          <div class="amenities">
            <p>Free rent for first month!</p>
            <p>Application fee: $50</p>
            <p>Admin fee waived for qualified applicants</p>
          </div>
        </div>
      `
    },
    {
      source: "rent.com",
      html: `
        <section class="listing">
          <h2>Riverside View Condos</h2>
          <address>456 River Drive, Denver, CO 80202</address>
          <span class="rent-price">$1,800</span>
          <div class="unit-details">
            <span>1 bed</span>
            <span>1 bath</span>
          </div>
          <div class="specials">No application fee this month!</div>
        </section>
      `
    },
    {
      source: "zillow.com",
      html: `
        <div class="rental-listing">
          <h3>Modern Studio Loft</h3>
          <div class="location">789 Oak Avenue, Seattle, WA 98101</div>
          <div class="pricing">
            <span class="monthly-rent">$2,200</span>
            <div class="fees">
              <p>Application Fee: $75</p>
              <p>Admin Fee: $150 (waived with 12-month lease)</p>
            </div>
          </div>
          <div class="unit-info">
            <span>Studio</span>
            <span>1 bathroom</span>
          </div>
        </div>
      `
    }
  ];

  const properties: TestProperty[] = [];
  
  for (let i = 1; i <= 100; i++) {
    const template = sampleHtmlTemplates[i % sampleHtmlTemplates.length];
    const cityVariations = [
      { city: "Austin", state: "TX", zip: "78701" },
      { city: "Denver", state: "CO", zip: "80202" },
      { city: "Seattle", state: "WA", zip: "98101" },
      { city: "Portland", state: "OR", zip: "97201" },
      { city: "Phoenix", state: "AZ", zip: "85001" }
    ];
    
    const location = cityVariations[i % cityVariations.length];
    const priceVariations = [1500, 1800, 2200, 2500, 3000, 3500];
    const price = priceVariations[i % priceVariations.length];
    
    // Customize HTML with variations
    let customHtml = template.html
      .replace(/Austin|Denver|Seattle/g, location.city)
      .replace(/TX|CO|WA/g, location.state)
      .replace(/78701|80202|98101/g, location.zip)
      .replace(/\$\d+,?\d*/g, `$${price.toLocaleString()}`);
    
    properties.push({
      id: i,
      source: template.source,
      url: `https://${template.source}/listing/${i}`,
      cleanHtml: customHtml,
      external_id: `test-${template.source}-${i}`,
      source_url: `https://${template.source}/listing/${i}`,
      source_name: template.source,
      scraping_job_id: Math.floor(i / 10) + 1
    });
  }
  
  return properties;
};

// Test configuration
const FUNCTION_URL = "http://localhost:54321/functions/v1/ai-scraper-worker";
const TEST_BATCH_SIZE = 5; // Process in smaller batches to avoid overwhelming the API
const DELAY_BETWEEN_REQUESTS = 1000; // 1 second delay between requests

async function testSingleProperty(property: TestProperty): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    console.log(`Testing property ${property.id}: ${property.source}`);
    
    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY") || ""}`,
      },
      body: JSON.stringify({
        source: property.source,
        cleanHtml: property.cleanHtml,
        url: property.url,
        external_id: property.external_id,
        source_url: property.source_url,
        source_name: property.source_name,
        scraping_job_id: property.scraping_job_id
      })
    });

    const result = await response.json();
    
    if (!response.ok) {
      return { 
        success: false, 
        error: `HTTP ${response.status}: ${result.message || 'Unknown error'}` 
      };
    }

    return { success: true, result };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests(): Promise<void> {
  console.log("🚀 Starting AI Scraper Worker Tests");
  console.log("=" .repeat(50));
  
  // Check if function server is running
  try {
    const healthCheck = await fetch(FUNCTION_URL, { method: "GET" });
    console.log(`✅ Function server is running (Status: ${healthCheck.status})`);
  } catch (error) {
    console.error("❌ Function server is not running. Please start it with:");
    console.error("   supabase functions serve ai-scraper-worker --env-file .env.local");
    return;
  }

  const testProperties = generateTestProperties();
  console.log(`📊 Generated ${testProperties.length} test properties`);
  console.log(`🔄 Processing in batches of ${TEST_BATCH_SIZE}`);
  console.log();

  const results = {
    total: testProperties.length,
    successful: 0,
    failed: 0,
    errors: [] as string[]
  };

  // Process properties in batches
  for (let i = 0; i < testProperties.length; i += TEST_BATCH_SIZE) {
    const batch = testProperties.slice(i, i + TEST_BATCH_SIZE);
    console.log(`📦 Processing batch ${Math.floor(i / TEST_BATCH_SIZE) + 1}/${Math.ceil(testProperties.length / TEST_BATCH_SIZE)}`);
    
    // Process batch concurrently
    const batchPromises = batch.map(property => testSingleProperty(property));
    const batchResults = await Promise.all(batchPromises);
    
    // Analyze batch results
    batchResults.forEach((result, index) => {
      const property = batch[index];
      if (result.success) {
        results.successful++;
        console.log(`  ✅ Property ${property.id} (${property.source}): Success`);
        if (result.result?.data) {
          const data = result.result.data;
          console.log(`     📍 ${data.name || 'N/A'} - ${data.city || 'N/A'}, ${data.state || 'N/A'} - $${data.current_price || 'N/A'}`);
        }
        if (result.result?.usage) {
          const usage = result.result.usage;
          console.log(`     💰 Tokens: ${usage.total_tokens || 'N/A'}, Cost: $${usage.estimated_cost || 'N/A'}`);
        }
      } else {
        results.failed++;
        results.errors.push(`Property ${property.id}: ${result.error}`);
        console.log(`  ❌ Property ${property.id} (${property.source}): ${result.error}`);
      }
    });
    
    // Delay between batches to be respectful to the API
    if (i + TEST_BATCH_SIZE < testProperties.length) {
      console.log(`⏱️  Waiting ${DELAY_BETWEEN_REQUESTS}ms before next batch...`);
      await delay(DELAY_BETWEEN_REQUESTS);
    }
    console.log();
  }

  // Final results
  console.log("📈 TEST RESULTS");
  console.log("=" .repeat(50));
  console.log(`Total Properties Tested: ${results.total}`);
  console.log(`Successful: ${results.successful} (${((results.successful / results.total) * 100).toFixed(1)}%)`);
  console.log(`Failed: ${results.failed} (${((results.failed / results.total) * 100).toFixed(1)}%)`);
  
  if (results.errors.length > 0) {
    console.log("\n❌ ERRORS:");
    results.errors.forEach(error => console.log(`   ${error}`));
  }
  
  console.log("\n🎉 Testing completed!");
}

// Environment validation
function validateEnvironment(): boolean {
  const requiredEnvVars = [
    "OPENAI_API_KEY",
    "SUPABASE_URL", 
    "SUPABASE_SERVICE_ROLE_KEY"
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !Deno.env.get(varName));
  
  if (missingVars.length > 0) {
    console.error("❌ Missing required environment variables:");
    missingVars.forEach(varName => console.error(`   ${varName}`));
    console.error("\nPlease set these in your .env.local file");
    return false;
  }
  
  return true;
}

// Main execution
if (import.meta.main) {
  console.log("🔍 Validating environment...");
  
  if (!validateEnvironment()) {
    Deno.exit(1);
  }
  
  console.log("✅ Environment validation passed");
  console.log();
  
  await runTests();
}