#!/usr/bin/env python3
"""
Simple test script to verify Deepseek R1 vision capabilities
"""
import asyncio
import os
from rental_data_agent import RentalDataAgent

async def test_deepseek_vision():
    """Test Deepseek R1 vision analysis with a simple image"""
    print("🧪 Testing GPT-4o Vision Analysis")
    print("=" * 50)

    # Initialize agent
    agent = RentalDataAgent()

    # Check API key
    if not agent.openai_api_key:
        print("❌ DEEPSEEK_API_KEY not configured")
        return

    print("✅ Deepseek API key configured")
    print(f"🔍 Vision model: {agent.vision_model}")

    # Create a simple test image (we'll use a screenshot of a basic webpage)
    try:
        async with agent:
            # Navigate to a simple webpage with clear content
            await agent.page.goto("https://example.com", wait_until="networkidle")

            # Take a screenshot
            screenshot = await agent.page.screenshot(full_page=False)

            print(f"📸 Captured screenshot ({len(screenshot)} bytes)")

            # Test vision analysis
            prompt = "Describe what you see in this webpage screenshot. What is the main content, title, and any notable elements?"
            print(f"🤖 Analyzing with GPT-4o...")

            result = await agent._vision_analyze_image(screenshot, prompt)

            print("📝 Analysis Result:")
            print("-" * 30)
            print(result)
            print("-" * 30)

            if result and result != "none":
                print("✅ Deepseek R1 vision analysis successful!")
            else:
                print("⚠️  Deepseek R1 returned empty result")

    except Exception as e:
        print(f"❌ Error during testing: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_deepseek_vision())