// supabase/functions/serp-url-scraper/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

interface SerpSearchParams {
  query: string;
  location: string;
  num_results?: number;
}

async function searchApartmentsWithSerp(params: SerpSearchParams) {
  const serpApiKey = Deno.env.get('SERP_API_KEY');
  if (!serpApiKey) throw new Error('SERP_API_KEY not set');

  const num = params.num_results || 10;
  const searchUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(params.query)}&location=${encodeURIComponent(params.location)}&num=${num}&api_key=${serpApiKey}`;
  const response = await fetch(searchUrl);
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`SerpAPI request failed: ${response.status} ${response.statusText} - ${text}`);
  }

  const data = await response.json();

  // Extract apartment listing URLs from Serp results
  return (data.organic_results || []).map((result: any) => ({
    url: result.link,
    title: result.title,
    snippet: result.snippet || result.description || '',
    source: 'serp'
  }));
}

serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const body = await req.json().catch(() => ({})) as Partial<SerpSearchParams>;
    if (!body.query || !body.location) {
      return new Response(JSON.stringify({ status: 'error', error: 'Missing query or location' }), { status: 400, headers: { 'content-type': 'application/json' } });
    }

    const results = await searchApartmentsWithSerp({ query: body.query, location: body.location, num_results: body.num_results });
    return new Response(JSON.stringify({ status: 'ok', results }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ status: 'error', error: msg }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
});
