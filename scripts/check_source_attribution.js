// scripts/check_source_attribution.js
import { createClient } from '@supabase/supabase-js';
import process from "node:process";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const supabase = createClient(url, key);

(async function(){
  console.log('Checking apartments with source attribution...\n');

  const { data, error } = await supabase
    .from('apartments')
    .select('title, rent_price, bedrooms, bathrooms, source_url, source_name, scraping_job_id, created_at')
    .not('source_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error querying apartments:', error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('No apartments found with source attribution yet.');
    return;
  }

  console.log(`Found ${data.length} apartments with source tracking:\n`);
  console.log('┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ Apartment Name                    │ Rent │ Beds │ Baths │ Source Name     │ Job ID │ Created         │');
  console.log('├─────────────────────────────────────────────────────────────────────────────────────────────────────┤');

  data.forEach(apt => {
    const name = (apt.title || 'Unknown').substring(0, 30).padEnd(30);
    const rent = (apt.rent_price ? `$${apt.rent_price}` : 'N/A').padEnd(4);
    const beds = String(apt.bedrooms || 0).padEnd(4);
    const baths = String(apt.bathrooms || 0).padEnd(5);
    const source = (apt.source_name || 'Unknown').substring(0, 15).padEnd(15);
    const jobId = String(apt.scraping_job_id || 'N/A').padEnd(6);
    const created = new Date(apt.created_at).toLocaleDateString().padEnd(15);

    console.log(`│ ${name} │ ${rent} │ ${beds} │ ${baths} │ ${source} │ ${jobId} │ ${created} │`);
  });

  console.log('└─────────────────────────────────────────────────────────────────────────────────────────────────────┘\n');

  // Also show source URLs separately for readability
  console.log('Source URLs:');
  data.forEach((apt, i) => {
    if (apt.source_url) {
      console.log(`${i + 1}. ${apt.source_url}`);
    }
  });

})();