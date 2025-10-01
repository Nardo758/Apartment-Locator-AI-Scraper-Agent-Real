// scripts/run_local_worker_test.js
// Executes the core upsert path of ai-scraper-worker locally using the service role key.
// Usage: node scripts/run_local_worker_test.js [--frontendsync]

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

async function upsertTest() {
  const externalId = `local-run-${Date.now()}`
  const apartmentData = {
    external_id: externalId,
    source: 'local-runner',
    title: 'Local Runner Test Building',
    address: '123 Test St',
    city: 'Testville',
    state: 'TS',
    rent_price: 1500,
    rent_amount: 1500,
    bedrooms: 2,
    bathrooms: 1,
    is_active: true,
    scraped_at: new Date().toISOString(),
  }

  console.log('Upserting to apartments table:', { external_id: externalId })
  const { error: apartmentError } = await sb.from('apartments').upsert(apartmentData, { onConflict: 'external_id' })
  if (apartmentError) {
    console.error('Failed to upsert apartments:', apartmentError)
  } else {
    console.log('Apartments upsert succeeded')
  }

  if (process.argv.includes('--frontendsync')) {
    console.log('Also upserting to properties table (frontend sync)')
    const frontend = {
      external_id: externalId,
      title: apartmentData.title,
      address: apartmentData.address,
      city: apartmentData.city,
      state: apartmentData.state,
      original_price: apartmentData.rent_price,
      is_active: apartmentData.is_active,
      first_seen_at: apartmentData.scraped_at,
      last_seen_at: new Date().toISOString()
    }
    const { error: propErr } = await sb.from('properties').upsert(frontend, { onConflict: 'external_id' })
    if (propErr) console.error('Failed to upsert properties:', propErr)
    else console.log('Properties upsert succeeded')
  }

  console.log('Verifying insertion by selecting the row back:')
  const { data, error } = await sb.from('apartments').select('*').eq('external_id', externalId).limit(1)
  if (error) console.error('Select failed:', error)
  else console.log('Select returned:', data)
}

upsertTest().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
