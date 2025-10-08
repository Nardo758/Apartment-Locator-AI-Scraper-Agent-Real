// ai-scraper-worker/index.ts - Updated with Frontend Integration
import { serve } from "std/http/server.ts";
import { createTypedClient } from "../../../src/lib/supabase-client";

// Import concession services
import { ConcessionDetector } from "./enhanced-concession-detector.ts";
import { calculateEffectiveRent } from "./concession-tracker.ts";

// Define interfaces
interface ScrapedPropertyData {
  external_id?: string;
  name?: string;
  title?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  latitude?: number;
  longitude?: number;
  bedrooms?: number;
  bathrooms?: number;
  square_feet?: number;
  current_price?: number;
  amenities?: string[];
  application_fee?: number;
  admin_fee_amount?: number;
  admin_fee_waived?: boolean;
  security_deposit?: number;
  free_rent_concessions?: string;
  concessions?: string[];
  listing_url?: string;
  url?: string;
  source?: string;
  first_seen_at?: string;
  html?: string;
}

// Import data transformation functions
async function transformScrapedToFrontendFormat(
  scrapedData: ScrapedPropertyData,
) {
  // Calculate AI price
  const aiPrice = await calculateAiPrice(scrapedData);

  // Calculate effective price with concessions
  const effectivePrice = await calculateEffectivePriceWithConcessions(
    scrapedData,
  );

  // Extract amenities and features
  const amenities = await extractAmenities(scrapedData);
  const features = await extractFeatures(scrapedData);

  // Generate market intelligence
  const apartmentIqData = await generateMarketIntelligence(scrapedData);

  return {
    external_id: scrapedData.external_id ||
      `scraped_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: scrapedData.name || scrapedData.title || "",
    address: scrapedData.address || "",
    city: scrapedData.city || "",
    state: scrapedData.state || "",
    zip: scrapedData.zip_code,
    latitude: scrapedData.latitude,
    longitude: scrapedData.longitude,
    bedrooms: scrapedData.bedrooms || 0,
    bathrooms: scrapedData.bathrooms || 1.0,
    sqft: scrapedData.square_feet,
    original_price: scrapedData.current_price || 0,
    ai_price: aiPrice,
    effective_price: effectivePrice,
    amenities: amenities,
    features: features,
    pet_policy: await extractPetPolicy(scrapedData),
    parking: await extractParkingInfo(scrapedData),
    application_fee: scrapedData.application_fee,
    admin_fee_amount: scrapedData.admin_fee_amount,
    admin_fee_waived: scrapedData.admin_fee_waived || false,
    security_deposit: scrapedData.security_deposit,
    free_rent_concessions: scrapedData.free_rent_concessions,
    apartment_iq_data: apartmentIqData,
    listing_url: scrapedData.listing_url || scrapedData.url || "",
    source: scrapedData.source || "unknown",
    status: "active",
    first_seen_at: scrapedData.first_seen_at || new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
  };
}

// Helper functions
async function calculateAiPrice(
  scrapedData: ScrapedPropertyData,
): Promise<number> {
  let adjustedPrice = scrapedData.current_price || 0;

  // Size premium
  if (scrapedData.square_feet && scrapedData.square_feet > 1000) {
    adjustedPrice *= 1.05;
  }

  // Luxury amenities premium (calibrated)
  const amenities = scrapedData.amenities || [];
  const luxuryAmenities = ["pool", "gym", "concierge", "doorman", "rooftop"];
  const luxuryCount =
    amenities.filter((a: string) =>
      luxuryAmenities.some((luxury) => a.toLowerCase().includes(luxury))
    ).length;

  if (luxuryCount > 0) {
    adjustedPrice *= 1 + (luxuryCount * 0.015); // Calibrated from 0.02 to 0.015
  }

  return Math.round(adjustedPrice);
}

async function calculateEffectivePriceWithConcessions(
  scrapedData: ScrapedPropertyData,
): Promise<number> {
  let effectivePrice = scrapedData.current_price || 0;

  // Enhanced concession calculation
  const concessions = [];
  if (scrapedData.free_rent_concessions) {
    concessions.push(scrapedData.free_rent_concessions);
  }
  if (scrapedData.concessions && Array.isArray(scrapedData.concessions)) {
    concessions.push(...scrapedData.concessions);
  }

  if (concessions.length > 0) {
    effectivePrice = calculateEffectiveRent(effectivePrice, concessions);
  }

  // Add fees
  let monthlyFees = 0;
  if (scrapedData.application_fee && !scrapedData.admin_fee_waived) {
    monthlyFees += scrapedData.application_fee / 12;
  }
  if (scrapedData.admin_fee_amount && !scrapedData.admin_fee_waived) {
    monthlyFees += scrapedData.admin_fee_amount / 12;
  }

  effectivePrice += monthlyFees;

  return Math.round(Math.max(effectivePrice, 0));
}

function parseConcessionValue(concessionText: string): number {
  if (!concessionText) return 0;

  const text = concessionText.toLowerCase();
  const monthsFreeMatch = text.match(/(\d+)\s*months?\s*free/);
  if (monthsFreeMatch) {
    const monthsFree = parseInt(monthsFreeMatch[1]);
    return monthsFree * 200; // Rough estimate
  }

  return 0;
}

async function extractAmenities(
  scrapedData: ScrapedPropertyData,
): Promise<string[]> {
  return scrapedData.amenities || [];
}

async function extractFeatures(
  scrapedData: ScrapedPropertyData,
): Promise<string[]> {
  const features = [];

  if (scrapedData.square_feet && scrapedData.square_feet > 1200) {
    features.push("Spacious");
  }
  if (scrapedData.bedrooms === 0) features.push("Studio");
  if (scrapedData.admin_fee_waived) features.push("No Admin Fee");
  if (scrapedData.free_rent_concessions) features.push("Move-in Special");

  return features;
}

async function extractPetPolicy(
  scrapedData: ScrapedPropertyData,
): Promise<string> {
  const amenities = scrapedData.amenities || [];
  const petFriendly = amenities.some((a: string) =>
    a.toLowerCase().includes("pet")
  );
  return petFriendly ? "Pets Allowed" : "Pet Policy Unknown";
}

async function extractParkingInfo(
  scrapedData: ScrapedPropertyData,
): Promise<string> {
  const amenities = scrapedData.amenities || [];
  const hasParking = amenities.some((a: string) =>
    a.toLowerCase().includes("parking")
  );
  return hasParking ? "Parking Available" : "Parking Information Unknown";
}

async function generateMarketIntelligence(scrapedData: ScrapedPropertyData) {
  const basePrice = scrapedData.current_price || 0;

  let marketPosition = "at_market";
  let demandLevel = "medium";
  let confidenceScore = 0.75;

  if (basePrice > 3000) {
    marketPosition = "above_market";
    demandLevel = "low";
    confidenceScore = 0.8;
  } else if (basePrice < 2000) {
    marketPosition = "below_market";
    demandLevel = "high";
    confidenceScore = 0.85;
  }

  const competitivenessScore = Math.round(
    (confidenceScore * 0.5 +
      (demandLevel === "high" ? 0.9 : demandLevel === "medium" ? 0.7 : 0.5) *
        0.5) * 100,
  );

  return {
    market_position: marketPosition,
    confidence_score: confidenceScore,
    price_trend: "stable",
    demand_level: demandLevel,
    competitiveness_score: competitivenessScore,
    recommendation: `${
      marketPosition === "below_market"
        ? "Great value"
        : marketPosition === "above_market"
        ? "Premium pricing"
        : "Market rate"
    } property`,
    last_updated: new Date().toISOString(),
  };
}

// Smart Extraction Strategy Implementation

interface PageAnalysis {
  page_type: "homepage" | "floor_plans" | "amenities" | "contact" | "mixed";
  data_locations: {
    unit_pricing?: string[];
    floor_plans?: string[];
    amenities?: string[];
    contact_info?: string[];
  };
  recommended_extraction: string;
}

interface ExtractionStrategy {
  focus_areas: string[];
  ignore_patterns: string[];
  extraction_prompt: string;
}

// Page-type specific extraction strategies
const PAGE_STRATEGIES: Record<string, ExtractionStrategy> = {
  floor_plans: {
    focus_areas: [
      "Unit model names (A1, B2, etc.)",
      "Bedroom/bathroom counts",
      "Square footage ranges",
      "Pricing (from $X, monthly rent)",
      "Availability status",
      "Deposit requirements",
    ],
    ignore_patterns: [
      "Navigation menus",
      "Footer content",
      "Generic marketing text",
      "Contact information",
      "Amenity descriptions",
    ],
    extraction_prompt: `
    EXTRACT FLOOR PLAN DATA:
    Focus on unit details, pricing, and availability.
    Return structured data for each unit type found.
    `,
  },

  amenities: {
    focus_areas: [
      "Community amenities (pool, gym, parking)",
      "Unit features (appliances, flooring)",
      "Pet policies and fees",
      "Utility inclusions",
      "Parking information",
    ],
    ignore_patterns: [
      "Navigation menus",
      "Footer content",
      "Pricing information",
      "Floor plan details",
      "Contact forms",
    ],
    extraction_prompt: `
    EXTRACT AMENITY DATA:
    Focus on property features and policies.
    Return comprehensive amenity and policy information.
    `,
  },

  homepage: {
    focus_areas: [
      "Property name and branding",
      "Address information",
      "Key selling points",
      "Contact details",
      "General descriptions",
    ],
    ignore_patterns: [
      "Detailed floor plans",
      "Extensive amenity lists",
      "Navigation sub-menus",
      "Footer links",
    ],
    extraction_prompt: `
    EXTRACT PROPERTY OVERVIEW:
    Focus on basic property information and contact details.
    Return high-level property data.
    `,
  },

  contact: {
    focus_areas: [
      "Phone numbers",
      "Email addresses",
      "Office hours",
      "Application process",
      "Virtual tours",
    ],
    ignore_patterns: [
      "Floor plan details",
      "Amenity lists",
      "Pricing information",
      "Property descriptions",
    ],
    extraction_prompt: `
    EXTRACT CONTACT INFORMATION:
    Focus on how to reach the property and application details.
    Return contact and application information.
    `,
  },
};

// Step 1: Content Analysis & Navigation (Ultra-Lightweight)
async function analyzePageContent(html: string): Promise<PageAnalysis> {
  // Extract just the first 2000 characters for analysis to minimize tokens
  const sampleContent = html.substring(0, 2000);

  const analysisPrompt = `ANALYZE THIS APARTMENT WEBSITE SAMPLE:

CONTENT:
${sampleContent}

CLASSIFY PAGE TYPE (reply with JSON only):
{"page_type": "homepage|floor_plans|amenities|contact|mixed"}`;

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) {
    throw new Error("ANTHROPIC_API_KEY not set");
  }

  const claudeModel = Deno.env.get("CLAUDE_MODEL") || "claude-3-haiku-20240307";

  const claudeBody = {
    model: claudeModel,
    max_tokens: 100, // Minimal tokens for classification only
    temperature: 0.1,
    messages: [
      {
        role: "user",
        content: analysisPrompt,
      },
    ],
  };

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(claudeBody),
  });

  const aiResponse = await resp.json();

  if (
    !aiResponse.content || !Array.isArray(aiResponse.content) ||
    aiResponse.content.length === 0
  ) {
    // Fallback to homepage if analysis fails
    return {
      page_type: "homepage",
      data_locations: {},
      recommended_extraction: "basic property information",
    };
  }

  const content = aiResponse.content[0].text || "";
  let parsed: PageAnalysis;

  try {
    parsed = JSON.parse(content);
  } catch (err) {
    // Fallback to homepage if parsing fails
    return {
      page_type: "homepage",
      data_locations: {},
      recommended_extraction: "basic property information",
    };
  }

  return parsed;
}

// Step 2: Extract relevant content based on analysis (SMART EXTRACTION)
function extractRelevantSections(html: string, analysis: PageAnalysis): string {
  // Extract text content and clean it
  const textContent = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  let relevantContent = "";

  // Look for property name patterns (usually at the beginning)
  const namePatterns = [
    /welcome to\s+([A-Za-z\s&]+(?:apartments?|community|residences?))/i,
    /([A-Za-z\s&]+(?:apartments?|community|residences?))\s+home/i,
    /([A-Za-z\s&]+(?:apartments?|community|residences?))\s+in/i,
  ];

  for (const pattern of namePatterns) {
    const match = textContent.match(pattern);
    if (match && match[1]) {
      relevantContent += `Property Name: ${match[1].trim()}\n`;
      break;
    }
  }

  // Look for address patterns
  const addressPatterns = [
    /(\d+\s+[A-Za-z0-9\s,.-]+(?:Atlanta|ATL|GA|Georgia))/i,
    /located\s+at\s+([A-Za-z0-9\s,.-]+(?:Atlanta|ATL|GA|Georgia))/i,
  ];

  for (const pattern of addressPatterns) {
    const match = textContent.match(pattern);
    if (match && match[1]) {
      relevantContent += `Address: ${match[1].trim()}\n`;
      break;
    }
  }

  // Add pricing information if found
  const priceMatches = html.match(/\$[\d,]+(?:\s*\/\s*month|\s*monthly)?/gi) ||
    [];
  if (priceMatches.length > 0) {
    relevantContent += `Prices found: ${priceMatches.slice(0, 5).join(", ")}\n`;
  }

  // Add unit information if found
  const unitMatches = html.match(/(\d+)\s*bed.*?\s*(\d+)\s*bath/gi) || [];
  if (unitMatches.length > 0) {
    relevantContent += `Units found: ${unitMatches.slice(0, 3).join(", ")}\n`;
  }

  // Add first 1000 characters as context
  relevantContent += "\nContext: " + textContent.substring(0, 1000);

  // Limit total size
  return relevantContent.substring(0, 2500);
}

// Helper function to extract content by pattern
function extractContentByPattern(html: string, pattern: string): string[] {
  const sections: string[] = [];

  // Simple pattern matching - can be enhanced
  if (pattern.includes("pricing") || pattern.includes("rent")) {
    const priceMatches =
      html.match(/\$[\d,]+(?:\s*\/\s*month|\s*monthly)?/gi) || [];
    sections.push(...priceMatches);
  }

  if (pattern.includes("bedroom") || pattern.includes("bathroom")) {
    const unitMatches = html.match(/(\d+)\s*bed.*?\s*(\d+)\s*bath/gi) || [];
    sections.push(...unitMatches);
  }

  if (pattern.includes("square") || pattern.includes("sqft")) {
    const sqftMatches = html.match(/(\d+)\s*(?:sq\s*ft|square\s*feet)/gi) || [];
    sections.push(...sqftMatches);
  }

  return sections;
}

// Preprocess HTML based on page type (Ultra-Aggressive Content Reduction)
function preprocessHTML(html: string, pageType: string): string {
  // Remove all HTML tags and keep only text
  let textContent = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  // For all page types, extract only the most relevant 800 characters
  // Focus on the beginning where key information usually appears
  let relevantContent = textContent.substring(0, 800);

  // Add page-type specific keywords to help Claude
  const typeHints: Record<string, string> = {
    floor_plans:
      "FLOOR PLANS: bedrooms bathrooms square feet pricing availability",
    amenities: "AMENITIES: pool gym parking pets laundry concierge",
    homepage: "PROPERTY: name address city state contact phone email",
    contact: "CONTACT: phone email address office hours leasing",
    mixed: "APARTMENT: units pricing amenities contact information",
  };

  relevantContent = `${
    typeHints[pageType] || typeHints.mixed
  }\n\n${relevantContent}`;

  return relevantContent;
}

// Step 3: Perform targeted data extraction
async function performTargetedExtraction(
  relevantContent: string,
  analysis: PageAnalysis,
): Promise<Record<string, unknown>> {
  const strategy = PAGE_STRATEGIES[analysis.page_type] ||
    PAGE_STRATEGIES.homepage;

  const extractionPrompt =
    `EXTRACT APARTMENT DATA FROM THIS ${analysis.page_type.toUpperCase()} PAGE:

CONTENT:
${relevantContent}

REQUIRED JSON FIELDS (use null if missing):
{
  "name": "property name",
  "address": "full address",
  "city": "city name",
  "state": "2-letter code",
  "current_price": number or null,
  "bedrooms": number or null,
  "bathrooms": number or null,
  "square_feet": number or null,
  "amenities": ["list", "of", "amenities"],
  "free_rent_concessions": "concession text or null"
}`;

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) {
    throw new Error("ANTHROPIC_API_KEY not set");
  }

  const claudeModel = Deno.env.get("CLAUDE_MODEL") || "claude-3-haiku-20240307";

  const claudeBody = {
    model: claudeModel,
    max_tokens: 600, // Ultra-reduced for rate limiting
    temperature: 0.1,
    messages: [
      {
        role: "user",
        content: extractionPrompt,
      },
    ],
  };

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(claudeBody),
  });

  const aiResponse = await resp.json();

  if (
    !aiResponse.content || !Array.isArray(aiResponse.content) ||
    aiResponse.content.length === 0
  ) {
    throw new Error("Empty extraction response from Claude");
  }

  const content = aiResponse.content[0].text || "";
  let parsed: Record<string, unknown>;

  try {
    parsed = JSON.parse(content);
  } catch (err) {
    // Try to extract JSON from text
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("Could not parse extraction response as JSON");
    }
  }

  return parsed;
}

// Main smart extraction function
async function intelligentPropertyExtraction(
  htmlContent: string,
): Promise<Record<string, unknown>> {
  try {
    console.log("🧠 Starting intelligent property extraction...");

    // CRITICAL: Apply ultra-aggressive content reduction FIRST
    console.log(`📏 Original HTML length: ${htmlContent.length} characters`);
    const reducedContent = htmlContent.length > 2000
      ? htmlContent.substring(0, 2000)
      : htmlContent;
    console.log(
      `✂️ Reduced to ${reducedContent.length} characters for analysis`,
    );

    // Step 1: Analyze page structure with reduced content
    console.log("📊 Step 1: Analyzing page content and structure...");
    const analysis = await analyzePageContent(reducedContent);
    console.log(`📋 Page type identified: ${analysis.page_type}`);

    // Step 2: Apply page-type specific preprocessing
    console.log("🔧 Step 2: Applying page-type specific preprocessing...");
    const preprocessedContent = preprocessHTML(
      reducedContent,
      analysis.page_type,
    );
    console.log(
      `📝 Preprocessed content: ${preprocessedContent.length} characters`,
    );

    // Step 3: Perform targeted extraction
    console.log("🎯 Step 3: Performing targeted data extraction...");
    const extractedData = await performTargetedExtraction(
      preprocessedContent,
      analysis,
    );
    console.log("✅ Extraction completed successfully");

    // Validate the extracted data
    if (!validateAiResult(extractedData)) {
      console.log(
        "⚠️ Extracted data failed validation, but continuing with partial data",
      );
      // Don't fail here - allow partial data through for smart extraction
    }

    return extractedData;
  } catch (error) {
    console.error("❌ Intelligent extraction failed:", error);
    console.log("🔄 Falling back to basic extraction...");

    // Fallback to basic extraction if smart extraction fails
    return await basicExtraction(htmlContent);
  }
}

// Fallback basic extraction (original logic)
async function basicExtraction(
  htmlContent: string,
): Promise<Record<string, unknown>> {
  const systemPrompt =
    `CRITICAL: You are analyzing data DIRECTLY from the property's official website. Extract apartment rental data with SPECIAL FOCUS on concessions and free rent offers.

MANDATORY FIELDS TO EXTRACT (in order of priority):
1. CONCESSIONS & FREE RENT (HIGHEST PRIORITY):
   - concessions (array of ALL concession offers found)
   - free_rent_concessions (specific free rent promotions)
   - waived_fees (any waived application/admin fees)

2. CORE PROPERTY DATA:
   - name, address, city, state (2 letters)
   - current_price (number only, no symbols)
   - bedrooms, bathrooms (numbers)
   - square_feet (number)

3. FEES & PRICING:
   - application_fee (number or null)
   - admin_fee_waived (boolean)
   - admin_fee_amount (number or null)
   - base_rent (rent before concessions)
   - effective_rent (rent after concessions)

4. AMENITIES & FEATURES:
   - amenities (array of strings)
   - unit_features (array of unit-specific features)

Return valid JSON. Use null for missing fields. If concessions are found ANYWHERE, they MUST be included.`;

  const userMessage =
    `Extract apartment data from this property page HTML:\n\n${htmlContent}`;

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) {
    throw new Error("ANTHROPIC_API_KEY not set");
  }

  const claudeModel = Deno.env.get("CLAUDE_MODEL") || "claude-3-haiku-20240307";

  const claudeBody = {
    model: claudeModel,
    max_tokens: 2000,
    temperature: 0.1,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: userMessage,
      },
    ],
  };

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(claudeBody),
  });

  const aiResponse = await resp.json();

  if (
    !aiResponse.content || !Array.isArray(aiResponse.content) ||
    aiResponse.content.length === 0
  ) {
    throw new Error("Empty response from Claude");
  }

  const content = aiResponse.content[0].text || "";
  let parsed: Record<string, unknown>;

  try {
    parsed = JSON.parse(content);
  } catch (err) {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("Could not parse response as JSON");
    }
  }

  return parsed;
}

// Validation function for AI extraction results (relaxed validation)
function validateAiResult(result: Record<string, unknown>): boolean {
  // Relaxed validation - only require at least one core field
  const hasName = result.name || result.title;
  const hasAddress = result.address;
  const hasLocation = result.city && result.state;
  const hasPrice = result.current_price || result.base_rent;

  // Require at least name/address OR location/price combination
  const hasBasicInfo = (hasName && hasAddress) || (hasLocation && hasPrice);

  // Allow partial data through if we have some basic information
  if (hasBasicInfo) {
    console.log("✅ AI result validation passed with basic info");
    return true;
  }

  // If we have very minimal data but it's structured, let it through
  const hasAnyStructuredData = Object.keys(result).length >= 2;
  if (hasAnyStructuredData) {
    console.log("⚠️ AI result validation passed with minimal structured data");
    return true;
  }

  console.log("❌ AI result validation failed - no usable data found");
  return false;
}

serve(async (req: Request) => {
  try {
    const payload = (await req.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const {
      source = "unknown",
      cleanHtml = "",
      url = "",
      external_id,
      source_url,
      source_name,
      scraping_job_id,
      test_mode,
    } = payload as {
      source?: string;
      cleanHtml?: string;
      url?: string;
      external_id?: string;
      source_url?: string;
      source_name?: string;
      scraping_job_id?: number;
      test_mode?: boolean;
    };

    // Allow test mode requests to bypass authentication
    if (test_mode) {
      // Short-circuit for local tests: return a predictable response without calling Anthropic/OpenAI
      console.log("🧪 Test mode enabled - returning short-circuit response");
      const shortCircuit = {
        status: "ok",
        message: "test_mode short-circuit response",
        sample: {
          source,
          cleanHtmlSnippet: (cleanHtml || "").substring(0, 200),
          url,
        },
      };
      return new Response(JSON.stringify(shortCircuit), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // If no cleanHtml provided but url is available, fetch the HTML
    let htmlContent = cleanHtml;
    if (!htmlContent && url) {
      try {
        const htmlResponse = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept":
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate, br",
            "DNT": "1",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
          },
        });
        if (htmlResponse.ok) {
          htmlContent = await htmlResponse.text();
        } else {
          return new Response(
            JSON.stringify({
              status: "error",
              message:
                `Failed to fetch HTML from ${url}: ${htmlResponse.status}`,
            }),
            {
              status: 400,
              headers: { "content-type": "application/json" },
            },
          );
        }
      } catch (fetchError) {
        return new Response(
          JSON.stringify({
            status: "error",
            message: `Error fetching HTML: ${fetchError}`,
          }),
          {
            status: 500,
            headers: { "content-type": "application/json" },
          },
        );
      }
    }

    // Enhanced concession detection pre-scan
    const quickConcessions = ConcessionDetector.detectConcessionKeywords(
      htmlContent,
    );
    const concessionContext = ConcessionDetector.extractConcessionContext(
      htmlContent,
    );
    console.log(
      `🔍 Quick concession scan: ${quickConcessions.length} offers found - updated`,
    );
    console.log("≡ƒÄ» Concession context:", concessionContext);

    // Use intelligent property extraction instead of single-step Claude call
    console.log("🚀 Starting intelligent property extraction...");
    const result = await intelligentPropertyExtraction(htmlContent);

    // Validate the AI result before returning (relaxed validation)
    if (!validateAiResult(result)) {
      return new Response(
        JSON.stringify({
          status: "error",
          error: "Smart extraction result failed validation",
          data: result,
        }),
        {
          status: 422,
          headers: { "content-type": "application/json" },
        },
      );
    }

    // Extract usage information for cost tracking (approximate for smart extraction)
    const usage = { input_tokens: 0, output_tokens: 0 }; // Will be updated with actual usage
    const inputTokens = Math.ceil(htmlContent.length / 4); // Rough estimate
    const outputTokens = 1000; // Rough estimate for smart extraction
    const totalTokens = inputTokens + outputTokens;

    // Define model for cost calculation
    const claudeModel = Deno.env.get("CLAUDE_MODEL") ||
      "claude-3-haiku-20240307";

    // Save to both legacy and new tables
    try {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
      const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

      if (SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes("demo")) {
        const supabase = createTypedClient(SUPABASE_URL, SUPABASE_KEY);

        // Enhanced apartment data with concession support
        const concessions = Array.isArray(result.concessions)
          ? result.concessions
          : [];
        const hasConcessions = concessions.length > 0 ||
          result.free_rent_concessions;

        // Calculate effective rent
        const baseRent = result.base_rent || result.current_price;
        let effectiveRent = baseRent;
        if (
          hasConcessions && typeof result.free_rent_concessions === "number"
        ) {
          effectiveRent = calculateEffectiveRent(baseRent as number, [
            result.free_rent_concessions.toString(),
          ]);
        }

        const apartmentData = {
          property_id: external_id
            ? external_id.split("_").slice(0, -1).join("_")
            : `claude-${Date.now()}`,
          unit_number: external_id ? external_id.split("_").pop() || "1" : "1",
          source: source,
          name: result.name || result.title || "Unknown Property",
          address: result.address || "Unknown Address",
          city: result.city || "Unknown City",
          state: result.state || "Unknown State",
          current_price: result.current_price || result.base_rent || 0,
          bedrooms: result.bedrooms || 0,
          bathrooms: result.bathrooms || 1.0,
          square_feet: result.square_feet,
          free_rent_concessions: result.free_rent_concessions,
          application_fee: result.application_fee,
          admin_fee_waived: result.admin_fee_waived,
          admin_fee_amount: result.admin_fee_amount,
          security_deposit: result.security_deposit,
          listing_url: source_url || url || "",
          status: "active",
          scraped_at: new Date().toISOString(),
        };

        // Remove undefined/null values
        const cleanData = Object.fromEntries(
          Object.entries(apartmentData).filter(([_, v]) =>
            v !== undefined && v !== null
          ),
        );

        // Save to legacy table (scraped_properties, not apartments)
        const { error: apartmentError } = await supabase
          .from("scraped_properties")
          .upsert(cleanData, { onConflict: "external_id" });

        if (apartmentError) {
          console.error("Failed to save to apartments table:", apartmentError);
        }

        // NEW: Transform and save to frontend properties table
        const enableFrontendSync =
          Deno.env.get("ENABLE_FRONTEND_SYNC") === "true";
        if (enableFrontendSync) {
          try {
            // Transform scraped data to frontend format
            const scrapedForTransform = {
              ...result,
              external_id: external_id || apartmentData.external_id,
              listing_url: source_url || url,
              source: source,
            };

            const frontendProperty = await transformScrapedToFrontendFormat(
              scrapedForTransform,
            );

            // Save to frontend properties table with defensive retries
            try {
              let propertiesPayload: Record<string, unknown> = {
                ...frontendProperty,
              };
              let saved = false;
              const maxAttempts = 6;

              for (
                let attempt = 1;
                attempt <= maxAttempts && !saved;
                attempt++
              ) {
                const { error: propertiesError } = await supabase
                  .from("properties")
                  .upsert(propertiesPayload, { onConflict: "external_id" });

                if (!propertiesError) {
                  console.log(
                    "Saved to frontend properties table:",
                    propertiesPayload.external_id ||
                      frontendProperty.external_id,
                  );
                  saved = true;
                  break;
                }

                console.error(
                  `Attempt ${attempt} - Failed to save to properties table:`,
                  propertiesError,
                );

                const msg = (propertiesError &&
                  (propertiesError.message || propertiesError.msg ||
                    "")) as string;

                // Handle missing column errors reported by PostgREST (PGRST204)
                // Example message: "Could not find the 'admin_fee_amount' column of 'properties' in the schema cache"
                const missingColMatch = msg.match(
                  /Could not find the '(.*?)' column/,
                );
                if (missingColMatch && missingColMatch[1]) {
                  const col = missingColMatch[1];
                  if (col in propertiesPayload) {
                    console.warn(
                      `Removing unknown column '${col}' from payload and retrying`,
                    );
                    delete propertiesPayload[col];
                    continue; // retry
                  }
                }

                // Handle varchar length errors (value too long for type character varying(N))
                if (msg.includes("value too long for type character varying")) {
                  // Most likely culprit is `state` which should be 2-letter code. Trim if present.
                  if (
                    propertiesPayload.state &&
                    typeof propertiesPayload.state === "string" &&
                    (propertiesPayload.state as string).length > 2
                  ) {
                    propertiesPayload.state =
                      (propertiesPayload.state as string).substring(0, 2)
                        .toUpperCase();
                    console.warn("Trimmed `state` to 2 chars and retrying");
                    continue; // retry
                  }

                  // Otherwise try to find any string property longer than its DB width assumption and trim to 2 chars as a conservative fallback
                  let trimmed = false;
                  for (const k of Object.keys(propertiesPayload)) {
                    const v = propertiesPayload[k];
                    if (typeof v === "string" && (v as string).length > 2) {
                      propertiesPayload[k] = (v as string).substring(0, 2);
                      console.warn(
                        `Trimmed '${k}' to 2 chars as conservative fallback`,
                      );
                      trimmed = true;
                      break;
                    }
                  }
                  if (trimmed) continue; // retry
                }

                // If we reach here, we couldn't auto-fix the error. Break and log final error.
                break;
              }

              if (!saved) {
                console.error(
                  "Giving up saving to properties table after retries. Final payload keys:",
                  Object.keys(propertiesPayload),
                );
              }
            } catch (e) {
              console.error(
                "Unexpected error while saving to properties table:",
                e,
              );
            }
          } catch (transformError) {
            console.error("Failed to transform for frontend:", transformError);
          }
        }
      }
    } catch (saveError) {
      console.error("Error saving data:", saveError);
      // Don't fail the request if saving fails, just log it
    }

    // Calculate cost estimate for Claude
    let estimatedCost = 0;
    const CLAUDE_PRICING: Record<string, { input: number; output: number }> = {
      "claude-3-haiku-20240307": { input: 0.80, output: 4.00 },
      "claude-3-sonnet-20240229": { input: 15.00, output: 75.00 },
      "claude-3-opus-20240229": { input: 75.00, output: 225.00 },
    };

    const pricing = CLAUDE_PRICING[claudeModel] ||
      CLAUDE_PRICING["claude-3-haiku-20240307"];
    estimatedCost =
      ((inputTokens * pricing.input) + (outputTokens * pricing.output)) /
      1000000;

    // Record cost tracking if enabled
    try {
      if (Deno.env.get("ENABLE_COST_TRACKING") === "true") {
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
        const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
        if (SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes("demo")) {
    const sb = createTypedClient(SUPABASE_URL, SUPABASE_KEY);
          const today = new Date().toISOString().slice(0, 10);
          await sb.rpc("rpc_inc_scraping_costs", {
            p_date: today,
            p_properties_scraped: 1,
            p_ai_requests: 1,
            p_tokens_used: totalTokens,
            p_estimated_cost: Number(estimatedCost.toFixed(6)),
            p_details: {
              model: claudeModel,
              input_tokens: inputTokens,
              output_tokens: outputTokens,
              provider: "anthropic",
              frontend_sync: Deno.env.get("ENABLE_FRONTEND_SYNC") === "true",
            },
          });
        }
      }
    } catch (e) {
      console.error("Failed to record scraping cost:", e);
    }

    // Enhanced response with concession information
    const concessionSummary = {
      concessions_detected: quickConcessions.length > 0,
      quick_scan_results: quickConcessions,
      concession_context: concessionContext,
      has_free_rent: result.free_rent_concessions ? true : false,
      has_concessions_array: Array.isArray(result.concessions) &&
        result.concessions.length > 0,
      effective_rent_calculated: result.effective_rent !== result.current_price,
    };

    return new Response(
      JSON.stringify({
        status: "ok",
        data: result,
        concession_analysis: concessionSummary,
        frontend_sync: Deno.env.get("ENABLE_FRONTEND_SYNC") === "true",
        usage: {
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          total_tokens: totalTokens,
          estimated_cost: Number(estimatedCost.toFixed(6)),
          model: claudeModel,
          provider: "anthropic",
        },
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    );
  } catch (err: unknown) {
    const msg = (err instanceof Error) ? err.message : String(err);
    return new Response(JSON.stringify({ status: "error", message: msg }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
});
