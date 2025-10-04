#!/usr/bin/env python3
"""
Chrome Profile Activity Monitor
Uses authenticated Chrome profile for enhanced stealth
"""

import asyncio
import sys
import json
import time
import os
from typing import Optional
from playwright.async_api import async_playwright


class ChromeProfileTrainer:
    """Activity monitor using authenticated Chrome profile"""

    def __init__(self):
        self.profile_path = self._get_chrome_profile_path()

    def _get_chrome_profile_path(self) -> Optional[str]:
        """Get the path to Chrome user data directory"""
        import platform

        system = platform.system()
        home = os.path.expanduser("~")

        if system == "Windows":
            return os.path.join(home, "AppData", "Local", "Google", "Chrome", "User Data")
        elif system == "Darwin":  # macOS
            return os.path.join(home, "Library", "Application Support", "Google", "Chrome")
        elif system == "Linux":
            return os.path.join(home, ".config", "google-chrome")
        else:
            return None

    async def train_with_chrome_profile(self, url: str, profile_name: str = "Default"):
        """Train using authenticated Chrome profile"""
        print("[CHROME] Starting Chrome Profile Activity Monitor")
        print(f"[CHROME] Using profile: {profile_name}")

        if not self.profile_path or not os.path.exists(self.profile_path):
            print(f"[ERROR] Chrome profile not found at: {self.profile_path}")
            print("[ERROR] Please ensure Chrome is installed and you have a profile")
            return None

        profile_dir = os.path.join(self.profile_path, profile_name)
        if not os.path.exists(profile_dir):
            print(f"[ERROR] Profile '{profile_name}' not found")
            print(f"[ERROR] Available profiles: {os.listdir(self.profile_path) if os.path.exists(self.profile_path) else 'None'}")
            return None

        print(f"[CHROME] Profile directory: {profile_dir}")

        async with async_playwright() as p:
            try:
                # Launch Chrome with user profile using persistent context
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

                # Get the first available page
                pages = browser.pages
                if pages:
                    page = pages[0]
                else:
                    page = await browser.new_page()

                print("[CHROME] Chrome profile loaded successfully")
                print("[CHROME] Authenticated browsing session active")

                # Navigate to target site
                print(f"[NAVIGATE] Navigating to: {url}")
                await page.goto(url, wait_until='domcontentloaded', timeout=30000)

                # Check if we got through
                current_url = page.url
                title = await page.title()

                print(f"[SUCCESS] Navigation successful!")
                print(f"[SUCCESS] Current URL: {current_url}")
                print(f"[SUCCESS] Page Title: {title}")

                # Set up activity monitoring
                await self._setup_chrome_activity_monitoring(page)

                # Monitor activity
                result = await self._monitor_chrome_activity(page)

                if result:
                    print("[SUCCESS] Chrome profile training completed!")
                    return result

            except Exception as e:
                print(f"[ERROR] Chrome profile training failed: {e}")
                print("[INFO] This might be due to Chrome being already running")
                print("[INFO] Try closing all Chrome instances first")
                return None

    async def _setup_chrome_activity_monitoring(self, page):
        """Set up activity monitoring for Chrome profile"""
        await page.add_script_tag(content="""
            window.lastActivityTime = Date.now();
            window.chromeActivityEvents = [];

            function logChromeActivity(type, details = {}) {
                const now = Date.now();
                window.lastActivityTime = now;
                window.chromeActivityEvents.push({
                    type: type,
                    time: now,
                    chromeProfile: true,
                    ...details
                });
            }

            // Enhanced Chrome-specific monitoring
            document.addEventListener('mousedown', (e) => logChromeActivity('chrome_mousedown', {
                x: e.clientX, y: e.clientY,
                button: e.button,
                chromeUser: navigator.userAgent.includes('Chrome')
            }));

            document.addEventListener('click', (e) => logChromeActivity('chrome_click', {
                x: e.clientX, y: e.clientY,
                target: e.target.tagName,
                chromeAuthenticated: true
            }));

            document.addEventListener('scroll', () => logChromeActivity('chrome_scroll', {
                scrollY: window.scrollY,
                scrollX: window.scrollX
            }));

            // Monitor Chrome-specific features
            if (window.chrome && window.chrome.runtime) {
                logChromeActivity('chrome_extensions_available');
            }

            // Initial activity to set timestamp
            logChromeActivity('chrome_session_start');
        """)

    async def _monitor_chrome_activity(self, page):
        """Monitor activity in Chrome profile session"""
        print("[MONITOR] Chrome profile activity monitoring active")
        print("[MONITOR] Authenticated session provides enhanced stealth")

        start_time = time.time()

        while time.time() - start_time < 60:  # 1 minute monitoring
            try:
                # Check activity with error handling
                last_activity = await page.evaluate("""
                    window.lastActivityTime || Date.now()
                """)

                if last_activity:
                    time_since_activity = time.time() - (last_activity / 1000)
                else:
                    time_since_activity = 0

                if time_since_activity > 15:  # 15 seconds inactivity
                    print("[CAPTURE] Chrome profile inactivity detected, capturing data...")
                    return await self._capture_chrome_data(page)

                # Show activity status
                activity_count = await page.evaluate("""
                    window.chromeActivityEvents ? window.chromeActivityEvents.length : 0
                """)
                print(f"[MONITOR] Activity events: {activity_count} | Time since activity: {time_since_activity:.1f}s", end='\r')

                await asyncio.sleep(1)

            except Exception as e:
                print(f"[ERROR] Chrome monitoring error: {e}")
                await asyncio.sleep(2)

        # Timeout - capture data anyway
        print("\n[TIMEOUT] Chrome session timeout, capturing final data...")
        return await self._capture_chrome_data(page)

    async def _capture_chrome_data(self, page):
        """Capture data using Chrome profile authentication"""
        try:
            url = page.url
            title = await page.title()
            content = await page.content()

            # Extract rental data
            prices = await self._extract_chrome_prices(page)
            units = await self._extract_chrome_units(page)

            # Get Chrome-specific data
            chrome_info = await page.evaluate("""
                ({
                    userAgent: navigator.userAgent,
                    chromeVersion: navigator.userAgent.match(/Chrome\\/(\\d+)/)?.[1],
                    hasChromeRuntime: !!(window.chrome && window.chrome.runtime),
                    activityEvents: window.chromeActivityEvents.length,
                    cookiesEnabled: navigator.cookieEnabled,
                    localStorage: !!window.localStorage,
                    sessionStorage: !!window.sessionStorage
                })
            """)

            result = {
                "url": url,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                "page_title": title,
                "method": "chrome_profile_authenticated",
                "chrome_info": chrome_info,
                "rental_data": {
                    "prices_found": prices,
                    "units_found": units,
                    "total_prices": len(prices),
                    "total_units": len(units)
                },
                "stealth_level": "chrome_authenticated"
            }

            print("[DATA] Chrome profile capture complete:")
            print(f"   [TITLE] {title}")
            print(f"   [PRICES] {len(prices)} found")
            print(f"   [UNITS] {len(units)} found")
            print(f"   [CHROME] Version {chrome_info.get('chromeVersion', 'Unknown')}")
            print(f"   [AUTH] Runtime available: {chrome_info.get('hasChromeRuntime', False)}")

            return result

        except Exception as e:
            print(f"[ERROR] Chrome capture error: {e}")
            return None

    async def _extract_chrome_prices(self, page):
        """Extract prices using Chrome profile context"""
        prices = []

        try:
            # Chrome profile might have better access to dynamic content
            price_selectors = [
                ".price", ".rent", ".pricing", ".cost", ".amount", ".monthly",
                "[class*='price']", "[class*='rent']", "[data-price]",
                ".rate", ".fee", "[class*='rate']", "[class*='amount']",
                "[data-testid*='price']", "[aria-label*='price']"
            ]

            for selector in price_selectors:
                try:
                    elements = page.locator(selector)
                    count = await elements.count()

                    for i in range(min(count, 15)):
                        text = await elements.nth(i).text_content()
                        if text and '$' in text.strip():
                            prices.append(text.strip())
                except:
                    continue

            # Also search in visible text
            body_text = await page.locator('body').text_content()
            if body_text:
                import re
                matches = re.findall(r'\$[\d,]+(?:\.\d{2})?(?:\s*/\s*month)?', body_text)
                prices.extend(matches)

            prices = list(set(prices))

        except Exception as e:
            print(f"[WARNING] Chrome price extraction error: {e}")

        return prices

    async def _extract_chrome_units(self, page):
        """Extract units using Chrome profile context"""
        units = []

        try:
            unit_selectors = [
                ".unit", ".apartment", ".floorplan", ".property", ".plan",
                "[class*='unit']", "[class*='apartment']", "[data-unit]",
                ".bedroom", ".bathroom", "[class*='bedroom']", ".unit-type",
                "[data-testid*='unit']", "[aria-label*='unit']"
            ]

            for selector in unit_selectors:
                try:
                    elements = page.locator(selector)
                    count = await elements.count()

                    for i in range(min(count, 15)):
                        text = await elements.nth(i).text_content()
                        if text and len(text.strip()) > 2:
                            units.append(text.strip()[:150])
                except:
                    continue

            units = list(set(units))

        except Exception as e:
            print(f"[WARNING] Chrome unit extraction error: {e}")

        return units


