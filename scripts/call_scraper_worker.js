(async () => {
  try {
    const url = 'http://127.0.0.1:54321/functions/v1/scraper-worker';
    const payload = {
      urls: ['https://example.com/test-property'],
      property_source_id: 123,
      metadata: { property_name: 'Test Property', website_name: 'example.com', expected_units: 10 }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    try { console.log(JSON.stringify(JSON.parse(text), null, 2)); }
    catch { console.log(text); }
  } catch (err) {
    console.error('Request failed:', err);
    process.exit(1);
  }
})();
