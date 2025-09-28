#!/usr/bin/env -S deno run --allow-read

/**
 * Function Analysis Script
 * 
 * This script analyzes the ai-scraper-worker function structure
 * without running the actual server.
 * 
 * Usage: deno run --allow-read analyze-function.ts
 */

async function analyzeFunction(): Promise<void> {
  console.log("🔍 AI Scraper Worker Function Analysis");
  console.log("=" .repeat(50));
  
  try {
    // Read the function file
    const functionCode = await Deno.readTextFile("index.ts");
    const lines = functionCode.split('\n');
    
    console.log("📁 File Structure:");
    console.log(`   Lines of code: ${lines.length}`);
    console.log(`   File size: ${functionCode.length} characters`);
    
    // Analyze imports
    const imports = lines.filter(line => line.trim().startsWith('import'));
    console.log(`\n📦 Imports (${imports.length}):`);
    imports.forEach(imp => {
      const match = imp.match(/from ["'](.+)["']/);
      if (match) {
        console.log(`   ${match[1]}`);
      }
    });
    
    // Find the serve function call
    const serveLineIndex = lines.findIndex(line => line.includes('serve('));
    if (serveLineIndex >= 0) {
      console.log(`\n🚀 Main Export:`);
      console.log(`   Type: Deno serve() function`);
      console.log(`   Location: Line ${serveLineIndex + 1}`);
      console.log(`   Pattern: serve(async (req: Request) => { ... })`);
    }
    
    // Find functions
    const functions = lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => line.includes('function ') || line.includes('const ') && line.includes(' = '))
      .map(({ line, index }) => ({ 
        name: line.match(/function (\w+)|const (\w+)/)?.[1] || line.match(/const (\w+)/)?.[1] || 'unknown',
        line: index + 1,
        content: line.trim()
      }));
    
    console.log(`\n⚙️ Functions Found (${functions.length}):`);
    functions.forEach(func => {
      console.log(`   ${func.name} (line ${func.line})`);
    });
    
    // Analyze validation function specifically
    const validateFunction = lines.find(line => line.includes('validateAiResult'));
    if (validateFunction) {
      console.log(`\n✅ Validation Function:`);
      console.log(`   Name: validateAiResult`);
      console.log(`   Purpose: Validates AI-extracted apartment data`);
      
      // Find required fields
      const requiredFieldsLine = lines.find(line => line.includes('requiredFields'));
      if (requiredFieldsLine) {
        const fieldsMatch = requiredFieldsLine.match(/\[(.*?)\]/);
        if (fieldsMatch) {
          console.log(`   Required fields: ${fieldsMatch[1]}`);
        }
      }
    }
    
    // Analyze API endpoints
    const apiCalls = lines.filter(line => 
      line.includes('fetch(') || 
      line.includes('api.openai.com') ||
      line.includes('supabase')
    );
    
    if (apiCalls.length > 0) {
      console.log(`\n🌐 External API Calls:`);
      apiCalls.forEach(call => {
        if (call.includes('openai.com')) {
          console.log(`   OpenAI API (GPT model)`);
        }
        if (call.includes('supabase') || call.includes('.from(')) {
          console.log(`   Supabase Database`);
        }
      });
    }
    
    // Environment variables
    const envVars = lines
      .filter(line => line.includes('Deno.env.get'))
      .map(line => {
        const match = line.match(/Deno\.env\.get\(["'](.+?)["']/);
        return match ? match[1] : null;
      })
      .filter(Boolean);
    
    if (envVars.length > 0) {
      console.log(`\n🔐 Environment Variables Required:`);
      [...new Set(envVars)].forEach(env => {
        console.log(`   ${env}`);
      });
    }
    
    // HTTP methods
    const httpMethods = [];
    if (functionCode.includes('req.json()')) httpMethods.push('POST (JSON)');
    if (functionCode.includes('GET')) httpMethods.push('GET');
    
    console.log(`\n📡 HTTP Methods Supported:`);
    httpMethods.forEach(method => console.log(`   ${method}`));
    
    console.log(`\n📊 Response Formats:`);
    console.log(`   Success: { status: "ok", data: {...}, usage?: {...} }`);
    console.log(`   Error: { status: "error", message: "..." }`);
    console.log(`   Validation Error: { status: "error", error: "...", data?: {...} }`);
    
    console.log(`\n🎯 Testing Recommendations:`);
    console.log(`   1. ✅ Run validation tests: deno run --allow-read test-validation.ts`);
    console.log(`   2. 🌐 Run integration tests: deno run --allow-net --allow-env test-ai-scraper.ts`);
    console.log(`   3. 🚀 Start function server: supabase functions serve ai-scraper-worker`);
    console.log(`   4. 📖 Read full guide: cat README.md`);
    
  } catch (error) {
    console.error("❌ Error analyzing function:", error);
  }
}

if (import.meta.main) {
  await analyzeFunction();
}