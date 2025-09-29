const { Client } = require('pg');

async function checkConstraints() {
  const client = new Client({
    host: '127.0.0.1',
    port: 54322,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres'
  });

  try {
    await client.connect();

    // Get unique constraints
    const uniqueQuery = `SELECT conname, conkey
      FROM pg_constraint
      WHERE conrelid = 'scraped_properties'::regclass
      AND contype = 'u';`;

    const uniqueResult = await client.query(uniqueQuery);
    console.log('Unique constraints on scraped_properties:');
    uniqueResult.rows.forEach(con => {
      console.log(`${con.conname}: ${con.conkey}`);
    });

    // Get primary key
    const pkQuery = `SELECT conname, conkey
      FROM pg_constraint
      WHERE conrelid = 'scraped_properties'::regclass
      AND contype = 'p';`;

    const pkResult = await client.query(pkQuery);
    console.log('\nPrimary key on scraped_properties:');
    pkResult.rows.forEach(con => {
      console.log(`${con.conname}: ${con.conkey}`);
    });

    // Get indexes
    const indexQuery = `SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'scraped_properties';`;

    const indexResult = await client.query(indexQuery);
    console.log('\nIndexes on scraped_properties:');
    indexResult.rows.forEach(idx => {
      console.log(`${idx.indexname}: ${idx.indexdef}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkConstraints();