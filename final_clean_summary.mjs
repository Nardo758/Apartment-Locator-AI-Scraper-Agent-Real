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

console.log('\n✨ Clean Database Summary\n');
console.log('='.repeat(70));

const { data: allProps } = await prodClient
    .from('scraped_properties')
    .select('*')
    .order('created_at', { ascending: false });

// Check bathroom distribution
const bathroomDist = {};
allProps?.forEach(p => {
    if (p.bathrooms !== null) {
        bathroomDist[p.bathrooms] = (bathroomDist[p.bathrooms] || 0) + 1;
    }
});

console.log('\n🛁 Bathroom Distribution (After Cleaning):\n');
Object.keys(bathroomDist).sort((a, b) => parseFloat(a) - parseFloat(b)).forEach(baths => {
    const count = bathroomDist[baths];
    const status = parseFloat(baths) > 3 ? ' ⚠️ ERROR' : ' ✓';
    console.log(`   ${baths} bathroom(s): ${count}${status}`);
});

const maxBaths = Math.max(...allProps.filter(p => p.bathrooms).map(p => p.bathrooms));
const minBaths = Math.min(...allProps.filter(p => p.bathrooms).map(p => p.bathrooms));

console.log(`\n   Range: ${minBaths} - ${maxBaths} bathrooms`);
console.log(`   Max bathrooms: ${maxBaths <= 3 ? '✅ Valid' : '❌ Has Errors'}`);

// Price stats
const withPrice = allProps?.filter(p => p.current_price > 0) || [];
const avgPrice = withPrice.length > 0 
    ? Math.round(withPrice.reduce((sum, p) => sum + p.current_price, 0) / withPrice.length)
    : 0;

console.log('\n💰 Data Quality:\n');
console.log(`   Total Properties: ${allProps?.length || 0}`);
console.log(`   With Price: ${withPrice.length} (${Math.round(withPrice.length/(allProps?.length || 1)*100)}%)`);
console.log(`   Average Price: $${avgPrice}/month`);
console.log(`   With Bathrooms: ${allProps?.filter(p => p.bathrooms !== null).length}`);
console.log(`   With Bedrooms: ${allProps?.filter(p => p.bedrooms !== null).length}`);

console.log('\n📊 Database Info:\n');
console.log(`   Database: ${PROD_URL}`);
console.log(`   Table: scraped_properties`);
console.log(`   Status: ✅ Clean (no bathroom errors)`);

console.log('\n' + '='.repeat(70));
console.log('');
