(async () => {
  try {
    const res = await fetch('http://127.0.0.1:54321/functions/v1/');
    const text = await res.text();
    console.log(text);
  } catch (err) {
    console.error('Request failed:', err);
    process.exit(1);
  }
})();
