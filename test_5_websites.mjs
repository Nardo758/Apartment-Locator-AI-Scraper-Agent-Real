/**
 * Multi-Website End-to-End Test
 * 
 * Tests 5 different apartment websites through the complete pipeline:
 * 1. Scrape data (simulated with realistic data)
 * 2. Validate each property
 * 3. Push all to Supabase
 * 4. Verify database storage
 * 5. Run analytics queries
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54380';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('🏢 Testing 5 Different Apartment Websites');
console.log('=' .repeat(70));
console.log('');

// Define 5 test properties from different websites
const testProperties = [
    {
        property_id: `prop_vue_${Date.now()}`,
        unit_number: '2B',
        source: 'apartments.com',
        name: 'The Vue',
        address: '375 Ralph McGill Blvd NE',
        city: 'Atlanta',
        state: 'GA',
        listing_url: 'https://www.apartments.com/the-vue-atlanta-ga/yq74en3/',
        current_price: 2150,
        bedrooms: 2,
        bathrooms: 2.0,
        square_feet: 1100,
        zip_code: '30312',
        amenities: {
            building: ['Pool', 'Fitness Center', '24hr Concierge', 'Parking'],
            unit: ['Hardwood Floors', 'Stainless Appliances', 'Balcony']
        },
        pet_policy: 'Cats and Dogs allowed (with fee)',
        parking_info: 'Garage parking - $150/month',
        property_type: 'High-Rise Apartment',
        scraped_at: new Date().toISOString()
    },
    {
        property_id: `prop_highland_${Date.now()}`,
        unit_number: '1A',
        source: 'zillow.com',
        name: 'Highland Walk Apartments',
        address: '1250 Piedmont Ave NE',
        city: 'Atlanta',
        state: 'GA',
        listing_url: 'https://www.zillow.com/b/highland-walk-atlanta-ga/',
        current_price: 1850,
        bedrooms: 1,
        bathrooms: 1.0,
        square_feet: 850,
        zip_code: '30309',
        amenities: {
            building: ['Pool', 'Fitness Center', 'Business Center'],
            unit: ['Walk-in Closet', 'Dishwasher', 'Air Conditioning']
        },
        pet_policy: 'Cats allowed',
        parking_info: 'Surface lot - $75/month',
        property_type: 'Garden Apartment',
        scraped_at: new Date().toISOString()
    },
    {
        property_id: `prop_skyhouse_${Date.now()}`,
        unit_number: '3C',
        source: 'rent.com',
        name: 'SkyHouse Buckhead',
        address: '3637 Peachtree Rd NE',
        city: 'Atlanta',
        state: 'GA',
        listing_url: 'https://www.rent.com/georgia/atlanta-apartments/skyhouse-buckhead/',
        current_price: 2850,
        bedrooms: 3,
        bathrooms: 2.5,
        square_feet: 1450,
        zip_code: '30319',
        amenities: {
            building: ['Rooftop Pool', 'Sky Lounge', 'Fitness Center', 'Yoga Studio', 'Pet Spa'],
            unit: ['Floor-to-ceiling Windows', 'Gourmet Kitchen', 'Washer/Dryer', 'Smart Home']
        },
        pet_policy: 'Dogs allowed (under 50 lbs)',
        parking_info: 'Covered parking included',
        property_type: 'Luxury High-Rise',
        scraped_at: new Date().toISOString()
    },
    {
        property_id: `prop_colony_${Date.now()}`,
        unit_number: 'Studio-5',
        source: 'forrent.com',
        name: 'Colony Square',
        address: '1197 Peachtree St NE',
        city: 'Atlanta',
        state: 'GA',
        listing_url: 'https://www.forrent.com/ga/atlanta/colony-square',
        current_price: 1650,
        bedrooms: 0,
        bathrooms: 1.0,
        square_feet: 650,
        zip_code: '30361',
        amenities: {
            building: ['Pool', 'Fitness Center', 'Courtyard'],
            unit: ['Murphy Bed', 'Kitchenette', 'High Ceilings']
        },
        pet_policy: 'No pets',
        parking_info: 'Street parking available',
        property_type: 'Studio Apartment',
        scraped_at: new Date().toISOString()
    },
    {
        property_id: `prop_avalon_${Date.now()}`,
        unit_number: '2D',
        source: 'apartment.guide',
        name: 'Avalon at North Springs',
        address: '7200 N Point Pkwy',
        city: 'Alpharetta',
        state: 'GA',
        listing_url: 'https://www.apartmentguide.com/apartments/georgia/alpharetta/avalon/',
        current_price: 1950,
        bedrooms: 2,
        bathrooms: 2.0,
        square_feet: 1200,
        zip_code: '30022',
        amenities: {
            building: ['Resort-style Pool', 'Clubhouse', 'Fitness Center', 'Dog Park'],
            unit: ['Granite Countertops', 'Stainless Appliances', 'Patio', 'Storage']
        },
        pet_policy: 'Cats and Dogs welcome',
        parking_info: 'Assigned covered parking',
        property_type: 'Garden Apartment',
        scraped_at: new Date().toISOString()
    }
];

let stats = {
    total: testProperties.length,
    successful: 0,
    failed: 0,
    totalValue: 0,
    avgPrice: 0,
    avgSize: 0,
    cities: new Set(),
    sources: new Set()
};

/**
 * Test a single property
 */
