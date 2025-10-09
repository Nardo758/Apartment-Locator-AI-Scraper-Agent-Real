// scripts/check_columns.js
import process from "node:process";
let createTypedClient;
let createClient;
try {
  ({ createTypedClient } = require("../src/lib/supabase-client"));
} catch (e) {
  ({ createClient } = require("@supabase/supabase-js"));
}
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = (createTypedClient || createClient)(url, key);

(async function () {
  const { data, error } = await supabase
    .from("scraping_queue")
    .select("priority_tier, last_change_date, change_frequency")
    .limit(1);
  if (error) {
    console.error("Error: likely columns missing or permission denied", error);
    process.exit(1);
  }
  console.log(
    "scraping_queue query OK — columns present (or returned empty array)",
  );
})();
