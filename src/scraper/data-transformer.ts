// src/scraper/data-transformer.ts
// Data transformation pipeline for converting scraper data to frontend schema

import type { SupabaseClient } from '@supabase/supabase-js';

// Current scraper data structure (from scraped_properties)
export interface ScrapedPropertyData {
  id?: number;
  external_id: string;
  property_id: string;
  unit_number: string;
  source: string;
  name: string;
  address: string;
  unit?: string;
  city: string;
  state: string;
  current_price: number;
  bedrooms: number;
  bathrooms: number;
  square_feet?: number;
  free_rent_concessions?: string;
  application_fee?: number;
  admin_fee_waived?: boolean;
  admin_fee_amount?: number;
  security_deposit?: number;
  listing_url: string;
  first_seen_at?: string;
  last_seen_at?: string;
  status?: string;
  scraped_at?: string;
  created_at?: string;
  updated_at?: string;
  
  // Additional fields that might come from AI processing
  amenities?: string[];
  features?: string[];
  pet_policy?: string;
  parking?: string;
  latitude?: number;
  longitude?: number;
  zip_code?: string;
  
  // Market intelligence fields
  market_rent?: number;
  rent_estimate_low?: number;
  rent_estimate_high?: number;
  days_on_market?: number;
  price_changes?: number;
  stability_score?: number;
  change_frequency?: number;
}

// Frontend-compatible property structure
export interface FrontendProperty {
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
  sqft?: number;
  
  // Pricing information
  original_price: number;
  ai_price?: number;
  effective_price?: number;
  market_rent?: number;
  rent_estimate_low?: number;
  rent_estimate_high?: number;
  
  // Property details
  amenities?: string[];
  features?: string[];
  pet_policy?: string;
  parking?: string;
  
  // Fees and concessions
  application_fee?: number;
  admin_fee_amount?: number;
  admin_fee_waived?: boolean;
  security_deposit?: number;
  free_rent_concessions?: string;
  
  // Market intelligence
  apartment_iq_data?: ApartmentIQData;
  
  // Metadata
  listing_url: string;
  source: string;
  status: string;
  first_seen_at?: string;
  last_seen_at?: string;
  days_on_market?: number;
  price_changes?: number;
}

export interface ApartmentIQData {
  market_position: 'below_market' | 'at_market' | 'above_market';
  confidence_score: number;
  price_trend: 'increasing' | 'stable' | 'decreasing';
  demand_level: 'low' | 'medium' | 'high';
  competitiveness_score: number;
  recommendation: string;
  last_updated: string;
}

/**
 * Transform scraped data to match frontend requirements
 */
export async function transformScrapedToFrontendFormat(
  scrapedData: ScrapedPropertyData
): Promise<FrontendProperty> {
  const frontendProperty: FrontendProperty = {
    external_id: scrapedData.external_id,
    name: scrapedData.name || '',
    address: scrapedData.address || '',
    city: scrapedData.city || '',
    state: scrapedData.state || '',
    zip: scrapedData.zip_code,
    latitude: scrapedData.latitude,
    longitude: scrapedData.longitude,
    bedrooms: scrapedData.bedrooms || 0,
    bathrooms: scrapedData.bathrooms || 1.0,
    sqft: scrapedData.square_feet,
    
    // Pricing
    original_price: scrapedData.current_price || 0,
    ai_price: await calculateAiPrice(scrapedData),
    effective_price: await calculateEffectivePrice(scrapedData),
    market_rent: scrapedData.market_rent,
    rent_estimate_low: scrapedData.rent_estimate_low,
    rent_estimate_high: scrapedData.rent_estimate_high,
    
    // Property details
    amenities: await extractAmenities(scrapedData),
    features: await extractFeatures(scrapedData),
    pet_policy: await extractPetPolicy(scrapedData),
    parking: await extractParkingInfo(scrapedData),
    
    // Fees
    application_fee: scrapedData.application_fee,
    admin_fee_amount: scrapedData.admin_fee_amount,
    admin_fee_waived: scrapedData.admin_fee_waived || false,
    security_deposit: scrapedData.security_deposit,
    free_rent_concessions: scrapedData.free_rent_concessions,
    
    // Market intelligence
    apartment_iq_data: await generateIqData(scrapedData),
    
    // Metadata
    listing_url: scrapedData.listing_url || '',
    source: scrapedData.source || '',
    status: scrapedData.status || 'active',
    first_seen_at: scrapedData.first_seen_at,
    last_seen_at: scrapedData.last_seen_at,
    days_on_market: scrapedData.days_on_market,
    price_changes: scrapedData.price_changes
  };

  return frontendProperty;
}