async function testProperty(property, index) {
    const propertyNum = index + 1;
    
    console.log(`\n[${'='.repeat(68)}]`);
    console.log(`  PROPERTY ${propertyNum}/${testProperties.length}: ${property.name}`);
    console.log(`[${'='.repeat(68)}]`);
    
    try {
        // Display property details
        console.log(`\n📍 Location: ${property.address}, ${property.city}, ${property.state} ${property.zip_code}`);
        console.log(`🌐 Source: ${property.source}`);
        console.log(`🔗 URL: ${property.listing_url}`);
        console.log(`💰 Price: $${property.current_price.toLocaleString()}/month`);
        console.log(`🏠 Size: ${property.bedrooms}BR / ${property.bathrooms}BA / ${property.square_feet} sq ft`);
        console.log(`🐾 Pets: ${property.pet_policy}`);
        console.log(`🚗 Parking: ${property.parking_info}`);
        
        // Validate required fields
        console.log(`\n✅ Validating data...`);
        const requiredFields = ['property_id', 'unit_number', 'source', 'name', 'address', 
                                'city', 'state', 'listing_url', 'current_price', 'bedrooms', 'bathrooms'];
        
        let validationPassed = true;
        for (const field of requiredFields) {
            if (property[field] === undefined || property[field] === null) {
                console.log(`   ❌ Missing required field: ${field}`);
                validationPassed = false;
            }
        }
        
        if (!validationPassed) {
            throw new Error('Validation failed');
        }
        console.log(`   ✅ All required fields present`);
        
        // Insert into database
        console.log(`\n📤 Inserting into Supabase...`);
        const { data, error } = await supabase
            .rpc('rpc_bulk_upsert_properties', {
                p_rows: [property]
            });
        
        if (error) {
            throw new Error(`Database insert failed: ${error.message}`);
        }
        
        console.log(`   ✅ Successfully inserted into database`);
        
        // Verify the insert
        const { data: verifyData, error: verifyError } = await supabase
            .from('scraped_properties')
            .select('id, property_id, name, current_price')
            .eq('property_id', property.property_id)
            .single();
        
        if (verifyError) {
            console.log(`   ⚠️  Could not verify insert: ${verifyError.message}`);
        } else {
            console.log(`   ✅ Verified in database (ID: ${verifyData.id})`);
        }
        
        // Update stats
        stats.successful++;
        stats.totalValue += property.current_price;
        stats.cities.add(property.city);
        stats.sources.add(property.source);
        
        console.log(`\n✅ Property ${propertyNum} completed successfully`);
        return { success: true, property };
        
    } catch (error) {
        console.log(`\n❌ Property ${propertyNum} failed: ${error.message}`);
        stats.failed++;
        return { success: false, property, error: error.message };
    }
}

/**
 * Run analytics on inserted data
 */
