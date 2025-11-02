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

console.log('\n🧹 Cleaning Universal Extracted Data\n');
console.log('='.repeat(70));

// Get all properties
const { data: allProps, error } = await prodClient
    .from('scraped_properties')
    .select('*')
    .order('created_at', { ascending: false });

if (error) {
    console.error('Error:', error.message);
    process.exit(1);
}

console.log(`\nTotal properties: ${allProps?.length || 0}\n`);

// Find Universal Extracted records
const universalExtracted = allProps?.filter(p => 
    p.name === 'Universal Extracted' || 
    p.unit_number === 'Universal Extracted' ||
    (p.property_id && p.property_id.startsWith('ind_'))
) || [];

const goodData = allProps?.filter(p => 
    p.name !== 'Universal Extracted' && 
    p.unit_number !== 'Universal Extracted' &&
    (!p.property_id || !p.property_id.startsWith('ind_'))
) || [];

console.log('📊 Analysis:\n');
console.log(`   Universal Extracted:  ${universalExtracted.length}`);
console.log(`   Good Data:            ${goodData.length}`);

if (universalExtracted.length > 0) {
    console.log('\n🔍 Universal Extracted properties:\n');
    
    // Group by source domain
    const byDomain = {};
    universalExtracted.forEach(prop => {
        try {
            const url = new URL(prop.listing_url);
            const domain = url.hostname.replace('www.', '');
            if (!byDomain[domain]) byDomain[domain] = [];
            byDomain[domain].push(prop);
        } catch (e) {
            if (!byDomain['invalid']) byDomain['invalid'] = [];
            byDomain['invalid'].push(prop);
        }
    });
    
    Object.keys(byDomain).sort().forEach(domain => {
        const props = byDomain[domain];
        const hasBathErrors = props.some(p => p.bathrooms > 3);
        const errorIndicator = hasBathErrors ? ' ⚠️ ' : '';
        console.log(`   ${domain}: ${props.length} records${errorIndicator}`);
    });
    
    // Show properties with invalid bathrooms
    const withBathErrors = universalExtracted.filter(p => p.bathrooms > 3);
    if (withBathErrors.length > 0) {
        console.log(`\n⚠️  Properties with >3 bathrooms: ${withBathErrors.length}\n`);
        withBathErrors.slice(0, 5).forEach(p => {
            console.log(`   ${p.bathrooms} bathrooms - ${p.listing_url.substring(0, 60)}...`);
        });
        if (withBathErrors.length > 5) {
            console.log(`   ... and ${withBathErrors.length - 5} more`);
        }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('\nDeleting Universal Extracted records...\n');
    
    const ids = universalExtracted.map(p => p.id);
    let deleted = 0;
    
    // Delete in batches of 50
    for (let i = 0; i < ids.length; i += 50) {
        const batch = ids.slice(i, i + 50);
        const { error: deleteError } = await prodClient
            .from('scraped_properties')
            .delete()
            .in('id', batch);
        
        if (deleteError) {
            console.error(`   Error deleting batch: ${deleteError.message}`);
        } else {
            deleted += batch.length;
            console.log(`   Deleted ${deleted}/${ids.length}...`);
        }
    }
    
    console.log(`\n✅ Successfully deleted ${deleted} Universal Extracted records\n`);
    
    // Verify
    const { count } = await prodClient
        .from('scraped_properties')
        .select('*', { count: 'exact', head: true });
    
    console.log('='.repeat(70));
    console.log('\n📊 Final Database:\n');
    console.log(`   Before:  ${allProps.length} properties`);
    console.log(`   Deleted: ${deleted} Universal Extracted`);
    console.log(`   After:   ${count} properties`);
    console.log(`\n   ✅ Database now contains only properly extracted data\n`);
    
} else {
    console.log('\n✅ No Universal Extracted records found.\n');
}

console.log('='.repeat(70));
console.log('');
