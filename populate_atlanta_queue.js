import process from "node:process";
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read Supabase credentials from environment variables. Do NOT commit keys to source.
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment to run this script.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function populateAtlantaScrapingQueue() {
  try {
    console.log('🔍 Connected to Supabase database');

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
    const { data: existingJobs, error: existingError } = await supabase
      .from('scraping_queue')
      .select('url')
      .in('status', ['pending', 'processing']);

    if (existingError) {
      throw new Error(`Failed to check existing jobs: ${existingError.message}`);
    }

    const existingUrls = new Set(existingJobs.map(job => job.url));
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

      try {
        const { data, error } = await supabase
          .from('scraping_queue')
          .insert(batch);

        if (error) {
          console.error(`❌ Error inserting batch ${Math.floor(i/batchSize) + 1}:`, error.message);
        } else {
          insertedCount += batch.length;
          console.log(`✅ Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(newJobs.length/batchSize)} (${batch.length} jobs)`);
        }
      } catch (error) {
        console.error(`❌ Error inserting batch ${Math.floor(i/batchSize) + 1}:`, error.message);
      }
    }

    // Get final queue count
    const { data: finalCountData, error: countError } = await supabase
      .from('scraping_queue')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (countError) {
      console.error('❌ Error getting final count:', countError.message);
      return;
    }

    const finalCount = finalCountData || 0;

    console.log('\n🎉 ATLANTA SCRAPING QUEUE POPULATION COMPLETE!');
    console.log(`✅ Successfully added ${insertedCount} new jobs`);
    console.log(`📊 Total pending jobs in queue: ${finalCount}`);
    console.log(`🎯 Ready to scrape ${Math.min(finalCount, 100)} Atlanta properties`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

populateAtlantaScrapingQueue();