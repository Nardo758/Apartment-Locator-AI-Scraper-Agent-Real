// scripts/test_serp_call.js
// Simple Node script to POST to local Serp URL scraper function
const fetch = require('node-fetch');

(async function(){
  const payload = { query: 'apartments in atlanta', location: 'Atlanta, GA', num_results: 5 };
  const res = await fetch('http://127.0.0.1:54321/functions/v1/serp-url-scraper', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
})();
