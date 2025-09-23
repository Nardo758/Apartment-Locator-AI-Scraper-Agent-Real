// scraper-orchestrator/index.ts
import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Dispatch to a scraper worker function. The worker is another Supabase Function we will add.
async function dispatchToWorker(workerUrl: string, payload: Record<string, unknown>, maxRetries = 2) {
  let attempt = 0;
  let lastErr: unknown = null;
  while (attempt <= maxRetries) {
    try {
      const res = await fetch(workerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Worker responded ${res.status}`);
      const data = await res.json();
      return data;
    } catch (err) {
      lastErr = err;
      attempt++;
      // simple linear backoff
      await new Promise((r) => setTimeout(r, 200 * attempt));
    }
  }
  throw lastErr;
}

// Worker result type
type WorkerResult = {
  success: boolean;
  external_id?: string;
  ai_model_used?: string;
  price_changed?: boolean;
  duration?: number;
  error?: string;
};

async function getSmartScrapingBatch(batchSize: number = 50) {
  const { data: batch, error } = await supabase.rpc('get_next_scraping_batch', {
    batch_size: batchSize,
  });

  if (error) throw error;
  return batch || [];
}

type Job = Record<string, unknown> & { external_id?: string; url?: string; source?: string; ai_model?: string };

async function processBatchWithCostOptimization(batch: Job[]) {
  const results: Array<Record<string, unknown>> = [];

  for (const job of batch) {
    try {
      const startTime = Date.now();

  // Allow DB suggestion (job.ai_model) but prefer cost-aware selection based on priority_score
    const priority = job['priority_score'] ? Number(job['priority_score']) : 0;
    const chosenModelKey = job.ai_model ? String(job.ai_model) : (priority >= 70 ? 'gpt-4-turbo-preview' : (priority >= 40 ? 'gpt-3.5-turbo-16k' : 'gpt-3.5-turbo'));

    // Worker function URL (deployed in the same project)
    const workerUrl = `${SUPABASE_URL.replace('https://', 'https://')}/functions/v1/scraper-worker`;
    const payload = {
      external_id: job.external_id,
      url: job.url,
      source: job.source,
      ai_model: chosenModelKey,
    };

  const workerResult = (await dispatchToWorker(workerUrl, payload, 2)) as WorkerResult;
  const duration = workerResult.duration ?? (Date.now() - startTime);

    // Update metrics and finalize queue row as completed
    await supabase.rpc('update_scraping_metrics', {
      p_external_id: job.external_id,
      p_success: workerResult.success === true,
      p_duration: duration,
      p_price_changed: workerResult.price_changed === true,
    });

    // Mark queue row completed or failed
    const newStatus = workerResult.success ? 'completed' : 'failed';
    await supabase.from('scraping_queue').update({ status: newStatus, completed_at: new Date().toISOString() }).eq('external_id', job.external_id).eq('id', job.queue_id);

    results.push({ success: workerResult.success === true, job, result: workerResult });
    } catch (err) {
      await supabase.rpc('update_scraping_metrics', {
        p_external_id: job.external_id,
        p_success: false,
        p_duration: 0,
        p_price_changed: false,
      });

  const msg = (err && typeof err === 'object' && 'message' in (err as Record<string, unknown>)) ? String((err as Record<string, unknown>)['message']) : String(err);
      results.push({ success: false, job, error: msg });
    }
  }

  return results;
}

serve(async (req) => {
  try {
    // Allow POST to trigger a run, GET for a health check
    if (req.method === 'GET') {
      return new Response(JSON.stringify({ status: 'ok', message: 'orchestrator running' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (req.method === 'POST') {
      const batch = await getSmartScrapingBatch(50);
      const results = await processBatchWithCostOptimization(batch);
      return new Response(JSON.stringify({ processed: results.length, results }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    return new Response('Method not allowed', { status: 405 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
});
