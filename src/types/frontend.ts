// Shared frontend and scraped data types used across the scraping pipeline

export interface ScrapedPropertyData {
  id?: number;
  external_id: string;
  property_id: string;
  unit_number: string;
  property_source_id?: number;
  source: string;
  website_name?: string;
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
  amenities?: string[];
  features?: string[];
  pet_policy?: string;
  parking?: string;
  latitude?: number;
  longitude?: number;
  zip_code?: string;
  market_rent?: number;
  rent_estimate_low?: number;
  rent_estimate_high?: number;
  days_on_market?: number;
  price_changes?: number;
  stability_score?: number;
  change_frequency?: number;
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
  original_price: number;
  ai_price?: number;
  effective_price?: number;
  market_rent?: number;
  rent_estimate_low?: number;
  rent_estimate_high?: number;
  amenities?: string[];
  features?: string[];
  pet_policy?: string;
  parking?: string;
  application_fee?: number;
  admin_fee_amount?: number;
  admin_fee_waived?: boolean;
  security_deposit?: number;
  free_rent_concessions?: string;
  apartment_iq_data?: ApartmentIQData;
  listing_url: string;
  source: string;
  status: string;
  first_seen_at?: string;
  last_seen_at?: string;
  days_on_market?: number;
  price_changes?: number;
}
