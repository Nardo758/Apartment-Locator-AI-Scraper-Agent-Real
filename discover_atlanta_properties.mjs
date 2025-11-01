#!/usr/bin/env node
/**
 * Discover 20 Properties in Atlanta Area
 * Uses Claude + SERP API to find and analyze apartment properties
 */

import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = 'https://jdymvpasjsdbryatscux.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('\n🏙️  Discovering Properties in Atlanta Area\n');
console.log('='.repeat(70));
console.log('Query: Luxury apartments Atlanta');
console.log('Target: 20 properties');
console.log('Analysis: Claude AI enabled');
console.log('='.repeat(70));

try {
    console.log('\n⏳ Calling Claude Queue Builder...\n');
    
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
                num_results: 20,
                use_claude: true
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        console.error('❌ Error:', data);
        process.exit(1);
    }

    console.log('✅ Discovery Complete!\n');
    
    console.log('📊 Results Summary:');
    console.log(`   🔍 SERP API: Found ${data.search?.numResults || 0} properties`);
    console.log(`   🤖 Claude AI: Analyzed ${data.analyzed || 0} properties`);
    console.log(`   💾 Database: ${data.persisted?.length || 0} operations`);
    
    // Count successes
    const successes = data.persisted?.filter(p => 
        p.status === 'enqueued_via_rpc' || p.status === 'persisted'
    ) || [];
    const errors = data.persisted?.filter(p => 
        p.status === 'error' || p.status.includes('error')
    ) || [];
    
    console.log(`   ✅ Successfully saved: ${successes.length}`);
    console.log(`   ❌ Errors: ${errors.length}`);
    
    console.log('\n🔧 System Status:');
    console.log(`   SERP API: ${data.debug?.serp_api_configured ? '✅ Working' : '❌ Not configured'}`);
    console.log(`   Claude AI: ${data.debug?.claude_configured ? '✅ Working' : '❌ Not configured'}`);
    console.log(`   Analysis: ${data.debug?.claude_used ? '✅ Enabled' : '❌ Disabled'}`);
    
    if (successes.length > 0) {
        console.log('\n🏢 Successfully Discovered Properties:\n');
        successes.forEach((p, idx) => {
            console.log(`   ${idx + 1}. ${p.url}`);
        });
    }
    
    if (errors.length > 0 && errors.length < 5) {
        console.log('\n⚠️  Properties with Issues:\n');
        errors.slice(0, 3).forEach((p, idx) => {
            console.log(`   ${idx + 1}. ${p.url}`);
            console.log(`      Issue: ${p.status}`);
        });
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('\n🎉 Atlanta Property Discovery Complete!\n');
    
    console.log('💡 Next Steps:');
    console.log('   1. Check property_sources table for discovered properties');
    console.log('   2. Check scraping_queue for queued jobs');
    console.log('   3. Run AI scraper to process the queue\n');
    
    console.log('📈 Usage Stats:');
    console.log(`   SERP API searches: 1 (${99} remaining this month)`);
    console.log(`   Claude API calls: ~${data.analyzed || 0} (~$${((data.analyzed || 0) * 0.003).toFixed(2)})`);
    console.log(`   Total cost: ~$${((data.analyzed || 0) * 0.003).toFixed(2)}\n`);
    
} catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Verify Supabase connection');
    console.log('   2. Check SERP_API_KEY is configured');
    console.log('   3. Verify ANTHROPIC_API_KEY is set\n');
    process.exit(1);
}