async function runAnalytics() {
    console.log(`\n\n[${'='.repeat(68)}]`);
    console.log(`  DATABASE ANALYTICS`);
    console.log(`[${'='.repeat(68)}]`);
    
    try {
        // Total properties
        const { count, error: countError } = await supabase
            .from('scraped_properties')
            .select('*', { count: 'exact', head: true });
        
        if (countError) throw countError;
        console.log(`\n📊 Total Properties in Database: ${count}`);
        
        // Price statistics
        const { data: priceData, error: priceError } = await supabase
            .from('scraped_properties')
            .select('current_price, bedrooms, square_feet, city');
        
        if (priceError) throw priceError;
        
        if (priceData && priceData.length > 0) {
            const prices = priceData.map(p => p.current_price).filter(p => p);
            const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            
            console.log(`\n💰 Price Statistics:`);
            console.log(`   Average: $${Math.round(avgPrice).toLocaleString()}/month`);
            console.log(`   Range: $${minPrice.toLocaleString()} - $${maxPrice.toLocaleString()}`);
        }
        
        // City breakdown
        const cityCounts = {};
        priceData.forEach(p => {
            cityCounts[p.city] = (cityCounts[p.city] || 0) + 1;
        });
        
        console.log(`\n🏙️  Properties by City:`);
        Object.entries(cityCounts).forEach(([city, count]) => {
            console.log(`   ${city}: ${count} properties`);
        });
        
        // Bedroom breakdown
        const { data: bedroomData, error: bedroomError } = await supabase
            .from('scraped_properties')
            .select('bedrooms')
            .order('bedrooms');
        
        if (!bedroomError && bedroomData) {
            const bedroomCounts = {};
            bedroomData.forEach(p => {
                const br = p.bedrooms === 0 ? 'Studio' : `${p.bedrooms}BR`;
                bedroomCounts[br] = (bedroomCounts[br] || 0) + 1;
            });
            
            console.log(`\n🛏️  Properties by Bedrooms:`);
            Object.entries(bedroomCounts).forEach(([type, count]) => {
                console.log(`   ${type}: ${count} properties`);
            });
        }
        
        // Recent additions
        const { data: recentData, error: recentError } = await supabase
            .from('scraped_properties')
            .select('name, city, current_price, created_at')
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (!recentError && recentData) {
            console.log(`\n🆕 Most Recent Additions:`);
            recentData.forEach((p, i) => {
                const timeAgo = new Date(p.created_at);
                console.log(`   ${i + 1}. ${p.name} (${p.city}) - $${p.current_price}`);
            });
        }
        
    } catch (error) {
        console.log(`\n❌ Analytics failed: ${error.message}`);
    }
}

/**
 * Display final summary
 */
function displaySummary(startTime) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`\n\n[${'='.repeat(68)}]`);
    console.log(`  FINAL SUMMARY`);
    console.log(`[${'='.repeat(68)}]`);
    
    console.log(`\n⏱️  Total Duration: ${duration} seconds`);
    console.log(`\n📊 Test Results:`);
    console.log(`   Total Properties Tested: ${stats.total}`);
    console.log(`   ✅ Successful: ${stats.successful} (${Math.round(stats.successful/stats.total*100)}%)`);
    console.log(`   ❌ Failed: ${stats.failed}`);
    
    if (stats.successful > 0) {
        stats.avgPrice = Math.round(stats.totalValue / stats.successful);
        
        console.log(`\n💰 Financial Data:`);
        console.log(`   Total Monthly Value: $${stats.totalValue.toLocaleString()}`);
        console.log(`   Average Rent: $${stats.avgPrice.toLocaleString()}/month`);
        
        console.log(`\n🌍 Coverage:`);
        console.log(`   Cities: ${Array.from(stats.cities).join(', ')}`);
        console.log(`   Sources: ${Array.from(stats.sources).join(', ')}`);
    }
    
    console.log(`\n👉 View data in Supabase Studio: http://127.0.0.1:54381`);
    
    if (stats.failed > 0) {
        console.log(`\n⚠️  ${stats.failed} properties failed - check logs above for details`);
    }
}

/**
 * Main test runner
 */
async function runMultiWebsiteTest() {
    const startTime = Date.now();
    const results = [];
    
    console.log(`📅 Test Started: ${new Date().toLocaleString()}\n`);
    
    // Test each property sequentially
    for (let i = 0; i < testProperties.length; i++) {
        const result = await testProperty(testProperties[i], i);
        results.push(result);
        
        // Small delay between tests
        if (i < testProperties.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    
    // Run analytics
    await runAnalytics();
    
    // Display summary
    displaySummary(startTime);
    
    // Exit with appropriate code
    if (stats.failed > 0) {
        console.log(`\n⚠️  Test completed with failures`);
        process.exit(1);
    } else {
        console.log(`\n✅ All tests passed successfully!`);
        process.exit(0);
    }
}

// Run the test
runMultiWebsiteTest();
