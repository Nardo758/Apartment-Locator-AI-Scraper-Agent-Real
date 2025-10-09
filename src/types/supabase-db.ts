// Minimal Supabase Database typings used for incremental typing fixes.
// Keep this file small; expand types as needed for other modules.
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      scraped_properties: {
        Row: {
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
        };
        Insert: Partial<Record<string, unknown>>;
        Update: Partial<Record<string, unknown>>;
      };
      market_intelligence: {
        Row: {
          location: string;
          average_rent?: number | null;
          rent_per_sqft?: number | null;
          concession_prevalence?: number | null;
          calculated_at?: string | null;
          market_velocity?: string | null;
        };
        Insert: Partial<Record<string, unknown>>;
        Update: Partial<Record<string, unknown>>;
      };
      user_profiles: {
        Row: {
          user_id: string;
          updated_at?: string | null;
        };
        Insert: Partial<Record<string, unknown>>;
        Update: Partial<Record<string, unknown>>;
      };
      properties: {
        Row: {
          id: string;
          apartment_iq_data?: Json | null;
          is_active?: boolean | null;
          match_score?: number | null;
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
    };
  };
}

export default Database;
