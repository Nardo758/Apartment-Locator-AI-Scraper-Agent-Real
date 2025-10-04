#!/usr/bin/env python3
"""
Real Website Training System
Trains AI scraper on actual rental websites using Chrome profile authentication
"""

import asyncio
import json
import time
import os
import sys
from typing import Optional, Dict, List
from playwright.async_api import async_playwright


class RealWebsiteTrainer:
    """Trains scraper on real rental websites with enhanced data extraction"""

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

    async def train_on_real_website(self, url: str, profile_name: str = "Default"):
        """Train on real rental website with comprehensive data extraction"""
        print("[REAL] Real Website AI Training System")
        print("[REAL] Using authenticated Chrome profile for live data extraction")
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

                print("[REAL] Authenticated Chrome profile loaded")
                print(f"[REAL] Navigating to: {url}")

                # Navigate to real website
                await page.goto(url, wait_until='domcontentloaded', timeout=30000)

                current_url = page.url
                title = await page.title()

                print("[SUCCESS] Real website accessed!")
                print(f"[SUCCESS] URL: {current_url}")
                print(f"[SUCCESS] Title: {title}")

                # Wait for dynamic content to load
                print("[REAL] Waiting for dynamic content to load...")
                await asyncio.sleep(3)

                # Set up comprehensive activity monitoring
                await self._setup_comprehensive_monitoring(page)

                # Perform intelligent browsing to find rental data
                await self._intelligent_rental_browsing(page)

                # Monitor activity and capture when user stops
                result = await self._monitor_and_capture_real_data(page, url)

                if result:
                    print("[SUCCESS] Real website training completed!")
                    return result

            except Exception as e:
                print(f"[ERROR] Real website training failed: {e}")
                return None

    async def _setup_comprehensive_monitoring(self, page):
        """Set up comprehensive activity monitoring for real websites"""
        await page.add_script_tag(content="""
            window.realWebsiteActivity = {
                lastActivity: Date.now(),
                events: [],
                rentalDataFound: false,
                priceElements: [],
                unitElements: []
            };

            function logRealActivity(type, details = {}) {
                const now = Date.now();
                window.realWebsiteActivity.lastActivity = now;
                window.realWebsiteActivity.events.push({
                    type: type,
                    time: now,
                    details: details
                });

                // Check for rental data patterns
                if (type === 'content_change' || type === 'scroll') {
                    detectRentalData();
                }
            }

            function detectRentalData() {
                // Look for price patterns
                const priceSelectors = [
                    '.price', '.rent', '.pricing', '.cost', '.amount', '.monthly',
                    '[class*="price"]', '[class*="rent"]', '[data-price]', '[data-rent]',
                    '.rate', '.fee', '[class*="rate"]', '[class*="amount"]',
                    '[data-testid*="price"]', '[aria-label*="price"]',
                    '.starting-at', '.from', '.starting-price'
                ];

                priceSelectors.forEach(selector => {
                    try {
                        const elements = document.querySelectorAll(selector);
                        elements.forEach(el => {
                            const text = el.textContent.trim();
                            if (text && /\$[\d,]+/.test(text)) {
                                if (!window.realWebsiteActivity.priceElements.includes(text)) {
                                    window.realWebsiteActivity.priceElements.push(text);
                                    window.realWebsiteActivity.rentalDataFound = true;
                                    logRealActivity('price_found', {text: text, selector: selector});
                                }
                            }
                        });
                    } catch(e) {}
                });

                // Look for unit patterns
                const unitSelectors = [
                    '.unit', '.apartment', '.floorplan', '.property', '.plan',
                    '[class*="unit"]', '[class*="apartment"]', '[data-unit]',
                    '.bedroom', '.bathroom', '[class*="bedroom"]', '.unit-type',
                    '[data-testid*="unit"]', '[aria-label*="unit"]',
                    '.floor-plan', '.layout', '.type'
                ];

                unitSelectors.forEach(selector => {
                    try {
                        const elements = document.querySelectorAll(selector);
                        elements.forEach(el => {
                            const text = el.textContent.trim();
                            if (text && text.length > 3 && /\d+\s*(bedroom|bath|br)/i.test(text)) {
                                if (!window.realWebsiteActivity.unitElements.includes(text)) {
                                    window.realWebsiteActivity.unitElements.push(text);
                                    window.realWebsiteActivity.rentalDataFound = true;
                                    logRealActivity('unit_found', {text: text, selector: selector});
                                }
                            }
                        });
                    } catch(e) {}
                });
            }

            // Monitor all user interactions
            document.addEventListener('mousedown', (e) => logRealActivity('mousedown', {
                x: e.clientX, y: e.clientY, button: e.button
            }));
            document.addEventListener('click', (e) => logRealActivity('click', {
                x: e.clientX, y: e.clientY, target: e.target.tagName
            }));
            document.addEventListener('scroll', () => logRealActivity('scroll', {
                scrollY: window.scrollY
            }));
            document.addEventListener('keydown', (e) => logRealActivity('keydown', {
                key: e.key
            }));

            // Monitor DOM changes for dynamic content
            const observer = new MutationObserver(() => {
                logRealActivity('content_change');
            });
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'style']
            });

            // Initial detection
            detectRentalData();
            logRealActivity('session_start');
        """)

    async def _intelligent_rental_browsing(self, page):
        """Perform intelligent browsing to find rental data sections"""
        print("[REAL] Performing intelligent rental browsing...")

        # Common rental website navigation patterns
        navigation_actions = [
            # Scroll to look for content
            lambda: page.evaluate("window.scrollTo(0, 500)"),
            lambda: asyncio.sleep(1),
            lambda: page.evaluate("window.scrollTo(0, 1000)"),
            lambda: asyncio.sleep(1),
            lambda: page.evaluate("window.scrollTo(0, 1500)"),
            lambda: asyncio.sleep(1),

            # Look for common rental links
            self._click_rental_links,
            lambda: asyncio.sleep(2),

            # Scroll back up
            lambda: page.evaluate("window.scrollTo(0, 0)"),
            lambda: asyncio.sleep(1),
        ]

        for action in navigation_actions:
            try:
                if asyncio.iscoroutinefunction(action):
                    await action()
                else:
                    action()
            except Exception as e:
                print(f"[WARNING] Navigation action failed: {e}")
                continue

        print("[REAL] Intelligent browsing completed")

    async def _click_rental_links(self):
        """Click on common rental-related links"""
        # This would be implemented to click on "Floor Plans", "Pricing", etc.
        # For now, we'll rely on scrolling and content detection
        pass

    async def _monitor_and_capture_real_data(self, page, original_url):
        """Monitor activity and capture real rental data"""
        print("[REAL] Monitoring activity on real website...")
        print("[REAL] System will auto-capture rental data after 20 seconds of inactivity")

        start_time = time.time()
        last_status_time = 0

        while time.time() - start_time < 120:  # 2 minute session
            try:
                current_time = time.time()

                # Get activity data from browser
                activity_data = await page.evaluate("""
                    ({
                        lastActivity: window.realWebsiteActivity?.lastActivity || Date.now(),
                        eventCount: window.realWebsiteActivity?.events?.length || 0,
                        rentalDataFound: window.realWebsiteActivity?.rentalDataFound || false,
                        priceCount: window.realWebsiteActivity?.priceElements?.length || 0,
                        unitCount: window.realWebsiteActivity?.unitElements?.length || 0
                    })
                """)

                if activity_data:
                    time_since_activity = current_time - (activity_data['lastActivity'] / 1000)

                    # Show status update every 5 seconds
                    if current_time - last_status_time > 5:
                        print(f"[MONITOR] Activity: {activity_data['eventCount']} events | "
                              f"Inactive: {time_since_activity:.1f}s | "
                              f"Data found: {activity_data['rentalDataFound']} | "
                              f"Prices: {activity_data['priceCount']} | "
                              f"Units: {activity_data['unitCount']}")
                        last_status_time = current_time

                    # Check for inactivity (20 seconds for real websites)
                    if time_since_activity > 20:
                        print("[CAPTURE] Inactivity detected, capturing real rental data...")
                        return await self._capture_real_rental_data(page, original_url)

                await asyncio.sleep(1)

            except Exception as e:
                print(f"[ERROR] Monitoring error: {e}")
                await asyncio.sleep(2)

        # Session timeout - capture what we have
        print("[TIMEOUT] Session timeout, capturing available data...")
        return await self._capture_real_rental_data(page, original_url)

    async def _capture_real_rental_data(self, page, original_url):
        """Capture comprehensive rental data from real website"""
        try:
            url = page.url
            title = await page.title()
            content = await page.content()

            # Get activity data
            activity_data = await page.evaluate("""
                window.realWebsiteActivity || {
                    events: [],
                    priceElements: [],
                    unitElements: [],
                    rentalDataFound: false
                }
            """)

            # Extract rental data using multiple strategies
            rental_data = await self._extract_comprehensive_real_data(page)

            # Get page structure analysis
            page_structure = await self._analyze_page_structure(page)

            result = {
                "training_session": {
                    "original_url": original_url,
                    "final_url": url,
                    "page_title": title,
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                    "training_method": "real_website_authenticated_chrome",
                    "stealth_level": "maximum_authenticated"
                },
                "activity_monitoring": {
                    "total_events": len(activity_data.get('events', [])),
                    "rental_data_detected": activity_data.get('rentalDataFound', False),
                    "session_duration_seconds": 120,
                    "inactivity_threshold_seconds": 20
                },
                "extracted_rental_data": rental_data,
                "page_analysis": page_structure,
                "learned_patterns": {
                    "price_selectors_found": rental_data.get('price_selectors', []),
                    "unit_selectors_found": rental_data.get('unit_selectors', []),
                    "content_areas": page_structure.get('content_areas', []),
                    "dynamic_content_detected": page_structure.get('has_dynamic_content', False)
                }
            }

            print("[DATA] Real website data capture complete:")
            print(f"   [TITLE] {title}")
            print(f"   [PRICES] {len(rental_data.get('prices', []))} found")
            print(f"   [UNITS] {len(rental_data.get('units', []))} found")
            print(f"   [ACTIVITY] {len(activity_data.get('events', []))} events recorded")
            print(f"   [CONTENT] {len(content)} characters captured")

            return result

        except Exception as e:
            print(f"[ERROR] Real data capture error: {e}")
            return None

    async def _extract_comprehensive_real_data(self, page):
        """Extract rental data using comprehensive real-world strategies"""
        data = {
            "prices": [],
            "units": [],
            "features": [],
            "availability": [],
            "price_selectors": [],
            "unit_selectors": []
        }

        try:
            # Comprehensive price extraction
            price_strategies = [
                # Direct price selectors
                { "selectors": [".price", ".rent", ".pricing", ".cost", ".amount", ".monthly"], "type": "direct_price" },
                { "selectors": ["[class*='price']", "[class*='rent']", "[data-price]"], "type": "attribute_price" },
                { "selectors": ["[data-testid*='price']", "[aria-label*='price']"], "type": "accessibility_price" },

                # Content-based price search
                { "selectors": ["*"], "pattern": r'\$[\d,]+(?:\.\d{2})?(?:\s*/\s*month|\s*monthly)?', "type": "regex_price" }
            ]

            for strategy in price_strategies:
                if "selectors" in strategy:
                    for selector in strategy["selectors"]:
                        try:
                            elements = page.locator(selector)
                            count = await elements.count()

                            for i in range(min(count, 20)):
                                element = elements.nth(i)
                                text = await element.text_content()
                                if text:
                                    text = text.strip()
                                    if "pattern" in strategy:
                                        import re
                                        if re.search(strategy["pattern"], text):
                                            data["prices"].append(text)
                                            data["price_selectors"].append({
                                                "selector": selector,
                                                "type": strategy["type"],
                                                "text": text
                                            })
                                    elif '$' in text and len(text) > 3:
                                        data["prices"].append(text)
                                        data["price_selectors"].append({
                                            "selector": selector,
                                            "type": strategy["type"],
                                            "text": text
                                        })
                        except:
                            continue

            # Comprehensive unit extraction
            unit_strategies = [
                { "selectors": [".unit", ".apartment", ".floorplan", ".property"], "type": "direct_unit" },
                { "selectors": ["[class*='unit']", "[class*='apartment']", "[data-unit]"], "type": "attribute_unit" },
                { "selectors": [".bedroom", ".bathroom", ".unit-type"], "type": "room_unit" },
                { "selectors": ["[data-testid*='unit']", "[aria-label*='unit']"], "type": "accessibility_unit" }
            ]

            for strategy in unit_strategies:
                for selector in strategy["selectors"]:
                    try:
                        elements = page.locator(selector)
                        count = await elements.count()

                        for i in range(min(count, 15)):
                            element = elements.nth(i)
                            text = await element.text_content()
                            if text:
                                text = text.strip()
                                if len(text) > 3 and any(keyword in text.lower() for keyword in
                                    ['bedroom', 'bath', 'studio', 'apartment', 'unit', 'plan']):
                                    data["units"].append(text)
                                    data["unit_selectors"].append({
                                        "selector": selector,
                                        "type": strategy["type"],
                                        "text": text
                                    })
                    except:
                        continue

            # Remove duplicates
            data["prices"] = list(set(data["prices"]))
            data["units"] = list(set(data["units"]))

        except Exception as e:
            print(f"[WARNING] Comprehensive extraction error: {e}")

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
                    links: Array.from(document.querySelectorAll('a')).length
                })
            """)

            return structure

        except Exception as e:
            print(f"[WARNING] Page structure analysis error: {e}")
            return {}


async def main():
    """Train on real rental website"""
    if len(sys.argv) < 2:
        print("Usage: python real_website_trainer.py <url> [profile_name]")
        print("Example: python real_website_trainer.py https://highlandsatsweetwatercreek.com/")
        print("Example: python real_website_trainer.py https://highlandsatsweetwatercreek.com/ Profile\\ 1")
        print()
        print("Note: Make sure Chrome is closed before running")
        print("Note: Default profile is 'Default'")
        sys.exit(1)

    url = sys.argv[1]
    profile_name = sys.argv[2] if len(sys.argv) > 2 else "Default"

    print("[REAL] Real Website AI Training System")
    print("[REAL] Learning rental data patterns from live websites")
    print("=" * 55)

    trainer = RealWebsiteTrainer()

    try:
        result = await trainer.train_on_real_website(url, profile_name)

        if result:
            print("\n[SUCCESS] Real website training completed!")

            # Save comprehensive results
            timestamp = int(time.time())
            filename = f"real_website_training_{timestamp}.json"

            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)

            print(f"[SAVE] Real website training saved: {filename}")

            # Show summary
            rental_data = result.get('extracted_rental_data', {})
            activity = result.get('activity_monitoring', {})

            print("\n[SUMMARY] Real Website Training Results:")
            print(f"   Website: {result['training_session']['page_title']}")
            print(f"   Prices Found: {len(rental_data.get('prices', []))}")
            print(f"   Units Found: {len(rental_data.get('units', []))}")
            print(f"   Activity Events: {activity.get('total_events', 0)}")
            print(f"   Rental Data Detected: {activity.get('rental_data_detected', False)}")

            if rental_data.get('prices'):
                print(f"   Sample Prices: {rental_data['prices'][:3]}")

            if rental_data.get('units'):
                print(f"   Sample Units: {rental_data['units'][:3]}")

        else:
            print("\n[ERROR] Real website training failed")

    except KeyboardInterrupt:
        print("\n[STOP] Real website training stopped")
    except Exception as e:
        print(f"\n[ERROR] Real website training error: {e}")


if __name__ == "__main__":
    asyncio.run(main())