/*
Integration test for rpc_bulk_upsert_properties_v2
- Prepares a payload and POSTS to /rpc/rpc_bulk_upsert_properties_v2
- Then queries scraped_properties and price_history for the inserted external_id

Usage:
  node scripts/integration_test_rpc_v2.js

Requires env vars:
  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
*/

import process from "node:process";
const fetch = require("node-fetch");

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY || "";
const RPC = "rpc_bulk_upsert_properties_v2";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to run this integration test",
  );
  process.exit(1);
}

const payloads = [
  {
    external_id: "int_test_ext_" + Date.now(),
    property_id: "int.example.com",
    unit_number: "500",
    unit: "500",
    name: "Integration Test Unit 500",
    address: "500 Integration Ave",
    source: "int.example.com",
    city: "TestCity",
    state: "CA",
    current_price: 1500,
    bedrooms: 1,
    bathrooms: 1.0,
    square_feet: 600,
    listing_url: "https://int.example.com/500",
    amenities: ["pool", "gym"],
    free_rent_concessions: "1 month free",
    application_fee: 35,
    admin_fee_waived: false,
    admin_fee_amount: 0,
    security_deposit: 500,
    ai_price: 1490,
    effective_price: 1450,
    latitude: 37.77,
    longitude: -122.41,
    zip_code: "94103",
    ai_provider: "test-provider",
    ai_raw: { test: true },
  },
];

(async () => {
  const url = SUPABASE_URL.replace(/\/$/, "") + `/rest/v1/rpc/${RPC}`;
  console.log("Posting payload to", url);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "apikey": SERVICE_KEY,
      "Authorization": `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_rows: payloads }),
  });
  console.log("RPC status", res.status);
  const text = await res.text();
  console.log("RPC response:", text);

  // Query the inserted scraped_properties row
  const external_id = payloads[0].external_id;
  const qUrl = SUPABASE_URL.replace(/\/$/, "") +
    `/rest/v1/scraped_properties?external_id=eq.${
      encodeURIComponent(external_id)
    }&select=*`;
  const qRes = await fetch(qUrl, {
    headers: {
      "apikey": SERVICE_KEY,
      "Authorization": `Bearer ${SERVICE_KEY}`,
    },
  });
  console.log("Query scraped_properties status", qRes.status);
  const qJson = await qRes.json();
  console.log("scraped_properties rows:", JSON.stringify(qJson, null, 2));

  // Query price_history for the external_id
  const phUrl = SUPABASE_URL.replace(/\/$/, "") +
    `/rest/v1/price_history?external_id=eq.${
      encodeURIComponent(external_id)
    }&select=*`;
  const phRes = await fetch(phUrl, {
    headers: {
      "apikey": SERVICE_KEY,
      "Authorization": `Bearer ${SERVICE_KEY}`,
    },
  });
  console.log("Query price_history status", phRes.status);
  const phJson = await phRes.json();
  console.log("price_history rows:", JSON.stringify(phJson, null, 2));
})();
