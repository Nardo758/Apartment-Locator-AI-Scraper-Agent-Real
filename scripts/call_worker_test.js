// scripts/call_worker_test.js
// Calls the scraper-worker edge function with proper auth headers

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

    const url = `${process.env.SUPABASE_URL}/functions/v1/scraper-worker`;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      process.exit(1);
    }

    const payload = {
      external_id: `debug_${Date.now()}`,
      url: 'https://example.com',
      source: 'debug',
      ai_model: 'gpt-3.5-turbo'
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
        'apikey': key,
      },
      body: JSON.stringify(payload),
    });

    console.log('HTTP', res.status);
    const text = await res.text();
    console.log(text);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
