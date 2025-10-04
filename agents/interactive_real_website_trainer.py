#!/usr/bin/env python3
"""
Interactive Real Website Trainer
Opens browser for manual navigation, then extracts rental data on command
"""

import asyncio
import json
import time
import os
import sys
from typing import Optional, Dict, List
from playwright.async_api import async_playwright


class InteractiveRealWebsiteTrainer:
    """Interactive trainer that lets user navigate manually before extraction"""

    def __init__(self):
        self.chrome_profile_path = self._get_chrome_profile_path()

    def _get_chrome_profile_path(self) -> Optional[str]:
        """Get Chrome profile path"""
        import platform
        system = platform.system()
        home = os.path.expanduser("~")

        if system == "Windows":
            return os.path.join(home, "AppData", "Local", "Google", "Chrome", "User Data")
        elif system == "Darwin":
            return os.path.join(home, "Library", "Application Support", "Google", "Chrome")
        elif system == "Linux":
            return os.path.join(home, ".config", "google-chrome")
        return None

    async def interactive_training_session(self, url: str, profile_name: str = "Default"):
        """Interactive session: user navigates, then we extract"""
        print("[INTERACTIVE] Interactive Real Website Training Session")
        print("[INTERACTIVE] Manual navigation with authenticated Chrome profile")
        print("=" * 65)

        if not self.chrome_profile_path or not os.path.exists(self.chrome_profile_path):
            print(f"[ERROR] Chrome profile not found: {self.chrome_profile_path}")
            return None

        profile_dir = os.path.join(self.chrome_profile_path, profile_name)
        if not os.path.exists(profile_dir):
            print(f"[ERROR] Profile '{profile_name}' not found")
            return None

        async with async_playwright() as p:
            try:
                # Launch with authenticated Chrome profile - NOT headless
                browser = await p.chromium.launch_persistent_context(
                    user_data_dir=profile_dir,
                    headless=False,  # Keep browser visible for user interaction
                    args=[
                        '--disable-blink-features=AutomationControlled',
                        '--no-first-run',
                        '--disable-web-security',
                        '--disable-features=VizDisplayCompositor',
                        '--disable-extensions',
                        '--disable-plugins',
                        '--disable-default-apps',
                        '--disable-background-timer-throttling',
                        '--disable-backgrounding-occluded-windows',
                        '--disable-renderer-backgrounding',
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                    ],
                    viewport={'width': 1920, 'height': 1080},
                    accept_downloads=False,
                )

                pages = browser.pages
                page = pages[0] if pages else await browser.new_page()

                print("[INTERACTIVE] Authenticated Chrome browser opened")
                print(f"[INTERACTIVE] Navigate manually to: {url}")
                print("[INTERACTIVE] Then navigate to the pricing/floor plans page")
                print("[INTERACTIVE] Press ENTER in this terminal when ready to extract data")

                # Navigate to initial URL
                await page.goto(url, wait_until='domcontentloaded', timeout=30000)

                current_url = page.url
                title = await page.title()

                print(f"[SUCCESS] Initial page loaded: {title}")
                print(f"[SUCCESS] URL: {current_url}")
                print()
                print("📋 INSTRUCTIONS:")
                print("1. Use the browser window to navigate to the pricing/floor plans page")
                print("2. Click on 'Floor Plans', 'Pricing', or similar links")
                print("3. Wait for the rental information to load")
                print("4. Return to this terminal and press ENTER to extract the data")
                print()

                # Wait for user input
                input("Press ENTER when you're on the pricing/floor plans page...")

                print("[EXTRACT] Starting data extraction from current page...")

                # Get current page info
                final_url = page.url
                final_title = await page.title()

                print(f"[EXTRACT] Extracting from: {final_title}")
                print(f"[EXTRACT] URL: {final_url}")

                # Extract rental data from current page
                rental_data = await self._extract_rental_data_from_page(page)

                # Get page structure analysis
                page_structure = await self._analyze_page_structure(page)

                result = {
                    "interactive_session": {
                        "original_url": url,
                        "final_url": final_url,
                        "final_page_title": final_title,
                        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                        "extraction_method": "interactive_authenticated_chrome",
                        "stealth_level": "maximum_authenticated",
                        "user_navigation": True
                    },
                    "rental_data": rental_data,
                    "page_analysis": page_structure,
                    "learned_patterns": {
                        "price_selectors_found": rental_data.get('price_selectors', []),
                        "unit_selectors_found": rental_data.get('unit_selectors', []),
                        "content_areas": page_structure.get('content_areas', []),
                        "dynamic_content_detected": page_structure.get('has_dynamic_content', False)
                    }
                }

                print("[SUCCESS] Interactive extraction completed!")

                return result

            except Exception as e:
                print(f"[ERROR] Interactive session failed: {e}")
                return None

    async def _extract_rental_data_from_page(self, page):
        """Extract rental data from the current page state"""
        data = {
            "prices": [],
            "units": [],
            "features": [],
            "availability": [],
            "price_selectors": [],
            "unit_selectors": []
        }

        try:
            print("[EXTRACT] Starting comprehensive rental data extraction...")

            # Strategy 1: Common price selectors
            price_selectors = [
                ".price", ".rent", ".pricing", ".cost", ".amount", ".monthly",
                "[class*='price']", "[class*='rent']", "[data-price]", "[data-rent]",
                "[data-testid*='price']", "[aria-label*='price']",
                ".starting-at", ".from", ".starting-price", ".rate", ".fee"
            ]

            print("[EXTRACT] Searching for price data...")
            for selector in price_selectors:
                try:
                    elements = page.locator(selector)
                    count = await elements.count()

                    for i in range(min(count, 15)):  # Increased limit for interactive session
                        element = elements.nth(i)
                        text = await element.text_content()
                        if text:
                            text = text.strip()
                            # Look for dollar signs and numbers
                            if '$' in text and any(char.isdigit() for char in text):
                                if text not in data["prices"]:  # Avoid duplicates
                                    data["prices"].append(text)
                                    data["price_selectors"].append({
                                        "selector": selector,
                                        "text": text,
                                        "element_index": i
                                    })
                                    print(f"   [PRICE] Found: {text} (selector: {selector})")
                except Exception as e:
                    continue

            # Strategy 2: Common unit selectors
            unit_selectors = [
                ".unit", ".apartment", ".floorplan", ".property", ".plan",
                "[class*='unit']", "[class*='apartment']", "[data-unit]",
                ".bedroom", ".bathroom", "[class*='bedroom']", ".unit-type",
                "[data-testid*='unit']", "[aria-label*='unit']",
                ".floor-plan", ".layout", ".type"
            ]

            print("[EXTRACT] Searching for unit data...")
            for selector in unit_selectors:
                try:
                    elements = page.locator(selector)
                    count = await elements.count()

                    for i in range(min(count, 15)):  # Increased limit for interactive session
                        element = elements.nth(i)
                        text = await element.text_content()
                        if text:
                            text = text.strip()
                            # Look for bedroom/bathroom/unit keywords
                            if len(text) > 3 and any(keyword in text.lower() for keyword in
                                ['bedroom', 'bath', 'studio', 'apartment', 'unit', 'plan', 'br', 'ba']):
                                if text not in data["units"]:  # Avoid duplicates
                                    data["units"].append(text)
                                    data["unit_selectors"].append({
                                        "selector": selector,
                                        "text": text,
                                        "element_index": i
                                    })
                                    print(f"   [UNIT] Found: {text} (selector: {selector})")
                except Exception as e:
                    continue

            # Strategy 3: Text content search for prices
            print("[EXTRACT] Searching text content for rental patterns...")
            try:
                all_text = await page.locator('body').text_content()
                if all_text:
                    import re

                    # Find all price patterns in text
                    price_patterns = [
                        r'\$[\d,]+(?:\.\d{2})?(?:\s*/\s*month|\s*monthly|\s*mo\.?)',
                        r'\$[\d,]{3,}(?:\s*per\s*month)?',
                        r'Starting\s+(?:at\s+)?\$[\d,]+',
                        r'From\s+\$[\d,]+'
                    ]

                    for pattern in price_patterns:
                        matches = re.findall(pattern, all_text, re.IGNORECASE)
                        for match in matches:
                            if match not in data["prices"]:
                                data["prices"].append(match)
                                data["price_selectors"].append({
                                    "selector": "text_content",
                                    "text": match,
                                    "pattern": pattern
                                })
                                print(f"   [PRICE] Found in text: {match}")

                    # Find unit patterns in text
                    unit_patterns = [
                        r'\d+\s*(?:bedroom|bath|br|ba)(?:\s*\d+\s*(?:bedroom|bath|br|ba))*\s*(?:apartment|unit)?',
                        r'Studio\s+(?:Apartment|Unit)',
                        r'\d+\s*(?:Bed|Bath)\s*(?:Apartment|Unit)?'
                    ]

                    for pattern in unit_patterns:
                        matches = re.findall(pattern, all_text, re.IGNORECASE)
                        for match in matches:
                            if match not in data["units"]:
                                data["units"].append(match)
                                data["unit_selectors"].append({
                                    "selector": "text_content",
                                    "text": match,
                                    "pattern": pattern
                                })
                                print(f"   [UNIT] Found in text: {match}")

            except Exception as e:
                print(f"[WARNING] Text content search error: {e}")

            # Strategy 4: Look for common rental website structures
            print("[EXTRACT] Checking for common rental website structures...")
            try:
                # Check for floor plan sections
                floor_plan_selectors = [
                    ".floor-plans", ".floorplans", ".plans", ".apartments",
                    "[id*='floor']", "[id*='plan']", "[class*='floor']", "[class*='plan']"
                ]

                for selector in floor_plan_selectors:
                    try:
                        elements = page.locator(selector)
                        count = await elements.count()
                        if count > 0:
                            print(f"   [STRUCTURE] Found floor plan section: {selector} ({count} elements)")
                            # Extract text from these sections
                            for i in range(min(count, 5)):
                                element = elements.nth(i)
                                section_text = await element.text_content()
                                if section_text and len(section_text) > 50:
                                    # Look for prices and units in this section
                                    section_prices = re.findall(r'\$[\d,]+(?:\.\d{2})?', section_text)
                                    section_units = re.findall(r'\d+\s*(?:bedroom|bath|br|ba)', section_text, re.IGNORECASE)

                                    for price in section_prices:
                                        if price not in data["prices"]:
                                            data["prices"].append(price)
                                            data["price_selectors"].append({
                                                "selector": f"{selector} section",
                                                "text": price,
                                                "section_index": i
                                            })
                                            print(f"   [PRICE] Found in section: {price}")

                                    for unit in section_units:
                                        if unit not in data["units"]:
                                            data["units"].append(unit)
                                            data["unit_selectors"].append({
                                                "selector": f"{selector} section",
                                                "text": unit,
                                                "section_index": i
                                            })
                                            print(f"   [UNIT] Found in section: {unit}")
                    except:
                        continue

            except Exception as e:
                print(f"[WARNING] Structure analysis error: {e}")

            print(f"[EXTRACT] Extraction complete - Found {len(data['prices'])} prices, {len(data['units'])} units")

        except Exception as e:
            print(f"[ERROR] Extraction error: {e}")

        return data

    async def _analyze_page_structure(self, page):
        """Analyze the page structure for future scraping"""
        try:
            structure = await page.evaluate("""
                ({
                    hasDynamicContent: !!document.querySelector('[data-reactroot], [ng-app], .vue-app, [data-vue-app]'),
                    contentAreas: Array.from(document.querySelectorAll('main, .content, .main, #content, .container'))
                        .map(el => ({
                            tag: el.tagName,
                            classes: el.className,
                            id: el.id,
                            childCount: el.children.length
                        })),
                    forms: Array.from(document.querySelectorAll('form')).length,
                    scripts: Array.from(document.querySelectorAll('script')).length,
                    stylesheets: Array.from(document.querySelectorAll('link[rel="stylesheet"]')).length,
                    images: Array.from(document.querySelectorAll('img')).length,
                    links: Array.from(document.querySelectorAll('a')).length,
                    totalElements: document.querySelectorAll('*').length
                })
            """)

            return structure

        except Exception as e:
            print(f"[WARNING] Page structure analysis error: {e}")
            return {}


