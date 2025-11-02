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

console.log('\n🔍 Investigating Bathroom Data Issues\n');
console.log('='.repeat(70));

// Get properties with over 3 bathrooms
const { data: overThree } = await prodClient
    .from('scraped_properties')
    .select('*')
    .gt('bathrooms', 3)
    .order('bathrooms', { ascending: false });

console.log(`\nProperties with >3 bathrooms: ${overThree?.length || 0}\n`);

if (overThree && overThree.length > 0) {
    overThree.forEach((prop, idx) => {
        console.log(`${idx + 1}. ${prop.name}`);
        console.log(`   Bathrooms: ${prop.bathrooms} (LIKELY ERROR)`);
        console.log(`   Bedrooms: ${prop.bedrooms}`);
        console.log(`   Price: $${prop.current_price}`);
        console.log(`   URL: ${prop.listing_url}`);
        console.log(`   Source: ${prop.source}`);
        console.log(`   Property ID: ${prop.property_id}`);
        console.log(`   Created: ${new Date(prop.created_at).toLocaleString()}`);
        console.log('');
    });
}

// Get all bathroom distribution
const { data: allProps } = await prodClient
    .from('scraped_properties')
    .select('bathrooms')
    .not('bathrooms', 'is', null)
    .order('bathrooms', { ascending: false });

console.log('='.repeat(70));
console.log('\n📊 Bathroom Distribution:\n');

const distribution = {};
allProps?.forEach(p => {
    const baths = p.bathrooms;
    distribution[baths] = (distribution[baths] || 0) + 1;
});

Object.keys(distribution).sort((a, b) => parseFloat(a) - parseFloat(b)).forEach(baths => {
    const count = distribution[baths];
    const bar = '█'.repeat(Math.min(count, 50));
    console.log(`   ${baths} bath: ${count.toString().padStart(3)} ${bar}`);
});

// Get properties with unusual patterns
const { data: unusual } = await prodClient
    .from('scraped_properties')
    .select('*')
    .or('bathrooms.gt.10,bedrooms.gt.10,current_price.gt.50000,current_price.lt.100')
    .order('created_at', { ascending: false })
    .limit(10);

if (unusual && unusual.length > 0) {
    console.log('\n⚠️  Properties with Unusual Data:\n');
    unusual.forEach((prop, idx) => {
        console.log(`${idx + 1}. ${prop.name}`);
        console.log(`   Bedrooms: ${prop.bedrooms}, Bathrooms: ${prop.bathrooms}, Price: $${prop.current_price}`);
        console.log(`   URL: ${prop.listing_url.substring(0, 70)}...`);
        console.log('');
    });
}

console.log('='.repeat(70));
console.log('\n💡 Analysis:\n');
console.log('   Properties with >3 bathrooms likely have data extraction errors');
console.log('   These should be reviewed and potentially cleaned');
console.log('\nNext steps:');
console.log('   1. Review the source URLs to understand extraction issues');
console.log('   2. Update scraper validation logic');
console.log('   3. Clean or delete incorrect records\n');
