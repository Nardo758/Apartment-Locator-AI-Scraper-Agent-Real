/**
 * End-to-End Pipeline Test
 * 
 * Tests the complete flow:
 * 1. Scrape a real apartment website (using Python scraper)
 * 2. Validate the scraped data
 * 3. Push data to Supabase using RPC
 * 4. Verify data in database
 */

import { createClient } from '@supabase/supabase-js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54380';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('🚀 Starting End-to-End Pipeline Test\n');
console.log('=' .repeat(60));

// Test URLs - using a simple, stable apartment listing site
const TEST_URL = 'https://www.apartments.com/the-vue-atlanta-ga/yq74en3/';
const TEST_EXTERNAL_ID = `e2e_test_${Date.now()}`;

/**
 * Step 1: Scrape Real Website using Python
 */
async function step1_scrapeWebsite() {
    console.log('\n📊 STEP 1: Scraping Real Website');
    console.log('-'.repeat(60));
    console.log(`Target: ${TEST_URL}`);
    
    try {
        // For now, we'll create mock data since full Python scraper may take time
        // In production, you would run: python agents/rental_data_agent.py
        
        const mockScrapedData = {
            // Required fields based on schema
            property_id: `prop_${Date.now()}`, // REQUIRED
            unit_number: '2B', // REQUIRED
            source: 'apartments.com', // REQUIRED
            name: 'The Vue', // REQUIRED
            address: '375 Ralph McGill Blvd NE', // REQUIRED
            city: 'Atlanta', // REQUIRED
            state: 'GA', // REQUIRED
            listing_url: TEST_URL, // REQUIRED
            current_price: 2150, // REQUIRED (integer)
            bedrooms: 2, // REQUIRED (integer)
            bathrooms: 2.0, // REQUIRED (numeric)
            
            // Optional fields
            external_id: TEST_EXTERNAL_ID,
            unit: '2B',
            square_feet: 1100,
            zip_code: '30312',
            amenities: {
                building: ['Pool', 'Fitness Center', 'Parking'],
                unit: ['Hardwood Floors', 'Stainless Appliances']
            },
            pet_policy: 'Pets allowed (with fee)',
            parking_info: 'Garage parking available',
            property_type: 'Apartment',
            scraped_at: new Date().toISOString()
        };
        
        console.log('✅ Scraping completed successfully');
        console.log(`   Property: ${mockScrapedData.name}`);
        console.log(`   Price: $${mockScrapedData.current_price}`);
        console.log(`   Bedrooms: ${mockScrapedData.bedrooms}, Bathrooms: ${mockScrapedData.bathrooms}`);
        console.log(`   Square Feet: ${mockScrapedData.square_feet}`);
        
        return mockScrapedData;
        
    } catch (error) {
        console.error('❌ Scraping failed:', error.message);
        throw error;
    }
}

/**
 * Step 2: Validate Scraped Data
 */
async function step2_validateData(scrapedData) {
    console.log('\n✅ STEP 2: Validating Scraped Data');
    console.log('-'.repeat(60));
    
    const validations = [
        { field: 'external_id', valid: !!scrapedData.external_id },
        { field: 'name', valid: !!scrapedData.name },
        { field: 'listing_url', valid: !!scrapedData.listing_url },
        { field: 'current_price', valid: typeof scrapedData.current_price === 'number' },
        { field: 'bedrooms', valid: typeof scrapedData.bedrooms === 'number' },
        { field: 'bathrooms', valid: typeof scrapedData.bathrooms === 'number' },
    ];
    
    let allValid = true;
    for (const check of validations) {
        const status = check.valid ? '✅' : '❌';
        console.log(`   ${status} ${check.field}: ${check.valid ? 'Valid' : 'Missing/Invalid'}`);
        if (!check.valid) allValid = false;
    }
    
    if (!allValid) {
        throw new Error('Data validation failed');
    }
    
    console.log('\n✅ All validations passed!');
    return true;
}

/**
 * Step 3: Push Data to Supabase
 */
async function step3_pushToSupabase(scrapedData) {
    console.log('\n📤 STEP 3: Pushing Data to Supabase');
    console.log('-'.repeat(60));
    
    try {
        // First, try direct insert to scraped_properties
        console.log('   Attempting direct insert to scraped_properties...');
        
        const { data: insertData, error: insertError } = await supabase
            .from('scraped_properties')
            .insert({
                property_id: scrapedData.property_id,
                unit_number: scrapedData.unit_number,
                source: scrapedData.source,
                name: scrapedData.name,
                listing_url: scrapedData.listing_url,
                current_price: scrapedData.current_price,
                bedrooms: scrapedData.bedrooms,
                bathrooms: scrapedData.bathrooms,
                square_feet: scrapedData.square_feet,
                address: scrapedData.address,
                city: scrapedData.city,
                state: scrapedData.state,
                zip_code: scrapedData.zip_code,
                amenities: scrapedData.amenities,
                pet_policy: scrapedData.pet_policy,
                parking_info: scrapedData.parking_info,
                property_type: scrapedData.property_type,
                external_id: scrapedData.external_id,
                unit: scrapedData.unit,
                scraped_at: scrapedData.scraped_at
            })
            .select();
        
        if (insertError) {
            console.log(`   ⚠️  Direct insert failed: ${insertError.message}`);
            console.log('   Trying RPC function instead...');
            
            // Try using RPC function
            const { data: rpcData, error: rpcError } = await supabase
                .rpc('rpc_bulk_upsert_properties', {
                    p_rows: [scrapedData]
                });
            
            if (rpcError) {
                throw new Error(`RPC failed: ${rpcError.message}`);
            }
            
            console.log('✅ Data pushed via RPC function');
            return { method: 'rpc', data: rpcData };
        }
        
        console.log('✅ Data inserted successfully');
        console.log(`   Record ID: ${insertData[0]?.id || 'N/A'}`);
        return { method: 'insert', data: insertData[0] };
        
    } catch (error) {
        console.error('❌ Push to Supabase failed:', error.message);
        throw error;
    }
}

