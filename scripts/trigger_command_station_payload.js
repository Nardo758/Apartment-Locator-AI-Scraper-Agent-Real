(async () => {
  try {
    const url = 'http://127.0.0.1:54321/functions/v1/command-station';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'run-now' })
    });
    const text = await res.text();
    try { console.log(JSON.stringify(JSON.parse(text), null, 2)); }
    catch { console.log(text); }
  } catch (err) {
    console.error('Request failed:', err);
    process.exit(1);
  }
})();
