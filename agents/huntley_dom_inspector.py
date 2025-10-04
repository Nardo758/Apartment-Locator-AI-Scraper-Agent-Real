#!/usr/bin/env python3
"""
Huntley DOM Inspector
Inspects the actual DOM structure of The Huntley website to understand real element relationships
"""

import asyncio
import json
import time
import os
from typing import Dict, List
from hybrid_video_simple_scraper import HybridVideoSimpleScraper


class HuntleyDOMInspector:
    """Inspects The Huntley's actual DOM structure"""

    def __init__(self):
        self.scraper = HybridVideoSimpleScraper()

    async def inspect_huntley_dom(self, target_url: str = "https://www.thehuntley.com/", profile_name: str = "Default"):
        """Inspect The Huntley's DOM structure"""
        print("🔬 HUNTLEY DOM INSPECTOR")
        print("=" * 30)
        print("Examining actual DOM structure and relationships")
        print("=" * 30)

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

                # Comprehensive DOM inspection
                dom_structure = await self._inspect_dom_structure(page)

                # Try navigation and inspect again
                await self._attempt_navigation_and_inspect(page, dom_structure)

                # Analyze for pricing patterns
                pricing_patterns = await self._analyze_pricing_patterns(page)

                result = {
                    "inspection_timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                    "target_url": target_url,
                    "page_title": title,
                    "dom_structure": dom_structure,
                    "pricing_patterns": pricing_patterns,
                    "recommendations": self._generate_inspection_recommendations(dom_structure, pricing_patterns)
                }

                # Save inspection results
                timestamp = int(time.time())
                filename = f"huntley_dom_inspection_{timestamp}.json"
                with open(filename, 'w', encoding='utf-8') as f:
                    json.dump(result, f, indent=2, ensure_ascii=False)

                print(f"💾 Inspection saved: {filename}")

                return result

            finally:
                await context.close()

    async def _inspect_dom_structure(self, page) -> Dict:
        """Inspect the actual DOM structure"""
        print("🔍 Inspecting DOM structure...")

        structure = await page.evaluate("""
            (() => {
                const structure = {
                    allClasses: [],
                    allIds: [],
                    allDataAttrs: [],
                    allTags: [],
                    textContentElements: [],
                    elementHierarchy: [],
                    potentialPricingContainers: []
                };

                // Get all elements
                const allElements = document.querySelectorAll('*');
                structure.totalElements = allElements.length;

                // Analyze classes, IDs, and data attributes
                const classes = new Set();
                const ids = new Set();
                const dataAttrs = new Set();
                const tags = new Set();

                for (const el of allElements) {
                    // Collect classes
                    if (el.className && typeof el.className === 'string') {
                        el.className.split(' ').forEach(cls => {
                            if (cls.trim()) classes.add(cls.trim());
                        });
                    }

                    // Collect IDs
                    if (el.id) ids.add(el.id);

                    // Collect data attributes
                    for (const attr of el.attributes) {
                        if (attr.name.startsWith('data-')) {
                            dataAttrs.add(attr.name);
                        }
                    }

                    // Collect tags
                    tags.add(el.tagName.toLowerCase());

                    // Find elements with dollar signs or price-like text
                    const text = el.textContent || '';
                    if (text.includes('$') || /\\d+\\s*(?:bed|bath|sqft|month)/i.test(text)) {
                        structure.textContentElements.push({
                            tag: el.tagName.toLowerCase(),
                            className: el.className,
                            id: el.id,
                            text: text.trim().substring(0, 100), // First 100 chars
                            path: getElementPath(el)
                        });
                    }
                }

                // Convert sets to sorted arrays
                structure.allClasses = Array.from(classes).sort();
                structure.allIds = Array.from(ids).sort();
                structure.allDataAttrs = Array.from(dataAttrs).sort();
                structure.allTags = Array.from(tags).sort();

                // Analyze hierarchy for potential pricing containers
                const containers = ['div', 'section', 'article', 'main', 'aside'];
                for (const tag of containers) {
                    const elements = document.querySelectorAll(tag);
                    for (const el of elements) {
                        const childCount = el.querySelectorAll('*').length;
                        const textLength = el.textContent.length;
                        const hasPricing = el.textContent.includes('$');

                        if ((childCount > 5 && textLength > 100) || hasPricing) {
                            structure.potentialPricingContainers.push({
                                tag: tag,
                                className: el.className,
                                id: el.id,
                                childCount: childCount,
                                textLength: textLength,
                                hasPricing: hasPricing,
                                path: getElementPath(el)
                            });
                        }
                    }
                }

                // Analyze element hierarchy
                const body = document.body;
                if (body) {
                    structure.elementHierarchy = analyzeHierarchy(body, 0);
                }

                function getElementPath(element) {
                    const path = [];
                    while (element && element.nodeType === Node.ELEMENT_NODE) {
                        let selector = element.nodeName.toLowerCase();
                        if (element.id) {
                            selector += '#' + element.id;
                            path.unshift(selector);
                            break;
                        } else if (element.className) {
                            selector += '.' + element.className.split(' ').join('.');
                        }
                        path.unshift(selector);
                        element = element.parentNode;
                        if (path.length > 4) break; // Limit depth
                    }
                    return path.slice(0, 4).join(' > ');
                }

                function analyzeHierarchy(element, depth) {
                    if (depth > 3) return null; // Limit depth

                    const info = {
                        tag: element.tagName.toLowerCase(),
                        className: element.className || '',
                        id: element.id || '',
                        children: []
                    };

                    // Only analyze children that might contain pricing
                    const relevantChildren = Array.from(element.children).filter(child => {
                        const text = child.textContent || '';
                        return text.includes('$') ||
                               /\\d+\\s*(?:bed|bath|sqft)/i.test(text) ||
                               child.querySelectorAll('*').length > 3;
                    });

                    for (const child of relevantChildren.slice(0, 5)) { // Limit children
                        const childInfo = analyzeHierarchy(child, depth + 1);
                        if (childInfo) info.children.push(childInfo);
                    }

                    return info.children.length > 0 || info.className || info.id ? info : null;
                }

                return structure;
            })()
        """)

        print(f"   📊 Found {structure.get('totalElements', 0)} total elements")
        print(f"   🏷️  Found {len(structure.get('allClasses', []))} unique classes")
        print(f"   🆔 Found {len(structure.get('allIds', []))} unique IDs")
        print(f"   📋 Found {len(structure.get('allDataAttrs', []))} data attributes")
        print(f"   💰 Found {len(structure.get('textContentElements', []))} elements with pricing-like text")
        print(f"   📦 Found {len(structure.get('potentialPricingContainers', []))} potential containers")

        return structure

    async def _attempt_navigation_and_inspect(self, page, initial_structure: Dict) -> Dict:
        """Try navigation and inspect structure changes"""
        print("🧭 Attempting navigation and re-inspecting...")

        # Try various navigation patterns
        nav_selectors = [
            'a[href*="floor"]', 'a[href*="plan"]', 'a[href*="pricing"]',
            'button', 'a[href*="availability"]', '[data-toggle]', '[data-target]'
        ]

        post_nav_structure = None

        for selector in nav_selectors:
            try:
                elements = page.locator(selector)
                count = await elements.count()

                if count > 0:
                    print(f"   Trying navigation with: {selector} ({count} elements)")

                    # Click first element
                    await elements.first.click()
                    await asyncio.sleep(3)

                    # Re-inspect structure
                    post_nav_structure = await self._inspect_dom_structure(page)

                    # Check for changes
                    initial_pricing = len(initial_structure.get('textContentElements', []))
                    post_pricing = len(post_nav_structure.get('textContentElements', []))

                    if post_pricing > initial_pricing:
                        print(f"   ✅ Navigation revealed more pricing elements: {initial_pricing} → {post_pricing}")
                        break
                    else:
                        print(f"   ⚠️  No significant change in pricing elements: {initial_pricing} → {post_pricing}")

            except Exception as e:
                continue

        return post_nav_structure or initial_structure

    async def _analyze_pricing_patterns(self, page) -> Dict:
        """Analyze actual pricing patterns in the DOM"""
        print("💰 Analyzing pricing patterns...")

        patterns = await page.evaluate("""
            (() => {
                const patterns = {
                    dollarElements: [],
                    pricePatterns: [],
                    unitPatterns: [],
                    dataAttributes: [],
                    structuralPatterns: []
                };

                // Find all elements containing dollar signs
                const dollarElements = [];
                const allElements = document.querySelectorAll('*');

                for (const el of allElements) {
                    const text = el.textContent || '';
                    if (text.includes('$')) {
                        dollarElements.push({
                            tag: el.tagName.toLowerCase(),
                            className: el.className,
                            id: el.id,
                            text: text.trim(),
                            attributes: Array.from(el.attributes).map(attr => ({
                                name: attr.name,
                                value: attr.value
                            }))
                        });
                    }
                }

                patterns.dollarElements = dollarElements.slice(0, 20); // First 20

                // Analyze common pricing patterns
                const priceRegexes = [
                    /\\$[\d,]+(?:\\.\d{2})?(?:\\s*\\/\\s*month|\\s*monthly)?/g,
                    /\\$[\d,]{3,}/g,
                    /Starting\\s+(?:at\\s+)?\\$[\d,]+/g,
                    /From\\s+\\$[\d,]+/g
                ];

                for (const regex of priceRegexes) {
                    const bodyText = document.body.textContent || '';
                    const matches = bodyText.match(regex) || [];
                    if (matches.length > 0) {
                        patterns.pricePatterns.push({
                            pattern: regex.source,
                            matches: matches.slice(0, 10)
                        });
                    }
                }

                // Analyze unit patterns
                const unitRegexes = [
                    /\\d+\\s*(?:bedroom|bathroom|bed|bath)/g,
                    /Studio/g,
                    /\\d+\\s*(?:Bed|Bath)/g
                ];

                for (const regex of unitRegexes) {
                    const bodyText = document.body.textContent || '';
                    const matches = bodyText.match(regex) || [];
                    if (matches.length > 0) {
                        patterns.unitPatterns.push({
                            pattern: regex.source,
                            matches: matches.slice(0, 10)
                        });
                    }
                }

                // Find data attributes that might contain pricing
                const dataAttrs = [];
                for (const el of allElements) {
                    for (const attr of el.attributes) {
                        if (attr.name.startsWith('data-') &&
                            (attr.value.includes('$') || /\\d+/.test(attr.value))) {
                            dataAttrs.push({
                                element: el.tagName.toLowerCase(),
                                attribute: attr.name,
                                value: attr.value,
                                elementClass: el.className,
                                elementId: el.id
                            });
                        }
                    }
                }

                patterns.dataAttributes = dataAttrs.slice(0, 15); // First 15

                // Analyze structural patterns around pricing
                const pricingContainers = [];
                for (const dollarEl of dollarElements.slice(0, 10)) {
                    const el = document.querySelector(`${dollarEl.tag}${dollarEl.className ? '.' + dollarEl.className.split(' ').join('.') : ''}${dollarEl.id ? '#' + dollarEl.id : ''}`);
                    if (el) {
                        const parent = el.parentElement;
                        const siblings = Array.from(parent.children);

                        pricingContainers.push({
                            element: dollarEl,
                            parentTag: parent.tagName.toLowerCase(),
                            parentClass: parent.className,
                            parentId: parent.id,
                            siblingCount: siblings.length,
                            elementIndex: siblings.indexOf(el)
                        });
                    }
                }

                patterns.structuralPatterns = pricingContainers;

                return patterns;
            })()
        """)

        print(f"   💵 Found {len(patterns.get('dollarElements', []))} elements with dollar signs")
        print(f"   📊 Found {len(patterns.get('pricePatterns', []))} price patterns")
        print(f"   🏠 Found {len(patterns.get('unitPatterns', []))} unit patterns")
        print(f"   📋 Found {len(patterns.get('dataAttributes', []))} data attributes with values")

        return patterns

    def _generate_inspection_recommendations(self, structure: Dict, patterns: Dict) -> List[str]:
        """Generate recommendations based on inspection"""
        recommendations = []

        # Analyze structure
        total_elements = structure.get('totalElements', 0)
        recommendations.append(f"📊 Page contains {total_elements} total elements for analysis")

        # Analyze classes and IDs
        classes = structure.get('allClasses', [])
        ids = structure.get('allIds', [])
        data_attrs = structure.get('allDataAttrs', [])

        if classes:
            recommendations.append(f"🎨 Found {len(classes)} CSS classes - potential for class-based selectors")
            # Show some examples
            sample_classes = classes[:5]
            recommendations.append(f"   Sample classes: {', '.join(sample_classes)}")

        if ids:
            recommendations.append(f"🆔 Found {len(ids)} element IDs - excellent for direct targeting")
            sample_ids = ids[:3]
            recommendations.append(f"   Sample IDs: {', '.join(sample_ids)}")

        if data_attrs:
            recommendations.append(f"📋 Found {len(data_attrs)} data attributes - perfect for relational targeting")
            sample_attrs = data_attrs[:3]
            recommendations.append(f"   Sample data attributes: {', '.join(sample_attrs)}")

        # Analyze pricing elements
        dollar_elements = patterns.get('dollarElements', [])
        if dollar_elements:
            recommendations.append(f"💰 Found {len(dollar_elements)} elements containing '$' - direct pricing targets available")
            # Analyze patterns
            tags = {}
            classes_used = {}
            for el in dollar_elements:
                tag = el.get('tag', '')
                cls = el.get('className', '')
                tags[tag] = tags.get(tag, 0) + 1
                if cls:
                    classes_used[cls] = classes_used.get(cls, 0) + 1

            if tags:
                top_tags = sorted(tags.items(), key=lambda x: x[1], reverse=True)[:3]
                recommendations.append(f"   Top tags with prices: {', '.join([f'{tag}({count})' for tag, count in top_tags])}")

            if classes_used:
                top_classes = sorted(classes_used.items(), key=lambda x: x[1], reverse=True)[:3]
                recommendations.append(f"   Top classes with prices: {', '.join([f'{cls}({count})' for cls, count in top_classes])}")

        # Analyze data attributes
        data_attributes = patterns.get('dataAttributes', [])
        if data_attributes:
            recommendations.append(f"🔗 Found {len(data_attributes)} data attributes with numeric/$ values - use for relational targeting")

        # Analyze structural patterns
        structural = patterns.get('structuralPatterns', [])
        if structural:
            recommendations.append(f"🏗️  Analyzed {len(structural)} structural patterns around pricing elements")

        # General recommendations
        if not dollar_elements:
            recommendations.append("❌ No elements with '$' found - pricing may be image-based or loaded via JavaScript API")
            recommendations.append("💡 Try triggering JavaScript events or waiting for AJAX calls")

        if not data_attributes and not classes:
            recommendations.append("⚠️  Limited semantic markup - may need XPath or positional selectors")

        recommendations.append("🎯 Next step: Create selectors based on actual DOM structure found above")

        return recommendations


