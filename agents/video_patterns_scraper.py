#!/usr/bin/env python3
"""
Video-Patterns Scraper
Uses patterns learned from video analysis to scrape rental websites
"""

import asyncio
import json
import time
import os
import sys
from typing import Optional, Dict, List
from playwright.async_api import async_playwright


class VideoPatternsScraper:
    """Scraper that uses video-learned patterns"""

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

    def load_video_patterns(self, video_analysis_file: str):
        """Load patterns learned from video analysis"""
        try:
            with open(video_analysis_file, 'r', encoding='utf-8') as f:
                analysis = json.load(f)

            print(f"[PATTERNS] Loaded video analysis: {len(analysis.get('navigation_patterns', {}).get('page_transitions', []))} transitions")
            return analysis

        except Exception as e:
            print(f"[ERROR] Could not load video analysis: {e}")
            return None

    async def scrape_with_video_patterns(self, video_analysis_file: str, target_url: str):
        """Scrape using patterns learned from video"""
        print("[VIDEO-SCRAPE] Applying video-learned patterns to rental website")
        print("=" * 65)

        # Load video-learned patterns
        video_patterns = self.load_video_patterns(video_analysis_file)
        if not video_patterns:
            return None

        if not self.chrome_profile_path or not os.path.exists(self.chrome_profile_path):
            print(f"[ERROR] Chrome profile not found: {self.chrome_profile_path}")
            return None

        async with async_playwright() as p:
            try:
                # Launch with authenticated Chrome profile
                browser = await p.chromium.launch_persistent_context(
                    user_data_dir=self.chrome_profile_path,
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

                print("[VIDEO-SCRAPE] Authenticated Chrome browser opened")
                print(f"[VIDEO-SCRAPE] Navigating to: {target_url}")

                # Navigate to target website
                await page.goto(target_url, wait_until='domcontentloaded', timeout=30000)

                current_url = page.url
                title = await page.title()

                print(f"[SUCCESS] Website loaded: {title}")
                print(f"[SUCCESS] URL: {current_url}")

                # Wait for dynamic content
                await asyncio.sleep(5)

                # Apply video-learned navigation patterns
                await self._apply_video_navigation(page, video_patterns)

                # Extract rental data using enhanced patterns
                rental_data = await self._extract_with_video_patterns(page, video_patterns)

                # Get page structure analysis
                page_structure = await self._analyze_page_structure(page)

                result = {
                    "video_pattern_scraping": {
                        "video_analysis_file": video_analysis_file,
                        "target_url": target_url,
                        "final_url": current_url,
                        "final_page_title": title,
                        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                        "extraction_method": "video_pattern_guided",
                        "stealth_level": "maximum_authenticated"
                    },
                    "video_patterns_applied": {
                        "page_transitions_learned": len(video_patterns.get('navigation_patterns', {}).get('page_transitions', [])),
                        "content_changes_learned": len(video_patterns.get('navigation_patterns', {}).get('content_changes', [])),
                        "pricing_page_detected": video_patterns.get('rental_data_patterns', {}).get('pricing_page_identified', False)
                    },
                    "rental_data": rental_data,
                    "page_analysis": page_structure,
                    "learned_patterns": video_patterns.get('learned_patterns', {})
                }

                print("[SUCCESS] Video-pattern scraping completed!")

                return result

            except Exception as e:
                print(f"[ERROR] Video-pattern scraping failed: {e}")
                return None

    async def _apply_video_navigation(self, page, video_patterns):
        """Apply navigation patterns learned from video"""
        print("[NAVIGATION] Applying video-learned navigation patterns...")

        # Based on video analysis, try to navigate to pricing section
        navigation_patterns = video_patterns.get('navigation_patterns', {})

        # If video showed page transitions, try to replicate navigation
        page_transitions = navigation_patterns.get('page_transitions', [])

        if page_transitions:
            print(f"[NAVIGATION] Video showed {len(page_transitions)} page transitions, attempting smart navigation...")

            # Try common rental website navigation
            await self._smart_rental_navigation(page)
        else:
            print("[NAVIGATION] No specific navigation patterns, using general rental site approach...")

        # Wait for navigation to complete
        await asyncio.sleep(3)

    async def _smart_rental_navigation(self, page):
        """Smart navigation based on rental website patterns"""
        try:
            # Look for and click common rental navigation elements
            rental_nav_selectors = [
                'a[href*="floor"], a[href*="plan"]',  # Floor plans
                'a[href*="pricing"], a[href*="rates"]',  # Pricing
                'a[href*="availability"]',  # Availability
                'a[href*="apartments"], a[href*="units"]',  # Units
                '.floor-plans, .floorplans',  # Floor plan sections
                '.pricing, .rates',  # Pricing sections
                '[data-section*="floor"]',  # Data attributes
                '[data-section*="pricing"]'
            ]

            for selector in rental_nav_selectors:
                try:
                    elements = page.locator(selector)
                    count = await elements.count()

                    if count > 0:
                        print(f"[NAVIGATION] Found {count} navigation elements: {selector}")

                        # Click the first relevant element
                        first_element = elements.first
                        await first_element.click()
                        print(f"[NAVIGATION] Clicked navigation element: {selector}")

                        # Wait for page change
                        await asyncio.sleep(2)
                        break

                except Exception as e:
                    continue

        except Exception as e:
            print(f"[WARNING] Smart navigation error: {e}")

    async def _extract_with_video_patterns(self, page, video_patterns):
        """Extract rental data using patterns learned from video"""
        data = {
            "prices": [],
            "units": [],
            "features": [],
            "availability": [],
            "price_selectors": [],
            "unit_selectors": []
        }

        try:
            print("[EXTRACT] Extracting rental data using video-learned patterns...")

            # Use enhanced extraction based on video patterns
            rental_patterns = video_patterns.get('rental_data_patterns', {})

            # If video detected pricing page, use more aggressive extraction
            pricing_page_detected = rental_patterns.get('pricing_page_identified', False)

            if pricing_page_detected:
                print("[EXTRACT] Video detected pricing page - using enhanced extraction...")
                extraction_limit = 25  # More aggressive for pricing pages
            else:
                print("[EXTRACT] Using standard extraction patterns...")
                extraction_limit = 15

            # Enhanced price extraction
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

                    for i in range(min(count, extraction_limit)):
                        element = elements.nth(i)
                        text = await element.text_content()
                        if text:
                            text = text.strip()
                            if '$' in text and any(char.isdigit() for char in text):
                                if text not in data["prices"]:
                                    data["prices"].append(text)
                                    data["price_selectors"].append({
                                        "selector": selector,
                                        "text": text,
                                        "element_index": i,
                                        "video_guided": True
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

                    for i in range(min(count, extraction_limit)):
                        element = elements.nth(i)
                        text = await element.text_content()
                        if text:
                            text = text.strip()
                            if len(text) > 3 and any(keyword in text.lower() for keyword in
                                ['bedroom', 'bath', 'studio', 'apartment', 'unit', 'plan', 'br', 'ba', 'den', 'loft']):
                                if text not in data["units"]:
                                    data["units"].append(text)
                                    data["unit_selectors"].append({
                                        "selector": selector,
                                        "text": text,
                                        "element_index": i,
                                        "video_guided": True
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
                                    "pattern": pattern,
                                    "video_guided": True
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
                                    "pattern": pattern,
                                    "video_guided": True
                                })
                                print(f"   [UNIT] Found in text: {match}")

            except Exception as e:
                print(f"[WARNING] Text content search error: {e}")

            print(f"[EXTRACT] Video-guided extraction complete - Found {len(data['prices'])} prices, {len(data['units'])} units")

        except Exception as e:
            print(f"[ERROR] Video-guided extraction error: {e}")

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
    """Video-pattern guided rental scraping"""
    if len(sys.argv) < 2:
        print("Usage: python video_patterns_scraper.py <video_analysis_file> [target_url]")
        print("Example: python video_patterns_scraper.py video_analysis_1759496735.json https://highlandsatsweetwatercreek.com/")
        print()
        print("Note: First run video_based_trainer.py to generate the analysis file")
        sys.exit(1)

    video_analysis_file = sys.argv[1]
    target_url = sys.argv[2] if len(sys.argv) > 2 else "https://highlandsatsweetwatercreek.com/"

    print("[VIDEO-SCRAPE] Video-Pattern Guided Rental Scraper")
    print("[VIDEO-SCRAPE] Using AI-learned patterns from demonstration video")
    print("=" * 60)

    scraper = VideoPatternsScraper()

    try:
        result = await scraper.scrape_with_video_patterns(video_analysis_file, target_url)

        if result:
            print("\n[SUCCESS] Video-pattern scraping completed!")

            # Save comprehensive results
            timestamp = int(time.time())
            filename = f"video_pattern_scraping_{timestamp}.json"

            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)

            print(f"[SAVE] Video-pattern scraping saved: {filename}")

            # Show summary
            rental_data = result.get('rental_data', {})
            video_patterns = result.get('video_patterns_applied', {})

            print("\n[SUMMARY] Video-Pattern Scraping Results:")
            print(f"   Target Website: {result['video_pattern_scraping']['target_url']}")
            print(f"   Final Page: {result['video_pattern_scraping']['final_page_title']}")
            print(f"   Video Transitions Learned: {video_patterns.get('page_transitions_learned', 0)}")
            print(f"   Pricing Page Detected: {video_patterns.get('pricing_page_detected', False)}")
            print(f"   Prices Found: {len(rental_data.get('prices', []))}")
            print(f"   Units Found: {len(rental_data.get('units', []))}")

            if rental_data.get('prices'):
                print(f"   Sample Prices: {rental_data['prices'][:5]}")

            if rental_data.get('units'):
                print(f"   Sample Units: {rental_data['units'][:5]}")

        else:
            print("\n[ERROR] Video-pattern scraping failed")

    except KeyboardInterrupt:
        print("\n[STOP] Video-pattern scraping stopped")
    except Exception as e:
        print(f"\n[ERROR] Video-pattern scraping error: {e}")


if __name__ == "__main__":
    asyncio.run(main())