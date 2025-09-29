const { Client } = require('pg');

async function checkScrapingResults() {
  const client = new Client({
    host: '127.0.0.1',
    port: 54322,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres'
  });

  try {
    await client.connect();

    // Get summary stats
    const summaryResult = await client.query(`
      SELECT
        COUNT(*) as total,
        ROUND(AVG(current_price)) as avg_price,
        MIN(current_price) as min_price,
        MAX(current_price) as max_price
      FROM scraped_properties
    `);

    console.log('🎉 ATLANTA SCRAPING RESULTS SUMMARY');
    console.log('=====================================');
    console.log(`Total properties scraped: ${summaryResult.rows[0].total}`);
    console.log(`Average price: $${summaryResult.rows[0].avg_price}`);
    console.log(`Price range: $${summaryResult.rows[0].min_price} - $${summaryResult.rows[0].max_price}`);

    // Properties by source
    const sourceResult = await client.query(`
      SELECT source, COUNT(*) as count
      FROM scraped_properties
      GROUP BY source
      ORDER BY count DESC
    `);

    console.log('\n📊 Properties by source:');
    sourceResult.rows.forEach(row => {
      console.log(`  ${row.source}: ${row.count}`);
    });

    // Concessions
    const concessionsResult = await client.query(`
      SELECT COUNT(*) as concessions
      FROM scraped_properties
      WHERE free_rent_concessions IS NOT NULL AND free_rent_concessions != ''
    `);

    console.log(`\n🎁 Properties with concessions: ${concessionsResult.rows[0].concessions}`);

    // Sample properties
    const sampleResult = await client.query(`
      SELECT name, address, current_price, bedrooms, bathrooms, free_rent_concessions
      FROM scraped_properties
      WHERE free_rent_concessions IS NOT NULL AND free_rent_concessions != ''
      LIMIT 5
    `);

    if (sampleResult.rows.length > 0) {
      console.log('\n🏆 Sample properties with concessions:');
      sampleResult.rows.forEach((prop, i) => {
        console.log(`  ${i+1}. ${prop.name} - $${prop.current_price} (${prop.bedrooms}BR/${prop.bathrooms}BA)`);
        console.log(`     Concession: ${prop.free_rent_concessions}`);
      });
    }

    // Cost tracking
    const costResult = await client.query(`
      SELECT
        SUM(properties_scraped) as total_properties,
        SUM(ai_requests) as total_ai_requests,
        SUM(estimated_cost) as total_cost
      FROM scraping_costs
      WHERE date = CURRENT_DATE
    `);

    if (costResult.rows[0].total_properties) {
      console.log('\n💰 Claude AI Usage Today:');
      console.log(`  Properties scraped: ${costResult.rows[0].total_properties}`);
      console.log(`  AI requests: ${costResult.rows[0].total_ai_requests}`);
      console.log(`  Estimated cost: $${costResult.rows[0].total_cost}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkScrapingResults();