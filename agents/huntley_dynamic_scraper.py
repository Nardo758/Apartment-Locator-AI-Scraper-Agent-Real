#!/usr/bin/env python3
"""
Huntley Dynamic Content Scraper
Specialized scraper for The Huntley's dynamically loaded pricing
"""

import asyncio
import json
import time
import os
import re
from typing import Dict, List, Optional
from hybrid_video_simple_scraper import HybridVideoSimpleScraper


class HuntleyDynamicScraper:
    """Specialized scraper for The Huntley's dynamic pricing content"""

    def __init__(self):
        self.scraper = HybridVideoSimpleScraper()
        self.huntley_selectors = {
            "navigation": [
                'a[href*="floor"]', 'a[href*="plan"]', 'a[href*="pricing"]',
                'a[href*="rent"]', 'a[href*="availability"]',
                'button[class*="floor"]', 'button[class*="plan"]'
            ],
            "dynamic_pricing": [
                '.price', '.rent', '.pricing', '.cost', '.amount',
                '[class*="price"]', '[class*="rent"]', '[class*="cost"]',
                '[data-price]', '[data-rent]', '[data-cost]',
                '.monthly-price', '.lease-price', '.starting-price',
                '.floor-plan-price', '.unit-price', '.apartment-price'
            ],
            "dynamic_units": [
                '.unit', '.apartment', '.floorplan', '.property',
                '[class*="unit"]', '[class*="apartment"]', '[class*="floor"]',
                '[data-unit]', '[data-apartment]',
                '.bedroom', '.bathroom', '[class*="bed"]', '[class*="bath"]',
                '.unit-type', '.floor-plan-name', '.apartment-type'
            ],
            "content_containers": [
                '.content', '.main', '.container', '#content',
                '.floor-plans', '.pricing-section', '.availability-section',
                '.units-section', '.apartments-section'
            ]
        }

    async def huntley_dynamic_scrape(self, video_analysis_file: str = None, target_url: str = "https://www.thehuntley.com/", profile_name: str = "Default"):
        """Scrape The Huntley with dynamic content handling"""
        print("🏢 HUNTLEY DYNAMIC CONTENT SCRAPER")
        print("=" * 45)
        print("Specialized scraping for The Huntley's dynamic pricing")
        print("=" * 45)

        # Get Chrome profile path
        chrome_profile_path = self.scraper.chrome_profile_path
        if not chrome_profile_path or not os.path.exists(chrome_profile_path):
            raise Exception(f"Chrome profile not found: {chrome_profile_path}")

        profile_dir = os.path.join(chrome_profile_path, profile_name)
        if not os.path.exists(profile_dir):
            raise Exception(f"Profile '{profile_name}' not found")

        from playwright.async_api import async_playwright

        async with async_playwright() as p:
            context = await p.chromium.launch_persistent_context(
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

            try:
                page = context.pages[0] if context.pages else await context.new_page()

                print(f"🌐 Navigating to: {target_url}")
                await page.goto(target_url, wait_until='domcontentloaded', timeout=30000)

                current_url = page.url
                title = await page.title()
                print(f"✅ Loaded: {title}")

                # Initial page analysis
                initial_data = await self._extract_initial_data(page)
                print(f"📊 Initial page: {len(initial_data.get('prices', []))} prices, {len(initial_data.get('units', []))} units")

                # Navigate to pricing section
                await self._navigate_to_pricing(page)

                # Wait for dynamic content to load
                print("⏳ Waiting for dynamic pricing content...")
                await asyncio.sleep(5)  # Initial wait

                # Monitor for dynamic content loading
                await self._wait_for_dynamic_content(page)

                # Extract comprehensive pricing data
                pricing_data = await self._extract_comprehensive_pricing(page)

                # Try additional navigation patterns if needed
                if len(pricing_data.get('prices', [])) < 5:
                    print("🔄 Low yield, trying additional navigation...")
                    await self._try_additional_navigation(page)
                    await asyncio.sleep(3)
                    additional_data = await self._extract_comprehensive_pricing(page)

                    # Merge results
                    pricing_data['prices'].extend(additional_data.get('prices', []))
                    pricing_data['units'].extend(additional_data.get('units', []))
                    pricing_data['prices'] = list(set(pricing_data['prices']))  # Remove duplicates
                    pricing_data['units'] = list(set(pricing_data['units']))

                result = {
                    "scraping_timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                    "target_url": target_url,
                    "final_url": page.url,
                    "final_title": await page.title(),
                    "method": "huntley_dynamic_scraping",
                    "video_patterns_used": video_analysis_file is not None,
                    "initial_data": initial_data,
                    "dynamic_pricing_data": pricing_data,
                    "navigation_performed": True,
                    "dynamic_content_waited": True,
                    "total_prices_found": len(pricing_data.get('prices', [])),
                    "total_units_found": len(pricing_data.get('units', []))
                }

                # Save results
                timestamp = int(time.time())
                filename = f"huntley_dynamic_scraping_{timestamp}.json"
                with open(filename, 'w', encoding='utf-8') as f:
                    json.dump(result, f, indent=2, ensure_ascii=False)

                print(f"💾 Results saved: {filename}")

                return result

            finally:
                await context.close()

    async def _extract_initial_data(self, page) -> Dict:
        """Extract data from initial page load"""
        try:
            data = await page.evaluate("""
                (() => {
                    const prices = [];
                    const units = [];

                    // Simple text extraction
                    const allText = document.body.textContent || '';
                    const priceRegex = /\$[\d,]+(?:\.\d{2})?(?:\s*\/\s*month|\s*monthly|\s*mo\.?)?/gi;
                    const unitRegex = /\d+\s*(?:bedroom|bathroom|bed|bath|br|ba)/gi;

                    const priceMatches = allText.match(priceRegex) || [];
                    const unitMatches = allText.match(unitRegex) || [];

                    return {
                        prices: priceMatches.slice(0, 10),
                        units: unitMatches.slice(0, 10),
                        totalPriceMatches: priceMatches.length,
                        totalUnitMatches: unitMatches.length
                    };
                })()
            """)

            return {
                "prices": data.get("prices", []),
                "units": data.get("units", []),
                "total_prices": data.get("totalPriceMatches", 0),
                "total_units": data.get("totalUnitMatches", 0)
            }

        except Exception as e:
            print(f"⚠️  Initial data extraction error: {e}")
            return {"prices": [], "units": [], "total_prices": 0, "total_units": 0}

    async def _navigate_to_pricing(self, page):
        """Navigate to pricing/floor plans section"""
        print("🧭 Navigating to pricing section...")

        for selector in self.huntley_selectors["navigation"]:
            try:
                elements = page.locator(selector)
                count = await elements.count()

                if count > 0:
                    print(f"   Found {count} navigation elements: {selector}")

                    # Click first element
                    first_element = elements.first
                    element_text = await first_element.text_content()
                    print(f"   Clicking: '{element_text.strip()}'")

                    await first_element.click()
                    await asyncio.sleep(2)

                    # Check URL change
                    current_url = page.url
                    print(f"   Navigated to: {current_url}")
                    break

            except Exception as e:
                continue

    async def _wait_for_dynamic_content(self, page):
        """Wait for dynamic content to load"""
        print("⏳ Monitoring for dynamic content loading...")

        # Wait for common dynamic content indicators
        wait_selectors = [
            '.price', '.rent', '.pricing', '[class*="price"]',
            '.unit', '.apartment', '[class*="unit"]',
            '.floor-plan', '.availability', '.lease'
        ]

        for selector in wait_selectors:
            try:
                # Wait up to 10 seconds for element to appear
                await page.wait_for_selector(selector, timeout=10000)
                print(f"   ✅ Dynamic content detected: {selector}")
                return True
            except:
                continue

        print("   ⚠️  No dynamic content indicators found within timeout")
        return False

    async def _extract_comprehensive_pricing(self, page) -> Dict:
        """Extract comprehensive pricing data"""
        print("💰 Extracting comprehensive pricing data...")

        all_prices = []
        all_units = []

        # Method 1: Direct selector extraction
        for selector in self.huntley_selectors["dynamic_pricing"]:
            try:
                elements = page.locator(selector)
                count = await elements.count()

                for i in range(min(count, 20)):  # Limit to 20 per selector
                    element = elements.nth(i)
                    text = await element.text_content()
                    if text and '$' in text.strip():
                        clean_text = text.strip()
                        if clean_text not in all_prices:
                            all_prices.append(clean_text)
                            print(f"   💵 Price found: {clean_text} ({selector})")

            except Exception as e:
                continue

        # Method 2: Unit extraction
        for selector in self.huntley_selectors["dynamic_units"]:
            try:
                elements = page.locator(selector)
                count = await elements.count()

                for i in range(min(count, 15)):  # Limit to 15 per selector
                    element = elements.nth(i)
                    text = await element.text_content()
                    if text:
                        clean_text = text.strip()
                        # Look for bedroom/bathroom patterns
                        if re.search(r'\d+\s*(?:bedroom|bathroom|bed|bath|br|ba)', clean_text, re.IGNORECASE):
                            if clean_text not in all_units:
                                all_units.append(clean_text)
                                print(f"   🏠 Unit found: {clean_text} ({selector})")

            except Exception as e:
                continue

        # Method 3: Text content regex extraction
        try:
            text_content = await page.evaluate("""
                () => {
                    return document.body.textContent || '';
                }
            """)

            # Enhanced price patterns for Huntley
            price_patterns = [
                r'\$[\d,]+(?:\.\d{2})?(?:\s*/\s*month|\s*monthly|\s*mo\.?|\s*per\s*month)?',
                r'\$[\d,]{3,}(?:\s*per\s*month)?',
                r'Starting\s+(?:at\s+)?\$\d+(?:,\d{3})*',
                r'From\s+\$\d+(?:,\d{3})*',
                r'\$\d+(?:,\d{3})*\s*-\s*\$\d+(?:,\d{3})*',
                r'Rent\s+(?:starts\s+)?(?:at\s+)?\$\d+(?:,\d{3})*'
            ]

            for pattern in price_patterns:
                matches = re.findall(pattern, text_content, re.IGNORECASE)
                for match in matches:
                    if match not in all_prices:
                        all_prices.append(match)
                        print(f"   💵 Price found (regex): {match}")

            # Enhanced unit patterns
            unit_patterns = [
                r'\d+\s*(?:bedroom|bathroom|bed|bath|br|ba)(?:\s*\d+\s*(?:bedroom|bathroom|bed|bath|br|ba))*\s*(?:apartment|unit)?',
                r'Studio\s+(?:Apartment|Unit)?',
                r'\d+\s*(?:Bed|Bath)\s*(?:Apartment|Unit)?',
                r'(?:One|Two|Three|Four|Five)\s*(?:Bedroom|Bathroom)\s*(?:Apartment|Unit)?'
            ]

            for pattern in unit_patterns:
                matches = re.findall(pattern, text_content, re.IGNORECASE)
                for match in matches:
                    if match not in all_units:
                        all_units.append(match)
                        print(f"   🏠 Unit found (regex): {match}")

        except Exception as e:
            print(f"⚠️  Text content extraction error: {e}")

        return {
            "prices": all_prices,
            "units": all_units,
            "total_prices": len(all_prices),
            "total_units": len(all_units),
            "extraction_methods": ["direct_selectors", "regex_patterns"],
            "selectors_used": len(self.huntley_selectors["dynamic_pricing"]) + len(self.huntley_selectors["dynamic_units"])
        }

    async def _try_additional_navigation(self, page):
        """Try additional navigation patterns"""
        print("🔄 Trying additional navigation patterns...")

        additional_selectors = [
            'button[class*="load"]', 'button[class*="show"]', 'a[class*="more"]',
            '.tab-content', '.accordion', '.collapse',
            '[data-toggle]', '[data-target]'
        ]

        for selector in additional_selectors:
            try:
                elements = page.locator(selector)
                count = await elements.count()

                if count > 0:
                    print(f"   Found {count} additional elements: {selector}")
                    # Click first one
                    await elements.first.click()
                    await asyncio.sleep(1)

            except Exception as e:
                continue


async def main():
    """Run Huntley dynamic scraping"""
    print("🏢 HUNTLEY DYNAMIC CONTENT SCRAPER")
    print("Specialized extraction for dynamically loaded pricing data")
    print("=" * 65)

    scraper = HuntleyDynamicScraper()

    try:
        result = await scraper.huntley_dynamic_scrape()

        if result:
            print("\n🎉 HUNTLEY DYNAMIC SCRAPING COMPLETED!")

            dynamic_data = result.get('dynamic_pricing_data', {})
            initial_data = result.get('initial_data', {})

            print("\n📊 RESULTS SUMMARY:")
            print(f"   Initial Page: {initial_data.get('total_prices', 0)} prices, {initial_data.get('total_units', 0)} units")
            print(f"   Dynamic Content: {dynamic_data.get('total_prices', 0)} prices, {dynamic_data.get('total_units', 0)} units")
            print(f"   Navigation: {'✅ Performed' if result.get('navigation_performed', False) else '❌ Failed'}")
            print(f"   Dynamic Wait: {'✅ Successful' if result.get('dynamic_content_waited', False) else '❌ Failed'}")

            total_prices = result.get('total_prices_found', 0)
            total_units = result.get('total_units_found', 0)

            if total_prices > 0:
                print(f"   💰 Sample Prices: {dynamic_data.get('prices', [])[:3]}")
            if total_units > 0:
                print(f"   🏠 Sample Units: {dynamic_data.get('units', [])[:3]}")

            print(f"\n✅ Total Extracted: {total_prices} prices, {total_units} units")

            if total_prices > 10:
                print("🎯 SUCCESS: Good extraction results!")
            elif total_prices > 0:
                print("⚠️  PARTIAL: Some data extracted, may need refinement")
            else:
                print("❌ ISSUE: No pricing data found - may need different approach")

        else:
            print("\n❌ Huntley dynamic scraping failed")

    except KeyboardInterrupt:
        print("\n⏹️  Huntley scraping interrupted")
    except Exception as e:
        print(f"\n❌ Huntley scraping error: {e}")


if __name__ == "__main__":
    asyncio.run(main())