// test-scraper-function.ts
// index.ts exports named handlers; import the request handler directly by name if available.
import { handleScrapingRequest as handler } from "./enhanced-scraper-with-concessions.ts";

async function testScraper() {
  console.log(" Testing AI Scraper Edge Function");

  // Create a mock request similar to what Supabase would send
  const testRequest = new Request(
    "http://localhost:54321/functions/v1/ai-scraper-worker",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer test-token",
      },
      body: JSON.stringify({
        url: "https://example-apartment-site.com/listings/123",
        test_mode: true,
      }),
    },
  );

  try {
    console.log(" Sending test request...");
    const response = await handler(testRequest);
    const result = await response.json();

    console.log(" Function executed successfully");
    console.log("Status:", response.status);
    console.log("Response:", JSON.stringify(result, null, 2));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(" Function error:", msg);
    console.log(
      " This might be expected if the function needs specific environment variables",
    );
  }
}

// Run the test if this file is executed directly
if (import.meta.main) {
  testScraper();
}
