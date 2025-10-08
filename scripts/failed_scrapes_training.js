#!/usr/bin/env node
/*
Enhanced training exporter for failed_scrapes.

Implements the canonical JSONL schema and features:
- error type normalization
- sidecar metadata files per batch (counts, checksum, provenance)
- optional PII redaction (--redact)
- integrity checksum (sha1)
- writes immutable files to tmp/training_batches/<batch-id>.jsonl
*/

import process from "node:process";
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const argv = yargs(hideBin(process.argv))
  .option('limit', { type: 'number', default: 1000 })
  .option('batch-size', { type: 'number', default: 100 })
  .option('priority', { type: 'number', default: 1 })
  .option('dry-run', { type: 'boolean', default: false })
  .option('batch-id', { type: 'string' })
  .option('redact', { type: 'boolean', default: false, description: 'Redact emails and phone numbers from payload before export' })
  .option('redact-fields', { type: 'string', description: 'Comma-separated list of fields to redact (e.g. contact_email,phone,owner_name,address)' })
  .option('address-hash', { type: 'string', default: 'sha1', description: 'How to handle address when redacting: sha1 or geohash (sha1 default)' })
  .option('out-dir', { type: 'string', default: 'tmp/training_batches' })
  .option('schema-version', { type: 'string', default: 'v1' })
  .option('mock', { type: 'boolean', default: false, description: 'Run in mock mode using fixture rows (no DB required)' })
  .argv;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const mockMode = argv.mock;
let supabase = null;
if (!mockMode) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars to run this script (or use --mock)');
    process.exit(1);
  }
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

function normalizeErrorType(err) {
  if (!err) return 'unknown_error';
  try {
    if (typeof err === 'string') {
      // common patterns
      if (err.toLowerCase().includes('missing')) return 'missing_field';
      if (err.toLowerCase().includes('timeout')) return 'timeout';
      return err.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 80);
    }
    if (err.code) return String(err.code).replace(/[^a-zA-Z0-9_\-]/g, '_');
    if (err.type) return String(err.type).replace(/[^a-zA-Z0-9_\-]/g, '_');
    if (err.message) return String(err.message).replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 80);
    return JSON.stringify(err).replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 80);
  } catch (e) {
    return 'unknown_error';
  }
}

function redactPII(obj, options = {}) {
  // global redact: emails and phones anywhere
  const emailRE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  const phoneRE = /(?:\+?\d{1,3}[\s-]?)?(?:\(\d{3}\)|\d{3})[\s-]?\d{3}[\s-]?\d{4}/g;

  function walk(value) {
    if (value === null || value === undefined) return value;
    if (typeof value === 'string') {
      let out = value.replace(emailRE, '[REDACTED_EMAIL]').replace(phoneRE, '[REDACTED_PHONE]');
      return out;
    }
    if (Array.isArray(value)) return value.map(walk);
    if (typeof value === 'object') {
      const out = {};
      for (const k of Object.keys(value)) out[k] = walk(value[k]);
      return out;
    }
    return value;
  }

  // field-specific redaction: check options.redactFields (Set)
  const redactFields = options.redactFields || new Set();

  function redactFieldsInPayload(payload) {
    if (!payload || typeof payload !== 'object') return payload;
    const out = { ...payload };
    // emails
    if (redactFields.has('contact_email') && out.contact_email) out.contact_email = '[REDACTED_EMAIL]';
    if (redactFields.has('manager_email') && out.manager_email) out.manager_email = '[REDACTED_EMAIL]';
    if (redactFields.has('agent_email') && out.agent_email) out.agent_email = '[REDACTED_EMAIL]';

    // phones
    if (redactFields.has('phone') && out.phone) out.phone = '[REDACTED_PHONE]';
    if (redactFields.has('contact_phone') && out.contact_phone) out.contact_phone = '[REDACTED_PHONE]';
    if (redactFields.has('manager_phone') && out.manager_phone) out.manager_phone = '[REDACTED_PHONE]';

    // names
    if (redactFields.has('owner_name') && out.owner_name) out.owner_name = '[REDACTED_NAME]';
    if (redactFields.has('contact_name') && out.contact_name) out.contact_name = '[REDACTED_NAME]';
    if (redactFields.has('agent_name') && out.agent_name) out.agent_name = '[REDACTED_NAME]';

    // address handling: either hash or geohash placeholder
    if (redactFields.has('address') && out.address) {
      if (options.addressHash === 'geohash') {
        // we don't have geocoding here; use a placeholder 'GEOHASH_UNAVAILABLE'
        out.address = 'GEOHASH_UNAVAILABLE';
      } else {
        out.address = '[ADDRESS_HASH]_' + sha1Hex(String(out.address));
      }
    }

    // fallback: also run global walk to remove inline emails/phones in free text
    return walk(out);
  }

  return { redactAll: (v) => walk(v), redactFieldsInPayload };
}

