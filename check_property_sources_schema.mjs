import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54380';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('\n📋 Checking property_sources Schema\n');

// Get a sample record to see the columns
const { data, error } = await supabase
    .from('property_sources')
    .select('*')
    .limit(1);

if (error) {
    console.error('Error:', error.message);
} else if (data && data.length > 0) {
    console.log('Columns in property_sources:');
    console.log(Object.keys(data[0]));
    console.log('\nSample record:');
    console.log(JSON.stringify(data[0], null, 2));
} else {
    console.log('No records found in property_sources');
}
