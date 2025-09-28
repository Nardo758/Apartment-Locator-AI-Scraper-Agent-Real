// test-claude-direct-node.js - Direct Claude API test using Node.js
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          process.env[key.trim()] = valueParts.join('=').trim();
        }
      }
    }
  }
}

// Sample property HTML data for testing
const testProperties = [
  {
    id: 'test-1',
    source: 'apartments.com',
    html: `
      <div class="property-info">
        <h1>Sunset Gardens Apartment</h1>
        <div class="address">1234 Oak Street, Austin, TX 78701</div>
        <div class="price">$1,850/month</div>
        <div class="details">2 bed • 1 bath</div>
        <div class="fees">Application Fee: $75</div>
        <div class="specials">First month free with 12-month lease</div>
      </div>
    `
  },
  {
    id: 'test-2', 
    source: 'zillow.com',
    html: `
      <section class="rental-info">
        <h2>Modern Downtown Loft</h2>
        <p class="location">567 Main St, Dallas, TX 75201</p>
        <span class="rent-price">$2,100</span>
        <div class="bedroom-info">1 bedroom, 1 bathroom</div>
        <div class="admin-fee">Admin fee waived for new residents</div>
      </section>
    `
  },
  {
    id: 'test-3',
    source: 'rent.com', 
    html: `
      <div class="listing">
        <div class="title">Riverside Apartments</div>
        <div class="address">890 River Road, Houston, TX 77001</div>
        <div class="pricing">$1,650 per month</div>
        <div class="layout">3 bedrooms, 2 bathrooms</div>
        <div class="deposit-info">No application fee • $200 admin fee</div>
      </div>
    `
  }
];

async function testClaudeExtraction(property) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey || anthropicKey.includes('your-actual-claude-key-here')) {
    throw new Error('ANTHROPIC_API_KEY not properly configured');
  }

  const claudeModel = process.env.CLAUDE_MODEL || 'claude-3-haiku-20240307';
  
  const systemPrompt = `You are an expert web scraper for apartment rental data.
Extract the following fields from HTML and return ONLY valid JSON:
- name, address, city, state (2 letters)
- current_price (number only, no symbols)
- bedrooms, bathrooms (numbers)
- free_rent_concessions (text description)
- application_fee (number or null)
- admin_fee_waived (boolean)
- admin_fee_amount (number or null)

Return valid JSON. Use null for missing fields.`;

  const userMessage = `Extract apartment data from this ${property.source} page HTML:\n\n${property.html}`;

  const claudeBody = {
    model: claudeModel,
    max_tokens: 2000,
    temperature: 0.1,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: userMessage
      }
    ]
  };

  const startTime = Date.now();
  
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(claudeBody),
    });

    const aiResponse = await response.json();
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    if (!response.ok) {
      throw new Error(`Claude API error: ${aiResponse.error?.message || 'Unknown error'}`);
    }

    // Extract usage information for cost tracking
    const usage = aiResponse.usage || {};
    const inputTokens = usage.input_tokens || 0;
    const outputTokens = usage.output_tokens || 0;
    const totalTokens = inputTokens + outputTokens;

    // Extract content from Claude response
    let content = "";
    if (aiResponse.content && Array.isArray(aiResponse.content) && aiResponse.content.length > 0) {
      content = aiResponse.content[0].text || "";
    }

    if (!content) {
      throw new Error('Claude returned empty response');
    }

    // Parse JSON response
    let parsedData;
    try {
      parsedData = JSON.parse(content);
    } catch (parseError) {
      throw new Error(`Claude returned non-JSON: ${content}`);
    }

    // Calculate cost estimate for Claude
    const CLAUDE_PRICING = {
      'claude-3-haiku-20240307': { input: 0.80, output: 4.00 },
      'claude-3-sonnet-20240229': { input: 15.00, output: 75.00 },
      'claude-3-opus-20240229': { input: 75.00, output: 225.00 }
    };

    const pricing = CLAUDE_PRICING[claudeModel] || CLAUDE_PRICING['claude-3-haiku-20240307'];
    const estimatedCost = ((inputTokens * pricing.input) + (outputTokens * pricing.output)) / 1000000;

    return {
      success: true,
      property_id: property.id,
      source: property.source,
      data: parsedData,
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens,
        estimated_cost: Number(estimatedCost.toFixed(6)),
        model: claudeModel,
        provider: 'anthropic'
      },
      response_time_ms: responseTime
    };

  } catch (error) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    return {
      success: false,
      property_id: property.id,
      source: property.source,
      error: error.message,
      response_time_ms: responseTime
    };
  }
}

