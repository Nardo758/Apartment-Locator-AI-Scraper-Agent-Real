// Frontend Data Service - Bridge between scraper and frontend schema
// src/services/frontend-data-service.ts

import { createClient } from '@supabase/supabase-js';

interface ScrapedProperty {
  id: number;
  external_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  current_price: number;
  bedrooms: number;
  bathrooms: number;
  square_feet?: number;
  listing_url: string;
  property_source_id?: number;
  scraped_at: string;
  free_rent_concessions?: string;
  // Add other scraped fields as needed
}

interface FrontendProperty {
  external_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip?: string;
  latitude?: number;
  longitude?: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  year_built?: number;
  property_type: string;
  original_price: number;
  ai_price: number;
  effective_price: number;
  rent_per_sqft?: number;
  savings: number;
  match_score?: number;
  success_rate?: number;
  days_vacant: number;
  market_velocity: 'hot' | 'normal' | 'slow' | 'stale';
  availability?: string;
  availability_type: 'immediate' | 'soon' | 'waitlist';
  features: string[];
  amenities: string[];
  pet_policy?: string;
  parking?: string;
  apartment_iq_data: Record<string, any>;
  property_source_id?: number;
  scraped_property_id: number;
  is_active: boolean;
  source_url: string;
  images: string[];
  last_scraped?: string;
}

interface ApartmentIQData {
  current_rent: number;
  original_rent: number;
  effective_rent: number;
  concession_value: number;
  concession_type?: string;
  concession_urgency: 'none' | 'standard' | 'aggressive' | 'desperate';
  days_on_market: number;
  first_seen?: string;
  market_velocity: 'hot' | 'normal' | 'slow' | 'stale';
  market_position: 'below_market' | 'at_market' | 'above_market';
  percentile_rank?: number;
  amenity_score?: number;
  location_score?: number;
  management_score?: number;
  lease_probability?: number;
  negotiation_potential?: number;
  urgency_score?: number;
  rent_trend: 'increasing' | 'stable' | 'decreasing';
  rent_change_percent?: number;
  concession_trend: 'none' | 'increasing' | 'decreasing';
}

export class FrontendDataService {
  private supabase;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Transform scraped property data to frontend format
   */
  async transformScrapedToFrontend(scrapedProperty: ScrapedProperty): Promise<FrontendProperty> {
    // Calculate AI-enhanced pricing
    const aiPrice = await this.calculateAIPrice(scrapedProperty);
    const effectivePrice = await this.calculateEffectivePrice(scrapedProperty);
    const savings = scrapedProperty.current_price - effectivePrice;

    // Extract features and amenities
    const features = this.extractFeatures(scrapedProperty);
    const amenities = this.extractAmenities(scrapedProperty);

    // Calculate market intelligence
    const marketVelocity = await this.calculateMarketVelocity(scrapedProperty);
    const daysVacant = await this.calculateDaysVacant(scrapedProperty);

    // Get coordinates if available
    const coordinates = await this.getCoordinates(scrapedProperty.address, scrapedProperty.city, scrapedProperty.state);

    return {
      external_id: scrapedProperty.external_id,
      name: scrapedProperty.name,
      address: scrapedProperty.address,
      city: scrapedProperty.city,
      state: scrapedProperty.state,
      zip: undefined, // Extract from address if needed
      latitude: coordinates?.latitude,
      longitude: coordinates?.longitude,
      bedrooms: scrapedProperty.bedrooms,
      bathrooms: scrapedProperty.bathrooms,
      sqft: scrapedProperty.square_feet || 0,
      year_built: undefined, // Would come from property intelligence
      property_type: 'apartment',
      original_price: scrapedProperty.current_price,
      ai_price: aiPrice,
      effective_price: effectivePrice,
      rent_per_sqft: scrapedProperty.square_feet ? effectivePrice / scrapedProperty.square_feet : undefined,
      savings: Math.max(0, savings),
      match_score: undefined, // Calculated per user
      success_rate: undefined, // Historical data needed
      days_vacant: daysVacant,
      market_velocity: marketVelocity,
      availability: 'available', // Default
      availability_type: 'immediate',
      features: features,
      amenities: amenities,
      pet_policy: this.extractPetPolicy(scrapedProperty),
      parking: this.extractParkingInfo(scrapedProperty),
      apartment_iq_data: await this.generateApartmentIQData(scrapedProperty),
      property_source_id: scrapedProperty.property_source_id,
      scraped_property_id: scrapedProperty.id,
      is_active: true,
      source_url: scrapedProperty.listing_url,
      images: [], // Would be populated by image scraper
      last_scraped: scrapedProperty.scraped_at
    };
  }

