// ai-scraper-worker/index.ts - Updated with Frontend Integration
import { serve } from "std/http/server.ts";
import { createClient } from '@supabase/supabase-js';

// Import concession services
import { ConcessionDetector } from '../../../src/services/enhanced-concession-detector.ts';
import { ConcessionTracker, calculateEffectiveRent } from '../../../src/services/concession-tracker.ts';

// Import data transformation functions
async function transformScrapedToFrontendFormat(scrapedData: any) {
  // Calculate AI price
  const aiPrice = await calculateAiPrice(scrapedData);
  
  // Calculate effective price with concessions
  const effectivePrice = await calculateEffectivePriceWithConcessions(scrapedData);
  
  // Extract amenities and features
  const amenities = await extractAmenities(scrapedData);
  const features = await extractFeatures(scrapedData);
  
  // Generate market intelligence
  const apartmentIqData = await generateMarketIntelligence(scrapedData);
  
  return {
    external_id: scrapedData.external_id || `scraped_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: scrapedData.name || scrapedData.title || '',
    address: scrapedData.address || '',
    city: scrapedData.city || '',
    state: scrapedData.state || '',
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
    listing_url: scrapedData.listing_url || scrapedData.url || '',
    source: scrapedData.source || 'unknown',
    status: 'active',
    first_seen_at: scrapedData.first_seen_at || new Date().toISOString(),
    last_seen_at: new Date().toISOString()
  };
}

// Helper functions
async function calculateAiPrice(scrapedData: any): Promise<number> {
  let adjustedPrice = scrapedData.current_price || 0;
  
  // Size premium
  if (scrapedData.square_feet && scrapedData.square_feet > 1000) {
    adjustedPrice *= 1.05;
  }
  
  // Luxury amenities premium (calibrated)
  const amenities = scrapedData.amenities || [];
  const luxuryAmenities = ['pool', 'gym', 'concierge', 'doorman', 'rooftop'];
  const luxuryCount = amenities.filter((a: string) => 
    luxuryAmenities.some(luxury => a.toLowerCase().includes(luxury))
  ).length;
  
  if (luxuryCount > 0) {
    adjustedPrice *= (1 + (luxuryCount * 0.015)); // Calibrated from 0.02 to 0.015
  }
  
  return Math.round(adjustedPrice);
}

async function calculateEffectivePriceWithConcessions(scrapedData: any): Promise<number> {
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

async function extractAmenities(scrapedData: any): Promise<string[]> {
  return scrapedData.amenities || [];
}

async function extractFeatures(scrapedData: any): Promise<string[]> {
  const features = [];
  
  if (scrapedData.square_feet > 1200) features.push('Spacious');
  if (scrapedData.bedrooms === 0) features.push('Studio');
  if (scrapedData.admin_fee_waived) features.push('No Admin Fee');
  if (scrapedData.free_rent_concessions) features.push('Move-in Special');
  
  return features;
}

async function extractPetPolicy(scrapedData: any): Promise<string> {
  const amenities = scrapedData.amenities || [];
  const petFriendly = amenities.some((a: string) => a.toLowerCase().includes('pet'));
  return petFriendly ? 'Pets Allowed' : 'Pet Policy Unknown';
}

async function extractParkingInfo(scrapedData: any): Promise<string> {
  const amenities = scrapedData.amenities || [];
  const hasParking = amenities.some((a: string) => a.toLowerCase().includes('parking'));
  return hasParking ? 'Parking Available' : 'Parking Information Unknown';
}

async function generateMarketIntelligence(scrapedData: any) {
  const basePrice = scrapedData.current_price || 0;
  
  let marketPosition = 'at_market';
  let demandLevel = 'medium';
  let confidenceScore = 0.75;
  
  if (basePrice > 3000) {
    marketPosition = 'above_market';
    demandLevel = 'low';
    confidenceScore = 0.8;
  } else if (basePrice < 2000) {
    marketPosition = 'below_market';
    demandLevel = 'high';
    confidenceScore = 0.85;
  }
  
  const competitivenessScore = Math.round(
    (confidenceScore * 0.5 + 
     (demandLevel === 'high' ? 0.9 : demandLevel === 'medium' ? 0.7 : 0.5) * 0.5) * 100
  );
  
  return {
    market_position: marketPosition,
    confidence_score: confidenceScore,
    price_trend: 'stable',
    demand_level: demandLevel,
    competitiveness_score: competitivenessScore,
    recommendation: `${marketPosition === 'below_market' ? 'Great value' : marketPosition === 'above_market' ? 'Premium pricing' : 'Market rate'} property`,
    last_updated: new Date().toISOString()
  };
}

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

    // Enhanced concession detection pre-scan
    const quickConcessions = ConcessionDetector.detectConcessionKeywords(htmlContent);
    const concessionContext = ConcessionDetector.extractConcessionContext(htmlContent);
    console.log(`🔍 Quick concession scan: ${quickConcessions.length} offers found`);
    console.log('🎯 Concession context:', concessionContext);

    // Enhanced Claude prompt with concession focus
    const systemPrompt = `CRITICAL: You are analyzing data DIRECTLY from the property's official website. Extract apartment rental data with SPECIAL FOCUS on concessions and free rent offers.

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

    const userMessage = `Extract apartment data from this ${source} page HTML:\n\n${htmlContent}`;

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
      max_tokens: 2000,
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

    // Attempt to parse JSON
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

    // Save to both legacy and new tables
    try {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
      const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
      
      if (SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes('demo')) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        
        // Enhanced apartment data with concession support
        const concessions = Array.isArray(result.concessions) ? result.concessions : [];
        const hasConcessions = concessions.length > 0 || result.free_rent_concessions;
        
        // Calculate effective rent
        const baseRent = result.base_rent || result.current_price;
        let effectiveRent = baseRent;
        if (hasConcessions && typeof result.free_rent_concessions === 'number') {
          effectiveRent = calculateEffectiveRent(baseRent as number, [result.free_rent_concessions.toString()]);
        }

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
          square_feet: result.square_feet,
          amenities: result.amenities,
          free_rent_concessions: result.free_rent_concessions,
          application_fee: result.application_fee,
          admin_fee_waived: result.admin_fee_waived,
          admin_fee_amount: result.admin_fee_amount,
          
          // Enhanced concession fields
          concessions_applied: hasConcessions,
          concession_details: hasConcessions ? 
            [result.free_rent_concessions, ...concessions].filter(Boolean).join(', ') : null,
          base_rent: baseRent,
          effective_rent: effectiveRent,
          net_effective_rent: effectiveRent,
          intelligence_confidence: 0.85, // Default confidence for Claude extraction
          
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

        // Save to legacy table
        const { error: apartmentError } = await supabase
          .from('apartments')
          .upsert(cleanData, { onConflict: 'external_id' });

        if (apartmentError) {
          console.error('Failed to save to apartments table:', apartmentError);
        }

        // NEW: Transform and save to frontend properties table
        const enableFrontendSync = Deno.env.get('ENABLE_FRONTEND_SYNC') === 'true';
        if (enableFrontendSync) {
          try {
            // Transform scraped data to frontend format
            const scrapedForTransform = {
              ...result,
              external_id: external_id || apartmentData.external_id,
              listing_url: source_url || url,
              source: source
            };
            
            const frontendProperty = await transformScrapedToFrontendFormat(scrapedForTransform);
            
            // Save to frontend properties table
            const { error: propertiesError } = await supabase
              .from('properties')
              .upsert(frontendProperty, { onConflict: 'external_id' });

            if (propertiesError) {
              console.error('Failed to save to properties table:', propertiesError);
            } else {
              console.log('✅ Saved to frontend properties table:', frontendProperty.external_id);
            }
          } catch (transformError) {
            console.error('Failed to transform for frontend:', transformError);
          }
        }
      }
    } catch (saveError) {
      console.error('Error saving data:', saveError);
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
              provider: 'anthropic',
              frontend_sync: Deno.env.get('ENABLE_FRONTEND_SYNC') === 'true'
            },
          });
        }
      }
    } catch (e) {
      console.error('Failed to record scraping cost:', e);
    }

    // Enhanced response with concession information
    const concessionSummary = {
      concessions_detected: quickConcessions.length > 0,
      quick_scan_results: quickConcessions,
      concession_context: concessionContext,
      has_free_rent: result.free_rent_concessions ? true : false,
      has_concessions_array: Array.isArray(result.concessions) && result.concessions.length > 0,
      effective_rent_calculated: result.effective_rent !== result.current_price
    };

    return new Response(JSON.stringify({ 
      status: "ok", 
      data: result,
      concession_analysis: concessionSummary,
      frontend_sync: Deno.env.get('ENABLE_FRONTEND_SYNC') === 'true',
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
