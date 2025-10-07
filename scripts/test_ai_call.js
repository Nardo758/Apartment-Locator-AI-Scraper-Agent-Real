(async () => {
  try {
    const url = 'http://127.0.0.1:54321/functions/v1/ai-scraper-worker';
    const payload = {
      test_mode: true,
      external_id: 'test-external-1',
      url: 'https://example.com/test-property'
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    try {
      const json = JSON.parse(text);
      console.log(JSON.stringify(json, null, 2));
    } catch (err) {
      console.log('Non-JSON response:');
      console.log(text);
    }
  } catch (err) {
    console.error('Request failed:', err);
    process.exit(1);
  }
})();
