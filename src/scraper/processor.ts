import type { SupabaseClient } from '@supabase/supabase-js';
import type { ScrapingJob } from './orchestrator';
import { syncToFrontendSchema, type FrontendProperty } from './orchestrator';
import { transformScrapedToFrontendFormat, type ScrapedPropertyData } from './data-transformer';
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
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
      const res = await fetch(workerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Required by Supabase Edge Functions for authenticated access
          'Authorization': serviceKey ? `Bearer ${serviceKey}` : '',
          'apikey': serviceKey || '',
        },
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

export async function processBatchWithCostOptimization(
  supabase: SupabaseClient, 
  batch: ScrapingJob[],
  options: { enableFrontendSync?: boolean; frontendTable?: string } = {}
) {
  const results: Array<Record<string, unknown>> = [];
  const frontendProperties: FrontendProperty[] = [];
  const { enableFrontendSync = false, frontendTable = 'properties' } = options;

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

      // If successful and frontend sync is enabled, prepare for transformation
      if (workerResult.success && enableFrontendSync && workerResult.data) {
        try {
          const scrapedData: ScrapedPropertyData = {
            external_id: job.external_id,
            property_id: String(job.property_id || job.external_id.split('_')[0] || ''),
            unit_number: String(job.unit_number || job.external_id.split('_')[1] || '1'),
            source: String(job.source || 'unknown'),
            name: String(workerResult.data.name || job.name || ''),
            address: String(workerResult.data.address || job.address || ''),
            city: String(workerResult.data.city || job.city || ''),
            state: String(workerResult.data.state || job.state || ''),
            current_price: Number(workerResult.data.current_price || job.current_price || 0),
            bedrooms: Number(workerResult.data.bedrooms || job.bedrooms || 0),
            bathrooms: Number(workerResult.data.bathrooms || job.bathrooms || 1),
            square_feet: workerResult.data.square_feet ? Number(workerResult.data.square_feet) : undefined,
            listing_url: String(job.listing_url || job.url || ''),
            status: String(job.status || 'active'),
            free_rent_concessions: workerResult.data.free_rent_concessions ? String(workerResult.data.free_rent_concessions) : undefined,
            application_fee: workerResult.data.application_fee ? Number(workerResult.data.application_fee) : undefined,
            admin_fee_waived: Boolean(workerResult.data.admin_fee_waived),
            admin_fee_amount: workerResult.data.admin_fee_amount ? Number(workerResult.data.admin_fee_amount) : undefined,
          };
          
          const frontendProperty = await transformScrapedToFrontendFormat(scrapedData);
          frontendProperties.push(frontendProperty);
        } catch (transformError) {
          console.error(`Error transforming property ${job.external_id} for frontend:`, transformError);
        }
      }

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

  // Sync to frontend schema if enabled and we have properties to sync
  if (enableFrontendSync && frontendProperties.length > 0) {
    try {
      const syncResult = await syncToFrontendSchema(supabase, frontendProperties, frontendTable);
      console.log(`Frontend sync completed: ${syncResult.success} success, ${syncResult.errors} errors`);
      
      // Add sync results to the overall results
      results.push({
        frontend_sync: {
          enabled: true,
          properties_synced: syncResult.success,
          sync_errors: syncResult.errors,
          details: syncResult.details
        }
      });
    } catch (syncError) {
      console.error('Error syncing to frontend schema:', syncError);
      results.push({
        frontend_sync: {
          enabled: true,
          error: syncError.message,
          properties_attempted: frontendProperties.length
        }
      });
    }
  }

  return results;
}

export default processBatchWithCostOptimization;
