import { createClient } from '@supabase/supabase-js';
import { getCostOptimizedBatch } from '../src/scraper/orchestrator';

async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) in the environment');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const batch = await getCostOptimizedBatch(supabase as any, 270);
  console.log('Selected batch size:', batch.length);

  // Compute estimated cost using local estimator
  const { estimateScrapingCost } = await import('../src/scraper/costs');
  const est = estimateScrapingCost(batch as any);
  console.log('Estimated weekly cost for selected batch: $', est.toFixed(2));

  // Show counts per derived tier
  const counts: Record<string, number> = {};
  for (const j of batch) {
    const ps = Number(j.priority_score ?? 0);
    const tier = ps >= 70 ? '1' : (ps >= 40 ? '2' : (ps >= 20 ? '3' : '4'));
    counts[tier] = (counts[tier] ?? 0) + 1;
  }

  console.log('Counts by tier:', counts);
}

main().catch((e) => { console.error(e); process.exit(1); });
