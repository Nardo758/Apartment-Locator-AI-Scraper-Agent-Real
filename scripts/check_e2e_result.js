// scripts/check_e2e_result.js
// Usage (PowerShell):
// Get-Content .env | ForEach-Object { if (/^\s*([^#=]+)=(.*)$/.test($_)) { $m=RegExp.$1; $v=RegExp.$2; $env:$m=$v } }; node ./scripts/check_e2e_result.js

const { createClient } = require('@supabase/supabase-js');
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
const supabase = createClient(url, key);

(async function(){
  try {
    const { data: qData, error: qErr } = await supabase.from('scraping_queue').select('id, status, started_at, completed_at, priority_score').eq('external_id','test_building_U1');
    if (qErr) console.error('Queue error', qErr); else console.log('Queue row:', qData);

    const { data: spData, error: spErr } = await supabase.from('scraped_properties').select('external_id, price_change_count, volatility_score, last_price_change').eq('external_id','test_building_U1');
    if (spErr) console.error('Properties error', spErr); else console.log('Scraped property:', spData);
  } catch (err) {
    console.error('Unexpected', err);
  }
})();
