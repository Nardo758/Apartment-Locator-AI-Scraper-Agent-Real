export interface Apartment {
  id?: string
  external_id?: string
  source?: string
  title?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  latitude?: number
  longitude?: number
  rent_price?: number
  bedrooms?: number
  bathrooms?: number
  square_feet?: number
  amenities?: string[]
  images?: string[]
  is_active?: boolean
  scraped_at?: string
}