async function runTest() {
  console.log("🧪 CLAUDE API DIRECT TEST");
  console.log("========================");
  
  // Load environment variables
  loadEnv();
  
  // Check API key
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey || anthropicKey.includes('your-actual-claude-key-here')) {
    console.error("❌ ANTHROPIC_API_KEY not properly configured in .env.local");
    console.error("   Please update .env.local with your actual Claude API key");
    process.exit(1);
  }

  console.log(`✅ Using Claude model: ${process.env.CLAUDE_MODEL || 'claude-3-haiku-20240307'}`);
  console.log(`📊 Testing ${testProperties.length} sample properties...\n`);

  const results = [];
  let totalCost = 0;
  let totalTime = 0;
  let successCount = 0;

  for (let i = 0; i < testProperties.length; i++) {
    const property = testProperties[i];
    console.log(`🏠 Testing property ${i + 1}/${testProperties.length}: ${property.id} (${property.source})`);
    
    const result = await testClaudeExtraction(property);
    results.push(result);
    
    totalTime += result.response_time_ms;
    
    if (result.success) {
      successCount++;
      totalCost += result.usage.estimated_cost;
      
      console.log(`   ✅ Success - ${result.response_time_ms}ms`);
      console.log(`   💰 Cost: $${result.usage.estimated_cost.toFixed(6)}`);
      console.log(`   🏷️  Name: ${result.data.name || 'N/A'}`);
      console.log(`   📍 Address: ${result.data.address || 'N/A'}`);
      console.log(`   💵 Price: $${result.data.current_price || 'N/A'}`);
      console.log(`   🛏️  Beds/Baths: ${result.data.bedrooms || 0}/${result.data.bathrooms || 0}`);
    } else {
      console.log(`   ❌ Failed - ${result.response_time_ms}ms`);
      console.log(`   🚨 Error: ${result.error}`);
    }
    console.log("");
    
    // Add small delay to be respectful to the API
    if (i < testProperties.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Summary
  console.log("📈 TEST SUMMARY");
  console.log("===============");
  console.log(`✅ Success Rate: ${successCount}/${testProperties.length} (${Math.round(successCount/testProperties.length*100)}%)`);
  console.log(`💰 Total Cost: $${totalCost.toFixed(6)}`);
  console.log(`⏱️  Total Time: ${(totalTime/1000).toFixed(1)}s`);
  console.log(`📊 Avg Response Time: ${Math.round(totalTime/testProperties.length)}ms`);
  
  if (successCount === testProperties.length) {
    console.log("\n🎉 ALL TESTS PASSED! Claude integration is working perfectly.");
    console.log("🚀 Ready for production use with real property data.");
  } else {
    console.log(`\n⚠️  ${testProperties.length - successCount} tests failed. Please check the errors above.`);
  }

  // Save detailed results
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsFile = `test-results-${timestamp}.json`;
  
  const detailedResults = {
    timestamp: new Date().toISOString(),
    model: process.env.CLAUDE_MODEL || 'claude-3-haiku-20240307',
    summary: {
      total_tests: testProperties.length,
      successful: successCount,
      failed: testProperties.length - successCount,
      success_rate: Math.round(successCount/testProperties.length*100),
      total_cost: Number(totalCost.toFixed(6)),
      total_time_seconds: Number((totalTime/1000).toFixed(1)),
      avg_response_time_ms: Math.round(totalTime/testProperties.length)
    },
    results: results
  };
  
  fs.writeFileSync(resultsFile, JSON.stringify(detailedResults, null, 2));
  console.log(`\n📄 Detailed results saved to: ${resultsFile}`);
}

// Run the test
if (require.main === module) {
  runTest().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}