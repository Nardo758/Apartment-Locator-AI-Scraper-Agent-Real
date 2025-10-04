#!/usr/bin/env python3
"""
Test the Simple Success Signal System
"""

import asyncio
import sys
from pathlib import Path

# Add the agents directory to the path
sys.path.insert(0, str(Path(__file__).parent / "agents"))

from simple_success_system import SimpleSuccessSystem, train_on_single_site


async def test_success_system():
    """Test the success signal system"""

    print("🧪 Testing Simple Success Signal System")
    print("=" * 50)

    # Test URLs
    test_urls = [
        "https://www.thehuntley.com/",
        "https://www.hanoverbuckheadvillage.com/",
        "https://altaporter.com/"
    ]

    if len(sys.argv) > 1 and sys.argv[1] in test_urls:
        # Test single URL
        url = sys.argv[1]
        print(f"🎯 Testing with: {url}")
        print("Instructions:")
        print("1. Browser will open the website")
        print("2. Navigate to find rental data manually")
        print("3. Press F8 when you see rental prices/units")
        print("4. The system will capture the page state")
        print()

        try:
            result = await train_on_single_site(url)

            if result:
                print("\n✅ Test successful!")
                print("📊 Captured data:")
                print(f"   URL: {result.url}")
                print(f"   Title: {result.page_title}")
                print(f"   Prices: {result.prices_found}")
                print(f"   Units: {result.units_found}")
            else:
                print("\n❌ Test failed - no data captured")

        except KeyboardInterrupt:
            print("\n⏹️  Test cancelled")
        except Exception as e:
            print(f"\n❌ Test error: {e}")

    else:
        # Show usage
        print("Usage: python test_success_system.py <url>")
        print("Available test URLs:")
        for url in test_urls:
            print(f"  {url}")
        print()
        print("Example: python test_success_system.py https://altaporter.com/")
        print()
        print("The system will:")
        print("1. Open the website in a visible browser")
        print("2. Wait for you to navigate to rental data")
        print("3. Capture the page when you press F8")
        print("4. Extract prices and unit information")


if __name__ == "__main__":
    asyncio.run(test_success_system())