import Anthropic from '@anthropic-ai/sdk';
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
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const SERP_KEY = process.env.SERP_API_KEY;

const prodClient = createClient(PROD_URL, PROD_KEY);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });

console.log('\n🎯 Discovering 500 Diverse Property Sites\n');
console.log('='.repeat(70));

// Check current queue size
const { count: currentCount } = await prodClient
    .from('property_sources')
    .select('*', { count: 'exact', head: true });

console.log(`\n📊 Current queue: ${currentCount || 0} sites`);
console.log(`   Target: 500 sites`);
console.log(`   Need: ${Math.max(0, 500 - (currentCount || 0))} more sites\n`);

// Define search strategies targeting NEW template types
const DIVERSE_SEARCH_QUERIES = [
    // Corporate Housing & Furnished Apartments
    'furnished apartments Atlanta monthly',
    'corporate housing Atlanta temporary',
    'extended stay apartments Atlanta',
    'serviced apartments Atlanta',
    
    // Luxury High-Rise & Condos
    'luxury condos for rent Atlanta',
    'penthouse apartments Atlanta',
    'high rise apartments Atlanta downtown',
    'luxury residential towers Atlanta',
    
    // Local/Boutique Management Companies
    'boutique apartments Atlanta',
    'locally owned apartments Atlanta',
    'independent apartment communities Atlanta',
    
    // Senior Living & Specialized
    'senior apartments Atlanta',
    '55+ communities Atlanta',
    'active adult apartments Atlanta',
    
    // Suburban & Surrounding Areas
    'apartments Marietta GA',
    'apartments Roswell GA',
    'apartments Sandy Springs GA',
    'apartments Decatur GA',
    'apartments Alpharetta GA',
    'apartments Smyrna GA',
    
    // Neighborhood-Specific
    'apartments Buckhead luxury',
    'lofts Castleberry Hill Atlanta',
    'apartments West End Atlanta',
    'apartments East Atlanta',
    
    // Property Type Specific
    'townhomes for rent Atlanta',
    'garden apartments Atlanta',
    'luxury lofts Atlanta',
    'converted lofts Atlanta',
    
    // Corporate Brands (to find more)
    'MAA apartments Atlanta',
    'Greystar apartments Atlanta',
    'Alliance Residential Atlanta',
    'Bozzuto apartments Atlanta',
    'AvalonBay Atlanta',
    'Camden apartments Atlanta',
    'Post properties Atlanta'
];

console.log('🔍 Search Strategy:\n');
console.log(`   Total searches: ${DIVERSE_SEARCH_QUERIES.length}`);
console.log(`   Focus: New template types (furnished, luxury, local, corporate)\n`);

// Get existing URLs to avoid duplicates
const { data: existingUrls } = await prodClient
    .from('property_sources')
    .select('url');

const existingUrlSet = new Set(existingUrls?.map(e => e.url) || []);

console.log('🚀 Starting discovery campaign...\n');
console.log('='.repeat(70));

let totalFound = 0;
let totalSaved = 0;
const allResults = [];

