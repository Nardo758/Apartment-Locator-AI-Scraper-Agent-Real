// Scraper Frontend Integration
// src/scraper/frontend-integration.ts

import { frontendDataService } from '../services/frontend-data-service.ts';
import { createClient } from '@supabase/supabase-js';

interface ScraperResult {
  success: boolean;
  properties: any[];
  cost: number;
  source: string;
  metadata: Record<string, any>;
}

export class ScraperFrontendIntegration {
  private supabase;

  constructor() {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
  }

  /**
   * Process scraper results and populate frontend tables
   */
  async processScraperResults(scraperResult: ScraperResult): Promise<{
    processed: number;
    errors: string[];
    frontend_properties_created: number;
  }> {
    const errors: string[] = [];
    let processed = 0;
    let frontendPropertiesCreated = 0;

    if (!scraperResult.success || !scraperResult.properties?.length) {
      return { processed: 0, errors: ['No properties to process'], frontend_properties_created: 0 };
    }

    console.log(`🔄 Processing ${scraperResult.properties.length} scraped properties for frontend`);

    try {
      // 1. First, ensure scraped properties are in the scraped_properties table
      const scrapedProperties = await this.upsertScrapedProperties(scraperResult.properties);
      processed = scrapedProperties.length;

      // 2. Transform and upsert to frontend properties table
      frontendPropertiesCreated = await frontendDataService.bulkTransformAndUpsert(scrapedProperties);

      // 3. Update market intelligence
      await this.updateMarketIntelligence(scrapedProperties);

      // 4. Trigger match score recalculation for active users
      await this.scheduleMatchScoreUpdates();

      console.log(`✅ Frontend integration complete: ${frontendPropertiesCreated} properties processed`);

    } catch (error) {
      console.error('❌ Frontend integration error:', error);
      errors.push(error.message);
    }

    return {
      processed,
      errors,
      frontend_properties_created: frontendPropertiesCreated
    };
  }

  /**
   * Upsert scraped properties to the scraped_properties table
   */
  private async upsertScrapedProperties(properties: any[]): Promise<any[]> {
    const scrapedProperties = [];

    for (const property of properties) {
      try {
        // Transform raw scraper data to scraped_properties format
        const scrapedProperty = {
          external_id: property.id || `${property.source}_${Date.now()}_${Math.random()}`,
          property_id: property.property_id || property.id?.split('_')[0] || 'unknown',
          unit_number: property.unit_number || property.unit || '1',
          source: property.source || 'unknown',
          name: property.title || property.name || 'Unknown Property',
          address: property.address || '',
          unit: property.unit || null,
          city: property.city || '',
          state: property.state || '',
          current_price: property.price || property.rent || 0,
          bedrooms: property.bedrooms || 0,
          bathrooms: property.bathrooms || 1.0,
          square_feet: property.sqft || property.square_feet || null,
          free_rent_concessions: property.concessions || property.specials || null,
          application_fee: property.application_fee || null,
          admin_fee_waived: property.admin_fee_waived || false,
          admin_fee_amount: property.admin_fee || null,
          security_deposit: property.security_deposit || null,
          listing_url: property.url || property.listing_url || '',
          scraped_at: new Date().toISOString(),
          status: 'active'
        };

        // Upsert to scraped_properties
        const { data, error } = await this.supabase
          .from('scraped_properties')
          .upsert(scrapedProperty, {
            onConflict: 'external_id',
            ignoreDuplicates: false
          })
          .select()
          .single();

        if (error) {
          console.error('Error upserting scraped property:', error);
        } else {
          scrapedProperties.push(data);
        }

      } catch (error) {
        console.error('Error processing property:', error);
      }
    }

    return scrapedProperties;
  }

  /**
   * Update market intelligence based on scraped data
   */
  private async updateMarketIntelligence(scrapedProperties: any[]): Promise<void> {
    try {
      // Group properties by location
      const locationGroups = new Map<string, any[]>();
      
      for (const property of scrapedProperties) {
        const location = `${property.city}, ${property.state}`;
        if (!locationGroups.has(location)) {
          locationGroups.set(location, []);
        }
        locationGroups.get(location)!.push(property);
      }

      // Update intelligence for each location
      for (const [location, properties] of locationGroups) {
        await this.updateLocationIntelligence(location, properties);
      }

    } catch (error) {
      console.error('Error updating market intelligence:', error);
    }
  }

