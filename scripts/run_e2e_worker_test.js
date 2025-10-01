// scripts/run_e2e_worker_test.js
// Posts a sample HTML payload to the ai-scraper-worker function endpoint.
// Usage:
//   node scripts/run_e2e_worker_test.js [FUNCTION_URL]
// If FUNCTION_URL is omitted it defaults to http://127.0.0.1:54321/functions/v1/ai-scraper-worker

const http = require('http')
const https = require('https')
const { URL } = require('url')
const fs = require('fs')
const path = require('path')

const defaultUrl = 'http://127.0.0.1:54321/functions/v1/ai-scraper-worker'
// Optional: pass a custom function URL as first arg or set FUNCTION_URL env var
// Optional: pass an Authorization header value via AUTH_HEADER env var (e.g. 'Bearer <token>')
const functionUrl = process.argv[2] || process.env.FUNCTION_URL || defaultUrl
const authHeaderFromEnv = process.env.AUTH_HEADER || null

// If AUTH_HEADER not set, try to read the function's .env.local and extract SUPABASE_SERVICE_ROLE_KEY
let authHeader = authHeaderFromEnv
if (!authHeader) {
  try {
    const envPath = path.join(process.cwd(), 'supabase', 'functions', 'ai-scraper-worker', '.env.local')
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8')
      const lines = content.split(/\r?\n/)
      for (const line of lines) {
        const m = line.match(/^SUPABASE_SERVICE_ROLE_KEY=(.*)$/)
        if (m && m[1]) {
          authHeader = 'Bearer ' + m[1].trim()
          break
        }
      }
    }
  } catch (e) {
    // ignore
  }
}

const samplePayload = {
  source: 'local-test',
  cleanHtml: '<html><body><h1>Test Listing</h1><p>Rent: $1,500</p><p>2 bed, 1 bath</p><p>Concession: 1 month free</p></body></html>',
  url: 'https://example.com/test-listing',
  external_id: `e2e-${Date.now()}`,
  source_url: 'https://example.com/test-listing'
}

async function postJson(urlString, obj) {
  const urlObj = new URL(urlString)
  const body = JSON.stringify(obj)
  const isHttps = urlObj.protocol === 'https:'
  const opts = {
    hostname: urlObj.hostname,
    port: urlObj.port || (isHttps ? 443 : 80),
    path: urlObj.pathname + urlObj.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  }
  if (authHeader) {
    opts.headers['Authorization'] = authHeader
  }

  const reqLib = isHttps ? https : http
  return new Promise((resolve, reject) => {
    const req = reqLib.request(opts, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) })
        } catch (e) {
          resolve({ status: res.statusCode, body: data })
        }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

(async () => {
  console.log('Posting to', functionUrl)
  try {
    const res = await postJson(functionUrl, samplePayload)
    console.log('Status:', res.status)
    console.log('Response:', res.body)
  } catch (e) {
    console.error('Request failed:', e)
  }
})()
