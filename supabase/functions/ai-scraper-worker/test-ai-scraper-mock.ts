#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

/**
 * Mock Integration Test for ai-scraper-worker
 * 
 * This script simulates the integration test without requiring actual
 * API keys or running Supabase server. Perfect for testing the logic flow.
 * 
 * Usage: deno run --allow-net --allow-env --allow-read test-ai-scraper-mock.ts
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

interface MockResponse {
  status: string;
  data?: any;
  usage?: any;
  message?: string;
}

// Generate the same test properties as the real test
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

// Mock the function response based on property data
function mockAiScraperResponse(property: TestProperty): MockResponse {
  // Simulate different response scenarios
  const successRate = 0.95; // 95% success rate
  const random = Math.random();
  
  if (random > successRate) {
    // Simulate occasional failures
    const errorTypes = [
      "AI returned non-JSON",
      "AI result failed validation", 
      "Failed to fetch HTML",
      "OPENAI_API_KEY not set"
    ];
    return {
      status: "error",
      message: errorTypes[Math.floor(Math.random() * errorTypes.length)]
    };
  }
  
  // Extract expected data from HTML (simplified parsing)
  const html = property.cleanHtml;
  const cityMatch = html.match(/(Austin|Denver|Seattle|Portland|Phoenix)/);
  const stateMatch = html.match(/(TX|CO|WA|OR|AZ)/);
  const priceMatch = html.match(/\$(\d+,?\d+)/);
  const bedroomMatch = html.match(/(\d+)\s*(bed|bedroom)/i) || html.match(/Studio/i);
  const bathroomMatch = html.match(/(\d+)\s*(bath|bathroom)/i);
  
  const city = cityMatch ? cityMatch[1] : "Unknown City";
  const state = stateMatch ? stateMatch[1] : "TX";
  const price = priceMatch ? parseInt(priceMatch[1].replace(',', '')) : 2000;
  const bedrooms = bedroomMatch ? (bedroomMatch[0].includes('Studio') ? 0 : parseInt(bedroomMatch[1])) : 1;
  const bathrooms = bathroomMatch ? parseInt(bathroomMatch[1]) : 1;
  
  return {
    status: "ok",
    data: {
      name: `${property.source} Property ${property.id}`,
      address: `${property.id * 100} Main Street`,
      city: city,
      state: state,
      current_price: price,
      bedrooms: bedrooms,
      bathrooms: bathrooms,
      free_rent_concessions: Math.random() > 0.7 ? "First month free" : null,
      application_fee: Math.random() > 0.5 ? 50 : null,
      admin_fee_waived: Math.random() > 0.5,
      admin_fee_amount: Math.random() > 0.5 ? 150 : null
    },
    usage: {
      prompt_tokens: Math.floor(Math.random() * 1000) + 500,
      completion_tokens: Math.floor(Math.random() * 200) + 100,
      total_tokens: Math.floor(Math.random() * 1200) + 600,
      estimated_cost: (Math.random() * 0.05 + 0.01).toFixed(4),
      model: "gpt-4-turbo-preview"
    }
  };
}

async function runMockTests(): Promise<void> {
  console.log("🚀 Starting AI Scraper Worker Mock Tests");
  console.log("=" .repeat(50));
  console.log("📝 Note: This is a mock test that simulates API responses");
  console.log("   For real testing, set up environment variables and run test-ai-scraper.ts");
  console.log();

  const testProperties = generateTestProperties();
  console.log(`📊 Generated ${testProperties.length} test properties`);
  console.log(`🔄 Processing in batches of 5 (simulated)`);
  console.log();

  const results = {
    total: testProperties.length,
    successful: 0,
    failed: 0,
    errors: [] as string[],
    totalCost: 0,
    totalTokens: 0
  };

  // Simulate processing in batches
  const batchSize = 5;
  for (let i = 0; i < testProperties.length; i += batchSize) {
    const batch = testProperties.slice(i, i + batchSize);
    console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(testProperties.length / batchSize)}`);
    
    // Simulate processing each property in the batch
    for (const property of batch) {
      const result = mockAiScraperResponse(property);
      
      if (result.status === "ok") {
        results.successful++;
        console.log(`  ✅ Property ${property.id} (${property.source}): Success`);
        if (result.data) {
          const data = result.data;
          console.log(`     📍 ${data.name} - ${data.city}, ${data.state} - $${data.current_price}`);
        }
        if (result.usage) {
          const usage = result.usage;
          console.log(`     💰 Tokens: ${usage.total_tokens}, Cost: $${usage.estimated_cost}`);
          results.totalTokens += usage.total_tokens;
          results.totalCost += parseFloat(usage.estimated_cost);
        }
      } else {
        results.failed++;
        results.errors.push(`Property ${property.id}: ${result.message}`);
        console.log(`  ❌ Property ${property.id} (${property.source}): ${result.message}`);
      }
    }
    
    // Simulate delay between batches
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log();
  }

  // Final results
  console.log("📈 MOCK TEST RESULTS");
  console.log("=" .repeat(50));
  console.log(`Total Properties Tested: ${results.total}`);
  console.log(`Successful: ${results.successful} (${((results.successful / results.total) * 100).toFixed(1)}%)`);
  console.log(`Failed: ${results.failed} (${((results.failed / results.total) * 100).toFixed(1)}%)`);
  console.log(`Total Tokens Used: ${results.totalTokens.toLocaleString()}`);
  console.log(`Estimated Total Cost: $${results.totalCost.toFixed(4)}`);
  
  if (results.errors.length > 0 && results.errors.length <= 10) {
    console.log("\n❌ SAMPLE ERRORS:");
    results.errors.slice(0, 5).forEach(error => console.log(`   ${error}`));
    if (results.errors.length > 5) {
      console.log(`   ... and ${results.errors.length - 5} more`);
    }
  }
  
  console.log("\n✨ MOCK TEST INSIGHTS:");
  console.log(`   • Success rate: ${((results.successful / results.total) * 100).toFixed(1)}% (simulated ~95%)`);
  console.log(`   • Average cost per property: $${(results.totalCost / results.total).toFixed(4)}`);
  console.log(`   • Average tokens per property: ${Math.round(results.totalTokens / results.total)}`);
  
  console.log("\n🎉 Mock testing completed!");
  console.log("\n🔄 To run real integration tests:");
  console.log("   1. Set up .env.local with API keys");
  console.log("   2. Start: supabase functions serve ai-scraper-worker --env-file .env.local");
  console.log("   3. Run: deno run --allow-net --allow-env --allow-read test-ai-scraper.ts");
}

// Main execution
if (import.meta.main) {
  await runMockTests();
}