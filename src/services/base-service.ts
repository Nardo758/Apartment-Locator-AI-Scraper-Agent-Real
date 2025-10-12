import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { Database } from '../types/database.types.ts'
import { errMsg } from '../lib/error.ts'

type Tables = Database['public']['Tables']

export abstract class BaseService {
  protected supabase: ReturnType<typeof createClient<Tables>>
  
  constructor(supabaseUrl?: string, supabaseKey?: string) {
    const url = supabaseUrl || Deno.env.get('SUPABASE_URL')
    const key = supabaseKey || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!url || !key) {
      throw new Error('Supabase configuration missing')
    }
    
    this.supabase = createClient<Tables>(url, key)
  }

  protected handleError(error: unknown, context: string): never {
    const message = errMsg(error)
    console.error(`Service error in ${context}:`, message)
    throw new Error(`${context}: ${message}`)
  }

  protected validateRequired(value: unknown, field: string): void {
    if (value === undefined || value === null || value === '') {
      throw new Error(`Missing required field: ${field}`)
    }
  }
}
