import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54380';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('\n🔍 Checking Property Sources Queue\n');
console.log('='.repeat(70));

// Get all property sources
const { data, error } = await supabase
    .from('property_sources')
    .select('*')
    .order('created_at', { ascending: false });

if (error) {
    console.error('Error:', error.message);
} else {
    console.log(`\nFound ${data.length} properties in queue:\n`);
    
    // Categorize by type
    const aggregators = [];
    const individual = [];
    
    data.forEach(prop => {
        const url = prop.url.toLowerCase();
        if (url.includes('apartments.com') || 
            url.includes('rent.com') || 
            url.includes('zillow.com') || 
            url.includes('apartmentguide.com') ||
            url.includes('forrent.com')) {
            aggregators.push(prop);
        } else {
            individual.push(prop);
        }
    });
    
    console.log(`📊 Aggregator Sites: ${aggregators.length}`);
    aggregators.forEach((prop, idx) => {
        console.log(`   ${idx + 1}. ${prop.url}`);
        console.log(`      Name: ${prop.property_name || 'N/A'}`);
        console.log(`      Method: ${prop.discovery_method || 'N/A'}`);
        console.log('');
    });
    
    console.log(`\n🏢 Individual Property Sites: ${individual.length}`);
    individual.forEach((prop, idx) => {
        console.log(`   ${idx + 1}. ${prop.url}`);
        console.log(`      Name: ${prop.property_name || 'N/A'}`);
        console.log(`      Method: ${prop.discovery_method || 'N/A'}`);
        console.log('');
    });
    
    console.log('='.repeat(70));
    console.log('\nRecommendation:');
    if (individual.length > 0) {
        console.log(`   ✅ ${individual.length} individual property sites ready to scrape`);
        console.log('   Run: python run_python_scraper_on_queue.py');
    } else {
        console.log('   ⚠️  No individual property sites in queue');
        console.log('   Run discovery to find properties: node discover_atlanta_properties.mjs');
    }
}
