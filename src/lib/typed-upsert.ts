import type { Database } from "@types/database.types.ts";

/**
 * Typed upsert helper for non-functions code (Node/Esm path). Keeps a
 * narrow any-cast inside a single helper so callers can use Database
 * indexed types without PostgREST overload leakage.
 */
export async function typedUpsert<
  T extends keyof Database["public"]["Tables"],
>(
  supabase: unknown,
  table: T,
  values: Database["public"]["Tables"][T]["Insert"] | Database["public"]["Tables"][T]["Insert"][],
  options?: Record<string, unknown>,
): Promise<{ data: unknown; error: unknown }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await (supabase as any).from(String(table)).upsert(values as any, options as any);
  return { data: res.data, error: res.error } as { data: unknown; error: unknown };
}

export default typedUpsert;
