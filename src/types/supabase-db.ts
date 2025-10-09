// Minimal Supabase Database typings used for incremental typing fixes.
// Keep this file small; expand types as needed for other modules.
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

// Named row types for commonly used tables
export interface ScrapedPropertiesRow {
  id?: string;
  external_id: string;
  property_id?: string;
  unit_number?: string | null;
  source?: string | null;
  name?: string | null;
  address?: string | null;
  unit?: string | null;
  city?: string | null;
  state?: string | null;
  current_price?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  square_feet?: number | null;
  first_seen_at?: string | null;
  free_rent_concessions?: Json | null;
  application_fee?: number | null;
  admin_fee_waived?: boolean | null;
  admin_fee_amount?: number | null;
  security_deposit?: number | null;
  listing_url?: string | null;
  scraped_at?: string | null;
  status?: string | null;
}

export interface PropertiesRow {
  id: string;
  external_id?: string | null;
  name?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  sqft?: number | null;
  original_price?: number | null;
  ai_price?: number | null;
  effective_price?: number | null;
  rent_per_sqft?: number | null;
  amenities?: Json | null;
  features?: Json | null;
  apartment_iq_data?: Json | null;
  property_source_id?: number | null;
  scraped_property_id?: number | null;
  is_active?: boolean | null;
  source_url?: string | null;
  images?: string[] | null;
  last_scraped?: string | null;
  match_score?: number | null;
}

export interface ScrapingCostsRow {
  id: number;
  date: string;
  properties_scraped: number;
  tokens_used: number;
  estimated_cost: number;
  details?: Json | null;
}

export interface BatchJobsRow {
  id: number;
  status: string;
  created_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  properties_processed?: number | null;
  estimated_duration?: string | null;
  details?: Json | null;
}

export interface Database {
  public: {
    Tables: {
      scraped_properties: {
        Row: ScrapedPropertiesRow;
        Insert: Partial<ScrapedPropertiesRow>;
        Update: Partial<ScrapedPropertiesRow>;
      };
      apartments: {
        Row: ScrapedPropertiesRow;
        Insert: Partial<ScrapedPropertiesRow>;
        Update: Partial<ScrapedPropertiesRow>;
      };
      property_intelligence: {
        Row: Partial<Record<string, unknown>>;
        Insert: Partial<Record<string, unknown>>;
        Update: Partial<Record<string, unknown>>;
      };
      market_intelligence: {
        Row: {
          location: string;
          location_type?: string | null;
          average_rent?: number | null;
          rent_per_sqft?: number | null;
          vacancy_rate?: number | null;
          days_on_market_avg?: number | null;
          concession_prevalence?: number | null;
          rent_trend?: string | null;
          market_velocity?: string | null;
          new_listings_weekly?: number | null;
          calculated_at?: string | null;
          valid_until?: string | null;
        };
        Insert: Partial<{
          location: string;
          location_type?: string | null;
          average_rent?: number | null;
          rent_per_sqft?: number | null;
          vacancy_rate?: number | null;
          days_on_market_avg?: number | null;
          concession_prevalence?: number | null;
          rent_trend?: string | null;
          market_velocity?: string | null;
          new_listings_weekly?: number | null;
          calculated_at?: string | null;
          valid_until?: string | null;
        }>;
        Update: Partial<{
          location: string;
          location_type?: string | null;
          average_rent?: number | null;
          rent_per_sqft?: number | null;
          vacancy_rate?: number | null;
          days_on_market_avg?: number | null;
          concession_prevalence?: number | null;
          rent_trend?: string | null;
          market_velocity?: string | null;
          new_listings_weekly?: number | null;
          calculated_at?: string | null;
          valid_until?: string | null;
        }>;
      };
      user_profiles: {
        Row: {
          user_id: string;
          email?: string | null;
          name?: string | null;
          updated_at?: string | null;
        };
        Insert: Partial<{
          user_id: string;
          email?: string | null;
          name?: string | null;
        }>;
        Update: Partial<{
          user_id: string;
          email?: string | null;
          name?: string | null;
        }>;
      };
      properties: {
        Row: PropertiesRow;
        Insert: Partial<PropertiesRow>;
        Update: Partial<PropertiesRow>;
      };
      batch_jobs: {
        Row: BatchJobsRow;
        Insert: Partial<BatchJobsRow>;
        Update: Partial<BatchJobsRow>;
      };
      scraping_queue: {
        Row: {
          id: number;
          external_id: string;
          source: string | null;
          status: string;
          created_at?: string | null;
          updated_at?: string | null;
          scraping_job_id?: number | null;
        };
  Insert: Partial<Record<string, unknown>>;
  Update: Partial<Record<string, unknown>>;
      };
      system_events: {
        Row: {
          id: number;
          type: string;
          payload: Json | null;
          created_at?: string | null;
        };
  Insert: Partial<Record<string, unknown>>;
  Update: Partial<Record<string, unknown>>;
      };
      system_config: {
        Row: {
          key: string;
          value: Json | null;
          updated_at?: string | null;
        };
  Insert: Partial<Record<string, unknown>>;
  Update: Partial<Record<string, unknown>>;
      };
      scraping_costs: {
        Row: ScrapingCostsRow;
        Insert: Partial<ScrapingCostsRow>;
        Update: Partial<ScrapingCostsRow>;
      };
      apartment_iq_data: {
        Row: {
          id?: number;
          property_id: string;
          current_rent?: number | null;
          original_rent?: number | null;
          effective_rent?: number | null;
          concession_value?: number | null;
          concession_type?: string | null;
          concession_urgency?: string | null;
          days_on_market?: number | null;
          first_seen?: string | null;
          market_velocity?: string | null;
          market_position?: string | null;
          lease_probability?: number | null;
          negotiation_potential?: number | null;
          urgency_score?: number | null;
          rent_trend?: string | null;
          concession_trend?: string | null;
        };
        Insert: Partial<{
          id?: number;
          property_id: string;
          current_rent?: number | null;
          original_rent?: number | null;
          effective_rent?: number | null;
          concession_value?: number | null;
          concession_type?: string | null;
          concession_urgency?: string | null;
          days_on_market?: number | null;
          first_seen?: string | null;
          market_velocity?: string | null;
          market_position?: string | null;
        }>;
        Update: Partial<{
          id?: number;
          property_id: string;
          current_rent?: number | null;
          original_rent?: number | null;
          effective_rent?: number | null;
          concession_value?: number | null;
          concession_type?: string | null;
          concession_urgency?: string | null;
          days_on_market?: number | null;
          first_seen?: string | null;
          market_velocity?: string | null;
          market_position?: string | null;
        }>;
      };
      recent_activity: {
        Row: {
          id: number;
          timestamp: string;
          type: string;
          message: string;
          details?: Record<string, unknown> | null;
        };
        Insert: Partial<Record<string, unknown>>;
        Update: Partial<Record<string, unknown>>;
      };
    };
    Functions: {
      search_properties_near_location: {
        Args: {
          lat: number;
          lng: number;
          radius_km: number;
          min_bedrooms?: number;
          max_bedrooms?: number;
          min_price?: number;
          max_price?: number;
          user_id_param?: string | null;
        };
        Returns: Json;
      };
      calculate_property_match_score: {
        Args: {
          property_id_param: string;
          user_id_param: string;
        };
        Returns: number | null;
      };
      get_next_scraping_batch: {
        Args: { batch_size: number };
        Returns: { id: number; external_id: string; url: string; property_name?: string }[] | null;
      };
      get_next_property_sources_batch: {
        Args: { batch_size: number; region_filter?: string | null };
        Returns: { id: number; url: string; property_name: string; website_name?: string; expected_units?: number; region?: string }[] | null;
      };
      update_scraping_metrics: {
        Args: { p_external_id: string; p_success: boolean; p_duration: number; p_price_changed: boolean };
        Returns: void;
      };
      rpc_inc_scraping_costs: {
        Args: { p_date?: string; p_properties_scraped?: number; p_ai_requests?: number; p_tokens_used?: number; p_estimated_cost?: number; p_details?: Json };
        Returns: void;
      };
    };
  };
}

export default Database;
