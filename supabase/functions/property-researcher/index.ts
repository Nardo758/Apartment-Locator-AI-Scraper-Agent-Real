// Enhanced Property Researcher with Claude Intelligence and Caching
// supabase/functions/property-researcher/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

interface PropertyIntelligence {
  property_name: string;
  year_built?: number;
  unit_count?: number;
  property_type?: string;
  building_type?: string;
  amenities?: string[];
  neighborhood?: string;
  transit_access?: string;
  walk_score?: number;
  confidence_score: number;
  research_source: string;
  raw_research_data: Record<string, any>;
}

interface ClaudeResponse {
  property_analysis: {
    property_name: string;
    year_built?: number;
    unit_count?: number;
    building_type?: string;
    amenities?: string[];
    neighborhood?: string;
    transit_access?: string;
    walk_score?: number;
    confidence: number;
  };
  reasoning: string;
}

serve(async (req: Request) => {
  try {
    console.log('🧠 Property researcher started');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    // Parse request
    const {
      property_source_id,
      url,
      property_name,
      mode = 'single_analysis',
      batch_size = 20,
      force_refresh = false
    } = await req.json();

    console.log(`📋 Research mode: ${mode}, Property: ${property_name || 'batch'}`);

    let results: any[] = [];
    let totalCost = 0;

    if (mode === 'batch_analysis') {
      // Batch analysis of properties needing intelligence
      const properties = await getPropertiesNeedingIntelligence(supabase, batch_size);
      console.log(`🔍 Found ${properties.length} properties needing intelligence`);
      
      for (const property of properties) {
        try {
          const result = await analyzePropertyWithClaude(
            supabase,
            property,
            anthropicKey,
            force_refresh
          );
          results.push(result);
          totalCost += result.cost || 0;
          
          // Rate limiting
          await sleep(1000);
          
        } catch (error) {
          console.error(`❌ Error analyzing ${property.url}:`, error);
          results.push({
            url: property.url,
            success: false,
            error: error.message,
            cost: 0
          });
        }
      }
      
    } else if (mode === 'enhance_existing' && property_source_id) {
      // Enhance existing property source with intelligence
      const result = await enhancePropertySource(
        supabase,
        property_source_id,
        url,
        property_name,
        anthropicKey,
        force_refresh
      );
      results.push(result);
      totalCost += result.cost || 0;
      
    } else if (url && property_name) {
      // Single property analysis
      const result = await analyzePropertyWithClaude(
        supabase,
        { url, property_name },
        anthropicKey,
        force_refresh
      );
      results.push(result);
      totalCost += result.cost || 0;
    } else {
      throw new Error('Invalid request parameters');
    }

    // Record cost
    if (totalCost > 0) {
      await recordResearchCost(supabase, totalCost, {
        mode,
        properties_analyzed: results.length,
        successful: results.filter(r => r.success).length
      });
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Research complete: ${successCount}/${results.length} successful, $${totalCost} cost`);

    return new Response(JSON.stringify({
      success: true,
      mode,
      results: results,
      summary: {
        total_analyzed: results.length,
        successful: successCount,
        failed: results.length - successCount,
        total_cost: totalCost
      },
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('❌ Property researcher error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

async function getPropertiesNeedingIntelligence(
  supabase: any,
  batchSize: number
): Promise<any[]> {
  // Get property sources that haven't been analyzed by Claude or need refresh
  const { data, error } = await supabase
    .from('property_sources')
    .select('id, url, property_name, website_name, region, metadata')
    .eq('is_active', true)
    .or('claude_analyzed.is.null,claude_analyzed.eq.false,intelligence_last_updated.lt.' + 
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // 7 days old
    .order('priority', { ascending: false })
    .limit(batchSize);

  if (error) {
    console.error('Error getting properties needing intelligence:', error);
    return [];
  }

  return data || [];
}

async function analyzePropertyWithClaude(
  supabase: any,
  property: any,
  anthropicKey: string,
  forceRefresh: boolean = false
): Promise<any> {
  try {
    // Check cache first unless force refresh
    if (!forceRefresh) {
      const cached = await getCachedIntelligence(supabase, property.url);
      if (cached && cached.confidence_score >= 75) {
        console.log(`📚 Using cached intelligence for ${property.property_name}`);
        return {
          url: property.url,
          success: true,
          cached: true,
          intelligence: cached,
          cost: 0
        };
      }
    }

    console.log(`🔍 Analyzing ${property.property_name} with Claude`);

    // Fetch property webpage
    const htmlContent = await fetchPropertyHTML(property.url);
    if (!htmlContent) {
      throw new Error('Could not fetch property webpage');
    }

    // Analyze with Claude
    const intelligence = await callClaudeForPropertyAnalysis(
      anthropicKey,
      property.url,
      property.property_name,
      htmlContent
    );

    // Store intelligence in database
    await storePropertyIntelligence(supabase, property.url, intelligence);

    // Update property source with intelligence flags
    if (property.id) {
      await supabase
        .from('property_sources')
        .update({
          claude_analyzed: true,
          claude_confidence: intelligence.confidence_score,
          intelligence_last_updated: new Date().toISOString()
        })
        .eq('id', property.id);
    }

    return {
      url: property.url,
      success: true,
      cached: false,
      intelligence: intelligence,
      cost: 0.015 // Estimated cost for Claude analysis
    };

  } catch (error) {
    console.error(`❌ Error analyzing ${property.url}:`, error);
    return {
      url: property.url,
      success: false,
      error: error.message,
      cost: 0
    };
  }
}

async function enhancePropertySource(
  supabase: any,
  propertySourceId: number,
  url: string,
  propertyName: string,
  anthropicKey: string,
  forceRefresh: boolean = false
): Promise<any> {
  try {
    // Get existing apartments for this property source
    const { data: apartments } = await supabase
      .from('scraped_properties')
      .select('*')
      .eq('property_source_id', propertySourceId)
      .limit(10);

    if (!apartments || apartments.length === 0) {
      return await analyzePropertyWithClaude(
        supabase,
        { url, property_name: propertyName },
        anthropicKey,
        forceRefresh
      );
    }

    // Analyze the property and enhance existing apartment records
    const intelligence = await analyzePropertyWithClaude(
      supabase,
      { url, property_name: propertyName },
      anthropicKey,
      forceRefresh
    );

    if (intelligence.success && intelligence.intelligence) {
      // Update existing apartments with intelligence data
      const updateData = {
        year_built: intelligence.intelligence.year_built,
        unit_count: intelligence.intelligence.unit_count,
        building_type: intelligence.intelligence.building_type,
        neighborhood: intelligence.intelligence.neighborhood,
        transit_access: intelligence.intelligence.transit_access,
        walk_score: intelligence.intelligence.walk_score,
        intelligence_confidence: intelligence.intelligence.confidence_score,
        intelligence_source: 'claude',
        researched_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('scraped_properties')
        .update(updateData)
        .eq('property_source_id', propertySourceId);

      if (error) {
        console.error('Error updating apartments with intelligence:', error);
      } else {
        console.log(`✅ Enhanced ${apartments.length} apartments with Claude intelligence`);
      }
    }

    return {
      ...intelligence,
      apartments_enhanced: apartments.length
    };

  } catch (error) {
    console.error(`❌ Error enhancing property source ${propertySourceId}:`, error);
    return {
      property_source_id: propertySourceId,
      success: false,
      error: error.message,
      cost: 0
    };
  }
}

async function fetchPropertyHTML(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    return html.slice(0, 50000); // Limit to first 50k characters
    
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return null;
  }
}

async function callClaudeForPropertyAnalysis(
  anthropicKey: string,
  url: string,
  propertyName: string,
  htmlContent: string
): Promise<PropertyIntelligence> {
  
  const prompt = `Analyze this apartment property listing webpage and extract key property intelligence.

Property URL: ${url}
Property Name: ${propertyName}

HTML Content (first 50k chars):
${htmlContent}

Please analyze the content and provide structured data about this property. Focus on:
1. Year built (if mentioned)
2. Total number of units in the property
3. Building type (high-rise, mid-rise, garden-style, townhome, etc.)
4. Key amenities (pool, gym, parking, etc.)
5. Neighborhood name or area
6. Public transit access
7. Walkability information

Respond in JSON format:
{
  "property_analysis": {
    "property_name": "string",
    "year_built": number or null,
    "unit_count": number or null,
    "building_type": "string or null",
    "amenities": ["array", "of", "amenities"] or null,
    "neighborhood": "string or null",
    "transit_access": "string description or null",
    "walk_score": number or null,
    "confidence": number (0-100)
  },
  "reasoning": "Brief explanation of analysis and confidence level"
}

Be conservative with confidence scores. Only use high confidence (80+) when information is clearly stated.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        temperature: 0.1,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const result = await response.json();
    const content = result.content[0]?.text;
    
    if (!content) {
      throw new Error('No content in Claude response');
    }

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response');
    }

    const claudeResponse: ClaudeResponse = JSON.parse(jsonMatch[0]);
    const analysis = claudeResponse.property_analysis;

    return {
      property_name: analysis.property_name || propertyName,
      year_built: analysis.year_built,
      unit_count: analysis.unit_count,
      property_type: 'apartment', // Default for our use case
      building_type: analysis.building_type,
      amenities: analysis.amenities,
      neighborhood: analysis.neighborhood,
      transit_access: analysis.transit_access,
      walk_score: analysis.walk_score,
      confidence_score: analysis.confidence || 50,
      research_source: 'claude-3.5-sonnet',
      raw_research_data: {
        claude_response: claudeResponse,
        analysis_timestamp: new Date().toISOString(),
        url: url
      }
    };

  } catch (error) {
    console.error('Claude analysis error:', error);
    throw new Error(`Claude analysis failed: ${error.message}`);
  }
}

async function storePropertyIntelligence(
  supabase: any,
  url: string,
  intelligence: PropertyIntelligence
): Promise<void> {
  const { error } = await supabase
    .from('property_intelligence')
    .upsert({
      source_url: url,
      property_name: intelligence.property_name,
      year_built: intelligence.year_built,
      unit_count: intelligence.unit_count,
      property_type: intelligence.property_type,
      building_type: intelligence.building_type,
      amenities: intelligence.amenities,
      neighborhood: intelligence.neighborhood,
      transit_access: intelligence.transit_access,
      walk_score: intelligence.walk_score,
      confidence_score: intelligence.confidence_score,
      research_timestamp: new Date().toISOString(),
      research_source: intelligence.research_source,
      raw_research_data: intelligence.raw_research_data
    }, {
      onConflict: 'source_url'
    });

  if (error) {
    console.error('Error storing property intelligence:', error);
    throw error;
  }
}

async function getCachedIntelligence(
  supabase: any,
  url: string
): Promise<PropertyIntelligence | null> {
  const { data, error } = await supabase
    .from('property_intelligence')
    .select('*')
    .eq('source_url', url)
    .gte('research_timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // 7 days
    .single();

  if (error || !data) {
    return null;
  }

  return {
    property_name: data.property_name,
    year_built: data.year_built,
    unit_count: data.unit_count,
    property_type: data.property_type,
    building_type: data.building_type,
    amenities: data.amenities,
    neighborhood: data.neighborhood,
    transit_access: data.transit_access,
    walk_score: data.walk_score,
    confidence_score: data.confidence_score,
    research_source: data.research_source,
    raw_research_data: data.raw_research_data
  };
}

async function recordResearchCost(
  supabase: any,
  cost: number,
  metadata: Record<string, any>
): Promise<void> {
  const { error } = await supabase
    .rpc('rpc_inc_scraping_costs', {
      operation_type: 'claude_property_research',
      cost_amount: cost,
      metadata: metadata
    });

  if (error) {
    console.error('Error recording research cost:', error);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}