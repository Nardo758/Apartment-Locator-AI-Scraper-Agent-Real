#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

/**
 * Enhanced Real Integration Test for ai-scraper-worker
 * 
 * This script provides production-ready testing with:
 * - Real API calls to OpenAI
 * - Cost tracking and monitoring
 * - Rate limiting protection
 * - Retry logic for failed requests
 * - Detailed performance analytics
 * 
 * Usage: deno run --allow-net --allow-env --allow-read test-ai-scraper-enhanced.ts
 */

interface TestConfig {
  batchSize: number;
  delayBetweenRequests: number;
  maxRetries: number;
  timeoutMs: number;
  costAlertThreshold: number;
}

interface TestProperty {
  id: number;
  source: string;
  url: string;
  cleanHtml: string;
  external_id: string;
  source_url: string;
  source_name: string;
  scraping_job_id: number;
  scenario: string;
}

interface TestResult {
  property: TestProperty;
  success: boolean;
  response?: any;
  error?: string;
  duration: number;
  retries: number;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost?: number;
}

class CostTracker {
  private totalTokens = 0;
  private costs = {
    openai: { input: 0, output: 0 },
    anthropic: { input: 0, output: 0 }
  };
  private callCount = 0;

  trackCall(service: 'openai' | 'anthropic', inputTokens: number, outputTokens: number): number {
    this.totalTokens += inputTokens + outputTokens;
    this.callCount++;
    
    let callCost = 0;
    if (service === 'openai') {
      const inputCost = inputTokens * 0.0000015; // $1.50 per 1M tokens (GPT-4 Turbo)
      const outputCost = outputTokens * 0.000006; // $6.00 per 1M tokens
      callCost = inputCost + outputCost;
      this.costs.openai.input += inputCost;
      this.costs.openai.output += outputCost;
    } else {
      const inputCost = inputTokens * 0.0000008; // Claude Haiku pricing
      const outputCost = outputTokens * 0.0000040;
      callCost = inputCost + outputCost;
      this.costs.anthropic.input += inputCost;
      this.costs.anthropic.output += outputCost;
    }
    
    return callCost;
  }

  getTotalCost(): number {
    return this.costs.openai.input + this.costs.openai.output + 
           this.costs.anthropic.input + this.costs.anthropic.output;
  }

  getReport() {
    const totalCost = this.getTotalCost();
    
    return {
      totalTokens: this.totalTokens,
      totalCost: totalCost,
      averageCostPerCall: this.callCount > 0 ? totalCost / this.callCount : 0,
      callCount: this.callCount,
      breakdown: {
        openai: {
          input: this.costs.openai.input,
          output: this.costs.openai.output,
          total: this.costs.openai.input + this.costs.openai.output
        },
        anthropic: {
          input: this.costs.anthropic.input,
          output: this.costs.anthropic.output,
          total: this.costs.anthropic.input + this.costs.anthropic.output
        }
      }
    };
  }

  checkCostAlert(threshold: number): boolean {
    return this.getTotalCost() > threshold;
  }
}

// Load configuration from environment variables
function loadTestConfig(): TestConfig {
  return {
    batchSize: parseInt(Deno.env.get("TEST_BATCH_SIZE") || "5"),
    delayBetweenRequests: parseInt(Deno.env.get("TEST_DELAY_MS") || "1000"),
    maxRetries: parseInt(Deno.env.get("TEST_MAX_RETRIES") || "3"),
    timeoutMs: parseInt(Deno.env.get("TEST_TIMEOUT_MS") || "30000"),
    costAlertThreshold: parseFloat(Deno.env.get("COST_ALERT_THRESHOLD") || "10.00")
  };
}

