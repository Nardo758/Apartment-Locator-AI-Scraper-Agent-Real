#!/usr/bin/env node
/**
 * Test Claude Queue Builder with Environment Check
 */

import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('\n🧪 Testing Claude Queue Builder with SERP API\n');
console.log('='.repeat(70));

try {
    console.log('⏳ Calling function with real parameters...\n');
    
    const response = await fetch(
        `${SUPABASE_URL}/functions/v1/claude-queue-builder`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: 'luxury apartments',
                location: 'Atlanta, GA',
                num_results: 2,  // Just 2 for testing
                use_claude: false  // Disable Claude for now to test SERP only
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
        
        if (data.message?.includes('SERP_API_KEY not configured')) {
            console.log('\n💡 Solution: The function needs to be redeployed with environment variables');
            console.log('\nOption 1: Redeploy the function');
            console.log('   supabase functions deploy claude-queue-builder --no-verify-jwt');
            console.log('\nOption 2: Set as Supabase secret (for production)');
            console.log('   supabase secrets set SERP_API_KEY=' + process.env.SERP_API_KEY);
            console.log('\nOption 3: Serve locally with env file');
            console.log('   supabase functions serve --env-file ./supabase/functions/.env\n');
        }
        process.exit(1);
    }

    console.log('✅ Function responded successfully!\n');
    console.log('📊 Response Summary:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.debug) {
        console.log('\n🔍 Debug Info:');
        console.log(`   SERP API Configured: ${data.debug.serp_api_configured ? '✅ Yes' : '❌ No'}`);
        console.log(`   Claude Configured: ${data.debug.claude_configured ? '✅ Yes' : '❌ No'}`);
        console.log(`   Properties Found: ${data.search?.numResults || 0}`);
    }
    
    console.log('\n✅ Test completed!\n');
    
} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}
