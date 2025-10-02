#!/usr/bin/env python3
"""
Test script to analyze what GPT-4o sees on apartment websites
"""
import asyncio
import os
from rental_data_agent import RentalDataAgent

async def analyze_apartment_website(url: str, name: str):
    """Analyze a specific apartment website with GPT-4o vision"""
    print(f"🔍 Analyzing {name}: {url}")
    print("=" * 60)

    # Initialize agent
    agent = RentalDataAgent()

    if not agent.openai_api_key:
        print("❌ OpenAI API key not configured")
        return

    try:
        async with agent:
            # Navigate to the apartment website
            print("🌐 Loading webpage...")
            await agent.page.goto(url, wait_until="networkidle", timeout=15000)

            # Take a screenshot
            screenshot = await agent.page.screenshot(full_page=True)
            print(f"📸 Captured full page screenshot ({len(screenshot)} bytes)")

            # Test vision analysis with detailed prompt
            prompt = """
            Analyze this apartment website screenshot for rental information.
            Look for:
            1. Floor plans and unit types (1BR, 2BR, etc.)
            2. Rent prices and ranges
            3. Square footage
            4. Available units or move-in specials
            5. Contact information or leasing office details

            If you see any rental pricing, floor plans, or leasing information,
            extract it in a structured format. If this appears to be a homepage
            without rental details, suggest what pages might contain the information.
            """

            print("🤖 Analyzing with GPT-4o...")
            result = await agent._vision_analyze_image(screenshot, prompt)

            print("📝 Analysis Result:")
            print("-" * 50)
            print(result)
            print("-" * 50)

    except Exception as e:
        print(f"❌ Error analyzing {name}: {str(e)}")

async def main():
    """Test multiple apartment websites"""
    websites = [
        ("Church Street Station", "https://www.churchstreetstation.com/"),
        ("Vinings Village", "https://www.viningsvillage.com/"),
        ("The Club at Vinings", "https://www.clubatvinings.com/"),
    ]

    for name, url in websites:
        await analyze_apartment_website(url, name)
        print("\n" + "="*80 + "\n")

if __name__ == "__main__":
    asyncio.run(main())