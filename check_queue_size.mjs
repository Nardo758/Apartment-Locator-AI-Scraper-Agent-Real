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

console.log('\n📊 Property Sources Queue Size\n');
console.log('='.repeat(70));

const { count } = await prodClient
    .from('property_sources')
    .select('*', { count: 'exact', head: true });

console.log(`\nCurrent queue size: ${count} properties`);
console.log(`Target: 200 properties`);
console.log(`Remaining: ${Math.max(0, 200 - count)} properties needed\n`);

if (count >= 200) {
    console.log('✅ Target reached!\n');
} else {
    console.log(`⏳ Need ${200 - count} more properties`);
    console.log('   Run: node discover_200_atlanta_properties.mjs (again)\n');
}
