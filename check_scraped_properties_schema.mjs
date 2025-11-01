import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.production.real' });

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

console.log('\nChecking scraped_properties table schema...\n');
console.log('='.repeat(70));

// Query the table structure
const { data, error } = await client
    .from('scraped_properties')
    .select('*')
    .limit(1);

if (error) {
    console.log('Error:', error);
} else {
    console.log('Sample row (to see column structure):');
    console.log(JSON.stringify(data[0] || {}, null, 2));
    
    if (data[0]) {
        console.log('\n\nAvailable columns:');
        Object.keys(data[0]).forEach((col, idx) => {
            console.log(`   ${idx + 1}. ${col} (${typeof data[0][col]})`);
        });
    }
}

// Also try to get schema directly
console.log('\n' + '='.repeat(70));
console.log('\nAttempting to get full table info...\n');

const { data: schemaData, error: schemaError } = await client.rpc('get_table_columns', {
    table_name: 'scraped_properties'
}).catch(() => null);

if (schemaData) {
    console.log('Table columns from RPC:');
    console.log(schemaData);
}

console.log('\n' + '='.repeat(70));
console.log('\nTo get full schema, run this SQL in Supabase dashboard:');
console.log('\nSELECT column_name, data_type, is_nullable, column_default');
console.log('FROM information_schema.columns');
console.log("WHERE table_name = 'scraped_properties'");
console.log('ORDER BY ordinal_position;\n');
