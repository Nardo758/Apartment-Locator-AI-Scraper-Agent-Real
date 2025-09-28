#!/usr/bin/env -S deno run --allow-read

/**
 * Unit tests for the AI scraper validation function
 * 
 * This script tests the validateAiResult function directly without needing
 * to run the full Supabase Edge Function server.
 * 
 * Usage: deno run --allow-read test-validation.ts
 */

// Import the validation logic from index.ts
// Note: We'll extract the validation function for testing

// Validate AI-extracted fields (copied from index.ts for testing)
function validateAiResult(result: Record<string, unknown>): boolean {
  const requiredFields = ["name", "address", "city", "state", "current_price"];
  for (const field of requiredFields) {
    const v = result[field];
    if (v === undefined || v === null || String(v).trim() === "") return false;
  }

  try {
    const price = Number(result["current_price"]);
    if (!Number.isFinite(price) || price <= 0 || price > 50000) return false;

    const state = String(result["state"]).trim().toUpperCase();
    if (state.length !== 2 || !/^[A-Z]{2}$/.test(state)) return false;

    const bedrooms = Number(result["bedrooms"] ?? 0);
    const bathrooms = Number(result["bathrooms"] ?? 0);
    if (!Number.isFinite(bedrooms) || bedrooms < 0 || bedrooms > 10) return false;
    if (!Number.isFinite(bathrooms) || bathrooms < 0 || bathrooms > 10) return false;
  } catch {
    return false;
  }

  return true;
}

// Test cases
const testCases = [
  {
    name: "Valid apartment data",
    data: {
      name: "Luxury Downtown Apartments",
      address: "123 Main Street",
      city: "Austin",
      state: "TX",
      current_price: 2500,
      bedrooms: 2,
      bathrooms: 2,
      free_rent_concessions: "First month free",
      application_fee: 50,
      admin_fee_waived: true,
      admin_fee_amount: null
    },
    expected: true
  },
  {
    name: "Missing required field (name)",
    data: {
      address: "123 Main Street",
      city: "Austin", 
      state: "TX",
      current_price: 2500
    },
    expected: false
  },
  {
    name: "Empty string in required field",
    data: {
      name: "",
      address: "123 Main Street",
      city: "Austin",
      state: "TX", 
      current_price: 2500
    },
    expected: false
  },
  {
    name: "Invalid price (too high)",
    data: {
      name: "Expensive Place",
      address: "123 Rich Street",
      city: "Beverly Hills",
      state: "CA",
      current_price: 60000
    },
    expected: false
  },
  {
    name: "Invalid price (negative)",
    data: {
      name: "Weird Place",
      address: "123 Strange Street", 
      city: "Oddville",
      state: "NY",
      current_price: -100
    },
    expected: false
  },
  {
    name: "Invalid state (too long)",
    data: {
      name: "Nice Apartment",
      address: "123 Good Street",
      city: "Somewhere", 
      state: "California",
      current_price: 2000
    },
    expected: false
  },
  {
    name: "Invalid state (not letters)",
    data: {
      name: "Nice Apartment",
      address: "123 Good Street",
      city: "Somewhere",
      state: "C1",
      current_price: 2000
    },
    expected: false
  },
  {
    name: "Invalid bedrooms (too many)",
    data: {
      name: "Mansion",
      address: "123 Big Street",
      city: "Largetown",
      state: "TX",
      current_price: 5000,
      bedrooms: 15
    },
    expected: false
  },
  {
    name: "Valid with minimal data",
    data: {
      name: "Simple Studio",
      address: "456 Basic Ave",
      city: "Simpletown", 
      state: "OR",
      current_price: 1200,
      bedrooms: 0,
      bathrooms: 1
    },
    expected: true
  },
  {
    name: "Valid with all optional fields",
    data: {
      name: "Full Feature Apartment",
      address: "789 Complete Street",
      city: "Fulltown",
      state: "WA", 
      current_price: 3000,
      bedrooms: 3,
      bathrooms: 2.5,
      free_rent_concessions: "Two months free rent with 12-month lease",
      application_fee: 75,
      admin_fee_waived: false,
      admin_fee_amount: 200
    },
    expected: true
  }
];

function runValidationTests(): void {
  console.log("🧪 Running AI Result Validation Tests");
  console.log("=" .repeat(50));
  
  let passed = 0;
  let failed = 0;
  
  testCases.forEach((testCase, index) => {
    const result = validateAiResult(testCase.data);
    const success = result === testCase.expected;
    
    if (success) {
      passed++;
      console.log(`✅ Test ${index + 1}: ${testCase.name}`);
    } else {
      failed++;
      console.log(`❌ Test ${index + 1}: ${testCase.name}`);
      console.log(`   Expected: ${testCase.expected}, Got: ${result}`);
      console.log(`   Data: ${JSON.stringify(testCase.data, null, 2)}`);
    }
  });
  
  console.log("\n📊 TEST SUMMARY");
  console.log("=" .repeat(30));
  console.log(`Total Tests: ${testCases.length}`);
  console.log(`Passed: ${passed} (${((passed / testCases.length) * 100).toFixed(1)}%)`);
  console.log(`Failed: ${failed} (${((failed / testCases.length) * 100).toFixed(1)}%)`);
  
  if (failed === 0) {
    console.log("\n🎉 All validation tests passed!");
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed. Please review the validation logic.`);
  }
}

// Run tests if this file is executed directly
if (import.meta.main) {
  runValidationTests();
}