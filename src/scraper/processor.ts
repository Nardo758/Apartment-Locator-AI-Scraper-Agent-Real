import type { SupabaseClient } from '@supabase/supabase-js';
import type { ScrapingJob } from './orchestrator';
import process from 'node:process';


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

export async function processBatchWithCostOptimization(supabase: SupabaseClient, batch: ScrapingJob[]) {
  const results: Array<Record<string, unknown>> = [];

  for (const job of batch) {
    try {
      const startTime = Date.now();

      const priority = job.priority_score ? Number(job.priority_score) : 0;
      const chosenModelKey = job.ai_model ? String(job.ai_model) : (priority >= 70 ? 'gpt-4-turbo-preview' : (priority >= 40 ? 'gpt-3.5-turbo-16k' : 'gpt-3.5-turbo'));

      const workerUrl = `${process.env.SUPABASE_URL}/functions/v1/scraper-worker`;
      const payload = {
        external_id: job.external_id,
        url: job.url,
        source: job.source,
        ai_model: chosenModelKey,
      };

      const workerResult = (await dispatchToWorker(workerUrl, payload, 2)) as WorkerResult;
      const duration = workerResult.duration ?? (Date.now() - startTime);

      await supabase.rpc('update_scraping_metrics', {
        p_external_id: job.external_id,
        p_success: workerResult.success === true,
        p_duration: duration,
        p_price_changed: workerResult.price_changed === true,
      });

      // If worker returned usage metadata, record it
      try {
  type UsageShape = { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; estimated_cost?: number; model?: string };
        const usage = ((workerResult as unknown) as { usage?: UsageShape })?.usage ?? null;
        if (usage && typeof usage === 'object') {
          const prompt = Number(usage.prompt_tokens ?? 0);
          const completion = Number(usage.completion_tokens ?? 0);
          const model = String(usage.model ?? (chosenModelKey ?? 'gpt-3.5-turbo'));
          const estimateModule = await import('./costs');
          const estimateCostFromTokens = estimateModule.estimateCostFromTokens as (modelKey: string, promptTokens: number, completionTokens: number) => number;
          const estimated = Number(usage.estimated_cost ?? estimateCostFromTokens(model, prompt, completion));
          const today = new Date().toISOString().slice(0, 10);
          await supabase.rpc('rpc_inc_scraping_costs', {
            p_date: today,
            p_properties_scraped: 1,
            p_ai_requests: 1,
            p_tokens_used: prompt + completion,
            p_estimated_cost: estimated,
            p_details: { model, prompt_tokens: prompt, completion_tokens: completion },
          });
        }
      } catch (e) {
        console.error('Failed to record scraping cost in processor:', e);
      }

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

export default processBatchWithCostOptimization;
