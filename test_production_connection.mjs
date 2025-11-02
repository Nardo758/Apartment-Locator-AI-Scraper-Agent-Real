import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load from .env.production.real
const envPath = join(__dirname, '.env.production.real');
console.log(`Loading config from: ${envPath}`);
dotenv.config({ path: envPath, override: true });

console.log('\n🔗 Testing Production Supabase Connection\n');
console.log('='.repeat(70));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log(`\nConfiguration:`);
console.log(`  URL: ${SUPABASE_URL}`);
console.log(`  Key: ${SUPABASE_KEY ? SUPABASE_KEY.substring(0, 20) + '...' : '❌ MISSING'}`);

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log('\n❌ ERROR: Missing credentials in .env.production.real\n');
    console.log('Please update .env.production.real with:');
    console.log('  SUPABASE_URL=https://jdymvpasjsdbryatscux.supabase.co');
    console.log('  SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key\n');
    console.log('See setup_production_config.md for instructions.\n');
    process.exit(1);
}

if (SUPABASE_URL.includes('127.0.0.1') || SUPABASE_URL.includes('localhost')) {
    console.log('\n⚠️  WARNING: URL points to local database, not production!\n');
    console.log('Update .env.production.real with:');
    console.log('  SUPABASE_URL=https://jdymvpasjsdbryatscux.supabase.co\n');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('\n🔍 Testing Connection...\n');

try {
    // Test 1: Check if we can connect
    const { data: tables, error: tablesError } = await supabase
        .from('scraped_properties')
        .select('id')
        .limit(1);
    
    if (tablesError) {
        console.log('❌ Connection failed!');
        console.log(`   Error: ${tablesError.message}\n`);
        
        if (tablesError.message.includes('JWT')) {
            console.log('💡 This looks like an invalid or expired service role key.');
            console.log('   Get a new one from: https://supabase.com/dashboard/project/jdymvpasjsdbryatscux/settings/api\n');
        }
        process.exit(1);
    }
    
    console.log('✅ Connection successful!\n');
    
    // Test 2: Check tables
    console.log('📊 Checking Database Tables...\n');
    
    const { count: scrapedCount } = await supabase
        .from('scraped_properties')
        .select('*', { count: 'exact', head: true });
    
    const { count: sourcesCount } = await supabase
        .from('property_sources')
        .select('*', { count: 'exact', head: true });
    
    console.log(`   ✅ scraped_properties: ${scrapedCount || 0} records`);
    console.log(`   ✅ property_sources: ${sourcesCount || 0} records`);
    
    // Test 3: Check schema compatibility
    console.log('\n🔍 Checking Schema Compatibility...\n');
    
    const { data: sample, error: sampleError } = await supabase
        .from('scraped_properties')
        .select('*')
        .limit(1);
    
    if (sample && sample.length > 0) {
        const columns = Object.keys(sample[0]);
        console.log(`   Columns found: ${columns.length}`);
        console.log(`   Sample columns: ${columns.slice(0, 5).join(', ')}...`);
    } else {
        console.log('   ⚠️  No data in scraped_properties table yet');
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('\n✅ Production database is ready!\n');
    console.log('Next steps:');
    console.log('  1. Run: python scrape_unscraped_urls.py');
    console.log('  2. Or run: python scrape_remaining_properties.py');
    console.log('  3. Data will be saved to production database\n');
    
} catch (error) {
    console.log('\n❌ Test failed!');
    console.log(`   Error: ${error.message}\n`);
    process.exit(1);
}
