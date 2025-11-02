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

console.log('\n📊 Current Queue Status\n');
console.log('='.repeat(70));

// Get property sources count
const { data: sources, count, error } = await prodClient
    .from('property_sources')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

if (error) {
    console.error('Error:', error.message);
    process.exit(1);
}

console.log(`\n✅ Property Sources Queue: ${count || 0} URLs\n`);

if (sources && sources.length > 0) {
    console.log('Recent entries:');
    sources.slice(0, 5).forEach((s, idx) => {
        console.log(`   ${idx + 1}. ${s.property_name}`);
        console.log(`      ${s.url}`);
    });
    
    if (sources.length > 5) {
        console.log(`   ... and ${sources.length - 5} more`);
    }
} else {
    console.log('⚠️  Queue is empty! Need to discover properties first.');
}

// Get scraped count
const { count: scrapedCount } = await prodClient
    .from('scraped_properties')
    .select('*', { count: 'exact', head: true });

console.log('\n' + '='.repeat(70));
console.log('\n📈 Progress:\n');
console.log(`   Queue Size:      ${count || 0} URLs`);
console.log(`   Already Scraped: ${scrapedCount || 0} properties`);
console.log(`   Target:          200 URLs`);
console.log(`   Need to add:     ${Math.max(0, 200 - (count || 0))} more URLs`);
console.log('\n' + '='.repeat(70));
console.log('');
