#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

/**
 * Single Property Test Script - Claude Version
 * 
 * Tests the Claude-powered AI scraper function with a single property
 * to verify basic functionality before running the full test.
 */

const FUNCTION_URL = "http://localhost:54321/functions/v1/ai-scraper-worker";

const SAMPLE_PROPERTY = {
  source: "test.com",
  cleanHtml: `
    <div class="apartment-listing">
      <h1 class="property-title">Test Downtown Apartments</h1>
      <div class="address">123 Test Street, Austin, TX 78701</div>
      <div class="price">$2,500/month</div>
      <div class="bedrooms">2 bedrooms</div>
      <div class="bathrooms">2 bathrooms</div>
      <div class="amenities">
        <p>First month rent free!</p>
        <p>Application fee: $50</p>
        <p>Admin fee waived for qualified applicants</p>
      </div>
    </div>
  `,
  url: "https://test.com/listing/test-1",
  external_id: "claude-test-1",
  source_url: "https://test.com/listing/test-1",
  source_name: "test.com",
  scraping_job_id: 1
};

async function testSinglePropertyWithClaude(): Promise<void> {
  console.log("🤖 Claude-Powered Single Property Test");
  console.log("=====================================");
  console.log();

  // Validate environment
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) {
    console.error("❌ ANTHROPIC_API_KEY not set in environment");
    return;
  }
  
  console.log("✅ Claude API key found");
  console.log(`🔧 Using model: ${Deno.env.get("CLAUDE_MODEL") || "claude-3-haiku-20240307"}`);

  // Check if function server is running
  try {
    const healthCheck = await fetch(FUNCTION_URL, { method: "GET" });
    console.log(`✅ Function server is running (Status: ${healthCheck.status})`);
  } catch (error) {
    console.error("❌ Function server is not running. Please start it with:");
    console.error("   supabase functions serve ai-scraper-worker --env-file .env.local");
    return;
  }

  console.log();
  console.log("📝 Test Property Details:");
  console.log(`   Source: ${SAMPLE_PROPERTY.source}`);
  console.log(`   Expected: 2 bedrooms, 2 bathrooms, $2,500/month`);
  console.log(`   HTML Length: ${SAMPLE_PROPERTY.cleanHtml.length} characters`);
  console.log();

  console.log("🚀 Sending request to Claude-powered scraper...");
  const startTime = Date.now();

  try {
    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY") || ""}`,
      },
      body: JSON.stringify(SAMPLE_PROPERTY)
    });

    const duration = Date.now() - startTime;
    const result = await response.json();

    console.log(`⏱️  Response time: ${duration}ms`);
    console.log();

    if (!response.ok) {
      console.error(`❌ Request failed with status ${response.status}`);
      console.error(`Error: ${result.message || result.error || 'Unknown error'}`);
      if (result.raw) {
        console.error(`Raw response: ${typeof result.raw === 'string' ? result.raw.substring(0, 200) + '...' : JSON.stringify(result.raw).substring(0, 200) + '...'}`);
      }
      return;
    }

    console.log("✅ Request successful!");
    console.log();

    // Analyze response
    console.log("📊 Claude Response Analysis:");
    console.log(`   Status: ${result.status}`);
    
    if (result.data) {
      const data = result.data;
      console.log("   Extracted Data:");
      console.log(`     Name: ${data.name || 'N/A'}`);
      console.log(`     Address: ${data.address || 'N/A'}`);
      console.log(`     City: ${data.city || 'N/A'}`);
      console.log(`     State: ${data.state || 'N/A'}`);
      console.log(`     Price: $${data.current_price || 'N/A'}`);
      console.log(`     Bedrooms: ${data.bedrooms || 'N/A'}`);
      console.log(`     Bathrooms: ${data.bathrooms || 'N/A'}`);
      
      if (data.free_rent_concessions) {
        console.log(`     Concessions: ${data.free_rent_concessions}`);
      }
      if (data.application_fee) {
        console.log(`     Application Fee: $${data.application_fee}`);
      }
      if (data.admin_fee_waived !== undefined) {
        console.log(`     Admin Fee Waived: ${data.admin_fee_waived}`);
      }
    }

    if (result.usage) {
      const usage = result.usage;
      console.log("   Claude API Usage:");
      console.log(`     Provider: ${usage.provider || 'anthropic'}`);
      console.log(`     Model: ${usage.model || 'N/A'}`);
      console.log(`     Input Tokens: ${usage.input_tokens || 'N/A'}`);
      console.log(`     Output Tokens: ${usage.output_tokens || 'N/A'}`);
      console.log(`     Total Tokens: ${usage.total_tokens || 'N/A'}`);
      console.log(`     Estimated Cost: $${usage.estimated_cost || 'N/A'}`);
      
      // Cost comparison
      if (usage.estimated_cost) {
        const cost = parseFloat(usage.estimated_cost);
        console.log(`     💰 Cost per property: $${cost.toFixed(4)}`);
        console.log(`     📈 100 properties estimate: $${(cost * 100).toFixed(2)}`);
      }
    }

    console.log();

    // Validation check
    if (result.data) {
      console.log("🔍 Validation Check:");
      const data = result.data;
      const validations = [
        { field: 'name', expected: 'Test Downtown Apartments', actual: data.name },
        { field: 'city', expected: 'Austin', actual: data.city },
        { field: 'state', expected: 'TX', actual: data.state },
        { field: 'current_price', expected: 2500, actual: data.current_price },
        { field: 'bedrooms', expected: 2, actual: data.bedrooms },
        { field: 'bathrooms', expected: 2, actual: data.bathrooms }
      ];

      let passedValidations = 0;
      validations.forEach(validation => {
        const passed = validation.actual == validation.expected;
        const icon = passed ? '✅' : '❌';
        console.log(`   ${icon} ${validation.field}: ${validation.actual} (expected: ${validation.expected})`);
        if (passed) passedValidations++;
      });

      const accuracy = (passedValidations / validations.length) * 100;
      console.log();
      console.log(`📈 Claude Extraction Accuracy: ${passedValidations}/${validations.length} (${accuracy.toFixed(1)}%)`);

      if (accuracy >= 80) {
        console.log("🎉 Excellent! Claude is working correctly.");
      } else if (accuracy >= 60) {
        console.log("⚠️  Good extraction, but some fields may need attention.");
      } else {
        console.log("❌ Poor extraction accuracy. Check the Claude prompt or validation logic.");
      }
    }

    console.log();
    console.log("✨ Claude single property test completed successfully!");
    console.log("🚀 Ready to run the full 100-property test with Claude.");

  } catch (error) {
    console.error(`❌ Request failed: ${error.message}`);
    console.error("Check your network connection and function server status.");
  }
}

// Main execution
if (import.meta.main) {
  await testSinglePropertyWithClaude();
}