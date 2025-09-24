// Mock Deno.env.get for Node test environment (some modules reference Deno.env)
// Mock Deno.env.get for Node test environment (some modules reference Deno.env)
;(globalThis as any).Deno = { env: { get: (_: string) => undefined } };

import { scrapePropertyComplete } from '../index';

// Minimal mocked supabase client that returns a first_seen_at for the property lookup
function makeMockSupabase(firstSeen?: string | null) {
  const client: unknown = {
    from: (_: string) => ({
      select: (_s: string) => ({
        eq: (_k: string, _v: string) => ({
          maybeSingle: () => ({ data: firstSeen ? { first_seen_at: firstSeen } : null })
        })
      })
    })
  };
  return client as unknown;
}

test('scrapePropertyComplete returns enriched object with amenities and property_type', async () => {
  const mockSupabase = makeMockSupabase('2020-01-01T00:00:00Z');
  const input = { id: '1', external_id: 'ext-1', title: 'Nice Apt', price: 1200, url: 'http://example.com', address: '123 Main St, 94105', description: 'Includes hardwood floors and fitness center', name: 'Lovely apartment' };
  const result = await scrapePropertyComplete(mockSupabase as any, input as any);
  expect(result).toHaveProperty('amenities');
  expect(result).toHaveProperty('unit_features');
  expect(result).toHaveProperty('property_type', 'apartment');
  expect(result).toHaveProperty('first_seen_at', '2020-01-01T00:00:00Z');
  expect(result).toHaveProperty('ai_price');
  expect(typeof result.ai_price).toBe('number');
  expect(result).toHaveProperty('effective_price');
  expect(typeof result.effective_price).toBe('number');
  expect(result).toHaveProperty('market_position');
  expect(typeof result.market_position).toBe('string');
});