/**
 * Calculate AI-suggested price based on market data and property features
 */
export async function calculateAiPrice(scrapedData: ScrapedPropertyData): Promise<number | undefined> {
  try {
    // Basic AI pricing logic - can be enhanced with ML models
    const basePrice = scrapedData.current_price;
    const marketRent = scrapedData.market_rent;
    
    if (!basePrice) return undefined;
    
    // If we have market rent data, use it for adjustment
    if (marketRent && marketRent > 0) {
      // Simple adjustment based on market rent
      const marketAdjustment = (marketRent - basePrice) * 0.3; // 30% weight to market data
      return Math.round(basePrice + marketAdjustment);
    }
    
    // Fallback: adjust based on property features
    let adjustedPrice = basePrice;
    
    // Premium for larger units
    if (scrapedData.square_feet && scrapedData.square_feet > 1000) {
      adjustedPrice *= 1.05; // 5% premium for large units
    }
    
    // Premium for luxury amenities
    const amenities = scrapedData.amenities || [];
    const luxuryAmenities = ['pool', 'gym', 'concierge', 'doorman', 'rooftop'];
    const luxuryCount = amenities.filter(a => 
      luxuryAmenities.some(luxury => a.toLowerCase().includes(luxury))
    ).length;
    
    if (luxuryCount > 0) {
      adjustedPrice *= (1 + (luxuryCount * 0.02)); // 2% per luxury amenity
    }
    
    return Math.round(adjustedPrice);
  } catch (error) {
    console.error('Error calculating AI price:', error);
    return scrapedData.current_price;
  }
}

/**
 * Calculate effective price considering concessions and fees
 */
export async function calculateEffectivePrice(scrapedData: ScrapedPropertyData): Promise<number> {
  try {
    let effectivePrice = scrapedData.current_price || 0;
    
    // Subtract value of free rent concessions
    if (scrapedData.free_rent_concessions) {
      const concessionValue = parseConcessionValue(scrapedData.free_rent_concessions);
      effectivePrice -= concessionValue;
    }
    
    // Add monthly equivalent of fees
    const monthlyFees = calculateMonthlyFees(scrapedData);
    effectivePrice += monthlyFees;
    
    return Math.round(Math.max(effectivePrice, 0));
  } catch (error) {
    console.error('Error calculating effective price:', error);
    return scrapedData.current_price || 0;
  }
}

/**
 * Extract and standardize amenities from various data sources
 */
export async function extractAmenities(scrapedData: ScrapedPropertyData): Promise<string[]> {
  const amenities: string[] = [];
  
  // Start with existing amenities if available
  if (scrapedData.amenities && Array.isArray(scrapedData.amenities)) {
    amenities.push(...scrapedData.amenities);
  }
  
  // Extract amenities from free text fields
  const textFields = [
    scrapedData.free_rent_concessions,
    scrapedData.name,
    // Add other fields that might contain amenity information
  ].filter(Boolean);
  
  const commonAmenities = [
    'pool', 'gym', 'fitness center', 'parking', 'laundry', 'dishwasher',
    'air conditioning', 'balcony', 'patio', 'walk-in closet', 'hardwood floors',
    'stainless steel appliances', 'granite countertops', 'in-unit washer/dryer',
    'pet friendly', 'elevator', 'doorman', 'concierge', 'rooftop deck'
  ];
  
  for (const text of textFields) {
    if (typeof text === 'string') {
      const lowerText = text.toLowerCase();
      for (const amenity of commonAmenities) {
        if (lowerText.includes(amenity.toLowerCase()) && !amenities.includes(amenity)) {
          amenities.push(amenity);
        }
      }
    }
  }
  
  return amenities.map(a => a.trim()).filter(Boolean);
}

/**
 * Extract property features from scraped data
 */
