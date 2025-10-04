#!/usr/bin/env python3
"""
Hybrid Video-Simple Scraper
Combines working simple scraper with video-learned patterns
"""

import asyncio
import json
import time
import os
import sys
from typing import Optional, Dict, List
from playwright.async_api import async_playwright


class HybridVideoSimpleScraper:
    """Hybrid scraper combining simple working approach with video patterns"""

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

            print(f"[HYBRID] Loaded video patterns: {len(analysis.get('navigation_patterns', {}).get('page_transitions', []))} transitions")
            return analysis

        except Exception as e:
            print(f"[WARNING] Could not load video analysis, using standard patterns: {e}")
            return None

    async def hybrid_scrape(self, video_analysis_file: str, target_url: str, profile_name: str = "Default"):
        """Hybrid scraping using video patterns + simple working approach"""
        print("[HYBRID] Hybrid Video-Simple Rental Data Scraper")
        print("[HYBRID] Combining video-learned patterns with proven extraction")
        print("=" * 70)

        # Load video patterns (optional - will work without them)
        video_patterns = self.load_video_patterns(video_analysis_file)

        if not self.chrome_profile_path or not os.path.exists(self.chrome_profile_path):
            print(f"[ERROR] Chrome profile not found: {self.chrome_profile_path}")
            return None

        profile_dir = os.path.join(self.chrome_profile_path, profile_name)
        if not os.path.exists(profile_dir):
            print(f"[ERROR] Profile '{profile_name}' not found")
            return None

        async with async_playwright() as p:
            try:
                # Use the exact same approach as the working simple trainer
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

                pages = context.pages
                page = pages[0] if pages else await context.new_page()

                print("[HYBRID] Chrome browser launched with authenticated profile")
                print(f"[HYBRID] Navigating to: {target_url}")

                # Navigate to target website
                await page.goto(target_url, wait_until='domcontentloaded', timeout=30000)

                current_url = page.url
                title = await page.title()

                print(f"[SUCCESS] Website accessed: {title}")
                print(f"[SUCCESS] URL: {current_url}")

                # Wait for dynamic content
                await asyncio.sleep(5)

                # Apply video-learned navigation if available
                if video_patterns:
                    await self._apply_video_navigation_simple(page, video_patterns)

                # Extract rental data using enhanced hybrid approach
                rental_data = await self._extract_hybrid_rental_data(page, video_patterns)

                # Get page structure analysis
                page_structure = await self._analyze_page_structure(page)

                result = {
                    "hybrid_scraping": {
                        "video_analysis_file": video_analysis_file,
                        "target_url": target_url,
                        "final_url": current_url,
                        "final_page_title": title,
                        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                        "extraction_method": "hybrid_video_simple",
                        "stealth_level": "authenticated_profile",
                        "video_patterns_used": video_patterns is not None
                    },
                    "rental_data": rental_data,
                    "page_analysis": page_structure,
                    "video_patterns_info": {
                        "patterns_loaded": video_patterns is not None,
                        "transitions_learned": len(video_patterns.get('navigation_patterns', {}).get('page_transitions', [])) if video_patterns else 0,
                        "pricing_detected": video_patterns.get('rental_data_patterns', {}).get('pricing_page_identified', False) if video_patterns else False
                    } if video_patterns else {}
                }

                print("[SUCCESS] Hybrid scraping completed!")

                return result

            except Exception as e:
                print(f"[ERROR] Hybrid scraping failed: {e}")
                return None
            finally:
                try:
                    await context.close()
                except:
                    pass

    async def _apply_video_navigation_simple(self, page, video_patterns):
        """Apply video navigation patterns using simple approach"""
        print("[NAVIGATION] Applying video-learned navigation patterns...")

        try:
            # Based on video analysis, try smart navigation
            navigation_patterns = video_patterns.get('navigation_patterns', {})
            page_transitions = navigation_patterns.get('page_transitions', [])

            if page_transitions:
                print(f"[NAVIGATION] Video showed {len(page_transitions)} transitions, attempting navigation...")

                # Try to find and click pricing/floor plan links
                rental_links = [
                    'a[href*="floor"]', 'a[href*="plan"]',
                    'a[href*="pricing"]', 'a[href*="rates"]',
                    'a[href*="availability"]', 'a[href*="apartments"]'
                ]

                for selector in rental_links:
                    try:
                        elements = page.locator(selector)
                        count = await elements.count()

                        if count > 0:
                            print(f"[NAVIGATION] Found {count} rental links: {selector}")
                            # Click first link
                            first_link = elements.first
                            await first_link.click()

                            # Wait for navigation
                            await asyncio.sleep(3)
                            print(f"[NAVIGATION] Clicked rental navigation link")
                            break

                    except Exception as e:
                        continue

            # Additional wait for content loading
            await asyncio.sleep(2)

        except Exception as e:
            print(f"[WARNING] Video navigation error: {e}")

    async def _extract_hybrid_rental_data(self, page, video_patterns=None):
        """Extract rental data using hybrid approach"""
        data = {
            "prices": [],
            "units": [],
            "features": [],
            "availability": [],
            "price_selectors": [],
            "unit_selectors": []
        }

        try:
            print("[EXTRACT] Starting hybrid rental data extraction...")

            # Determine extraction intensity based on video patterns
            if video_patterns and video_patterns.get('rental_data_patterns', {}).get('pricing_page_identified', False):
                extraction_limit = 25  # More aggressive for pricing pages
                print("[EXTRACT] Video detected pricing page - using enhanced extraction")
            else:
                extraction_limit = 15  # Standard extraction
                print("[EXTRACT] Using standard extraction patterns")

            # Comprehensive price extraction
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
                                        "video_guided": video_patterns is not None
                                    })
                                    print(f"   [PRICE] Found: {text} (selector: {selector})")
                except Exception as e:
                    continue

            # Comprehensive unit extraction
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
                                        "video_guided": video_patterns is not None
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

                    # Comprehensive price patterns
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
                                    "video_guided": video_patterns is not None
                                })
                                print(f"   [PRICE] Found in text: {match}")

                    # Comprehensive unit patterns
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
                                    "video_guided": video_patterns is not None
                                })
                                print(f"   [UNIT] Found in text: {match}")

            except Exception as e:
                print(f"[WARNING] Text content search error: {e}")

            print(f"[EXTRACT] Hybrid extraction complete - Found {len(data['prices'])} prices, {len(data['units'])} units")

        except Exception as e:
            print(f"[ERROR] Hybrid extraction error: {e}")

        return data

    async def _analyze_page_structure(self, page):
        """Analyze the page structure"""
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
    """Hybrid video-simple rental scraping"""
    if len(sys.argv) < 1:
        print("Usage: python hybrid_video_simple_scraper.py <video_analysis_file> [target_url] [profile_name]")
        print("Example: python hybrid_video_simple_scraper.py video_analysis_1759496735.json https://highlandsatsweetwatercreek.com/ Default")
        print()
        print("Note: Video analysis file is optional - will work with standard patterns")
        print("Note: Profile name defaults to 'Default'")
        sys.exit(1)

    video_analysis_file = sys.argv[1] if len(sys.argv) > 1 else None
    target_url = sys.argv[2] if len(sys.argv) > 2 else "https://highlandsatsweetwatercreek.com/"
    profile_name = sys.argv[3] if len(sys.argv) > 3 else "Default"

    print("[HYBRID] Hybrid Video-Simple Rental Data Scraper")
    print("[HYBRID] Combining AI video patterns with proven extraction methods")
    print("=" * 65)

    scraper = HybridVideoSimpleScraper()

    try:
        result = await scraper.hybrid_scrape(video_analysis_file, target_url, profile_name)

        if result:
            print("\n[SUCCESS] Hybrid scraping completed!")

            # Save comprehensive results
            timestamp = int(time.time())
            filename = f"hybrid_scraping_{timestamp}.json"

            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)

            print(f"[SAVE] Hybrid scraping saved: {filename}")

            # Show summary
            rental_data = result.get('rental_data', {})
            hybrid_info = result.get('hybrid_scraping', {})

            print("\n[SUMMARY] Hybrid Scraping Results:")
            print(f"   Target Website: {hybrid_info.get('target_url', 'N/A')}")
            print(f"   Final Page: {hybrid_info.get('final_page_title', 'N/A')}")
            print(f"   Video Patterns Used: {hybrid_info.get('video_patterns_used', False)}")
            print(f"   Prices Found: {len(rental_data.get('prices', []))}")
            print(f"   Units Found: {len(rental_data.get('units', []))}")

            if rental_data.get('prices'):
                print(f"   Sample Prices: {rental_data['prices'][:5]}")

            if rental_data.get('units'):
                print(f"   Sample Units: {rental_data['units'][:5]}")

            # Show video pattern info if available
            video_info = result.get('video_patterns_info', {})
            if video_info:
                print(f"   Video Transitions Learned: {video_info.get('transitions_learned', 0)}")
                print(f"   Pricing Page Detected: {video_info.get('pricing_detected', False)}")

        else:
            print("\n[ERROR] Hybrid scraping failed")

    except KeyboardInterrupt:
        print("\n[STOP] Hybrid scraping stopped")
    except Exception as e:
        print(f"\n[ERROR] Hybrid scraping error: {e}")


if __name__ == "__main__":
    asyncio.run(main())