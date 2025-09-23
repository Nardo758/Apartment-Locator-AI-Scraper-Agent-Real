// scraper-worker/index.ts
import { serve } from "std/http/server.ts";

serve(async (req) => {
  try {
    const body = await req.json();
    const external_id = body.external_id || null;
  const _url = body.url || '';
  const ai_model = body.ai_model || 'gpt-3.5-turbo';

    // Simulate variable scrape time and a price change probability
    const duration = Math.floor(Math.random() * 1500) + 200;
    await new Promise((r) => setTimeout(r, duration));
    const price_changed = Math.random() < 0.15;

    return new Response(JSON.stringify({ success: true, external_id, ai_model_used: ai_model, price_changed, duration }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: String(err) }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
});
