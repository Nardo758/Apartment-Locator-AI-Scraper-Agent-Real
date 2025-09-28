// preflight-check-node.js - Simple pre-flight check using Node.js
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          process.env[key.trim()] = valueParts.join('=').trim();
        }
      }
    }
  }
}

async function checkEnvVars() {
  try {
    const envPath = path.join(__dirname, '.env.local');
    if (!fs.existsSync(envPath)) {
      console.log("   ❌ .env.local file not found");
      return false;
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const hasAnthropicKey = envContent.includes('ANTHROPIC_API_KEY=sk-ant-') && 
                           !envContent.includes('your-actual-claude-key-here');
    const hasSupabaseUrl = envContent.includes('SUPABASE_URL=https://') && 
                          !envContent.includes('your-project-ref');
    const hasSupabaseKey = envContent.includes('SUPABASE_SERVICE_ROLE_KEY=ey') && 
                          !envContent.includes('your-actual-service-role-key-here');
    
    console.log(`   • ANTHROPIC_API_KEY: ${hasAnthropicKey ? '✅' : '❌'}`);
    console.log(`   • SUPABASE_URL: ${hasSupabaseUrl ? '✅' : '❌'}`);
    console.log(`   • SUPABASE_SERVICE_ROLE_KEY: ${hasSupabaseKey ? '✅' : '❌'}`);
    
    return hasAnthropicKey; // We only need Claude for this test
  } catch (error) {
    console.log(`   ❌ Error reading .env.local: ${error.message}`);
    return false;
  }
}

async function checkClaude() {
  try {
    loadEnv();
    
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey.includes('your-actual-claude-key-here')) {
      console.log("   ❌ Claude API key not properly configured");
      return false;
    }
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }]
      })
    });

    const result = await response.json();
    const isValid = response.ok && result.content;
    
    if (isValid) {
      console.log("   ✅ Claude API connection successful");
    } else {
      console.log(`   ❌ Claude API error: ${result.error?.message || 'Unknown error'}`);
    }
    
    return isValid;
  } catch (error) {
    console.log(`   ❌ Claude API connection failed: ${error.message}`);
    return false;
  }
}

async function preflightCheck() {
  console.log("🛫 FINAL PRE-FLIGHT CHECK");
  console.log("=========================");

  const checks = [
    { name: "Environment Variables", check: await checkEnvVars() },
    { name: "Claude API Access", check: await checkClaude() }
  ];

  console.log("\n📋 Pre-Flight Check Results:");
  checks.forEach(({name, check}) => {
    console.log(`${check ? "✅" : "❌"} ${name}`);
  });

  const allPassed = checks.every(c => c.check);
  if (allPassed) {
    console.log("\n🎉 ALL SYSTEMS GO! Ready for Claude API testing.");
    console.log("📊 Expected Results for Direct API Test:");
    console.log("   • Success Rate: 95-100%");
    console.log("   • Total Cost: $0.01-0.05 (3 test properties)");
    console.log("   • Total Time: 3-10 seconds");
    console.log("   • Avg Response Time: 1-3 seconds/property");
    console.log("\n🚀 Run: node test-claude-direct-node.js");
  } else {
    console.log("\n🚨 Issues detected. Please fix before proceeding:");
    console.log("   1. Ensure .env.local exists with proper ANTHROPIC_API_KEY");
    console.log("   2. Replace 'your-actual-claude-key-here' with real API key");
    console.log("   3. Get Claude API key from: https://console.anthropic.com/");
  }
}

// Run the check
if (require.main === module) {
  preflightCheck().catch(error => {
    console.error('Pre-flight check failed:', error);
    process.exit(1);
  });
}