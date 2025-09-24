// @ts-nocheck
import * as process from 'node:process';

jest.mock('@supabase/supabase-js', () => {
  return {
    createClient: () => ({
      from: () => ({
        upsert: (p: unknown) => ({ data: [p], error: null }),
        update: () => ({
          eq: () => ({
            lt: () => ({ select: () => ({ data: [{ id: 1 }], error: null }) }),
          }),
        }),
      }),
    }),
  };
});

import SupabaseClientWrapper from '../../tools/supabaseClient';

test('upsertApartment returns row', async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  const c = new SupabaseClientWrapper();
  const res = await c.upsertApartment({ external_id: 't1', rent_price: 1000 } as any);
  expect(res).toBeTruthy();
  expect((res as any).external_id).toBe('t1');
});

test('deactivateOldListings returns count', async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  const c = new SupabaseClientWrapper();
  const n = await c.deactivateOldListings('any', 7);
  expect(n).toBe(1);
});
