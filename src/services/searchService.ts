import { createClient } from '@supabase/supabase-js'
import * as process from 'node:process'
import type { Apartment } from '../types'

// Minimal supabase-like interface for the methods used by SearchService
interface QueryBuilder {
  select: (cols: string, opts?: { count?: 'exact' }) => QueryBuilder
  eq: (col: string, val: string | number | boolean) => QueryBuilder
  gte: (col: string, val: number) => QueryBuilder
  lte: (col: string, val: number) => QueryBuilder
  contains: (col: string, val: string[] | object) => QueryBuilder
  order: (col: string, opts?: { ascending?: boolean }) => QueryBuilder
  range: (from: number, to: number) => Promise<{ data: Apartment[] | null; error: unknown; count: number | null }>
}

interface SupabaseLike {
  from: (table: string) => QueryBuilder
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jdymvpasjsdbryatscux.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'test-key'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

export interface SearchFilters {
  city?: string
  minPrice?: number
  maxPrice?: number
  bedrooms?: number
  amenities?: string[]
  page?: number // 1-based
  pageSize?: number
  sort?: 'price_asc' | 'price_desc'
}

export interface SearchResult<T = Apartment> {
  data: T[] | null
  total: number | null
}

export class SearchService {
  private client: SupabaseLike
  constructor(client?: SupabaseLike) {
    this.client = client ?? (supabase as unknown as SupabaseLike)
  }

  async searchApartments(filters: SearchFilters = {}): Promise<SearchResult> {
    const page = Math.max(1, filters.page ?? 1)
    const pageSize = Math.max(1, Math.min(100, filters.pageSize ?? 20))
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let qb = this.client
      .from('apartments')
      .select('*', { count: 'exact' })
      .eq('is_active', true) as QueryBuilder

    if (filters.city) qb = qb.eq('city', filters.city)
    if (typeof filters.minPrice === 'number') qb = qb.gte('rent_price', filters.minPrice)
    if (typeof filters.maxPrice === 'number') qb = qb.lte('rent_price', filters.maxPrice)
    if (typeof filters.bedrooms === 'number') qb = qb.eq('bedrooms', filters.bedrooms)

    if (Array.isArray(filters.amenities) && filters.amenities.length > 0) {
      // use Postgres JSONB contains operator via supabase-js .contains
      qb = qb.contains('amenities', filters.amenities)
    }

    if (filters.sort === 'price_asc') qb = qb.order('rent_price', { ascending: true })
    if (filters.sort === 'price_desc') qb = qb.order('rent_price', { ascending: false })

    // range applies pagination; this returns the result promise
    const res = await qb.range(from, to)
    const { data, error, count } = res
    if (error) throw error

    return { data: data as Apartment[] | null, total: count }
  }
}

export default new SearchService()
