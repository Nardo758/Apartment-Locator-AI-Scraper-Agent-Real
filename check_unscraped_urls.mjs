import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54380';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('\n🔍 Finding URLs Not Yet Scraped\n');
console.log('='.repeat(70));

// Get all property sources
const { data: sources, error: sourcesError } = await supabase
    .from('property_sources')
    .select('*')
    .order('priority', { ascending: false });

if (sourcesError) {
    console.error('Error fetching sources:', sourcesError.message);
    process.exit(1);
}

// Get all scraped properties
const { data: scraped, error: scrapedError } = await supabase
    .from('scraped_properties')
    .select('listing_url');

if (scrapedError) {
    console.error('Error fetching scraped properties:', scrapedError.message);
    process.exit(1);
}

// Create a set of scraped URLs
const scrapedUrls = new Set(scraped.map(p => p.listing_url));

// Find unscraped URLs
const unscraped = sources.filter(source => !scrapedUrls.has(source.url));

console.log(`\nTotal URLs in queue:     ${sources.length}`);
console.log(`Already scraped:         ${sources.length - unscraped.length}`);
console.log(`Not yet scraped:         ${unscraped.length}\n`);

if (unscraped.length > 0) {
    console.log('='.repeat(70));
    console.log('\nURLs Not Yet Successfully Scraped:\n');
    
    unscraped.forEach((source, idx) => {
        console.log(`${idx + 1}. ${source.property_name}`);
        console.log(`   URL: ${source.url}`);
        console.log(`   Priority: ${source.priority}`);
        console.log('');
    });
    
    console.log('='.repeat(70));
    console.log('\n💡 These URLs either failed to scrape or haven\'t been attempted yet.');
    console.log('   You can retry with: python scrape_remaining_properties.py\n');
} else {
    console.log('✅ All URLs in the queue have been successfully scraped!\n');
}
