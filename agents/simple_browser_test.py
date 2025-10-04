#!/usr/bin/env python3
"""
Simple Browser Test - Just opens a website and shows what it finds
"""

import asyncio
import sys
import json
from playwright.async_api import async_playwright


async def extract_prices_simple(page):
    """Simple price extraction"""
    prices = []

    try:
        # Look for dollar signs in text
        body_text = await page.locator("body").text_content()
        if body_text:
            import re
            matches = re.findall(r'\$[\d,]+(?:\.\d{2})?', body_text)
            prices.extend(matches[:10])  # First 10 matches

        # Also try common selectors
        selectors = [".price", ".rent", "[data-price]"]
        for selector in selectors:
            try:
                elements = page.locator(selector)
                count = await elements.count()
                for i in range(min(count, 5)):
                    text = await elements.nth(i).text_content()
                    if text and '$' in text:
                        prices.append(text.strip())
            except:
                pass

        return list(set(prices))  # Remove duplicates

    except Exception as e:
        print(f"⚠️  Price extraction error: {e}")
        return []


async def extract_units_simple(page):
    """Simple unit extraction"""
    units = []

    try:
        # Look for bedroom/bathroom patterns
        body_text = await page.locator("body").text_content()
        if body_text:
            import re
            matches = re.findall(r'\d+\s*(?:bedroom|bathroom|br|ba)', body_text, re.IGNORECASE)
            units.extend(matches[:10])

        # Also try common selectors
        selectors = [".unit", ".apartment", "[data-unit]"]
        for selector in selectors:
            try:
                elements = page.locator(selector)
                count = await elements.count()
                for i in range(min(count, 5)):
                    text = await elements.nth(i).text_content()
                    if text and len(text.strip()) > 5:
                        units.append(text.strip()[:100])
            except:
                pass

        return list(set(units))  # Remove duplicates

    except Exception as e:
        print(f"⚠️  Unit extraction error: {e}")
        return []


async def simple_browser_test(url: str):
    """Simple test that just opens a browser and extracts data"""
    print(f"🌐 Testing browser on: {url}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        try:
            print("📖 Loading page...")
            await page.goto(url, timeout=30000)
            await asyncio.sleep(5)  # Wait for page to load

            # Get basic info
            title = await page.title()
            current_url = page.url

            print(f"✅ Page loaded: {title}")
            print(f"📍 URL: {current_url}")

            # Extract prices
            prices = await extract_prices_simple(page)
            units = await extract_units_simple(page)

            print("\n📊 Found data:")
            print(f"💰 Prices: {prices}")
            print(f"🏠 Units: {units}")

            # Save results
            result = {
                "url": current_url,
                "title": title,
                "prices": prices,
                "units": units
            }

            domain = url.replace("https://", "").replace("http://", "").replace("www.", "").split("/")[0]
            filename = f"test_{domain}.json"

            with open(filename, 'w') as f:
                json.dump(result, f, indent=2)

            print(f"💾 Saved to: {filename}")

            # Keep browser open for 30 seconds so user can see it
            print("⏱️  Browser will close in 30 seconds...")
            await asyncio.sleep(30)

        except Exception as e:
            print(f"❌ Error: {e}")

        finally:
            await browser.close()


async def main():
    """Main test function"""
    if len(sys.argv) < 2:
        print("Usage: python simple_browser_test.py <url>")
        print("Example: python simple_browser_test.py https://boulevardatgrantpark.com/")
        sys.exit(1)

    url = sys.argv[1]
    print("🧪 Simple Browser Test")
    print("Just opens the site and extracts data automatically")
    print("=" * 50)

    await simple_browser_test(url)


if __name__ == "__main__":
    asyncio.run(main())