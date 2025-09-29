const { Client } = require('pg');

async function checkSchema() {
  const client = new Client({
    host: '127.0.0.1',
    port: 54322,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres'
  });

  try {
    await client.connect();

    // Check apartments table schema
    const apartmentsSchema = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'apartments'
      ORDER BY ordinal_position;
    `);
    console.log('Apartments table columns:');
    apartmentsSchema.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
    });

    // Check scraping_queue schema
    const queueSchema = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'scraping_queue'
      ORDER BY ordinal_position;
    `);
    console.log('\nScraping_queue table columns:');
    queueSchema.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkSchema();