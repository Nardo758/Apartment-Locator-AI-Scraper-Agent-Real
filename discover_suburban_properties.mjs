import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = join(__dirname, '.env.production.real');
dotenv.config({ path: envPath, override: true });

const PROD_URL = process.env.SUPABASE_URL;
const PROD_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SERP_KEY = process.env.SERP_API_KEY;

const prodClient = createClient(PROD_URL, PROD_KEY);

console.log('\n🏘️  Discovering Suburban Atlanta Properties\n');
console.log('='.repeat(70));

// Comprehensive list of Atlanta suburbs
const SUBURBAN_SEARCHES = [
    // North Suburbs
    { city: 'Marietta', state: 'GA', queries: ['apartments', 'luxury apartments', 'apartment communities'] },
    { city: 'Roswell', state: 'GA', queries: ['apartments', 'rentals', 'apartment homes'] },
    { city: 'Alpharetta', state: 'GA', queries: ['apartments', 'luxury rentals', 'corporate housing'] },
    { city: 'Johns Creek', state: 'GA', queries: ['apartments', 'rentals'] },
    { city: 'Dunwoody', state: 'GA', queries: ['apartments', 'luxury apartments'] },
    { city: 'Sandy Springs', state: 'GA', queries: ['apartments', 'apartment communities'] },
    { city: 'Brookhaven', state: 'GA', queries: ['apartments', 'rentals'] },
    { city: 'Chamblee', state: 'GA', queries: ['apartments'] },
    { city: 'Doraville', state: 'GA', queries: ['apartments'] },
    { city: 'Norcross', state: 'GA', queries: ['apartments'] },
    { city: 'Peachtree Corners', state: 'GA', queries: ['apartments'] },
    { city: 'Duluth', state: 'GA', queries: ['apartments', 'rentals'] },
    { city: 'Suwanee', state: 'GA', queries: ['apartments'] },
    { city: 'Cumming', state: 'GA', queries: ['apartments'] },
    
    // East Suburbs
    { city: 'Decatur', state: 'GA', queries: ['apartments', 'downtown apartments', 'lofts'] },
    { city: 'Stone Mountain', state: 'GA', queries: ['apartments'] },
    { city: 'Tucker', state: 'GA', queries: ['apartments'] },
    { city: 'Lilburn', state: 'GA', queries: ['apartments'] },
    { city: 'Snellville', state: 'GA', queries: ['apartments'] },
    { city: 'Lawrenceville', state: 'GA', queries: ['apartments'] },
    
    // South Suburbs
    { city: 'East Point', state: 'GA', queries: ['apartments'] },
    { city: 'College Park', state: 'GA', queries: ['apartments'] },
    { city: 'Forest Park', state: 'GA', queries: ['apartments'] },
    { city: 'Morrow', state: 'GA', queries: ['apartments'] },
    { city: 'Riverdale', state: 'GA', queries: ['apartments'] },
    { city: 'Union City', state: 'GA', queries: ['apartments'] },
    { city: 'Fairburn', state: 'GA', queries: ['apartments'] },
    { city: 'Fayetteville', state: 'GA', queries: ['apartments'] },
    { city: 'Peachtree City', state: 'GA', queries: ['apartments'] },
    { city: 'Newnan', state: 'GA', queries: ['apartments'] },
    
    // West Suburbs
    { city: 'Smyrna', state: 'GA', queries: ['apartments', 'luxury apartments'] },
    { city: 'Vinings', state: 'GA', queries: ['apartments', 'luxury rentals'] },
    { city: 'Mableton', state: 'GA', queries: ['apartments'] },
    { city: 'Austell', state: 'GA', queries: ['apartments'] },
    { city: 'Powder Springs', state: 'GA', queries: ['apartments'] },
    { city: 'Kennesaw', state: 'GA', queries: ['apartments', 'apartment communities'] },
    { city: 'Acworth', state: 'GA', queries: ['apartments'] },
    { city: 'Woodstock', state: 'GA', queries: ['apartments'] },
    { city: 'Canton', state: 'GA', queries: ['apartments'] },
    
    // Northwest Suburbs
    { city: 'Marietta Square', state: 'GA', queries: ['apartments', 'lofts'] },
    { city: 'East Cobb', state: 'GA', queries: ['apartments'] }
];

// Flatten into individual searches
const allSearches = [];
SUBURBAN_SEARCHES.forEach(location => {
    location.queries.forEach(query => {
        allSearches.push({
            query: `${query} ${location.city} ${location.state}`,
            city: location.city,
            state: location.state
        });
    });
});

console.log(`\n📍 Suburban Areas to Search: ${SUBURBAN_SEARCHES.length}`);
console.log(`   Total searches: ${allSearches.length}`);
console.log(`   Expected results: ${allSearches.length * 8} sites (avg 8 per search)\n`);

// Get existing URLs
const { data: existingUrls } = await prodClient
    .from('property_sources')
    .select('url');

const existingUrlSet = new Set(existingUrls?.map(e => e.url) || []);

console.log('🚀 Starting suburban discovery...\n');
console.log('='.repeat(70));

const AGGREGATORS = ['apartments.com', 'zillow.com', 'trulia.com', 'realtor.com', 
                     'apartmentlist', 'rent.com', 'forrent.com', 'rentcafe.com',
                     'apartmentfinder.com', 'apartmentguide.com'];

let totalFound = 0;
let totalNew = 0;
let totalSaved = 0;
const allNewSites = [];

for (let i = 0; i < allSearches.length; i++) {
    const search = allSearches[i];
    
    console.log(`\n[${i + 1}/${allSearches.length}] ${search.city}: "${search.query}"`);
    
    try {
        const response = await axios.get('https://serpapi.com/search', {
            params: {
                q: search.query,
                location: `${search.city}, ${search.state}, United States`,
                api_key: SERP_KEY,
                num: 20
            }
        });
        
        const results = response.data.organic_results || [];
        console.log(`   Found: ${results.length} results`);
        
        // Filter aggregators
        const filtered = results.filter(r => {
            const url = r.link?.toLowerCase() || '';
            return !AGGREGATORS.some(agg => url.includes(agg));
        });
        
        console.log(`   Filtered: ${filtered.length} property sites`);
        
        // Find new sites
        const newSites = filtered.filter(r => !existingUrlSet.has(r.link));
        
        if (newSites.length > 0) {
            console.log(`   ✅ New: ${newSites.length}`);
            
            newSites.forEach(site => {
                allNewSites.push({
                    url: site.link,
                    property_name: site.title || 'Unknown Property',
                    city: search.city,
                    state: search.state
                });
                existingUrlSet.add(site.link); // Prevent duplicates in this run
            });
            
            totalNew += newSites.length;
        } else {
            console.log(`   No new sites`);
        }
        
        totalFound += results.length;
        
        // Save in batches of 50 to avoid memory issues
        if (allNewSites.length >= 50) {
            const batch = allNewSites.splice(0, 50);
            
            const { error } = await prodClient
                .from('property_sources')
                .upsert(batch, { onConflict: 'url' });
            
            if (!error) {
                totalSaved += batch.length;
                console.log(`   💾 Saved batch: ${totalSaved} total`);
            }
        }
        
        // Rate limiting
        if (i < allSearches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 800));
        }
        
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }
}

// Save remaining sites
if (allNewSites.length > 0) {
    console.log(`\n💾 Saving final ${allNewSites.length} sites...\n`);
    
    for (let i = 0; i < allNewSites.length; i += 50) {
        const batch = allNewSites.slice(i, i + 50);
        
        const { error } = await prodClient
            .from('property_sources')
            .upsert(batch, { onConflict: 'url' });
        
        if (!error) {
            totalSaved += batch.length;
            console.log(`   Saved ${totalSaved}/${totalNew}...`);
        }
    }
}

console.log('\n' + '='.repeat(70));

const { count: finalCount } = await prodClient
    .from('property_sources')
    .select('*', { count: 'exact', head: true });

console.log('\n🎉 Suburban Discovery Complete!\n');
console.log(`   Searches performed:  ${allSearches.length}`);
console.log(`   Results found:       ${totalFound}`);
console.log(`   New sites:           ${totalNew}`);
console.log(`   Saved to database:   ${totalSaved}`);
console.log(`   Final queue size:    ${finalCount || 0}`);
console.log(`   Target:              500`);
console.log(`   Remaining:           ${Math.max(0, 500 - (finalCount || 0))}\n`);

console.log('📊 Coverage:\n');
console.log(`   Suburban areas:      ${SUBURBAN_SEARCHES.length} cities`);
console.log(`   Geographic spread:   North, South, East, West Atlanta\n`);

console.log('💡 Next Steps:\n');
console.log('   1. Analyze new suburban sites: node analyze_site_structures.mjs');
console.log('   2. Identify local/regional management patterns');
console.log('   3. Create templates for suburban property types');
console.log('   4. Start training on diverse geographic coverage\n');

console.log('='.repeat(70));
console.log('');
