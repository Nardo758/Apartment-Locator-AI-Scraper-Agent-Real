import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.production.real' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('\nQueueing Discovered Properties for Scraping\n');
console.log('='.repeat(70));

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Get all properties from property_sources that aren't queued yet
const { data: sources, error } = await supabase
    .from('property_sources')
    .select('*')
    .order('created_at', { ascending: false });

if (error) {
    console.error('Error fetching sources:', error);
    process.exit(1);
}

console.log(`\nFound ${sources.length} properties in property_sources\n`);

// Check which are already queued
const { data: alreadyQueued } = await supabase
    .from('scraping_queue')
    .select('url');

const queuedUrls = new Set((alreadyQueued || []).map(q => q.url));

// Filter out already queued properties
const toQueue = sources.filter(s => !queuedUrls.has(s.url));

console.log(`${toQueue.length} properties need to be queued\n`);

if (toQueue.length === 0) {
    console.log('All properties are already queued!\n');
    process.exit(0);
}

// Add to scraping_queue (only use columns that exist)
const queueItems = toQueue.map((source, idx) => ({
    property_id: source.id || `discovered_${Date.now()}_${idx}`,
    unit_number: 'ALL',  // Will scrape all units from this property
    url: source.url,
    source: source.discovery_method || 'claude-serp-discovery',
    priority: source.priority || 5,
    external_id: source.property_name || source.url,
    status: 'queued'
}));

const { data: inserted, error: insertError } = await supabase
    .from('scraping_queue')
    .insert(queueItems)
    .select();

if (insertError) {
    console.error('Error inserting to queue:', insertError);
    process.exit(1);
}

console.log(`Successfully queued ${inserted.length} properties!\n`);

// Show sample
console.log('Sample queued properties:');
inserted.slice(0, 5).forEach((item, i) => {
    console.log(`   ${i + 1}. ${item.metadata?.property_name || 'Unknown'}`);
    console.log(`      ${item.url}`);
});

console.log('\n' + '='.repeat(70));
console.log('\nReady to run scraper: python run_python_scraper_on_queue.py\n');
