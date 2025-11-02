import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54380';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('\n📊 Detailed Scraped Property Data\n');
console.log('='.repeat(80));

// Get all scraped properties
const { data, error } = await supabase
    .from('scraped_properties')
    .select('*')
    .order('created_at', { ascending: false });

if (error) {
    console.error('Error:', error.message);
} else {
    console.log(`\nTotal Properties in Database: ${data.length}\n`);
    console.log('='.repeat(80));
    
    data.forEach((prop, idx) => {
        console.log(`\n${idx + 1}. ${prop.name || 'Unnamed Property'}`);
        console.log('   ' + '-'.repeat(76));
        console.log(`   Property ID:    ${prop.property_id}`);
        console.log(`   Unit Number:    ${prop.unit_number || 'N/A'}`);
        console.log(`   URL:            ${prop.listing_url}`);
        console.log(`   Source:         ${prop.source}`);
        console.log('');
        console.log(`   Price:          $${prop.current_price || 0}/month`);
        console.log(`   Bedrooms:       ${prop.bedrooms ?? 'N/A'}`);
        console.log(`   Bathrooms:      ${prop.bathrooms ?? 'N/A'}`);
        console.log(`   Square Feet:    ${prop.square_feet || 'N/A'}`);
        console.log('');
        console.log(`   Address:        ${prop.address || 'N/A'}`);
        console.log(`   City:           ${prop.city || 'N/A'}`);
        console.log(`   State:          ${prop.state || 'N/A'}`);
        console.log(`   ZIP:            ${prop.zip_code || 'N/A'}`);
        console.log('');
        
        if (prop.amenities) {
            console.log(`   Amenities:      ${JSON.stringify(prop.amenities)}`);
            console.log('');
        }
        
        if (prop.pet_policy) {
            console.log(`   Pet Policy:     ${prop.pet_policy}`);
        }
        
        if (prop.parking_info) {
            console.log(`   Parking:        ${prop.parking_info}`);
        }
        
        console.log(`   Property Type:  ${prop.property_type || 'N/A'}`);
        console.log(`   Created:        ${new Date(prop.created_at).toLocaleString()}`);
        console.log(`   Scraped At:     ${prop.scraped_at ? new Date(prop.scraped_at).toLocaleString() : 'N/A'}`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('\n📈 Statistics:\n');
    
    // Calculate statistics
    const withPrice = data.filter(p => p.current_price > 0);
    const avgPrice = withPrice.length > 0 
        ? Math.round(withPrice.reduce((sum, p) => sum + p.current_price, 0) / withPrice.length)
        : 0;
    
    const minPrice = withPrice.length > 0 ? Math.min(...withPrice.map(p => p.current_price)) : 0;
    const maxPrice = withPrice.length > 0 ? Math.max(...withPrice.map(p => p.current_price)) : 0;
    
    const bedroomCounts = data.reduce((acc, p) => {
        if (p.bedrooms !== null && p.bedrooms !== undefined) {
            acc[p.bedrooms] = (acc[p.bedrooms] || 0) + 1;
        }
        return acc;
    }, {});
    
    const sources = data.reduce((acc, p) => {
        const source = p.source || 'unknown';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
    }, {});
    
    console.log(`   Total Properties:        ${data.length}`);
    console.log(`   With Price Data:         ${withPrice.length} (${Math.round(withPrice.length/data.length*100)}%)`);
    console.log(`   Average Price:           $${avgPrice}/month`);
    console.log(`   Price Range:             $${minPrice} - $${maxPrice}`);
    console.log('');
    console.log('   Bedroom Distribution:');
    Object.keys(bedroomCounts).sort().forEach(beds => {
        console.log(`      ${beds} BR: ${bedroomCounts[beds]} properties`);
    });
    console.log('');
    console.log('   Sources:');
    Object.entries(sources).sort((a, b) => b[1] - a[1]).forEach(([source, count]) => {
        const domain = source.length > 50 ? source.substring(0, 47) + '...' : source;
        console.log(`      ${domain}: ${count}`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('');
}
