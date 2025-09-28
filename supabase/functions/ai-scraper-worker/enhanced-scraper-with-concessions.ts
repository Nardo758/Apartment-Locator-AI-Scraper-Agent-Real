// Enhanced Main Scraper with Concession Focus
import { serve } from "std/http/server.ts";
import { createClient } from '@supabase/supabase-js';
import { ClaudeService } from '../../../src/services/claude-service.ts';
import { ConcessionDetector } from '../../../src/services/enhanced-concession-detector.ts';
import { ConcessionTracker } from '../../../src/services/concession-tracker.ts';

// Enhanced scraper with concession focus
async function enhancedScrapeWithConcessions(job: any) {
  try {
    console.log(`🎯 Scraping PRIMARY SOURCE: ${job.url}`);
    
    // Step 1: Fetch from property website (PRIMARY SOURCE)
    const htmlContent = await fetchPropertyWebsite(job.url);
    
    // Step 2: Pre-scan for concessions (fast detection)
    const quickConcessions = ConcessionDetector.detectConcessionKeywords(htmlContent);
    console.log(`🔍 Quick concession scan: ${quickConcessions.length} offers found`);
    
    // Step 3: Full Claude analysis with concession focus
    const claudeService = new ClaudeService();
    const propertyIntelResult = await claudeService.analyzeProperty(
      job.url,
      htmlContent, 
      job.propertyName
    );
    
    if (!propertyIntelResult.success) {
      throw new Error(`Claude analysis failed: ${propertyIntelResult.error}`);
    }

    const propertyIntel = propertyIntelResult.data;
    
    // Step 4: Enhance with effective rent calculations
    const currentListings = await scrapeCurrentListings(job.url, htmlContent);
    const apartmentsWithConcessions = ConcessionDetector.applyConcessionPricing(
      currentListings,
      propertyIntel
    );
    
    // Step 5: Calculate concession confidence
    const concessionConfidence = ConcessionDetector.calculateConcessionConfidence(propertyIntel);
    
    return {
      apartments: apartmentsWithConcessions,
      property_intelligence: propertyIntel,
      source_priority: 'property_website',
      concession_confidence: concessionConfidence,
      quick_concession_scan: quickConcessions,
      scraping_metadata: {
        source: 'primary_property_website',
        concession_detected: quickConcessions.length > 0,
        analysis_timestamp: new Date().toISOString(),
        total_apartments: apartmentsWithConcessions.length
      }
    };
    
  } catch (error) {
    console.error('Primary source scraping failed:', error);
    // Fallback to secondary sources if primary fails
    return await fallbackToSecondarySources(job);
  }
}

async function fetchPropertyWebsite(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.text();
  } catch (error) {
    console.error('Failed to fetch property website:', error);
    throw error;
  }
}

async function scrapeCurrentListings(url: string, htmlContent: string): Promise<any[]> {
  // Enhanced listing extraction with concession awareness
  const claudeService = new ClaudeService();
  
  // Use Claude to extract apartment listings from the HTML
  const systemPrompt = `Extract ALL apartment listings from this property website HTML. 
Focus on finding concession information for each unit.

Return JSON array with this structure for each apartment:
{
  "unit_number": "string or null",
  "bedrooms": number,
  "bathrooms": number,
  "square_feet": number,
  "rent_price": number,
  "current_price": number,
  "availability_date": "string or null",
  "floor_plan": "string or null",
  "concessions": ["array of concession offers for this unit"],
  "amenities": ["unit-specific amenities"]
}`;

  try {
    // This would use Claude to extract listings - simplified for now
    // In a real implementation, you'd call Claude API here
    
    // For now, return a mock structure that would come from Claude
    return [
      {
        unit_number: null,
        bedrooms: 1,
        bathrooms: 1,
        square_feet: 800,
        rent_price: 1500,
        current_price: 1500,
        availability_date: null,
        floor_plan: "1x1",
        concessions: [],
        amenities: []
      }
    ];
  } catch (error) {
    console.error('Failed to extract listings:', error);
    return [];
  }
}

