import { Anthropic } from '@anthropic-ai/sdk';

export interface PropertyIntelligence {
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
    return `You are an expert real estate analyst. Analyze this property listing and extract structured information.

PROPERTY: ${propertyName}
URL: ${url}

HTML CONTEXT:
${htmlContent.substring(0, 3000)}

Extract the following information as JSON:

{
  "year_built": "number or null if unknown",
  "unit_count": "number or null if unknown",
  "property_type": "luxury, mid-range, affordable, student, senior, etc.",
  "amenities": "array of amenities like ['pool', 'gym', 'parking']",
  "neighborhood": "neighborhood name or description",
  "building_type": "high-rise, mid-rise, garden-style, townhome, etc.",
  "transit_access": "description of transit options",
  "walk_score": "number 0-100 or null if unknown",
  "confidence_score": "0-100 based on how clear the information was"
}

Return ONLY valid JSON, no other text.`;
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
      research_source: 'claude'
    };
  }

  private getDefaultResponse(): PropertyIntelligence {
    return {
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
      research_source: 'claude_fallback'
    };
  }
}