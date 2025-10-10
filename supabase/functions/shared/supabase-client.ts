import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { Database } from "./database.types.ts";

/**
 * Local wrapper for Supabase functions: re-exports the repo-level
 * createTypedClient but uses a relative path so Deno can resolve it
 * when checking / bundling functions.
 */
export function createTypedClient(url: string, key: string): SupabaseClient<Database> {
  return createClient<Database>(url, key);
}

export default createTypedClient;
export function getServiceClient(): SupabaseClient<Database> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient<Database>(supabaseUrl, supabaseKey)
}
