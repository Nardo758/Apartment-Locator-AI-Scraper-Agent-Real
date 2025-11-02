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

// List of aggregator sites to remove
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
    'reddit.com',
    'redfin.com',
    'apartmentfinder.com',
    'hotpads.com',
    'walkscore.com'
];

console.log('\n🗑️  Removing ALL Aggregator Site Data\n');
console.log('='.repeat(70));

// Get all scraped properties
const { data: allProps, error } = await prodClient
    .from('scraped_properties')
    .select('*')
    .order('created_at', { ascending: false });

if (error) {
    console.error('Error fetching data:', error.message);
    process.exit(1);
}

console.log(`\nTotal properties in database: ${allProps?.length || 0}\n`);

// Find all aggregator records
const aggregatorRecords = [];
const individualRecords = [];

allProps?.forEach(prop => {
    const url = prop.listing_url.toLowerCase();
    const isAggregator = AGGREGATORS.some(agg => url.includes(agg));
    
    if (isAggregator) {
        aggregatorRecords.push(prop);
    } else {
        individualRecords.push(prop);
    }
});

console.log('📊 Breakdown:\n');
console.log(`   Aggregator Sites:         ${aggregatorRecords.length}`);
console.log(`   Individual Properties:    ${individualRecords.length}`);

if (aggregatorRecords.length > 0) {
    console.log('\n🔍 Aggregator records to delete:\n');
    
    // Group by domain
    const byDomain = {};
    aggregatorRecords.forEach(prop => {
        const url = prop.listing_url.toLowerCase();
        const domain = AGGREGATORS.find(agg => url.includes(agg)) || 'other';
        if (!byDomain[domain]) byDomain[domain] = [];
        byDomain[domain].push(prop);
    });
    
    Object.keys(byDomain).sort().forEach(domain => {
        console.log(`   ${domain}: ${byDomain[domain].length} records`);
    });
    
    console.log('\n' + '='.repeat(70));
    console.log('\nDeleting aggregator records...\n');
    
    const ids = aggregatorRecords.map(p => p.id);
    
    // Delete in batches of 50
    let deleted = 0;
    for (let i = 0; i < ids.length; i += 50) {
        const batch = ids.slice(i, i + 50);
        const { error: deleteError } = await prodClient
            .from('scraped_properties')
            .delete()
            .in('id', batch);
        
        if (deleteError) {
            console.error(`Error deleting batch ${i}-${i+batch.length}:`, deleteError.message);
        } else {
            deleted += batch.length;
            console.log(`   Deleted ${deleted}/${ids.length}...`);
        }
    }
    
    console.log(`\n✅ Successfully deleted ${deleted} aggregator records\n`);
    
    // Verify final count
    const { count } = await prodClient
        .from('scraped_properties')
        .select('*', { count: 'exact', head: true });
    
    console.log('='.repeat(70));
    console.log('\n📊 Final Database Status:\n');
    console.log(`   Before:  ${allProps.length} properties`);
    console.log(`   Deleted: ${deleted} aggregator records`);
    console.log(`   After:   ${count} properties`);
    console.log(`\n   ✅ Database now contains ONLY individual properties\n`);
    
} else {
    console.log('\n✅ No aggregator records found. Database is clean!\n');
}

console.log('='.repeat(70));
console.log('');
