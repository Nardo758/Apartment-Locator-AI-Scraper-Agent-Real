// scraper-orchestrator/index.ts
import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { runProcessor } from './processor.ts';
import { recommendedConfig as _recommendedConfig } from "../openai_config.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Website type detection using AI
export async function detectWebsiteType(html: string, url: string): Promise<string> {
  const prompt = `Analyze this real estate website and classify its type:

URL: ${url}
HTML Sample: ${html.substring(0, 2000)}

Classify as one of these types (return only the classification):
- "property_marketing" - Single property marketing site (e.g., eloraatbuckhead.com)
- "listing_aggregator" - Multiple listings site (e.g., apartments.com, zillow.com)
- "property_manager" - Property management company with multiple properties
- "brokerage" - Real estate brokerage site
- "unknown" - Unclear or other type

Return only the classification word, nothing else.`;

  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      console.warn("OPENAI_API_KEY not set, defaulting to unknown");
      return "unknown";
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 50,
      }),
    });

    if (!response.ok) {
      console.warn(`OpenAI API error: ${response.status}, defaulting to unknown`);
      return "unknown";
    }

    const data = await response.json();
    const classification = data.choices?.[0]?.message?.content?.trim() || "unknown";

    // Validate the response is one of our expected types
    const validTypes = ["property_marketing", "listing_aggregator", "property_manager", "brokerage", "unknown"];
    return validTypes.includes(classification) ? classification : "unknown";

  } catch (error) {
    console.warn("Error detecting website type:", error);
    return "unknown";
  }
}

// Processing router for different website types
export async function processPropertyByType(url: string, html: string, websiteType: string) {
  switch(websiteType) {
    case "property_marketing":
      return await extractFromMarketingSite(html, url);

    case "listing_aggregator":
      return await extractFromAggregator(html, url);

    case "property_manager":
      return await extractFromPropertyManager(html, url);

    case "brokerage":
      return await extractFromBrokerage(html, url);

    default:
      return await extractGenericListings(html, url);
  }
}

// Extraction strategies for different website types

async function extractFromMarketingSite(html: string, url: string) {
  const prompt = `You are given the HTML content of a property marketing website. Analyze this HTML directly to extract apartment unit information.

URL: ${url}
This is a SINGLE PROPERTY marketing website. Find all available unit types, floor plans, and pricing information in the provided HTML.

Look for:
- Floor plan sections (Studio, 1-bedroom, 2-bedroom, etc.)
- Pricing tables or lists
- "Available units" or "Floor plans" sections
- Rent prices, bedroom/bathroom counts, square footage

IMPORTANT: Do NOT try to access external websites. Only analyze the HTML content provided below.

Return a JSON object with a "units" array containing all found units:
{
  "units": [
    {
      "unit_type": "Studio",
      "rent": 1800,
      "bedrooms": 0,
      "bathrooms": 1,
      "squareFeet": 600,
      "available": true
    }
  ]
}

If no units are found, return {"units": []}

HTML CONTENT:
${html.substring(0, 10000)}`;

  return await callAI(prompt);
}

async function extractFromAggregator(html: string, _url: string) {
  const prompt = `EXTRACT INDIVIDUAL APARTMENT LISTINGS from this rentals website.

This site contains MULTIPLE apartment listings. Extract each unique unit.

Return JSON array of apartments:
[{
  "title": "Luxury 2-Bedroom Apartment",
  "rent": 2500,
  "bedrooms": 2,
  "bathrooms": 2,
  "address": "123 Main St",
  "availableDate": "2024-01-15"
}]

HTML: ${html.substring(0, 12000)}`;

  return await callAI(prompt);
}

async function extractFromPropertyManager(html: string, _url: string) {
  const prompt = `EXTRACT APARTMENT LISTINGS from this property management website.

This site manages MULTIPLE PROPERTIES. Extract individual apartment units from all properties shown.

Return JSON array of apartments:
[{
  "propertyName": "Property Name",
  "title": "2 Bedroom Unit",
  "rent": 2200,
  "bedrooms": 2,
  "bathrooms": 2,
  "address": "123 Property St"
}]

HTML: ${html.substring(0, 12000)}`;

  return await callAI(prompt);
}

async function extractFromBrokerage(html: string, _url: string) {
  const prompt = `EXTRACT APARTMENT LISTINGS from this real estate brokerage website.

Look for rental listings, for-lease properties, and apartment rentals.

Return JSON array of apartments:
[{
  "title": "Downtown Apartment for Lease",
  "rent": 2800,
  "bedrooms": 2,
  "bathrooms": 2,
  "address": "456 Downtown Ave"
}]

HTML: ${html.substring(0, 12000)}`;

  return await callAI(prompt);
}

async function extractGenericListings(html: string, _url: string) {
  const prompt = `EXTRACT APARTMENT LISTINGS from this website.

Look for any rental properties, apartments, or housing listings.

Return JSON array of apartments:
[{
  "title": "Apartment Title",
  "rent": 2000,
  "bedrooms": 2,
  "bathrooms": 2,
  "address": "123 Address St"
}]

HTML: ${html.substring(0, 8000)}`;

  return await callAI(prompt);
}

// Helper function to call OpenAI
async function callAI(prompt: string) {
  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      throw new Error("OPENAI_API_KEY not set");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4-turbo-preview",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in OpenAI response");
    }

    return JSON.parse(content);
  } catch (error) {
    console.error("AI extraction error:", error);
    return { error: "Failed to extract data", details: String(error) };
  }
}

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
