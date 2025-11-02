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

const prodClient = createClient(PROD_URL, PROD_KEY);

console.log('\n🎯 Template #1: Single-Property-Premium Training Sample Selection\n');
console.log('='.repeat(70));

// Get all sites from learning queue
const { data: learningQueue } = await prodClient
    .from('scraper_learning_queue')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

console.log(`📊 Total sites in learning queue: ${learningQueue?.length || 0}\n`);

// Single-property-premium indicators
const PREMIUM_INDICATORS = [
    'live', 'the', 'at', 'residence', 'tower', 'place', 'loft', 'square',
    'park', 'view', 'heights', 'ridge', 'grove', 'point', 'station'
];

// Filter for single-property-premium sites
const premiumSites = learningQueue?.filter(site => {
    const url = site.url.toLowerCase();
    const domain = site.domain.toLowerCase();
    
    // Check for premium indicators in domain
    const hasIndicator = PREMIUM_INDICATORS.some(indicator => 
        domain.includes(indicator) || url.includes(indicator)
    );
    
    // Exclude aggregators and management companies
    const isNotAggregator = ![
        'apartments.com', 'zillow', 'trulia', 'realtor', 'rentcafe',
        'apartmentguide', 'rent.com', 'forrent.com'
    ].some(agg => domain.includes(agg));
    
    const isNotManagement = ![
        'amli', 'cortland', 'equity', 'greystar', 'bell', 'avenue5'
    ].some(mgmt => domain.includes(mgmt));
    
    return hasIndicator && isNotAggregator && isNotManagement;
}) || [];

console.log(`🏗️  Single-Property-Premium sites identified: ${premiumSites.length}\n`);

// Group by domain for better training coverage
const domainGroups = {};
premiumSites.forEach(site => {
    const domain = site.domain;
    if (!domainGroups[domain]) {
        domainGroups[domain] = [];
    }
    domainGroups[domain].push(site);
});

console.log('📋 Sites grouped by domain:\n');
Object.entries(domainGroups)
    .sort(([,a], [,b]) => b.length - a.length)
    .forEach(([domain, sites]) => {
        console.log(`   ${domain}: ${sites.length} site${sites.length > 1 ? 's' : ''}`);
    });

// Select diverse training samples
console.log('\n🎯 Selecting Training Samples:\n');

const trainingSamples = [];

// Strategy: Pick one site from different domains to maximize pattern diversity
const domainEntries = Object.entries(domainGroups).sort(([,a], [,b]) => b.length - a.length);

// Take top 3 domains with good site names
const selectedDomains = [];
for (const [domain, sites] of domainEntries) {
    if (trainingSamples.length >= 3) break;
    
    // Prefer sites with clear property names
    const bestSite = sites.find(site => 
        site.property_name && 
        site.property_name.length > 5 && 
        !site.property_name.toLowerCase().includes('apartment')
    ) || sites[0];
    
    trainingSamples.push({
        ...bestSite,
        reason: `Representative of ${domain} pattern`
    });
    selectedDomains.push(domain);
    
    console.log(`   ✅ Selected: ${bestSite.property_name || 'Unknown'}`);
    console.log(`      URL: ${bestSite.url}`);
    console.log(`      Domain: ${bestSite.domain}`);
    console.log(`      Reason: Representative of ${domain} pattern\n`);
}

// If we need more samples, add from remaining sites
while (trainingSamples.length < 3 && premiumSites.length > trainingSamples.length) {
    const remaining = premiumSites.filter(site => 
        !trainingSamples.some(sample => sample.url === site.url)
    );
    
    if (remaining.length > 0) {
        const nextSample = remaining[0];
        trainingSamples.push({
            ...nextSample,
            reason: 'Additional diversity sample'
        });
        
        console.log(`   ✅ Additional: ${nextSample.property_name || 'Unknown'}`);
        console.log(`      URL: ${nextSample.url}`);
        console.log(`      Domain: ${nextSample.domain}\n`);
    } else {
        break;
    }
}

console.log('='.repeat(70));
console.log('\n🎯 Template #1 Training Plan:\n');

console.log(`   Selected ${trainingSamples.length} diverse training samples`);
console.log(`   Target deployment: ${premiumSites.length} single-property-premium sites`);
console.log(`   Strategy: Train once → Deploy to all similar sites\n`);

console.log('🔧 Next Steps:\n');
console.log('   1. Create extraction template for these 3 sample sites');
console.log('   2. Test template on samples to validate 90%+ success rate');
console.log('   3. Deploy template to all single-property-premium sites');
console.log('   4. Monitor performance and refine template as needed\n');

console.log('📊 Training Sample Summary:');
trainingSamples.forEach((sample, index) => {
    console.log(`\n   ${index + 1}. ${sample.property_name || 'Unknown Property'}`);
    console.log(`      🌐 ${sample.url}`);
    console.log(`      🏷️  ${sample.domain}`);
    console.log(`      💡 ${sample.reason}`);
});

console.log('\n' + '='.repeat(70));
console.log('');

// Export for next steps
import { writeFileSync } from 'fs';
writeFileSync(
    join(__dirname, 'training_samples_premium.json'),
    JSON.stringify({
        template_type: 'single-property-premium',
        total_target_sites: premiumSites.length,
        training_samples: trainingSamples,
        all_premium_sites: premiumSites.map(site => ({
            url: site.url,
            domain: site.domain,
            property_name: site.property_name
        })),
        selection_date: new Date().toISOString()
    }, null, 2)
);

console.log('💾 Training data exported to: training_samples_premium.json\n');