  /**
   * Update market intelligence for a specific location
   */
  private async updateLocationIntelligence(location: string, properties: any[]): Promise<void> {
    try {
      // Calculate market metrics
      const prices = properties.map(p => p.current_price).filter(p => p > 0);
      const sqfts = properties.map(p => p.square_feet).filter(s => s > 0);
      
      if (prices.length === 0) return;

      const averageRent = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
      const rentPerSqft = sqfts.length > 0 
        ? prices.reduce((sum, price, i) => sum + (price / (sqfts[i] || 1)), 0) / sqfts.length
        : null;

      // Calculate market velocity based on pricing trends
      const marketVelocity = await this.calculateMarketVelocity(location, properties);

      // Calculate concession prevalence
      const propertiesWithConcessions = properties.filter(p => p.free_rent_concessions).length;
      const concessionPrevalence = (propertiesWithConcessions / properties.length) * 100;

      const marketIntelligence = {
        location,
        location_type: 'city',
        average_rent: averageRent,
        rent_per_sqft: rentPerSqft ? Math.round(rentPerSqft * 100) / 100 : null,
        vacancy_rate: null, // Would need historical data
        days_on_market_avg: null, // Would need tracking data
        concession_prevalence: Math.round(concessionPrevalence * 100) / 100,
        rent_trend: 'stable', // Would need historical comparison
        market_velocity: marketVelocity,
        new_listings_weekly: properties.length,
        price_reductions_weekly: 0, // Would need price change tracking
        leasing_velocity: null, // Would need lease data
        insights: {
          total_properties_analyzed: properties.length,
          price_range: {
            min: Math.min(...prices),
            max: Math.max(...prices),
            median: this.calculateMedian(prices)
          },
          bedroom_distribution: this.calculateBedroomDistribution(properties),
          concession_types: this.analyzeConcessionTypes(properties)
        },
        recommendations: this.generateMarketRecommendations(properties, concessionPrevalence),
        calculated_at: new Date().toISOString(),
        valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      };

      // Upsert market intelligence
      await this.supabase
        .from('market_intelligence')
        .upsert(marketIntelligence, {
          onConflict: 'location',
          ignoreDuplicates: false
        });

      console.log(`📊 Updated market intelligence for ${location}: ${properties.length} properties, avg rent $${averageRent}`);

    } catch (error) {
      console.error(`Error updating intelligence for ${location}:`, error);
    }
  }

  /**
   * Calculate market velocity based on pricing and concession data
   */
  private async calculateMarketVelocity(location: string, properties: any[]): Promise<'hot' | 'normal' | 'slow' | 'stale'> {
    try {
      // Get historical data for comparison
      const { data: historicalData } = await this.supabase
        .from('market_intelligence')
        .select('average_rent, concession_prevalence')
        .eq('location', location)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .single();

      const currentConcessionRate = properties.filter(p => p.free_rent_concessions).length / properties.length;

      if (historicalData) {
        // Compare current vs historical concession rates
        if (currentConcessionRate > historicalData.concession_prevalence * 1.5) {
          return 'stale'; // High concessions indicate slow market
        } else if (currentConcessionRate < historicalData.concession_prevalence * 0.5) {
          return 'hot'; // Low concessions indicate hot market
        }
      }

      // Default logic based on current concession rate
      if (currentConcessionRate > 0.3) return 'stale';
      if (currentConcessionRate > 0.15) return 'slow';
      if (currentConcessionRate < 0.05) return 'hot';
      return 'normal';

    } catch (error) {
      console.warn('Error calculating market velocity:', error);
      return 'normal';
    }
  }

