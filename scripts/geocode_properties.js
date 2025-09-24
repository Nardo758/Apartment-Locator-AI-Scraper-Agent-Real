const NodeGeocoder = require('node-geocoder');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load .env.local if present (simple parser)
const envFile = '.env.local';
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith('#') || line.indexOf('=') === -1) continue;
    const parts = line.split('=');
    const key = parts.shift().trim();
    const val = parts.join('=').trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const provider = process.env.GEOCODER_PROVIDER || 'openstreetmap';
const apiKey = process.env.GEOCODER_API_KEY || undefined;
const batchSize = Number(process.env.BATCH_SIZE || 100);
const dryRun = !!process.env.DRY_RUN;

const geocoder = NodeGeocoder({ provider, apiKey });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function geocodePropertiesOnce() {
  console.log(`Geocoder provider=${provider} batchSize=${batchSize} dryRun=${dryRun}`);

  let properties = null;
  let error = null;
  // Try selecting zip_code (if migration applied). If the column doesn't exist,
  // fall back to a query without it so the script can run against older schemas.
  try {
    const res = await supabase
      .from('scraped_properties')
      .select('id, external_id, address, city, state, zip_code')
      .is('latitude', null)
      .limit(batchSize);
    properties = res.data;
    error = res.error;
  } catch (err) {
    // supabase-js throws for some errors; handle gracefully and try fallback
    console.warn('Initial select with zip_code failed, retrying without zip_code:', err?.message || err);
  }

  if (error && error.code === '42703') {
    // column does not exist; retry without zip_code
    const res2 = await supabase
      .from('scraped_properties')
      .select('id, external_id, address, city, state')
      .is('latitude', null)
      .limit(batchSize);
    properties = res2.data;
    error = res2.error;
  } else if (!properties && !error) {
    // If properties not set but no structured error, attempt fallback select
    const resFallback = await supabase
      .from('scraped_properties')
      .select('id, external_id, address, city, state')
      .is('latitude', null)
      .limit(batchSize);
    properties = resFallback.data;
    error = resFallback.error;
  }

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
      const lat = r.latitude;
      const lng = r.longitude;
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
  await geocodePropertiesOnce();
}

if (require.main === module) {
  main().catch((err) => {
    console.error('geocode_properties failed:', err);
    process.exit(1);
  });
}

module.exports = { geocodePropertiesOnce };
