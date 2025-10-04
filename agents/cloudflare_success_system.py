"""
Cloudflare-Bypass Enhanced Success System for Rental Data Scraper
A stealth-enabled version that can handle Cloudflare protection.
"""

import asyncio
import keyboard
import time
import threading
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import random

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


class CloudflareBypass:
    """Handles Cloudflare protection bypass"""

    def __init__(self):
        self.stealth_configured = False

    async def create_stealth_page(self, playwright):
        """Create a stealth page that bypasses Cloudflare"""
        print("🔒 Setting up stealth browser for Cloudflare bypass...")

        browser = await playwright.chromium.launch(
            headless=False,  # Critical for Cloudflare - visible browsers are less suspicious
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

        # Stealth injections to appear human
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
        print(f"🛡️  Navigating to {url} with Cloudflare bypass...")

        try:
            # Add human-like delay before navigation
            await asyncio.sleep(random.uniform(1, 3))

            # Go to URL
            await page.goto(url, wait_until='domcontentloaded', timeout=60000)

            # Wait for potential challenge
            await asyncio.sleep(3000)

            content = await page.content()

            if any(phrase in content.lower() for phrase in ['cloudflare', 'challenge', 'verifying you are human', 'checking your browser']):
                print("🛡️  Cloudflare challenge detected, waiting for resolution...")

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

                # Add human-like behavior after challenge
                await self._add_human_behavior(page)

            print("✅ Navigation successful!")
            return True

        except Exception as e:
            print(f"❌ Navigation failed: {e}")
            return False

    async def _add_human_behavior(self, page):
        """Add human-like behavior to avoid detection"""
        try:
            # Random mouse movements
            await page.mouse.move(
                random.randint(100, 500),
                random.randint(100, 500)
            )

            # Random scrolling
            await page.evaluate(f"window.scrollBy(0, {random.randint(100, 300)})")

            # Small delay
            await asyncio.sleep(random.uniform(0.5, 1.5))

        except Exception as e:
            print(f"⚠️  Human behavior simulation failed: {e}")


class CloudflareSuccessSystem:
    """Enhanced success system with Cloudflare bypass"""

    def __init__(self):
        self.success_queue = asyncio.Queue()
        self.waiting_for_signal = False
        self.keyboard_listener = None
        self.current_page = None
        self.bypass = CloudflareBypass()

    async def train_on_website(self, url: str) -> Optional[SuccessSignal]:
        """Train by waiting for user to signal success with Cloudflare bypass"""
        print(f"🔍 Training on: {url} (with Cloudflare bypass)")
        print("Navigate to the rental data, then press F8 when you find it!")
        print("🎯 Press F8 to signal success, or Ctrl+C to cancel")

        async with async_playwright() as p:
            page, browser, context = await self.bypass.create_stealth_page(p)
            self.current_page = page

            try:
                # Navigate with bypass
                success = await self.bypass.navigate_with_bypass(page, url)

                if not success:
                    print("❌ Could not bypass Cloudflare protection")
                    return None

                print(f"🌐 Successfully loaded {url}")

                # Start listening for F8 key
                self._start_keyboard_listener()

                # Wait for success signal
                print("⏳ **Waiting for you to press F8 when you find rental data...**")
                self.waiting_for_signal = True

                try:
                    # Wait up to 5 minutes for signal
                    signal = await asyncio.wait_for(
                        self.success_queue.get(),
                        timeout=300  # 5 minutes
                    )

                    if signal == "success":
                        print("✅ Success signal received! Capturing current page...")

                        # Capture the successful state
                        success_data = await self._capture_success_state(page)
                        print("🎉 Training complete!")
                        return success_data

                except asyncio.TimeoutError:
                    print("⏰ Timeout waiting for success signal")
                    return None

            except KeyboardInterrupt:
                print("\n❌ Training cancelled by user")
                return None

            finally:
                self.waiting_for_signal = False
                await browser.close()

    def _start_keyboard_listener(self):
        """Start background thread to listen for F8 key"""
        def check_keys():
            while self.waiting_for_signal:
                try:
                    if keyboard.is_pressed('f8'):
                        # Put success signal in queue
                        self.success_queue.put_nowait("success")
                        print("🎯 F8 pressed! Sending success signal...")
                        break
                    time.sleep(0.1)  # Small delay to avoid busy waiting
                except:
                    break

        # Start in background thread
        self.keyboard_listener = threading.Thread(target=check_keys, daemon=True)
        self.keyboard_listener.start()

    async def _capture_success_state(self, page) -> SuccessSignal:
        """Capture the current page state when user signals success"""
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
                ".pricing", ".cost", "[data-price]", "[data-rent]"
            ]

            for selector in price_selectors:
                try:
                    elements = page.locator(selector)
                    count = await elements.count()

                    for i in range(min(count, 10)):  # Limit to first 10
                        text = await elements.nth(i).text_content()
                        if text and self._looks_like_price(text.strip()):
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

    async def _extract_units_from_page(self, page) -> List[str]:
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

    def _looks_like_price(self, text: str) -> bool:
        """Check if text looks like a price"""
        import re

        # Look for dollar signs with numbers
        if re.search(r'\$[\d,]+', text):
            return True

        # Look for "per month" or similar
        if re.search(r'[\d,]+\s*(?:per month|monthly|month)', text, re.IGNORECASE):
            return True

        return False

    async def learn_from_multiple_sites(self, urls: List[str]) -> List[SuccessSignal]:
        """Learn from multiple websites with Cloudflare bypass"""
        learned_patterns = []

        print(f"🎯 Learning from {len(urls)} websites (with Cloudflare bypass)")
        print("For each site: navigate to rental data, then press F8")
        print("Press Ctrl+C to skip a site or stop completely")
        print()

        for i, url in enumerate(urls, 1):
            print(f"🏢 [{i}/{len(urls)}] Learning from: {url}")
            print("-" * 50)

            try:
                success_data = await self.train_on_website(url)
                if success_data:
                    learned_patterns.append(success_data)
                    print(f"✅ Learned pattern from {url}")
                else:
                    print(f"⚠️  No pattern learned from {url}")

            except KeyboardInterrupt:
                print(f"\n⏭️  Skipping {url}")
                continue
            except Exception as e:
                print(f"❌ Error learning from {url}: {e}")
                continue

            # Brief pause between sites
            if i < len(urls):
                print("⏳ Preparing next site...")
                await asyncio.sleep(3)

        print(f"\n🎉 Learning complete! Learned patterns from {len(learned_patterns)} sites")
        return learned_patterns


