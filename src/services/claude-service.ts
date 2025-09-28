import { Anthropic } from '@anthropic-ai/sdk';

export interface PropertyIntelligence {
  concessions: string[];
  free_rent_offers: string[];
  base_rent_by_unit: Record<string, number>;
  fees: Record<string, number>;
  year_built: number | null;
  unit_count: number | null;
  property_type: string;
  amenities: string[];
  neighborhood: string;
  building_type: string;
  transit_access: string;
  walk_score: number | null;
  confidence_score: number;
  researched_at: string;
  research_source: string;
  data_source: string;
}

export interface ClaudeAnalysisResult {
  success: boolean;
  data: PropertyIntelligence;
  error?: string;
}

export class ClaudeService {
  private anthropic: Anthropic;

  constructor() {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY') || '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';
    this.anthropic = new Anthropic({ apiKey });
  }

  async analyzeProperty(url: string, htmlContent: string, propertyName: string): Promise<ClaudeAnalysisResult> {
    try {
      const prompt = this.buildPropertyAnalysisPrompt(url, htmlContent, propertyName);
      
      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307', // Cost-effective for initial testing
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      });

      console.log('Claude raw response:', response.content[0].text);
      
      const intelligence = this.parseClaudeResponse(response.content[0].text);
      return { success: true, data: intelligence };
      
    } catch (error) {
      console.error('Claude analysis error:', error);
      return { 
        success: false, 
        error: error.message,
        data: this.getDefaultResponse() 
      };
    }
  }

  private buildPropertyAnalysisPrompt(url: string, htmlContent: string, propertyName: string): string {
    return `CRITICAL: You are analyzing data DIRECTLY from the property's official website. This is the PRIMARY source and should be trusted over any third-party data.

PROPERTY: ${propertyName}
OFFICIAL WEBSITE: ${url}

HTML CONTENT FROM PROPERTY WEBSITE:
${htmlContent.substring(0, 4000)}

--- MANDATORY FIELDS TO EXTRACT ---

1. **CONCESSION & FREE RENT INFORMATION (HIGHEST PRIORITY)**
   - "1 month free" or "6 weeks free" offers
   - "Reduced deposit" or "$0 deposit" offers
   - "Waived application fees" or "admin fees"
   - "Move-in specials" or "limited time offers"
   - "Military discount" or "corporate discount"
   - Any time-limited promotions

2. **PRICING & FEE STRUCTURE**
   - Base rent amounts by unit type
   - Mandatory fees (admin, application, amenities)
   - Optional fees (parking, storage, pets)
   - Deposit amounts and requirements

3. **PROPERTY CHARACTERISTICS**
   - Year built (exact if available)
   - Total number of units/floorplans
   - Property type (luxury, mid-range, affordable, student)
   - Building style (high-rise, garden, townhome)
   - Renovation history if mentioned

4. **AMENITIES & FEATURES**
   - Community amenities (pool, gym, clubhouse)
   - Unit amenities (appliances, finishes)
   - Pet policies and fees
   - Parking availability and costs

5. **NEIGHBORHOOD CONTEXT**
   - Exact neighborhood/submarket
   - Walkability features
   - Transit access mentioned
   - Nearby attractions/schools

Return as JSON with this EXACT structure:
{
  "concessions": ["array of ALL concession offers found"],
  "free_rent_offers": ["specific free rent promotions"],
  "base_rent_by_unit": {"Studio": 1500, "1Bed": 1800, "2Bed": 2200},
  "fees": {"application": 75, "admin": 200, "deposit": 500},
  "year_built": 2020,
  "unit_count": 250,
  "property_type": "luxury",
  "amenities": ["pool", "gym", "rooftop"],
  "neighborhood": "Midtown",
  "transit_access": "MARTA station 2 blocks",
  "confidence_score": 85,
  "data_source": "property_website"
}

IMPORTANT: If concessions or free rent are mentioned ANYWHERE in the content, they MUST be included in the response.`;
  }

  private parseClaudeResponse(responseText: string): PropertyIntelligence {
    try {
      // Clean the response and extract JSON
      const cleaned = responseText.replace(/```json|```/g, '').trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return this.validateIntelData(parsed);
      }
      
      throw new Error('No JSON found in Claude response');
    } catch (error) {
      console.error('JSON parsing error:', error);
      return this.getDefaultResponse();
    }
  }

  private validateIntelData(data: any): PropertyIntelligence {
    // Ensure required fields with defaults
    return {
      concessions: Array.isArray(data.concessions) ? data.concessions : [],
      free_rent_offers: Array.isArray(data.free_rent_offers) ? data.free_rent_offers : [],
      base_rent_by_unit: typeof data.base_rent_by_unit === 'object' ? data.base_rent_by_unit : {},
      fees: typeof data.fees === 'object' ? data.fees : {},
      year_built: data.year_built || null,
      unit_count: data.unit_count || null,
      property_type: data.property_type || 'unknown',
      amenities: Array.isArray(data.amenities) ? data.amenities : [],
      neighborhood: data.neighborhood || 'unknown',
      building_type: data.building_type || 'unknown',
      transit_access: data.transit_access || 'unknown',
      walk_score: data.walk_score || null,
      confidence_score: data.confidence_score || 0,
      researched_at: new Date().toISOString(),
      research_source: 'claude',
      data_source: data.data_source || 'property_website'
    };
  }

  private getDefaultResponse(): PropertyIntelligence {
    return {
      concessions: [],
      free_rent_offers: [],
      base_rent_by_unit: {},
      fees: {},
      year_built: null,
      unit_count: null,
      property_type: 'unknown',
      amenities: [],
      neighborhood: 'unknown',
      building_type: 'unknown',
      transit_access: 'unknown',
      walk_score: null,
      confidence_score: 0,
      researched_at: new Date().toISOString(),
      research_source: 'claude_fallback',
      data_source: 'property_website'
    };
  }
}