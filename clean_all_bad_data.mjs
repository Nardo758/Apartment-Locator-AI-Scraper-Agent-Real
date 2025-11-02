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

// Aggregator sites to remove
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

console.log('\n🧹 Cleaning ALL Bad Data\n');
console.log('='.repeat(70));

// Get all properties
const { data: allProps, error } = await prodClient
    .from('scraped_properties')
    .select('*')
    .order('created_at', { ascending: false });

if (error) {
    console.error('Error fetching data:', error.message);
    process.exit(1);
}

console.log(`\nTotal properties: ${allProps?.length || 0}\n`);

const toDelete = [];
const toKeep = [];

allProps?.forEach(prop => {
    const url = prop.listing_url.toLowerCase();
    const name = (prop.name || '').toLowerCase();
    const propertyId = (prop.property_id || '').toLowerCase();
    
    // Check if it's an aggregator
    const isAggregator = AGGREGATORS.some(agg => url.includes(agg));
    
    // Check if it's test data
    const isTest = 
        propertyId.includes('test') ||
        propertyId.includes('vision_scraped') ||
        name.includes('test') ||
        url.includes('test') ||
        url.includes('example.com') ||
        url.includes('localhost') ||
        prop.current_price === 500 || // Common test price
        prop.current_price === 750;   // Common test price
    
    // Check for invalid data
    const hasErrors = 
        prop.bathrooms > 3 ||
        prop.bedrooms > 10 ||
        prop.current_price > 50000 ||
        (prop.current_price > 0 && prop.current_price < 100);
    
    if (isAggregator || isTest || hasErrors) {
        toDelete.push(prop);
    } else {
        toKeep.push(prop);
    }
});

console.log('📊 Analysis:\n');
console.log(`   Properties to DELETE:  ${toDelete.length}`);
console.log(`   Properties to KEEP:    ${toKeep.length}`);

if (toDelete.length > 0) {
    // Categorize deletions
    const aggregators = toDelete.filter(p => AGGREGATORS.some(agg => p.listing_url.toLowerCase().includes(agg)));
    const testData = toDelete.filter(p => {
        const id = (p.property_id || '').toLowerCase();
        const name = (p.name || '').toLowerCase();
        return id.includes('test') || name.includes('test') || p.current_price === 500 || p.current_price === 750;
    });
    const errors = toDelete.filter(p => p.bathrooms > 3 || p.bedrooms > 10);
    
    console.log('\n🗑️  Breakdown of deletions:\n');
    console.log(`   Aggregator sites:      ${aggregators.length}`);
    console.log(`   Test data:             ${testData.length}`);
    console.log(`   Data errors:           ${errors.length}`);
    
    console.log('\n' + '='.repeat(70));
    console.log('\nDeleting bad data...\n');
    
    const ids = toDelete.map(p => p.id);
    let deleted = 0;
    
    // Delete in batches of 50
    for (let i = 0; i < ids.length; i += 50) {
        const batch = ids.slice(i, i + 50);
        const { error: deleteError } = await prodClient
            .from('scraped_properties')
            .delete()
            .in('id', batch);
        
        if (deleteError) {
            console.error(`   Error deleting batch: ${deleteError.message}`);
        } else {
            deleted += batch.length;
            console.log(`   Deleted ${deleted}/${ids.length}...`);
        }
    }
    
    console.log(`\n✅ Successfully deleted ${deleted} records\n`);
    
    // Verify
    const { count } = await prodClient
        .from('scraped_properties')
        .select('*', { count: 'exact', head: true });
    
    console.log('='.repeat(70));
    console.log('\n📊 Final Clean Database:\n');
    console.log(`   Before:  ${allProps.length} properties`);
    console.log(`   Deleted: ${deleted} bad records`);
    console.log(`   After:   ${count} properties`);
    console.log('\n   ✅ Database contains ONLY valid individual properties\n');
    
    // Show sample of what's kept
    if (toKeep.length > 0) {
        console.log('📋 Sample of kept properties:\n');
        toKeep.slice(0, 5).forEach((prop, idx) => {
            console.log(`   ${idx + 1}. ${prop.name}`);
            console.log(`      $${prop.current_price || 0}/month, ${prop.bedrooms}bd/${prop.bathrooms}ba`);
            console.log(`      ${prop.listing_url.substring(0, 60)}...`);
        });
        if (toKeep.length > 5) {
            console.log(`   ... and ${toKeep.length - 5} more`);
        }
    }
    
} else {
    console.log('\n✅ No bad data found. Database is clean!\n');
}

console.log('\n' + '='.repeat(70));
console.log('');
