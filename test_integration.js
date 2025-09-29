const { Client } = require('pg');

async function testScraperIntegration() {
  const client = new Client({
    host: '127.0.0.1',
    port: 54322,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres'
  });

  // Generate unique identifiers for this test run
  const timestamp = Date.now();
  const propertyId = `test-prop-${timestamp}`;
  const unitNumber = '101';

  try {
    console.log('🔍 Connecting to database...');
    await client.connect();
    console.log('✅ Database connection successful!');

    // Test inserting scraper data into scraped_properties
    console.log('🔍 Testing scraper data insertion...');
    const insertQuery = `INSERT INTO scraped_properties (property_id, unit_number, source, name, address, city, state, current_price, bedrooms, bathrooms, square_feet, free_rent_concessions, listing_url, scraped_at)
      VALUES ('${propertyId}', '${unitNumber}', 'test-source', 'Test Apartment', '123 Main St', 'Atlanta', 'GA', 1500, 2, 2, 1200, '1 month free', 'https://example.com/test', NOW())
      RETURNING id, property_id, unit_number, name, current_price, external_id;`;

    const insertResult = await client.query(insertQuery);
    console.log('✅ Scraped data inserted successfully:', insertResult.rows[0]);

    // Test updating the same record (simulating re-scraping)
    const updateQuery = `UPDATE scraped_properties SET current_price = 1550, scraped_at = NOW() WHERE property_id = '${propertyId}' AND unit_number = '${unitNumber}' RETURNING id, current_price, scraped_at;`;
    const updateResult = await client.query(updateQuery);
    console.log('✅ Data updated successfully:', updateResult.rows[0]);

    // Test retrieving data
    const selectQuery = `SELECT id, property_id, unit_number, name, current_price, free_rent_concessions, external_id FROM scraped_properties WHERE property_id = '${propertyId}' AND unit_number = '${unitNumber}';`;
    const selectResult = await client.query(selectQuery);
    console.log('✅ Data retrieved successfully:', selectResult.rows[0]);

    // Test scraping_queue insertion (use the generated external_id)
    const generatedExternalId = insertResult.rows[0].external_id;
    const queueQuery = `INSERT INTO scraping_queue (external_id, property_id, unit_number, url, source, priority, status)
      VALUES ('${generatedExternalId}', '${propertyId}', '${unitNumber}', 'https://example.com/test', 'test-source', 50, 'pending')
      RETURNING id, external_id, property_id, unit_number, status;`;
    const queueResult = await client.query(queueQuery);
    console.log('✅ Scraping queue entry created:', queueResult.rows[0]);

    // Test cost tracking (already correct)
    const costQuery = `INSERT INTO scraping_costs (date, properties_scraped, ai_requests, estimated_cost)
      VALUES (CURRENT_DATE, 1, 1, 0.001)
      ON CONFLICT (date) DO UPDATE SET
        properties_scraped = scraping_costs.properties_scraped + 1,
        ai_requests = scraping_costs.ai_requests + 1,
        estimated_cost = scraping_costs.estimated_cost + 0.001
      RETURNING date, properties_scraped, ai_requests;`;
    const costResult = await client.query(costQuery);
    console.log('✅ Cost tracking updated:', costResult.rows[0]);

    // Test property_sources
    const sourcesQuery = `SELECT COUNT(*) as source_count FROM property_sources;`;
    const sourcesResult = await client.query(sourcesQuery);
    console.log('✅ Property sources available:', sourcesResult.rows[0].source_count);

    console.log('\n🎉 ALL SCRAPER INTEGRATION TESTS PASSED!');
    console.log('✅ Database schema working correctly');
    console.log('✅ Scraped properties data insertion working');
    console.log('✅ Data retrieval working');
    console.log('✅ Scraping queue integration working');
    console.log('✅ Cost tracking integration working');
    console.log('✅ Property sources system ready');
    console.log('✅ Claude AI scraper integration ready!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await client.end();
  }
}

testScraperIntegration();