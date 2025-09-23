// ai-scraper-worker/index.ts
import { serve } from "std/http/server.ts";
import { recommendedConfig } from "../openai_config.ts";
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
  const { source = "unknown", cleanHtml = "" } = payload as { source?: string; cleanHtml?: string };

    // Build messages per user's spec
    const messages = [
      {
        role: "system",
        content: `You are an expert web scraper for apartment rental data.\nExtract the following fields from HTML and return ONLY valid JSON:\n- name, address, city, state (2 letters)\n- current_price (number only, no symbols)\n- bedrooms, bathrooms (numbers)\n- free_rent_concessions (text description)\n- application_fee (number or null)\n- admin_fee_waived (boolean)\n- admin_fee_amount (number or null)\n\nReturn valid JSON. Use null for missing fields.`,
      },
      {
        role: "user",
        content: `Extract apartment data from this ${source} page HTML:\n\n${cleanHtml}`,
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
