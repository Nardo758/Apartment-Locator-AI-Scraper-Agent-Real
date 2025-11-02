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

console.log('\n🏗️  Website Structure Classification System\n');
console.log('='.repeat(70));

// Known patterns based on domain/URL patterns
const STRUCTURE_PATTERNS = {
    'property-management-standard': {
        domains: ['amli.com', 'cortland.com', 'equity', 'bell', 'avenue5', 'greystar', 'lincolnapts'],
        indicators: ['floorplans', 'availability', '/apartments/', 'resident'],
        description: 'Large property management companies with standardized layouts'
    },
    'single-property-premium': {
        domains: ['live', 'the', 'at', 'residence', 'tower', 'place'],
        indicators: ['floorplans', 'gallery', 'amenities', 'contact'],
        description: 'Individual luxury properties with custom branding'
    },
    'university-housing': {
        domains: ['housing.', '.edu/', 'campus', 'student'],
        indicators: ['housing', 'student', 'dormitory', 'residence-hall'],
        description: 'University and student housing portals'
    },
    'listing-aggregator': {
        domains: ['apartments.com', 'zillow', 'trulia', 'realtor', 'rentcafe'],
        indicators: ['search', 'filter', 'results', 'listings'],
        description: 'Multi-property listing aggregators'
    },
    'boutique-builder': {
        domains: ['highrises', 'luxury', 'condos'],
        indicators: ['properties', 'search', 'listings', 'featured'],
        description: 'Boutique real estate with property search'
    }
};

// Get learning queue
const { data: learningQueue } = await prodClient
    .from('scraper_learning_queue')
    .select('*')
    .eq('status', 'pending')
    .order('domain');

console.log(`\n📋 Analyzing ${learningQueue?.length || 0} sites...\n`);

// Classify each site
const classifications = {};
const unclassified = [];

learningQueue?.forEach(site => {
    const url = site.url.toLowerCase();
    const domain = site.domain.toLowerCase();
    
    let matched = false;
    
    for (const [templateName, pattern] of Object.entries(STRUCTURE_PATTERNS)) {
        // Check domain patterns
        const domainMatch = pattern.domains.some(d => domain.includes(d));
        
        // Check URL indicators
        const indicatorMatch = pattern.indicators.some(ind => url.includes(ind));
        
        if (domainMatch || indicatorMatch) {
            if (!classifications[templateName]) {
                classifications[templateName] = [];
            }
            classifications[templateName].push(site);
            matched = true;
            break;
        }
    }
    
    if (!matched) {
        unclassified.push(site);
    }
});

console.log('🏗️  Structure Classification Results:\n');
console.log('='.repeat(70));

Object.entries(classifications).sort((a, b) => b[1].length - a[1].length).forEach(([template, sites]) => {
    const pattern = STRUCTURE_PATTERNS[template];
    console.log(`\n📦 ${template.toUpperCase()}`);
    console.log(`   ${pattern.description}`);
    console.log(`   Sites: ${sites.length}`);
    console.log(`   Priority: ${sites.length >= 5 ? '🔥 HIGH' : sites.length >= 3 ? '⚡ MEDIUM' : '  LOW'}\n`);
    
    // Show sample sites
    sites.slice(0, 5).forEach(site => {
        console.log(`   • ${site.domain}`);
    });
    if (sites.length > 5) {
        console.log(`   ... and ${sites.length - 5} more`);
    }
});

if (unclassified.length > 0) {
    console.log('\n❓ UNCLASSIFIED Sites:\n');
    console.log(`   Total: ${unclassified.length}`);
    unclassified.slice(0, 10).forEach(site => {
        console.log(`   • ${site.domain}`);
    });
    if (unclassified.length > 10) {
        console.log(`   ... and ${unclassified.length - 10} more`);
    }
}

console.log('\n' + '='.repeat(70));
console.log('\n🎯 Training Strategy:\n');

const priorityOrder = Object.entries(classifications)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([name, sites]) => ({ name, count: sites.length }));

priorityOrder.forEach((item, idx) => {
    const priority = item.count >= 5 ? '🔥' : item.count >= 3 ? '⚡' : '  ';
    console.log(`   ${idx + 1}. ${priority} ${item.name} (${item.count} sites)`);
});

console.log('\n💡 Benefits of Structure Classification:\n');
console.log('   ✅ Train once on template → Apply to all similar sites');
console.log('   ✅ Faster development (group similar structures)');
console.log('   ✅ Better success rates (use proven patterns)');
console.log('   ✅ Easier maintenance (update template, not individual scrapers)');

console.log('\n📝 Next Steps:\n');
console.log('   1. Create SQL tables: Run create_structure_classification.sql');
console.log('   2. Create template scrapers for top 3 patterns');
console.log('   3. Test on 2-3 sites per template');
console.log('   4. Deploy to all sites in that group');

console.log('\n' + '='.repeat(70));
console.log('');

// Export classification data
import { writeFileSync } from 'fs';

const exportData = {
    summary: {
        total: learningQueue?.length || 0,
        classified: learningQueue?.length - unclassified.length,
        unclassified: unclassified.length,
        templates: Object.keys(classifications).length
    },
    classifications,
    unclassified: unclassified.map(s => ({ domain: s.domain, url: s.url })),
    templates: STRUCTURE_PATTERNS
};

writeFileSync('site_structure_classification.json', JSON.stringify(exportData, null, 2));
console.log('📊 Exported to: site_structure_classification.json\n');
