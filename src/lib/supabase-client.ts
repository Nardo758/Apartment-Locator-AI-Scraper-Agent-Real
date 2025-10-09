import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type Database from "../types/supabase-db.ts";

/**
 * Centralized factory that returns a Supabase client typed with our
 * `Database` interface. We perform a single, local cast here to avoid
 * propagating Supabase library generic differences throughout the repo.
 */
export function createTypedClient(url: string, key: string): SupabaseClient<Database> {
  // createClient may return a SupabaseClient with library-specific generic
  // parameters; cast to our Database-parameterized client to make the rest
  // of the codebase easier to type. Keep this cast narrow and documented.
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return createClient(url, key) as unknown as SupabaseClient<Database>;
}

export default createTypedClient;
