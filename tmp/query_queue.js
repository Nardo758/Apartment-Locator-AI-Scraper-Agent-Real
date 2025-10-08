import process from "node:process";
(async () => {
  const { createClient } = require("@supabase/supabase-js");
  const SUPABASE_URL = "http://127.0.0.1:54321";
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
  const supabase = createClient(SUPABASE_URL, KEY);
  try {
    const { data, error } = await supabase.from("scraping_queue").select(
      "external_id,url,status,metadata,created_at",
    ).limit(50);
    if (error) {
      console.error("QUERY ERROR", error);
      process.exit(1);
    }
    console.log("ROWS:", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("ERR", e);
  }
})();
