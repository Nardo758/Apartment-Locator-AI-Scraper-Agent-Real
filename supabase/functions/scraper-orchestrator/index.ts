// scraper-orchestrator/index.ts
import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { runProcessor } from './processor.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Dispatch to a scraper worker function. The worker is another Supabase Function we will add.
async function _dispatchToWorker(workerUrl: string, payload: Record<string, unknown>, maxRetries = 2) {
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

// (Delegates to the shared processor module via ./processor.ts)

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
      const results = await runProcessor();
      return new Response(JSON.stringify({ processed: Array.isArray(results) ? results.length : 0, results }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    return new Response('Method not allowed', { status: 405 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
});
