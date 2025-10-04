#!/usr/bin/env python3
"""
Huntley Relational Element Scraper - Approach 2
Targets elements by their immutable relational properties and static attributes
"""

import asyncio
import json
import time
import os
import re
from typing import Dict, List, Optional, Tuple
from hybrid_video_simple_scraper import HybridVideoSimpleScraper

# Optional JS interactor fallback
try:
    from playwright_js_interactor import interact_detailed
except Exception:
    interact_detailed = None


class HuntleyRelationalScraper:
    """Scraper using relational element targeting (Approach 2)"""

    def __init__(self):
        self.scraper = HybridVideoSimpleScraper()

        # Define relational selectors based on immutable properties
        self.relational_selectors = {
            # Static parent-child hierarchies
            "pricing_containers": [
                'div[class*="floor"] > div[class*="price"]',  # Floor plan containers with price children
                'div[class*="plan"] > div[class*="rent"]',     # Plan containers with rent children
                'section[class*="pricing"] > div[class*="amount"]',  # Pricing sections with amount children
                'div[data-floor] > span[class*="price"]',      # Data attributes with price spans
                'article[class*="unit"] > div[class*="cost"]',  # Unit articles with cost divs
                'div[class*="availability"]',  # Added for availability buttons
                'div[class*="action"] > button[class*="apply"]'  # Added for Apply Now buttons
            ],

            # Sibling relationships with static anchors
            "sibling_anchors": [
                # Anchor to static elements and find siblings
                'i[class*="icon-dollar"] + span',              # Dollar icon followed by price span
                'img[alt*="floor"] ~ div[class*="price"]',     # Floor images followed by prices
                'svg[class*="bed"] + span[class*="price"]',    # Bed icons followed by prices
                'span[class*="sqft"] ~ span[class*="rent"]',   # Square footage followed by rent
                'div[class*="badge"] + div[class*="pricing"]', # Badges followed by pricing
                'div[class*="availability"] ~ div[class*="price"]'  # Added for sibling availability
            ],

            # Attribute-based targeting (static attributes only)
            "static_attributes": [
                'div[data-price][data-price!=""]',             # Elements with non-empty price data
                'span[data-rent][data-rent!=""]',              # Elements with non-empty rent data
                'div[data-monthly][data-monthly!=""]',         # Elements with monthly data
                'a[data-floor-id]',                            # Floor plan links with IDs
                'button[data-unit-type]',                       # Unit type buttons
                'div[data-availability="available"]',           # Available units
                'button[data-action="apply"]'  # Added for Apply Now buttons
            ],

            # Hierarchical navigation paths
            "hierarchy_paths": [
                'main > section > div > div[class*="floor"]',   # Main > section > container > floors
                'div[class*="container"] > div[class*="row"] > div[class*="pricing"]',  # Container hierarchy
                'article > header + div > div[class*="price"]', # Article > header > content > price
                'section[data-section="floor-plans"] div[class*="price"]',  # Sectioned content
                'section[class*="availability"] div[class*="price"]'  # Added for availability sections
            ],

            # Static element relationships
            "static_relationships": [
                # Elements that don't change with content
                'div[class*="floor-plan"] > h3 + p + div',      # Title + description + price container
                'div[class*="unit-card"] > div[class*="image"] + div[class*="details"] > div[class*="price"]',
                'li[class*="floor-item"] > a > span[class*="name"] + span[class*="price"]',
                'tr[class*="floor-row"] > td:nth-child(1) + td:nth-child(2) + td:nth-child(3)',  # Table cells
                'div[class*="action"] > button[class*="apply"]'  # Added for Apply Now buttons
            ]
        }

    async def huntley_relational_scrape(self, target_url: str = "https://www.thehuntley.com/", profile_name: str = "Default"):
        """Scrape using relational element targeting"""
        print("🔗 HUNTLEY RELATIONAL ELEMENT SCRAPER - APPROACH 2")
        print("=" * 55)
        print("Targeting elements by immutable relational properties")
        print("=" * 55)

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

                # Initial relational analysis
                initial_analysis = await self._analyze_relational_structure(page)
                print(f"📊 Initial analysis: {initial_analysis.get('total_selectors_found', 0)} relational selectors identified")

                # Navigate using relational patterns
                await self._relational_navigation(page)

                # Extract using relational targeting
                pricing_data = await self._extract_relational_pricing(page)

                # Try additional relational interactions
                if len(pricing_data.get('prices', [])) < 5:
                    print("🔄 Low yield, trying additional relational interactions...")
                    await self._try_relational_interactions(page)
                    await asyncio.sleep(3)
                    additional_data = await self._extract_relational_pricing(page)

                    # Merge results
                    pricing_data['prices'].extend(additional_data.get('prices', []))
                    pricing_data['units'].extend(additional_data.get('units', []))
                    pricing_data['prices'] = list(set(pricing_data['prices']))
                    pricing_data['units'] = list(set(pricing_data['units']))

                # If relational extraction found very little, try JS interactor fallback to handle modals/navigation
                interactor_fallback = None
                if (not pricing_data.get('prices')) and interact_detailed is not None:
                    try:
                        print('🔁 No relational prices found — running JS interactor fallback')
                        interactor_fallback = await interact_detailed(page.url, 'div[id^="fp-container-"]', ['a.track-apply','a.floorplan-action-button','a[data-selenium-id^="floorplan-"]','a.btn-primary'], 'click')
                        # lightweight parsing of modalHtml to find availability/contact links
                        if interactor_fallback and interactor_fallback.get('modalHtml'):
                            try:
                                from modal_parser import parse_floorplan_modal
                                modal = interactor_fallback.get('modalHtml')
                                parsed = parse_floorplan_modal(modal)
                                interactor_fallback['modal_parsed'] = parsed
                                # prefer availability_href if it's a real link
                                pref = parsed.get('availability_href')
                                if pref and not pref.startswith('javascript'):
                                    interactor_fallback['preferred_apply_href'] = pref
                                else:
                                    # fallback: try to find first non-js link in modal
                                    links = [l for l in (parsed.get('modal_links') or []) if not l.startswith('javascript')]
                                    if links:
                                        interactor_fallback['preferred_apply_href'] = links[0]
                            except Exception as e:
                                interactor_fallback['modal_parsed_error'] = str(e)
                    except Exception as e:
                        print('⚠️ Interactor fallback failed:', e)
                        interactor_fallback = { 'ok': False, 'error': str(e) }

                result = {
                    "scraping_timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                    "target_url": target_url,
                    "final_url": page.url,
                    "final_title": await page.title(),
                    "method": "huntley_relational_scraping_approach2",
                    "relational_analysis": initial_analysis,
                    "relational_pricing_data": pricing_data,
                    "interactor_fallback": interactor_fallback,
                    # convenience top-level fields derived from interactor fallback/modal parsing
                    # (merged when relational extraction yields nothing and interactor returned modal data)
                    
                    "navigation_performed": True,
                    "relational_interactions_attempted": True,
                    "total_prices_found": len(pricing_data.get('prices', [])),
                    "total_units_found": len(pricing_data.get('units', []))
                }

                # If the JS interactor produced parsed modal data, normalize and merge
                if interactor_fallback:
                    # preferred apply href (if detected)
                    try:
                        pref = interactor_fallback.get('preferred_apply_href')
                        if pref:
                            result['preferred_apply_href'] = pref

                        mp = interactor_fallback.get('modal_parsed')
                        if mp and isinstance(mp, dict):
                            # place parsed modal under top-level `modal_parsed` and copy key fields
                            result.setdefault('modal_parsed', {})
                            for key in ('name', 'sqft', 'beds', 'baths', 'price_text', 'availability_href', 'contact_href'):
                                if mp.get(key):
                                    result['modal_parsed'][key] = mp.get(key)

                            # also copy any normalized links captured by the modal parser
                            if mp.get('modal_links'):
                                result['modal_parsed']['modal_links'] = mp.get('modal_links')
                    except Exception:
                        # never let merging break the main flow
                        pass

                # Save results
                timestamp = int(time.time())
                filename = f"huntley_relational_scraping_{timestamp}.json"
                with open(filename, 'w', encoding='utf-8') as f:
                    json.dump(result, f, indent=2, ensure_ascii=False)

                print(f"💾 Results saved: {filename}")

                return result

            finally:
                await context.close()

    async def _analyze_relational_structure(self, page) -> Dict:
        """Analyze the relational structure of the page"""
        print("🔍 Analyzing relational element structure...")

        structure_analysis = {}

        # Check each category of relational selectors
        for category, selectors in self.relational_selectors.items():
            category_results = {}

            for selector in selectors:
                try:
                    elements = page.locator(selector)
                    count = await elements.count()
                    category_results[selector] = count

                    if count > 0:
                        print(f"   ✅ Found {count} elements: {selector}")

                except Exception as e:
                    category_results[selector] = 0
                    continue

            structure_analysis[category] = category_results

        # Count total selectors that found elements
        total_found = sum(
            count for category_results in structure_analysis.values()
            for count in category_results.values() if count > 0
        )

        structure_analysis['total_selectors_found'] = total_found
        structure_analysis['categories_analyzed'] = len(self.relational_selectors)

        return structure_analysis

    async def _relational_navigation(self, page):
        """Navigate using relational patterns"""
        print("🧭 Navigating using relational patterns...")

        # Try navigation elements identified by relational properties
        navigation_patterns = [
            # Static attribute-based navigation
            'a[data-floor-plans]', 'button[data-floor-plans]',
            'a[class*="floor"][class*="plan"]', 'button[class*="floor"][class*="plan"]',
            '[data-toggle="floor-plans"]', '[data-target*="floor"]',
            # Hierarchical navigation
            'nav a[href*="floor"]', 'header a[href*="plan"]',
            'main > div > a[href*="pricing"]',
            # Sibling-based navigation
            'span[class*="menu"] + a[href*="floor"]',
            'i[class*="list"] + button[class*="floor"]'
        ]

        for selector in navigation_patterns:
            try:
                elements = page.locator(selector)
                count = await elements.count()

                if count > 0:
                    print(f"   Found {count} relational navigation elements: {selector}")

                    # Click first element
                    first_element = elements.first
                    element_text = await first_element.text_content()
                    print(f"   Clicking relational element: {selector}")

                    await first_element.click()
                    await asyncio.sleep(3)

                    # Check if navigation occurred
                    new_url = page.url
                    if new_url != page.url:
                        print(f"   ✅ Navigated to: {new_url}")
                        break

            except Exception as e:
                continue

    async def _extract_relational_pricing(self, page) -> Dict:
        """Extract pricing data using relational targeting"""
        print("💰 Extracting pricing using relational targeting...")

        all_prices = []
        all_units = []
        extraction_log = []

        # Extract from each relational category
        for category, selectors in self.relational_selectors.items():
            category_prices = []
            category_units = []

            print(f"   🔗 Processing {category} selectors...")

            for selector in selectors:
                try:
                    elements = page.locator(selector)
                    count = await elements.count()

                    if count == 0:
                        continue

                    print(f"     📍 Processing {count} elements with: {selector}")

                    for i in range(min(count, 20)):  # Limit per selector
                        element = elements.nth(i)

                        # Get text content
                        text = await element.text_content()
                        if not text:
                            continue

                        clean_text = text.strip()

                        # Extract prices using relational context
                        prices_found = self._extract_prices_from_relational_element(clean_text, selector)
                        if prices_found:
                            category_prices.extend(prices_found)
                            for price in prices_found:
                                print(f"       💵 Relational price: {price} (from {selector})")
                                extraction_log.append({
                                    "selector": selector,
                                    "element_index": i,
                                    "price": price,
                                    "category": category
                                })

                        # Extract units using relational context
                        units_found = self._extract_units_from_relational_element(clean_text, selector)
                        if units_found:
                            category_units.extend(units_found)
                            for unit in units_found:
                                print(f"       🏠 Relational unit: {unit} (from {selector})")
                                extraction_log.append({
                                    "selector": selector,
                                    "element_index": i,
                                    "unit": unit,
                                    "category": category
                                })

                        # Also check for data attributes
                        data_attributes = await self._get_data_attributes(element)
                        if data_attributes:
                            attr_prices = self._extract_prices_from_attributes(data_attributes)
                            if attr_prices:
                                category_prices.extend(attr_prices)
                                for price in attr_prices:
                                    print(f"       💵 Attribute price: {price} (from {selector})")

                            attr_units = self._extract_units_from_attributes(data_attributes)
                            if attr_units:
                                category_units.extend(attr_units)
                                for unit in attr_units:
                                    print(f"       🏠 Attribute unit: {unit} (from {selector})")

                except Exception as e:
                    continue

            # Add category results to totals
            all_prices.extend(category_prices)
            all_units.extend(category_units)

        # Remove duplicates
        all_prices = list(set(all_prices))
        all_units = list(set(all_units))

        return {
            "prices": all_prices,
            "units": all_units,
            "total_prices": len(all_prices),
            "total_units": len(all_units),
            "extraction_log": extraction_log,
            "categories_processed": len(self.relational_selectors),
            "extraction_methods": ["relational_selectors", "data_attributes"]
        }

    def _extract_prices_from_relational_element(self, text: str, selector: str) -> List[str]:
        """Extract prices from text found via relational selectors"""
        prices = []

        # Price patterns (context-aware based on selector)
        if 'price' in selector.lower() or 'rent' in selector.lower() or 'cost' in selector.lower():
            # More aggressive extraction for price-related selectors
            price_patterns = [
                r'\$[\d,]+(?:\.\d{2})?(?:\s*/\s*month|\s*monthly|\s*mo\.?|\s*per\s*month)?',
                r'\$[\d,]{3,}(?:\s*per\s*month)?',
                r'Starting\s+(?:at\s+)?\$[\d,]+',
                r'From\s+\$[\d,]+',
                r'\$[\d,]+\s*-\s*\$[\d,]+'
            ]
        else:
            # Standard patterns for other selectors
            price_patterns = [
                r'\$[\d,]+(?:\.\d{2})?(?:\s*/\s*month|\s*monthly|\s*mo\.?)?',
                r'\$[\d,]{3,}'
            ]

        for pattern in price_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            prices.extend(matches)

        return list(set(prices))  # Remove duplicates

    def _extract_units_from_relational_element(self, text: str, selector: str) -> List[str]:
        """Extract unit info from text found via relational selectors"""
        units = []

        # Unit patterns (context-aware based on selector)
        if 'unit' in selector.lower() or 'floor' in selector.lower() or 'bed' in selector.lower():
            # More aggressive for unit-related selectors
            unit_patterns = [
                r'\d+\s*(?:bedroom|bathroom|bed|bath|br|ba)(?:\s*\d+\s*(?:bedroom|bathroom|bed|bath|br|ba))*\s*(?:apartment|unit)?',
                r'Studio\s+(?:Apartment|Unit)?',
                r'\d+\s*(?:Bed|Bath)\s*(?:Apartment|Unit)?',
                r'(?:One|Two|Three|Four|Five)\s*(?:Bedroom|Bathroom)\s*(?:Apartment|Unit)?'
            ]
        else:
            # Standard patterns
            unit_patterns = [
                r'\d+\s*(?:bedroom|bathroom|bed|bath|br|ba)',
                r'Studio'
            ]

        for pattern in unit_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            units.extend(matches)

        return list(set(units))  # Remove duplicates

    async def _get_data_attributes(self, element) -> Dict[str, str]:
        """Get data attributes from an element"""
        try:
            attributes = await element.evaluate("""
                (el) => {
                    const attrs = {};
                    for (const attr of el.attributes) {
                        if (attr.name.startsWith('data-')) {
                            attrs[attr.name] = attr.value;
                        }
                    }
                    return attrs;
                }
            """)
            return attributes
        except:
            return {}

    def _extract_prices_from_attributes(self, attributes: Dict[str, str]) -> List[str]:
        """Extract prices from data attributes"""
        prices = []

        price_keys = ['data-price', 'data-rent', 'data-cost', 'data-monthly', 'data-amount']
        for key in price_keys:
            if key in attributes and attributes[key]:
                value = attributes[key].strip()
                if value.startswith('$'):
                    prices.append(value)
                elif value.isdigit():
                    prices.append(f"${value}")

        return prices

    def _extract_units_from_attributes(self, attributes: Dict[str, str]) -> List[str]:
        """Extract unit info from data attributes"""
        units = []

        unit_keys = ['data-unit-type', 'data-bedrooms', 'data-bathrooms', 'data-floor-plan']
        for key in unit_keys:
            if key in attributes and attributes[key]:
                value = attributes[key].strip()
                if 'bed' in value.lower() or 'bath' in value.lower() or 'studio' in value.lower():
                    units.append(value)

        return units

    async def _try_relational_interactions(self, page):
        """Try additional interactions using relational patterns"""
        print("🔄 Trying relational interaction patterns...")

        interaction_selectors = [
            # Static attribute-based interactions
            'button[data-toggle]', 'a[data-toggle]',
            'button[data-target]', 'a[data-target]',
            '[data-action="show-floor-plans"]', '[data-action="load-pricing"]',
            # Hierarchical interactions
            'div[class*="accordion"] button', 'div[class*="collapse"] button',
            'div[class*="tab"] a', 'div[class*="modal"] button',
            # Sibling-based interactions
            'i[class*="plus"] + button', 'span[class*="more"] + a',
            'img[class*="arrow"] + button', 'div[class*="indicator"] + a'
        ]

        for selector in interaction_selectors:
            try:
                elements = page.locator(selector)
                count = await elements.count()

                if count > 0:
                    print(f"   Found {count} relational interaction elements: {selector}")

                    # Click first element
                    await elements.first.click()
                    await asyncio.sleep(2)

            except Exception as e:
                continue


