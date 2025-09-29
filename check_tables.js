const { Client } = require('pg');

async function checkAllTables() {
  const client = new Client({
    host: '127.0.0.1',
    port: 54322,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres'
  });

  try {
    await client.connect();

    // Get all tables
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log('Available tables:');
    for (const table of tables.rows) {
      console.log(`  ${table.table_name}`);
    }

    // Check scraped_properties schema
    const scrapedSchema = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'scraped_properties'
      ORDER BY ordinal_position
      LIMIT 15;
    `);
    console.log('\nScraped_properties table (first 15 columns):');
    scrapedSchema.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkAllTables();