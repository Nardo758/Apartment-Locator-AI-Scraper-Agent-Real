#!/usr/bin/env python3
"""
Activity-Based Auto-Capture Training System
Waits for user to stop navigating, then captures data automatically
"""

import asyncio
import sys
import json
import time
from datetime import datetime
from typing import List, Optional
from dataclasses import dataclass

from playwright.async_api import async_playwright


@dataclass
class SuccessSignal:
    """Data captured when user signals success"""
    url: str
    timestamp: str
    page_content: str
    current_url: str
    prices_found: List[str]
    units_found: List[str]
    page_title: str


class ActivityMonitorTrainer:
    """Trainer that monitors user activity and captures when they stop"""

    def __init__(self):
        self.bypass = CloudflareBypass()
        self.last_activity = time.time()
        self.monitoring = False

    async def train_on_website(self, url: str) -> Optional[SuccessSignal]:
        """Train by monitoring user activity and capturing when they stop"""
        print(f"🔍 Training on: {url}")
        print("🖱️  Activity-Based Auto-Capture Mode")
        print()
        print("Instructions:")
        print("  1. Browser opens and navigates to the site")
        print("  2. Navigate to find rental prices/units (click, scroll, etc.)")
        print("  3. When you stop interacting, system detects inactivity")
        print("  4. After 30 seconds of no activity, data is automatically captured")
        print("  5. Close browser to cancel")
        print("=" * 70)

        async with async_playwright() as p:
            page, browser, context = await self.bypass.create_stealth_page(p)

            try:
                # Set up activity monitoring
                await self._setup_activity_monitoring(page)

                # Navigate with bypass
                success = await self.bypass.navigate_with_bypass(page, url)

                if not success:
                    print("❌ Could not bypass Cloudflare protection")
                    return None

                print(f"✅ Successfully loaded {url}")
                print("⏳ **Navigate to rental data now...**")
                print("   (Click, scroll, navigate as needed)")
                print()

                # Start monitoring activity
                self.monitoring = True
                self.last_activity = time.time()

                # Wait for user to become inactive, then capture
                result = await self._wait_for_inactivity_and_capture(page)

                if result:
                    print("🎉 Training complete!")
                    return result

            except Exception as e:
                print(f"❌ Training error: {e}")
                return None

            finally:
                self.monitoring = False
                await browser.close()

    async def _setup_activity_monitoring(self, page):
        """Set up JavaScript to monitor user activity"""
        await page.add_script_tag(content="""
            window.lastActivityTime = Date.now();

            // Monitor mouse events
            document.addEventListener('mousedown', () => {
                window.lastActivityTime = Date.now();
            });
            document.addEventListener('mousemove', () => {
                window.lastActivityTime = Date.now();
            });
            document.addEventListener('click', () => {
                window.lastActivityTime = Date.now();
            });
            document.addEventListener('scroll', () => {
                window.lastActivityTime = Date.now();
            });

            // Monitor keyboard events
            document.addEventListener('keydown', () => {
                window.lastActivityTime = Date.now();
            });
            document.addEventListener('keyup', () => {
                window.lastActivityTime = Date.now();
            });

            // Monitor touch events (for mobile)
            document.addEventListener('touchstart', () => {
                window.lastActivityTime = Date.now();
            });
            document.addEventListener('touchmove', () => {
                window.lastActivityTime = Date.now();
            });
        """)

    async def _wait_for_inactivity_and_capture(self, page):
        """Wait for user inactivity, then capture data"""
        print("👀 Monitoring your activity...")
        print("🤖 Will capture data 30 seconds after you stop interacting")

        inactive_start = None
        countdown_started = False

        while True:
            try:
                # Check last activity time from browser
                last_activity_browser = await page.evaluate("window.lastActivityTime")
                last_activity_seconds = last_activity_browser / 1000  # Convert to seconds

                current_time = time.time()
                time_since_activity = current_time - last_activity_seconds

                if time_since_activity < 5:  # Still active (less than 5 seconds inactive)
                    inactive_start = None
                    countdown_started = False
                    if not countdown_started:
                        print("🔄 Detecting activity... (will start countdown when you stop)", end='\r')

                else:  # User has been inactive
                    if inactive_start is None:
                        inactive_start = current_time
                        countdown_started = True
                        print("⏸️  Activity stopped! Starting 30-second capture countdown...")

                    elapsed_inactive = current_time - inactive_start
                    remaining = 30 - elapsed_inactive

                    if remaining > 0:
                        print(f"⏱️  Capturing in {remaining:.1f} seconds... (keep browser open)", end='\r')
                        await asyncio.sleep(0.5)
                    else:
                        print("\n🤖 Auto-capturing data now!")
                        return await self._capture_success_state(page)

            except Exception as e:
                print(f"⚠️  Monitoring error: {e}")
                await asyncio.sleep(1)

    async def _capture_success_state(self, page) -> SuccessSignal:
        """Capture the current page state"""
        try:
            # Get basic page info
            url = page.url
            title = await page.title()
            content = await page.content()

            # Look for rental data patterns
            prices = await self._extract_prices_from_page(page)
            units = await self._extract_units_from_page(page)

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

    async def _extract_prices_from_page(self, page) -> List[str]:
        """Extract price information from the current page"""
        prices = []

        try:
            # Common price selectors
            price_selectors = [
                ".price", ".rent", "[class*='price']", "[class*='rent']",
                ".pricing", ".cost", "[data-price]", "[data-rent]",
                ".amount", ".monthly", "[class*='amount']",
                ".rate", ".fee", "[class*='rate']"
            ]

            for selector in price_selectors:
                try:
                    elements = page.locator(selector)
                    count = await elements.count()

                    for i in range(min(count, 20)):  # Limit to first 20
                        text = await elements.nth(i).text_content()
                        if text and self._looks_like_price(text.strip()):
                            prices.append(text.strip())
                except:
                    continue

            # Also look for price patterns in text
            body_text = await page.locator("body").text_content()
            if body_text:
                import re
                price_matches = re.findall(r'\$[\d,]+(?:\.\d{2})?(?:\s*(?:/|per)\s*month)?', body_text)
                prices.extend(price_matches[:20])  # Limit results

            # Remove duplicates
            prices = list(set(prices))

        except Exception as e:
            print(f"⚠️  Error extracting prices: {e}")

        return prices

    async def _extract_units_from_page(self, page) -> List[str]:
        """Extract unit information from the current page"""
        units = []

        try:
            # Common unit selectors
            unit_selectors = [
                ".unit", ".apartment", "[class*='unit']", "[class*='apartment']",
                ".floorplan", ".property", "[data-unit]", "[data-property]",
                ".plan", ".type", "[class*='plan']",
                ".bedroom", ".bathroom", "[class*='bedroom']"
            ]

            for selector in unit_selectors:
                try:
                    elements = page.locator(selector)
                    count = await elements.count()

                    for i in range(min(count, 20)):  # Limit to first 20
                        text = await elements.nth(i).text_content()
                        if text and len(text.strip()) > 3:  # Meaningful content
                            units.append(text.strip()[:150])  # Limit length
                except:
                    continue

            # Remove duplicates and empty strings
            units = list(set(filter(None, units)))

        except Exception as e:
            print(f"⚠️  Error extracting units: {e}")

        return units

    def _looks_like_price(self, text: str) -> bool:
        """Check if text looks like a price"""
        import re

        # Look for dollar signs with numbers
        if re.search(r'\$[\d,]+', text):
            return True

        # Look for "per month" or similar
        if re.search(r'[\d,]+\s*(?:per month|monthly|month|/mo)', text, re.IGNORECASE):
            return True

        return False