export async function extractFeatures(scrapedData: ScrapedPropertyData): Promise<string[]> {
  const features: string[] = [];
  
  // Add size-based features
  if (scrapedData.square_feet) {
    if (scrapedData.square_feet > 1200) features.push('Spacious');
    if (scrapedData.square_feet < 600) features.push('Cozy');
  }
  
  // Add bedroom/bathroom features
  if (scrapedData.bedrooms === 0) features.push('Studio');
  if (scrapedData.bathrooms >= 2) features.push('Multiple Bathrooms');
  
  // Add fee-related features
  if (scrapedData.admin_fee_waived) features.push('No Admin Fee');
  if (!scrapedData.application_fee || scrapedData.application_fee === 0) {
    features.push('No Application Fee');
  }
  
  // Add concession features
  if (scrapedData.free_rent_concessions) {
    features.push('Move-in Special');
  }
  
  return features;
}

/**
 * Extract pet policy information
 */
export async function extractPetPolicy(scrapedData: ScrapedPropertyData): Promise<string> {
  const textFields = [
    scrapedData.free_rent_concessions,
    scrapedData.name,
    ...(scrapedData.amenities || [])
  ].filter(Boolean);
  
  for (const text of textFields) {
    if (typeof text === 'string') {
      const lowerText = text.toLowerCase();
      
      if (lowerText.includes('no pets') || lowerText.includes('pet-free')) {
        return 'No Pets Allowed';
      }
      if (lowerText.includes('cats only')) {
        return 'Cats Only';
      }
      if (lowerText.includes('dogs only')) {
        return 'Dogs Only';
      }
      if (lowerText.includes('pet friendly') || lowerText.includes('pets allowed')) {
        return 'Pets Allowed';
      }
      if (lowerText.includes('pet deposit') || lowerText.includes('pet fee')) {
        return 'Pets Allowed (Fee Required)';
      }
    }
  }
  
  return 'Pet Policy Unknown';
}

/**
 * Extract parking information
 */
export async function extractParkingInfo(scrapedData: ScrapedPropertyData): Promise<string> {
  const textFields = [
    scrapedData.free_rent_concessions,
    scrapedData.name,
    ...(scrapedData.amenities || [])
  ].filter(Boolean);
  
  for (const text of textFields) {
    if (typeof text === 'string') {
      const lowerText = text.toLowerCase();
      
      if (lowerText.includes('garage parking')) {
        return 'Garage Parking Available';
      }
      if (lowerText.includes('covered parking')) {
        return 'Covered Parking Available';
      }
      if (lowerText.includes('street parking')) {
        return 'Street Parking Only';
      }
      if (lowerText.includes('no parking')) {
        return 'No Parking Available';
      }
      if (lowerText.includes('parking')) {
        return 'Parking Available';
      }
    }
  }
  
  return 'Parking Information Unknown';
}

/**
 * Generate Apartment IQ data for market intelligence
 */
