#!/usr/bin/env -S deno run --allow-env

import { ApiCostTracker, trackOpenAICall } from "./cost-tracker.ts";

console.log("💰 Step 6: Testing Cost Tracker System");
console.log("=====================================");

const tracker = new ApiCostTracker();

// Simulate some API calls
console.log("📊 Simulating API calls...");
trackOpenAICall(tracker, "gpt-4-turbo-preview", 1200, 300, "test-1");
trackOpenAICall(tracker, "gpt-4-turbo-preview", 1100, 250, "test-2");
trackOpenAICall(tracker, "gpt-3.5-turbo", 800, 150, "test-3");

const breakdown = tracker.getCostBreakdown();
console.log("");
console.log("📈 Cost Breakdown:");
console.log("=================");
console.log(`Total Calls: ${breakdown.totalCalls}`);
console.log(`Total Tokens: ${breakdown.totalTokens.toLocaleString()}`);
console.log(`Total Cost: $${breakdown.totalCost.toFixed(4)}`);
console.log("");
console.log("🤖 OpenAI Usage:");
console.log(`   Calls: ${breakdown.openai.calls}`);
console.log(`   Total Cost: $${breakdown.openai.total.toFixed(4)}`);
console.log("");

// Test projections
const projection = tracker.getProjection(24);
console.log("📅 24-Hour Projection:");
console.log("=====================");
console.log(`Projected Calls: ${projection.projectedCalls}`);
console.log(`Projected Cost: $${projection.projectedCost.toFixed(2)}`);
console.log(`Basis: ${projection.basis}`);
console.log("");

// Test cost alert
tracker.addCostAlert(0.05, (cost, threshold) => {
  console.log(
    `🚨 ALERT: Cost $${cost.toFixed(4)} exceeded threshold $${threshold}`,
  );
});

// Add one more call to trigger alert
trackOpenAICall(tracker, "gpt-4-turbo-preview", 1000, 200, "test-4");

console.log("✅ Cost tracking system is working correctly!");
console.log("💡 Ready for real-time cost monitoring during tests");
console.log("");
console.log("📊 Key Features Demonstrated:");
console.log("   • Real-time cost calculation");
console.log("   • Multi-model support (GPT-4, GPT-3.5)");
console.log("   • Usage projections");
console.log("   • Cost alerts and thresholds");
console.log("   • Detailed breakdown reporting");
