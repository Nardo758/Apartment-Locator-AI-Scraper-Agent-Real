// scripts/call_orchestrator_processor.js
// Triggers the Supabase edge function 'scraper-orchestrator' (POST)
// Usage: node scripts/call_orchestrator_processor.js

(async () => {
  try {
    // Load .env.local if present
    try {
      const path = require('path');
      const fs = require('fs');
      const dotenvPath = path.resolve(process.cwd(), '.env.local');
      if (fs.existsSync(dotenvPath)) {
        require('dotenv').config({ path: dotenvPath });
      }
    } catch {}

    const baseUrl = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!baseUrl || !key) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      process.exit(1);
    }

    const url = `${baseUrl}/functions/v1/scraper-orchestrator`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
        'apikey': key,
      },
      body: JSON.stringify({ trigger: 'manual' }),
    });

    console.log('HTTP', res.status);
    const text = await res.text();
    console.log(text);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
