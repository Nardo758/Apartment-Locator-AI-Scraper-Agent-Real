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

console.log('\n🗑️  Deleting Properties with Bathroom Errors\n');
console.log('='.repeat(70));

// Get properties with >3 bathrooms (errors)
const { data: errors, error } = await prodClient
    .from('scraped_properties')
    .select('*')
    .gt('bathrooms', 3)
    .order('bathrooms', { ascending: false });

if (error) {
    console.error('Error fetching data:', error.message);
    process.exit(1);
}

console.log(`\nFound ${errors?.length || 0} properties with >3 bathrooms\n`);

if (errors && errors.length > 0) {
    console.log('Properties to delete:\n');
    
    errors.forEach((prop, idx) => {
        console.log(`${idx + 1}. ${prop.name}`);
        console.log(`   ID: ${prop.id}`);
        console.log(`   Bathrooms: ${prop.bathrooms} (ERROR)`);
        console.log(`   Bedrooms: ${prop.bedrooms}`);
        console.log(`   Price: $${prop.current_price}`);
        console.log(`   URL: ${prop.listing_url.substring(0, 60)}...`);
        console.log('');
    });
    
    // Delete them
    const ids = errors.map(p => p.id);
    
    console.log('='.repeat(70));
    console.log('\nDeleting records...\n');
    
    const { error: deleteError } = await prodClient
        .from('scraped_properties')
        .delete()
        .in('id', ids);
    
    if (deleteError) {
        console.error('Delete failed:', deleteError.message);
        process.exit(1);
    }
    
    console.log(`✅ Successfully deleted ${ids.length} erroneous records\n`);
    
    // Verify deletion
    const { count } = await prodClient
        .from('scraped_properties')
        .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Remaining properties in database: ${count}\n`);
    
} else {
    console.log('No properties with bathroom errors found.\n');
}

console.log('='.repeat(70));
console.log('');
