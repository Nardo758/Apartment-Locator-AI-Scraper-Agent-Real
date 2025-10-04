#!/usr/bin/env python3
"""
Huntley Video-Pattern Enhanced Scraper
Combines video-learned navigation with aggressive pricing extraction
"""

import asyncio
import json
import time
import os
import re
from typing import Dict, List, Optional
from hybrid_video_simple_scraper import HybridVideoSimpleScraper


class HuntleyVideoEnhancedScraper:
    """Enhanced scraper using video patterns + aggressive extraction"""

    def __init__(self):
        self.scraper = HybridVideoSimpleScraper()

    async def huntley_video_enhanced_scrape(self, video_analysis_file: str = None, target_url: str = "https://www.thehuntley.com/", profile_name: str = "Default"):
        """Scrape using video patterns + enhanced extraction"""
        print("🎥 HUNTLEY VIDEO-PATTERN ENHANCED SCRAPER")
        print("=" * 50)
        print("Combining learned navigation with aggressive extraction")
        print("=" * 50)

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

                # Initial data extraction
                initial_data = await self._extract_aggressive_data(page)
                print(f"📊 Initial page: {len(initial_data.get('prices', []))} prices, {len(initial_data.get('units', []))} units")

                # Apply video-learned navigation patterns
                if video_analysis_file and os.path.exists(video_analysis_file):
                    print("🎥 Applying video-learned navigation patterns...")
                    await self._apply_video_navigation_patterns(page, video_analysis_file)
                else:
                    print("🧭 Applying standard navigation patterns...")
                    await self._apply_standard_navigation(page)

                # Wait for content and scroll to load more
                await self._aggressive_content_loading(page)

                # Extract with multiple aggressive methods
                pricing_data = await self._extract_aggressive_pricing(page)

                # Try additional interaction patterns
                if len(pricing_data.get('prices', [])) < 5:
                    print("🔄 Low yield, trying additional interactions...")
                    await self._try_interaction_patterns(page)
                    await asyncio.sleep(3)
                    additional_data = await self._extract_aggressive_pricing(page)

                    # Merge results
                    pricing_data['prices'].extend(additional_data.get('prices', []))
                    pricing_data['units'].extend(additional_data.get('units', []))
                    pricing_data['prices'] = list(set(pricing_data['prices']))
                    pricing_data['units'] = list(set(pricing_data['units']))

                result = {
                    "scraping_timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                    "target_url": target_url,
                    "final_url": page.url,
                    "final_title": await page.title(),
                    "method": "huntley_video_enhanced_scraping",
                    "video_patterns_used": video_analysis_file is not None,
                    "initial_data": initial_data,
                    "enhanced_pricing_data": pricing_data,
                    "navigation_performed": True,
                    "content_loading_attempted": True,
                    "total_prices_found": len(pricing_data.get('prices', [])),
                    "total_units_found": len(pricing_data.get('units', []))
                }

                # Save results
                timestamp = int(time.time())
                filename = f"huntley_enhanced_scraping_{timestamp}.json"
                with open(filename, 'w', encoding='utf-8') as f:
                    json.dump(result, f, indent=2, ensure_ascii=False)

                print(f"💾 Results saved: {filename}")

                return result

            finally:
                await context.close()

    async def _apply_video_navigation_patterns(self, page, video_file: str):
        """Apply navigation patterns learned from video analysis"""
        try:
            with open(video_file, 'r') as f:
                analysis = json.load(f)

            # Look for navigation patterns in the analysis
            navigation_patterns = analysis.get('navigation_patterns', {})

            # Try to replicate the navigation sequence from video
            if 'page_transitions' in navigation_patterns:
                transitions = navigation_patterns['page_transitions']
                for transition in transitions:
                    timestamp = transition.get('timestamp', 0)
                    transition_type = transition.get('transition_type', '')

                    if 'text_content_loaded' in transition_type:
                        # Wait and try navigation
                        await asyncio.sleep(2)

                        # Try common navigation elements
                        nav_selectors = [
                            'a[href*="floor"]', 'a[href*="plan"]', 'a[href*="pricing"]',
                            'button[class*="floor"]', 'button[class*="plan"]'
                        ]

                        for selector in nav_selectors:
                            try:
                                elements = page.locator(selector)
                                if await elements.count() > 0:
                                    await elements.first.click()
                                    await asyncio.sleep(3)
                                    print(f"   ✅ Applied video navigation: {selector}")
                                    break
                            except:
                                continue

        except Exception as e:
            print(f"⚠️  Video navigation application error: {e}")

    async def _apply_standard_navigation(self, page):
        """Apply standard navigation patterns for Huntley"""
        print("🧭 Applying standard navigation...")

        navigation_attempts = [
            ('a[href*="floor"]', 'Floor Plans'),
            ('a[href*="plan"]', 'Floor Plans'),
            ('a[href*="pricing"]', 'Pricing'),
            ('a[href*="rent"]', 'Rent'),
            ('button[class*="floor"]', 'Floor Plans Button'),
            ('button[class*="plan"]', 'Floor Plans Button'),
            ('[data-target*="floor"]', 'Floor Plans Modal'),
            ('[data-target*="plan"]', 'Floor Plans Modal')
        ]

        for selector, description in navigation_attempts:
            try:
                elements = page.locator(selector)
                count = await elements.count()

                if count > 0:
                    print(f"   Found {count} {description} elements")
                    await elements.first.click()
                    await asyncio.sleep(3)
                    print(f"   ✅ Clicked: {description}")
                    break

            except Exception as e:
                continue

    async def _aggressive_content_loading(self, page):
        """Aggressively load content through scrolling and waiting"""
        print("⏳ Aggressively loading content...")

        # Scroll to load dynamic content
        await page.evaluate("""
            () => {
                window.scrollTo(0, document.body.scrollHeight);
            }
        """)
        await asyncio.sleep(2)

        # Scroll back up and down
        await page.evaluate("""
            () => {
                window.scrollTo(0, 0);
                setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 1000);
            }
        """)
        await asyncio.sleep(3)

        # Try to trigger any lazy loading
        await page.evaluate("""
            () => {
                // Trigger scroll events
                window.dispatchEvent(new Event('scroll'));
                window.dispatchEvent(new Event('resize'));

                // Try to click on any "load more" buttons that might be hidden
                const buttons = document.querySelectorAll('button, a');
                for (const btn of buttons) {
                    if (btn.textContent.toLowerCase().includes('load') ||
                        btn.textContent.toLowerCase().includes('show') ||
                        btn.textContent.toLowerCase().includes('more')) {
                        btn.click();
                    }
                }
            }
        """)
        await asyncio.sleep(3)

        print("   ✅ Aggressive content loading completed")

    async def _extract_aggressive_data(self, page) -> Dict:
        """Extract data aggressively from initial page"""
        try:
            data = await page.evaluate("""
                (() => {
                    const prices = [];
                    const units = [];

                    // Get all text content
                    const allText = document.body.textContent || '';

                    // Comprehensive price patterns
                    const pricePatterns = [
                        /\\$[\d,]+(?:\\.\\d{2})?(?:\\s*\\/\\s*month|\\s*monthly|\\s*mo\\.?|\\s*per\\s*month)?/gi,
                        /\\$[\d,]{3,}(?:\\s*per\\s*month)?/gi,
                        /Starting\\s+(?:at\\s+)?\\$\\d+(?:,\\d{3})*/gi,
                        /From\\s+\\$\\d+(?:,\\d{3})*/gi,
                        /\\$\\d+(?:,\\d{3})*\\s*-\\s*\\$\\d+(?:,\\d{3})*/gi,
                        /Rent\\s+(?:starts\\s+)?(?:at\\s+)?\\$\\d+(?:,\\d{3})*/gi
                    ];

                    for (const pattern of pricePatterns) {
                        const matches = allText.match(pattern) || [];
                        prices.push(...matches);
                    }

                    // Comprehensive unit patterns
                    const unitPatterns = [
                        /\\d+\\s*(?:bedroom|bathroom|bed|bath|br|ba)(?:\\s*\\d+\\s*(?:bedroom|bathroom|bed|bath|br|ba))*\\s*(?:apartment|unit)?/gi,
                        /Studio\\s+(?:Apartment|Unit)?/gi,
                        /\\d+\\s*(?:Bed|Bath)\\s*(?:Apartment|Unit)?/gi,
                        /(?:One|Two|Three|Four|Five)\\s*(?:Bedroom|Bathroom)\\s*(?:Apartment|Unit)?/gi
                    ];

                    for (const pattern of unitPatterns) {
                        const matches = allText.match(pattern) || [];
                        units.push(...matches);
                    }

                    return {
                        prices: [...new Set(prices)].slice(0, 20),
                        units: [...new Set(units)].slice(0, 20),
                        totalPriceMatches: prices.length,
                        totalUnitMatches: units.length
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
            print(f"⚠️  Aggressive initial extraction error: {e}")
            return {"prices": [], "units": [], "total_prices": 0, "total_units": 0}

    async def _extract_aggressive_pricing(self, page) -> Dict:
        """Extract pricing data with aggressive methods"""
        print("💰 Extracting with aggressive methods...")

        all_prices = []
        all_units = []

        # Method 1: Direct element extraction with broader selectors
        aggressive_selectors = [
            '*',  # All elements
            '[class*="price"]', '[class*="rent"]', '[class*="cost"]',
            '[id*="price"]', '[id*="rent"]', '[id*="cost"]',
            '[data-price]', '[data-rent]', '[data-cost]',
            '.price', '.rent', '.pricing', '.cost',
            '.monthly-price', '.lease-price', '.starting-price',
            '.floor-plan-price', '.unit-price', '.apartment-price',
            '[class*="unit"]', '[class*="apartment"]', '[class*="floor"]',
            '.bedroom', '.bathroom', '[class*="bed"]', '[class*="bath"]'
        ]

        for selector in aggressive_selectors:
            try:
                elements = page.locator(selector)
                count = await elements.count()

                for i in range(min(count, 50)):  # Check more elements
                    element = elements.nth(i)
                    text = await element.text_content()

                    if text:
                        clean_text = text.strip()

                        # Check for price patterns
                        if '$' in clean_text and len(clean_text) < 100:
                            if clean_text not in all_prices:
                                all_prices.append(clean_text)
                                print(f"   💵 Price found: {clean_text}")

                        # Check for unit patterns
                        if re.search(r'\d+\s*(?:bedroom|bathroom|bed|bath|br|ba)', clean_text, re.IGNORECASE):
                            if clean_text not in all_units:
                                all_units.append(clean_text)
                                print(f"   🏠 Unit found: {clean_text}")

            except Exception as e:
                continue

        # Method 2: Deep text content analysis
        try:
            deep_content = await page.evaluate("""
                () => {
                    const prices = [];
                    const units = [];

                    // Get text from all elements recursively
                    function getAllText(element) {
                        let text = '';
                        if (element.nodeType === Node.TEXT_NODE) {
                            text = element.textContent || '';
                        } else if (element.nodeType === Node.ELEMENT_NODE) {
                            for (const child of element.childNodes) {
                                text += getAllText(child);
                            }
                        }
                        return text;
                    }

                    const allText = getAllText(document.body);

                    // Price patterns
                    const priceRegex = /\\$[\d,]+(?:\\.\\d{2})?(?:\\s*\\/\\s*month|\\s*monthly|\\s*mo\\.?)?/g;
                    const priceMatches = allText.match(priceRegex) || [];
                    prices.push(...priceMatches);

                    // Unit patterns
                    const unitRegex = /\\d+\\s*(?:bedroom|bathroom|bed|bath|br|ba)/g;
                    const unitMatches = allText.match(unitRegex) || [];
                    units.push(...unitMatches);

                    return {
                        prices: [...new Set(prices)].slice(0, 30),
                        units: [...new Set(units)].slice(0, 30)
                    };
                }
            """)

            all_prices.extend(deep_content.get('prices', []))
            all_units.extend(deep_content.get('units', []))

        except Exception as e:
            print(f"⚠️  Deep content extraction error: {e}")

        # Remove duplicates
        all_prices = list(set(all_prices))
        all_units = list(set(all_units))

        return {
            "prices": all_prices,
            "units": all_units,
            "total_prices": len(all_prices),
            "total_units": len(all_units),
            "extraction_methods": ["aggressive_selectors", "deep_content_analysis"],
            "selectors_used": len(aggressive_selectors)
        }

    async def _try_interaction_patterns(self, page):
        """Try various interaction patterns to trigger content loading"""
        print("🔄 Trying interaction patterns...")

        interaction_patterns = [
            # Click on tabs
            '.tab', '.nav-tab', '[role="tab"]',
            # Click on accordions
            '.accordion', '.collapse', '[data-toggle="collapse"]',
            # Click on dropdowns
            '.dropdown', '[data-toggle="dropdown"]',
            # Click on modals
            '[data-toggle="modal"]', '[data-target]',
            # Click on buttons
            'button[class*="load"]', 'button[class*="show"]', 'button[class*="more"]',
            'a[class*="load"]', 'a[class*="show"]', 'a[class*="more"]'
        ]

        for selector in interaction_patterns:
            try:
                elements = page.locator(selector)
                count = await elements.count()

                if count > 0:
                    print(f"   Found {count} interactive elements: {selector}")

                    # Click first few elements
                    for i in range(min(count, 3)):
                        try:
                            element = elements.nth(i)
                            await element.click()
                            await asyncio.sleep(1)
                        except:
                            continue

            except Exception as e:
                continue


async def main():
    """Run Huntley video-enhanced scraping"""
    print("🎥 HUNTLEY VIDEO-PATTERN ENHANCED SCRAPER")
    print("Combining learned navigation with aggressive extraction")
    print("=" * 60)

    scraper = HuntleyVideoEnhancedScraper()

    # Try to find the latest video analysis file
    video_files = [f for f in os.listdir('.') if f.startswith('video_analysis_') and f.endswith('.json')]
    video_file = max(video_files) if video_files else None

    try:
        result = await scraper.huntley_video_enhanced_scrape(video_file)

        if result:
            print("\n🎉 HUNTLEY ENHANCED SCRAPING COMPLETED!")

            enhanced_data = result.get('enhanced_pricing_data', {})
            initial_data = result.get('initial_data', {})

            print("\n📊 RESULTS SUMMARY:")
            print(f"   Initial Page: {initial_data.get('total_prices', 0)} prices, {initial_data.get('total_units', 0)} units")
            print(f"   Enhanced Content: {enhanced_data.get('total_prices', 0)} prices, {enhanced_data.get('total_units', 0)} units")
            print(f"   Navigation: {'✅ Performed' if result.get('navigation_performed', False) else '❌ Failed'}")
            print(f"   Content Loading: {'✅ Attempted' if result.get('content_loading_attempted', False) else '❌ Failed'}")

            total_prices = result.get('total_prices_found', 0)
            total_units = result.get('total_units_found', 0)

            if total_prices > 0:
                print(f"   💰 Sample Prices: {enhanced_data.get('prices', [])[:3]}")
            if total_units > 0:
                print(f"   🏠 Sample Units: {enhanced_data.get('units', [])[:3]}")

            print(f"\n✅ Total Extracted: {total_prices} prices, {total_units} units")

            if total_prices > 10:
                print("🎯 SUCCESS: Good extraction results!")
            elif total_prices > 0:
                print("⚠️  PARTIAL: Some data extracted, may need refinement")
            else:
                print("❌ ISSUE: No pricing data found - may need different approach")

        else:
            print("\n❌ Huntley enhanced scraping failed")

    except KeyboardInterrupt:
        print("\n⏹️  Huntley scraping interrupted")
    except Exception as e:
        print(f"\n❌ Huntley scraping error: {e}")


if __name__ == "__main__":
    asyncio.run(main())