class CloudflareBypass:
    """Handles Cloudflare protection bypass"""

    def __init__(self):
        self.stealth_configured = False

    async def create_stealth_page(self, playwright):
        """Create a stealth page that bypasses Cloudflare"""
        print("🔒 Setting up stealth browser...")

        browser = await playwright.chromium.launch(
            headless=False,  # Critical for Cloudflare
            args=[
                '--disable-blink-features=AutomationControlled',
                '--no-first-run',
                '--disable-default-apps',
                '--disable-features=TranslateUI',
                '--disable-ipc-flooding-protection',
                '--no-default-browser-check',
                '--disable-dev-shm-usage',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-background-timer-throttling',
                '--disable-popup-blocking',
                '--disable-translate',
            ]
        )

        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            java_script_enabled=True,
            extra_http_headers={
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            }
        )

        # Stealth injections
        await context.add_init_script("""
            // Remove webdriver property
            delete Object.getPrototypeOf(navigator).webdriver;

            // Spoof plugins
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
            });

            // Spoof languages
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en'],
            });

            // Mock permissions
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
            );

            // Randomize screen properties
            Object.defineProperty(screen, 'availHeight', { get: () => 1040 });
            Object.defineProperty(screen, 'availWidth', { get: () => 1920 });
            Object.defineProperty(screen, 'height', { get: () => 1080 });
            Object.defineProperty(screen, 'width', { get: () => 1920 });
        """)

        page = await context.new_page()
        return page, browser, context

    async def navigate_with_bypass(self, page, url):
        """Navigate with Cloudflare bypass"""
        print(f"🛡️  Navigating to {url}...")

        try:
            # Add human-like delay
            await asyncio.sleep(1)

            # Go to URL
            await page.goto(url, wait_until='domcontentloaded', timeout=60000)

            # Wait for potential challenge
            await asyncio.sleep(3000)

            content = await page.content()

            if any(phrase in content.lower() for phrase in ['cloudflare', 'challenge', 'verifying you are human', 'checking your browser']):
                print("🛡️  Cloudflare challenge detected, waiting...")

                # Wait for challenge to resolve
                try:
                    await page.wait_for_function("""
                        () => {
                            const text = document.body.innerText.toLowerCase();
                            return !text.includes('checking your browser') &&
                                   !text.includes('verifying you are human') &&
                                   !text.includes('cloudflare') &&
                                   !text.includes('challenge');
                        }
                    """, timeout=30000)

                    print("✅ Cloudflare challenge resolved!")

                except Exception as e:
                    print(f"⚠️  Challenge resolution timeout: {e}")
                    return False

            print("✅ Navigation successful!")
            return True

        except Exception as e:
            print(f"❌ Navigation failed: {e}")
            return False