async def main():
    """Run Huntley relational scraping (Approach 2)"""
    print("🔗 HUNTLEY RELATIONAL ELEMENT SCRAPER - APPROACH 2")
    print("Targeting elements by immutable relational properties")
    print("=" * 60)

    scraper = HuntleyRelationalScraper()

    try:
        result = await scraper.huntley_relational_scrape()

        if result:
            print("\n🎉 HUNTLEY RELATIONAL SCRAPING COMPLETED!")

            relational_data = result.get('relational_pricing_data', {})
            analysis = result.get('relational_analysis', {})

            print("\n📊 RESULTS SUMMARY:")
            print(f"   Relational Selectors Analyzed: {analysis.get('total_selectors_found', 0)}")
            print(f"   Categories Processed: {analysis.get('categories_analyzed', 0)}")
            print(f"   Relational Content: {relational_data.get('total_prices', 0)} prices, {relational_data.get('total_units', 0)} units")
            print(f"   Navigation: {'✅ Performed' if result.get('navigation_performed', False) else '❌ Failed'}")
            print(f"   Interactions: {'✅ Attempted' if result.get('relational_interactions_attempted', False) else '❌ Failed'}")

            total_prices = result.get('total_prices_found', 0)
            total_units = result.get('total_units_found', 0)

            if total_prices > 0:
                print(f"   💰 Sample Prices: {relational_data.get('prices', [])[:3]}")
            if total_units > 0:
                print(f"   🏠 Sample Units: {relational_data.get('units', [])[:3]}")

            print(f"\n✅ Total Extracted: {total_prices} prices, {total_units} units")

            if total_prices > 10:
                print("🎯 SUCCESS: Good relational extraction results!")
            elif total_prices > 0:
                print("⚠️  PARTIAL: Some data extracted via relational targeting")
            else:
                print("❌ ISSUE: No pricing data found - relational approach may need refinement")

        else:
            print("\n❌ Huntley relational scraping failed")

    except KeyboardInterrupt:
        print("\n⏹️  Huntley scraping interrupted")
    except Exception as e:
        print(f"\n❌ Huntley scraping error: {e}")


if __name__ == "__main__":
    asyncio.run(main())