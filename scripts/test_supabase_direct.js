// scripts/test_supabase_direct.js
// Usage: node scripts/test_supabase_direct.js
// Optionally pass --upsert to perform a harmless upsert (not run by default)

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// load .env.local if present
const dotenvPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(dotenvPath)) {
  require('dotenv').config({ path: dotenvPath })
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment (.env.local)')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

async function run() {
  try {
    // try apartments table first
    let { data, error } = await sb.from('apartments').select('external_id').limit(5)
    if (error) {
      console.log('apartments select error, falling back to todos:', error.message)
      ;({ data, error } = await sb.from('todos').select('id').limit(5))
    }

    if (error) {
      console.error('Query failed:', error.message)
      process.exit(1)
    }

    console.log('Connected successfully. Sample rows:', data)

    if (process.argv.includes('--upsert')) {
      console.log('Performing harmless upsert into `scraping_debug` (will create table if missing)')
      const payload = { external_id: `debug-${Date.now()}`, source: 'local-test', scraped_at: new Date().toISOString() }
      const { error: upsertError } = await sb.from('scraping_debug').upsert(payload, { onConflict: 'external_id' })
      if (upsertError) console.error('Upsert failed:', upsertError)
      else console.log('Upsert succeeded (check scraping_debug table)')
    }
  } catch (e) {
    console.error('Unexpected error:', e)
    process.exit(1)
  }
}

run()