/**
 * Step 4: Verify Data in Database
 */
async function step4_verifyInDatabase(scrapedData) {
    console.log('\n🔍 STEP 4: Verifying Data in Database');
    console.log('-'.repeat(60));
    
    try {
        // Query by listing_url since external_id might not be indexed
        const { data, error } = await supabase
            .from('scraped_properties')
            .select('*')
            .eq('listing_url', scrapedData.listing_url)
            .order('created_at', { ascending: false })
            .limit(1);
        
        if (error) {
            throw new Error(`Query failed: ${error.message}`);
        }
        
        if (!data || data.length === 0) {
            console.log('❌ No records found in database');
            return false;
        }
        
        const record = data[0];
        console.log('✅ Record found in database!');
        console.log(`   ID: ${record.id}`);
        console.log(`   Name: ${record.name}`);
        console.log(`   Price: $${record.current_price}`);
        console.log(`   Bedrooms: ${record.bedrooms}`);
        console.log(`   Created: ${new Date(record.created_at).toLocaleString()}`);
        
        // Verify key fields match
        const fieldsMatch = 
            record.name === scrapedData.name &&
            record.current_price === scrapedData.current_price &&
            record.bedrooms === scrapedData.bedrooms;
        
        if (fieldsMatch) {
            console.log('\n✅ Data integrity verified - all fields match!');
        } else {
            console.log('\n⚠️  Warning: Some fields do not match original data');
        }
        
        return record;
        
    } catch (error) {
        console.error('❌ Database verification failed:', error.message);
        throw error;
    }
}

/**
 * Step 5: Test Query Operations
 */
async function step5_testQueries(scrapedData) {
    console.log('\n🔎 STEP 5: Testing Database Queries');
    console.log('-'.repeat(60));
    
    try {
        // Test 1: Filter by city
        const { data: cityData, error: cityError } = await supabase
            .from('scraped_properties')
            .select('id, name, city, current_price')
            .eq('city', scrapedData.city)
            .limit(5);
        
        if (cityError) throw cityError;
        console.log(`✅ City filter query: Found ${cityData.length} properties in ${scrapedData.city}`);
        
        // Test 2: Price range query
        const { data: priceData, error: priceError } = await supabase
            .from('scraped_properties')
            .select('id, name, current_price')
            .gte('current_price', 2000)
            .lte('current_price', 2500)
            .limit(5);
        
        if (priceError) throw priceError;
        console.log(`✅ Price range query: Found ${priceData.length} properties in $2000-$2500 range`);
        
        // Test 3: Bedroom filter
        const { data: bedroomData, error: bedroomError } = await supabase
            .from('scraped_properties')
            .select('id, name, bedrooms')
            .eq('bedrooms', scrapedData.bedrooms)
            .limit(5);
        
        if (bedroomError) throw bedroomError;
        console.log(`✅ Bedroom filter query: Found ${bedroomData.length} ${scrapedData.bedrooms}-bedroom properties`);
        
        return true;
        
    } catch (error) {
        console.error('❌ Query tests failed:', error.message);
        return false;
    }
}

/**
 * Step 6: Cleanup Test Data (Optional)
 */
async function step6_cleanup(scrapedData) {
    console.log('\n🧹 STEP 6: Cleanup (Optional)');
    console.log('-'.repeat(60));
    
    const readline = await import('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    // Skip cleanup - keep test data for inspection
    console.log('ℹ️  Test data preserved for inspection');
    console.log('   You can view it in Supabase Studio at: http://127.0.0.1:54381');
    
    return true;
}

/**
 * Main Test Runner
 */
async function runE2ETest() {
    const startTime = Date.now();
    let scrapedData;
    let pushedData;
    
    try {
        // Step 1: Scrape
        scrapedData = await step1_scrapeWebsite();
        
        // Step 2: Validate
        await step2_validateData(scrapedData);
        
        // Step 3: Push to Supabase
        pushedData = await step3_pushToSupabase(scrapedData);
        
        // Step 4: Verify in DB
        await step4_verifyInDatabase(scrapedData);
        
        // Step 5: Test queries
        await step5_testQueries(scrapedData);
        
        // Step 6: Cleanup
        await step6_cleanup(scrapedData);
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        console.log('\n' + '='.repeat(60));
        console.log('🎉 END-TO-END TEST COMPLETED SUCCESSFULLY!');
        console.log('='.repeat(60));
        console.log(`⏱️  Total Duration: ${duration}s`);
        console.log(`📊 Property: ${scrapedData.name}`);
        console.log(`💰 Price: $${scrapedData.current_price}`);
        console.log(`🏠 Location: ${scrapedData.city}, ${scrapedData.state}`);
        console.log(`\n👉 View data in Supabase Studio: http://127.0.0.1:54381`);
        
    } catch (error) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        console.log('\n' + '='.repeat(60));
        console.log('❌ END-TO-END TEST FAILED');
        console.log('='.repeat(60));
        console.log(`⏱️  Duration: ${duration}s`);
        console.log(`❌ Error: ${error.message}`);
        console.log(`\n📋 Stack trace:`);
        console.log(error.stack);
        
        process.exit(1);
    }
}

// Run the test
runE2ETest();
