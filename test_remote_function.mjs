#!/usr/bin/env node
/**
 * Test Claude Queue Builder on Remote Supabase
 * This tests the deployed function on Supabase cloud (not local)
 */

import dotenv from 'dotenv';
dotenv.config();

// Use your actual Supabase project URL
const SUPABASE_URL = 'https://jdymvpasjsdbryatscux.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('\n🌐 Testing Remote Claude Queue Builder (Supabase Cloud)\n');
console.log('='.repeat(70));
console.log(`Testing against: ${SUPABASE_URL}`);
console.log('='.repeat(70));

if (!SUPABASE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found');
    process.exit(1);
}

try {
    console.log('\n⏳ Calling remote function with SERP API...\n');
    
    const response = await fetch(
        `${SUPABASE_URL}/functions/v1/claude-queue-builder`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: 'luxury apartments for rent',
                location: 'Atlanta, GA',
                num_results: 3,
                use_claude: true  // Enable Claude analysis
            })
        }
    );

    const text = await response.text();
    let data;
    
    try {
        data = JSON.parse(text);
    } catch (e) {
        console.error('❌ Could not parse response as JSON');
        console.error('Raw response:', text);
        process.exit(1);
    }

    if (!response.ok) {
        console.error(`❌ HTTP ${response.status}\n`);
        console.error('Response:', JSON.stringify(data, null, 2));
        process.exit(1);
    }

    console.log('✅ Function responded successfully!\n');
    
    console.log('📊 Summary:');
    console.log(`   Status: ${data.status}`);
    console.log(`   Search Query: ${data.search?.query}`);
    console.log(`   Location: ${data.search?.location}`);
    console.log(`   Properties Found: ${data.search?.numResults || 0}`);
    console.log(`   Properties Analyzed: ${data.analyzed || 0}`);
    console.log(`   Database Operations: ${data.persisted?.length || 0}`);
    
    console.log('\n🔍 Configuration:');
    console.log(`   SERP API: ${data.debug?.serp_api_configured ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`   Claude AI: ${data.debug?.claude_configured ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`   Claude Used: ${data.debug?.claude_used ? '✅ Yes' : '❌ No'}`);
    
    if (data.persisted && data.persisted.length > 0) {
        console.log('\n🏢 Processing Results:');
        let successCount = 0;
        let errorCount = 0;

        data.persisted.forEach((result) => {
            if (result.status === 'enqueued_via_rpc' || result.status === 'persisted') {
                successCount++;
            } else {
                errorCount++;
            }
        });

        console.log(`   ✅ Success: ${successCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);
        
        console.log('\n   First few results:');
        data.persisted.slice(0, 3).forEach((result, idx) => {
            console.log(`   ${idx + 1}. ${result.url}`);
            console.log(`      Status: ${result.status}`);
        });
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('\n🎉 Integration Test Successful!\n');
    console.log('The Claude + SERP API queue builder is working!\n');
    
    process.exit(0);
    
} catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Check your SUPABASE_SERVICE_ROLE_KEY is correct');
    console.error('   2. Verify function is deployed: supabase functions list');
    console.error('   3. Check Supabase dashboard for function logs\n');
    process.exit(1);
}
