import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = join(__dirname, '.env.production.real');
dotenv.config({ path: envPath, override: true });

const PROD_URL = process.env.SUPABASE_URL;
const PROD_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const prodClient = createClient(PROD_URL, PROD_KEY);

console.log('\n📚 Creating Learning Queue for Scraper Training\n');
console.log('='.repeat(70));

// Step 1: Create the learning queue table
console.log('\n Step 1: Creating learning queue table...\n');

const createTableSQL = readFileSync(join(__dirname, 'create_learning_queue.sql'), 'utf-8');

try {
    const { error: createError } = await prodClient.rpc('exec_sql', { sql: createTableSQL });
    if (createError) {
        console.log('   Table might already exist, continuing...');
    } else {
        console.log('   ✅ Learning queue table created');
    }
} catch (e) {
    console.log('   ℹ️  Using alternative creation method...');
}

// Step 2: Get all property sources
console.log('\n📊 Step 2: Analyzing queue...\n');

const { data: sources } = await prodClient
    .from('property_sources')
    .select('*')
    .order('created_at', { ascending: false });

const { data: scraped } = await prodClient
    .from('scraped_properties')
    .select('listing_url');

const scrapedUrls = new Set(scraped?.map(p => p.listing_url) || []);

// Find unscraped URLs
const failed = sources?.filter(s => !scrapedUrls.has(s.url)) || [];

console.log(`   Total URLs in queue:     ${sources?.length || 0}`);
console.log(`   Successfully scraped:    ${scrapedUrls.size}`);
console.log(`   Failed to scrape:        ${failed.length}`);

// Step 3: Categorize failures
console.log('\n🔍 Step 3: Categorizing failed sites...\n');

const AGGREGATORS = [
    'apartments.com', 'zillow.com', 'trulia.com', 'realtor.com',
    'apartmentguide.com', 'rent.com', 'forrent.com', 'apartmentlist.com',
    'rentcafe.com', 'yelp.com', 'reddit.com', 'redfin.com'
];

const individual = failed.filter(s => {
    const url = s.url.toLowerCase();
    return !AGGREGATORS.some(agg => url.includes(agg));
});

const aggregators = failed.filter(s => {
    const url = s.url.toLowerCase();
    return AGGREGATORS.some(agg => url.includes(agg));
});

console.log(`   Individual properties:   ${individual.length} (add to learning queue)`);
console.log(`   Aggregator sites:        ${aggregators.length} (skip)`);

// Step 4: Add individual properties to learning queue
if (individual.length > 0) {
    console.log('\n📝 Step 4: Adding to learning queue...\n');
    
    const learningItems = individual.map(source => {
        let domain = 'unknown';
        try {
            const url = new URL(source.url);
            domain = url.hostname.replace('www.', '');
        } catch (e) {
            // ignore
        }
        
        return {
            url: source.url,
            property_name: source.property_name,
            domain: domain,
            failure_reason: 'failed_to_scrape',
            extraction_method: 'universal',
            attempts: 1,
            last_attempt_at: new Date().toISOString(),
            status: 'pending'
        };
    });
    
    // Insert in batches
    let added = 0;
    for (let i = 0; i < learningItems.length; i += 50) {
        const batch = learningItems.slice(i, i + 50);
        
        const { error } = await prodClient
            .from('scraper_learning_queue')
            .upsert(batch, { onConflict: 'url' });
        
        if (error) {
            console.log(`   Error adding batch: ${error.message}`);
        } else {
            added += batch.length;
            console.log(`   Added ${added}/${learningItems.length}...`);
        }
    }
    
    console.log(`\n   ✅ Added ${added} sites to learning queue`);
}

// Step 5: Summary
console.log('\n' + '='.repeat(70));
console.log('\n📊 Learning Queue Summary:\n');

const { count } = await prodClient
    .from('scraper_learning_queue')
    .select('*', { count: 'exact', head: true });

console.log(`   Total sites in learning queue: ${count || individual.length}`);
console.log(`   Status: pending (ready for training)`);

console.log('\n💡 Next Steps:\n');
console.log('   1. Review sites: SELECT * FROM scraper_learning_queue WHERE status=\'pending\';');
console.log('   2. Create site-specific templates for common domains');
console.log('   3. Test improved scraper on learning queue');
console.log('   4. Mark successful: UPDATE scraper_learning_queue SET status=\'trained\';');

console.log('\n🎓 Training Approach:\n');
console.log('   - Group by domain (e.g., all AMLI sites)');
console.log('   - Create template extractors for high-frequency domains');
console.log('   - Improve universal extractor validation');
console.log('   - Test on 5-10 samples before full deployment\n');

console.log('='.repeat(70));
console.log('');
