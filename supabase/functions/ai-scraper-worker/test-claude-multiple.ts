#!/usr/bin/env -S deno run --allow-net --allow-env

/**
 * Multiple Property Test with Claude
 * 
 * Tests Claude with multiple different property types to validate
 * consistency and accuracy across various scenarios.
 */

interface TestProperty {
  id: number;
  type: string;
  html: string;
  expected: {
    name: string;
    city: string;
    state: string;
    current_price: number;
    bedrooms: number;
    bathrooms: number;
  };
}

const TEST_PROPERTIES: TestProperty[] = [
  {
    id: 1,
    type: "luxury_apartment",
    html: `
      <div class="luxury-listing">
        <h1>Skyline Tower Residences</h1>
        <div class="location">1200 Park Avenue, New York, NY 10001</div>
        <div class="rent">$4,500 per month</div>
        <div class="details">
          <span>1 bedroom</span>
          <span>1 bathroom</span>
        </div>
        <div class="specials">Move-in special: First 2 months free!</div>
        <div class="fees">Application: $100, Admin: $300</div>
      </div>
    `,
    expected: {
      name: "Skyline Tower Residences",
      city: "New York",
      state: "NY",
      current_price: 4500,
      bedrooms: 1,
      bathrooms: 1
    }
  },
  {
    id: 2,
    type: "budget_apartment",
    html: `
      <section class="rental-unit">
        <h2>Affordable Garden Apartments</h2>
        <address>850 Elm Street, Phoenix, AZ 85001</address>
        <span class="price">$1,200/mo</span>
        <div class="room-info">
          <p>2 bedrooms, 1 bathroom</p>
        </div>
        <div class="promotions">No application fee this month!</div>
      </section>
    `,
    expected: {
      name: "Affordable Garden Apartments",
      city: "Phoenix",
      state: "AZ",
      current_price: 1200,
      bedrooms: 2,
      bathrooms: 1
    }
  },
  {
    id: 3,
    type: "suburban_house",
    html: `
      <div class="house-rental">
        <h3>Charming Family Home</h3>
        <div class="address">456 Maple Drive, Denver, CO 80202</div>
        <div class="monthly-rent">Monthly: $2,400</div>
        <div class="specs">
          <div>Bedrooms: 3</div>
          <div>Bathrooms: 2.5</div>
        </div>
        <div class="lease-info">
          <p>Pet deposit: $500</p>
          <p>Application fee: $50 per adult</p>
        </div>
      </div>
    `,
    expected: {
      name: "Charming Family Home",
      city: "Denver",
      state: "CO",
      current_price: 2400,
      bedrooms: 3,
      bathrooms: 2
    }
  },
  {
    id: 4,
    type: "studio_loft",
    html: `
      <article class="loft-listing">
        <h1>Modern Studio Loft</h1>
        <div class="location">789 Industrial Blvd, Seattle, WA 98101</div>
        <div class="pricing">$1,800 monthly</div>
        <div class="unit-type">Studio apartment</div>
        <div class="bath-count">1 full bathroom</div>
        <div class="amenities">High ceilings, exposed brick</div>
        <div class="fees">Admin fee waived for 12-month lease</div>
      </article>
    `,
    expected: {
      name: "Modern Studio Loft",
      city: "Seattle",
      state: "WA",
      current_price: 1800,
      bedrooms: 0,
      bathrooms: 1
    }
  },
  {
    id: 5,
    type: "corporate_housing",
    html: `
      <div class="furnished-rental">
        <h2>Executive Furnished Suite</h2>
        <div class="address">321 Business District, Miami, FL 33101</div>
        <div class="rates">
          <div class="monthly">Monthly: $3,200</div>
        </div>
        <div class="configuration">1 Bedroom, 1 Bathroom</div>
        <div class="services">Fully furnished, utilities included</div>
        <div class="terms">Minimum 30-day stay, no admin fee</div>
      </div>
    `,
    expected: {
      name: "Executive Furnished Suite",
      city: "Miami",
      state: "FL",
      current_price: 3200,
      bedrooms: 1,
      bathrooms: 1
    }
  }
];

