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

console.log('\n🎓 Scraper Training Roadmap\n');
console.log('='.repeat(70));

// Get templates with site counts
const { data: templates } = await prodClient
    .from('website_structure_templates')
    .select(`
        *,
        site_classifications(count)
    `)
    .order('id');

console.log('\n📊 Structure Templates Overview:\n');

templates?.forEach((template, idx) => {
    const siteCount = template.site_classifications?.[0]?.count || 0;
    const priority = siteCount >= 30 ? '🔥 HIGH' : siteCount >= 10 ? '⚡ MEDIUM' : '  LOW';
    
    console.log(`${idx + 1}. [${priority}] ${template.template_name.toUpperCase()}`);
    console.log(`   Sites: ${siteCount}`);
    console.log(`   Description: ${template.description}`);
    console.log(`   Strategy: ${template.extraction_strategy}`);
    console.log(`   Success Rate: ${template.success_rate}%`);
    
    if (template.sample_sites && template.sample_sites.length > 0) {
        console.log(`   Sample Sites:`);
        template.sample_sites.slice(0, 3).forEach(site => {
            console.log(`      • ${site}`);
        });
    }
    console.log('');
});

console.log('='.repeat(70));
console.log('\n🎯 Recommended Training Order:\n');

const sorted = templates
    ?.map(t => ({
        name: t.template_name,
        count: t.site_classifications?.[0]?.count || 0,
        samples: t.sample_sites || []
    }))
    .filter(t => t.count > 0)
    .sort((a, b) => b.count - a.count) || [];

sorted.forEach((template, idx) => {
    const roi = template.count; // Sites you'll unlock
    const effort = 1; // One template to create
    console.log(`   ${idx + 1}. Train: ${template.name}`);
    console.log(`      → Unlock: ${template.count} sites`);
    console.log(`      → ROI: ${roi}/1 = ${roi}x return`);
    console.log(`      → Start with: ${template.samples[0] || 'any site'}`);
    console.log('');
});

console.log('='.repeat(70));
console.log('\n📈 Expected Results:\n');

const totalSites = sorted.reduce((sum, t) => sum + t.count, 0);
const totalTemplates = sorted.length;

console.log(`   Current scraped:        27 properties`);
console.log(`   Classified sites:       ${totalSites} sites`);
console.log(`   Templates needed:       ${totalTemplates}`);
console.log(`   Average per template:   ${Math.round(totalSites / totalTemplates)} sites`);
console.log('');
console.log(`   After training 1 template:  27 + ${sorted[0]?.count || 0} = ${27 + (sorted[0]?.count || 0)} properties`);
console.log(`   After training all ${totalTemplates}:       27 + ${totalSites} = ${27 + totalSites} properties`);

console.log('\n💡 Training Process (Per Template):\n');
console.log('   1. Pick 1-2 sample sites from template group');
console.log('   2. Manually scrape to understand structure');
console.log('   3. Create template-specific scraper');
console.log('   4. Test on samples (verify bathrooms <= 3)');
console.log('   5. Deploy to all sites in group');
console.log('   6. Track in template_performance table');
console.log('   7. Update success_rate in template');

console.log('\n📋 Quick Start - Template #1:\n');
const top = sorted[0];
if (top) {
    console.log(`   Template: ${top.name}`);
    console.log(`   Sites: ${top.count}`);
    console.log(`   Test on: ${top.samples.slice(0, 2).join(', ')}`);
    console.log(`   Command: node train_template.mjs --template="${top.name}"`);
}

console.log('\n🗄️  Database Tables:\n');
console.log('   • website_structure_templates - Template definitions');
console.log('   • site_classifications - Site → Template mapping');
console.log('   • template_performance - Track success/failures');
console.log('   • scraper_learning_queue - All sites needing training');

console.log('\n' + '='.repeat(70));
console.log('');
