#!/usr/bin/env node
/**
 * Final batch to reach 200 properties
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = join(__dirname, '.env.production.real');
dotenv.config({ path: envPath, override: true });

const SUPABASE_URL = process.env.SUPABASE_URL;
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

console.log('\n🏁 Final Batch to Reach 200 Properties\n');
console.log('='.repeat(70));

const searches = [
    { query: 'pet friendly apartments atlanta', location: 'Atlanta, GA', num: 20 },
    { query: 'furnished apartments atlanta', location: 'Atlanta, GA', num: 20 },
    { query: 'studio apartments atlanta', location: 'Atlanta, GA', num: 20 },
    { query: '1 bedroom apartments atlanta', location: 'Atlanta, GA', num: 20 },
    { query: 'townhomes for rent atlanta', location: 'Atlanta, GA', num: 20 },
    { query: 'apartments near georgia tech', location: 'Atlanta, GA', num: 20 },
    { query: 'apartments near emory university', location: 'Atlanta, GA', num: 20 },
];

let totalFound = 0;
let totalSaved = 0;
let searchCount = 0;

try {
    for (const search of searches) {
        searchCount++;
        console.log(`\n🔍 Search ${searchCount}/${searches.length}: ${search.query}`);
        
        try {
            const result = await discoverProperties(search.query, search.location, search.num);
            
            const saved = result.persisted?.filter(p => 
                p.status === 'enqueued_via_rpc' || p.status === 'persisted'
            ).length || 0;
            
            totalFound += result.search?.numResults || 0;
            totalSaved += saved;
            
            console.log(`   Found: ${result.search?.numResults || 0}, Saved: ${saved}`);
            
            if (searchCount < searches.length) {
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
            
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('\n✅ Final Batch Complete!\n');
    console.log(`📊 Added: ${totalSaved} properties`);
    console.log(`💰 Cost: ~$${(totalFound * 0.003 + searchCount * 0.01).toFixed(2)}`);
    console.log('\nChecking final count...\n');
    
} catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
}
