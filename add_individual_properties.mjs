import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54380';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('\n🏢 Adding Individual Property Websites to Queue\n');
console.log('='.repeat(70));

// List of known individual apartment property websites in Atlanta
const individualProperties = [
    {
        url: 'https://www.vuemidtown.com',
        property_name: 'Vue Midtown',
        website_name: 'vuemidtown.com',
        region: 'atlanta',
        priority: 7,
        expected_units: 300
    },
    {
        url: 'https://www.tenparkdrive.com',
        property_name: 'Ten Park Drive',
        website_name: 'tenparkdrive.com',
        region: 'atlanta',
        priority: 7,
        expected_units: 200
    },
    {
        url: 'https://www.colonysquareatlanta.com',
        property_name: 'Colony Square',
        website_name: 'colonysquareatlanta.com',
        region: 'atlanta',
        priority: 7,
        expected_units: 250
    },
    {
        url: 'https://www.postmidtown.com',
        property_name: 'Post Midtown',
        website_name: 'postmidtown.com',
        region: 'atlanta',
        priority: 7,
        expected_units: 350
    },
    {
        url: 'https://www.skyhousebuckhead.com',
        property_name: 'SkyHouse Buckhead',
        website_name: 'skyhousebuckhead.com',
        region: 'atlanta',
        priority: 7,
        expected_units: 200
    },
    {
        url: 'https://www.955midtown.com',
        property_name: '955 Midtown',
        website_name: '955midtown.com',
        region: 'atlanta',
        priority: 7,
        expected_units: 150
    },
    {
        url: 'https://www.theloftsatthemills.com',
        property_name: 'The Lofts at the Mills',
        website_name: 'theloftsatthemills.com',
        region: 'atlanta',
        priority: 6,
        expected_units: 100
    },
    {
        url: 'https://www.atlanticstation.com/live',
        property_name: 'Atlantic Station Apartments',
        website_name: 'atlanticstation.com',
        region: 'atlanta',
        priority: 7,
        expected_units: 400
    },
    {
        url: 'https://www.theheightsbuckhead.com',
        property_name: 'The Heights Buckhead',
        website_name: 'theheightsbuckhead.com',
        region: 'atlanta',
        priority: 6,
        expected_units: 180
    },
    {
        url: 'https://www.cortlandgrandatperimeter.com',
        property_name: 'Cortland Grand at Perimeter',
        website_name: 'cortlandgrandatperimeter.com',
        region: 'atlanta',
        priority: 6,
        expected_units: 220
    }
];

console.log(`Adding ${individualProperties.length} properties to property_sources table...\n`);

let added = 0;
let skipped = 0;
let errors = 0;

for (const property of individualProperties) {
    try {
        // Check if URL already exists
        const { data: existing, error: checkError } = await supabase
            .from('property_sources')
            .select('id')
            .eq('url', property.url)
            .single();
        
        if (existing) {
            console.log(`⏭️  Skipped: ${property.property_name} (already exists)`);
            skipped++;
            continue;
        }
        
        // Insert new property
        const { data, error } = await supabase
            .from('property_sources')
            .insert(property)
            .select();
        
        if (error) {
            console.log(`❌ Error adding ${property.property_name}: ${error.message}`);
            errors++;
        } else {
            console.log(`✅ Added: ${property.property_name}`);
            console.log(`   URL: ${property.url}`);
            added++;
        }
        
    } catch (err) {
        console.log(`❌ Exception for ${property.property_name}: ${err.message}`);
        errors++;
    }
}

console.log('\n' + '='.repeat(70));
console.log('\n📊 Summary:');
console.log(`   ✅ Added: ${added}`);
console.log(`   ⏭️  Skipped (duplicates): ${skipped}`);
console.log(`   ❌ Errors: ${errors}`);
console.log(`   📝 Total: ${individualProperties.length}`);

console.log('\n💡 Next Steps:');
console.log('   1. Run: python run_python_scraper_on_queue.py');
console.log('   2. Check results: node check_recent_scraped.mjs');
console.log('');