async function fallbackToSecondarySources(job: any): Promise<any> {
  console.log('🔄 Falling back to secondary sources...');
  
  // Fallback logic - could scrape from apartments.com, rent.com, etc.
  return {
    apartments: [],
    property_intelligence: null,
    source_priority: 'secondary_sources',
    concession_confidence: 0,
    scraping_metadata: {
      source: 'fallback_secondary',
      concession_detected: false,
      analysis_timestamp: new Date().toISOString(),
      error: 'Primary source failed'
    }
  };
}

// Main handler function
async function handleScrapingRequest(req: Request): Promise<Response> {
  try {
    const payload = await req.json();
    const { url, propertyName, source = "property_website" } = payload;

    if (!url) {
      return new Response(JSON.stringify({ 
        status: "error", 
        message: "URL is required" 
      }), { 
        status: 400, 
        headers: { "content-type": "application/json" } 
      });
    }

    // Enhanced scraping with concession focus
    const scrapingResult = await enhancedScrapeWithConcessions({
      url,
      propertyName: propertyName || 'Unknown Property',
      source
    });

    // Save results to database
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (SUPABASE_URL && SUPABASE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
      
      // Save apartments with concession data
      for (const apartment of scrapingResult.apartments) {
        const apartmentData = {
          external_id: `concession-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          source: source,
          title: propertyName,
          address: apartment.address || '',
          city: apartment.city || '',
          state: apartment.state || '',
          rent_price: apartment.current_price,
          rent_amount: apartment.current_price,
          bedrooms: apartment.bedrooms,
          bathrooms: apartment.bathrooms,
          square_feet: apartment.square_feet,
          amenities: apartment.amenities,
          
          // Enhanced concession fields
          concessions_applied: apartment.concessions_applied,
          concession_details: apartment.concession_details,
          effective_rent: apartment.effective_rent,
          net_effective_rent: apartment.net_effective_rent,
          base_rent: apartment.base_rent,
          intelligence_confidence: apartment.intelligence_confidence,
          
          is_active: true,
          scraped_at: new Date().toISOString(),
          source_url: url,
        };

        // Remove undefined/null values
        const cleanData = Object.fromEntries(
          Object.entries(apartmentData).filter(([_, v]) => v !== undefined && v !== null)
        );

        const { error } = await supabase
          .from('apartments')
          .upsert(cleanData, { onConflict: 'external_id' });

        if (error) {
          console.error('Failed to save apartment:', error);
        }
      }

      // Save property intelligence
      if (scrapingResult.property_intelligence) {
        const { error: intelError } = await supabase
          .from('property_intelligence')
          .upsert({
            property_name: propertyName,
            ...scrapingResult.property_intelligence,
            source_url: url
          }, { onConflict: 'property_name' });

        if (intelError) {
          console.error('Failed to save property intelligence:', intelError);
        }
      }

      // Generate and save concession analytics
      try {
        const concessionStats = await ConcessionTracker.trackMarketConcessions(scrapingResult.apartments);
        await ConcessionTracker.saveConcessionAnalytics(supabase, concessionStats, 'atlanta');
      } catch (analyticsError) {
        console.error('Failed to save concession analytics:', analyticsError);
      }
    }

    // Return enhanced response
    return new Response(JSON.stringify({ 
      status: "success", 
      data: {
        apartments_found: scrapingResult.apartments.length,
        concessions_detected: scrapingResult.scraping_metadata.concession_detected,
        concession_confidence: scrapingResult.concession_confidence,
        source_priority: scrapingResult.source_priority,
        property_intelligence: scrapingResult.property_intelligence,
        quick_scan_results: scrapingResult.quick_concession_scan,
        metadata: scrapingResult.scraping_metadata
      }
    }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

  } catch (error) {
    console.error('Scraping request failed:', error);
    return new Response(JSON.stringify({ 
      status: "error", 
      message: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

// Export the handler
export { handleScrapingRequest, enhancedScrapeWithConcessions };