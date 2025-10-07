import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

serve(async (req: Request) => {
  try {
    const body = await req.json().catch(() => ({}));
    const testMode = body.test_mode === true || (new URL(req.url).searchParams.get('test_mode') === 'true');

    if (testMode) {
      return new Response(JSON.stringify({
        status: 'ok',
        source: 'claude-queue-builder',
        candidates: [
          { url: 'https://www.example-property1.com', title: 'Example Property 1', website: 'example-property1.com', priority: 1 },
          { url: 'https://www.example-property2.com', title: 'Example Property 2', website: 'example-property2.com', priority: 1 },
          { url: 'https://www.apartments.com/atlanta-ga/elora-at-buckhead/123456', title: 'Elora at Buckhead', website: 'apartments.com', priority: 2 }
        ]
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    // Production behavior: call Claude / Anthropic here and parse candidate URLs
    // For now we simulate discovery by calling the provided RPC to persist candidates.
    // The RPC name is `upsert_property_source_and_enqueue` and expects the service-role key.

    // Helper: detect website type from URL/snippet/title
    function detectWebsiteType(url: string, snippet = '', title = ''): string {
      const lowerUrl = (url || '').toLowerCase();
      const lowerSnippet = (snippet || '').toLowerCase();
      const lowerTitle = (title || '').toLowerCase();

      if (lowerUrl.includes('app.tenantturner.com') || lowerSnippet.includes('tenantturner') || (lowerSnippet.includes('apply online') && lowerSnippet.includes('screening fee'))) {
        return 'jonah';
      }

      if (lowerUrl.includes('rentcafe.com') || lowerUrl.includes('yardi') || lowerSnippet.includes('rentcafe') || lowerSnippet.includes('resident portal')) {
        return 'yardi_rent_cafe';
      }

      if (lowerUrl.includes('entrada') || lowerSnippet.includes('entrada') || lowerSnippet.includes('property management platform')) {
        return 'entrada';
      }

      if (lowerUrl.includes('realpage') || lowerSnippet.includes('realpage') || lowerSnippet.includes('one site') || lowerSnippet.includes('property solutions')) {
        return 'mixed_media';
      }

      if (lowerSnippet.includes('apply now') && lowerSnippet.includes('lease')) {
        return 'other';
      }

      return 'unknown';
    }

    // Helper: calculate confidence score based on snippet, result object, and website type
    function calculateConfidenceScore(snippet: string, result: any, websiteType: string): number {
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

    // Enhanced sample candidates with realistic data
    const candidates = [
      {
        property_name: 'Elora at Buckhead Apartments',
        property_url: 'https://www.eloraatbuckhead.com',
        year_built: 2020,
        total_units: 320,
        property_type: 'Luxury Apartment',
        management_company: 'Greystar',
        address: '123 Buckhead Avenue',
        city: 'Atlanta',
        state: 'GA',
        zip_code: '30305',
        confidence_score: 0.85,
        website_complexity: 'medium',
        priority_level: 'high',
        website_type: 'yardi_rent_cafe'
      },
      {
        property_name: 'The Standard Midtown',
        property_url: 'https://www.thestandardmidtown.com',
        year_built: 2018,
        total_units: 280,
        property_type: 'Student Housing',
        management_company: 'Campus Apartments',
        address: '456 Midtown Boulevard',
        city: 'Atlanta',
        state: 'GA',
        zip_code: '30308',
        confidence_score: 0.78,
        website_complexity: 'complex',
        priority_level: 'medium',
        website_type: 'jonah'
      },
      {
        property_name: 'Westside Provisions Apartments',
        property_url: 'https://www.westsideprovisionsapts.com',
        year_built: 2015,
        total_units: 150,
        property_type: 'Mixed-Use Development',
        management_company: 'Mill Creek Residential',
        address: '789 Westside Drive',
        city: 'Atlanta',
        state: 'GA',
        zip_code: '30318',
        confidence_score: 0.92,
        website_complexity: 'simple',
        priority_level: 'high'
        ,website_type: 'entrada'
      }
    ];

    // If SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are present, persist each candidate
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || new URL(req.url).origin.replace(':54321','');
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const results: Array<Record<string, any>> = [];

    // helper: compute SHA-1 hex digest for a stable external_id
    async function sha1hex(input: string) {
      const enc = new TextEncoder();
      const data = enc.encode(input || '');
      const hash = await crypto.subtle.digest('SHA-1', data);
      const arr = Array.from(new Uint8Array(hash));
      return arr.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    for (const c of candidates) {
      try {
        if (!SERVICE_KEY) {
          results.push({ url: c.url, status: 'skipped', reason: 'no_service_key' });
          continue;
        }

        const rpcUrl = `${SUPABASE_URL}/rest/v1/rpc/upsert_property_discovery_and_source`;

        // Determine website_type and confidence if not provided
        const snippet = (c.raw_data && c.raw_data.snippet) ? c.raw_data.snippet : '';
        const detectedType = c.website_type ?? detectWebsiteType(c.property_url, snippet, c.property_name);
        const confidence = (typeof c.confidence_score === 'number') ? c.confidence_score : calculateConfidenceScore(snippet, c, detectedType);

        const external_id = await sha1hex(c.property_url || c.url || String(Date.now()));

        const body = {
          p_property_name: c.property_name,
          p_property_url: c.property_url,
          p_year_built: c.year_built ?? null,
          p_total_units: c.total_units ?? null,
          p_property_type: c.property_type ?? null,
          p_management_company: c.management_company ?? null,
          p_address: c.address ?? null,
          p_city: c.city ?? null,
          p_state: c.state ?? null,
          p_zip_code: c.zip_code ?? null,
          p_confidence_score: confidence,
          p_website_complexity: c.website_complexity ?? 'unknown',
          p_priority_level: c.priority_level ?? 'medium',
          p_website_type: detectedType,
          p_enqueue_for_scraping: false
        };

        const resp = await fetch(rpcUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`
          },
          body: JSON.stringify(body)
        });

        if (!resp.ok) {
          const text = await resp.text();
          results.push({ url: c.url, status: 'error', code: resp.status, body: text });
        } else {
          const json = await resp.json().catch(() => null);
          // rpc returns the property_sources.id by design
          results.push({ url: c.url, status: 'persisted', rpc: json });

          // Use atomic RPC to upsert scraped_properties and enqueue in one step
          try {
            const rpcAtomicUrl = `${SUPABASE_URL}/rest/v1/rpc/rpc_upsert_property_and_enqueue`;
            const scrapedRecord = {
              property_id: external_id,
              unit_number: '',
              source: detectedType || (c.website || 'discovery'),
              name: c.property_name || null,
              address: c.address || null,
              city: c.city || null,
              state: c.state || null,
              listing_url: c.property_url || c.url || null
            };

            const atomicResp = await fetch(rpcAtomicUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': SERVICE_KEY,
                'Authorization': `Bearer ${SERVICE_KEY}`
              },
              // PostgREST maps JSON body keys to function params. Wrap under 'p_row' to match function signature (p_row jsonb).
              body: JSON.stringify({ p_row: scrapedRecord })
            });

            if (!atomicResp.ok) {
              const t = await atomicResp.text();
              results.push({ url: c.url, status: 'atomic_rpc_error', code: atomicResp.status, body: t });
            } else {
              const aJson = await atomicResp.json().catch(() => null);
              results.push({ url: c.url, status: 'enqueued_via_rpc', rpc: aJson });
            }
          } catch (err2) {
            results.push({ url: c.url, status: 'atomic_rpc_exception', message: String(err2) });
          }
        }
      } catch (err) {
        results.push({ url: c.url, status: 'error', message: String(err) });
      }
    }

    return new Response(JSON.stringify({ status: 'ok', source: 'claude-queue-builder', persisted: results }), { headers: { 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'internal_error', message: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
