import type { SupabaseClient } from '@supabase/supabase-js';

export function estimateCostFromTokens(modelKey: string, promptTokens: number, completionTokens: number) {
  const MODEL_PRICING: Record<string, { prompt: number; completion: number }> = {
    'gpt-3.5-turbo': { prompt: 0.0015, completion: 0.002 },
    'gpt-3.5-turbo-16k': { prompt: 0.0015, completion: 0.002 },
    'gpt-4-turbo-preview': { prompt: 0.03, completion: 0.06 },
  };
  const pricing = MODEL_PRICING[modelKey] ?? { prompt: 0.0015, completion: 0.002 };
  const estimated = ((promptTokens * pricing.prompt) + (completionTokens * pricing.completion)) / 1000;
  return Number(estimated.toFixed(6));
}

export async function recordDailyScrapingCost(supabase: SupabaseClient, params: { promptTokens?: number; completionTokens?: number; estimatedCost?: number; model?: string }) {
  try {
    const promptTokens = Number(params.promptTokens ?? 0);
    const completionTokens = Number(params.completionTokens ?? 0);
    const totalTokens = promptTokens + completionTokens;
    const estimated_cost = Number(params.estimatedCost ?? estimateCostFromTokens(params.model ?? 'gpt-3.5-turbo', promptTokens, completionTokens));
    const today = new Date().toISOString().slice(0, 10);

    await supabase.from('scraping_costs').upsert([
      {
        date: today,
        properties_scraped: 1,
        ai_requests: 1,
        tokens_used: totalTokens,
        estimated_cost,
        details: { model: params.model ?? null, prompt_tokens: promptTokens, completion_tokens: completionTokens },
        created_at: new Date().toISOString(),
      },
    ], { onConflict: 'date' });
  } catch (e) {
    // non-fatal
    console.error('recordDailyScrapingCost failed', e);
  }
}

// Batch cost estimator for pre-run estimation
export function getModelCost(model: string): number {
  const costs: Record<string, number> = {
    'gpt-3.5-turbo': 0.0005,
    'gpt-3.5-turbo-16k': 0.0015,
    'gpt-4-turbo-preview': 0.01,
    'gpt-4': 0.03,
  };
  return costs[model] ?? 0.01;
}

export function estimateScrapingCost(batch: Array<Record<string, unknown>>): number {
  return batch.reduce((cost, job) => {
    const model = String((job as Record<string, unknown>)['ai_model'] ?? 'gpt-3.5-turbo');
    const modelCost = getModelCost(model);
    const processing = String((job as Record<string, unknown>)['processing_level'] ?? 'full');
    const estimatedTokens = processing === 'minimal' ? 1000 : 3000;
    return cost + (modelCost * estimatedTokens / 1000);
  }, 0);
}