function sha1Hex(str) {
  return crypto.createHash('sha1').update(str, 'utf8').digest('hex');
}

async function main() {
  const limit = argv.limit;
  const batchSize = argv['batch-size'];
  const priority = argv.priority;
  const dryRun = argv['dry-run'];
  const providedBatchId = argv['batch-id'];
  const outDir = path.join(process.cwd(), argv['out-dir']);
  const redact = argv.redact;
  const schemaVersion = argv['schema-version'] || 'v1';

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  let rows = [];
  if (mockMode) {
    // Create deterministic fixture rows for CI
    for (let i = 1; i <= Math.min(limit, 200); i++) {
      rows.push({
        id: i,
        external_id: `mock-${i}`,
        payload: { listing_url: `https://example.com/listing/${i}`, source: 'mock' , contact_email: `owner${i}@example.com`, phone: `555-010-${String(i).padStart(3,'0')}`, owner_name: `Owner ${i}`, address: `123 Test St Apt ${i}`},
        error: { message: 'missing bedrooms', code: 'MISSING_FIELD' },
        created_at: new Date(Date.now() - i * 1000 * 60).toISOString(),
        training_priority: argv.priority,
        training_notes: null
      });
    }
  } else {
    const { data, error } = await supabase
      .from('failed_scrapes')
      .select('id, external_id, payload, error, created_at, training_priority, training_notes')
      .or("training_status.eq.pending,training_status.is.null")
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching failed_scrapes:', error);
      process.exit(1);
    }

    rows = data || [];
    if (!rows || rows.length === 0) {
      console.log('No failed_scrapes rows found to export.');
      return;
    }
  }

  // Group rows by normalized error type
  const groups = {};
  for (const r of rows) {
    const norm = normalizeErrorType(r.error);
    groups[norm] = groups[norm] || [];
    groups[norm].push(r);
  }

  console.log(`Found ${rows.length} failed_scrapes rows, grouped into ${Object.keys(groups).length} groups`);

  for (const [errorType, items] of Object.entries(groups)) {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchId = providedBatchId || crypto.randomUUID();
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const fileBase = `${ts}__${errorType}__${i}__${batchId}`;
      const jsonlPath = path.join(outDir, `${fileBase}.jsonl`);
      const metaPath = path.join(outDir, `${fileBase}.meta.json`);

      const redactFieldsArg = argv['redact-fields'] ? new Set(String(argv['redact-fields']).split(',').map(s => s.trim())) : new Set();
      const redactOptions = { redactFields: redactFieldsArg, addressHash: argv['address-hash'] };
      const redaction = redact ? redactPII(null, redactOptions) : null;

      const exportedRecords = batch.map(r => {
        const payload = redact ? redaction.redactFieldsInPayload(r.payload) : r.payload;
        const errorValue = r.error;
        const record = {
          id: r.id,
          external_id: r.external_id,
          training_batch_id: batchId,
          error_type: errorType,
          error: errorValue,
          payload: payload,
          source: payload && payload.source ? payload.source : null,
          listing_url: payload && payload.listing_url ? payload.listing_url : null,
          created_at: r.created_at,
          training_priority: r.training_priority || priority,
          training_notes: r.training_notes || null,
          schema_version: schemaVersion,
          metadata: {
            exported_by: 'failed_scrapes_training.js',
            exported_at: new Date().toISOString(),
            exporter_version: 'v1'
          }
        };
        return record;
      });

      const jsonlContent = exportedRecords.map(r => JSON.stringify(r)).join('\n') + '\n';
      const checksum = sha1Hex(jsonlContent);

      // write immutable files
      fs.writeFileSync(jsonlPath, jsonlContent, { encoding: 'utf8', flag: 'wx' });

      const meta = {
        batch_id: batchId,
        error_type: errorType,
        item_count: exportedRecords.length,
        priority: priority,
        schema_version: schemaVersion,
        checksum_sha1: checksum,
        exported_at: new Date().toISOString(),
        exported_by: 'failed_scrapes_training.js',
        source: SUPABASE_URL
      };
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), { encoding: 'utf8', flag: 'wx' });

      console.log(`Wrote ${jsonlPath} (${exportedRecords.length} items), checksum ${checksum}`);

      if (!dryRun) {
        const ids = batch.map(b => b.id);
        const { error: updateError } = await supabase.from('failed_scrapes').update({ training_batch_id: batchId, training_priority: priority, training_status: 'queued', training_updated_at: new Date().toISOString() }).in('id', ids);
        if (updateError) console.error('Error updating training fields on failed_scrapes:', updateError);
        else console.log(`Marked ${ids.length} rows as queued with batch id ${batchId}`);
      } else {
        console.log(`[dry-run] Would mark ${batch.length} rows as queued with batch id ${batchId}`);
      }
    }
  }

  console.log('Done. Batch files are in', outDir);
}

main().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
