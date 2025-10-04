#!/usr/bin/env python3
"""
Debug script to test keyboard detection and provide alternative input methods
"""

import asyncio
import threading
import time
import sys

def test_keyboard_detection():
    """Test if keyboard library can detect F8"""
    print("🧪 Testing keyboard detection...")
    print("Press F8 key now (you have 5 seconds)...")

    import keyboard
    detected = False

    def check_f8():
        nonlocal detected
        start_time = time.time()
        while time.time() - start_time < 5:
            if keyboard.is_pressed('f8'):
                detected = True
                print("✅ F8 detected!")
                break
            time.sleep(0.1)

    thread = threading.Thread(target=check_f8)
    thread.start()
    thread.join()

    if not detected:
        print("❌ F8 not detected within 5 seconds")
        return False
    return True

async def alternative_training_system(url: str):
    """Alternative training system using text input instead of F8"""
    print(f"🔍 Alternative Training on: {url}")
    print("Navigate to the rental data in the browser")
    print("Then type 'SUCCESS' or 'DONE' here and press Enter")
    print("Type 'SKIP' to skip this site, 'QUIT' to exit")
    print("=" * 50)

    from playwright.async_api import async_playwright
    from cloudflare_success_system import CloudflareBypass

    bypass = CloudflareBypass()

    async with async_playwright() as p:
        page, browser, context = await bypass.create_stealth_page(p)

        try:
            # Navigate with bypass
            success = await bypass.navigate_with_bypass(page, url)

            if not success:
                print("❌ Could not bypass Cloudflare protection")
                return None

            print(f"🌐 Successfully loaded {url}")
            print("⏳ **Navigate to rental data, then type your command here...**")

            # Alternative input loop
            while True:
                try:
                    user_input = await asyncio.get_event_loop().run_in_executor(
                        None, lambda: input("> ").strip().upper()
                    )

                    if user_input in ['SUCCESS', 'DONE', 'OK', 'YES']:
                        print("✅ Success signal received! Capturing current page...")

                        # Capture the successful state
                        success_data = await capture_success_state(page)
                        print("🎉 Training complete!")
                        return success_data

                    elif user_input == 'SKIP':
                        print("⏭️  Skipping this site")
                        return None

                    elif user_input == 'QUIT':
                        print("👋 Exiting training")
                        return None

                    else:
                        print("Type 'SUCCESS' when you find rental data, 'SKIP' to skip, 'QUIT' to exit")

                except KeyboardInterrupt:
                    print("\n👋 Training cancelled")
                    return None

        finally:
            await browser.close()

async def capture_success_state(page):
    """Capture the current page state"""
    try:
        from cloudflare_success_system import SuccessSignal
        from datetime import datetime

        # Get basic page info
        url = page.url
        title = await page.title()
        content = await page.content()

        # Look for rental data patterns
        prices = await extract_prices_from_page(page)
        units = await extract_units_from_page(page)

        success_signal = SuccessSignal(
            url=url,
            timestamp=datetime.now().isoformat(),
            page_content=content[:10000],  # Limit content size
            current_url=url,
            prices_found=prices,
            units_found=units,
            page_title=title
        )

        print("📊 Captured data:")
        print(f"   📍 URL: {url}")
        print(f"   🏷️  Title: {title}")
        print(f"   💰 Prices found: {len(prices)}")
        print(f"   🏠 Units found: {len(units)}")

        return success_signal

    except Exception as e:
        print(f"❌ Error capturing page state: {e}")
        return None

async def extract_prices_from_page(page) -> list:
    """Extract price information from the current page"""
    prices = []

    try:
        # Common price selectors
        price_selectors = [
            ".price", ".rent", "[class*='price']", "[class*='rent']",
            ".pricing", ".cost", "[data-price]", "[data-rent]"
        ]

        for selector in price_selectors:
            try:
                elements = page.locator(selector)
                count = await elements.count()

                for i in range(min(count, 10)):  # Limit to first 10
                    text = await elements.nth(i).text_content()
                    if text and looks_like_price(text.strip()):
                        prices.append(text.strip())
            except:
                continue

        # Also look for price patterns in text
        body_text = await page.locator("body").text_content()
        if body_text:
            import re
            price_matches = re.findall(r'\$[\d,]+(?:\.\d{2})?', body_text)
            prices.extend(price_matches[:10])  # Limit results

        # Remove duplicates
        prices = list(set(prices))

    except Exception as e:
        print(f"⚠️  Error extracting prices: {e}")

    return prices

async def extract_units_from_page(page) -> list:
    """Extract unit information from the current page"""
    units = []

    try:
        # Common unit selectors
        unit_selectors = [
            ".unit", ".apartment", "[class*='unit']", "[class*='apartment']",
            ".floorplan", ".property", "[data-unit]", "[data-property]"
        ]

        for selector in unit_selectors:
            try:
                elements = page.locator(selector)
                count = await elements.count()

                for i in range(min(count, 10)):  # Limit to first 10
                    text = await elements.nth(i).text_content()
                    if text and len(text.strip()) > 5:  # Meaningful content
                        units.append(text.strip()[:100])  # Limit length
            except:
                continue

        # Remove duplicates and empty strings
        units = list(set(filter(None, units)))

    except Exception as e:
        print(f"⚠️  Error extracting units: {e}")

    return units

def looks_like_price(text: str) -> bool:
    """Check if text looks like a price"""
    import re

    # Look for dollar signs with numbers
    if re.search(r'\$[\d,]+', text):
        return True

    # Look for "per month" or similar
    if re.search(r'[\d,]+\s*(?:per month|monthly|month)', text, re.IGNORECASE):
        return True

    return False

async def main():
    """Main function with debugging and alternative input"""
    if len(sys.argv) < 2:
        print("Usage: python debug_training.py <url>")
        print("Example: python debug_training.py https://boulevardatgrantpark.com/")
        sys.exit(1)

    url = sys.argv[1]

    print("🔧 Debug Training System")
    print("=" * 30)

    # First test keyboard detection
    print("\n1. Testing keyboard detection...")
    keyboard_works = test_keyboard_detection()

    if keyboard_works:
        print("✅ Keyboard detection works! You can use F8")
        print("Run: python cloudflare_success_system.py", url)
        return

    print("❌ Keyboard detection failed, using text input instead")

    # Use alternative text-based training
    print("\n2. Starting alternative text-based training...")
    result = await alternative_training_system(url)

    if result:
        print("\n✅ Training successful!")
        print(f"📍 Final URL: {result.current_url}")
        print(f"💰 Prices found: {result.prices_found}")
        print(f"🏠 Units found: {result.units_found}")

        # Save the result
        import json
        from datetime import datetime

        domain = url.replace("https://", "").replace("http://", "").replace("www.", "").split("/")[0]
        filename = f"learned_{domain}_debug.json"

        pattern_data = {
            "session_info": {
                "url": result.url,
                "timestamp": result.timestamp,
                "method": "text_input_debug"
            },
            "extracted_data": {
                "page_title": result.page_title,
                "current_url": result.current_url,
                "prices_found": result.prices_found,
                "units_found": result.units_found
            }
        }

        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(pattern_data, f, indent=2, ensure_ascii=False)

        print(f"💾 Saved pattern: {filename}")

    else:
        print("\n❌ Training failed or was cancelled")

if __name__ == "__main__":
    asyncio.run(main())