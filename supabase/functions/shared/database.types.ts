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
        Row: { id: string; external_id: string; source_url: string; [key: string]: Json }
        Insert: { [key: string]: Json }
        Update: { [key: string]: Json }
      }
      scraping_jobs: {
        Row: { id: string; url: string; status: string; [key: string]: Json }
        Insert: { [key: string]: Json }
        Update: { [key: string]: Json }
      }
      scraping_costs: {
        Row: { id: string; date: string; [key: string]: Json }
        Insert: { [key: string]: Json }
        Update: { [key: string]: Json }
      }
    }
    Functions: {
      rpc_inc_scraping_costs: {
        Args: { [key: string]: Json }
        Returns: undefined
      }
    }
  }
}
