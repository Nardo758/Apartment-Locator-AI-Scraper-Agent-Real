const crypto = require('crypto');
const fetch = require('node-fetch');

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signHS256(unsigned, secret) {
  return crypto.createHmac('sha256', secret).update(unsigned).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function makeJwt(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB = base64url(JSON.stringify(header));
  const payloadB = base64url(JSON.stringify(payload));
  const unsigned = `${headerB}.${payloadB}`;
  const sig = signHS256(unsigned, secret);
  return `${unsigned}.${sig}`;
}

(async ()=>{
  const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || 'super-secret-jwt-token-with-at-least-32-characters-long';
  if (!SERVICE_KEY) { console.error('SUPABASE_SERVICE_ROLE_KEY not set'); process.exit(1); }

  const payload = {
    sub: 'local-service',
    role: 'service_role',
    iat: Math.floor(Date.now()/1000),
    exp: Math.floor(Date.now()/1000) + 60 * 60
  };
  const jwt = makeJwt(payload, JWT_SECRET);
  console.log('Generated JWT (first 80 chars):', jwt.slice(0,80));

  const payloadBody = {
    urls: ['https://www.amli.com/apartments/atlanta/midtown-apartments/amli-arts-center'],
    property_source_id: 1234,
    claude_analysis: false,
    metadata: { property_name: 'AMLI Arts Center', website_name: 'amli' }
  };

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-scraper-worker`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`,
        'apikey': SERVICE_KEY
      },
      body: JSON.stringify(payloadBody)
    });
    console.log('CALL STATUS', res.status);
    const txt = await res.text();
    try { console.log('RESPONSE JSON:', JSON.parse(txt)); } catch (e) { console.log('RESPONSE TEXT:', txt.slice(0,800)); }
  } catch (e) {
    console.error('CALL ERROR', e);
  }
})();