async def main():
    """Run Huntley DOM inspection"""
    print("🔬 HUNTLEY DOM INSPECTOR")
    print("Examining actual DOM structure and relationships")
    print("=" * 55)

    inspector = HuntleyDOMInspector()

    try:
        result = await inspector.inspect_huntley_dom()

        if result:
            print("\n🔬 INSPECTION SUMMARY:")
            print("=" * 20)

            structure = result.get('dom_structure', {})
            patterns = result.get('pricing_patterns', {})

            print(f"🏗️  DOM Structure:")
            print(f"   Total Elements: {structure.get('totalElements', 'N/A')}")
            print(f"   Unique Classes: {len(structure.get('allClasses', []))}")
            print(f"   Unique IDs: {len(structure.get('allIds', []))}")
            print(f"   Data Attributes: {len(structure.get('allDataAttrs', []))}")

            print(f"\n💰 Pricing Analysis:")
            print(f"   Dollar Elements: {len(patterns.get('dollarElements', []))}")
            print(f"   Price Patterns: {len(patterns.get('pricePatterns', []))}")
            print(f"   Unit Patterns: {len(patterns.get('unitPatterns', []))}")
            print(f"   Data Attributes: {len(patterns.get('dataAttributes', []))}")

            print(f"\n🎯 Recommendations:")
            for rec in result.get('recommendations', []):
                print(f"   • {rec}")

            print(f"\n✅ Inspection complete! Check the saved JSON file for detailed DOM analysis.")

        else:
            print("\n❌ Huntley DOM inspection failed")

    except KeyboardInterrupt:
        print("\n⏹️  Inspection interrupted")
    except Exception as e:
        print(f"\n❌ Huntley inspection error: {e}")


if __name__ == "__main__":
    asyncio.run(main())