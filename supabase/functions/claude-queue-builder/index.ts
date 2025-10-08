import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
// postgres client for local DB fallback
import { Client as PgClient } from 'https://deno.land/x/postgres@v0.17.0/mod.ts';

// Allow the host process (CI or local dev) to control the port used by the function
// server. Defaults to 54321 which the integration tests expect.
const FUNCTIONS_PORT = Number(Deno.env.get('FUNCTIONS_PORT') || Deno.env.get('PORT') || 54321);

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
  // Accept service key from environment OR allow passing via Authorization / apikey header for local testing
  const headerKey = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || req.headers.get('apikey') || req.headers.get('x-supabase-service-role-key');
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || headerKey;

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

        // If a plain Postgres URI is provided, use a local DB fallback to persist records directly
        const POSTGRES_URI = Deno.env.get('POSTGRES_URI');
        if (POSTGRES_URI) {
          // local DB fallback: insert into property_sources, property_discovery and optionally scraping_queue
          const client = new PgClient(POSTGRES_URI);
          let lastQuery = null;
          let lastParams: any[] = [];
          try {
            await client.connect();
            await client.queryArray('BEGIN');
            // upsert property_sources by url
            // Build metadata JSONB in SQL to avoid JSON parsing issues from client parameterization
            lastQuery = `INSERT INTO property_sources (url, property_name, metadata, created_at) VALUES ($1, $2, jsonb_build_object('website_type', $3::text), NOW()) ON CONFLICT (url) DO UPDATE SET property_name = EXCLUDED.property_name RETURNING id`;
            lastParams = [c.property_url || c.url, c.property_name || null, detectedType];
            const propsRes = await client.queryObject({ text: lastQuery, args: lastParams });
            const propSourceIdRaw = propsRes.rows && propsRes.rows[0] && propsRes.rows[0].id ? propsRes.rows[0].id : null;
            const propSourceId = (propSourceIdRaw === null || propSourceIdRaw === undefined) ? null : Number(propSourceIdRaw);

            // Upsert into property_discovery using the DB helper function to ensure schema compatibility
            lastQuery = `SELECT public.upsert_property_discovery($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) AS id`;
            lastParams = [
              c.property_name || null,
              c.property_url || c.url || null,
              (c.year_built === undefined) ? null : c.year_built,
              (c.total_units === undefined) ? null : c.total_units,
              c.property_type || null,
              c.management_company || null,
              c.address || null,
              c.city || null,
              c.state || null,
              c.zip_code || null,
              confidence,
              c.website_complexity || 'unknown',
              c.priority_level || 'medium',
              c.website_type || 'unknown'
            ];
            const discRes = await client.queryObject({ text: lastQuery, args: lastParams });
            const discoveryIdRaw = discRes.rows && discRes.rows[0] && discRes.rows[0].id ? discRes.rows[0].id : null;
            const discoveryId = (discoveryIdRaw === null || discoveryIdRaw === undefined) ? null : Number(discoveryIdRaw);

            // Use the same atomic RPC as production to upsert scraped_properties and enqueue in a single transaction.
            // This avoids issues with GENERATED external_id columns and FK ordering in local copies.
            lastQuery = `SELECT public.rpc_upsert_property_and_enqueue($1::jsonb, $2::int, $3::int, $4::jsonb) AS res`;
            lastParams = [JSON.stringify({
              property_id: external_id,
              unit_number: '',
              source: detectedType || 'discovery',
              name: c.property_name || null,
              address: c.address || null,
              city: c.city || null,
              state: c.state || null,
              listing_url: c.property_url || c.url || null
            }), propSourceId, (typeof c.priority_level === 'number') ? c.priority_level : null, discoveryId ? JSON.stringify({ discovery_id: discoveryId }) : null];
            const atomicRes = await client.queryObject({ text: lastQuery, args: lastParams });
            // atomic RPC returns a jsonb; no further action required for enqueue
            const atomicResult = atomicRes.rows && atomicRes.rows[0] ? atomicRes.rows[0].res : null;

            await client.queryArray('COMMIT');
            results.push({ url: c.url, status: 'persisted_local', property_source_id: propSourceId, discovery_id: discoveryId });
          } catch (errLocal) {
            try { await client.queryArray('ROLLBACK'); } catch (_) {}
            results.push({ url: c.url, status: 'local_db_error', message: String(errLocal), lastQuery, lastParams });
          } finally {
            await client.end();
          }
        } else {
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

                // Prepare optional fields from the earlier RPC result (property_sources id and metadata)
                const property_source_id = (json && json.property_source_id) ? json.property_source_id : null;
                const priority = (c.priority_level && typeof c.priority_level === 'number') ? c.priority_level : null;
                const metadata = (json && json.discovery_id) ? { discovery_id: json.discovery_id } : null;

                const atomicResp = await fetch(rpcAtomicUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': SERVICE_KEY,
                  'Authorization': `Bearer ${SERVICE_KEY}`
                },
                // PostgREST maps JSON body keys to function params. Wrap under 'p_row' to match function signature (p_row jsonb).
                  body: JSON.stringify({ p_row: scrapedRecord, p_property_source_id: property_source_id, p_priority: priority, p_metadata: metadata })
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
        }
      } catch (err) {
        results.push({ url: c.url, status: 'error', message: String(err) });
      }
    }

  // Mask key parts for debugging without printing full secrets
  const envKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const maskedEnv = envKey ? `${envKey.slice(0,8)}...${envKey.slice(-6)}` : null;
  const maskedHeader = headerKey ? `${headerKey.slice(0,8)}...${headerKey.slice(-6)}` : null;

  const payload = { status: 'ok', source: 'claude-queue-builder', persisted: results, debug: { env_has_key: !!envKey, header_has_key: !!headerKey, masked_env_key: maskedEnv, masked_header_key: maskedHeader } };
  const replacer = (_k: string, v: any) => (typeof v === 'bigint' ? v.toString() : v);
  return new Response(JSON.stringify(payload, replacer), { headers: { 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'internal_error', message: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}, { port: FUNCTIONS_PORT });
