export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_results: {
        Row: {
          created_at: string | null
          id: string
          job_id: string | null
          model: string | null
          result: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_id?: string | null
          model?: string | null
          result?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          job_id?: string | null
          model?: string | null
          result?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_results_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "scrape_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      apartment_iq_data: {
        Row: {
          concession_urgency: string | null
          concession_value: number | null
          created_at: string | null
          days_on_market: number | null
          id: string
          lease_probability: number | null
          market_position: string | null
          negotiation_potential: number | null
          percentile_rank: number | null
          property_id: string | null
          rent_change_percent: number | null
          rent_trend: string | null
          updated_at: string | null
          urgency_score: number | null
        }
        Insert: {
          concession_urgency?: string | null
          concession_value?: number | null
          created_at?: string | null
          days_on_market?: number | null
          id?: string
          lease_probability?: number | null
          market_position?: string | null
          negotiation_potential?: number | null
          percentile_rank?: number | null
          property_id?: string | null
          rent_change_percent?: number | null
          rent_trend?: string | null
          updated_at?: string | null
          urgency_score?: number | null
        }
        Update: {
          concession_urgency?: string | null
          concession_value?: number | null
          created_at?: string | null
          days_on_market?: number | null
          id?: string
          lease_probability?: number | null
          market_position?: string | null
          negotiation_potential?: number | null
          percentile_rank?: number | null
          property_id?: string | null
          rent_change_percent?: number | null
          rent_trend?: string | null
          updated_at?: string | null
          urgency_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "apartment_iq_data_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      apartments: {
        Row: {
          address: string
          amenities: Json | null
          available_date: string | null
          bathrooms: number
          bedrooms: number
          building_type: string | null
          city: string
          contact_email: string | null
          contact_info: Json | null
          contact_name: string | null
          created_at: string | null
          deposit_amount: number | null
          description: string | null
          external_id: string | null
          furnished: boolean | null
          id: string
          intelligence_confidence: number | null
          intelligence_source: string | null
          is_active: boolean | null
          is_available: boolean | null
          neighborhood: string | null
          pets_allowed: boolean | null
          property_type: string
          rent_amount: number
          rent_price: number | null
          researched_at: string | null
          scraped_at: string | null
          scraping_job_id: number | null
          source: string | null
          source_name: string | null
          source_url: string | null
          square_feet: number | null
          state: string
          title: string
          transit_access: string | null
          unit_count: number | null
          updated_at: string | null
          walk_score: number | null
          year_built: number | null
          zip_code: string | null
        }
        Insert: {
          address: string
          amenities?: Json | null
          available_date?: string | null
          bathrooms: number
          bedrooms: number
          building_type?: string | null
          city: string
          contact_email?: string | null
          contact_info?: Json | null
          contact_name?: string | null
          created_at?: string | null
          deposit_amount?: number | null
          description?: string | null
          external_id?: string | null
          furnished?: boolean | null
          id?: string
          intelligence_confidence?: number | null
          intelligence_source?: string | null
          is_active?: boolean | null
          is_available?: boolean | null
          neighborhood?: string | null
          pets_allowed?: boolean | null
          property_type?: string
          rent_amount: number
          rent_price?: number | null
          researched_at?: string | null
          scraped_at?: string | null
          scraping_job_id?: number | null
          source?: string | null
          source_name?: string | null
          source_url?: string | null
          square_feet?: number | null
          state: string
          title: string
          transit_access?: string | null
          unit_count?: number | null
          updated_at?: string | null
          walk_score?: number | null
          year_built?: number | null
          zip_code?: string | null
        }
        Update: {
          address?: string
          amenities?: Json | null
          available_date?: string | null
          bathrooms?: number
          bedrooms?: number
          building_type?: string | null
          city?: string
          contact_email?: string | null
          contact_info?: Json | null
          contact_name?: string | null
          created_at?: string | null
          deposit_amount?: number | null
          description?: string | null
          external_id?: string | null
          furnished?: boolean | null
          id?: string
          intelligence_confidence?: number | null
          intelligence_source?: string | null
          is_active?: boolean | null
          is_available?: boolean | null
          neighborhood?: string | null
          pets_allowed?: boolean | null
          property_type?: string
          rent_amount?: number
          rent_price?: number | null
          researched_at?: string | null
          scraped_at?: string | null
          scraping_job_id?: number | null
          source?: string | null
          source_name?: string | null
          source_url?: string | null
          square_feet?: number | null
          state?: string
          title?: string
          transit_access?: string | null
          unit_count?: number | null
          updated_at?: string | null
          walk_score?: number | null
          year_built?: number | null
          zip_code?: string | null
        }
        Relationships: []
      }
      market_intelligence: {
        Row: {
          average_rent: number | null
          calculated_at: string | null
          concession_prevalence: number | null
          days_on_market_avg: number | null
          id: string
          insights: Json | null
          leasing_velocity: number | null
          location: string
          market_velocity: string | null
          new_listings_weekly: number | null
          price_reductions_weekly: number | null
          recommendations: Json | null
          rent_change_ytd: number | null
          rent_per_sqft: number | null
          rent_trend: string | null
          vacancy_rate: number | null
        }
        Insert: {
          average_rent?: number | null
          calculated_at?: string | null
          concession_prevalence?: number | null
          days_on_market_avg?: number | null
          id?: string
          insights?: Json | null
          leasing_velocity?: number | null
          location: string
          market_velocity?: string | null
          new_listings_weekly?: number | null
          price_reductions_weekly?: number | null
          recommendations?: Json | null
          rent_change_ytd?: number | null
          rent_per_sqft?: number | null
          rent_trend?: string | null
          vacancy_rate?: number | null
        }
        Update: {
          average_rent?: number | null
          calculated_at?: string | null
          concession_prevalence?: number | null
          days_on_market_avg?: number | null
          id?: string
          insights?: Json | null
          leasing_velocity?: number | null
          location?: string
          market_velocity?: string | null
          new_listings_weekly?: number | null
          price_reductions_weekly?: number | null
          recommendations?: Json | null
          rent_change_ytd?: number | null
          rent_per_sqft?: number | null
          rent_trend?: string | null
          vacancy_rate?: number | null
        }
        Relationships: []
      }
      price_history: {
        Row: {
          change_type: string | null
          external_id: string
          id: number
          price: number
          recorded_at: string | null
        }
        Insert: {
          change_type?: string | null
          external_id: string
          id?: number
          price: number
          recorded_at?: string | null
        }
        Update: {
          change_type?: string | null
          external_id?: string
          id?: number
          price?: number
          recorded_at?: string | null
        }
        Relationships: []
      }
      price_history_backup_pre_enhanced: {
        Row: {
          change_type: string | null
          external_id: string | null
          id: number | null
          price: number | null
          recorded_at: string | null
        }
        Insert: {
          change_type?: string | null
          external_id?: string | null
          id?: number | null
          price?: number | null
          recorded_at?: string | null
        }
        Update: {
          change_type?: string | null
          external_id?: string | null
          id?: number | null
          price?: number | null
          recorded_at?: string | null
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          ai_price: number
          amenities: string[] | null
          apartment_iq_data: Json | null
          availability: string | null
          availability_type: string | null
          bathrooms: number
          bedrooms: number
          city: string
          created_at: string | null
          effective_price: number
          external_id: string | null
          features: string[] | null
          id: string
          images: string[] | null
          is_active: boolean | null
          last_scraped: string | null
          latitude: number | null
          longitude: number | null
          market_velocity: string | null
          match_score: number | null
          name: string
          original_price: number
          parking: string | null
          pet_policy: string | null
          property_type: string | null
          rent_per_sqft: number | null
          savings: number | null
          source_url: string | null
          sqft: number
          state: string
          updated_at: string | null
          year_built: number | null
          zip: string | null
        }
        Insert: {
          address: string
          ai_price: number
          amenities?: string[] | null
          apartment_iq_data?: Json | null
          availability?: string | null
          availability_type?: string | null
          bathrooms: number
          bedrooms: number
          city: string
          created_at?: string | null
          effective_price: number
          external_id?: string | null
          features?: string[] | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          last_scraped?: string | null
          latitude?: number | null
          longitude?: number | null
          market_velocity?: string | null
          match_score?: number | null
          name: string
          original_price: number
          parking?: string | null
          pet_policy?: string | null
          property_type?: string | null
          rent_per_sqft?: number | null
          savings?: number | null
          source_url?: string | null
          sqft?: number
          state: string
          updated_at?: string | null
          year_built?: number | null
          zip?: string | null
        }
        Update: {
          address?: string
          ai_price?: number
          amenities?: string[] | null
          apartment_iq_data?: Json | null
          availability?: string | null
          availability_type?: string | null
          bathrooms?: number
          bedrooms?: number
          city?: string
          created_at?: string | null
          effective_price?: number
          external_id?: string | null
          features?: string[] | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          last_scraped?: string | null
          latitude?: number | null
          longitude?: number | null
          market_velocity?: string | null
          match_score?: number | null
          name?: string
          original_price?: number
          parking?: string | null
          pet_policy?: string | null
          property_type?: string | null
          rent_per_sqft?: number | null
          savings?: number | null
          source_url?: string | null
          sqft?: number
          state?: string
          updated_at?: string | null
          year_built?: number | null
          zip?: string | null
        }
        Relationships: []
      }
      property_intelligence: {
        Row: {
          amenities: string[] | null
          building_type: string | null
          confidence_score: number | null
          id: number
          neighborhood: string | null
          property_name: string
          property_type: string | null
          raw_research_data: Json | null
          research_source: string | null
          research_timestamp: string | null
          source_url: string
          transit_access: string | null
          unit_count: number | null
          walk_score: number | null
          year_built: number | null
        }
        Insert: {
          amenities?: string[] | null
          building_type?: string | null
          confidence_score?: number | null
          id?: number
          neighborhood?: string | null
          property_name: string
          property_type?: string | null
          raw_research_data?: Json | null
          research_source?: string | null
          research_timestamp?: string | null
          source_url: string
          transit_access?: string | null
          unit_count?: number | null
          walk_score?: number | null
          year_built?: number | null
        }
        Update: {
          amenities?: string[] | null
          building_type?: string | null
          confidence_score?: number | null
          id?: number
          neighborhood?: string | null
          property_name?: string
          property_type?: string | null
          raw_research_data?: Json | null
          research_source?: string | null
          research_timestamp?: string | null
          source_url?: string
          transit_access?: string | null
          unit_count?: number | null
          walk_score?: number | null
          year_built?: number | null
        }
        Relationships: []
      }
      rental_offers: {
        Row: {
          counter_offer_amount: number | null
          created_at: string | null
          expected_savings: number | null
          final_agreement_amount: number | null
          id: string
          landlord_response: string | null
          lease_duration: number | null
          negotiation_strategy: Json | null
          offer_amount: number
          property_id: string | null
          proposed_move_in_date: string | null
          special_requests: string | null
          status: string | null
          success_probability: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          counter_offer_amount?: number | null
          created_at?: string | null
          expected_savings?: number | null
          final_agreement_amount?: number | null
          id?: string
          landlord_response?: string | null
          lease_duration?: number | null
          negotiation_strategy?: Json | null
          offer_amount: number
          property_id?: string | null
          proposed_move_in_date?: string | null
          special_requests?: string | null
          status?: string | null
          success_probability?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          counter_offer_amount?: number | null
          created_at?: string | null
          expected_savings?: number | null
          final_agreement_amount?: number | null
          id?: string
          landlord_response?: string | null
          lease_duration?: number | null
          negotiation_strategy?: Json | null
          offer_amount?: number
          property_id?: string | null
          proposed_move_in_date?: string | null
          special_requests?: string | null
          status?: string | null
          success_probability?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rental_offers_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      scrape_jobs: {
        Row: {
          apartment_url: string
          attempt_count: number
          created_at: string | null
          finished_at: string | null
          id: string
          payload: Json | null
          started_at: string | null
          status: string
        }
        Insert: {
          apartment_url: string
          attempt_count?: number
          created_at?: string | null
          finished_at?: string | null
          id?: string
          payload?: Json | null
          started_at?: string | null
          status?: string
        }
        Update: {
          apartment_url?: string
          attempt_count?: number
          created_at?: string | null
          finished_at?: string | null
          id?: string
          payload?: Json | null
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      scraped_properties: {
        Row: {
          address: string
          admin_fee_amount: number | null
          admin_fee_waived: boolean | null
          ai_price: number | null
          amenities: Json | null
          application_fee: number | null
          bathrooms: number
          bedrooms: number
          city: string
          concession_type: string | null
          concession_value: number | null
          created_at: string | null
          current_price: number
          days_on_market: number | null
          effective_price: number | null
          external_id: string | null
          first_seen_at: string | null
          free_rent_concessions: string | null
          id: number
          last_price_change: string | null
          last_seen_at: string | null
          latitude: number | null
          listing_url: string
          longitude: number | null
          market_position: string | null
          market_velocity: string | null
          name: string
          parking_info: string | null
          percentile_rank: number | null
          pet_policy: string | null
          price_change_count: number | null
          property_id: string
          property_type: string | null
          scraped_at: string | null
          security_deposit: number | null
          source: string
          square_feet: number | null
          square_footage: number | null
          state: string
          status: string | null
          unit: string | null
          unit_features: Json | null
          unit_number: string
          updated_at: string | null
          volatility_score: number | null
          zip_code: string | null
        }
        Insert: {
          address: string
          admin_fee_amount?: number | null
          admin_fee_waived?: boolean | null
          ai_price?: number | null
          amenities?: Json | null
          application_fee?: number | null
          bathrooms: number
          bedrooms: number
          city: string
          concession_type?: string | null
          concession_value?: number | null
          created_at?: string | null
          current_price: number
          days_on_market?: number | null
          effective_price?: number | null
          external_id?: string | null
          first_seen_at?: string | null
          free_rent_concessions?: string | null
          id?: number
          last_price_change?: string | null
          last_seen_at?: string | null
          latitude?: number | null
          listing_url: string
          longitude?: number | null
          market_position?: string | null
          market_velocity?: string | null
          name: string
          parking_info?: string | null
          percentile_rank?: number | null
          pet_policy?: string | null
          price_change_count?: number | null
          property_id: string
          property_type?: string | null
          scraped_at?: string | null
          security_deposit?: number | null
          source: string
          square_feet?: number | null
          square_footage?: number | null
          state: string
          status?: string | null
          unit?: string | null
          unit_features?: Json | null
          unit_number: string
          updated_at?: string | null
          volatility_score?: number | null
          zip_code?: string | null
        }
        Update: {
          address?: string
          admin_fee_amount?: number | null
          admin_fee_waived?: boolean | null
          ai_price?: number | null
          amenities?: Json | null
          application_fee?: number | null
          bathrooms?: number
          bedrooms?: number
          city?: string
          concession_type?: string | null
          concession_value?: number | null
          created_at?: string | null
          current_price?: number
          days_on_market?: number | null
          effective_price?: number | null
          external_id?: string | null
          first_seen_at?: string | null
          free_rent_concessions?: string | null
          id?: number
          last_price_change?: string | null
          last_seen_at?: string | null
          latitude?: number | null
          listing_url?: string
          longitude?: number | null
          market_position?: string | null
          market_velocity?: string | null
          name?: string
          parking_info?: string | null
          percentile_rank?: number | null
          pet_policy?: string | null
          price_change_count?: number | null
          property_id?: string
          property_type?: string | null
          scraped_at?: string | null
          security_deposit?: number | null
          source?: string
          square_feet?: number | null
          square_footage?: number | null
          state?: string
          status?: string | null
          unit?: string | null
          unit_features?: Json | null
          unit_number?: string
          updated_at?: string | null
          volatility_score?: number | null
          zip_code?: string | null
        }
        Relationships: []
      }
      scraped_properties_backup_pre_enhanced: {
        Row: {
          address: string | null
          admin_fee_amount: number | null
          admin_fee_waived: boolean | null
          application_fee: number | null
          bathrooms: number | null
          bedrooms: number | null
          city: string | null
          created_at: string | null
          current_price: number | null
          external_id: string | null
          first_seen_at: string | null
          free_rent_concessions: string | null
          id: number | null
          last_scraped: string | null
          last_seen_at: string | null
          listing_url: string | null
          name: string | null
          property_id: string | null
          scraped_at: string | null
          security_deposit: number | null
          source: string | null
          square_feet: number | null
          state: string | null
          status: string | null
          unit: string | null
          unit_number: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          admin_fee_amount?: number | null
          admin_fee_waived?: boolean | null
          application_fee?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          created_at?: string | null
          current_price?: number | null
          external_id?: string | null
          first_seen_at?: string | null
          free_rent_concessions?: string | null
          id?: number | null
          last_scraped?: string | null
          last_seen_at?: string | null
          listing_url?: string | null
          name?: string | null
          property_id?: string | null
          scraped_at?: string | null
          security_deposit?: number | null
          source?: string | null
          square_feet?: number | null
          state?: string | null
          status?: string | null
          unit?: string | null
          unit_number?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          admin_fee_amount?: number | null
          admin_fee_waived?: boolean | null
          application_fee?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          created_at?: string | null
          current_price?: number | null
          external_id?: string | null
          first_seen_at?: string | null
          free_rent_concessions?: string | null
          id?: number | null
          last_scraped?: string | null
          last_seen_at?: string | null
          listing_url?: string | null
          name?: string | null
          property_id?: string | null
          scraped_at?: string | null
          security_deposit?: number | null
          source?: string | null
          square_feet?: number | null
          state?: string | null
          status?: string | null
          unit?: string | null
          unit_number?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      scraping_cache: {
        Row: {
          content_hash: string | null
          etag: string | null
          expires_at: string | null
          fetched_at: string | null
          html: string | null
          id: string
          source: string
          url: string
        }
        Insert: {
          content_hash?: string | null
          etag?: string | null
          expires_at?: string | null
          fetched_at?: string | null
          html?: string | null
          id?: string
          source: string
          url: string
        }
        Update: {
          content_hash?: string | null
          etag?: string | null
          expires_at?: string | null
          fetched_at?: string | null
          html?: string | null
          id?: string
          source?: string
          url?: string
        }
        Relationships: []
      }
      scraping_costs: {
        Row: {
          ai_requests: number | null
          created_at: string | null
          date: string | null
          details: Json | null
          estimated_cost: number | null
          id: number
          properties_scraped: number | null
          tokens_used: number | null
        }
        Insert: {
          ai_requests?: number | null
          created_at?: string | null
          date?: string | null
          details?: Json | null
          estimated_cost?: number | null
          id?: number
          properties_scraped?: number | null
          tokens_used?: number | null
        }
        Update: {
          ai_requests?: number | null
          created_at?: string | null
          date?: string | null
          details?: Json | null
          estimated_cost?: number | null
          id?: number
          properties_scraped?: number | null
          tokens_used?: number | null
        }
        Relationships: []
      }
      scraping_logs: {
        Row: {
          created_at: string | null
          id: string
          job_id: string | null
          level: string
          message: string
          meta: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_id?: string | null
          level?: string
          message: string
          meta?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          job_id?: string | null
          level?: string
          message?: string
          meta?: Json | null
        }
        Relationships: []
      }
      scraping_queue: {
        Row: {
          avg_scrape_duration: number | null
          change_frequency: number | null
          completed_at: string | null
          created_at: string | null
          data: Json | null
          error: string | null
          external_id: string
          id: number
          last_change_date: string | null
          last_successful_scrape: string | null
          priority: number | null
          priority_score: number | null
          priority_tier: number | null
          property_id: string
          scrape_attempts: number | null
          source: string
          started_at: string | null
          status: string | null
          success_rate: number | null
          unit_number: string
          url: string
        }
        Insert: {
          avg_scrape_duration?: number | null
          change_frequency?: number | null
          completed_at?: string | null
          created_at?: string | null
          data?: Json | null
          error?: string | null
          external_id: string
          id?: number
          last_change_date?: string | null
          last_successful_scrape?: string | null
          priority?: number | null
          priority_score?: number | null
          priority_tier?: number | null
          property_id: string
          scrape_attempts?: number | null
          source: string
          started_at?: string | null
          status?: string | null
          success_rate?: number | null
          unit_number: string
          url: string
        }
        Update: {
          avg_scrape_duration?: number | null
          change_frequency?: number | null
          completed_at?: string | null
          created_at?: string | null
          data?: Json | null
          error?: string | null
          external_id?: string
          id?: number
          last_change_date?: string | null
          last_successful_scrape?: string | null
          priority?: number | null
          priority_score?: number | null
          priority_tier?: number | null
          property_id?: string
          scrape_attempts?: number | null
          source?: string
          started_at?: string | null
          status?: string | null
          success_rate?: number | null
          unit_number?: string
          url?: string
        }
        Relationships: []
      }
      scraping_queue_backup_pre_enhanced: {
        Row: {
          attempt_count: number | null
          available_at: string | null
          completed_at: string | null
          created_at: string | null
          data: Json | null
          error: string | null
          external_id: string | null
          finished_at: string | null
          id: string | null
          payload: Json | null
          priority: number | null
          property_id: string | null
          scheduled_at: string | null
          source: string | null
          started_at: string | null
          status: string | null
          unit_number: string | null
          url: string | null
        }
        Insert: {
          attempt_count?: number | null
          available_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          data?: Json | null
          error?: string | null
          external_id?: string | null
          finished_at?: string | null
          id?: string | null
          payload?: Json | null
          priority?: number | null
          property_id?: string | null
          scheduled_at?: string | null
          source?: string | null
          started_at?: string | null
          status?: string | null
          unit_number?: string | null
          url?: string | null
        }
        Update: {
          attempt_count?: number | null
          available_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          data?: Json | null
          error?: string | null
          external_id?: string | null
          finished_at?: string | null
          id?: string | null
          payload?: Json | null
          priority?: number | null
          property_id?: string | null
          scheduled_at?: string | null
          source?: string | null
          started_at?: string | null
          status?: string | null
          unit_number?: string | null
          url?: string | null
        }
        Relationships: []
      }
      sources: {
        Row: {
          created_at: string | null
          id: number
          last_scraping_success: boolean | null
          name: string
          priority: string
          scraping_strategy: string | null
          updated_at: string | null
          url: string
          website_type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          last_scraping_success?: boolean | null
          name: string
          priority: string
          scraping_strategy?: string | null
          updated_at?: string | null
          url: string
          website_type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          last_scraping_success?: boolean | null
          name?: string
          priority?: string
          scraping_strategy?: string | null
          updated_at?: string | null
          url?: string
          website_type?: string | null
        }
        Relationships: []
      }
      user_activities: {
        Row: {
          action_details: Json | null
          activity_type: string
          component_name: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          page_name: string | null
          user_id: string | null
        }
        Insert: {
          action_details?: Json | null
          activity_type: string
          component_name?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          page_name?: string | null
          user_id?: string | null
        }
        Update: {
          action_details?: Json | null
          activity_type?: string
          component_name?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          page_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          allow_contact: boolean | null
          created_at: string | null
          currency: string | null
          default_location: string | null
          default_radius_km: number | null
          email_notifications: boolean | null
          id: string
          language: string | null
          marketing_emails: boolean | null
          max_price_range: number | null
          min_price_range: number | null
          preferred_bathrooms: number[] | null
          preferred_bedrooms: number[] | null
          preferred_property_types: string[] | null
          profile_visibility: string | null
          push_notifications: boolean | null
          show_online_status: boolean | null
          sms_notifications: boolean | null
          theme: string | null
          timezone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          allow_contact?: boolean | null
          created_at?: string | null
          currency?: string | null
          default_location?: string | null
          default_radius_km?: number | null
          email_notifications?: boolean | null
          id?: string
          language?: string | null
          marketing_emails?: boolean | null
          max_price_range?: number | null
          min_price_range?: number | null
          preferred_bathrooms?: number[] | null
          preferred_bedrooms?: number[] | null
          preferred_property_types?: string[] | null
          profile_visibility?: string | null
          push_notifications?: boolean | null
          show_online_status?: boolean | null
          sms_notifications?: boolean | null
          theme?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          allow_contact?: boolean | null
          created_at?: string | null
          currency?: string | null
          default_location?: string | null
          default_radius_km?: number | null
          email_notifications?: boolean | null
          id?: string
          language?: string | null
          marketing_emails?: boolean | null
          max_price_range?: number | null
          min_price_range?: number | null
          preferred_bathrooms?: number[] | null
          preferred_bedrooms?: number[] | null
          preferred_property_types?: string[] | null
          profile_visibility?: string | null
          push_notifications?: boolean | null
          show_online_status?: boolean | null
          sms_notifications?: boolean | null
          theme?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          ai_preferences: Json | null
          bedrooms: string | null
          budget: number | null
          created_at: string | null
          credit_score: string | null
          deal_breakers: string[] | null
          email: string
          gross_income: number | null
          lease_duration: string | null
          location: string | null
          max_budget: number | null
          max_commute: number | null
          move_timeline: string | null
          preferred_amenities: string[] | null
          priorities: string[] | null
          search_criteria: Json | null
          transportation: string | null
          updated_at: string | null
          user_id: string
          work_address: string | null
        }
        Insert: {
          ai_preferences?: Json | null
          bedrooms?: string | null
          budget?: number | null
          created_at?: string | null
          credit_score?: string | null
          deal_breakers?: string[] | null
          email: string
          gross_income?: number | null
          lease_duration?: string | null
          location?: string | null
          max_budget?: number | null
          max_commute?: number | null
          move_timeline?: string | null
          preferred_amenities?: string[] | null
          priorities?: string[] | null
          search_criteria?: Json | null
          transportation?: string | null
          updated_at?: string | null
          user_id: string
          work_address?: string | null
        }
        Update: {
          ai_preferences?: Json | null
          bedrooms?: string | null
          budget?: number | null
          created_at?: string | null
          credit_score?: string | null
          deal_breakers?: string[] | null
          email?: string
          gross_income?: number | null
          lease_duration?: string | null
          location?: string | null
          max_budget?: number | null
          max_commute?: number | null
          move_timeline?: string | null
          preferred_amenities?: string[] | null
          priorities?: string[] | null
          search_criteria?: Json | null
          transportation?: string | null
          updated_at?: string | null
          user_id?: string
          work_address?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      scraping_queue_prioritized: {
        Row: {
          avg_scrape_duration: number | null
          calculated_score: number | null
          change_frequency: number | null
          completed_at: string | null
          created_at: string | null
          data: Json | null
          days_since_last_scrape: number | null
          error: string | null
          external_id: string | null
          id: number | null
          last_change_date: string | null
          last_price_change: string | null
          last_successful_scrape: string | null
          price_change_count: number | null
          priority: number | null
          priority_score: number | null
          priority_tier: number | null
          property_id: string | null
          scrape_attempts: number | null
          source: string | null
          started_at: string | null
          status: string | null
          success_rate: number | null
          unit_number: string | null
          url: string | null
          volatility_score: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_priority_score: {
        Args: {
          p_days_since_last_scrape: number
          p_property_id: string
          p_scrape_attempts: number
          p_success_rate: number
          p_volatility_score: number
        }
        Returns: number
      }
      export_user_data: {
        Args: { p_export_type?: string; p_user_id: string }
        Returns: Json
      }
      get_next_scraping_batch: {
        Args: { batch_size?: number }
        Returns: {
          ai_model: string
          external_id: string
          priority_score: number
          queue_id: number
          source: string
          url: string
        }[]
      }
      has_property_changed: {
        Args: { new_data: Json; old_data: Json; significant_fields: string[] }
        Returns: boolean
      }
      has_property_changed_default: {
        Args: { new_data: Json; old_data: Json }
        Returns: boolean
      }
      rpc_bulk_upsert_properties: {
        Args: { p_rows: Json }
        Returns: Json
      }
      rpc_compute_percentile: {
        Args: { p_external_id: string }
        Returns: number
      }
      rpc_inc_scraping_costs: {
        Args: {
          p_ai_requests?: number
          p_date: string
          p_details?: Json
          p_estimated_cost?: number
          p_properties_scraped?: number
          p_tokens_used?: number
        }
        Returns: undefined
      }
      rpc_update_property_with_history: {
        Args: { p_external_id: string; p_payload: Json }
        Returns: {
          id: number
        }[]
      }
      search_apartments: {
        Args: {
          p_bedrooms?: number[]
          p_city?: string
          p_rent_max?: number
          p_rent_min?: number
          p_state?: string
        }
        Returns: {
          address: string
          bathrooms: number
          bedrooms: number
          city: string
          contact_email: string
          id: string
          property_type: string
          rent_amount: number
          state: string
          title: string
        }[]
      }
      search_properties_near_location: {
        Args: {
          lat: number
          lng: number
          max_bedrooms?: number
          max_price?: number
          min_bedrooms?: number
          min_price?: number
          radius_km?: number
          user_id_param?: string
        }
        Returns: {
          address: string
          ai_price: number
          availability_type: string
          bathrooms: number
          bedrooms: number
          city: string
          distance_km: number
          effective_price: number
          id: string
          market_velocity: string
          match_score: number
          name: string
          original_price: number
          sqft: number
          state: string
        }[]
      }
      transform_scraped_to_properties: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      update_days_on_market: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_scraping_metrics: {
        Args: {
          p_duration: number
          p_external_id: string
          p_price_changed: boolean
          p_success: boolean
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
