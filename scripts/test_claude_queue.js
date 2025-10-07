(async () => {
  try {
    const url = 'http://127.0.0.1:54321/functions/v1/claude-queue-builder';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test_mode: true })
    });
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
  } catch (err) {
    console.error('Request failed:', err);
    process.exit(1);
  }
})();
