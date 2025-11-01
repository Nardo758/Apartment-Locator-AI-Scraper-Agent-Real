#!/usr/bin/env node
/**
 * Run AI Scraper - Simple Direct Call
 */

import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = 'https://jdymvpasjsdbryatscux.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('\n🤖 Running AI Scraper on Queue\n');
console.log('='.repeat(70));

console.log('\n⏳ Calling AI Scraper Worker...\n');

try {
    const response = await fetch(
        `${SUPABASE_URL}/functions/v1/ai-scraper-worker`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                batch_size: 5,  // Process 5 at a time
                timeout: 120000 // 2 minute timeout per property
            })
        }
    );
    
    const text = await response.text();
    console.log('Response status:', response.status);
    console.log('Response body:', text);
    
    if (!response.ok) {
        console.error('\n❌ Scraper returned error');
        console.log('\n💡 The scraper function might need to be deployed or updated');
        console.log('   Try: supabase functions deploy ai-scraper-worker\n');
        process.exit(1);
    }
    
    let result;
    try {
        result = JSON.parse(text);
    } catch (e) {
        console.log('\n✅ Scraper started (response not JSON)');
        process.exit(0);
    }
    
    console.log('\n✅ Scraper Response:\n');
    console.log(JSON.stringify(result, null, 2));
    
} catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
}
