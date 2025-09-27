#!/usr/bin/env node

// Test script for ai-scraper-worker with source tracking
import process from "node:process";

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jdymvpasjsdbryatscux.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

async function testAiScraperWorker() {
  const testUrl = 'https://www.apartments.com/123-main-st-springfield-il/abc123/';

  const payload = {
    source: 'apartments.com',
    url: testUrl,
    external_id: 'test-123',
    source_url: testUrl,
    source_name: 'apartments.com',
    scraping_job_id: 999
  };

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-scraper-worker`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAiScraperWorker();