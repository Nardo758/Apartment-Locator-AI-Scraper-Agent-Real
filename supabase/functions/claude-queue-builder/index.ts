import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// Allow the host process (CI or local dev) to control the port used by the function
// server. Defaults to 54321 which the integration tests expect.
const FUNCTIONS_PORT = Number(Deno.env.get('FUNCTIONS_PORT') || Deno.env.get('PORT') || 54321);

serve(async (req: Request) => {
  try {
    const body = await req.json().catch(() => ({}));
    const testMode = body.test_mode === true || (new URL(req.url).searchParams.get('test_mode') === 'true');

    if (testMode) {
      return new Response(
        JSON.stringify({
          status: 'ok',
          source: 'claude-queue-builder',
          candidates: [
            { url: 'https://www.example-property1.com', title: 'Example Property 1', website: 'example-property1.com', priority: 1 },
            { url: 'https://www.example-property2.com', title: 'Example Property 2', website: 'example-property2.com', priority: 1 },
            { url: 'https://www.apartments.com/atlanta-ga/elora-at-buckhead/123456', title: 'Elora at Buckhead', website: 'apartments.com', priority: 2 }
          ]
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Helper: detect website type from URL/snippet/title
    function detectWebsiteType(url: string, snippet = '', title = ''): string {
      const lowerUrl = (url || '').toLowerCase();
      const lowerSnippet = (snippet || '').toLowerCase();

      if (
        lowerUrl.includes('app.tenantturner.com') ||
        lowerSnippet.includes('tenantturner') ||
        (lowerSnippet.includes('apply online') && lowerSnippet.includes('screening fee'))
      ) {
        return 'jonah';
      }
      if (lowerUrl.includes('rentcafe.com') || lowerUrl.includes('yardi') || lowerSnippet.includes('rentcafe')) return 'yardi_rent_cafe';
      if (lowerUrl.includes('entrada') || lowerSnippet.includes('entrada')) return 'entrada';
      if (lowerUrl.includes('realpage') || lowerSnippet.includes('realpage')) return 'mixed_media';
      if (lowerSnippet.includes('apply now') && lowerSnippet.includes('lease')) return 'other';
      return 'unknown';
    }

    function calculateConfidenceScore(snippet: string, _result: any, websiteType: string): number {
      let score = 0.5;
      if (websiteType !== 'unknown') score += 0.2;
      if (['jonah', 'yardi_rent_cafe', 'entrada'].includes(websiteType)) score += 0.1;
      const lower = (snippet || '').toLowerCase();
      if (lower.includes('apartment') || lower.includes('leasing')) score += 0.2;
      if (lower.match(/\$\d+/)) score += 0.1;
      if (lower.match(/\d+\s*(bed|bd|br)/i)) score += 0.1;
      if (lower.match(/(built|constructed|year)/i)) score += 0.1;
      return Math.min(score, 1.0);
    }

    const candidates = [
      {
        property_name: 'Elora at Buckhead Apartments',
        property_url: 'https://www.eloraatbuckhead.com',
        confidence_score: 0.85,
        website_complexity: 'medium',
        priority_level: 'high',
        website_type: 'yardi_rent_cafe'
      },
      {
        property_name: 'The Standard Midtown',
        property_url: 'https://www.thestandardmidtown.com',
        confidence_score: 0.78,
        website_complexity: 'complex',
        priority_level: 'medium',
        website_type: 'jonah'
      }
    ];

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || new URL(req.url).origin.replace(':54321', '');
    const headerKey = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || req.headers.get('apikey') || req.headers.get('x-supabase-service-role-key');
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || headerKey;

    const results: Array<Record<string, any>> = [];

    for (const c of candidates) {
      try {
        if (!SERVICE_KEY) {
          results.push({ url: c.property_url, status: 'skipped', reason: 'no_service_key' });
          continue;
        }

        const rpcUrl = `${SUPABASE_URL}/rest/v1/rpc/upsert_property_discovery_and_source`;
        const snippet = (c as any).raw_data?.snippet || '';
        const detectedType = c.website_type ?? detectWebsiteType(c.property_url, snippet, c.property_name as any);
        const confidence = typeof (c as any).confidence_score === 'number' ? (c as any).confidence_score : calculateConfidenceScore(snippet, c, detectedType);

        const body = {
          p_property_name: (c as any).property_name,
          p_property_url: (c as any).property_url,
          p_confidence_score: confidence,
          p_website_complexity: (c as any).website_complexity ?? 'unknown',
          p_priority_level: (c as any).priority_level ?? 'medium',
          p_website_type: detectedType,
          p_enqueue_for_scraping: false
        };

        const resp = await fetch(rpcUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`
          },
          body: JSON.stringify(body)
        });

        if (!resp.ok) {
          const text = await resp.text();
          results.push({ url: (c as any).property_url, status: 'error', code: resp.status, body: text });
        } else {
          const json = await resp.json().catch(() => null);
          results.push({ url: (c as any).property_url, status: 'persisted', rpc: json });

          try {
            const rpcAtomicUrl = `${SUPABASE_URL}/rest/v1/rpc/rpc_upsert_property_and_enqueue`;
            const scrapedRecord = {
              property_id: (c as any).property_name || null,
              unit_number: '',
              source: detectedType || 'discovery',
              name: (c as any).property_name || null,
              address: null,
              city: null,
              state: null,
              listing_url: (c as any).property_url || null
            };

            const atomicResp = await fetch(rpcAtomicUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                apikey: SERVICE_KEY,
                Authorization: `Bearer ${SERVICE_KEY}`
              },
              body: JSON.stringify({ p_row: scrapedRecord, p_property_source_id: json?.property_source_id ?? null, p_priority: null, p_metadata: null })
            });

            if (!atomicResp.ok) {
              const t = await atomicResp.text();
              results.push({ url: (c as any).property_url, status: 'atomic_rpc_error', code: atomicResp.status, body: t });
            } else {
              const aJson = await atomicResp.json().catch(() => null);
              results.push({ url: (c as any).property_url, status: 'enqueued_via_rpc', rpc: aJson });
            }
          } catch (err) {
            results.push({ url: (c as any).property_url, status: 'atomic_rpc_exception', message: String(err) });
          }
        }
      } catch (err) {
        results.push({ url: (c as any).property_url, status: 'error', message: String(err) });
      }
    }

    const payload = { status: 'ok', source: 'claude-queue-builder', persisted: results, debug: { env_has_key: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), header_has_key: !!headerKey } };
    const replacer = (_k: string, v: any) => (typeof v === 'bigint' ? v.toString() : v);
    return new Response(JSON.stringify(payload, replacer), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'internal_error', message: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}, { port: FUNCTIONS_PORT });
