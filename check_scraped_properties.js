const { Client } = require('pg');

async function checkScrapedPropertiesSchema() {
  const client = new Client({
    host: '127.0.0.1',
    port: 54322,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres'
  });

  try {
    await client.connect();

    // Get all columns
    const columnsQuery = `SELECT column_name, data_type, is_nullable, column_default, is_generated
      FROM information_schema.columns
      WHERE table_name = 'scraped_properties'
      ORDER BY ordinal_position;`;

    const columnsResult = await client.query(columnsQuery);
    console.log('Full scraped_properties schema:');
    columnsResult.rows.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type} | nullable: ${col.is_nullable} | default: ${col.column_default} | generated: ${col.is_generated}`);
    });

    // Get constraints
    const constraintsQuery = `SELECT constraint_name, constraint_type, table_name, column_name
      FROM information_schema.key_column_usage
      WHERE table_name = 'scraped_properties';`;

    const constraintsResult = await client.query(constraintsQuery);
    console.log('\nConstraints:');
    constraintsResult.rows.forEach(con => {
      console.log(`${con.constraint_name}: ${con.constraint_type} on ${con.column_name}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkScrapedPropertiesSchema();