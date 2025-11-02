#!/usr/bin/env node
/**
 * Discover More Properties in Atlanta Metro Area
 * Expanded search covering suburbs and specific neighborhoods
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

console.log('\n🏙️  Discovering More Atlanta Metro Properties\n');
console.log('='.repeat(70));

// Expanded searches covering Atlanta metro area
const searches = [
    // Specific neighborhoods
    { query: 'apartments poncey highland', location: 'Atlanta, GA', num: 20 },
    { query: 'apartments grant park', location: 'Atlanta, GA', num: 20 },
    { query: 'apartments cabbagetown', location: 'Atlanta, GA', num: 20 },
    { query: 'apartments atlantic station', location: 'Atlanta, GA', num: 20 },
    { query: 'apartments lindbergh', location: 'Atlanta, GA', num: 20 },
    
    // North suburbs
    { query: 'apartments sandy springs', location: 'Sandy Springs, GA', num: 20 },
    { query: 'apartments dunwoody', location: 'Dunwoody, GA', num: 20 },
    { query: 'apartments roswell', location: 'Roswell, GA', num: 20 },
    { query: 'apartments alpharetta', location: 'Alpharetta, GA', num: 20 },
    { query: 'apartments johns creek', location: 'Johns Creek, GA', num: 20 },
    
    // East side
    { query: 'apartments brookhaven', location: 'Brookhaven, GA', num: 20 },
    { query: 'apartments chamblee', location: 'Chamblee, GA', num: 20 },
    { query: 'apartments tucker', location: 'Tucker, GA', num: 20 },
    
    // South/Southwest
    { query: 'apartments east point', location: 'East Point, GA', num: 20 },
    { query: 'apartments college park', location: 'College Park, GA', num: 20 },
    
    // Perimeter area
    { query: 'apartments perimeter center', location: 'Atlanta, GA', num: 20 },
    { query: 'luxury condos atlanta', location: 'Atlanta, GA', num: 20 },
    { query: 'loft apartments atlanta', location: 'Atlanta, GA', num: 20 },
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
            
            if (searchCount < searches.length) {
                console.log('   Waiting 3 seconds...');
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
            
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('\n✅ Discovery Complete!\n');
    console.log('📊 Campaign Results:');
    console.log(`   Searches: ${searchCount}`);
    console.log(`   Found: ${totalFound}`);
    console.log(`   Saved: ${totalSaved}`);
    console.log(`   Duplicates: ${totalFound - totalSaved}`);
    
    console.log('\n💰 Cost: ~$${(totalFound * 0.003 + searchCount * 0.01).toFixed(2)}');
    console.log('\nCheck queue: node check_queue_size.mjs\n');
    
} catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
}