// Generate realistic test properties with diverse scenarios
function generateRealTestProperties(): TestProperty[] {
  const scenarios = [
    {
      type: "luxury_apartment",
      sources: ["apartments.com", "zillow.com"],
      html: `
        <div class="luxury-listing">
          <h1 class="property-title">Luxury High-Rise Apartments</h1>
          <div class="address">500 Park Avenue, New York, NY 10022</div>
          <div class="price">$4,500/month</div>
          <div class="details">
            <span>2 bedrooms</span>
            <span>2 bathrooms</span>
            <span>1,200 sq ft</span>
          </div>
          <div class="amenities">
            <p>Concierge service, fitness center, rooftop terrace</p>
            <p>First month rent free with 12-month lease</p>
            <p>Application fee: $100</p>
            <p>Admin fee: $300 (waived for qualified applicants)</p>
          </div>
        </div>
      `
    },
    {
      type: "budget_apartment",
      sources: ["rent.com", "padmapper.com"],
      html: `
        <section class="budget-listing">
          <h2>Affordable Studio Apartments</h2>
          <address>1200 Industrial Blvd, Austin, TX 78704</address>
          <span class="rent">$1,200</span>
          <div class="unit-info">
            <span>Studio</span>
            <span>1 bathroom</span>
            <span>450 sq ft</span>
          </div>
          <div class="offers">
            <p>No application fee this month!</p>
            <p>Pet-friendly (additional $25/month)</p>
          </div>
        </section>
      `
    },
    {
      type: "suburban_house",
      sources: ["zillow.com", "realtor.com"],
      html: `
        <div class="house-listing">
          <h1>Charming Suburban Home</h1>
          <div class="location">789 Maple Street, Denver, CO 80202</div>
          <div class="pricing">
            <span class="rent-price">$2,800/month</span>
            <div class="deposit">Security deposit: $2,800</div>
          </div>
          <div class="home-details">
            <span>3 bedrooms</span>
            <span>2.5 bathrooms</span>
            <span>1,800 sq ft</span>
            <span>2-car garage</span>
          </div>
          <div class="lease-terms">
            <p>Application fee: $75 per adult</p>
            <p>Admin fee: $200</p>
            <p>Pet deposit: $500 (refundable)</p>
          </div>
        </div>
      `
    }
  ];

  const cities = [
    { city: "New York", state: "NY", zip: "10022" },
    { city: "Austin", state: "TX", zip: "78704" },
    { city: "Denver", state: "CO", zip: "80202" },
    { city: "Seattle", state: "WA", zip: "98101" },
    { city: "Portland", state: "OR", zip: "97201" },
    { city: "Phoenix", state: "AZ", zip: "85001" },
    { city: "Miami", state: "FL", zip: "33101" },
    { city: "Chicago", state: "IL", zip: "60601" }
  ];

  const properties: TestProperty[] = [];

  for (let i = 1; i <= 100; i++) {
    const scenario = scenarios[i % scenarios.length];
    const source = scenario.sources[i % scenario.sources.length];
    const city = cities[i % cities.length];
    
    // Vary prices realistically by city
    const basePrices = { "luxury_apartment": 4500, "budget_apartment": 1200, "suburban_house": 2800 };
    const cityMultipliers = { "NY": 2.0, "CA": 1.8, "WA": 1.5, "CO": 1.2, "TX": 1.0, "AZ": 0.9, "FL": 1.1, "IL": 1.3 };
    const basePrice = basePrices[scenario.type as keyof typeof basePrices];
    const multiplier = cityMultipliers[city.state as keyof typeof cityMultipliers] || 1.0;
    const finalPrice = Math.round(basePrice * multiplier * (0.8 + Math.random() * 0.4)); // ±20% variation

    // Customize HTML with realistic variations
    const customHtml = scenario.html
      .replace(/New York|Austin|Denver/g, city.city)
      .replace(/NY|TX|CO/g, city.state)
      .replace(/10022|78704|80202/g, city.zip)
      .replace(/\$\d+,?\d*/g, `$${finalPrice.toLocaleString()}`);

    properties.push({
      id: i,
      source: source,
      url: `https://${source}/listing/${city.state.toLowerCase()}-${i}`,
      cleanHtml: customHtml,
      external_id: `enhanced-test-${source}-${i}`,
      source_url: `https://${source}/listing/${city.state.toLowerCase()}-${i}`,
      source_name: source,
      scraping_job_id: Math.floor((i - 1) / 10) + 1,
      scenario: scenario.type
    });
  }

  return properties;
}

const FUNCTION_URL = "http://localhost:54321/functions/v1/ai-scraper-worker";

