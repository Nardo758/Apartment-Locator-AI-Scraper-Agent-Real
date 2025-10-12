// Frontend Data Service - Bridge between scraper and frontend schema
// src/services/frontend-data-service.ts

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/supabase.ts';
import { errMsg } from '../lib/error.ts';
import { createTypedClient, typedUpsert } from '../tools/supabase-helpers.ts';

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
  market_velocity: "hot" | "normal" | "slow" | "stale";
  availability?: string;
  availability_type: "immediate" | "soon" | "waitlist";
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
  concession_urgency: "none" | "standard" | "aggressive" | "desperate";
  days_on_market: number;
  first_seen?: string;
  market_velocity: "hot" | "normal" | "slow" | "stale";
  market_position: "below_market" | "at_market" | "above_market";
  percentile_rank?: number;
  amenity_score?: number;
  location_score?: number;
  management_score?: number;
  lease_probability?: number;
  negotiation_potential?: number;
  urgency_score?: number;
  rent_trend: "increasing" | "stable" | "decreasing";
  rent_change_percent?: number;
  concession_trend: "none" | "increasing" | "decreasing";
}

export class FrontendDataService {
  private supabase: SupabaseClient<Database>;

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    this.supabase = createTypedClient(supabaseUrl, supabaseKey);
  }

  /**
   * Transform scraped property data to frontend format
   */
  async transformScrapedToFrontend(
    scrapedProperty: SharedScrapedProperty,
  ): Promise<FrontendProperty> {
    // Calculate AI-enhanced pricing
    const aiPrice = await this.calculateAIPrice(scrapedProperty);
    const effectivePrice = await this.calculateEffectivePrice(scrapedProperty);
  const savings = Number(scrapedProperty.current_price ?? 0) - effectivePrice;

    // Extract features and amenities
    const features = this.extractFeatures(scrapedProperty);
    const amenities = this.extractAmenities(scrapedProperty);

    // Calculate market intelligence
    const marketVelocity = await this.calculateMarketVelocity(scrapedProperty);
    const daysVacant = await this.calculateDaysVacant(scrapedProperty);

    // Get coordinates if available
    const coordinates = await this.getCoordinates(
      String(scrapedProperty.address ?? ""),
      String(scrapedProperty.city ?? ""),
      String(scrapedProperty.state ?? ""),
    );

    return {
      external_id: String(scrapedProperty.external_id ?? `ext_${Date.now()}`),
      name: String(scrapedProperty.name ?? scrapedProperty.title ?? "Unknown Property"),
      address: String(scrapedProperty.address ?? ""),
      city: String(scrapedProperty.city ?? ""),
      state: String(scrapedProperty.state ?? ""),
      zip: undefined, // Extract from address if needed
      latitude: coordinates?.latitude,
      longitude: coordinates?.longitude,
      bedrooms: Number(scrapedProperty.bedrooms ?? 0),
      bathrooms: Number(scrapedProperty.bathrooms ?? 1),
      sqft: Number(scrapedProperty.square_feet ?? scrapedProperty.sqft ?? 0),
      year_built: undefined, // Would come from property intelligence
      property_type: "apartment",
      original_price: Number(scrapedProperty.current_price ?? scrapedProperty.price ?? scrapedProperty.rent ?? 0),
      ai_price: aiPrice,
      effective_price: effectivePrice,
      rent_per_sqft: (Number(scrapedProperty.square_feet ?? scrapedProperty.sqft ?? 0) > 0)
        ? effectivePrice / Number(scrapedProperty.square_feet ?? scrapedProperty.sqft ?? 1)
        : undefined,
      savings: Math.max(0, savings),
      match_score: undefined, // Calculated per user
      success_rate: undefined, // Historical data needed
      days_vacant: daysVacant,
      market_velocity: marketVelocity,
      availability: "available", // Default
      availability_type: "immediate",
      features: features,
      amenities: amenities,
      pet_policy: this.extractPetPolicy(scrapedProperty),
      parking: this.extractParkingInfo(scrapedProperty),
      apartment_iq_data: await this.generateApartmentIQData(scrapedProperty),
      property_source_id: scrapedProperty.property_source_id ? Number(scrapedProperty.property_source_id) : undefined,
      scraped_property_id: Number(scrapedProperty.id ?? 0),
      is_active: true,
      source_url: String(scrapedProperty.listing_url ?? ""),
      images: [], // Would be populated by image scraper
      last_scraped: scrapedProperty.scraped_at ? String(scrapedProperty.scraped_at) : undefined,
    };
  }

  /**
   * Calculate AI-enhanced price using market intelligence
   */
  private async calculateAIPrice(property: SharedScrapedProperty): Promise<number> {
    try {
      // Get market data for the area
      const { data: marketData } = await this.supabase
        .from("market_intelligence")
        .select("average_rent, rent_per_sqft")
        .eq("location", `${property.city}, ${property.state}`)
        .order("calculated_at", { ascending: false })
        .limit(1)
        .single();
      const marketRow = marketData as Database['public']['Tables']['market_intelligence']['Row'] | null;

      if (marketRow && Number(property.square_feet ?? 0) > 0) {
        // Use market rent per sqft as baseline
        const marketPrice = Number(marketRow.rent_per_sqft ?? 0) * Number(property.square_feet ?? 0);

        // Apply adjustments based on property characteristics
        let adjustedPrice = marketPrice;

        // Bedroom premium/discount
        if (Number(property.bedrooms ?? 0) >= 3) {
          adjustedPrice *= 1.05; // 5% premium for 3+ bedrooms
        } else if (Number(property.bedrooms ?? 0) === 0) {
          adjustedPrice *= 0.85; // 15% discount for studios
        }

        // Bathroom adjustments
        if (Number(property.bathrooms ?? 0) >= 2) {
          adjustedPrice *= 1.03; // 3% premium for 2+ bathrooms
        }

        return Math.round(adjustedPrice);
        }
    } catch (_e) {
      console.warn("AI price calculation failed, using original price:", _e);
    }

    return Number(property.current_price ?? 0);
  }

  /**
   * Calculate effective price accounting for concessions
   */
  private async calculateEffectivePrice(
    property: SharedScrapedProperty,
  ): Promise<number> {
  let effectivePrice = Number(property.current_price ?? 0);

    // Apply concession discounts
    if (property.free_rent_concessions) {
      const concessionValue = this.parseConcessionValue(String(property.free_rent_concessions));
      effectivePrice = Math.round(
        Number(property.current_price ?? 0) * (1 - concessionValue),
      );
    }

    return effectivePrice;
  }

  /**
   * Parse concession value from text
   */
  private parseConcessionValue(concessionText: string): number {
    const text = concessionText.toLowerCase();

    // Look for specific concession patterns
    if (text.includes("1 month free") || text.includes("first month free")) {
      return 1 / 12; // ~8.33% discount
    }
    if (text.includes("2 months free")) {
      return 2 / 12; // ~16.67% discount
    }
    if (text.includes("half month free") || text.includes("0.5 month free")) {
      return 0.5 / 12; // ~4.17% discount
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
  private extractFeatures(property: SharedScrapedProperty): string[] {
    const features: string[] = [];

    // Add bedroom/bathroom info as features
      if (Number(property.bedrooms ?? 0) === 0) {
      features.push("Studio");
    }
    if (Number(property.bathrooms ?? 0) >= 2) {
      features.push("Multiple Bathrooms");
    }
    if (Number(property.square_feet ?? 0) > 1200) {
      features.push("Spacious");
    }

    // Add more feature extraction logic based on your data
    return features;
  }

  /**
   * Extract amenities from scraped data
   */
  private extractAmenities(property: SharedScrapedProperty): string[] {
    const amenities: string[] = [];

    // This would be enhanced based on your scraped data structure
    // For now, return common amenities that might be in the data
    const commonAmenities = [
      "Pool",
      "Gym",
      "Parking",
      "Laundry",
      "Pet Friendly",
      "Air Conditioning",
      "Dishwasher",
      "Balcony",
    ];

    // Add logic to detect amenities from scraped text/metadata
    return amenities;
  }

  /**
   * Extract pet policy information
   */
  private extractPetPolicy(property: SharedScrapedProperty): string | undefined {
    // Add logic to extract pet policy from scraped data
    return "Contact for pet policy";
  }

  /**
   * Extract parking information
   */
  private extractParkingInfo(property: SharedScrapedProperty): string | undefined {
    // Add logic to extract parking info from scraped data
    return "Parking available";
  }

  /**
   * Calculate market velocity based on recent data
   */
  private async calculateMarketVelocity(
    property: SharedScrapedProperty,
  ): Promise<"hot" | "normal" | "slow" | "stale"> {
    try {
      // Get recent market intelligence for the area
      const { data: marketData } = await this.supabase
        .from("market_intelligence")
        .select("market_velocity, days_on_market_avg")
        .eq("location", `${property.city}, ${property.state}`)
        .order("calculated_at", { ascending: false })
        .limit(1)
        .single();
      const marketRow = marketData as Database['public']['Tables']['market_intelligence']['Row'] | null;

      if (marketRow) {
        return (marketRow.market_velocity as unknown) as "hot" | "normal" | "slow" | "stale";
      }
    } catch (_e) {
      console.warn("Market velocity calculation failed:", _e);
    }

    return "normal";
  }

  /**
   * Calculate days vacant/on market
   */
  private async calculateDaysVacant(
    property: SharedScrapedProperty,
  ): Promise<number> {
    try {
      // Check when this property was first seen
      const { data: firstSeen } = await this.supabase
        .from("scraped_properties")
        .select("first_seen_at")
        .eq("external_id", String(property.external_id ?? ""))
        .single();
      const firstSeenRow = firstSeen as Database['public']['Tables']['scraped_properties']['Row'] | null;

      if (firstSeenRow?.first_seen_at) {
        const daysDiff = Math.floor(
          (new Date().getTime() - new Date(firstSeenRow.first_seen_at).getTime()) /
            (1000 * 60 * 60 * 24),
        );
        return Math.max(0, daysDiff);
      }
    } catch (_e) {
      console.warn("Days vacant calculation failed:", _e);
    }

    return 0;
  }

  /**
   * Get coordinates for address (placeholder - integrate with geocoding service)
   */
  private async getCoordinates(
    address: string,
    city: string,
    state: string,
  ): Promise<{ latitude: number; longitude: number } | null> {
    // This would integrate with a geocoding service like Google Maps, Mapbox, etc.
    // For now, return null and coordinates would be populated separately
    return null;
  }

  /**
   * Generate comprehensive ApartmentIQ data
   */
  private async generateApartmentIQData(
    property: SharedScrapedProperty,
  ): Promise<Record<string, any>> {
  const effectiveRent = await this.calculateEffectivePrice(property);
  const concessionValue = Number(property.current_price ?? 0) - effectiveRent;

    return {
      current_rent: property.current_price,
      original_rent: property.current_price,
      effective_rent: effectiveRent,
      concession_value: concessionValue,
      concession_type: property.free_rent_concessions ? "rent_discount" : null,
      concession_urgency: concessionValue > Number(property.current_price ?? 0) * 0.1
        ? "aggressive"
        : "none",
      days_on_market: await this.calculateDaysVacant(property),
      first_seen: property.scraped_at,
      market_velocity: await this.calculateMarketVelocity(property),
      market_position: "at_market", // Would be calculated against market data
      lease_probability: 0.7, // Default probability
      negotiation_potential: concessionValue > 0 ? 7 : 5,
      urgency_score: concessionValue > 0 ? 6 : 4,
      rent_trend: "stable",
      concession_trend: concessionValue > 0 ? "increasing" : "none",
    };
  }

  /**
   * Bulk transform and upsert scraped properties to frontend format
   */
  async bulkTransformAndUpsert(
    scrapedProperties: SharedScrapedProperty[],
  ): Promise<number> {
    let processedCount = 0;

    for (const scrapedProperty of scrapedProperties) {
      try {
        const frontendProperty = await this.transformScrapedToFrontend(
          scrapedProperty,
        );

        // Upsert to properties table
        const { error } = await typedUpsert(
          this.supabase,
          'properties',
          frontendProperty,
          { onConflict: 'external_id', ignoreDuplicates: false }
        );

        if (error) {
          console.error("Error upserting property:", errMsg(error));
        } else {
          processedCount++;

          // Also create/update ApartmentIQ data
          await this.upsertApartmentIQData(frontendProperty);
        }
      } catch (_e) {
        console.error("Error transforming property:", errMsg(_e));
      }
    }

    return processedCount;
  }

  /**
   * Create or update ApartmentIQ data for a property
   */
  private async upsertApartmentIQData(
    property: FrontendProperty,
  ): Promise<void> {
    try {
      // First get the property ID
      const { data: propertyData } = await this.supabase
        .from("properties")
        .select("id")
        .eq("external_id", property.external_id)
        .single();
      const propertyDataRow = propertyData as Database['public']['Tables']['properties']['Row'] | null;

      if (propertyDataRow) {
        const iqData: Partial<ApartmentIQData> = {
          current_rent: property.original_price,
          original_rent: property.original_price,
          effective_rent: property.effective_price,
          concession_value: property.savings,
          concession_urgency: property.savings > property.original_price * 0.1
            ? "aggressive"
            : "none",
          days_on_market: property.days_vacant,
          market_velocity: property.market_velocity,
          market_position: "at_market",
          rent_trend: "stable",
          concession_trend: property.savings > 0 ? "increasing" : "none",
        };

        await typedUpsert(
          this.supabase,
          'apartment_iq_data',
          { property_id: propertyDataRow.id, ...iqData },
          { onConflict: 'property_id', ignoreDuplicates: false }
        );
      }
    } catch (_e) {
      console.error("Error upserting ApartmentIQ data:", errMsg(_e));
    }
  }

  /**
   * Calculate match scores for all properties for a specific user
   */
  async calculateUserMatchScores(userId: string): Promise<void> {
    try {
      // Get all active properties
      const { data: properties } = await this.supabase
        .from("properties")
        .select("id")
        .eq("is_active", true);

      const propertiesList = properties as Array<{ id: string }> | null;
      if (propertiesList) {
        for (const property of propertiesList) {
          // Use the database function to calculate match score
          const _ms = await (this.supabase as unknown as any).rpc("calculate_property_match_score", {
            property_id_param: property.id,
            user_id_param: userId,
          }) as { data: number | null; error?: unknown };
          const matchScore = _ms.data;

          if (matchScore !== null) {
            // Update the property with the match score
            await this.supabase
              .from('properties')
              .update({ match_score: matchScore } as Partial<Database['public']['Tables']['properties']['Update']>)
              .eq('id', property.id);
          }
        }
      }
    } catch (_e) {
      console.error("Error calculating match scores:", errMsg(_e));
    }
  }
}

// Export singleton instance
export const frontendDataService = new FrontendDataService(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);
