#!/usr/bin/env node
/**
 * Discover 200 Properties in Atlanta
 * Uses Claude + SERP API with multiple search queries
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load production credentials
const envPath = join(__dirname, '.env.production.real');
dotenv.config({ path: envPath, override: true });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
    console.error('ERROR: Missing SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

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

console.log('\n🏙️  Discovering 200 Properties in Atlanta Area\n');
console.log('='.repeat(70));
console.log(`Database: ${SUPABASE_URL}\n`);

// Multiple search queries to reach 200 properties
const searches = [
    { query: 'luxury apartments for rent', location: 'Atlanta, GA', num: 20 },
    { query: 'apartments midtown atlanta', location: 'Atlanta, GA', num: 20 },
    { query: 'apartments buckhead atlanta', location: 'Atlanta, GA', num: 20 },
    { query: 'apartments downtown atlanta', location: 'Atlanta, GA', num: 20 },
    { query: 'high rise apartments atlanta', location: 'Atlanta, GA', num: 20 },
    { query: 'apartments virginia highland atlanta', location: 'Atlanta, GA', num: 20 },
    { query: 'apartments old fourth ward atlanta', location: 'Atlanta, GA', num: 20 },
    { query: 'apartments west midtown atlanta', location: 'Atlanta, GA', num: 20 },
    { query: 'apartments inman park atlanta', location: 'Atlanta, GA', num: 20 },
    { query: 'apartments decatur ga', location: 'Decatur, GA', num: 20 },
];

let totalFound = 0;
let totalSaved = 0;
let searchCount = 0;

try {
    for (const search of searches) {
        searchCount++;
        console.log(`\n🔍 Search ${searchCount}/${searches.length}: ${search.query} (${search.location})`);
        
        try {
            const result = await discoverProperties(search.query, search.location, search.num);
            
            const saved = result.persisted?.filter(p => 
                p.status === 'enqueued_via_rpc' || p.status === 'persisted'
            ).length || 0;
            
            totalFound += result.search?.numResults || 0;
            totalSaved += saved;
            
            console.log(`   Found: ${result.search?.numResults || 0}, Saved: ${saved}`);
            
            // Wait to avoid rate limits
            if (searchCount < searches.length) {
                console.log('   Waiting 3 seconds...');
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
            
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('\n✅ Discovery Campaign Complete!\n');
    console.log('📊 Results:');
    console.log(`   Total Searches: ${searchCount}`);
    console.log(`   Properties Found: ${totalFound}`);
    console.log(`   Properties Saved: ${totalSaved}`);
    console.log(`   Duplicates Filtered: ${totalFound - totalSaved}`);
    
    console.log('\n💰 Cost Estimate:');
    console.log(`   SERP API: ${searchCount} searches`);
    console.log(`   Claude API: ~${totalFound} calls (~$${(totalFound * 0.003).toFixed(2)})`);
    console.log(`   Total: ~$${(totalFound * 0.003 + searchCount * 0.01).toFixed(2)}`);
    
    console.log('\n📈 Queue Status:');
    console.log('   Run: node check_production_data.mjs');
    console.log('   Or check property_sources table in Supabase\n');
    
} catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\nTroubleshooting:');
    console.log('   1. Check SERP_API_KEY is set in Supabase secrets');
    console.log('   2. Check ANTHROPIC_API_KEY is set in Supabase secrets');
    console.log('   3. Verify claude-queue-builder function is deployed\n');
    process.exit(1);
}
