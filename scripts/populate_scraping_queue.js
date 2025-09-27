const { createClient } = require('@supabase/supabase-js');
import process from "node:process";

const SUPABASE_URL = process.argv.find(arg => arg.startsWith('--url=')).split('=')[1];
const SUPABASE_KEY = process.argv.find(arg => arg.startsWith('--key=')).split('=')[1];

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing --url or --key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function populateScrapingQueue() {
  // Get all apartments that don't have a pending/processing job in scraping_queue
  const { data: apartments, error } = await supabase
    .from('apartments')
    .select('external_id, title, address, source')
    .not('external_id', 'is', null)
    .limit(100); // Start with a small batch

  if (error) {
    console.error('Error fetching apartments:', error);
    return;
  }

  console.log(`Found ${apartments.length} apartments`);

  // Check existing queue entries
  const externalIds = apartments.map(a => a.external_id);
  const { data: existingJobs, error: queueError } = await supabase
    .from('scraping_queue')
    .select('external_id')
    .in('external_id', externalIds)
    .in('status', ['pending', 'processing']);

  if (queueError) {
    console.error('Error checking existing jobs:', queueError);
    return;
  }

  const existingIds = new Set(existingJobs.map(j => j.external_id));
  const newJobs = apartments
    .filter(a => !existingIds.has(a.external_id))
    .map(a => ({
      external_id: a.external_id,
      property_id: a.external_id, // Use external_id as property_id for now
      unit_number: '1', // Default unit number
      url: `https://example.com/${a.external_id}`, // Placeholder URL, should be from sources
      source: a.source || 'apartments',
      status: 'pending',
      priority_score: 50 // Default priority
    }));

  console.log(`Will insert ${newJobs.length} new scraping jobs`);

  if (newJobs.length === 0) {
    console.log('No new jobs to insert');
    return;
  }

  const { data, error: insertError } = await supabase
    .from('scraping_queue')
    .insert(newJobs)
    .select();

  if (insertError) {
    console.error('Error inserting jobs:', insertError);
  } else {
    console.log(`Inserted ${data.length} scraping jobs`);
  }
}

populateScrapingQueue();