async function testSinglePropertyWithRetry(
  property: TestProperty, 
  config: TestConfig,
  costTracker: CostTracker
): Promise<TestResult> {
  const startTime = Date.now();
  let lastError = "";
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);
      
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
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const result = await response.json();
      const duration = Date.now() - startTime;

      if (!response.ok) {
        lastError = `HTTP ${response.status}: ${result.message || 'Unknown error'}`;
        if (attempt < config.maxRetries) {
          console.log(`    ⚠️  Attempt ${attempt + 1} failed: ${lastError}, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
          continue;
        }
      } else {
        // Track costs if usage information is available
        if (result.usage && Deno.env.get("ENABLE_COST_TRACKING") === "true") {
          const cost = costTracker.trackCall(
            'openai', 
            result.usage.prompt_tokens || 0, 
            result.usage.completion_tokens || 0
          );
          
          return {
            property,
            success: true,
            response: result,
            duration,
            retries: attempt,
            tokens: {
              prompt: result.usage.prompt_tokens || 0,
              completion: result.usage.completion_tokens || 0,
              total: result.usage.total_tokens || 0
            },
            cost
          };
        }
        
        return {
          property,
          success: true,
          response: result,
          duration,
          retries: attempt
        };
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt < config.maxRetries) {
        console.log(`    ⚠️  Attempt ${attempt + 1} failed: ${lastError}, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  return {
    property,
    success: false,
    error: lastError,
    duration: Date.now() - startTime,
    retries: config.maxRetries
  };
}

async function runEnhancedRealTests(): Promise<void> {
  console.log("🏠 REAL 100-PROPERTY INTEGRATION TEST");
  console.log("=====================================");
  console.log("🔥 Enhanced version with cost tracking, retry logic, and performance monitoring");
  console.log();

  // Load configuration
  const config = loadTestConfig();
  const costTracker = new CostTracker();
  
  console.log("⚙️ Test Configuration:");
  console.log(`   Batch Size: ${config.batchSize}`);
  console.log(`   Delay Between Batches: ${config.delayBetweenRequests}ms`);
  console.log(`   Max Retries: ${config.maxRetries}`);
  console.log(`   Timeout: ${config.timeoutMs}ms`);
  console.log(`   Cost Alert Threshold: $${config.costAlertThreshold}`);
  console.log();

  // Check if function server is running
  try {
    const healthCheck = await fetch(FUNCTION_URL, { method: "GET" });
    console.log(`✅ Function server is running (Status: ${healthCheck.status})`);
  } catch (_error) {
    console.error("❌ Function server is not running. Please start it with:");
    console.error("   supabase functions serve ai-scraper-worker --env-file .env.local");
    return;
  }

  const testProperties = generateRealTestProperties();
  console.log(`📊 Generated ${testProperties.length} realistic test properties`);
  console.log(`🔄 Processing in batches of ${config.batchSize}`);
  console.log();

  const results: TestResult[] = [];
  const startTime = Date.now();

  // Process properties in batches
  for (let i = 0; i < testProperties.length; i += config.batchSize) {
    const batch = testProperties.slice(i, i + config.batchSize);
    const batchNum = Math.floor(i / config.batchSize) + 1;
    const totalBatches = Math.ceil(testProperties.length / config.batchSize);
    
    console.log(`📦 Processing batch ${batchNum}/${totalBatches} (Properties ${i + 1}-${Math.min(i + config.batchSize, testProperties.length)})`);
    
    // Process batch concurrently with individual retry logic
    const batchPromises = batch.map(property => testSinglePropertyWithRetry(property, config, costTracker));
    const batchResults = await Promise.all(batchPromises);
    
    // Analyze batch results
    batchResults.forEach((result, index) => {
      const property = batch[index];
      if (result.success) {
        console.log(`  ✅ Property ${property.id} (${property.source}, ${property.scenario}): Success (${result.duration}ms)`);
        if (result.response?.data) {
          const data = result.response.data;
          console.log(`     📍 ${data.name || 'N/A'} - ${data.city || 'N/A'}, ${data.state || 'N/A'} - $${data.current_price || 'N/A'}`);
        }
        if (result.tokens && result.cost) {
          console.log(`     💰 Tokens: ${result.tokens.total}, Cost: $${result.cost.toFixed(4)}`);
        }
        if (result.retries > 0) {
          console.log(`     🔄 Retries: ${result.retries}`);
        }
      } else {
        console.log(`  ❌ Property ${property.id} (${property.source}, ${property.scenario}): ${result.error} (${result.duration}ms)`);
        if (result.retries > 0) {
          console.log(`     🔄 Failed after ${result.retries} retries`);
        }
      }
    });
    
    results.push(...batchResults);

    // Cost monitoring
    if (Deno.env.get("ENABLE_COST_TRACKING") === "true" && costTracker.checkCostAlert(config.costAlertThreshold)) {
      console.log(`🚨 COST ALERT: Total cost ($${costTracker.getTotalCost().toFixed(4)}) exceeded threshold ($${config.costAlertThreshold})`);
      const userInput = prompt("Continue testing? (y/n): ");
      if (userInput?.toLowerCase() !== 'y') {
        console.log("🛑 Testing stopped by user due to cost concerns");
        break;
      }
    }
    
    // Delay between batches
    if (i + config.batchSize < testProperties.length) {
      console.log(`⏱️  Waiting ${config.delayBetweenRequests}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, config.delayBetweenRequests));
    }
    console.log();
  }

  // Generate comprehensive report
  generateEnhancedTestReport(results, costTracker, Date.now() - startTime);
}

function generateEnhancedTestReport(results: TestResult[], costTracker: CostTracker, totalDuration: number): void {
  console.log("📈 ENHANCED TEST RESULTS");
  console.log("=" .repeat(50));
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalRetries = results.reduce((sum, r) => sum + r.retries, 0);
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  
  // Basic statistics
  console.log(`Total Properties Tested: ${results.length}`);
  console.log(`Successful: ${successful} (${((successful / results.length) * 100).toFixed(1)}%)`);
  console.log(`Failed: ${failed} (${((failed / results.length) * 100).toFixed(1)}%)`);
  console.log(`Total Retries: ${totalRetries}`);
  console.log(`Average Duration: ${avgDuration.toFixed(0)}ms per property`);
  console.log(`Total Test Duration: ${(totalDuration / 1000 / 60).toFixed(1)} minutes`);
  
  // Performance analysis
  const fastResults = results.filter(r => r.duration < 3000).length;
  const slowResults = results.filter(r => r.duration >= 10000).length;
  console.log(`\n⚡ Performance Analysis:`);
  console.log(`   Fast responses (<3s): ${fastResults} (${((fastResults / results.length) * 100).toFixed(1)}%)`);
  console.log(`   Slow responses (≥10s): ${slowResults} (${((slowResults / results.length) * 100).toFixed(1)}%)`);
  
  // Cost analysis
  if (Deno.env.get("ENABLE_COST_TRACKING") === "true") {
    const costReport = costTracker.getReport();
    console.log(`\n💰 Cost Analysis:`);
    console.log(`   Total Cost: $${costReport.totalCost.toFixed(4)}`);
    console.log(`   Average Cost per Property: $${costReport.averageCostPerCall.toFixed(4)}`);
    console.log(`   Total Tokens: ${costReport.totalTokens.toLocaleString()}`);
    console.log(`   OpenAI Costs: $${costReport.breakdown.openai.total.toFixed(4)}`);
    if (costReport.breakdown.anthropic.total > 0) {
      console.log(`   Anthropic Costs: $${costReport.breakdown.anthropic.total.toFixed(4)}`);
    }
    
    // Extrapolation
    const monthlyEstimate = (costReport.totalCost / results.length) * 1000 * 30; // 1000 properties/day * 30 days
    console.log(`   Monthly Estimate (1000 props/day): $${monthlyEstimate.toFixed(2)}`);
  }
  
  // Error analysis
  const errors = results.filter(r => !r.success);
  if (errors.length > 0) {
    console.log(`\n❌ Error Analysis:`);
    const errorTypes = new Map<string, number>();
    errors.forEach(error => {
      const errorType = error.error?.split(':')[0] || 'Unknown';
      errorTypes.set(errorType, (errorTypes.get(errorType) || 0) + 1);
    });
    
    errorTypes.forEach((count, errorType) => {
      console.log(`   ${errorType}: ${count} occurrences`);
    });
  }
  
  // Scenario analysis
  const scenarios = new Map<string, { success: number, total: number }>();
  results.forEach(result => {
    const scenario = result.property.scenario;
    if (!scenarios.has(scenario)) {
      scenarios.set(scenario, { success: 0, total: 0 });
    }
    const stats = scenarios.get(scenario)!;
    stats.total++;
    if (result.success) stats.success++;
  });
  
  console.log(`\n🏠 Scenario Analysis:`);
  scenarios.forEach((stats, scenario) => {
    const successRate = ((stats.success / stats.total) * 100).toFixed(1);
    console.log(`   ${scenario}: ${stats.success}/${stats.total} (${successRate}%)`);
  });
  
  console.log("\n🎉 Enhanced testing completed!");
  
  if (failed === 0) {
    console.log("✨ Perfect success rate! Your function is production-ready.");
  } else if (successful / results.length >= 0.95) {
    console.log("✅ Excellent success rate (≥95%). Ready for production deployment.");
  } else if (successful / results.length >= 0.90) {
    console.log("⚠️  Good success rate (≥90%). Consider investigating common failure patterns.");
  } else {
    console.log("🔧 Success rate below 90%. Review errors and optimize before production deployment.");
  }
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
    console.error("Use the template: cp .env.local.template .env.local");
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
  
  await runEnhancedRealTests();
}