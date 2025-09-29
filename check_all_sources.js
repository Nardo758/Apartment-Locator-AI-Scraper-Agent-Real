const { Client } = require('pg');

async function checkAllSources() {
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
      "SELECT id, property_name, website_name, region, is_active FROM property_sources ORDER BY region, property_name;"
    );

    console.log('All Property Sources:');
    result.rows.forEach(source => {
      console.log(`${source.id}: ${source.property_name} (${source.website_name}) - ${source.region} [Active: ${source.is_active}]`);
    });
    console.log(`Total sources: ${result.rows.length}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkAllSources();