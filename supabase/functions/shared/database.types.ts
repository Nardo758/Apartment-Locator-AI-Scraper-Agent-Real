export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      properties: {
        Row: {
          id: string
          external_id: string
          source_url: string
          source_site: string
          property_name: string | null
          address: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          neighborhood: string | null
          current_price: number | null
          original_price: number | null
          effective_rent: number | null
          price_per_sqft: number | null
          bedrooms: number | null
          bathrooms: number | null
          square_feet: number | null
          available_date: string | null
          amenities: string[] | null
          description: string | null
          images: string[] | null
          concessions: Json | null
          free_rent_concessions: boolean | null
          concession_details: string | null
          phone: string | null
          email: string | null
          created_at: string
          updated_at: string
          last_scraped_at: string
          is_available: boolean | null
          data_quality_score: number | null
        }
        Insert: {
          id?: string
          external_id: string
          source_url: string
          source_site: string
          property_name?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          neighborhood?: string | null
          current_price?: number | null
          original_price?: number | null
          effective_rent?: number | null
          price_per_sqft?: number | null
          bedrooms?: number | null
          bathrooms?: number | null
          square_feet?: number | null
          available_date?: string | null
          amenities?: string[] | null
          description?: string | null
          images?: string[] | null
          concessions?: Json | null
          free_rent_concessions?: boolean | null
          concession_details?: string | null
          phone?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
          last_scraped_at?: string
          is_available?: boolean | null
          data_quality_score?: number | null
        }
        Update: {
          id?: string
          external_id?: string
          source_url?: string
          source_site?: string
          property_name?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          neighborhood?: string | null
          current_price?: number | null
          original_price?: number | null
          effective_rent?: number | null
          price_per_sqft?: number | null
          bedrooms?: number | null
          bathrooms?: number | null
          square_feet?: number | null
          available_date?: string | null
          amenities?: string[] | null
          description?: string | null
          images?: string[] | null
          concessions?: Json | null
          free_rent_concessions?: boolean | null
          concession_details?: string | null
          phone?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
          last_scraped_at?: string
          is_available?: boolean | null
          data_quality_score?: number | null
        }
      }
      scraping_jobs: {
        Row: {
          id: string
          url: string
          status: string
          priority: number
          attempts: number
          max_attempts: number
          last_error: string | null
          results: Json | null
          created_at: string
          started_at: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          url: string
          status?: string
          priority?: number
          attempts?: number
          max_attempts?: number
          last_error?: string | null
          results?: Json | null
          created_at?: string
          started_at?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          url?: string
          status?: string
          priority?: number
          attempts?: number
          max_attempts?: number
          last_error?: string | null
          results?: Json | null
          created_at?: string
          started_at?: string | null
          completed_at?: string | null
        }
      }
      scraping_costs: {
        Row: {
          id: string
          date: string
          properties_scraped: number
          ai_requests: number
          tokens_used: number
          estimated_cost: number
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          date?: string
          properties_scraped?: number
          ai_requests?: number
          tokens_used?: number
          estimated_cost?: number
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          date?: string
          properties_scraped?: number
          ai_requests?: number
          tokens_used?: number
          estimated_cost?: number
          details?: Json | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      rpc_inc_scraping_costs: {
        Args: {
          p_date?: string
          p_properties_scraped?: number
          p_ai_requests?: number
          p_tokens_used?: number
          p_estimated_cost?: number
          p_details?: Json
        }
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
