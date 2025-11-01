#!/usr/bin/env node
/**
 * Direct SERP API Test
 * Tests SERP API directly without going through Supabase function
 */

import dotenv from 'dotenv';

dotenv.config();

const SERP_API_KEY = process.env.SERP_API_KEY;

if (!SERP_API_KEY) {
    console.error('❌ SERP_API_KEY not found in environment');
    process.exit(1);
}

async function testSerpApi() {
    console.log('\n🔍 Testing SERP API Directly\n');
    console.log('='.repeat(70));
    
    const query = 'luxury apartments for rent';
    const location = 'Atlanta, GA';
    const numResults = 3;
    
    console.log(`Query: ${query}`);
    console.log(`Location: ${location}`);
    console.log(`Results: ${numResults}`);
    console.log('='.repeat(70));
    
    try {
        const searchUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}&num=${numResults}&api_key=${SERP_API_KEY}`;
        
        console.log('\n⏳ Calling SERP API...\n');
        
        const response = await fetch(searchUrl);
        
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`SERP API error: ${response.status} - ${text}`);
        }
        
        const data = await response.json();
        
        console.log('✅ SERP API Response Received!\n');
        console.log('📊 Results:');
        console.log(`   - Search Results: ${data.organic_results?.length || 0}`);
        console.log(`   - Search Query: ${data.search_parameters?.q || 'N/A'}`);
        console.log(`   - Location: ${data.search_parameters?.location || 'N/A'}`);
        
        if (data.organic_results && data.organic_results.length > 0) {
            console.log('\n🏢 Found Properties:\n');
            
            data.organic_results.forEach((result, idx) => {
                console.log(`${idx + 1}. ${result.title}`);
                console.log(`   URL: ${result.link}`);
                console.log(`   Snippet: ${(result.snippet || '').substring(0, 100)}...`);
                console.log('');
            });
        }
        
        console.log('='.repeat(70));
        console.log('\n✅ SERP API is working correctly!\n');
        
        return data;
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('\n💡 Check:');
        console.error('   1. SERP API key is valid');
        console.error('   2. You have remaining quota (100 free searches/month)');
        console.error('   3. Internet connection is working\n');
        throw error;
    }
}

// Run the test
testSerpApi()
    .then(() => {
        console.log('✅ Test completed successfully\n');
        process.exit(0);
    })
    .catch(() => {
        console.error('❌ Test failed\n');
        process.exit(1);
    });
