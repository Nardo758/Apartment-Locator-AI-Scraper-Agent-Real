#!/usr/bin/env node
/**
 * Run AI Scraper on Queued Properties with Auto-Learning
 * 
 * This script:
 * 1. Processes properties in the scraping queue
 * 2. Captures successful scrapes
 * 3. Sends failed scrapes to learning queue (failed_scrapes table)
 * 4. Tracks progress and provides summary
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = 'https://jdymvpasjsdbryatscux.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('\n🤖 AI Scraper with Auto-Learning\n');
console.log('='.repeat(70));

async function getQueueStats() {
    const { data, error } = await supabase
        .from('scraping_queue')
        .select('status, source')
        .eq('status', 'queued');
    
    if (error) {
        console.error('Error fetching queue:', error);
        return { total: 0, bySource: {} };
    }
    
    const bySource = {};
    data.forEach(item => {
        bySource[item.source] = (bySource[item.source] || 0) + 1;
    });
    
    return { total: data.length, bySource };
}

async function processQueue() {
    console.log('\n📊 Queue Status:');
    const stats = await getQueueStats();
    console.log(`   Total queued: ${stats.total}`);
    
    if (stats.total === 0) {
        console.log('\n⚠️  No properties in queue!');
        console.log('   Run discovery first: node discover_atlanta_properties.mjs\n');
        return;
    }
    
    console.log('   By source:');
    Object.entries(stats.bySource).forEach(([source, count]) => {
        console.log(`      - ${source}: ${count}`);
    });
    
    console.log('\n🚀 Starting AI Scraper...\n');
    
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
                    batch_size: 10,
                    auto_learn: true,  // Enable auto-learning for failures
                    max_concurrent: 3
                })
            }
        );
        
        if (!response.ok) {
            const text = await response.text();
            console.error(`❌ Scraper error: ${response.status}`);
            console.error(text);
            return;
        }
        
        const result = await response.json();
        
        console.log('✅ Scraper completed!\n');
        
        console.log('📈 Results:');
        console.log(`   ✅ Successful: ${result.successful || 0}`);
        console.log(`   ❌ Failed: ${result.failed || 0}`);
        console.log(`   📚 Sent to learning: ${result.failed || 0}`);
        console.log(`   ⏱️  Duration: ${result.duration || 'N/A'}`);
        
        if (result.errors && result.errors.length > 0) {
            console.log('\n⚠️  Errors encountered:');
            result.errors.slice(0, 5).forEach((err, idx) => {
                console.log(`   ${idx + 1}. ${err.url || 'Unknown URL'}`);
                console.log(`      Error: ${err.error || err.message}`);
            });
        }
        
        // Check failed_scrapes table
        const { data: failedScrapes } = await supabase
            .from('failed_scrapes')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (failedScrapes && failedScrapes.length > 0) {
            console.log('\n📚 Learning Queue (Recent Failed Scrapes):');
            failedScrapes.forEach((fs, idx) => {
                const url = fs.payload?.listing_url || 'Unknown';
                console.log(`   ${idx + 1}. ${url}`);
                console.log(`      Attempts: ${fs.requeue_count}`);
            });
        }
        
        // Show what was scraped successfully
        const { data: recentScraped } = await supabase
            .from('scraped_properties')
            .select('name, city, state, current_price, bedrooms, bathrooms')
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (recentScraped && recentScraped.length > 0) {
            console.log('\n🏢 Recently Scraped Properties:');
            recentScraped.forEach((prop, idx) => {
                console.log(`   ${idx + 1}. ${prop.name}`);
                console.log(`      ${prop.city}, ${prop.state} | $${prop.current_price} | ${prop.bedrooms}bd/${prop.bathrooms}ba`);
            });
        }
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }
}

async function showLearningQueue() {
    console.log('\n📚 Current Learning Queue:\n');
    
    const { data, error } = await supabase
        .from('failed_scrapes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
    
    if (error) {
        console.error('Error:', error);
        return;
    }
    
    if (!data || data.length === 0) {
        console.log('   ✅ Learning queue is empty - all scrapes successful!\n');
        return;
    }
    
    console.log(`   Total failed scrapes: ${data.length}\n`);
    
    data.forEach((fs, idx) => {
        const url = fs.payload?.listing_url || 'Unknown';
        const source = fs.payload?.source || 'unknown';
        console.log(`   ${idx + 1}. ${url}`);
        console.log(`      Source: ${source}`);
        console.log(`      Attempts: ${fs.requeue_count}`);
        console.log(`      Error: ${fs.error?.message || 'No details'}`);
        console.log('');
    });
}

console.log('Starting scraper process...\n');

// Run the scraper
await processQueue();

console.log('\n' + '='.repeat(70));
console.log('\n💡 Next Steps:');
console.log('   1. Review learning queue: Check failed_scrapes table');
console.log('   2. View scraped data: Check scraped_properties table');
console.log('   3. Reprocess failures: node reprocess_learning_queue.mjs\n');
