// ai-scraper-worker/index.ts
import { serve } from "std/http/server.ts";
import { recommendedConfig } from "../openai_config.ts";
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
  const { source = "unknown", cleanHtml = "", url = "", external_id, source_url, source_name, scraping_job_id } = payload as { source?: string; cleanHtml?: string; url?: string; external_id?: string; source_url?: string; source_name?: string; scraping_job_id?: number };

  // If no cleanHtml provided but url is available, fetch the HTML
  let htmlContent = cleanHtml;
  if (!htmlContent && url) {
    try {
      const htmlResponse = await fetch(url);
      if (htmlResponse.ok) {
        htmlContent = await htmlResponse.text();
      } else {
        return new Response(JSON.stringify({ status: "error", message: `Failed to fetch HTML from ${url}: ${htmlResponse.status}` }), { status: 400, headers: { "content-type": "application/json" } });
      }
    } catch (fetchError) {
      return new Response(JSON.stringify({ status: "error", message: `Error fetching HTML: ${fetchError}` }), { status: 500, headers: { "content-type": "application/json" } });
    }
  }

    // Build messages per user's spec
    const messages = [
      {
        role: "system",
        content: `You are an expert web scraper for apartment rental data.\nExtract the following fields from HTML and return ONLY valid JSON:\n- name, address, city, state (2 letters)\n- current_price (number only, no symbols)\n- bedrooms, bathrooms (numbers)\n- free_rent_concessions (text description)\n- application_fee (number or null)\n- admin_fee_waived (boolean)\n- admin_fee_amount (number or null)\n\nReturn valid JSON. Use null for missing fields.`,
      },
      {
        role: "user",
        content: `Extract apartment data from this ${source} page HTML:\n\n${htmlContent}`,
      },
    ];

    // Merge config but allow recommendedConfig to supply model/temperature/etc.
    const completionParams = {
      model: recommendedConfig.model,
      messages,
      response_format: recommendedConfig.response_format,
      temperature: recommendedConfig.temperature,
      top_p: recommendedConfig.top_p,
      max_tokens: recommendedConfig.max_tokens,
    };

    // Call OpenAI Chat Completions
    // Note: using the OpenAI SDK shape expected by the import map (esm shim)

    // Call OpenAI REST API for chat completions
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return new Response(JSON.stringify({ status: "error", message: "OPENAI_API_KEY not set" }), { status: 500, headers: { "content-type": "application/json" } });
    }

    const openaiBody = {
      model: completionParams.model,
      messages: completionParams.messages,
      temperature: completionParams.temperature,
      top_p: completionParams.top_p,
      max_tokens: completionParams.max_tokens,
      response_format: completionParams.response_format,
    } as Record<string, unknown>;

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify(openaiBody),
    });

  const aiResponse = await resp.json();
  // OpenAI usage object typically appears here: { prompt_tokens, completion_tokens, total_tokens }
  type OpenAIUsage = { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  const usage = ((aiResponse as unknown) as { usage?: OpenAIUsage })?.usage ?? null;
    const respAny = aiResponse as unknown as { choices?: Array<Record<string, unknown>> };
    const firstChoice = respAny.choices?.[0] ?? null;
    let content: unknown = "";
    if (firstChoice && typeof firstChoice === "object") {
      const fc = firstChoice as Record<string, unknown>;
      const message = fc["message"] as Record<string, unknown> | undefined;
      if (message && typeof message["content"] === "string") {
        content = message["content"] as string;
      } else if (typeof fc["text"] === "string") {
        content = fc["text"] as string;
      }
    }

    // Attempt to parse JSON; return parsing errors as 422
    let parsed: unknown = null;
    try {
      parsed = typeof content === "string" ? JSON.parse(content) : content;
    } catch (_err) {
      return new Response(JSON.stringify({ status: "error", error: "AI returned non-JSON", raw: content }), {
        status: 422,
        headers: { "content-type": "application/json" },
      });
    }

    // Validate the AI result before returning
    const result = parsed as Record<string, unknown>;
    if (!validateAiResult(result)) {
      return new Response(JSON.stringify({ status: "error", error: "AI result failed validation", data: result }), {
        status: 422,
        headers: { "content-type": "application/json" },
      });
    }

    // Save apartment data to database with source tracking
    try {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
      const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
      if (SUPABASE_URL && SUPABASE_KEY) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        
        const apartmentData = {
          external_id: external_id || `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          source: source,
          title: result.name,
          address: result.address,
          city: result.city,
          state: result.state,
          rent_price: result.current_price,
          rent_amount: result.current_price, // Set both rent_price and rent_amount
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

    // If we have usage information, estimate cost and record it to the DB (daily aggregate)
    try {
      if (usage && typeof usage === 'object') {
        const promptTokens = Number((usage as Record<string, unknown>)['prompt_tokens'] ?? 0);
        const completionTokens = Number((usage as Record<string, unknown>)['completion_tokens'] ?? 0);
        const totalTokens = Number((usage as Record<string, unknown>)['total_tokens'] ?? (promptTokens + completionTokens));

        // Simple per-1k-token pricing table (estimates). Adjust to actual rates as needed.
        const MODEL_PRICING: Record<string, { prompt: number; completion: number }> = {
          'gpt-3.5-turbo': { prompt: 0.0015, completion: 0.002 },
          'gpt-3.5-turbo-16k': { prompt: 0.0015, completion: 0.002 },
          'gpt-4-turbo-preview': { prompt: 0.03, completion: 0.06 },
        };

        const modelKey = String(completionParams.model ?? recommendedConfig.model ?? 'gpt-3.5-turbo');
        const pricing = MODEL_PRICING[modelKey] ?? { prompt: 0.0015, completion: 0.002 };
        const estimatedCost = ((promptTokens * pricing.prompt) + (completionTokens * pricing.completion)) / 1000;

        // Try to write daily aggregate to scraping_costs. If Supabase env not set, skip silently.
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
        const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';
        if (SUPABASE_URL && SUPABASE_KEY) {
          try {
            const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
            const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
            await sb.rpc('rpc_inc_scraping_costs', {
              p_date: today,
              p_properties_scraped: 1,
              p_ai_requests: 1,
              p_tokens_used: totalTokens,
              p_estimated_cost: Number(estimatedCost.toFixed(6)),
              p_details: { model: modelKey, prompt_tokens: promptTokens, completion_tokens: completionTokens },
            });
          } catch (e) {
            console.error('Failed to record scraping cost via RPC:', e);
          }
        }

        // Return the result including usage/cost metadata for easier debugging
        return new Response(JSON.stringify({ status: "ok", data: result, usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: totalTokens, estimated_cost: Number(estimatedCost.toFixed(6)), model: modelKey } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
    } catch (e) {
      console.error('Error while processing usage info:', e);
    }

    return new Response(JSON.stringify({ status: "ok", data: result }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err: unknown) {
  const msg = (err as unknown instanceof Error) ? (err as Error).message : String(err);
    return new Response(JSON.stringify({ status: "error", message: msg }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
});
