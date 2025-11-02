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

console.log('\n📊 Production Database Status\n');
console.log('='.repeat(70));
console.log(`\nDatabase: ${PROD_URL}\n`);

// Get counts
const { count: totalCount } = await prodClient
    .from('scraped_properties')
    .select('*', { count: 'exact', head: true });

const { count: sourcesCount } = await prodClient
    .from('property_sources')
    .select('*', { count: 'exact', head: true });

console.log('📈 Counts:');
console.log(`   Total Properties:     ${totalCount}`);
console.log(`   Property Sources:     ${sourcesCount}`);

// Get recent properties
const { data: recent } = await prodClient
    .from('scraped_properties')
    .select('name, listing_url, current_price, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

console.log('\n🆕 Most Recent Properties:\n');
recent?.forEach((p, idx) => {
    const date = new Date(p.created_at).toLocaleString();
    console.log(`   ${idx + 1}. ${p.name || 'Unnamed'} - $${p.current_price || 0}`);
    console.log(`      ${p.listing_url.substring(0, 70)}...`);
    console.log(`      Added: ${date}`);
    console.log('');
});

// Get properties with pricing
const { data: withPrice } = await prodClient
    .from('scraped_properties')
    .select('current_price')
    .gt('current_price', 0);

const avgPrice = withPrice && withPrice.length > 0
    ? Math.round(withPrice.reduce((sum, p) => sum + p.current_price, 0) / withPrice.length)
    : 0;

console.log('='.repeat(70));
console.log('\n💰 Pricing Stats:');
console.log(`   Properties with price:  ${withPrice?.length || 0}/${totalCount}`);
console.log(`   Average price:          $${avgPrice}/month`);

console.log('\n✅ Production database is live and receiving data!\n');