async def main():
    """Test Chrome profile activity monitor"""
    if len(sys.argv) < 2:
        print("Usage: python chrome_profile_trainer.py <url> [profile_name]")
        print("Example: python chrome_profile_trainer.py https://highlandsatsweetwatercreek.com/")
        print("Example: python chrome_profile_trainer.py https://highlandsatsweetwatercreek.com/ Profile 1")
        print()
        print("Note: Make sure Chrome is closed before running this")
        print("Note: Default profile name is 'Default'")
        sys.exit(1)

    url = sys.argv[1]
    profile_name = sys.argv[2] if len(sys.argv) > 2 else "Default"

    print("[CHROME] Chrome Profile Activity Monitor")
    print("[CHROME] Using authenticated Chrome profile for enhanced stealth")
    print("=" * 60)

    trainer = ChromeProfileTrainer()

    try:
        result = await trainer.train_with_chrome_profile(url, profile_name)

        if result:
            print("\n[SUCCESS] Chrome profile training completed!")

            # Save results
            timestamp = int(time.time())
            filename = f"chrome_profile_results_{timestamp}.json"

            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)

            print(f"[SAVE] Chrome profile results saved: {filename}")

            # Show summary
            rental_data = result.get('rental_data', {})
            chrome_info = result.get('chrome_info', {})

            print("\n[SUMMARY] Chrome Profile Extraction:")
            print(f"   Chrome Version: {chrome_info.get('chromeVersion', 'Unknown')}")
            print(f"   Runtime Available: {chrome_info.get('hasChromeRuntime', False)}")
            print(f"   Prices Found: {rental_data.get('total_prices', 0)}")
            print(f"   Units Found: {rental_data.get('total_units', 0)}")
            print(f"   Activity Events: {chrome_info.get('activityEvents', 0)}")

        else:
            print("\n[ERROR] Chrome profile training failed")
            print("[INFO] Try closing Chrome completely and running again")

    except KeyboardInterrupt:
        print("\n[STOP] Chrome profile training stopped")
    except Exception as e:
        print(f"\n[ERROR] Chrome profile system error: {e}")


if __name__ == "__main__":
    asyncio.run(main())