async function testClaudeWithProperty(property: TestProperty): Promise<{
  success: boolean;
  accuracy: number;
  cost: number;
  duration: number;
  tokens: number;
  errors: string[];
}> {
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

  const userMessage = `Extract apartment data from this rental website HTML:\n\n${property.html}`;

  const startTime = Date.now();

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 1000,
        temperature: 0.1,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }]
      })
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      return {
        success: false,
        accuracy: 0,
        cost: 0,
        duration,
        tokens: 0,
        errors: [`HTTP ${response.status}: ${await response.text()}`]
      };
    }

    const result = await response.json();
    const content = result.content?.[0]?.text || "";
    const usage = result.usage;
    const tokens = usage.input_tokens + usage.output_tokens;
    const cost = ((usage.input_tokens * 0.80) + (usage.output_tokens * 4.00)) / 1000000;

    // Parse JSON
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      return {
        success: false,
        accuracy: 0,
        cost,
        duration,
        tokens,
        errors: [`JSON parse error: ${error.message}`]
      };
    }

    // Check accuracy
    const validations = [
      { field: 'name', expected: property.expected.name, actual: parsed.name },
      { field: 'city', expected: property.expected.city, actual: parsed.city },
      { field: 'state', expected: property.expected.state, actual: parsed.state },
      { field: 'current_price', expected: property.expected.current_price, actual: parsed.current_price },
      { field: 'bedrooms', expected: property.expected.bedrooms, actual: parsed.bedrooms },
      { field: 'bathrooms', expected: property.expected.bathrooms, actual: parsed.bathrooms }
    ];

    let correctFields = 0;
    const errors: string[] = [];

    validations.forEach(validation => {
      if (validation.actual == validation.expected) {
        correctFields++;
      } else {
        errors.push(`${validation.field}: got ${validation.actual}, expected ${validation.expected}`);
      }
    });

    const accuracy = (correctFields / validations.length) * 100;

    return {
      success: true,
      accuracy,
      cost,
      duration,
      tokens,
      errors
    };

  } catch (error) {
    return {
      success: false,
      accuracy: 0,
      cost: 0,
      duration: Date.now() - startTime,
      tokens: 0,
      errors: [error.message]
    };
  }
}

async function runMultiplePropertyTest(): Promise<void> {
  console.log("🏠 Claude Multiple Property Test");
  console.log("================================");
  console.log(`Testing ${TEST_PROPERTIES.length} different property types`);
  console.log();

  const results = [];
  let totalCost = 0;
  let totalTokens = 0;
  let totalDuration = 0;

  for (const property of TEST_PROPERTIES) {
    console.log(`🔄 Testing Property ${property.id}: ${property.type}`);
    
    const result = await testClaudeWithProperty(property);
    results.push({ property, result });
    
    totalCost += result.cost;
    totalTokens += result.tokens;
    totalDuration += result.duration;

    if (result.success) {
      console.log(`   ✅ Success - ${result.accuracy.toFixed(1)}% accuracy (${result.duration}ms, $${result.cost.toFixed(6)})`);
      if (result.errors.length > 0) {
        result.errors.forEach(error => console.log(`   ⚠️  ${error}`));
      }
    } else {
      console.log(`   ❌ Failed - ${result.errors.join(', ')}`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log();
  console.log("📊 COMPREHENSIVE TEST RESULTS");
  console.log("=============================");

  const successfulTests = results.filter(r => r.result.success);
  const averageAccuracy = successfulTests.length > 0 ? 
    successfulTests.reduce((sum, r) => sum + r.result.accuracy, 0) / successfulTests.length : 0;

  console.log(`Total Properties Tested: ${results.length}`);
  console.log(`Successful: ${successfulTests.length}/${results.length} (${(successfulTests.length/results.length*100).toFixed(1)}%)`);
  console.log(`Average Accuracy: ${averageAccuracy.toFixed(1)}%`);
  console.log(`Total Cost: $${totalCost.toFixed(6)}`);
  console.log(`Total Tokens: ${totalTokens.toLocaleString()}`);
  console.log(`Average Duration: ${(totalDuration/results.length).toFixed(0)}ms per property`);
  console.log();

  console.log("💰 Cost Projections:");
  console.log(`   Cost per property: $${(totalCost/results.length).toFixed(6)}`);
  console.log(`   100 properties: $${(totalCost/results.length*100).toFixed(4)}`);
  console.log(`   1,000 properties: $${(totalCost/results.length*1000).toFixed(2)}`);
  console.log(`   10,000 properties: $${(totalCost/results.length*10000).toFixed(2)}`);
  console.log();

  console.log("🏠 Property Type Performance:");
  results.forEach(({ property, result }) => {
    const status = result.success ? `${result.accuracy.toFixed(1)}%` : 'FAILED';
    console.log(`   ${property.type}: ${status}`);
  });

  if (averageAccuracy >= 95) {
    console.log();
    console.log("🎉 OUTSTANDING PERFORMANCE!");
    console.log("✅ Claude is production-ready for apartment scraping");
    console.log("💡 Extremely cost-effective compared to GPT-4");
  } else if (averageAccuracy >= 80) {
    console.log();
    console.log("👍 Good performance with room for optimization");
  } else {
    console.log();
    console.log("⚠️  Performance needs improvement");
  }
}

// Main execution
if (import.meta.main) {
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) {
    console.error("❌ ANTHROPIC_API_KEY not set");
    Deno.exit(1);
  }
  
  await runMultiplePropertyTest();
}