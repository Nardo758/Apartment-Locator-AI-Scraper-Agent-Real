#!/usr/bin/env python3
"""
Smart Chrome Trainer
Uses Chrome's browsing history and knowledge to automatically find pricing pages
"""

import asyncio
import json
import time
import os
import sys
from typing import Optional, Dict, List
from playwright.async_api import async_playwright


class SmartChromeTrainer:
    """Smart trainer that leverages Chrome's knowledge of rental websites"""

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

    async def smart_chrome_extraction(self, url: str, profile_name: str = "Default"):
        """Smart extraction using Chrome's knowledge of the site"""
        print("[SMART] Smart Chrome Rental Data Extractor")
        print("[SMART] Leveraging Chrome's browsing history and site knowledge")
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
                # Launch with authenticated Chrome profile
                browser = await p.chromium.launch_persistent_context(
                    user_data_dir=profile_dir,
                    headless=False,
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

                print("[SMART] Authenticated Chrome browser opened with full history")
                print(f"[SMART] Navigating to: {url}")

                # Navigate to main site
                await page.goto(url, wait_until='domcontentloaded', timeout=30000)

                current_url = page.url
                title = await page.title()

                print(f"[SUCCESS] Main page loaded: {title}")
                print(f"[SUCCESS] URL: {current_url}")

                # Wait for dynamic content
                await asyncio.sleep(3)

                # Try to automatically find and navigate to pricing page
                pricing_url = await self._find_pricing_page_smart(page, url)

                if pricing_url and pricing_url != current_url:
                    print(f"[SMART] Found pricing page: {pricing_url}")
                    try:
                        # Navigate with better error handling
                        await page.goto(pricing_url, wait_until='domcontentloaded', timeout=30000)
                        await asyncio.sleep(5)  # Wait longer for pricing content to load

                        # Re-establish page context after navigation
                        await page.wait_for_load_state('networkidle', timeout=10000)

                        final_url = page.url
                        final_title = await page.title()
                        print(f"[SUCCESS] Pricing page loaded: {final_title}")
                    except Exception as nav_error:
                        print(f"[WARNING] Navigation to pricing page failed: {nav_error}")
                        print("[SMART] Falling back to main page extraction")
                        final_url = current_url
                        final_title = title
                else:
                    print("[SMART] Using main page for extraction (no separate pricing page found)")
                    final_url = current_url
                    final_title = title

                # Extract rental data from the pricing page
                rental_data = await self._extract_rental_data_smart(page)

                # Get page structure analysis
                page_structure = await self._analyze_page_structure(page)

                result = {
                    "smart_extraction": {
                        "original_url": url,
                        "final_url": final_url,
                        "final_page_title": final_title,
                        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                        "extraction_method": "smart_chrome_knowledge",
                        "stealth_level": "maximum_authenticated_with_history",
                        "auto_navigation": pricing_url is not None
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

                print("[SUCCESS] Smart Chrome extraction completed!")

                return result

            except Exception as e:
                print(f"[ERROR] Smart extraction failed: {e}")
                return None

    async def _find_pricing_page_smart(self, page, base_url):
        """Use Chrome's knowledge to find pricing/floor plans page"""
        try:
            print("[SMART] Searching for pricing/floor plans page...")

            # Common pricing page URLs to try
            pricing_paths = [
                '/floor-plans', '/floorplans', '/plans', '/apartments',
                '/pricing', '/rates', '/rent', '/availability',
                '/units', '/residences', '/homes'
            ]

            # First, look for links on the current page
            pricing_links = await page.evaluate("""
                () => {
                    const links = Array.from(document.querySelectorAll('a'));
                    const pricingKeywords = ['floor plan', 'pricing', 'rates', 'rent', 'availability', 'apartments', 'units'];

                    const pricingLinks = links.filter(link => {
                        const text = link.textContent.toLowerCase();
                        const href = link.href.toLowerCase();
                        return pricingKeywords.some(keyword =>
                            text.includes(keyword) || href.includes(keyword.replace(' ', '-'))
                        );
                    });

                    return pricingLinks.map(link => ({
                        text: link.textContent.trim(),
                        href: link.href
                    }));
                }
            """)

            if pricing_links:
                print(f"[SMART] Found {len(pricing_links)} potential pricing links")
                for link in pricing_links[:3]:  # Try first 3 links
                    print(f"   [LINK] {link['text']} -> {link['href']}")
                    # Return the first valid pricing link
                    if link['href'] and link['href'].startswith(('http://', 'https://')):
                        return link['href']

            # If no links found, try common URL patterns
            print("[SMART] No pricing links found, trying common URL patterns...")
            for path in pricing_paths:
                test_url = base_url.rstrip('/') + path
                try:
                    # Quick check if URL exists (without full navigation)
                    response = await page.request.get(test_url)
                    if response.status == 200:
                        print(f"[SMART] Found valid pricing URL: {test_url}")
                        return test_url
                except:
                    continue

            print("[SMART] No separate pricing page found")
            return None

        except Exception as e:
            print(f"[WARNING] Smart pricing page detection error: {e}")
            return None

    async def _extract_rental_data_smart(self, page):
        """Extract rental data using comprehensive smart strategies"""
        data = {
            "prices": [],
            "units": [],
            "features": [],
            "availability": [],
            "price_selectors": [],
            "unit_selectors": []
        }

        try:
            print("[EXTRACT] Starting smart rental data extraction...")

            # Enhanced price extraction with more selectors
            price_selectors = [
                ".price", ".rent", ".pricing", ".cost", ".amount", ".monthly", ".rate",
                "[class*='price']", "[class*='rent']", "[data-price]", "[data-rent]",
                "[data-testid*='price']", "[aria-label*='price']",
                ".starting-at", ".from", ".starting-price", ".fee",
                ".floor-plan-price", ".unit-price", ".apartment-price",
                "[class*='rate']", "[class*='amount']", "[class*='cost']"
            ]

            print("[EXTRACT] Searching for price data...")
            for selector in price_selectors:
                try:
                    elements = page.locator(selector)
                    count = await elements.count()

                    for i in range(min(count, 20)):  # Increased limit for pricing pages
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

            # Enhanced unit extraction
            unit_selectors = [
                ".unit", ".apartment", ".floorplan", ".property", ".plan",
                "[class*='unit']", "[class*='apartment']", "[data-unit]",
                ".bedroom", ".bathroom", "[class*='bedroom']", ".unit-type",
                "[data-testid*='unit']", "[aria-label*='unit']",
                ".floor-plan", ".layout", ".type", ".configuration",
                ".floorplan-name", ".unit-name", ".apartment-type"
            ]

            print("[EXTRACT] Searching for unit data...")
            for selector in unit_selectors:
                try:
                    elements = page.locator(selector)
                    count = await elements.count()

                    for i in range(min(count, 20)):  # Increased limit for pricing pages
                        element = elements.nth(i)
                        text = await element.text_content()
                        if text:
                            text = text.strip()
                            # Look for bedroom/bathroom/unit keywords
                            if len(text) > 3 and any(keyword in text.lower() for keyword in
                                ['bedroom', 'bath', 'studio', 'apartment', 'unit', 'plan', 'br', 'ba', 'den', 'loft']):
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

            # Enhanced text content search
            print("[EXTRACT] Searching text content for rental patterns...")
            try:
                all_text = await page.locator('body').text_content()
                if all_text:
                    import re

                    # More comprehensive price patterns
                    price_patterns = [
                        r'\$[\d,]+(?:\.\d{2})?(?:\s*/\s*month|\s*monthly|\s*mo\.?|\s*per\s*month)?',
                        r'\$[\d,]{3,}(?:\s*per\s*month)?',
                        r'Starting\s+(?:at\s+)?\$[\d,]+',
                        r'From\s+\$[\d,]+',
                        r'\$[\d,]+(?:\s*-\s*\$[\d,]+)?(?:\s*per\s*month)?',
                        r'Rent\s+(?:starts\s+)?(?:at\s+)?\$[\d,]+'
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

                    # Enhanced unit patterns
                    unit_patterns = [
                        r'\d+\s*(?:bedroom|bath|br|ba)(?:\s*\d+\s*(?:bedroom|bath|br|ba))*\s*(?:apartment|unit|condo|townhome)?',
                        r'Studio\s+(?:Apartment|Unit|Condo)?',
                        r'\d+\s*(?:Bed|Bath)\s*(?:Apartment|Unit|Condo)?',
                        r'(?:One|Two|Three|Four|Five)\s*(?:Bedroom|Bath)\s*(?:Apartment|Unit)?',
                        r'(\d+BR|\d+BA|\d+BR/\d+BA)'
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

            # Enhanced structure analysis for pricing pages
            print("[EXTRACT] Analyzing pricing page structure...")
            try:
                # Look for pricing tables, grids, cards
                pricing_structures = [
                    ".pricing-table", ".price-table", ".rate-table",
                    ".floor-plans", ".floorplans", ".plans-grid",
                    ".unit-grid", ".apartment-grid", ".pricing-grid",
                    "[class*='pricing']", "[class*='floor-plan']", "[class*='unit']"
                ]

                for selector in pricing_structures:
                    try:
                        elements = page.locator(selector)
                        count = await elements.count()
                        if count > 0:
                            print(f"   [STRUCTURE] Found pricing structure: {selector} ({count} elements)")
                            # Extract from these structured elements
                            for i in range(min(count, 10)):
                                element = elements.nth(i)
                                section_text = await element.text_content()
                                if section_text and len(section_text) > 20:
                                    # Extract prices and units from structured sections
                                    section_prices = re.findall(r'\$[\d,]+(?:\.\d{2})?', section_text)
                                    section_units = re.findall(r'\d+\s*(?:bedroom|bath|br|ba)', section_text, re.IGNORECASE)

                                    for price in section_prices:
                                        if price not in data["prices"]:
                                            data["prices"].append(price)
                                            data["price_selectors"].append({
                                                "selector": f"{selector} structure",
                                                "text": price,
                                                "section_index": i
                                            })
                                            print(f"   [PRICE] Found in structure: {price}")

                                    for unit in section_units:
                                        if unit not in data["units"]:
                                            data["units"].append(unit)
                                            data["unit_selectors"].append({
                                                "selector": f"{selector} structure",
                                                "text": unit,
                                                "section_index": i
                                            })
                                            print(f"   [UNIT] Found in structure: {unit}")
                    except:
                        continue

            except Exception as e:
                print(f"[WARNING] Structure analysis error: {e}")

            print(f"[EXTRACT] Smart extraction complete - Found {len(data['prices'])} prices, {len(data['units'])} units")

        except Exception as e:
            print(f"[ERROR] Smart extraction error: {e}")

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
                    pricingElements: Array.from(document.querySelectorAll('[class*="price"], [class*="rent"], [class*="rate"]')).length,
                    unitElements: Array.from(document.querySelectorAll('[class*="unit"], [class*="apartment"], [class*="floor"]')).length,
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
    """Smart Chrome rental data extraction"""
    if len(sys.argv) < 2:
        print("Usage: python smart_chrome_trainer.py <url> [profile_name]")
        print("Example: python smart_chrome_trainer.py https://highlandsatsweetwatercreek.com/")
        print("Example: python smart_chrome_trainer.py https://highlandsatsweetwatercreek.com/ Profile\\ 1")
        print()
        print("Note: Make sure Chrome is closed before running")
        print("Note: Default profile is 'Default'")
        print("Note: Uses Chrome's browsing history to find pricing pages automatically")
        sys.exit(1)

    url = sys.argv[1]
    profile_name = sys.argv[2] if len(sys.argv) > 2 else "Default"

    print("[SMART] Smart Chrome Rental Data Extractor")
    print("[SMART] Leveraging Chrome's browsing history and site knowledge")
    print("=" * 60)

    trainer = SmartChromeTrainer()

    try:
        result = await trainer.smart_chrome_extraction(url, profile_name)

        if result:
            print("\n[SUCCESS] Smart Chrome extraction completed!")

            # Save comprehensive results
            timestamp = int(time.time())
            filename = f"smart_chrome_extraction_{timestamp}.json"

            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)

            print(f"[SAVE] Smart extraction saved: {filename}")

            # Show summary
            rental_data = result.get('rental_data', {})

            print("\n[SUMMARY] Smart Chrome Extraction Results:")
            print(f"   Final Page: {result['smart_extraction']['final_page_title']}")
            print(f"   Final URL: {result['smart_extraction']['final_url']}")
            print(f"   Auto Navigation: {result['smart_extraction']['auto_navigation']}")
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
            print("\n[ERROR] Smart Chrome extraction failed")

    except KeyboardInterrupt:
        print("\n[STOP] Smart Chrome extraction stopped")
    except Exception as e:
        print(f"\n[ERROR] Smart Chrome extraction error: {e}")


if __name__ == "__main__":
    asyncio.run(main())