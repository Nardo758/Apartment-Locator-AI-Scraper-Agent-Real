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

console.log('\n🎓 Starting Template Training\n');
console.log('='.repeat(70));

// Get template #1: single-property-premium
const { data: templates } = await prodClient
    .from('website_structure_templates')
    .select('*')
    .eq('template_name', 'single-property-premium')
    .single();

console.log(`\n📋 Template: ${templates.template_name.toUpperCase()}\n`);
console.log(`   Description: ${templates.description}`);
console.log(`   Strategy: ${templates.extraction_strategy}`);

// Get all sites for this template
const { data: sites } = await prodClient
    .from('site_classifications')
    .select('*')
    .eq('template_id', templates.id);

console.log(`\n🎯 Sites to Train: ${sites?.length || 0}\n`);

// Show sample sites
if (sites && sites.length > 0) {
    console.log('📍 Sample Sites (for testing):\n');
    sites.slice(0, 5).forEach((site, idx) => {
        console.log(`   ${idx + 1}. ${site.domain}`);
        console.log(`      ${site.url}`);
    });
    
    if (sites.length > 5) {
        console.log(`   ... and ${sites.length - 5} more sites\n`);
    }
}

console.log('\n' + '='.repeat(70));
console.log('\n🎓 Training Approach for single-property-premium:\n');

console.log('This template covers individual luxury apartment properties with:');
console.log('   • Custom branding (live*, the*, at* in domain names)');
console.log('   • Hero-style layouts with prominent imagery');
console.log('   • Floor plans / availability sections');
console.log('   • Contact/tour scheduling');
console.log('   • Amenities showcases\n');

console.log('📝 Training Steps:\n');
console.log('   1. Manual Analysis (Pick 2-3 samples)');
console.log('      → Visit sites in browser');
console.log('      → Identify common patterns');
console.log('      → Document CSS selectors for:');
console.log('         - Property name');
console.log('         - Pricing (monthly rent)');
console.log('         - Bedrooms & bathrooms');
console.log('         - Square footage');
console.log('         - Availability');
console.log('');
console.log('   2. Create Template Scraper');
console.log('      → Build extraction function');
console.log('      → Add validation (bathrooms <= 3)');
console.log('      → Handle variations in layout');
console.log('');
console.log('   3. Test on Samples');
console.log('      → Run on 3-5 sites');
console.log('      → Verify extracted data');
console.log('      → Adjust selectors as needed');
console.log('');
console.log('   4. Deploy to All Sites');
console.log('      → Apply to all 39 sites in group');
console.log('      → Track performance');
console.log('      → Aim for 70%+ success rate');

console.log('\n🔧 Recommended Test Sites:\n');

const testSites = [
    { domain: 'livealtitudeatlanta.com', reason: 'Modern luxury high-rise' },
    { domain: 'thedagnymidtown.com', reason: 'Boutique midtown property' },
    { domain: 'novelwestmidtown.com', reason: 'West Midtown location' }
];

testSites.forEach((site, idx) => {
    const foundSite = sites?.find(s => s.domain === site.domain);
    if (foundSite) {
        console.log(`   ${idx + 1}. ${site.domain}`);
        console.log(`      URL: ${foundSite.url}`);
        console.log(`      Why: ${site.reason}\n`);
    }
});

console.log('💡 Manual Training Process:\n');
console.log('   1. Open each test site in browser');
console.log('   2. Use browser DevTools (F12) to inspect:');
console.log('      - Right-click elements → Inspect');
console.log('      - Look for pricing: $X,XXX');
console.log('      - Look for bed/bath: "2 bed | 1 bath"');
console.log('      - Look for sqft: "XXX sq ft"');
console.log('');
console.log('   3. Document patterns you find:');
console.log('      - CSS selectors that work across sites');
console.log('      - API endpoints if they load data dynamically');
console.log('      - Common class names or IDs');
console.log('');
console.log('   4. Share findings and we\'ll build the scraper!');

console.log('\n📊 Expected Results:\n');
console.log(`   Sites in template:     39`);
console.log(`   Target success rate:   70%+ (27+ sites)`);
console.log(`   New properties:        27+ to add to database`);
console.log(`   Total after training:  54+ properties (27 current + 27 new)`);

console.log('\n🎯 Success Criteria:\n');
console.log('   ✅ Extract all required fields (name, price, bed, bath)');
console.log('   ✅ Bathrooms validated (<= 3)');
console.log('   ✅ Bedrooms validated (<= 10)');
console.log('   ✅ Pricing reasonable ($500 - $10,000)');
console.log('   ✅ Successfully save to database');

console.log('\n📁 Track Progress:\n');
console.log('   • Update template_performance table after each scrape');
console.log('   • Track success rate in website_structure_templates');
console.log('   • Mark sites as "trained" in scraper_learning_queue\n');

console.log('='.repeat(70));
console.log('\n🚀 Ready to Start!\n');
console.log('Next: Pick 2-3 test sites above and analyze their structure.');
console.log('Share what you find (CSS selectors, patterns, etc.) and');
console.log('we\'ll build the template scraper together!\n');

console.log('='.repeat(70));
console.log('');
