/*
Integration test that simulates the Claude worker upserting into `apartments`.
- Posts a sample apartment object via Supabase REST (upsert into `apartments` table)

Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
*/
const fetch = require('node-fetch');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to run this integration test');
  process.exit(1);
}

(async () => {
  const apartment = {
    external_id: 'claude_test_' + Date.now(),
    source: 'claude-test',
    title: 'Claude Test Apartment',
    address: '1 Claude Way',
    city: 'AI City',
    state: 'NY',
    rent_price: 1600,
    rent_amount: 1600,
    bedrooms: 1,
    bathrooms: 1.0,
    free_rent_concessions: '2 weeks free',
    application_fee: 30,
    admin_fee_amount: 0,
    security_deposit: 400,
    scraped_at: new Date().toISOString(),
  };

  const url = SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/apartments';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify(apartment)
  });
  console.log('Upsert status', res.status);
  console.log('Body:', await res.text());
})();
