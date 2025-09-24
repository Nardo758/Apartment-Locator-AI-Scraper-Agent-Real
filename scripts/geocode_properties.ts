import NodeGeocoder from 'node-geocoder';
import { createClient } from '@supabase/supabase-js';

// Usage: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env
// Optional env:
// GEOCODER_PROVIDER (default: 'openstreetmap')
// GEOCODER_API_KEY (for providers that need a key)
// BATCH_SIZE (default: 100)
// DRY_RUN=true to not persist updates

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const provider = process.env.GEOCODER_PROVIDER ?? 'openstreetmap';
const apiKey = process.env.GEOCODER_API_KEY ?? undefined;
const batchSize = Number(process.env.BATCH_SIZE ?? 100);
const dryRun = !!process.env.DRY_RUN;

const geocoder = NodeGeocoder({ provider, apiKey });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function geocodePropertiesOnce() {
  console.log(`Geocoder provider=${provider} batchSize=${batchSize} dryRun=${dryRun}`);

  const { data: properties, error } = await supabase
    .from('scraped_properties')
    .select('id, external_id, address, city, state, zip_code')
    .is('latitude', null)
    .limit(batchSize);

  if (error) {
    console.error('Error fetching properties to geocode:', error);
    return;
  }
  if (!properties || properties.length === 0) {
    console.log('No properties found missing coordinates.');
    return;
  }

  for (const p of properties) {
    try {
      const addrParts = [p.address, p.city, p.state, p.zip_code].filter(Boolean);
      const fullAddress = addrParts.join(', ');
      if (!fullAddress) {
        console.log(`Skipping property id=${p.id} external_id=${p.external_id} because address missing`);
        continue;
      }

      const results = await geocoder.geocode(fullAddress);
      if (!results || results.length === 0) {
        console.log(`No geocode result for id=${p.id} address='${fullAddress}'`);
        continue;
      }

      const r = results[0];
      const lat = r.latitude as number | undefined;
      const lng = r.longitude as number | undefined;
      if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
        console.log(`Invalid coords for id=${p.id} -> ${JSON.stringify(r)}`);
        continue;
      }

      console.log(`Property id=${p.id} -> lat=${lat} lng=${lng}`);
      if (!dryRun) {
        const { error: upErr } = await supabase
          .from('scraped_properties')
          .update({ latitude: lat, longitude: lng })
          .eq('id', p.id);
        if (upErr) console.error(`Failed to update property id=${p.id}:`, upErr);
      }
    } catch (err) {
      console.error('Geocoding error for property', p, err);
    }
  }
}

async function main() {
  // Loop once; for continuous background, wrap in setInterval or a scheduler
  await geocodePropertiesOnce();
}

if (require.main === module) {
  main().catch((err) => {
    console.error('geocode_properties failed:', err);
    process.exit(1);
  });
}

export { geocodePropertiesOnce };
