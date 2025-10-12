import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types.ts';

type EnvLike = { get?: (k: string) => string | undefined } | undefined;

export function createTypedClient(url?: string, key?: string): SupabaseClient<any> {
  // Support both Deno and Node environments
  const denoEnv: EnvLike = (globalThis as unknown as { Deno?: { env?: EnvLike } }).Deno?.env;
  const resolvedUrl = url ?? denoEnv?.get?.('SUPABASE_URL') ?? process.env.SUPABASE_URL ?? '';
  const resolvedKey = key ?? denoEnv?.get?.('SUPABASE_SERVICE_ROLE_KEY') ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!resolvedUrl || !resolvedKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }
  return createClient<Database>(resolvedUrl, resolvedKey);
}

export function getSupabaseOrThrow(): SupabaseClient<any> {
  return createTypedClient();
}

// Localize any/cast surface area for upserts until all call-sites are fully typed
export function typedUpsert(
  supabase: SupabaseClient<Database>,
  table: keyof Database['public']['Tables'] | string,
  values: unknown,
  options?: { onConflict?: string; ignoreDuplicates?: boolean }
): any {
  return (supabase as any).from(table as any).upsert(values as any, options as any);
}
