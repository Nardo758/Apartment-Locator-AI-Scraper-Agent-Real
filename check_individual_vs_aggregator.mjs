import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = join(__dirname, '.env.production.real');
dotenv.config({ path: envPath, override: true });

const PROD_URL = process.env.SUPABASE_URL;
const PROD_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const prodClient = createClient(PROD_URL, PROD_KEY);

console.log('\n🏢 Individual Properties vs Aggregator Sites\n');
console.log('='.repeat(70));

// List of aggregator sites to exclude
const AGGREGATORS = [
    'apartments.com',
    'zillow.com',
    'trulia.com',
    'realtor.com',
    'apartmentguide.com',
    'rent.com',
    'forrent.com',
    'apartmentlist.com',
    'rentcafe.com',
    'yelp.com',
    'reddit.com'
];

// Get all property sources
const { data: allSources } = await prodClient
    .from('property_sources')
    .select('*')
    .order('created_at', { ascending: false });

// Categorize
const individual = [];
const aggregator = [];

allSources?.forEach(source => {
    const url = source.url.toLowerCase();
    const isAggregator = AGGREGATORS.some(agg => url.includes(agg));
    
    if (isAggregator) {
        aggregator.push(source);
    } else {
        individual.push(source);
    }
});

console.log('\n📊 Property Sources Breakdown:\n');
console.log(`   Total in Queue:           ${allSources?.length || 0}`);
console.log(`   Individual Properties:    ${individual.length}`);
console.log(`   Aggregator Sites:         ${aggregator.length}`);

// Check what's been scraped
const { data: scraped } = await prodClient
    .from('scraped_properties')
    .select('listing_url, name, bathrooms');

const scrapedUrls = new Set(scraped?.map(p => p.listing_url) || []);

const individualUnscraped = individual.filter(s => !scrapedUrls.has(s.url));
const individualScraped = individual.filter(s => scrapedUrls.has(s.url));
const aggregatorScraped = scraped?.filter(p => {
    const url = p.listing_url.toLowerCase();
    return AGGREGATORS.some(agg => url.includes(agg));
}) || [];

console.log('\n🎯 Individual Property Sites:\n');
console.log(`   Total Individual:         ${individual.length}`);
console.log(`   Already Scraped:          ${individualScraped.length}`);
console.log(`   Remaining to Scrape:      ${individualUnscraped.length}`);

console.log('\n⚠️  Aggregator Sites:\n');
console.log(`   Total Aggregator URLs:    ${aggregator.length}`);
console.log(`   Scraped Data from Aggregators: ${aggregatorScraped.length}`);

if (aggregatorScraped.length > 0) {
    const withBathErrors = aggregatorScraped.filter(p => p.bathrooms > 3);
    console.log(`   With Bathroom Errors (>3): ${withBathErrors.length}`);
}

if (individualUnscraped.length > 0) {
    console.log('\n🏢 Individual Properties to Scrape:\n');
    individualUnscraped.slice(0, 10).forEach((prop, idx) => {
        console.log(`   ${idx + 1}. ${prop.property_name}`);
        console.log(`      ${prop.url}`);
    });
    if (individualUnscraped.length > 10) {
        console.log(`   ... and ${individualUnscraped.length - 10} more`);
    }
}

console.log('\n' + '='.repeat(70));
console.log('\n💡 Recommendation:\n');
console.log(`   1. Delete ${aggregatorScraped.length} scraped records from aggregators`);
console.log(`   2. Scrape remaining ${individualUnscraped.length} individual properties`);
console.log(`   3. Mark aggregator URLs as inactive to skip them\n`);
