// scripts/populate_high_priority_queue.js
import { createClient } from '@supabase/supabase-js';
import process from "node:process";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Map priority strings to numeric tiers (higher number = higher priority)
const PRIORITY_MAP = {
  'High': 3,
  'Medium': 2,
  'Low': 1
};

async function populateHighPriorityQueue() {
  console.log('🔄 Populating scraping queue with high-priority sources...\n');

  // Get high-priority sources
  const { data: sources, error: sourcesError } = await supabase
    .from('sources')
    .select('name, url, priority')
    .eq('priority', 'High')
    .limit(10); // Start with a small batch

  if (sourcesError) {
    console.error('Error fetching high-priority sources:', sourcesError);
    return;
  }

  console.log(`Found ${sources.length} high-priority sources:`);
  sources.forEach(source => console.log(`  - ${source.name} (${source.priority})`));
  console.log();

  // Create scraping jobs for each high-priority source
  const newJobs = sources.map((source, index) => ({
    external_id: `high_priority_${Date.now()}_${index}`,
    property_id: `prop_${Date.now()}_${index}`, // Required field
    unit_number: '1', // Default unit number
    source: source.name.toLowerCase().replace(/\s+/g, '_'),
    url: source.url,
    status: 'pending',
    priority_tier: PRIORITY_MAP[source.priority] || 1
  }));

  console.log(`Creating ${newJobs.length} scraping jobs...\n`);

  const { data, error: insertError } = await supabase
    .from('scraping_queue')
    .insert(newJobs)
    .select();

  if (insertError) {
    console.error('❌ Error inserting jobs:', insertError);
  } else {
    console.log(`✅ Successfully inserted ${data.length} high-priority scraping jobs`);
    console.log('\nJobs created:');
    data.forEach(job => {
      console.log(`  - ${job.external_id}: ${job.source} (${job.url}) - Priority: ${job.priority_tier}`);
    });
  }
}

populateHighPriorityQueue();