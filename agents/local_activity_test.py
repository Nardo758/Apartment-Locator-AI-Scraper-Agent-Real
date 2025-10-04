#!/usr/bin/env python3
"""
Local Activity Monitor Test
Tests activity monitoring on a local HTML file (no internet required)
"""

import asyncio
import sys
import json
import time
import os
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


class LocalActivityMonitorTrainer:
    """Trainer that monitors user activity on a local HTML file"""

    def __init__(self):
        self.monitoring = False

    async def train_on_local_file(self, html_file_path: str) -> Optional[SuccessSignal]:
        """Train by monitoring user activity on a local HTML file"""
        if not os.path.exists(html_file_path):
            print(f"[ERROR] HTML file not found: {html_file_path}")
            return None

        print(f"[INFO] Training on local file: {html_file_path}")
        print("[INFO] Activity-Based Auto-Capture Mode")
        print()
        print("Instructions:")
        print("  1. Browser opens with local rental website")
        print("  2. Navigate to find rental prices/units (click, scroll, etc.)")
        print("  3. When you stop interacting, system detects inactivity")
        print("  4. After 15 seconds of no activity, data is automatically captured")
        print("  5. Close browser to cancel")
        print("=" * 70)

        async with async_playwright() as p:
            # Use regular browser (no stealth needed for local file)
            browser = await p.chromium.launch(headless=False)
            context = await browser.new_context(viewport={'width': 1200, 'height': 800})
            page = await context.new_page()

            try:
                # Load local HTML file
                file_url = f"file://{os.path.abspath(html_file_path)}"
                await page.goto(file_url, wait_until='domcontentloaded')

                print(f"[SUCCESS] Loaded local file: {html_file_path}")
                print("[INFO] **Navigate to rental data now...**")
                print("   (Click, scroll, navigate as needed)")
                print()

                # Set up activity monitoring
                await self._setup_activity_monitoring(page)

                # Start monitoring activity
                self.monitoring = True
                result = await self._wait_for_inactivity_and_capture(page)

                if result:
                    print("[SUCCESS] Training complete!")
                    return result

            except Exception as e:
                print(f"[ERROR] Training error: {e}")
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
        print("[MONITOR] Monitoring your activity...")
        print("[MONITOR] Will capture data 15 seconds after you stop interacting")

        inactive_start = None
        countdown_started = False

        while True:
            try:
                # Check last activity time from browser
                last_activity_browser = await page.evaluate("window.lastActivityTime")
                last_activity_seconds = last_activity_browser / 1000  # Convert to seconds

                current_time = time.time()
                time_since_activity = current_time - last_activity_seconds

                if time_since_activity < 3:  # Still active (less than 3 seconds inactive)
                    inactive_start = None
                    countdown_started = False
                    if not countdown_started:
                        print("[MONITOR] Detecting activity... (will start countdown when you stop)", end='\r')

                else:  # User has been inactive
                    if inactive_start is None:
                        inactive_start = current_time
                        countdown_started = True
                        print("[MONITOR] Activity stopped! Starting 15-second capture countdown...")

                    elapsed_inactive = current_time - inactive_start
                    remaining = 15 - elapsed_inactive

                    if remaining > 0:
                        print(f"[COUNTDOWN] Capturing in {remaining:.1f} seconds... (keep browser open)", end='\r')
                        await asyncio.sleep(0.5)
                    else:
                        print("\n[CAPTURE] Auto-capturing data now!")
                        return await self._capture_success_state(page)

            except Exception as e:
                print(f"[ERROR] Monitoring error: {e}")
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

            print("[DATA] Captured data:")
            print(f"   [URL] {url}")
            print(f"   [TITLE] {title}")
            print(f"   [PRICES] {len(prices)} found")
            print(f"   [UNITS] {len(units)} found")

            return success_signal

        except Exception as e:
            print(f"[ERROR] Error capturing page state: {e}")
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
            print(f"[WARNING] Error extracting prices: {e}")

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
            print(f"[WARNING] Error extracting units: {e}")

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


async def main():
    """Main training function"""
    html_file = "test_rental_website.html"

    print("[START] Local Activity Monitor AI Training System")
    print("[START] Testing activity detection and auto-capture!")
    print("=" * 55)

    trainer = LocalActivityMonitorTrainer()

    try:
        result = await trainer.train_on_local_file(html_file)

        if result:
            print("\n[SUCCESS] Training successful!")
            print(f"[RESULT] Final URL: {result.current_url}")
            print(f"[RESULT] Prices found: {result.prices_found}")
            print(f"[RESULT] Units found: {result.units_found}")

            # Save the learned pattern
            filename = f"learned_local_test.json"

            pattern_data = {
                "session_info": {
                    "url": result.url,
                    "timestamp": result.timestamp,
                    "method": "local_activity_monitor_training"
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

            print(f"[SAVE] Saved pattern: {filename}")

        else:
            print("\n[ERROR] Training failed or was cancelled")

    except KeyboardInterrupt:
        print("\n[STOP] Training stopped")
    except Exception as e:
        print(f"\n[ERROR] Error: {e}")


if __name__ == "__main__":
    asyncio.run(main())