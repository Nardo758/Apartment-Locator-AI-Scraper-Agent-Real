import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { Database } from "../types/database.types.ts";

/**
 * Centralized factory that returns a Supabase client typed with our
 * `Database` interface. We perform a single, local cast here to avoid
 * propagating Supabase library generic differences throughout the repo.
 */
export function createTypedClient(url: string, key: string): SupabaseClient<Database> {
  return createClient<Database>(url, key);
}

export default createTypedClient;
