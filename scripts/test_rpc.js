// scripts/test_rpc.js
// Minimal smoke test for the RPCs. Usage in PowerShell:
// $env:SUPABASE_URL='https://...'; $env:SUPABASE_SERVICE_ROLE_KEY='...'; node ./scripts/test_rpc.js

const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment');
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  try {
    console.log('Calling rpc_update_property_with_history...');
    const { data, error } = await supabase.rpc('rpc_update_property_with_history', {
      p_external_id: 'test_bulk_1',
      p_payload: { current_price: 1234, name: 'RPC Test Unit' }
    });
    if (error) console.error('RPC error:', error);
    else console.log('RPC result:', data);

    console.log('Calling rpc_bulk_upsert_properties...');
    const rows = [
      { property_id: 'test_building', unit_number: 'U1', unit: 'U1', name: 'Unit U1', address: '1 Test St', source: 'test', city: 'Testville', state: 'TS', current_price: 1000, bedrooms: 1, bathrooms: 1.0, listing_url: 'https://example.com/u1' }
    ];
  const { data: bulkData, error: bulkErr } = await supabase.rpc('rpc_bulk_upsert_properties', { p_rows: rows });
    if (bulkErr) console.error('Bulk RPC error:', bulkErr);
    else console.log('Bulk RPC result:', bulkData);
  } catch (err) {
    console.error('Unexpected error', err);
  }
}

run();
