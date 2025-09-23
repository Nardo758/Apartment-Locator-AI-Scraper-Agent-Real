// scripts/verify_backfill.js
// Usage (PowerShell):
// Get-Content .env | ForEach-Object { if ($_ -match '^\s*([^#=]+)=(.*)$') { $name=$matches[1]; $value=$matches[2]; Set-Item -Path env:$name -Value $value } }; node ./scripts/verify_backfill.js

const { createClient } = require('@supabase/supabase-js');
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
const supabase = createClient(url, key);

(async function(){
  try {
    const { data: spCount, error: spErr } = await supabase
      .from('scraped_properties')
      .select('id', { count: 'exact' })
      .is('volatility_score', null);
    if (spErr) console.error('Error querying scraped_properties:', spErr);
    else console.log('scraped_properties with NULL volatility_score:', spCount.length);

    const { data: sqCount, error: sqErr } = await supabase
      .from('scraping_queue')
      .select('id', { count: 'exact' })
      .is('priority_score', null);
    if (sqErr) console.error('Error querying scraping_queue:', sqErr);
    else console.log('scraping_queue with NULL priority_score:', sqCount.length);

    const { data: sampleSp, error: sampleErr } = await supabase
      .from('scraped_properties')
      .select('external_id, price_change_count, volatility_score')
      .limit(5);
    if (sampleErr) console.error('Error fetching sample scraped_properties:', sampleErr);
    else console.log('Sample scraped_properties:', sampleSp);

    const { data: sampleSq, error: sampleSqErr } = await supabase
      .from('scraping_queue')
      .select('id, external_id, priority_score')
      .limit(5);
    if (sampleSqErr) console.error('Error fetching sample scraping_queue:', sampleSqErr);
    else console.log('Sample scraping_queue:', sampleSq);

  } catch (err) {
    console.error('Unexpected', err);
  }
})();
