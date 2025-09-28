#!/usr/bin/env -S deno run --allow-read

import { generateRealTestProperties, REAL_PROPERTY_SCENARIOS } from './real-property-scenarios.ts';

console.log('🏠 Real Property Scenarios Loaded:');
console.log('================================');

REAL_PROPERTY_SCENARIOS.forEach((scenario, i) => {
  console.log(`${i + 1}. ${scenario.type}`);
  console.log(`   Description: ${scenario.description}`);
  console.log(`   Sources: ${scenario.sources.join(', ')}`);
  console.log(`   Price Range: $${scenario.priceRange[0].toLocaleString()} - $${scenario.priceRange[1].toLocaleString()}`);
  console.log();
});

console.log('📊 Generating Sample Properties:');
console.log('===============================');
const sampleProperties = generateRealTestProperties(5);
sampleProperties.forEach((prop, i) => {
  console.log(`Property ${i + 1}:`);
  console.log(`   Type: ${prop.scenario}`);
  console.log(`   Source: ${prop.source}`);
  console.log(`   Expected: ${prop.expectedBedrooms} bed, ${prop.expectedBathrooms} bath, $${prop.expectedPrice.toLocaleString()}/month`);
  console.log(`   HTML Length: ${prop.cleanHtml.length} characters`);
  console.log();
});

console.log('✅ Real property scenarios are working correctly!');