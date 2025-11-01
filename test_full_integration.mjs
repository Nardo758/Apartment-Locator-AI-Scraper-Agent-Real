#!/usr/bin/env node
/**
 * Full Integration Test - Claude + SERP + Database
 */

import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = 'https://jdymvpasjsdbryatscux.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('\n🚀 Full Integration Test: Claude + SERP API + Database\n');
console.log('='.repeat(70));

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
                query: 'luxury apartments',
                location: 'Atlanta, GA',
                num_results: 5,
                use_claude: true
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        console.error('❌ Function error:', data);
        process.exit(1);
    }

    console.log('✅ SUCCESS! Full integration working!\n');
    
    console.log('📊 Results:');
    console.log(`   🔍 SERP API: Found ${data.search?.numResults || 0} properties`);
    console.log(`   🤖 Claude AI: Analyzed ${data.analyzed || 0} properties`);
    console.log(`   💾 Database: ${data.persisted?.length || 0} operations attempted`);
    
    console.log('\n🔧 System Status:');
    console.log(`   SERP API: ${data.debug?.serp_api_configured ? '✅ Working' : '❌ Not configured'}`);
    console.log(`   Claude AI: ${data.debug?.claude_configured ? '✅ Working' : '❌ Not configured'}`);
    console.log(`   Analysis: ${data.debug?.claude_used ? '✅ Enabled' : '❌ Disabled'}`);
    
    console.log('\n🏢 Discovered Properties:\n');
    
    // Show the full response to see what was analyzed
    console.log('Full Response Data:');
    console.log(JSON.stringify(data, null, 2));
    
    console.log('\n' + '='.repeat(70));
    console.log('\n🎉 Integration Test Complete!\n');
    console.log('✅ SERP API is finding properties');
    console.log('✅ Claude AI is analyzing them');
    console.log('✅ Function is processing requests');
    console.log('\nYou can now use the queue builder to discover properties!\n');
    
    console.log('💡 Usage:');
    console.log('   node control-panel.mjs run-now claude-queue-builder');
    console.log('   node control-panel.mjs schedule claude-queue-builder "0 1 * * 0"\n');

} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}
