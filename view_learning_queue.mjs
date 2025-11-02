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

console.log('\n📚 Learning Queue Analysis\n');
console.log('='.repeat(70));

const { data: queue } = await prodClient
    .from('scraper_learning_queue')
    .select('*')
    .eq('status', 'pending')
    .order('domain');

console.log(`\nTotal sites needing training: ${queue?.length || 0}\n`);

// Group by domain
const byDomain = {};
queue?.forEach(item => {
    if (!byDomain[item.domain]) {
        byDomain[item.domain] = [];
    }
    byDomain[item.domain].push(item);
});

console.log('📊 Sites by Domain (Priority for Template Creation):\n');

const sorted = Object.entries(byDomain).sort((a, b) => b[1].length - a[1].length);

sorted.forEach(([domain, sites], idx) => {
    const priority = sites.length >= 3 ? '🔥 HIGH' : sites.length >= 2 ? '⚡ MED' : '  LOW';
    console.log(`${(idx + 1).toString().padStart(3)}. [${priority}] ${domain} (${sites.length} sites)`);
});

console.log('\n' + '='.repeat(70));
console.log('\n🎯 Recommended Training Priorities:\n');

const highPriority = sorted.filter(([, sites]) => sites.length >= 3);
const medPriority = sorted.filter(([, sites]) => sites.length === 2);

console.log(`🔥 HIGH Priority (3+ sites): ${highPriority.length} domains`);
highPriority.slice(0, 5).forEach(([domain, sites]) => {
    console.log(`   • ${domain} - ${sites.length} sites`);
});

console.log(`\n⚡ MEDIUM Priority (2 sites): ${medPriority.length} domains`);
medPriority.slice(0, 3).forEach(([domain, sites]) => {
    console.log(`   • ${domain} - ${sites.length} sites`);
});

console.log('\n💡 Training Strategy:\n');
console.log('   1. Start with HIGH priority domains (biggest impact)');
console.log('   2. Create site-specific templates for these domains');
console.log('   3. Test on 1-2 samples, then deploy to all sites in that domain');
console.log('   4. Mark as "trained" when successful');

console.log('\n📋 Export Learning Queue:\n');
console.log('   SQL: SELECT * FROM scraper_learning_queue WHERE status=\'pending\';');
console.log('   Or check file: learning_queue_export.json');

console.log('\n' + '='.repeat(70));
console.log('');