# Enhanced standalone functions
async def train_on_single_site(url: str) -> Optional[SuccessSignal]:
    """Simple function to train on one site with Cloudflare bypass"""
    system = CloudflareSuccessSystem()
    return await system.train_on_website(url)


async def learn_from_sites(urls: List[str]) -> List[SuccessSignal]:
    """Learn from multiple sites with Cloudflare bypass"""
    system = CloudflareSuccessSystem()
    return await system.learn_from_multiple_sites(urls)


if __name__ == "__main__":
    # Example usage
    import sys

    if len(sys.argv) < 2:
        print("Usage: python cloudflare_success_system.py <url>")
        print("Example: python cloudflare_success_system.py https://www.thehuntley.com")
        sys.exit(1)

    url = sys.argv[1]

    try:
        print("🛡️  Starting Cloudflare-bypass training...")
        result = asyncio.run(train_on_single_site(url))

        if result:
            print("\n✅ Training successful!")
            print(f"📍 Final URL: {result.current_url}")
            print(f"💰 Prices found: {result.prices_found}")
            print(f"🏠 Units found: {result.units_found}")
        else:
            print("\n❌ Training failed or was cancelled")

    except KeyboardInterrupt:
        print("\n👋 Training stopped")
    except Exception as e:
        print(f"\n❌ Error: {e}")