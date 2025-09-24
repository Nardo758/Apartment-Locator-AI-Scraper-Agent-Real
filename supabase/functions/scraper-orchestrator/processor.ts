// Thin wrapper for Deno runtime to call the shared processor logic.
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient as _SupabaseClient } from '@supabase/supabase-js';

type ScrapingJob = {
  external_id: string;
  queue_id?: number;
  [k: string]: unknown;
};

type WorkerResult = {
  success: boolean;
  external_id?: string;
  ai_model_used?: string;
  price_changed?: boolean;
  duration?: number;
  error?: string;
};

async function dispatchToWorker(workerUrl: string, payload: Record<string, unknown>, maxRetries = 2) {
  let attempt = 0;
  let lastErr: unknown = null;
  while (attempt <= maxRetries) {
    try {
      const res = await fetch(workerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Worker responded ${res.status}`);
      const data = await res.json();
      return data as WorkerResult;
    } catch (err) {
      lastErr = err;
      attempt++;
      await new Promise((r) => setTimeout(r, 200 * attempt));
    }
  }
  throw lastErr;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function runProcessor() {
  const { data: batch, error } = await supabase.rpc('get_next_scraping_batch', { batch_size: 50 });
  if (error) throw error;
  const raw = (batch || []) as Array<Record<string, unknown>>;
  const jobs = raw.filter((r): r is ScrapingJob => typeof r['external_id'] === 'string');

  const results: Array<Record<string, unknown>> = [];
  for (const job of jobs) {
    try {
      const startTime = Date.now();
      const priority = job['priority_score'] ? Number(job['priority_score']) : 0;
      const chosenModelKey = job['ai_model'] ? String(job['ai_model']) : (priority >= 70 ? 'gpt-4-turbo-preview' : (priority >= 40 ? 'gpt-3.5-turbo-16k' : 'gpt-3.5-turbo'));

      const workerUrl = `${SUPABASE_URL}/functions/v1/scraper-worker`;
      const payload = { external_id: job.external_id, url: job['url'], source: job['source'], ai_model: chosenModelKey };

      const workerResult = (await dispatchToWorker(workerUrl, payload, 2)) as WorkerResult;
      const duration = workerResult.duration ?? (Date.now() - startTime);

      await supabase.rpc('update_scraping_metrics', {
        p_external_id: job.external_id,
        p_success: workerResult.success === true,
        p_duration: duration,
        p_price_changed: workerResult.price_changed === true,
      });

      // Instrument cost tracking if worker provided usage info
      try {
        type UsageShape = { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; estimated_cost?: number; model?: string };
        const usage = ((workerResult as unknown) as { usage?: UsageShape })?.usage ?? null;
        if (usage && typeof usage === 'object') {
          const prompt_tokens = Number(usage.prompt_tokens ?? 0);
          const completion_tokens = Number(usage.completion_tokens ?? 0);
          const total_tokens = Number(usage.total_tokens ?? (prompt_tokens + completion_tokens));
          const estimated_cost = Number(usage.estimated_cost ?? 0);
          const model = String(usage.model ?? (chosenModelKey ?? ''));

          const today = new Date().toISOString().slice(0, 10);
          await supabase.rpc('rpc_inc_scraping_costs', {
            p_date: today,
            p_properties_scraped: 1,
            p_ai_requests: 1,
            p_tokens_used: total_tokens,
            p_estimated_cost: estimated_cost,
            p_details: { model, prompt_tokens, completion_tokens },
          });
        }
      } catch (e) {
        console.error('Failed to record orchestrator scraping cost:', e);
      }

      const newStatus = workerResult.success ? 'completed' : 'failed';
      await supabase.from('scraping_queue').update({ status: newStatus, completed_at: new Date().toISOString() }).eq('external_id', job.external_id).eq('id', job['queue_id']);

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

export default runProcessor;
