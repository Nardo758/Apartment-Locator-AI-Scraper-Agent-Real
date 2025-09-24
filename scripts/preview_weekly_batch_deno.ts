import process from 'node:process';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getCostOptimizedBatch, type ScrapingJob } from '../src/scraper/orchestrator.ts';

async function main() {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || process.env.SUPABASE_URL;
  const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) in the environment');
    Deno.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY) as unknown as SupabaseClient;
  const batch = await getCostOptimizedBatch(supabase, 270) as ScrapingJob[];
  console.log('Selected batch size:', batch.length);

  const { estimateScrapingCost } = await import('../src/scraper/costs.ts');
  const est = estimateScrapingCost(batch);
  console.log('Estimated weekly cost for selected batch: $', est.toFixed(2));

  const counts: Record<string, number> = {};
  for (const j of batch) {
    const ps = Number(j.priority_score ?? 0);
    const tier = ps >= 70 ? '1' : (ps >= 40 ? '2' : (ps >= 20 ? '3' : '4'));
    counts[tier] = (counts[tier] ?? 0) + 1;
  }

  console.log('Counts by tier:', counts);
}

if (import.meta.main) {
  main().catch((e) => { console.error(e); Deno.exit(1); });
}
