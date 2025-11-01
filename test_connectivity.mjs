/**
 * Simple connectivity test for Supabase local instance
 */
import { createClient } from '@supabase/supabase-js';

// Use environment variables - for local dev, these are set in .env file
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54380';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    console.log('💡 For local development, this is the demo service_role key from Supabase');
    process.exit(1);
}

console.log('🧪 Testing Supabase Connectivity...\n');

async function testConnection() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    
    try {
        // Test 1: Query scraped_properties table
        console.log('📊 Test 1: Query scraped_properties table');
        const { data: properties, error: propError } = await supabase
            .from('scraped_properties')
            .select('*')
            .limit(5);
        
        if (propError) {
            console.log(`❌ Error: ${propError.message}`);
        } else {
            console.log(`✅ Success! Found ${properties.length} properties`);
        }
        
        // Test 2: Query apartments table
        console.log('\n📊 Test 2: Query apartments table');
        const { data: apartments, error: aptError } = await supabase
            .from('apartments')
            .select('*')
            .limit(5);
        
        if (aptError) {
            console.log(`❌ Error: ${aptError.message}`);
        } else {
            console.log(`✅ Success! Found ${apartments.length} apartments`);
        }
        
        // Test 3: Query scraping_queue table
        console.log('\n📊 Test 3: Query scraping_queue table');
        const { data: queue, error: queueError } = await supabase
            .from('scraping_queue')
            .select('*')
            .limit(5);
        
        if (queueError) {
            console.log(`❌ Error: ${queueError.message}`);
        } else {
            console.log(`✅ Success! Found ${queue.length} queue items`);
        }
        
        // Test 4: Call RPC function
        console.log('\n📊 Test 4: Call rpc_bulk_upsert_properties');
        const testPayload = [{
            external_id: 'test_' + Date.now(),
            source: 'test',
            name: 'Test Property',
            listing_url: 'https://example.com/test',
            current_price: 1500,
            bedrooms: 2,
            bathrooms: 2,
            square_feet: 1000
        }];
        
        const { data: rpcData, error: rpcError } = await supabase
            .rpc('rpc_bulk_upsert_properties', { p_rows: testPayload });
        
        if (rpcError) {
            console.log(`❌ Error: ${rpcError.message}`);
        } else {
            console.log(`✅ Success! RPC function executed`);
        }
        
        // Test 5: Insert test data
        console.log('\n📊 Test 5: Insert test property');
        const { data: insertData, error: insertError } = await supabase
            .from('scraped_properties')
            .insert({
                external_id: 'connectivity_test_' + Date.now(),
                source: 'connectivity_test',
                name: 'Test Property',
                listing_url: 'https://example.com/connectivity-test',
                current_price: 1200,
                bedrooms: 1,
                bathrooms: 1,
                square_feet: 800
            })
            .select();
        
        if (insertError) {
            console.log(`❌ Error: ${insertError.message}`);
        } else {
            console.log(`✅ Success! Inserted test property`);
            console.log(`   ID: ${insertData[0]?.id}`);
        }
        
        console.log('\n🎉 Connectivity tests completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

testConnection();