async def main():
    """Interactive rental data extraction"""
    if len(sys.argv) < 2:
        print("Usage: python interactive_real_website_trainer.py <url> [profile_name]")
        print("Example: python interactive_real_website_trainer.py https://highlandsatsweetwatercreek.com/")
        print("Example: python interactive_real_website_trainer.py https://highlandsatsweetwatercreek.com/ Profile\\ 1")
        print()
        print("Note: Make sure Chrome is closed before running")
        print("Note: Default profile is 'Default'")
        print("Note: Browser will open - navigate to pricing page, then press ENTER here")
        sys.exit(1)

    url = sys.argv[1]
    profile_name = sys.argv[2] if len(sys.argv) > 2 else "Default"

    print("[INTERACTIVE] Interactive Real Website Rental Data Extractor")
    print("[INTERACTIVE] Manual navigation with authenticated Chrome profile")
    print("=" * 60)

    trainer = InteractiveRealWebsiteTrainer()

    try:
        result = await trainer.interactive_training_session(url, profile_name)

        if result:
            print("\n[SUCCESS] Interactive extraction completed!")

            # Save comprehensive results
            timestamp = int(time.time())
            filename = f"interactive_real_extraction_{timestamp}.json"

            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)

            print(f"[SAVE] Interactive extraction saved: {filename}")

            # Show summary
            rental_data = result.get('rental_data', {})

            print("\n[SUMMARY] Interactive Real Website Extraction Results:")
            print(f"   Final Page: {result['interactive_session']['final_page_title']}")
            print(f"   Final URL: {result['interactive_session']['final_url']}")
            print(f"   Prices Found: {len(rental_data.get('prices', []))}")
            print(f"   Units Found: {len(rental_data.get('units', []))}")

            if rental_data.get('prices'):
                print(f"   Sample Prices: {rental_data['prices'][:5]}")

            if rental_data.get('units'):
                print(f"   Sample Units: {rental_data['units'][:5]}")

            # Show learned selectors
            price_selectors = rental_data.get('price_selectors', [])
            unit_selectors = rental_data.get('unit_selectors', [])

            if price_selectors:
                print(f"   Price Selectors: {len(price_selectors)} patterns learned")
                unique_selectors = list(set([s['selector'] for s in price_selectors]))
                print(f"   Unique Price Selectors: {unique_selectors[:3]}")

            if unit_selectors:
                print(f"   Unit Selectors: {len(unit_selectors)} patterns learned")
                unique_selectors = list(set([s['selector'] for s in unit_selectors]))
                print(f"   Unique Unit Selectors: {unique_selectors[:3]}")

        else:
            print("\n[ERROR] Interactive extraction failed")

    except KeyboardInterrupt:
        print("\n[STOP] Interactive extraction stopped")
    except Exception as e:
        print(f"\n[ERROR] Interactive extraction error: {e}")


if __name__ == "__main__":
    asyncio.run(main())