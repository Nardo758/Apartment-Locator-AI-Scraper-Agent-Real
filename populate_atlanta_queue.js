const { Client } = require('pg');
const fs = require('fs');

async function populateAtlantaScrapingQueue() {
  const client = new Client({
    host: '127.0.0.1',
    port: 54322,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres'
  });

  try {
    await client.connect();
    console.log('🔍 Connected to database');

    // Read sources.json file
    const sourcesData = JSON.parse(fs.readFileSync('./data/sources.json', 'utf8'));
    console.log(`📄 Loaded ${sourcesData.length} sources from sources.json`);

    // Filter for Atlanta properties (those with Atlanta in the name or URL)
    const atlantaSources = sourcesData.filter(source =>
      source.name.toLowerCase().includes('atlanta') ||
      source.url.toLowerCase().includes('atlanta') ||
      source.name.toLowerCase().includes('buckhead') ||
      source.name.toLowerCase().includes('midtown') ||
      source.name.toLowerCase().includes('brookhaven') ||
      source.name.toLowerCase().includes('sandy springs') ||
      source.name.toLowerCase().includes('brookwood') ||
      source.name.toLowerCase().includes('phipps') ||
      source.name.toLowerCase().includes('virginia highlands') ||
      source.name.toLowerCase().includes('inman') ||
      source.name.toLowerCase().includes('chastain')
    );

    console.log(`🎯 Found ${atlantaSources.length} Atlanta-area properties`);

    // Take first 100 Atlanta properties
    const propertiesToScrape = atlantaSources.slice(0, 100);
    console.log(`📋 Will populate queue with ${propertiesToScrape.length} properties`);

    // Check existing queue entries to avoid duplicates
    const existingUrls = new Set();
    const existingResult = await client.query('SELECT url FROM scraping_queue WHERE status IN (\'pending\', \'processing\')');
    existingResult.rows.forEach(row => existingUrls.add(row.url));

    console.log(`🔄 Found ${existingUrls.size} existing pending/processing jobs`);

    // Prepare new jobs
    const newJobs = [];
    const timestamp = Date.now();

    for (let i = 0; i < propertiesToScrape.length; i++) {
      const source = propertiesToScrape[i];

      // Skip if already in queue
      if (existingUrls.has(source.url)) {
        console.log(`⏭️  Skipping ${source.name} - already in queue`);
        continue;
      }

      // Generate unique identifiers
      const propertyId = `atl_${timestamp}_${i}`;
      const unitNumber = '1'; // Default for property-level scraping
      const externalId = `${propertyId}_${unitNumber}`;

      newJobs.push({
        external_id: externalId,
        property_id: propertyId,
        unit_number: unitNumber,
        url: source.url,
        source: 'direct_property',
        status: 'pending',
        priority: source.priority === 'High' ? 3 : source.priority === 'Medium' ? 2 : 1,
        created_at: new Date().toISOString()
      });
    }

    console.log(`📝 Prepared ${newJobs.length} new scraping jobs`);

    // Insert jobs in batches to avoid overwhelming the database
    const batchSize = 10;
    let insertedCount = 0;

    for (let i = 0; i < newJobs.length; i += batchSize) {
      const batch = newJobs.slice(i, i + batchSize);

      const values = batch.map(job =>
        `('${job.external_id}', '${job.property_id}', '${job.unit_number}', '${job.url.replace(/'/g, "''")}', '${job.source}', '${job.status}', ${job.priority}, '${job.created_at}')`
      ).join(', ');

      const query = `INSERT INTO scraping_queue (external_id, property_id, unit_number, url, source, status, priority, created_at)
        VALUES ${values}`;

      try {
        const result = await client.query(query);
        insertedCount += result.rowCount;
        console.log(`✅ Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(newJobs.length/batchSize)} (${result.rowCount} jobs)`);
      } catch (error) {
        console.error(`❌ Error inserting batch ${Math.floor(i/batchSize) + 1}:`, error.message);
      }
    }

    // Get final queue count
    const finalCountResult = await client.query('SELECT COUNT(*) as total FROM scraping_queue WHERE status = \'pending\'');
    const finalCount = parseInt(finalCountResult.rows[0].total);

    console.log('\n🎉 ATLANTA SCRAPING QUEUE POPULATION COMPLETE!');
    console.log(`✅ Successfully added ${insertedCount} new jobs`);
    console.log(`📊 Total pending jobs in queue: ${finalCount}`);
    console.log(`🎯 Ready to scrape ${Math.min(finalCount, 100)} Atlanta properties`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

populateAtlantaScrapingQueue();