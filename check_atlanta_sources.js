const { Client } = require('pg');

async function checkAtlantaSources() {
  const client = new Client({
    host: '127.0.0.1',
    port: 54322,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres'
  });

  try {
    await client.connect();

    const result = await client.query(
      "SELECT id, property_name, website_name, url, region, is_active FROM property_sources WHERE region LIKE '%Atlanta%' AND is_active = true ORDER BY property_name;"
    );

    console.log('Atlanta Property Sources:');
    result.rows.forEach(source => {
      console.log(`${source.id}: ${source.property_name} (${source.website_name}) - ${source.url} (${source.region})`);
    });
    console.log(`Total active Atlanta sources: ${result.rows.length}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkAtlantaSources();