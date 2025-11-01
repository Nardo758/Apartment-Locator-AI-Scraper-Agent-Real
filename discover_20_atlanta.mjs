#!/usr/bin/env node
/**
 * Discover 20 Properties in Atlanta - Multiple Searches
 */

import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = 'https://jdymvpasjsdbryatscux.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function discoverProperties(query, location, numResults) {
    const response = await fetch(
        `${SUPABASE_URL}/functions/v1/claude-queue-builder`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query,
                location,
                num_results: numResults,
                use_claude: true
            })
        }
    );

    return await response.json();
}

console.log('\n🏙️  Discovering 20+ Properties in Atlanta Area\n');
console.log('='.repeat(70));

let totalFound = 0;
let totalSaved = 0;

try {
    // Search 1: Luxury apartments
    console.log('\n🔍 Search 1: Luxury apartments...');
    const search1 = await discoverProperties('luxury apartments for rent', 'Atlanta, GA', 10);
    const saved1 = search1.persisted?.filter(p => p.status === 'enqueued_via_rpc' || p.status === 'persisted').length || 0;
    totalFound += search1.search?.numResults || 0;
    totalSaved += saved1;
    console.log(`   Found: ${search1.search?.numResults || 0}, Saved: ${saved1}`);
    
    // Wait a bit to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Search 2: Downtown apartments
    console.log('\n🔍 Search 2: Downtown apartments...');
    const search2 = await discoverProperties('apartments downtown midtown', 'Atlanta, GA', 10);
    const saved2 = search2.persisted?.filter(p => p.status === 'enqueued_via_rpc' || p.status === 'persisted').length || 0;
    totalFound += search2.search?.numResults || 0;
    totalSaved += saved2;
    console.log(`   Found: ${search2.search?.numResults || 0}, Saved: ${saved2}`);
    
    console.log('\n' + '='.repeat(70));
    console.log('\n✅ Discovery Complete!\n');
    console.log('📊 Total Results:');
    console.log(`   🔍 Total Found: ${totalFound} properties`);
    console.log(`   💾 Total Saved: ${totalSaved} properties`);
    console.log(`   🤖 Claude Analyzed: ${totalFound} properties`);
    
    console.log('\n💰 Cost Summary:');
    console.log(`   SERP API: 2 searches (98 remaining this month)`);
    console.log(`   Claude API: ~${totalFound} calls (~$${(totalFound * 0.003).toFixed(2)})`);
    console.log(`   Total: ~$${(totalFound * 0.003).toFixed(2)}\n`);
    
    console.log('💡 View discovered properties:');
    console.log('   SELECT * FROM property_sources ORDER BY created_at DESC LIMIT 20;\n');
    
} catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
}
