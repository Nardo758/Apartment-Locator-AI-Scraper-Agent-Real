#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
import process from "node:process";

// Optional: supabase client (handle ESM-only package via dynamic import)
let supabase;
let dryRun = false;
async function initSupabase() {
  try {
    // dynamic import works with ESM packages like @supabase/supabase-js v2
    const mod = await import('@supabase/supabase-js');
    const createClient = mod.createClient || (mod.default && mod.default.createClient);
    // Allow passing creds via CLI: --url and --key (easier for local runs)
    const argv = process.argv.slice(2);
    const cli = argv.reduce((acc, cur) => {
      const m = cur.match(/^--([^=]+)=(.*)$/);
      if (m) acc[m[1]] = m[2];
      return acc;
    }, {});

    let SUPABASE_URL = cli.url || process.env.SUPABASE_URL;
    const SUPABASE_KEY = cli.key || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
    dryRun = argv.includes('--dry-run');

    if (SUPABASE_URL) SUPABASE_URL = SUPABASE_URL.trim();

    // Quick validation to avoid createClient throwing on malformed URLs
    const urlLooksValid = typeof SUPABASE_URL === 'string' && SUPABASE_URL.startsWith('http') && SUPABASE_URL.includes('supabase');

    if (!urlLooksValid) {
      console.warn('Supabase URL appears malformed or missing. Skipping DB init.');
      console.log('Provided SUPABASE_URL value present?', !!(cli.url || process.env.SUPABASE_URL));
      console.log('Example valid value: https://<project-ref>.supabase.co');
      return;
    }

    if (createClient && SUPABASE_URL && SUPABASE_KEY) {
      supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    }
  } catch (_e) {
    // supabase client not installed or import failed; script will still parse CSV and write a JSON output
    const msg = _e && _e.message ? _e.message : String(_e);
    console.warn('Warning: failed to import @supabase/supabase-js (ESM import). DB upsert will be skipped.');
    // Print short error message to help debugging (no secrets)
    console.warn('Supabase import error:', msg.split('\n')[0]);
  }
}

const csvPath = path.join(__dirname, '..', 'data', 'sources.csv');
const outPath = path.join(__dirname, '..', 'data', 'sources_parsed.json');

const records = [];

async function main() {
  await initSupabase();

  // Diagnostic: explain why supabase may be unavailable
  if (!supabase) {
    const hasUrl = !!process.env.SUPABASE_URL;
    const hasKey = !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE);
    console.log('Supabase client not initialized. SUPABASE_URL set?', hasUrl, 'SUPABASE_KEY set?', hasKey);
    console.log('If both are true, ensure @supabase/supabase-js is installed (npm install @supabase/supabase-js) and try again.');
  }

  fs.createReadStream(csvPath)
    .pipe(parse({ columns: true, trim: true }))
    .on('data', (row) => {
      // Normalize keys
      const rec = {
        name: row.name || '',
        url: row.url || '',
        priority: (row.priority || '').trim()
      };
      records.push(rec);
    })
    .on('end', async () => {
      console.log(`Parsed ${records.length} records from ${csvPath}`);
      fs.writeFileSync(outPath, JSON.stringify(records, null, 2));
      console.log(`Wrote parsed JSON to ${outPath}`);

      if (supabase) {
        console.log('Supabase client detected — upserting into table `sources`');
        // Upsert in batches
        const chunkSize = 100;
        for (let i = 0; i < records.length; i += chunkSize) {
          const chunk = records.slice(i, i + chunkSize);
          if (dryRun) {
            console.log(`[DRY RUN] Would upsert ${chunk.length} rows:`, JSON.stringify(chunk.slice(0, 3), null, 2), '...');
          } else {
            const { data: _data, error } = await supabase.from('sources').upsert(chunk, { onConflict: 'url' });
            if (error) {
              console.error('Error upserting chunk:', error);
            } else {
              console.log(`Upserted ${chunk.length} rows`);
            }
          }
        }
      } else {
        console.log('Supabase client not available — skipping DB upsert.');
        console.log('Install @supabase/supabase-js and set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars to enable upsert.');
      }
    })
    .on('error', (err) => {
      console.error('Error reading CSV:', err);
      process.exit(1);
    });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
