import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54380';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('\n🔍 Checking Recent Scraped Properties\n');
console.log('='.repeat(70));

// Get recent properties
const { data, error } = await supabase
    .from('scraped_properties')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

if (error) {
    console.error('Error:', error.message);
} else {
    console.log(`\nFound ${data.length} recent properties:\n`);
    data.forEach((prop, idx) => {
        console.log(`${idx + 1}. ${prop.name || 'No name'}`);
        console.log(`   URL: ${prop.listing_url}`);
        console.log(`   Price: $${prop.current_price || 0}`);
        console.log(`   Bedrooms: ${prop.bedrooms || 'N/A'} | Bathrooms: ${prop.bathrooms || 'N/A'}`);
        console.log(`   Square Feet: ${prop.square_feet || 'N/A'}`);
        console.log(`   Source: ${prop.source}`);
        console.log(`   Created: ${new Date(prop.created_at).toLocaleString()}`);
        console.log('');
    });
    
    // Summary stats
    const withPrice = data.filter(p => p.current_price > 0);
    const avgPrice = withPrice.length > 0 
        ? withPrice.reduce((sum, p) => sum + p.current_price, 0) / withPrice.length 
        : 0;
    
    console.log('='.repeat(70));
    console.log('\nSummary:');
    console.log(`   Total Properties: ${data.length}`);
    console.log(`   With Price Data: ${withPrice.length}`);
    console.log(`   Average Price: $${Math.round(avgPrice)}`);
}
