#!/usr/bin/env node
/**
 * Simple Test - Claude Queue Builder
 * Tests if the function can be invoked through Supabase
 */

import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('\n🧪 Testing Claude Queue Builder Function\n');
console.log('='.repeat(70));

if (!SUPABASE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found');
    process.exit(1);
}

// Test with test_mode first (no API calls)
console.log('📝 Test 1: Testing in test_mode (no API calls)...\n');

try {
    const response = await fetch(
        `${SUPABASE_URL}/functions/v1/claude-queue-builder`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                test_mode: true
            })
        }
    );

    if (!response.ok) {
        const text = await response.text();
        console.error(`❌ HTTP ${response.status}:`, text);
        console.log('\n💡 The function needs to be deployed or served.');
        console.log('   Run in another terminal: supabase functions serve');
        console.log('   Or deploy: supabase functions deploy claude-queue-builder\n');
        process.exit(1);
    }

    const data = await response.json();
    
    console.log('✅ Function responded successfully!\n');
    console.log('📊 Response:');
    console.log(`   Status: ${data.status}`);
    console.log(`   Mode: ${data.mode || 'N/A'}`);
    console.log(`   Candidates: ${data.candidates?.length || 0}`);
    
    if (data.candidates && data.candidates.length > 0) {
        console.log('\n🏢 Test Properties:');
        data.candidates.forEach((c, i) => {
            console.log(`   ${i + 1}. ${c.title || c.url}`);
        });
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('\n✅ Basic test passed! Function is accessible.\n');
    
    console.log('💡 Next step: Test with real SERP API');
    console.log('   Run: node test_serp_direct.mjs');
    console.log('   Or: node test_claude_queue_with_serp.mjs\n');
    
} catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure Supabase is running:');
    console.log('   supabase status');
    console.log('   supabase start (if not running)\n');
    process.exit(1);
}
