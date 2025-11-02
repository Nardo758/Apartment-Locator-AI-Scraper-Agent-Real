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

console.log('\n📚 Setting Up Learning Queue\n');
console.log('='.repeat(70));

// Create table using raw SQL query
const createTableQuery = `
-- Drop existing table if needed
DROP TABLE IF EXISTS scraper_learning_queue CASCADE;

-- Create learning queue table
CREATE TABLE scraper_learning_queue (
    id BIGSERIAL PRIMARY KEY,
    url TEXT NOT NULL UNIQUE,
    property_name TEXT,
    domain TEXT,
    failure_reason TEXT,
    extraction_method TEXT DEFAULT 'universal',
    attempts INT DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_learning_queue_status ON scraper_learning_queue(status);
CREATE INDEX idx_learning_queue_domain ON scraper_learning_queue(domain);
CREATE INDEX idx_learning_queue_created ON scraper_learning_queue(created_at DESC);

-- Grant permissions
GRANT ALL ON scraper_learning_queue TO service_role;
GRANT ALL ON scraper_learning_queue TO anon;
GRANT ALL ON scraper_learning_queue TO authenticated;
`;

console.log('Creating learning queue table...\n');

try {
    // Execute via raw SQL
    const { error } = await prodClient.rpc('exec', { query: createTableQuery });
    
    if (error) {
        console.log('Note: Using alternative method...\n');
        
        // Alternative: Use from().insert() to trigger table creation
        const testData = {
            url: 'https://test.com',
            property_name: 'Test',
            domain: 'test.com',
            failure_reason: 'test',
            status: 'pending'
        };
        
        // This might fail but will help us understand the issue
        const { data, error: insertError } = await prodClient
            .from('scraper_learning_queue')
            .insert([testData])
            .select();
        
        if (insertError) {
            console.error('❌ Error:', insertError.message);
            console.log('\n⚠️  Manual Setup Required:\n');
            console.log('Please run this SQL in Supabase SQL Editor:');
            console.log('\n' + createTableQuery);
            console.log('\nThen run: node populate_learning_queue.mjs\n');
        } else {
            console.log('✅ Table created successfully');
            // Remove test data
            await prodClient.from('scraper_learning_queue').delete().eq('url', 'https://test.com');
        }
    } else {
        console.log('✅ Learning queue table created\n');
    }
} catch (e) {
    console.error('❌ Error:', e.message);
    console.log('\n📋 Please create the table manually in Supabase:\n');
    console.log('1. Go to: https://supabase.com/dashboard/project/jdymvpasjsdbryatscux/editor');
    console.log('2. Click "SQL Editor"');
    console.log('3. Run the SQL from: create_learning_queue.sql');
    console.log('4. Then run: node populate_learning_queue.mjs\n');
}

console.log('='.repeat(70));
console.log('');
