const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Load .env.local if present
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
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables (or .env.local).');
  process.exit(1);
}

const batchSize = Number(process.env.BATCH_SIZE || 200);
const dryRun = !!process.env.DRY_RUN;
const computePercentile = !!process.env.COMPUTE_PERCENTILE;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function computePricingHeuristic(property) {
  const currentPrice = typeof property.current_price === 'number' ? property.current_price : (typeof property.price === 'number' ? property.price : Number(property.price || 0));
  const sqft = typeof property.square_footage === 'number' ? property.square_footage : (typeof property.square_footage === 'string' ? Number(property.square_footage) : undefined);
  let base = currentPrice || 0;
  if (!base && sqft && sqft > 0) base = Math.round(base || 0);

  const amenities = Array.isArray(property.amenities) ? property.amenities.length : 0;
  const unitFeatures = Array.isArray(property.unit_features) ? property.unit_features.length : 0;
  const amenityCount = amenities + unitFeatures;
  const amenityBoost = Math.min(amenityCount * 0.03, 0.25);

  const velocity = property.market_velocity || '';
  let velocityAdj = 0;
  if (velocity === 'hot') velocityAdj = 0.05;
  else if (velocity === 'normal') velocityAdj = 0;
  else if (velocity === 'slow') velocityAdj = -0.05;
  else if (velocity === 'stale') velocityAdj = -0.10;

  const aiPriceFloat = Math.max(0, base * (1 + amenityBoost + velocityAdj));
  const ai_price = Math.round(aiPriceFloat);
  const concession = typeof property.concession_value === 'number' ? property.concession_value : 0;
  const effective_price = Math.max(0, ai_price - Math.round(concession));

  let market_position = 'neutral';
  if (currentPrice > 0) {
    if (effective_price < currentPrice * 0.95) market_position = 'below';
    else if (effective_price > currentPrice * 1.05) market_position = 'above';
  }

  return { ai_price, effective_price, market_position };
}

async function runBackfill() {
  console.log(`populate_ai_pricing: dryRun=${dryRun} batchSize=${batchSize} computePercentile=${computePercentile}`);

  while (true) {
    const { data, error } = await supabase
      .from('scraped_properties')
      .select('id, external_id, current_price, price, square_footage, amenities, unit_features, market_velocity, concession_value, zip_code')
      .is('ai_price', null)
      .limit(batchSize);

    if (error) {
      console.error('Error selecting properties for backfill:', error);
      return;
    }
    if (!data || data.length === 0) {
      console.log('No more properties to backfill.');
      break;
    }

    for (const p of data) {
      const pricing = computePricingHeuristic(p);
      let percentile = null;
      if (computePercentile && p.external_id) {
        try {
          const { data: pr, error: prErr } = await supabase.rpc('rpc_compute_percentile', { p_external_id: p.external_id });
          if (prErr) {
            console.warn('Percentile RPC error for', p.external_id, prErr);
          } else if (pr && Array.isArray(pr) && pr.length > 0 && pr[0] && typeof pr[0] === 'number') {
            percentile = pr[0];
          } else if (pr && typeof pr === 'number') {
            percentile = pr;
          } else if (pr && pr.percentile_rank !== undefined) {
            percentile = pr.percentile_rank;
          }
        } catch (err) {
          console.warn('Failed computing percentile for', p.external_id, err?.message || err);
        }
      }

      const updatePayload = { ...pricing };
      if (percentile !== null) updatePayload.percentile_rank = percentile;

      if (dryRun) {
        console.log('DRY RUN - would update id=', p.id, 'payload=', updatePayload);
      } else {
        const { error: upErr } = await supabase.from('scraped_properties').update(updatePayload).eq('id', p.id);
        if (upErr) console.error('Failed to update id=', p.id, upErr);
        else console.log('Updated id=', p.id);
      }
    }
  }
}

if (require.main === module) {
  runBackfill().catch((err) => {
    console.error('populate_ai_pricing failed:', err);
    process.exit(1);
  });
}

module.exports = { runBackfill };
