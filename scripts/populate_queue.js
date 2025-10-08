/*
 * scripts/populate_queue.js
 * Usage: node scripts/populate_queue.js <region> <dry_run>
 * Reads data/sources.json (or similar) and inserts scraping jobs into scraping_queue
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars to be set (CI will set them)
 */

import process from "node:process";
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const region = process.argv[2] || 'all';
  const dryRun = (process.argv[3] || 'false') === 'true';

  console.log(`Populating queue for region: ${region} (dryRun=${dryRun})`);

  // Load sources.json if present, otherwise try to use a fallback list
  const sourcesPath = path.join(process.cwd(), 'data', 'sources.json');
  let sources = [];
  try {
    if (fs.existsSync(sourcesPath)) {
      sources = JSON.parse(fs.readFileSync(sourcesPath, 'utf8'));
    } else {
      console.warn('No data/sources.json found; using small default set');
      sources = [
        { name: `${region} Example Property A`, url: `https://${region}.example.com/property/a`, priority: 'High' },
        { name: `${region} Example Property B`, url: `https://${region}.example.com/property/b`, priority: 'Medium' }
      ];
    }
  } catch (err) {
    console.error('Failed to load sources.json:', err.message);
    process.exit(1);
  }

  // Filter sources by region heuristics (simple name/url check)
  const regionLower = region.toLowerCase();
  const filtered = sources.filter(s =>
    region === 'all' ||
    (s.name && s.name.toLowerCase().includes(regionLower)) ||
    (s.url && s.url.toLowerCase().includes(regionLower))
  );

  if (filtered.length === 0) {
    console.log(`No sources found for region: ${region}`);
    process.exit(0);
  }

  // Prepare queue entries
  const now = new Date().toISOString();
  const toInsert = filtered.slice(0, 100).map((s, i) => {
    const propertyId = `${regionLower}_${Date.now()}_${i}`;
    const unitNumber = '1';
    const externalId = `${propertyId}_${unitNumber}`;
    const priority = s.priority === 'High' ? 3 : s.priority === 'Medium' ? 2 : 1;

    return {
      external_id: externalId,
      property_id: propertyId,
      unit_number: unitNumber,
      url: s.url,
      source: 'populate_script',
      status: 'pending',
      priority,
      created_at: now
    };
  });

  console.log(`Prepared ${toInsert.length} queue items`);

  if (dryRun) {
    console.log('Dry run; not inserting into database. Sample:', toInsert.slice(0,3));
    process.exit(0);
  }

  // Insert in batches
  const batchSize = 20;
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += batchSize) {
    const batch = toInsert.slice(i, i + batchSize);
    try {
      const { error } = await supabase.from('scraping_queue').insert(batch);
      if (error) {
        console.error('Insert error:', error.message || error);
      } else {
        inserted += batch.length;
        console.log(`Inserted batch ${Math.floor(i / batchSize) + 1} (${batch.length} items)`);
      }
    } catch (err) {
      console.error('Unexpected error when inserting batch:', err.message || err);
    }
  }

  console.log(`Finished. Inserted ${inserted} items into scraping_queue`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