  /**
   * Calculate median value
   */
  private calculateMedian(numbers: number[]): number {
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Calculate bedroom distribution
   */
  private calculateBedroomDistribution(properties: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    for (const property of properties) {
      const bedrooms = property.bedrooms?.toString() || '0';
      distribution[bedrooms] = (distribution[bedrooms] || 0) + 1;
    }
    
    return distribution;
  }

  /**
   * Analyze concession types
   */
  private analyzeConcessionTypes(properties: any[]): Record<string, number> {
    const concessionTypes: Record<string, number> = {};
    
    for (const property of properties) {
      if (property.free_rent_concessions) {
        const concession = property.free_rent_concessions.toLowerCase();
        if (concession.includes('month free')) {
          concessionTypes['free_rent'] = (concessionTypes['free_rent'] || 0) + 1;
        } else if (concession.includes('deposit')) {
          concessionTypes['reduced_deposit'] = (concessionTypes['reduced_deposit'] || 0) + 1;
        } else {
          concessionTypes['other'] = (concessionTypes['other'] || 0) + 1;
        }
      }
    }
    
    return concessionTypes;
  }

  /**
   * Generate market recommendations
   */
  private generateMarketRecommendations(properties: any[], concessionPrevalence: number): Record<string, any> {
    const recommendations: Record<string, any> = {};
    
    if (concessionPrevalence > 20) {
      recommendations.negotiation = {
        potential: 'high',
        message: 'High concession rate suggests strong negotiation opportunities'
      };
    } else if (concessionPrevalence < 5) {
      recommendations.urgency = {
        level: 'high',
        message: 'Low concession rate suggests competitive market - act quickly'
      };
    }
    
    // Price recommendations
    const prices = properties.map(p => p.current_price).filter(p => p > 0);
    if (prices.length > 0) {
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      recommendations.pricing = {
        market_average: Math.round(avgPrice),
        competitive_range: {
          min: Math.round(avgPrice * 0.9),
          max: Math.round(avgPrice * 1.1)
        }
      };
    }
    
    return recommendations;
  }

  /**
   * Schedule match score updates for active users
   */
  private async scheduleMatchScoreUpdates(): Promise<void> {
    try {
      // Get active users (users who have logged in recently)
      const { data: activeUsers } = await this.supabase
        .from('user_profiles')
        .select('user_id')
        .gte('updated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // 30 days

      if (activeUsers && activeUsers.length > 0) {
        console.log(`🎯 Scheduling match score updates for ${activeUsers.length} active users`);
        
        // In a production system, this would queue background jobs
        // For now, we'll process a limited number immediately
        const usersToProcess = activeUsers.slice(0, 10); // Limit to prevent timeout
        
        for (const user of usersToProcess) {
          try {
            await frontendDataService.calculateUserMatchScores(user.user_id);
          } catch (error) {
            console.error(`Error updating match scores for user ${user.user_id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error scheduling match score updates:', error);
    }
  }

  /**
   * Get frontend-compatible property data for API responses
   */
  async getFrontendProperties(filters: {
    city?: string;
    state?: string;
    min_price?: number;
    max_price?: number;
    bedrooms?: number;
    latitude?: number;
    longitude?: number;
    radius_km?: number;
    user_id?: string;
    limit?: number;
  } = {}): Promise<any[]> {
    try {
      let query = this.supabase
        .from('properties')
        .select(`
          *,
          apartment_iq_data (*)
        `)
        .eq('is_active', true);

      // Apply filters
      if (filters.city) query = query.eq('city', filters.city);
      if (filters.state) query = query.eq('state', filters.state);
      if (filters.min_price) query = query.gte('effective_price', filters.min_price);
      if (filters.max_price) query = query.lte('effective_price', filters.max_price);
      if (filters.bedrooms) query = query.eq('bedrooms', filters.bedrooms);

      // Geographic search
      if (filters.latitude && filters.longitude) {
        const { data } = await this.supabase.rpc('search_properties_near_location', {
          lat: filters.latitude,
          lng: filters.longitude,
          radius_km: filters.radius_km || 10,
          min_bedrooms: filters.bedrooms,
          max_bedrooms: filters.bedrooms,
          min_price: filters.min_price,
          max_price: filters.max_price,
          user_id_param: filters.user_id
        });
        
        return data || [];
      }

      // Apply limit and ordering
      query = query
        .order('match_score', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(filters.limit || 50);

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching frontend properties:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getFrontendProperties:', error);
      return [];
    }
  }
}

// Export singleton instance
export const scraperFrontendIntegration = new ScraperFrontendIntegration();