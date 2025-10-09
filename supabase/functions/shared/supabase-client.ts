import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type Database from "../../../src/types/supabase-db.ts";

/**
 * Local wrapper for Supabase functions: re-exports the repo-level
 * createTypedClient but uses a relative path so Deno can resolve it
 * when checking / bundling functions.
 */
export function createTypedClient(url: string, key: string): SupabaseClient<Database> {
  return createClient(url, key) as unknown as SupabaseClient<Database>;
}

export default createTypedClient;
