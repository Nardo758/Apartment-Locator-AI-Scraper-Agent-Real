#!/usr/bin/env deno run --allow-env --allow-net

import { ClaudeService } from './src/services/claude-service.ts';

async function testClaudeIntegration() {
  console.log('🧪 Testing Claude integration...');
  
  const claude = new ClaudeService();
  
  const testData = {
    url: 'https://www.example-property.com',
    htmlContent: `
      <html>
        <head><title>Luxury Apartments in Downtown</title></head>
        <body>
          <h1>Skyline Towers</h1>
          <div class="property-details">
            <p>Built in 2020, this luxury high-rise features 250 units with amazing amenities.</p>
            <div class="amenities">
              <h3>Amenities</h3>
              <ul>
                <li>Swimming pool</li>
                <li>Fitness center</li>
                <li>Roof terrace</li>
                <li>Parking garage</li>
                <li>Concierge service</li>
                <li>Pet spa</li>
              </ul>
            </div>
            <div class="location">
              <p>Located in the heart of downtown with excellent transit access.</p>
              <p>Walk Score: 95 - Walker's Paradise</p>
              <p>Neighborhood: Financial District</p>
              <p>Transit: 2 blocks from Metro Station, multiple bus lines</p>
            </div>
            <div class="building-info">
              <p>Building Type: 35-story high-rise tower</p>
              <p>Property Type: Luxury apartment community</p>
            </div>
          </div>
        </body>
      </html>
    `,
    propertyName: 'Skyline Towers'
  };

  console.log('📋 Test Data:');
  console.log('- Property Name:', testData.propertyName);
  console.log('- URL:', testData.url);
  console.log('- HTML Content Length:', testData.htmlContent.length, 'characters');
  console.log();

  try {
    const startTime = Date.now();
    
    const result = await claude.analyzeProperty(
      testData.url,
      testData.htmlContent,
      testData.propertyName
    );

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('⏱️  Analysis Duration:', duration, 'ms');
    console.log();
    console.log('📊 Test Result:', JSON.stringify(result, null, 2));
    console.log();

    if (result.success) {
      console.log('✅ Claude Integration Test: PASSED');
      console.log('📈 Analysis Summary:');
      console.log('- Confidence Score:', result.data.confidence_score);
      console.log('- Property Type:', result.data.property_type);
      console.log('- Year Built:', result.data.year_built);
      console.log('- Unit Count:', result.data.unit_count);
      console.log('- Building Type:', result.data.building_type);
      console.log('- Neighborhood:', result.data.neighborhood);
      console.log('- Walk Score:', result.data.walk_score);
      console.log('- Amenities:', result.data.amenities.join(', '));
      console.log('- Transit Access:', result.data.transit_access);
      console.log('- Research Source:', result.data.research_source);
    } else {
      console.log('❌ Claude Integration Test: FAILED');
      console.log('Error:', result.error);
      console.log('Fallback data provided:', result.data);
    }

  } catch (error) {
    console.error('💥 Test crashed with error:', error);
    console.log('❌ Claude Integration Test: CRASHED');
  }

  console.log();
  console.log('🏁 Test completed');
}

// Test with minimal HTML content
async function testMinimalContent() {
  console.log();
  console.log('🧪 Testing with minimal HTML content...');
  
  const claude = new ClaudeService();
  
  const testData = {
    url: 'https://www.minimal-listing.com',
    htmlContent: '<html><body><h1>Garden Apartments</h1><p>Affordable housing</p></body></html>',
    propertyName: 'Garden Apartments'
  };

  try {
    const result = await claude.analyzeProperty(
      testData.url,
      testData.htmlContent,
      testData.propertyName
    );

    console.log('📊 Minimal Content Result:');
    console.log('- Success:', result.success);
    console.log('- Confidence Score:', result.data.confidence_score);
    console.log('- Property Type:', result.data.property_type);
    console.log('- Amenities Count:', result.data.amenities.length);

  } catch (error) {
    console.error('Error with minimal content:', error);
  }
}

// Run tests
if (import.meta.main) {
  await testClaudeIntegration();
  await testMinimalContent();
}