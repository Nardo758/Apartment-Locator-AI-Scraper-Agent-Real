export interface ScrapedProperty {
  id?: string | number;
  external_id?: string;
  title?: string;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  price?: number;
  rent?: number;
  current_price?: number;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  square_feet?: number;
  concessions?: string | null;
  concessions_raw?: unknown;
  unit?: string | null;
  unit_number?: string | null;
  url?: string;
  listing_url?: string;
  scraped_at?: string;
  [key: string]: unknown;
}

export type SharedScrapedProperty = ScrapedProperty;
export default ScrapedProperty;
