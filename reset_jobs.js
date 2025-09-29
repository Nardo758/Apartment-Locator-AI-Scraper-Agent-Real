const { Client } = require('pg');

async function resetFailedJobs() {
  const client = new Client({
    host: '127.0.0.1',
    port: 54322,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres'
  });

  try {
    await client.connect();

    const result = await client.query("UPDATE scraping_queue SET status = 'pending' WHERE status = 'failed';");
    console.log(`Reset ${result.rowCount} failed jobs to pending`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

resetFailedJobs();