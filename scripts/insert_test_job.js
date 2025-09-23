// scripts/insert_test_job.js
// Usage (PowerShell):
// Get-Content .env | ForEach-Object { if ($_ -match '^\s*([^#=]+)=(.*)$') { $name=$matches[1]; $value=$matches[2]; Set-Item -Path env:$name -Value $value } }; node ./scripts/insert_test_job.js

const { createClient } = require('@supabase/supabase-js');
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
const supabase = createClient(url, key);

(async function(){
  try {
    // Insert test scraped_property (don't set generated external_id)
    const propertyId = `e2e_test_${Date.now()}`;
    const property = {
      property_id: propertyId,
      current_price: 1000,
      name: 'E2E Test Unit',
      address: '123 Test Ave',
      source: 'e2e-test',
    };

    const { data: upserted, error: upErr } = await supabase.from('scraped_properties').upsert(property, { onConflict: ['property_id'] }).select();
    if (upErr) { console.error('Error upserting property', upErr); process.exit(1); }
    const created = upserted && upserted[0];
    console.log('Upserted property', created);

    // Get the generated external_id (depends on schema trigger or generated column)
    const externalId = created.external_id || `${propertyId}`;

    // Insert a scraping_queue row
    const queueRow = {
      external_id: externalId,
      property_id: propertyId,
      url: 'https://example.com/e2e_test',
      source: 'e2e-test',
      status: 'pending',
      priority_score: 75
    };

    const { data: qData, error: qErr } = await supabase.from('scraping_queue').insert(queueRow).select();
    if (qErr) { console.error('Error inserting queue row', qErr); process.exit(1); }
    console.log('Inserted scraping_queue row', qData && qData[0]);

    console.log('E2E test job inserted. external_id =', externalId);
  } catch (err) {
    console.error('Unexpected', err);
  }
})();
