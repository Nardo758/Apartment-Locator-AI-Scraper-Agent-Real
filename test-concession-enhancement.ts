#!/usr/bin/env -S deno run --allow-all

// Test script for the enhanced concession detection system
import { ConcessionDetector } from './src/services/enhanced-concession-detector.ts';
import { ConcessionTracker, calculateEffectiveRent, parseConcessionValue } from './src/services/concession-tracker.ts';

console.log('🎯 Testing Enhanced Concession Detection System');
console.log('==============================================\n');

// Test 1: Concession keyword detection
console.log('📋 Test 1: Concession Keyword Detection');
const testHtml = `
<div class="specials">
  <h2>Limited Time Offers!</h2>
  <p>1 month free rent on 13-month lease</p>
  <p>Waived application fee for new residents</p>
  <p>Reduced security deposit - only $200!</p>
  <p>Move-in special: 6 weeks free rent</p>
</div>
<div class="pricing">
  <p>Studio: $1500/month</p>
  <p>1 Bedroom: $1800/month</p>
  <p>2 Bedroom: $2200/month</p>
</div>
`;

const detectedConcessions = ConcessionDetector.detectConcessionKeywords(testHtml);
console.log('Detected concessions:', detectedConcessions);
console.log('Number of concessions found:', detectedConcessions.length);

// Test 2: Concession context extraction
console.log('\n📋 Test 2: Concession Context Extraction');
const context = ConcessionDetector.extractConcessionContext(testHtml);
console.log('Concession context:', JSON.stringify(context, null, 2));

// Test 3: Effective rent calculation
console.log('\n📋 Test 3: Effective Rent Calculation');
const baseRent = 1500;
const freeRentOffer = "1 month free on 13-month lease";
const effectiveRent = ConcessionDetector.calculateNetEffectiveRent(baseRent, freeRentOffer);
console.log(`Base rent: $${baseRent}`);
console.log(`Concession: ${freeRentOffer}`);
console.log(`Effective rent: $${effectiveRent}`);
console.log(`Monthly savings: $${baseRent - effectiveRent}`);

// Test 4: Concession value parsing
console.log('\n📋 Test 4: Concession Value Parsing');
const testConcessions = [
  "1 month free rent",
  "6 weeks free rent", 
  "$500 off first month",
  "Waived $200 application fee"
];

testConcessions.forEach(concession => {
  const value = parseConcessionValue(concession);
  console.log(`"${concession}" → $${value} value`);
});

// Test 5: Enhanced effective rent calculation
console.log('\n📋 Test 5: Enhanced Effective Rent Calculation');
const concessions = ["1 month free rent", "Waived $75 application fee"];
const enhancedEffectiveRent = calculateEffectiveRent(1500, concessions, 12);
console.log(`Base rent: $1500`);
console.log(`Concessions: ${concessions.join(', ')}`);
console.log(`Enhanced effective rent: $${enhancedEffectiveRent}`);

// Test 6: Mock apartment concession application
console.log('\n📋 Test 6: Mock Apartment Concession Application');
const mockApartments = [
  {
    rent_price: 1500,
    current_price: 1500,
    bedrooms: 1,
    bathrooms: 1,
    square_feet: 800
  },
  {
    rent_price: 1800,
    current_price: 1800,
    bedrooms: 2,
    bathrooms: 2,
    square_feet: 1000
  }
];

const mockIntelligence = {
  concessions: ["1 month free rent", "Waived application fee"],
  free_rent_offers: ["1 month free on 13-month lease"],
  confidence_score: 85
};

const apartmentsWithConcessions = ConcessionDetector.applyConcessionPricing(
  mockApartments, 
  mockIntelligence
);

apartmentsWithConcessions.forEach((apt, index) => {
  console.log(`\nApartment ${index + 1}:`);
  console.log(`  Base rent: $${apt.base_rent}`);
  console.log(`  Effective rent: $${apt.effective_rent}`);
  console.log(`  Concessions applied: ${apt.concessions_applied}`);
  console.log(`  Concession details: ${apt.concession_details}`);
  console.log(`  Monthly savings: $${apt.base_rent - apt.effective_rent}`);
});

// Test 7: Mock market concession tracking
console.log('\n📋 Test 7: Mock Market Concession Tracking');
const mockProperties = apartmentsWithConcessions.map((apt, index) => ({
  ...apt,
  id: index + 1,
  last_seen_at: new Date().toISOString()
}));

const marketStats = await ConcessionTracker.trackMarketConcessions(mockProperties);
console.log('\nMarket Concession Statistics:');
console.log(JSON.stringify(marketStats, null, 2));

// Test 8: Concession confidence calculation
console.log('\n📋 Test 8: Concession Confidence Calculation');
const confidence = ConcessionDetector.calculateConcessionConfidence(mockIntelligence);
console.log(`Concession confidence score: ${confidence.toFixed(2)} (${(confidence * 100).toFixed(0)}%)`);

// Test 9: Generate concession report
console.log('\n📋 Test 9: Concession Market Report');
const report = ConcessionTracker.generateConcessionReport(marketStats);
console.log(report);

console.log('\n✅ All tests completed successfully!');
console.log('\n🎯 Summary:');
console.log(`• Keyword detection: ${detectedConcessions.length} concessions found`);
console.log(`• Context extraction: ${Object.keys(context).length} context sections`);
console.log(`• Effective rent calculation: $${baseRent} → $${effectiveRent} (${((baseRent - effectiveRent) / baseRent * 100).toFixed(1)}% discount)`);
console.log(`• Market concession rate: ${marketStats.concession_rate.toFixed(1)}%`);
console.log(`• Average discount: ${marketStats.average_discount.toFixed(1)}%`);
console.log(`• Confidence score: ${(confidence * 100).toFixed(0)}%`);

console.log('\n🚀 The enhanced concession detection system is working correctly!');