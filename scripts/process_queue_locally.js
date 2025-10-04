// scripts/process_queue_locally.js
// Process pending jobs by calling the scraper-worker edge function and updating metrics/queue

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env
const dotenvPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(dotenvPath)) {
  require('dotenv').config({ path: dotenvPath });
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function dispatchToWorker(workerUrl, payload, maxRetries = 2) {
  let attempt = 0;
  let lastErr = null;
  while (attempt <= maxRetries) {
    try {
      const res = await fetch(workerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'apikey': SUPABASE_KEY,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Worker responded ${res.status}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
      attempt++;
      await new Promise(r => setTimeout(r, 200 * attempt));
    }
  }
  throw lastErr;
}

(async () => {
  try {
    // Fetch pending jobs
    const { data: jobs, error } = await supabase
      .from('scraping_queue')
      .select('id, external_id, url, source, priority_score')
      .eq('status', 'pending')
      .order('priority_score', { ascending: false })
      .limit(20);
    if (error) throw error;

    if (!jobs || jobs.length === 0) {
      console.log('No pending jobs');
      process.exit(0);
    }

    console.log(`Processing ${jobs.length} jobs locally via scraper-worker...`);

    const workerUrl = `${SUPABASE_URL}/functions/v1/scraper-worker`;
    let success = 0, failed = 0;

    for (const job of jobs) {
      try {
        const payload = {
          external_id: job.external_id,
          url: job.url,
          source: job.source,
          ai_model: job.priority_score >= 70 ? 'gpt-4-turbo-preview' : 'gpt-3.5-turbo',
        };

        const start = Date.now();
        const result = await dispatchToWorker(workerUrl, payload, 2);
        const duration = result.duration ?? (Date.now() - start);

        await supabase.rpc('update_scraping_metrics', {
          p_external_id: job.external_id,
          p_success: result.success === true,
          p_duration: duration,
          p_price_changed: result.price_changed === true,
        });

        const newStatus = result.success ? 'completed' : 'failed';
        await supabase
          .from('scraping_queue')
          .update({ status: newStatus, completed_at: new Date().toISOString() })
          .eq('external_id', job.external_id)
          .eq('id', job.id);

        if (result.success) success++; else failed++;
        console.log(`${newStatus.toUpperCase()}: ${job.external_id} (${duration}ms)`);
      } catch (e) {
        failed++;
        try {
          await supabase.rpc('update_scraping_metrics', {
            p_external_id: job.external_id,
            p_success: false,
            p_duration: 0,
            p_price_changed: false,
          });
          await supabase
            .from('scraping_queue')
            .update({ status: 'failed', completed_at: new Date().toISOString(), error: String(e) })
            .eq('external_id', job.external_id)
            .eq('id', job.id);
        } catch {}
        console.error(`FAILED: ${job.external_id} -> ${e}`);
      }
    }

    console.log(`Done. Success: ${success}, Failed: ${failed}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