  /**
   * Calculate AI-enhanced price using market intelligence
   */
  private async calculateAIPrice(property: ScrapedProperty): Promise<number> {
    try {
      // Get market data for the area
      const { data: marketData } = await this.supabase
        .from('market_intelligence')
        .select('average_rent, rent_per_sqft')
        .eq('location', `${property.city}, ${property.state}`)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .single();

      if (marketData && property.square_feet) {
        // Use market rent per sqft as baseline
        const marketPrice = marketData.rent_per_sqft * property.square_feet;
        
        // Apply adjustments based on property characteristics
        let adjustedPrice = marketPrice;
        
        // Bedroom premium/discount
        if (property.bedrooms >= 3) {
          adjustedPrice *= 1.05; // 5% premium for 3+ bedrooms
        } else if (property.bedrooms === 0) {
          adjustedPrice *= 0.85; // 15% discount for studios
        }
        
        // Bathroom adjustments
        if (property.bathrooms >= 2) {
          adjustedPrice *= 1.03; // 3% premium for 2+ bathrooms
        }
        
        return Math.round(adjustedPrice);
      }
    } catch (error) {
      console.warn('AI price calculation failed, using original price:', error);
    }
    
    return property.current_price;
  }

  /**
   * Calculate effective price accounting for concessions
   */
  private async calculateEffectivePrice(property: ScrapedProperty): Promise<number> {
    let effectivePrice = property.current_price;
    
    // Apply concession discounts
    if (property.free_rent_concessions) {
      const concessionValue = this.parseConcessionValue(property.free_rent_concessions);
      effectivePrice = Math.round(property.current_price * (1 - concessionValue));
    }
    
    return effectivePrice;
  }

  /**
   * Parse concession value from text
   */
  private parseConcessionValue(concessionText: string): number {
    const text = concessionText.toLowerCase();
    
    // Look for specific concession patterns
    if (text.includes('1 month free') || text.includes('first month free')) {
      return 1/12; // ~8.33% discount
    }
    if (text.includes('2 months free')) {
      return 2/12; // ~16.67% discount
    }
    if (text.includes('half month free') || text.includes('0.5 month free')) {
      return 0.5/12; // ~4.17% discount
    }
    
    // Look for percentage discounts
    const percentMatch = text.match(/(\d+)%\s*(off|discount)/);
    if (percentMatch) {
      return parseInt(percentMatch[1]) / 100;
    }
    
    // Default small discount for any concession
    return 0.05; // 5% default discount
  }

  /**
   * Extract features from scraped data
   */
  private extractFeatures(property: ScrapedProperty): string[] {
    const features: string[] = [];
    
    // Add bedroom/bathroom info as features
    if (property.bedrooms === 0) {
      features.push('Studio');
    }
    if (property.bathrooms >= 2) {
      features.push('Multiple Bathrooms');
    }
    if (property.square_feet && property.square_feet > 1200) {
      features.push('Spacious');
    }
    
    // Add more feature extraction logic based on your data
    return features;
  }

  /**
   * Extract amenities from scraped data
   */
  private extractAmenities(property: ScrapedProperty): string[] {
    const amenities: string[] = [];
    
    // This would be enhanced based on your scraped data structure
    // For now, return common amenities that might be in the data
    const commonAmenities = [
      'Pool', 'Gym', 'Parking', 'Laundry', 'Pet Friendly', 
      'Air Conditioning', 'Dishwasher', 'Balcony'
    ];
    
    // Add logic to detect amenities from scraped text/metadata
    return amenities;
  }

  /**
   * Extract pet policy information
   */
  private extractPetPolicy(property: ScrapedProperty): string | undefined {
    // Add logic to extract pet policy from scraped data
    return 'Contact for pet policy';
  }

  /**
   * Extract parking information
   */
  private extractParkingInfo(property: ScrapedProperty): string | undefined {
    // Add logic to extract parking info from scraped data
    return 'Parking available';
  }

  /**
   * Calculate market velocity based on recent data
   */
  private async calculateMarketVelocity(property: ScrapedProperty): Promise<'hot' | 'normal' | 'slow' | 'stale'> {
    try {
      // Get recent market intelligence for the area
      const { data: marketData } = await this.supabase
        .from('market_intelligence')
        .select('market_velocity, days_on_market_avg')
        .eq('location', `${property.city}, ${property.state}`)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .single();

      if (marketData) {
        return marketData.market_velocity;
      }
    } catch (error) {
      console.warn('Market velocity calculation failed:', error);
    }
    
    return 'normal';
  }