export async function generateIqData(scrapedData: ScrapedPropertyData): Promise<ApartmentIQData> {
  try {
    const basePrice = scrapedData.current_price || 0;
    const marketRent = scrapedData.market_rent;
    const priceChanges = scrapedData.price_changes || 0;
    const daysOnMarket = scrapedData.days_on_market || 0;
    
    // Determine market position
    let marketPosition: ApartmentIQData['market_position'] = 'at_market';
    let confidenceScore = 0.5;
    
    if (marketRent && marketRent > 0) {
      const priceDiff = (basePrice - marketRent) / marketRent;
      if (priceDiff < -0.1) {
        marketPosition = 'below_market';
        confidenceScore = Math.min(0.9, 0.6 + Math.abs(priceDiff));
      } else if (priceDiff > 0.1) {
        marketPosition = 'above_market';
        confidenceScore = Math.min(0.9, 0.6 + Math.abs(priceDiff));
      } else {
        confidenceScore = 0.8;
      }
    }
    
    // Determine price trend
    let priceTrend: ApartmentIQData['price_trend'] = 'stable';
    if (priceChanges > 2) {
      priceTrend = 'increasing';
    } else if (priceChanges < -1) {
      priceTrend = 'decreasing';
    }
    
    // Determine demand level
    let demandLevel: ApartmentIQData['demand_level'] = 'medium';
    if (daysOnMarket > 60) {
      demandLevel = 'low';
    } else if (daysOnMarket < 14) {
      demandLevel = 'high';
    }
    
    // Calculate competitiveness score
    const competitivenessScore = Math.round(
      (confidenceScore * 0.4 + 
       (demandLevel === 'high' ? 0.9 : demandLevel === 'medium' ? 0.6 : 0.3) * 0.3 +
       (marketPosition === 'below_market' ? 0.9 : marketPosition === 'at_market' ? 0.7 : 0.4) * 0.3) * 100
    );
    
    // Generate recommendation
    let recommendation = 'Standard market listing';
    if (marketPosition === 'below_market' && demandLevel === 'high') {
      recommendation = 'Excellent value - likely to rent quickly';
    } else if (marketPosition === 'above_market' && demandLevel === 'low') {
      recommendation = 'Overpriced - may need price adjustment';
    } else if (demandLevel === 'high') {
      recommendation = 'High demand area - competitive pricing recommended';
    }
    
    return {
      market_position: marketPosition,
      confidence_score: Math.round(confidenceScore * 100) / 100,
      price_trend: priceTrend,
      demand_level: demandLevel,
      competitiveness_score: competitivenessScore,
      recommendation,
      last_updated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error generating IQ data:', error);
    return {
      market_position: 'at_market',
      confidence_score: 0.5,
      price_trend: 'stable',
      demand_level: 'medium',
      competitiveness_score: 50,
      recommendation: 'Market analysis unavailable',
      last_updated: new Date().toISOString()
    };
  }
}

/**
 * Parse concession value from text description
 */
function parseConcessionValue(concessionText: string): number {
  if (!concessionText) return 0;
  
  const text = concessionText.toLowerCase();
  
  // Look for "X months free" pattern
  const monthsFreeMatch = text.match(/(\d+)\s*months?\s*free/);
  if (monthsFreeMatch) {
    const monthsFree = parseInt(monthsFreeMatch[1]);
    // Assume average rent is the current price, amortize over 12 months
    return monthsFree * 100; // Rough estimate
  }
  
  // Look for dollar amounts
  const dollarMatch = text.match(/\$(\d+(?:,\d{3})*)/);
  if (dollarMatch) {
    return parseInt(dollarMatch[1].replace(/,/g, ''));
  }
  
  return 0;
}

/**
 * Calculate monthly equivalent of various fees
 */
function calculateMonthlyFees(scrapedData: ScrapedPropertyData): number {
  let monthlyFees = 0;
  
  // Application fee (amortized over 12 months)
  if (scrapedData.application_fee && !scrapedData.admin_fee_waived) {
    monthlyFees += scrapedData.application_fee / 12;
  }
  
  // Admin fee (amortized over 12 months)
  if (scrapedData.admin_fee_amount && !scrapedData.admin_fee_waived) {
    monthlyFees += scrapedData.admin_fee_amount / 12;
  }
  
  return monthlyFees;
}

/**
 * Batch transform multiple properties
 */
export async function batchTransformProperties(
  scrapedProperties: ScrapedPropertyData[]
): Promise<FrontendProperty[]> {
  const transformedProperties: FrontendProperty[] = [];
  
  for (const property of scrapedProperties) {
    try {
      const transformed = await transformScrapedToFrontendFormat(property);
      transformedProperties.push(transformed);
    } catch (error) {
      console.error(`Error transforming property ${property.external_id}:`, error);
      // Continue with other properties
    }
  }
  
  return transformedProperties;
}

/**
 * Save transformed properties to the new frontend schema
 */
export async function saveTransformedProperties(
  supabase: SupabaseClient,
  frontendProperties: FrontendProperty[],
  targetTable: string = 'properties'
): Promise<{ success: number; errors: number }> {
  let success = 0;
  let errors = 0;
  
  for (const property of frontendProperties) {
    try {
      const { error } = await supabase
        .from(targetTable)
        .upsert(property, { 
          onConflict: 'external_id',
          ignoreDuplicates: false 
        });
      
      if (error) {
        console.error(`Error saving property ${property.external_id}:`, error);
        errors++;
      } else {
        success++;
      }
    } catch (error) {
      console.error(`Exception saving property ${property.external_id}:`, error);
      errors++;
    }
  }
  
  return { success, errors };
}