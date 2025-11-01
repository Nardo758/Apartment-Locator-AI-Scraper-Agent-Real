#!/usr/bin/env node
/**
 * Discover Atlanta Properties with Detailed Error Reporting
 */

import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = 'https://jdymvpasjsdbryatscux.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('\n🏙️  Discovering Properties in Atlanta (Detailed)\n');
console.log('='.repeat(70));

try {
    const response = await fetch(
        `${SUPABASE_URL}/functions/v1/claude-queue-builder`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: 'apartments for rent',
                location: 'Atlanta, GA',
                num_results: 20,
                use_claude: true
            })
        }
    );

    const data = await response.json();
    
    console.log('Full Response:');
    console.log(JSON.stringify(data, null, 2));
    
} catch (error) {
    console.error('Error:', error.message);
}
