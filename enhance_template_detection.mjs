import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = join(__dirname, '.env.production.real');
dotenv.config({ path: envPath, override: true });

const PROD_URL = process.env.SUPABASE_URL;
const PROD_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

const prodClient = createClient(PROD_URL, PROD_KEY);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });

console.log('\n🤖 Enhancing Claude Template Detection\n');
console.log('='.repeat(70));

// Get current classifications
const { data: templates } = await prodClient
    .from('website_structure_templates')
    .select('*');

const { data: classified } = await prodClient
    .from('site_classifications')
    .select('*, website_structure_templates(template_name)')
    .limit(100);

const { data: unclassified } = await prodClient
    .from('scraper_learning_queue')
    .select('*')
    .eq('status', 'pending')
    .limit(50);

console.log('📊 Current State:\n');
console.log(`   Templates defined:    ${templates?.length || 0}`);
console.log(`   Sites classified:     ${classified?.length || 0}`);
console.log(`   Sites unclassified:   ${unclassified?.length || 0}`);

// Build classification examples for Claude
const examplesByTemplate = {};
classified?.forEach(site => {
    const templateName = site.website_structure_templates?.template_name;
    if (!templateName) return;
    
    if (!examplesByTemplate[templateName]) {
        examplesByTemplate[templateName] = [];
    }
    
    examplesByTemplate[templateName].push({
        domain: site.domain,
        url: site.url
    });
});

console.log('\n🧠 Preparing Claude with classification knowledge...\n');

// Create prompt with examples
const prompt = `You are a website structure classification expert. You analyze property/apartment websites and classify them into structure templates.

## Known Structure Templates:

${templates?.map(t => `
### ${t.template_name.toUpperCase()}
Description: ${t.description}
Layout Pattern: ${t.layout_pattern}
Extraction Strategy: ${t.extraction_strategy}
Sample Sites: ${t.sample_sites?.slice(0, 5).join(', ') || 'none'}
`).join('\n')}

## Classification Examples:

${Object.entries(examplesByTemplate).map(([template, sites]) => `
**${template}:**
${sites.slice(0, 5).map(s => `- ${s.domain}`).join('\n')}
`).join('\n')}

## Unclassified Sites to Analyze:

${unclassified?.slice(0, 20).map((s, idx) => `${idx + 1}. ${s.domain} - ${s.url}`).join('\n')}

---

**Task:** Analyze the unclassified sites above and:

1. **Classify each site** into one of the existing templates, OR
2. **Identify new patterns** that suggest a new template is needed
3. **Provide confidence score** (0-100) for each classification
4. **Suggest 2-3 new templates** if you see clear patterns not covered by existing templates

For each site, provide:
- Domain
- Recommended Template (or "NEW TEMPLATE NEEDED")
- Confidence Score
- Reasoning

Then suggest new templates with:
- Template Name
- Description
- Which sites would fit
- Common characteristics

Format as JSON.`;

console.log('💭 Asking Claude to analyze unclassified sites...\n');

try {
    const message = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        messages: [{
            role: 'user',
            content: prompt
        }]
    });
    
    const response = message.content[0].text;
    
    console.log('🎯 Claude\'s Analysis:\n');
    console.log('='.repeat(70));
    console.log(response);
    console.log('='.repeat(70));
    
    // Save analysis
    writeFileSync('claude_template_analysis.txt', response);
    console.log('\n✅ Analysis saved to: claude_template_analysis.txt\n');
    
    // Try to extract JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        try {
            const analysis = JSON.parse(jsonMatch[0]);
            writeFileSync('claude_template_analysis.json', JSON.stringify(analysis, null, 2));
            console.log('✅ JSON analysis saved to: claude_template_analysis.json\n');
        } catch (e) {
            console.log('ℹ️  Could not parse JSON, check text file for results\n');
        }
    }
    
} catch (error) {
    console.error('❌ Error calling Claude:', error.message);
}

console.log('💡 Next Steps:\n');
console.log('   1. Review claude_template_analysis.txt');
console.log('   2. Identify new template patterns suggested by Claude');
console.log('   3. Create new templates for common patterns');
console.log('   4. Re-run classification with updated templates');
console.log('   5. This should increase classification coverage beyond 67%\n');

console.log('🎯 Goal: Increase from 67% classified → 90%+ classified\n');

console.log('='.repeat(70));
console.log('');
