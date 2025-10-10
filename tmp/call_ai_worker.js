import process from "node:process";
(async () => {
  const SUPABASE_URL = "http://127.0.0.1:54321";
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
  const payload = {
    urls: ["https://www.vuemidtown.com"],
    property_source_id: 9999,
    claude_analysis: false,
    metadata: { property_name: "Vue Midtown", website_name: "vue" },
  };
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-scraper-worker`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${KEY}`,
        "apikey": KEY,
      },
      body: JSON.stringify(payload),
    });
    console.log("STATUS", res.status);
    const txt = await res.text();
    try {
      console.log(JSON.parse(txt));
    } catch (e) {
      console.log(txt);
    }
  } catch (e) {
    console.error("CALL ERROR", e);
  }
})();