for (let i = 0; i < DIVERSE_SEARCH_QUERIES.length; i++) {
    const query = DIVERSE_SEARCH_QUERIES[i];
    
    console.log(`\n[${i + 1}/${DIVERSE_SEARCH_QUERIES.length}] "${query}"`);
    
    try {
        // Search with SERP API
        const response = await axios.get('https://serpapi.com/search', {
            params: {
                q: query,
                location: 'Atlanta, Georgia, United States',
                api_key: SERP_KEY,
                num: 20
            }
        });
        
        const results = response.data.organic_results || [];
        console.log(`   Found ${results.length} results`);
        
        // Filter to property sites only (avoid aggregators)
        const filtered = results.filter(r => {
            const url = r.link?.toLowerCase() || '';
            const aggregators = ['apartments.com', 'zillow', 'trulia', 'realtor.com', 
                                'apartmentlist', 'rent.com', 'forrent.com', 'rentcafe.com'];
            return !aggregators.some(agg => url.includes(agg));
        });
        
        console.log(`   After filtering: ${filtered.length} property sites`);
        
        const newSites = filtered.filter(r => !existingUrlSet.has(r.link));
        console.log(`   New sites: ${newSites.length}`);
        
        if (newSites.length > 0) {
            allResults.push(...newSites.map(r => ({
                query,
                url: r.link,
                title: r.title
            })));
            
            totalFound += newSites.length;
        }
        
        // Delay to respect rate limits
        if (i < DIVERSE_SEARCH_QUERIES.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }
}

console.log('\n' + '='.repeat(70));
console.log(`\n✅ Discovery complete: ${totalFound} new sites found\n`);

// Use Claude to analyze and classify the URLs
if (allResults.length > 0) {
    console.log('🤖 Using Claude to classify discovered sites...\n');
    
    const urlList = allResults.slice(0, 100).map((r, idx) => 
        `${idx + 1}. ${r.url} - "${r.title}"`
    ).join('\n');
    
    const prompt = `Analyze these property/apartment websites and extract clean property information.

URLs found:
${urlList}

For each URL, determine:
1. Is it a valid property/apartment website? (not a blog, news, review site)
2. Property name (extract from title/URL)
3. What type of property template does it match?
   - single-property-premium: Custom branded luxury apartments
   - property-management-standard: Corporate property management (AMLI, Cortland, MAA, Greystar, etc.)
   - university-housing: University housing portals
   - furnished-corporate: Furnished/corporate housing (monthly rentals)
   - luxury-highrise: High-rise condos and penthouses
   - local-boutique: Local/independent property managers
   - senior-living: 55+ senior communities
   - other: Doesn't fit patterns

Return JSON array with:
{
  "valid_sites": [
    {
      "url": "...",
      "property_name": "...",
      "template_type": "...",
      "confidence": 0-100
    }
  ]
}

Focus on validity and accurate template classification.`;
    
    try {
        const message = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 4000,
            messages: [{ role: 'user', content: prompt }]
        });
        
        const response = message.content[0].text;
        
        // Try to extract JSON
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const analysis = JSON.parse(jsonMatch[0]);
            const validSites = analysis.valid_sites || [];
            
            console.log(`   ✅ Claude validated ${validSites.length} sites\n`);
            
            // Save to database
            console.log('💾 Saving to property_sources...\n');
            
            const toSave = validSites.map(site => ({
                url: site.url,
                property_name: site.property_name || 'Unknown Property',
                city: 'Atlanta',
                state: 'GA',
                notes: `Template: ${site.template_type}, Confidence: ${site.confidence}%`
            }));
            
            for (let i = 0; i < toSave.length; i += 50) {
                const batch = toSave.slice(i, i + 50);
                
                const { error } = await prodClient
                    .from('property_sources')
                    .upsert(batch, { onConflict: 'url' });
                
                if (!error) {
                    totalSaved += batch.length;
                    console.log(`   Saved ${totalSaved}/${toSave.length}...`);
                }
            }
            
        }
    } catch (error) {
        console.log(`   ⚠️  Claude analysis failed: ${error.message}`);
        console.log('   Saving all results without classification...\n');
        
        // Save without Claude analysis
        const toSave = allResults.slice(0, 300).map(r => ({
            url: r.url,
            property_name: r.title || 'Unknown Property',
            city: 'Atlanta',
            state: 'GA'
        }));
        
        for (let i = 0; i < toSave.length; i += 50) {
            const batch = toSave.slice(i, i + 50);
            
            const { error } = await prodClient
                .from('property_sources')
                .upsert(batch, { onConflict: 'url' });
            
            if (!error) {
                totalSaved += batch.length;
                console.log(`   Saved ${totalSaved}/${toSave.length}...`);
            }
        }
    }
}

// Final summary
console.log('\n' + '='.repeat(70));

const { count: finalCount } = await prodClient
    .from('property_sources')
    .select('*', { count: 'exact', head: true });

console.log('\n🎉 Queue Expansion Complete!\n');
console.log(`   Starting size:  ${currentCount || 0}`);
console.log(`   Discovered:     ${totalFound}`);
console.log(`   Saved:          ${totalSaved}`);
console.log(`   Final size:     ${finalCount || 0}`);
console.log(`   Target:         500`);
console.log(`   Remaining:      ${Math.max(0, 500 - (finalCount || 0))}\n`);

console.log('💡 Next Steps:\n');
console.log('   1. Run: node analyze_site_structures.mjs');
console.log('   2. Identify new template patterns');
console.log('   3. Create templates for new patterns');
console.log('   4. Start training on high-value templates\n');

console.log('='.repeat(70));
console.log('');
