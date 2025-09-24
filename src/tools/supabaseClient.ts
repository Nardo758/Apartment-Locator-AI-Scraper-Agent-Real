import { createClient, SupabaseClient as SClient, PostgrestResponse } from '@supabase/supabase-js';
import type { Apartment } from '../types'
import * as process from 'node:process';

// Apartment type moved to src/types/apartment.ts

export class SupabaseClientWrapper {
  private client: SClient;

  constructor() {
    const url = process.env.SUPABASE_URL || 'https://jdymvpasjsdbryatscux.supabase.co';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
    this.client = createClient(url, key);
  }

  async upsertApartment(apartment: Apartment) {
    const payload: Record<string, unknown> = {
      external_id: apartment.external_id,
      source: apartment.source || 'unknown',
      title: apartment.title,
      address: apartment.address,
      city: apartment.city,
      state: apartment.state,
      zip_code: apartment.zip_code,
      latitude: apartment.latitude,
      longitude: apartment.longitude,
      rent_price: apartment.rent_price,
      bedrooms: apartment.bedrooms,
      bathrooms: apartment.bathrooms,
      square_feet: apartment.square_feet,
      amenities: apartment.amenities || [],
      images: apartment.images || [],
      is_active: true,
      scraped_at: new Date().toISOString(),
    };

    // strip undefined fields
    for (const [k, v] of Object.entries(payload)) {
      if (v === undefined) delete payload[k];
    }

  const result = await this.client.from('apartments').upsert(payload, { onConflict: 'external_id' }) as PostgrestResponse<unknown>
  // result.data may be null; narrow safely
  const data = result.data
  const error = result.error
    if (error) throw error;
    if (data === null) return null;
    return Array.isArray(data) ? data[0] : data;
  }

  async deactivateOldListings(source: string, cutoffDays = 7) {
    const cutoff = new Date(Date.now() - cutoffDays * 24 * 3600 * 1000).toISOString();
    const { data, error } = await this.client.from('apartments').update({ is_active: false }).eq('source', source).lt('scraped_at', cutoff).select();
    if (error) throw error;
    return Array.isArray(data) ? data.length : 0;
  }
}

export default SupabaseClientWrapper;
