# smart_scraper.py
"""
Smart Scraper with Template-Based Memory System.
Uses learned templates and intelligent pattern matching for efficient apartment website scraping.
"""

import asyncio
import time
import random
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime

from playwright.async_api import async_playwright, Page, Browser, BrowserContext
from template_manager import TemplateManager
from website_templates import update_template_success


class SmartScraper:
    """
    Intelligent scraper that uses templates and learning for efficient apartment data extraction.
    Automatically detects website types, applies known successful patterns, and learns from experience.
    """

    def __init__(self, template_manager: Optional[TemplateManager] = None):
        """
        Initialize the smart scraper.

        Args:
            template_manager: Optional TemplateManager instance, creates one if not provided
        """
        self.template_manager = template_manager or TemplateManager()
        self.successful_paths = {}
        self.current_template = None
        self.current_template_type = None

    async def scrape_property(self, url: str, context: Optional[BrowserContext] = None) -> Dict[str, Any]:
        """
        Scrape rental data from a property URL using intelligent template matching.

        Args:
            url: Property website URL
            context: Optional browser context, creates one if not provided

        Returns:
            Dictionary containing extracted rental data
        """
        start_time = time.time()

        # Create browser context if not provided
        if context is None:
            context = await self._create_browser_context()

        try:
            # Get initial page content for template detection
            initial_content = await self._get_initial_content(url, context)

            # Detect or get template
            template, template_type = self.template_manager.detect_template(url, initial_content)

            print(f"🎯 Using {template_type} template for {url}")
            self.current_template = template
            self.current_template_type = template_type

            if template:
                # Use known template
                result = await self._scrape_with_template(url, template, context)
            else:
                # Discover new path
                result = await self._discover_scraping_path(url, context)

            # Record success/failure
            success = len(result.get("units", [])) > 0
            self._record_attempt(url, success)

            result["scrape_metadata"] = {
                "template_used": template_type,
                "template_name": template.get("name") if template else None,
                "scrape_duration": time.time() - start_time,
                "success": success,
                "units_found": len(result.get("units", []))
            }

            return result

        finally:
            if context and not context.isinstance(context, type(None)):
                await context.close()

    async def _create_browser_context(self) -> BrowserContext:
        """Create a browser context with stealth features."""
        playwright = await async_playwright().start()
        browser = await playwright.chromium.launch(
            headless=False,  # Keep visible for debugging
            args=[
                '--no-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor'
            ]
        )

        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            locale='en-US',
            timezone_id='America/New_York'
        )

        # Add stealth scripts
        await context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
            Object.defineProperty(navigator, 'plugins', {get: () => [1, 2, 3, 4, 5]});
        """)

        return context

    async def _get_initial_content(self, url: str, context: BrowserContext) -> str:
        """Get initial page content for template detection."""
        try:
            page = await context.new_page()
            await page.goto(url, wait_until="domcontentloaded", timeout=15000)

            # Wait a bit for dynamic content
            await asyncio.sleep(2)

            # Get page content
            content = await page.content()

            await page.close()
            return content[:5000]  # First 5KB for pattern matching

        except Exception as e:
            print(f"⚠️  Could not get initial content: {e}")
            return ""

    async def _scrape_with_template(self, url: str, template: Dict[str, Any],
                                   context: BrowserContext) -> Dict[str, Any]:
        """
        Scrape using a known template.

        Args:
            url: Target URL
            template: Template configuration
            context: Browser context

        Returns:
            Extracted rental data
        """
        print(f"📋 Using template: {template.get('name', 'unknown')}")

        try:
            page = await context.new_page()

            # Apply template behavior settings
            behavior = template.get("behavior", {})
            timeout = behavior.get("timeout", 30000)

            await page.goto(url, wait_until="domcontentloaded", timeout=timeout)

            # Handle cookies using template's known selectors
            await self._handle_cookies_with_template(page, template)

            # Navigate to floorplans
            await self._navigate_with_template(page, template)

            # Extract data using template selectors
            data = await self._extract_data_with_template(page, template)

            # Remember this successful path
            self._record_successful_path(url, template, data)

            await page.close()
            return data

        except Exception as e:
            print(f"❌ Template failed, falling back to discovery: {e}")
            # Fallback to discovery mode
            return await self._discover_scraping_path(url, context)

    async def _handle_cookies_with_template(self, page: Page, template: Dict[str, Any]):
        """Handle cookie popups using template's known selectors."""
        cookie_selectors = template.get("navigation", {}).get("cookie_selectors", [])

        for selector in cookie_selectors:
            try:
                # Wait for cookie element to appear
                await page.wait_for_selector(selector, timeout=5000, state="visible")
                await page.click(selector)
                print(f"🍪 Closed cookie using: {selector}")

                # Add human-like delay
                await asyncio.sleep(random.uniform(0.5, 1.5))
                break

            except Exception:
                continue

        # Fallback: try common cookie patterns
        await self._handle_common_cookies(page)

    async def _handle_common_cookies(self, page: Page):
        """Handle common cookie popup patterns."""
        common_patterns = [
            "button:has-text('Accept')",
            "button:has-text('Agree')",
            "#accept-cookies",
            ".cookie-accept",
            "[aria-label*='accept']",
            "text=Accept All",
            "text=I Agree"
        ]

        for pattern in common_patterns:
            try:
                await page.wait_for_selector(pattern, timeout=2000, state="visible")
                await page.click(pattern)
                print(f"🍪 Closed cookie with common pattern: {pattern}")
                await asyncio.sleep(random.uniform(0.5, 1.0))
                break
            except Exception:
                continue

    async def _navigate_with_template(self, page: Page, template: Dict[str, Any]):
        """Navigate to floorplans using template selectors."""
        navigation = template.get("navigation", {})
        floorplan_selector = navigation.get("floorplan_selector")

        if not floorplan_selector:
            return

        behavior = template.get("behavior", {})
        scroll_before_click = behavior.get("scroll_before_click", False)

        try:
            # Wait for navigation element
            await page.wait_for_selector(floorplan_selector, timeout=10000, state="visible")

            if scroll_before_click:
                # Scroll element into view
                await page.locator(floorplan_selector).scroll_into_view_if_needed()

                # Add human-like delay
                await asyncio.sleep(random.uniform(1.0, 2.0))

            # Click to navigate
            await page.click(floorplan_selector)

            # Wait for navigation
            wait_for_idle = behavior.get("wait_for_network_idle", False)
            if wait_for_idle:
                await page.wait_for_load_state("networkidle", timeout=15000)
            else:
                await asyncio.sleep(2)

            print(f"🏠 Navigated to floorplans using: {floorplan_selector}")

        except Exception as e:
            print(f"⚠️  Floorplan navigation failed: {e}")

    async def _extract_data_with_template(self, page: Page, template: Dict[str, Any]) -> Dict[str, Any]:
        """Extract rental data using template selectors."""
        navigation = template.get("navigation", {})

        data = {
            "property_url": page.url,
            "units": [],
            "extraction_method": "template",
            "template_used": template.get("name", "unknown")
        }

        try:
            # Find unit containers
            unit_selector = navigation.get("unit_selector", ".unit, .apartment, .unit-card")
            unit_elements = await page.query_selector_all(unit_selector)

            if not unit_elements:
                print(f"⚠️  No units found with selector: {unit_selector}")
                return data

            print(f"🏢 Found {len(unit_elements)} potential units")

            # Extract data from each unit
            for i, unit_elem in enumerate(unit_elements[:10]):  # Limit to first 10 units
                unit_data = await self._extract_unit_data(unit_elem, navigation)
                if unit_data:
                    data["units"].append(unit_data)

            print(f"✅ Extracted {len(data['units'])} units using template")

        except Exception as e:
            print(f"❌ Data extraction failed: {e}")

        return data

    async def _extract_unit_data(self, unit_element, navigation: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Extract data from a single unit element."""
        try:
            unit_data = {}

            # Extract price
            price_selector = navigation.get("price_selector")
            if price_selector:
                try:
                    price_elem = await unit_element.query_selector(price_selector)
                    if price_elem:
                        unit_data["price"] = await price_elem.text_content()
                except Exception:
                    pass

            # Extract bed/bath info
            bedbath_selector = navigation.get("bedbath_selector")
            if bedbath_selector:
                try:
                    bedbath_elem = await unit_element.query_selector(bedbath_selector)
                    if bedbath_elem:
                        unit_data["bedbath"] = await bedbath_elem.text_content()
                except Exception:
                    pass

            # Extract lease term
            lease_term_selector = navigation.get("lease_term_selector")
            if lease_term_selector:
                try:
                    lease_elem = await unit_element.query_selector(lease_term_selector)
                    if lease_elem:
                        unit_data["lease_term"] = await lease_elem.text_content()
                except Exception:
                    pass

            # Only return if we got some data
            if unit_data:
                return unit_data

        except Exception as e:
            print(f"⚠️  Unit extraction error: {e}")

        return None

    async def _discover_scraping_path(self, url: str, context: BrowserContext) -> Dict[str, Any]:
        """
        Discover scraping path for new/unrecognized sites.

        Args:
            url: Target URL
            context: Browser context

        Returns:
            Extracted data and discovered selectors
        """
        print("🔍 Discovering new scraping path...")

        discovered_selectors = {}
        data = {
            "property_url": url,
            "units": [],
            "extraction_method": "discovery"
        }

        try:
            page = await context.new_page()
            await page.goto(url, wait_until="domcontentloaded", timeout=20000)

            # Discover and handle cookies
            discovered_selectors.update(await self._discover_cookie_handling(page))

            # Discover floorplan navigation
            discovered_selectors.update(await self._discover_floorplan_navigation(page))

            # Attempt data extraction with discovered selectors
            extraction_data = await self._extract_with_discovered_selectors(page, discovered_selectors)
            data["units"] = extraction_data.get("units", [])

            # Learn this new template
            if discovered_selectors:
                self.template_manager.learn_new_template(
                    url,
                    discovered_selectors,
                    success_rate=1.0 if data["units"] else 0.0
                )

            await page.close()

        except Exception as e:
            print(f"❌ Discovery failed: {e}")

        return data

    async def _discover_cookie_handling(self, page: Page) -> Dict[str, Any]:
        """Discover cookie handling patterns."""
        selectors = {}

        cookie_indicators = [
            "cookie", "consent", "accept", "agree", "privacy", "gdpr"
        ]

        for indicator in cookie_indicators:
            try:
                # Look for buttons with cookie-related text
                selector = f"button:has-text('{indicator}')"
                elements = await page.query_selector_all(selector)

                if elements:
                    selectors["cookie_selector"] = selector
                    # Try to click the first one
                    await elements[0].click()
                    await asyncio.sleep(1)
                    break

            except Exception:
                continue

        return selectors

    async def _discover_floorplan_navigation(self, page: Page) -> Dict[str, Any]:
        """Discover floorplan navigation patterns."""
        selectors = {}

        floorplan_indicators = ["floorplan", "floor plan", "units", "availability", "pricing"]

        for indicator in floorplan_indicators:
            try:
                selector = f"a:has-text('{indicator}')"
                elements = await page.query_selector_all(selector)

                if elements:
                    selectors["floorplan_selector"] = selector
                    # Try to click the first one
                    await elements[0].click()
                    await page.wait_for_load_state("domcontentloaded", timeout=10000)
                    break

            except Exception:
                continue

        return selectors

    async def _extract_with_discovered_selectors(self, page: Page,
                                                selectors: Dict[str, Any]) -> Dict[str, Any]:
        """Extract data using discovered selectors."""
        data = {"units": []}

        try:
            # Look for unit containers
            unit_selectors = [".unit", ".apartment", ".unit-card", ".listing", "[data-unit]"]

            for selector in unit_selectors:
                try:
                    unit_elements = await page.query_selector_all(selector)
                    if unit_elements:
                        print(f"🔍 Found {len(unit_elements)} units with selector: {selector}")

                        # Extract from first few units
                        for unit_elem in unit_elements[:5]:
                            unit_data = await self._extract_unit_data_generic(unit_elem)
                            if unit_data:
                                data["units"].append(unit_data)

                        break

                except Exception:
                    continue

        except Exception as e:
            print(f"⚠️  Generic extraction failed: {e}")

        return data

    async def _extract_unit_data_generic(self, unit_element) -> Optional[Dict[str, Any]]:
        """Extract unit data using generic patterns."""
        try:
            unit_data = {}

            # Try common price patterns
            price_patterns = [".price", ".rent", ".cost", "[class*='price']"]
            for pattern in price_patterns:
                try:
                    price_elem = await unit_element.query_selector(pattern)
                    if price_elem:
                        unit_data["price"] = await price_elem.text_content()
                        break
                except Exception:
                    continue

            # Try common bed/bath patterns
            bedbath_patterns = [".bed-bath", ".specs", ".details", "[class*='bed']"]
            for pattern in bedbath_patterns:
                try:
                    bedbath_elem = await unit_element.query_selector(pattern)
                    if bedbath_elem:
                        unit_data["bedbath"] = await bedbath_elem.text_content()
                        break
                except Exception:
                    continue

            return unit_data if unit_data else None

        except Exception:
            return None

    def _record_successful_path(self, url: str, template: Dict[str, Any], data: Dict[str, Any]):
        """Record a successful scraping path."""
        domain = self.template_manager._extract_domain(url)

        self.successful_paths[domain] = {
            "template": template,
            "last_success": datetime.now().isoformat(),
            "units_found": len(data.get("units", []))
        }

    def _record_attempt(self, url: str, success: bool):
        """Record scraping attempt result."""
        domain = self.template_manager._extract_domain(url)
        self.template_manager.update_template_success(domain, success)

        if self.current_template_type and self.current_template_type != "unknown":
            update_template_success(self.current_template_type, success)

    def get_scraping_stats(self) -> Dict[str, Any]:
        """Get statistics about scraping performance."""
        return {
            "learned_templates": len(self.template_manager.learned_templates),
            "successful_paths": len(self.successful_paths),
            "template_stats": self.template_manager.get_template_stats()
        }