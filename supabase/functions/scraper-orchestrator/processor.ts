// Thin wrapper for Deno runtime to call the shared processor logic.
import { createClient } from '@supabase/supabase-js';
import processBatch from '../../../src/scraper/processor';
// Minimal local type to avoid cross-folder type imports in Deno function
type ScrapingJob = {
  external_id: string;
  queue_id?: number;
  [k: string]: unknown;
};
import type { SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function runProcessor() {
  // Get a smart batch from DB via RPC as the original function did
  const { data: batch, error } = await supabase.rpc('get_next_scraping_batch', { batch_size: 50 });
  if (error) throw error;
  const raw = (batch || []) as Array<Record<string, unknown>>;
  const jobs = raw.filter((r): r is ScrapingJob => typeof r['external_id'] === 'string');
  return await processBatch(supabase as unknown as SupabaseClient, jobs as unknown as ScrapingJob[]);
}

export default runProcessor;
