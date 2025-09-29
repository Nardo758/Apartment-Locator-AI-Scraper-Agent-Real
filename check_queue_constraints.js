const { Client } = require('pg');

async function checkQueueConstraints() {
  const client = new Client({
    host: '127.0.0.1',
    port: 54322,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres'
  });

  try {
    await client.connect();

    const result = await client.query(`SELECT conname, conkey FROM pg_constraint WHERE conrelid = 'scraping_queue'::regclass;`);
    console.log('scraping_queue constraints:');
    result.rows.forEach(con => console.log(`${con.conname}: ${con.conkey}`));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkQueueConstraints();