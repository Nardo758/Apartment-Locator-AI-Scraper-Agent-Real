import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = join(__dirname, '.env.production.real');
dotenv.config({ path: envPath, override: true });

const PROD_URL = process.env.SUPABASE_URL;
const PROD_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const prodClient = createClient(PROD_URL, PROD_KEY);

console.log('\n📊 Populating Site Classifications\n');
console.log('='.repeat(70));

// Load classification data
const classificationData = JSON.parse(
    readFileSync('site_structure_classification.json', 'utf-8')
);

console.log('\n📋 Classification Summary:\n');
console.log(`   Total sites:      ${classificationData.summary.total}`);
console.log(`   Classified:       ${classificationData.summary.classified}`);
console.log(`   Unclassified:     ${classificationData.summary.unclassified}`);
console.log(`   Templates:        ${classificationData.summary.templates}`);

// Get template IDs
console.log('\n🏗️  Step 1: Getting template IDs...\n');

const { data: templates } = await prodClient
    .from('website_structure_templates')
    .select('id, template_name');

const templateMap = {};
templates?.forEach(t => {
    templateMap[t.template_name] = t.id;
});

console.log(`   Found ${templates?.length || 0} templates`);

// Prepare site classifications
console.log('\n📝 Step 2: Preparing classifications...\n');

const classifications = [];

Object.entries(classificationData.classifications).forEach(([templateName, sites]) => {
    const templateId = templateMap[templateName];
    
    if (!templateId) {
        console.log(`   ⚠️  Template not found: ${templateName}`);
        return;
    }
    
    sites.forEach(site => {
        classifications.push({
            url: site.url,
            domain: site.domain,
            template_id: templateId,
            confidence_score: 85.00, // High confidence for pattern-matched sites
            has_floor_plans: true,
            has_pricing: true,
            requires_interaction: templateName === 'boutique-builder',
            last_analyzed_at: new Date().toISOString()
        });
    });
});

console.log(`   Prepared ${classifications.length} classifications`);

// Insert classifications
console.log('\n💾 Step 3: Inserting classifications...\n');

let inserted = 0;
for (let i = 0; i < classifications.length; i += 50) {
    const batch = classifications.slice(i, i + 50);
    
    const { error } = await prodClient
        .from('site_classifications')
        .upsert(batch, { onConflict: 'url' });
    
    if (error) {
        console.log(`   Error: ${error.message}`);
    } else {
        inserted += batch.length;
        console.log(`   Inserted ${inserted}/${classifications.length}...`);
    }
}

console.log(`\n   ✅ Successfully classified ${inserted} sites`);

// Update template statistics
console.log('\n📊 Step 4: Updating template statistics...\n');

for (const [templateName, sites] of Object.entries(classificationData.classifications)) {
    const templateId = templateMap[templateName];
    if (!templateId) continue;
    
    const sampleSites = sites.slice(0, 5).map(s => s.domain);
    
    const { error } = await prodClient
        .from('website_structure_templates')
        .update({ 
            sample_sites: sampleSites,
            updated_at: new Date().toISOString()
        })
        .eq('id', templateId);
    
    if (!error) {
        console.log(`   ✅ Updated ${templateName} with ${sites.length} sites`);
    }
}

// Summary by template
console.log('\n' + '='.repeat(70));
console.log('\n📊 Final Classification Summary:\n');

const { data: summary } = await prodClient
    .from('site_classifications')
    .select('template_id, website_structure_templates(template_name)', { count: 'exact' });

const countByTemplate = {};
summary?.forEach(s => {
    const name = s.website_structure_templates?.template_name || 'unknown';
    countByTemplate[name] = (countByTemplate[name] || 0) + 1;
});

Object.entries(countByTemplate).sort((a, b) => b[1] - a[1]).forEach(([name, count]) => {
    const priority = count >= 30 ? '🔥' : count >= 10 ? '⚡' : '  ';
    console.log(`   ${priority} ${name}: ${count} sites`);
});

console.log('\n🎯 Training Impact:\n');
console.log(`   Train 1 template → Unlock ${Math.max(...Object.values(countByTemplate))} sites`);
console.log(`   Train 4 templates → Unlock ${inserted} sites`);
console.log(`   Average: ${Math.round(inserted / Object.keys(countByTemplate).length)} sites per template`);

console.log('\n💡 Next Steps:\n');
console.log('   1. Review: SELECT * FROM site_classifications;');
console.log('   2. Start training on top template (most sites)');
console.log('   3. Track performance in template_performance table');
console.log('   4. Update success_rate as you train');

console.log('\n' + '='.repeat(70));
console.log('');
