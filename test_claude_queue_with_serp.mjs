#!/usr/bin/env node
/**
 * Test Claude Queue Builder with SERP API Integration
 * 
 * This script tests the enhanced claude-queue-builder that:
 * 1. Searches for apartment properties using SERP API
 * 2. Analyzes each property with Claude AI
 * 3. Persists results to the database
 * 
 * Usage:
 *   node test_claude_queue_with_serp.mjs
 *   node test_claude_queue_with_serp.mjs "luxury apartments" "New York, NY"
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testClaudeQueueBuilder(query, location, numResults = 5) {
    console.log('\n🚀 Testing Claude Queue Builder with SERP API\n');
    console.log('='.repeat(70));
    console.log(`Query: ${query}`);
    console.log(`Location: ${location}`);
    console.log(`Max Results: ${numResults}`);
    console.log('='.repeat(70));

    try {
        // Call the claude-queue-builder function
        const response = await fetch(
            `${SUPABASE_URL}/functions/v1/claude-queue-builder`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: query,
                    location: location,
                    num_results: numResults,
                    use_claude: true  // Enable Claude analysis
                })
            }
        );

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`HTTP ${response.status}: ${text}`);
        }

        const data = await response.json();

        console.log('\n✅ Success!\n');
        console.log('📊 Results Summary:');
        console.log(`   - Search: ${data.search?.numResults || 0} properties found`);
        console.log(`   - Analyzed: ${data.analyzed || 0} properties`);
        console.log(`   - Persisted: ${data.persisted?.length || 0} database operations`);

        console.log('\n🔍 Configuration Check:');
        console.log(`   - SERP API: ${data.debug?.serp_api_configured ? '✅ Configured' : '❌ Not configured'}`);
        console.log(`   - Claude AI: ${data.debug?.claude_configured ? '✅ Configured' : '❌ Not configured'}`);
        console.log(`   - Claude Used: ${data.debug?.claude_used ? '✅ Yes' : '❌ No'}`);

        if (data.persisted && data.persisted.length > 0) {
            console.log('\n📋 Processing Results:');
            let successCount = 0;
            let errorCount = 0;

            data.persisted.forEach((result, idx) => {
                if (result.status === 'enqueued_via_rpc' || result.status === 'persisted') {
                    successCount++;
                    console.log(`   ${idx + 1}. ✅ ${result.url}`);
                    console.log(`      Status: ${result.status}`);
                } else {
                    errorCount++;
                    console.log(`   ${idx + 1}. ❌ ${result.url}`);
                    console.log(`      Status: ${result.status}`);
                    if (result.message) console.log(`      Error: ${result.message}`);
                }
            });

            console.log(`\n   Summary: ${successCount} succeeded, ${errorCount} failed`);
        }

        console.log('\n' + '='.repeat(70));
        console.log('\n💡 Tips:');
        console.log('   - Make sure SERP_API_KEY is set in your .env file');
        console.log('   - Make sure ANTHROPIC_API_KEY is set for Claude analysis');
        console.log('   - Check the database for newly discovered properties');
        console.log('');

        return data;
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('\n💡 Troubleshooting:');
        console.error('   1. Make sure Supabase functions are running: supabase functions serve');
        console.error('   2. Check your .env file has SERP_API_KEY and ANTHROPIC_API_KEY');
        console.error('   3. Verify SUPABASE_SERVICE_ROLE_KEY is correct');
        console.error('');
        throw error;
    }
}

// Get command line arguments or use defaults
const args = process.argv.slice(2);
const query = args[0] || 'luxury apartments for rent';
const location = args[1] || 'Atlanta, GA';
const numResults = parseInt(args[2]) || 5;

// Run the test
testClaudeQueueBuilder(query, location, numResults)
    .then(() => {
        console.log('✅ Test completed successfully\n');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Test failed\n');
        process.exit(1);
    });
