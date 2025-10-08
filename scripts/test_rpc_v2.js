// Small test harness to build a full payload for rpc_bulk_upsert_properties_v2
// Usage: node scripts/test_rpc_v2.js
// If SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set, it will attempt to POST to your Supabase instance.

import process from "node:process";
const fetch = require('node-fetch');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
const RPC_NAME = 'rpc_bulk_upsert_properties_v2';

const payloads = [
  {
    external_id: 'test_ext_1',
    property_id: 'example.com',
    unit_number: '101',
    unit: '101',
    name: 'Test Unit 101',
    address: '123 Example St',
    source: 'example.com',
    city: 'Testville',
    state: 'TX',
    current_price: 1250,
    bedrooms: 1,
    bathrooms: 1.0,
    square_feet: 700,
    listing_url: 'https://example.com/listing/101',
    amenities: ['pool','gym'],
    free_rent_concessions: '1 month free on 12 month lease',
    application_fee: 50,
    admin_fee_waived: false,
    admin_fee_amount: 0,
    security_deposit: 500,
    ai_price: 1200,
    effective_price: 1180,
    latitude: 32.7767,
    longitude: -96.7970,
    zip_code: '75001',
    ai_provider: 'claude',
    ai_raw: { raw: 'sample ai output' }
  }
];

(async () => {
  console.log('Prepared payload:');
  console.log(JSON.stringify({ p_rows: payloads }, null, 2));

  if (SUPABASE_URL && SERVICE_KEY && !SUPABASE_URL.includes('demo')) {
    const url = SUPABASE_URL.replace(/\/$/, '') + `/rest/v1/rpc/${RPC_NAME}`;
    console.log('Posting to', url);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p_rows: payloads })
    });
    const text = await res.text();
    console.log('Response status:', res.status);
    console.log('Response body:', text);
  } else {
    console.log('\nEnvironment variables SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY not set - skipping POST.');
  }
})();
