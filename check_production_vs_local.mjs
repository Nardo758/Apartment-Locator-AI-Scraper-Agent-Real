import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('\n📊 Comparing Local vs Production Data\n');
console.log('='.repeat(70));

// Load local config
dotenv.config({ path: '.env' });
const LOCAL_URL = process.env.SUPABASE_URL;
const LOCAL_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Load production config
const prodPath = join(__dirname, '.env.production.real');
dotenv.config({ path: prodPath, override: true });
const PROD_URL = process.env.SUPABASE_URL;
const PROD_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const localClient = createClient(LOCAL_URL, LOCAL_KEY);
const prodClient = createClient(PROD_URL, PROD_KEY);

console.log('\n🔍 Fetching Data...\n');

// Get local data
const { data: localData } = await localClient
    .from('scraped_properties')
    .select('listing_url, name, current_price, created_at');

// Get production data
const { data: prodData } = await prodClient
    .from('scraped_properties')
    .select('listing_url, name, current_price, created_at');

const localUrls = new Set(localData?.map(p => p.listing_url) || []);
const prodUrls = new Set(prodData?.map(p => p.listing_url) || []);

// Find URLs only in local
const onlyInLocal = localData?.filter(p => !prodUrls.has(p.listing_url)) || [];

// Find URLs only in production
const onlyInProd = prodData?.filter(p => !localUrls.has(p.listing_url)) || [];

// Find common URLs
const inBoth = localData?.filter(p => prodUrls.has(p.listing_url)) || [];

console.log('📈 Data Comparison:\n');
console.log(`   Local Database:        ${localData?.length || 0} properties`);
console.log(`   Production Database:   ${prodData?.length || 0} properties`);
console.log(`   In Both:               ${inBoth.length} properties`);
console.log(`   Only in Local:         ${onlyInLocal.length} properties`);
console.log(`   Only in Production:    ${onlyInProd.length} properties`);

if (onlyInLocal.length > 0) {
    console.log('\n🆕 Properties in Local (not in Production):\n');
    onlyInLocal.slice(0, 10).forEach((p, idx) => {
        console.log(`   ${idx + 1}. ${p.name || 'Unnamed'} - ${p.listing_url.substring(0, 60)}...`);
    });
    if (onlyInLocal.length > 10) {
        console.log(`   ... and ${onlyInLocal.length - 10} more`);
    }
}

if (onlyInProd.length > 0) {
    console.log('\n☁️  Properties in Production (not in Local):\n');
    onlyInProd.slice(0, 10).forEach((p, idx) => {
        console.log(`   ${idx + 1}. ${p.name || 'Unnamed'} - ${p.listing_url.substring(0, 60)}...`);
    });
    if (onlyInProd.length > 10) {
        console.log(`   ... and ${onlyInProd.length - 10} more`);
    }
}

console.log('\n' + '='.repeat(70));
console.log('\n💡 Recommendation:\n');

if (onlyInLocal.length > 0) {
    console.log(`   You have ${onlyInLocal.length} properties scraped locally that aren't in production.`);
    console.log('   To push them to production:');
    console.log('   1. The scraper is now configured to use production');
    console.log('   2. Re-run the scraper and it will save to production\n');
} else {
    console.log('   ✅ All local data is already in production!\n');
}