async def main():
    """Main training function"""
    if len(sys.argv) < 2:
        print("Usage: python activity_monitor_training.py <url>")
        print("Example: python activity_monitor_training.py https://boulevardatgrantpark.com/")
        print()
        print("Instructions:")
        print("  1. Browser opens and navigates to the site")
        print("  2. Navigate to find rental prices/units (click, scroll, type)")
        print("  3. When you stop interacting, system detects inactivity")
        print("  4. After 30 seconds of no activity, data is captured automatically")
        print("  5. Close browser to cancel")
        sys.exit(1)

    url = sys.argv[1]

    print("👀 Activity Monitor AI Training System")
    print("Navigate, then stop - system captures automatically!")
    print("=" * 55)

    trainer = ActivityMonitorTrainer()

    try:
        result = await trainer.train_on_website(url)

        if result:
            print("\n✅ Training successful!")
            print(f"📍 Final URL: {result.current_url}")
            print(f"💰 Prices found: {result.prices_found}")
            print(f"🏠 Units found: {result.units_found}")

            # Save the learned pattern
            domain = url.replace("https://", "").replace("http://", "").replace("www.", "").split("/")[0]
            filename = f"learned_{domain}_activity.json"

            pattern_data = {
                "session_info": {
                    "url": result.url,
                    "timestamp": result.timestamp,
                    "method": "activity_monitor_training"
                },
                "extracted_data": {
                    "page_title": result.page_title,
                    "current_url": result.current_url,
                    "prices_found": result.prices_found,
                    "units_found": result.units_found
                },
                "learned_patterns": {
                    "price_pattern": r'\$[\d,]+(?:\.\d{2})?(?:\s*(?:/|per)\s*month)?',
                    "unit_pattern": r'(\d+)\s*bedroom|\bstudio\b|\b(\d+)\s*br\b',
                    "sqft_pattern": r'(\d+(?:,?\d+)?)\s*sq\s*ft|\b(\d+(?:,?\d+)?)\s*sqft\b'
                }
            }

            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(pattern_data, f, indent=2, ensure_ascii=False)

            print(f"💾 Saved pattern: {filename}")

        else:
            print("\n❌ Training failed or was cancelled")

    except KeyboardInterrupt:
        print("\n👋 Training stopped")
    except Exception as e:
        print(f"\n❌ Error: {e}")


if __name__ == "__main__":
    asyncio.run(main())