  /**
   * Calculate days vacant/on market
   */
  private async calculateDaysVacant(property: ScrapedProperty): Promise<number> {
    try {
      // Check when this property was first seen
      const { data: firstSeen } = await this.supabase
        .from('scraped_properties')
        .select('first_seen_at')
        .eq('external_id', property.external_id)
        .single();

      if (firstSeen?.first_seen_at) {
        const daysDiff = Math.floor(
          (new Date().getTime() - new Date(firstSeen.first_seen_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        return Math.max(0, daysDiff);
      }
    } catch (error) {
      console.warn('Days vacant calculation failed:', error);
    }
    
    return 0;
  }

  /**
   * Get coordinates for address (placeholder - integrate with geocoding service)
   */
  private async getCoordinates(address: string, city: string, state: string): Promise<{latitude: number, longitude: number} | null> {
    // This would integrate with a geocoding service like Google Maps, Mapbox, etc.
    // For now, return null and coordinates would be populated separately
    return null;
  }

  /**
   * Generate comprehensive ApartmentIQ data
   */
  private async generateApartmentIQData(property: ScrapedProperty): Promise<Record<string, any>> {
    const effectiveRent = await this.calculateEffectivePrice(property);
    const concessionValue = property.current_price - effectiveRent;
    
    return {
      current_rent: property.current_price,
      original_rent: property.current_price,
      effective_rent: effectiveRent,
      concession_value: concessionValue,
      concession_type: property.free_rent_concessions ? 'rent_discount' : null,
      concession_urgency: concessionValue > property.current_price * 0.1 ? 'aggressive' : 'none',
      days_on_market: await this.calculateDaysVacant(property),
      first_seen: property.scraped_at,
      market_velocity: await this.calculateMarketVelocity(property),
      market_position: 'at_market', // Would be calculated against market data
      lease_probability: 0.7, // Default probability
      negotiation_potential: concessionValue > 0 ? 7 : 5,
      urgency_score: concessionValue > 0 ? 6 : 4,
      rent_trend: 'stable',
      concession_trend: concessionValue > 0 ? 'increasing' : 'none'
    };
  }

  /**
   * Bulk transform and upsert scraped properties to frontend format
   */
  async bulkTransformAndUpsert(scrapedProperties: ScrapedProperty[]): Promise<number> {
    let processedCount = 0;
    
    for (const scrapedProperty of scrapedProperties) {
      try {
        const frontendProperty = await this.transformScrapedToFrontend(scrapedProperty);
        
        // Upsert to properties table
        const { error } = await this.supabase
          .from('properties')
          .upsert(frontendProperty, {
            onConflict: 'external_id',
            ignoreDuplicates: false
          });

        if (error) {
          console.error('Error upserting property:', error);
        } else {
          processedCount++;
          
          // Also create/update ApartmentIQ data
          await this.upsertApartmentIQData(frontendProperty);
        }
      } catch (error) {
        console.error('Error transforming property:', error);
      }
    }
    
    return processedCount;
  }

  /**
   * Create or update ApartmentIQ data for a property
   */
  private async upsertApartmentIQData(property: FrontendProperty): Promise<void> {
    try {
      // First get the property ID
      const { data: propertyData } = await this.supabase
        .from('properties')
        .select('id')
        .eq('external_id', property.external_id)
        .single();

      if (propertyData) {
        const iqData: Partial<ApartmentIQData> = {
          current_rent: property.original_price,
          original_rent: property.original_price,
          effective_rent: property.effective_price,
          concession_value: property.savings,
          concession_urgency: property.savings > property.original_price * 0.1 ? 'aggressive' : 'none',
          days_on_market: property.days_vacant,
          market_velocity: property.market_velocity,
          market_position: 'at_market',
          rent_trend: 'stable',
          concession_trend: property.savings > 0 ? 'increasing' : 'none'
        };

        await this.supabase
          .from('apartment_iq_data')
          .upsert({
            property_id: propertyData.id,
            ...iqData
          }, {
            onConflict: 'property_id',
            ignoreDuplicates: false
          });
      }
    } catch (error) {
      console.error('Error upserting ApartmentIQ data:', error);
    }
  }

  /**
   * Calculate match scores for all properties for a specific user
   */
  async calculateUserMatchScores(userId: string): Promise<void> {
    try {
      // Get all active properties
      const { data: properties } = await this.supabase
        .from('properties')
        .select('id')
        .eq('is_active', true);

      if (properties) {
        for (const property of properties) {
          // Use the database function to calculate match score
          const { data: matchScore } = await this.supabase
            .rpc('calculate_property_match_score', {
              property_id_param: property.id,
              user_id_param: userId
            });

          if (matchScore !== null) {
            // Update the property with the match score
            await this.supabase
              .from('properties')
              .update({ match_score: matchScore })
              .eq('id', property.id);
          }
        }
      }
    } catch (error) {
      console.error('Error calculating match scores:', error);
    }
  }
}

// Export singleton instance
export const frontendDataService = new FrontendDataService(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);