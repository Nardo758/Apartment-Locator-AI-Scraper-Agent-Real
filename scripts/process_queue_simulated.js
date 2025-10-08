#!/usr/bin/env node
// scripts/process_queue_simulated.js
// Simulate processing queued scraping jobs without calling worker functions.
// For each queued row in scraping_queue: perform a GET to the URL (timeout 10s) and mark as completed/failed accordingly.

import process from "node:process";
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

(async () => {
  const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!KEY) { console.error('SUPABASE_SERVICE_ROLE_KEY not set'); process.exit(1); }
  const supabase = createClient(SUPABASE_URL, KEY);

  try {
    const { data: rows, error } = await supabase.from('scraping_queue').select('id,external_id,url,status').eq('status','queued').limit(50);
    if (error) { console.error('Failed to fetch queued rows:', error); process.exit(1); }
    console.log(`Found ${rows.length} queued rows.`);

    for (const row of rows) {
      console.log(`Processing ${row.external_id} -> ${row.url}`);
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(row.url, { method: 'GET', signal: controller.signal });
        clearTimeout(timeout);
        const ok = res.ok;
        const statusCode = res.status;
        console.log(` -> HTTP ${statusCode}`);
        const newStatus = ok ? 'completed' : 'failed';
        await supabase.from('scraping_queue').update({ status: newStatus, completed_at: new Date().toISOString() }).eq('id', row.id);
      } catch (e) {
        console.warn(` -> Fetch error for ${row.external_id}:`, e.message || e);
        await supabase.from('scraping_queue').update({ status: 'failed', completed_at: new Date().toISOString() }).eq('id', row.id);
      }
    }

    console.log('Processing complete.');
  } catch (e) {
    console.error('Error processing queue:', e);
  }
})();
