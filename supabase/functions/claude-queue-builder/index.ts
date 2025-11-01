import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.27.3';

// Allow the host process (CI or local dev) to control the port used by the function
// server. Defaults to 54321 which the integration tests expect.
const FUNCTIONS_PORT = Number(Deno.env.get('FUNCTIONS_PORT') || Deno.env.get('PORT') || 54321);

// Initialize Claude client
const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY') || '',
});

// SERP API integration
async function searchPropertiesWithSerp(query: string, location: string, numResults = 10) {
  const serpApiKey = Deno.env.get('SERP_API_KEY');
  if (!serpApiKey) {
    throw new Error('SERP_API_KEY not configured');
  }

  const searchUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}&num=${numResults}&api_key=${serpApiKey}`;
  
  const response = await fetch(searchUrl);
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`SERP API request failed: ${response.status} - ${text}`);
  }

  const data = await response.json();
  return (data.organic_results || []).map((result: any) => ({
    url: result.link,
    title: result.title,
    snippet: result.snippet || result.description || '',
    position: result.position,
  }));
}

// Claude analysis for property quality assessment
async function analyzePropertyWithClaude(propertyData: any) {
  const prompt = `Analyze this apartment property listing and provide a structured assessment:

Property Details:
- Title: ${propertyData.title}
- URL: ${propertyData.url}
- Snippet: ${propertyData.snippet}

Please provide:
1. Confidence score (0-1) that this is a legitimate apartment property listing
2. Website complexity (simple, medium, complex)
3. Priority level (low, medium, high) based on data completeness and relevance
4. Detected website type (jonah, yardi_rent_cafe, entrada, realpage, mixed_media, other, unknown)
5. Property name extracted from the listing

Respond in JSON format:
{
  "confidence_score": 0.85,
  "website_complexity": "medium",
  "priority_level": "high",
  "website_type": "yardi_rent_cafe",
  "property_name": "Example Apartments",
  "reasoning": "Brief explanation"
}`;

  try {
    const message = await anthropic.messages.create({
      model: Deno.env.get('CLAUDE_MODEL') || 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const content = message.content[0];
    if (content.type === 'text') {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }
    throw new Error('Could not parse Claude response');
  } catch (error) {
    console.warn('Claude analysis failed, using fallback:', error);
    return null;
  }
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

serve(async (req: Request) => {
  try {
    const body = await req.json().catch(() => ({}));
    const testMode = body.test_mode === true || (new URL(req.url).searchParams.get('test_mode') === 'true');

    if (testMode) {
      return new Response(
        JSON.stringify({
          status: 'ok',
          source: 'claude-queue-builder',
          mode: 'test',
          candidates: [
            { url: 'https://www.example-property1.com', title: 'Example Property 1', website: 'example-property1.com', priority: 1 },
            { url: 'https://www.example-property2.com', title: 'Example Property 2', website: 'example-property2.com', priority: 1 },
            { url: 'https://www.apartments.com/atlanta-ga/elora-at-buckhead/123456', title: 'Elora at Buckhead', website: 'apartments.com', priority: 2 }
          ]
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get search parameters from request
    const query = body.query || 'luxury apartments for rent';
    const location = body.location || 'Atlanta, GA';
    const numResults = body.num_results || 10;
    const useClaudeAnalysis = body.use_claude !== false; // Default to true

    console.log(`Searching for properties: ${query} in ${location}`);

    // Step 1: Search with SERP API
    let serpResults;
    try {
      serpResults = await searchPropertiesWithSerp(query, location, numResults);
      console.log(`Found ${serpResults.length} results from SERP API`);
    } catch (error) {
      console.error('SERP API search failed:', error);
      return new Response(
        JSON.stringify({ 
          status: 'error', 
          error: 'SERP API search failed', 
          message: String(error),
          hint: 'Make sure SERP_API_KEY is configured in environment variables'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Analyze each property with Claude (if enabled)
    const candidates = [];
    for (const result of serpResults) {
      let analysis = null;
      
      if (useClaudeAnalysis && Deno.env.get('ANTHROPIC_API_KEY')) {
        analysis = await analyzePropertyWithClaude(result);
      }

      // Fallback to rule-based detection if Claude fails or is disabled
      if (!analysis) {
        const websiteType = detectWebsiteType(result.url, result.snippet, result.title);
        analysis = {
          confidence_score: calculateConfidenceScore(result.snippet, result, websiteType),
          website_complexity: 'medium',
          priority_level: 'medium',
          website_type: websiteType,
          property_name: result.title,
          reasoning: 'Rule-based detection (Claude disabled or failed)'
        };
      }

      candidates.push({
        property_name: analysis.property_name || result.title,
        property_url: result.url,
        confidence_score: analysis.confidence_score,
        website_complexity: analysis.website_complexity,
        priority_level: analysis.priority_level,
        website_type: analysis.website_type,
        raw_data: {
          snippet: result.snippet,
          position: result.position,
          claude_reasoning: analysis.reasoning
        }
      });
    }

    console.log(`Analyzed ${candidates.length} properties`);

    // Step 3: Persist to database
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
        const body = {
          p_property_name: c.property_name,
          p_property_url: c.property_url,
          p_confidence_score: c.confidence_score,
          p_website_complexity: c.website_complexity,
          p_priority_level: c.priority_level,
          p_website_type: c.website_type,
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
          results.push({ url: c.property_url, status: 'error', code: resp.status, body: text });
        } else {
          const json = await resp.json().catch(() => null);
          results.push({ url: c.property_url, status: 'persisted', rpc: json });

          try {
            const rpcAtomicUrl = `${SUPABASE_URL}/rest/v1/rpc/rpc_upsert_property_and_enqueue`;
            const scrapedRecord = {
              property_id: c.property_name || null,
              unit_number: '',
              source: c.website_type || 'discovery',
              name: c.property_name || null,
              address: null,
              city: null,
              state: null,
              listing_url: c.property_url || null
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
              results.push({ url: c.property_url, status: 'atomic_rpc_error', code: atomicResp.status, body: t });
            } else {
              const aJson = await atomicResp.json().catch(() => null);
              results.push({ url: c.property_url, status: 'enqueued_via_rpc', rpc: aJson });
            }
          } catch (err) {
            results.push({ url: c.property_url, status: 'atomic_rpc_exception', message: String(err) });
          }
        }
      } catch (err) {
        results.push({ url: c.property_url, status: 'error', message: String(err) });
      }
    }

    const payload = {
      status: 'ok',
      source: 'claude-queue-builder',
      search: { query, location, numResults: serpResults.length },
      analyzed: candidates.length,
      persisted: results,
      debug: {
        env_has_key: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
        header_has_key: !!headerKey,
        serp_api_configured: !!Deno.env.get('SERP_API_KEY'),
        claude_configured: !!Deno.env.get('ANTHROPIC_API_KEY'),
        claude_used: useClaudeAnalysis
      }
    };
    
    const replacer = (_k: string, v: any) => (typeof v === 'bigint' ? v.toString() : v);
    return new Response(JSON.stringify(payload, replacer), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'internal_error', message: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}, { port: FUNCTIONS_PORT });
