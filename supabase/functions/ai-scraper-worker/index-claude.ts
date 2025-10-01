// ai-scraper-worker/index-claude.ts - Claude/Anthropic version
import { serve } from "std/http/server.ts";
import { createClient } from '@supabase/supabase-js';

// Validate AI-extracted fields
function validateAiResult(result: Record<string, unknown>): boolean {
  const requiredFields = ["name", "address", "city", "state", "current_price"];
  for (const field of requiredFields) {
    const v = result[field];
    if (v === undefined || v === null || String(v).trim() === "") return false;
  }

  try {
    const price = Number(result["current_price"]);
    if (!Number.isFinite(price) || price <= 0 || price > 50000) return false;

    const state = String(result["state"]).trim().toUpperCase();
    if (state.length !== 2 || !/^[A-Z]{2}$/.test(state)) return false;

    const bedrooms = Number(result["bedrooms"] ?? 0);
    const bathrooms = Number(result["bathrooms"] ?? 0);
    if (!Number.isFinite(bedrooms) || bedrooms < 0 || bedrooms > 10) return false;
    if (!Number.isFinite(bathrooms) || bathrooms < 0 || bathrooms > 10) return false;
  } catch {
    return false;
  }

  return true;
}

serve(async (req: Request) => {
  try {
    const payload = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const { source = "unknown", cleanHtml = "", url = "", external_id, source_url, source_name, scraping_job_id } = payload as { 
      source?: string; 
      cleanHtml?: string; 
      url?: string; 
      external_id?: string; 
      source_url?: string; 
      source_name?: string; 
      scraping_job_id?: number 
    };

    // If no cleanHtml provided but url is available, fetch the HTML
    let htmlContent = cleanHtml;
    if (!htmlContent && url) {
      try {
        const htmlResponse = await fetch(url);
        if (htmlResponse.ok) {
          htmlContent = await htmlResponse.text();
        } else {
          return new Response(JSON.stringify({ status: "error", message: `Failed to fetch HTML from ${url}: ${htmlResponse.status}` }), { 
            status: 400, 
            headers: { "content-type": "application/json" } 
          });
        }
      } catch (fetchError) {
        return new Response(JSON.stringify({ status: "error", message: `Error fetching HTML: ${fetchError}` }), { 
          status: 500, 
          headers: { "content-type": "application/json" } 
        });
      }
    }

    // Build Claude-compatible messages
    const systemPrompt = `You are an expert web scraper for apartment rental data. You will receive HTML from multiple pages of an apartment property website.

EXTRACT APARTMENT DATA FROM MULTIPLE PAGES:

KEY PAGES AND WHAT TO FIND:
1. FLOOR PLANS PAGE (/floorplans/):
   - Unit types (Studio, 1 bed, 2 bed, etc.)
   - Square footage ranges
   - Pricing (monthly rent)
   - Availability status
   - Deposit requirements

2. AMENITIES PAGE (/amenities/):
   - Community amenities (pool, gym, parking, laundry)
   - Unit features (appliances, flooring, balcony)
   - Pet policies
   - Utility inclusions

3. HOME/GENERAL PAGE:
   - Property name
   - Address
   - Contact information
   - General descriptions

4. GALLERY/NEIGHBORHOOD PAGES:
   - Additional photos/features
   - Location details
   - Nearby amenities

LOOK FOR THESE SPECIFIC PATTERNS:
- Pricing: "$", "rent", "monthly", "from $X", "starting at"
- Unit specs: "bed", "bath", "sq ft", "square feet", "studio"
- Amenities: lists of features, icons with text, bullet points
- Floor plans: tables, cards, grids with unit details
- Fees: "application fee", "admin fee", "deposit", "pet fee"

Extract the following fields and return ONLY valid JSON:
- name (property name)
- address (street address)
- city, state (2 letters), zip_code
- current_price (number only, no symbols - use lowest price if range)
- bedrooms, bathrooms (numbers - use lowest if range)
- square_feet (number - use lowest if range)
- amenities (array of strings)
- application_fee (number or null)
- admin_fee_waived (boolean)
- admin_fee_amount (number or null)
- security_deposit (number or null)
- free_rent_concessions (text description or null)

If you find multiple units, extract the most common/representative unit or the one with the lowest price.
Return valid JSON. Use null for missing fields. Be thorough in searching all page sections.`;

    const userMessage = `Extract apartment data from this multi-page HTML content from ${source}. The HTML contains multiple pages marked with <!-- PAGE: URL --> comments. Search through all pages for the most complete and accurate apartment information:\n\n${htmlContent}`;

    // Call Claude API
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return new Response(JSON.stringify({ status: "error", message: "ANTHROPIC_API_KEY not set" }), { 
        status: 500, 
        headers: { "content-type": "application/json" } 
      });
    }

    const claudeModel = Deno.env.get("CLAUDE_MODEL") || "claude-3-haiku-20240307";
    
    const claudeBody = {
      model: claudeModel,
      max_tokens: 1000, // Reduced from 2000 to help with rate limits
      temperature: 0.1,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userMessage
        }
      ]
    };

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(claudeBody),
    });

    const aiResponse = await resp.json();
    
    // Extract usage information for cost tracking
    const usage = aiResponse.usage || {};
    const inputTokens = usage.input_tokens || 0;
    const outputTokens = usage.output_tokens || 0;
    const totalTokens = inputTokens + outputTokens;

    // Extract content from Claude response
    let content = "";
    if (aiResponse.content && Array.isArray(aiResponse.content) && aiResponse.content.length > 0) {
      content = aiResponse.content[0].text || "";
    }

    if (!content) {
      return new Response(JSON.stringify({ 
        status: "error", 
        error: "Claude returned empty response", 
        raw: aiResponse 
      }), {
        status: 422,
        headers: { "content-type": "application/json" },
      });
    }

    // Attempt to parse JSON; return parsing errors as 422
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(content);
    } catch (_err) {
      return new Response(JSON.stringify({ 
        status: "error", 
        error: "Claude returned non-JSON", 
        raw: content 
      }), {
        status: 422,
        headers: { "content-type": "application/json" },
      });
    }

    // Validate the AI result before returning
    const result = parsed as Record<string, unknown>;
    if (!validateAiResult(result)) {
      return new Response(JSON.stringify({ 
        status: "error", 
        error: "Claude result failed validation", 
        data: result 
      }), {
        status: 422,
        headers: { "content-type": "application/json" },
      });
    }

    // Save apartment data to database with source tracking
    try {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
      const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
      if (SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes('demo')) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        
        const apartmentData = {
          external_id: external_id || `claude-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          source: source,
          title: result.name,
          address: result.address,
          city: result.city,
          state: result.state,
          rent_price: result.current_price,
          rent_amount: result.current_price,
          bedrooms: result.bedrooms,
          bathrooms: result.bathrooms,
          free_rent_concessions: result.free_rent_concessions,
          application_fee: result.application_fee,
          admin_fee_waived: result.admin_fee_waived,
          admin_fee_amount: result.admin_fee_amount,
          is_active: true,
          scraped_at: new Date().toISOString(),
          source_url: source_url,
          source_name: source_name,
          scraping_job_id: scraping_job_id,
        };

        // Remove undefined/null values
        const cleanData = Object.fromEntries(
          Object.entries(apartmentData).filter(([_, v]) => v !== undefined && v !== null)
        );

        const { data, error } = await supabase
          .from('apartments')
          .upsert(cleanData, { onConflict: 'external_id' });

        if (error) {
          console.error('Failed to save apartment:', error);
        } else {
          console.log('Saved apartment:', data);
        }
      }
    } catch (saveError) {
      console.error('Error saving apartment:', saveError);
      // Don't fail the request if saving fails, just log it
    }

    // Calculate cost estimate for Claude
    let estimatedCost = 0;
    const CLAUDE_PRICING: Record<string, { input: number; output: number }> = {
      'claude-3-haiku-20240307': { input: 0.80, output: 4.00 },
      'claude-3-sonnet-20240229': { input: 15.00, output: 75.00 },
      'claude-3-opus-20240229': { input: 75.00, output: 225.00 }
    };

    const pricing = CLAUDE_PRICING[claudeModel] || CLAUDE_PRICING['claude-3-haiku-20240307'];
    estimatedCost = ((inputTokens * pricing.input) + (outputTokens * pricing.output)) / 1000000;

    // Record cost tracking if enabled
    try {
      if (Deno.env.get('ENABLE_COST_TRACKING') === 'true') {
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
        const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
        if (SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes('demo')) {
          const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
          const today = new Date().toISOString().slice(0, 10);
          await sb.rpc('rpc_inc_scraping_costs', {
            p_date: today,
            p_properties_scraped: 1,
            p_ai_requests: 1,
            p_tokens_used: totalTokens,
            p_estimated_cost: Number(estimatedCost.toFixed(6)),
            p_details: { 
              model: claudeModel, 
              input_tokens: inputTokens, 
              output_tokens: outputTokens,
              provider: 'anthropic'
            },
          });
        }
      }
    } catch (e) {
      console.error('Failed to record scraping cost:', e);
    }

    // Return success response with usage information
    return new Response(JSON.stringify({ 
      status: "ok", 
      data: result,
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens,
        estimated_cost: Number(estimatedCost.toFixed(6)),
        model: claudeModel,
        provider: 'anthropic'
      }
    }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

  } catch (err: unknown) {
    const msg = (err instanceof Error) ? err.message : String(err);
    return new Response(JSON.stringify({ status: "error", message: msg }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
});