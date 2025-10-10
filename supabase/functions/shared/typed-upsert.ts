import type { Database } from "./database.types.ts";

/**
 * Small helper to centralize calling Supabase's upsert while keeping
 * call-sites typed against our Database definition. Internally it
 * performs a narrow `any` cast so the PostgREST overload mismatch
 * doesn't leak to callers.
 */
export async function typedUpsert<
  T extends keyof Database["public"]["Tables"],
>(
  supabase: unknown,
  table: T,
  values: Database["public"]["Tables"][T]["Insert"] | Database["public"]["Tables"][T]["Insert"][],
  options?: Record<string, unknown>,
): Promise<{ data: unknown; error: unknown }> {
  // supabase client runtime call: cast to any and forward then await the result.
  // We return a small, un-opinionated shape so callers can destructure {data, error}
  // without the PostgREST builder type leaking through the generic mismatch.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await (supabase as any).from(String(table)).upsert(values as any, options as any);
  return { data: res.data, error: res.error } as { data: unknown; error: unknown };
}

export default typedUpsert;
