// final-preflight-check.ts
console.log("🛫 FINAL PRE-FLIGHT CHECK");
console.log("=========================");

async function preflightCheck() {
  const checks = [
    { name: "Environment Variables", check: await checkEnvVars() },
    { name: "Claude API Access", check: await checkClaude() },
    { name: "Supabase Connection", check: await checkSupabase() },
    { name: "Function Server", check: await checkFunctionServer() },
  ];

  console.log("\n📋 Pre-Flight Check Results:");
  checks.forEach(({ name, check }) => {
    console.log(`${check ? "✅" : "❌"} ${name}`);
  });

  const allPassed = checks.every((c) => c.check);
  if (allPassed) {
    console.log(
      "\n🎉 ALL SYSTEMS GO! Ready for real 100-property test with Claude.",
    );
    console.log("📊 Expected Results:");
    console.log("   • Success Rate: 90-96%");
    console.log("   • Total Cost: $2-6 (Claude Haiku)");
    console.log("   • Total Time: 6-12 minutes");
    console.log("   • Avg Response Time: 2-4 seconds/property");
  } else {
    console.log("\n🚨 Issues detected. Please fix before proceeding.");
  }
}

async function checkEnvVars(): Promise<boolean> {
  try {
    // Load .env.local file
    const envContent = await Deno.readTextFile(".env.local");
    const hasAnthropicKey = envContent.includes("ANTHROPIC_API_KEY=sk-ant-");
    const hasSupabaseUrl = envContent.includes("SUPABASE_URL=https://");
    const hasSupabaseKey = envContent.includes("SUPABASE_SERVICE_ROLE_KEY=ey");

    console.log(`   • ANTHROPIC_API_KEY: ${hasAnthropicKey ? "✓" : "✗"}`);
    console.log(`   • SUPABASE_URL: ${hasSupabaseUrl ? "✓" : "✗"}`);
    console.log(
      `   • SUPABASE_SERVICE_ROLE_KEY: ${hasSupabaseKey ? "✓" : "✗"}`,
    );

    return hasAnthropicKey && hasSupabaseUrl && hasSupabaseKey;
  } catch (error) {
      const msg = (await import("../shared/error.ts")).errMsg(error);
      console.error(`   • Error reading .env.local: ${msg}`);
    return false;
  }
}

async function checkClaude(): Promise<boolean> {
  try {
    // Load environment
    const envContent = await Deno.readTextFile(".env.local");
    const apiKeyMatch = envContent.match(/ANTHROPIC_API_KEY=(.+)/);
    if (
      !apiKeyMatch || !apiKeyMatch[1] ||
      apiKeyMatch[1].includes("your-actual-claude-key-here")
    ) {
      console.log("   • Claude API key not properly configured");
      return false;
    }

    const apiKey = apiKeyMatch[1].trim();

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 10,
        messages: [{ role: "user", content: "Hi" }],
      }),
    });

    const result = await response.json();
    const isValid = response.ok && result.content;

    if (isValid) {
      console.log("   • Claude API connection successful");
    } else {
      console.log(
        `   • Claude API error: ${result.error?.message || "Unknown error"}`,
      );
    }

    return isValid;
  } catch (error) {
      const msg = (await import("../shared/error.ts")).errMsg(error);
      console.error(`   • Claude API connection failed: ${msg}`);
    return false;
  }
}

async function checkSupabase(): Promise<boolean> {
  try {
    // Load environment
    const envContent = await Deno.readTextFile(".env.local");
    const urlMatch = envContent.match(/SUPABASE_URL=(.+)/);
    const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);

    if (
      !urlMatch || !keyMatch ||
      urlMatch[1].includes("your-project-ref") ||
      keyMatch[1].includes("your-actual-service-role-key-here")
    ) {
      console.log("   • Supabase credentials not properly configured");
      return false;
    }

    const supabaseUrl = urlMatch[1].trim();
    const supabaseKey = keyMatch[1].trim();

    // Test connection
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        "Authorization": `Bearer ${supabaseKey}`,
        "apikey": supabaseKey,
      },
    });

    const isValid = response.status !== 401;

    if (isValid) {
      console.log("   • Supabase connection successful");
    } else {
      console.log("   • Supabase authentication failed");
    }

    return isValid;
  } catch (error) {
      const msg = (await import("../shared/error.ts")).errMsg(error);
      console.error(`   • Supabase connection failed: ${msg}`);
    return false;
  }
}

async function checkFunctionServer(): Promise<boolean> {
  try {
    const response = await fetch(
      "http://localhost:54321/functions/v1/ai-scraper-worker",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          test: true,
          cleanHtml:
            "<div>Test Property</div><p>$1200/month</p><span>2 bed 1 bath</span><address>123 Test St, Austin, TX</address>",
        }),
      },
    );

    const isRunning = response.status !== 404;

    if (isRunning) {
      console.log("   • Function server is running");
      const result = await response.json();
      if (result.status === "ok") {
        console.log("   • Test extraction successful");
      } else {
        console.log(
          `   • Test extraction failed: ${result.message || result.error}`,
        );
      }
    } else {
      console.log("   • Function server not responding");
    }

    return isRunning;
  } catch (error) {
      const msg = (await import("../shared/error.ts")).errMsg(error);
      console.error(`   • Function server check failed: ${msg}`);
    return false;
  }
}

// Run the check
if (import.meta.main) {
  await preflightCheck();
}
