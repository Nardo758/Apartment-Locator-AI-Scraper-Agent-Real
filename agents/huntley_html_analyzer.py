#!/usr/bin/env python3
"""
Huntley HTML Structure Analyzer
Manually inspect The Huntley's HTML to understand pricing structure
"""

import asyncio
import json
import time
from typing import Dict, List
from hybrid_video_simple_scraper import HybridVideoSimpleScraper


class HuntleyHTMLAnalyzer:
    """Analyze The Huntley's HTML structure for pricing patterns"""

    def __init__(self):
        self.scraper = HybridVideoSimpleScraper()

    async def analyze_huntley_structure(self, target_url: str = "https://www.thehuntley.com/", profile_name: str = "Default"):
        """Analyze The Huntley's HTML structure"""
        print("🔍 HUNTLEY HTML STRUCTURE ANALYZER")
        print("=" * 45)
        print("Inspecting The Huntley's HTML for pricing patterns")
        print("=" * 45)

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

                print("📊 Analyzing page structure...")

                # Get comprehensive page analysis
                structure_analysis = await self._analyze_page_structure(page)

                # Try to navigate to pricing/floor plans
                await self._attempt_pricing_navigation(page)

                # Analyze pricing-specific elements
                pricing_analysis = await self._analyze_pricing_elements(page)

                # Get sample pricing data
                sample_data = await self._extract_sample_pricing(page)

                result = {
                    "analysis_timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                    "target_url": target_url,
                    "page_title": await page.title(),
                    "structure_analysis": structure_analysis,
                    "pricing_analysis": pricing_analysis,
                    "sample_pricing_data": sample_data,
                    "recommendations": self._generate_recommendations(structure_analysis, pricing_analysis, sample_data)
                }

                # Save analysis
                filename = f"huntley_html_analysis_{int(time.time())}.json"
                with open(filename, 'w', encoding='utf-8') as f:
                    json.dump(result, f, indent=2, ensure_ascii=False)

                print(f"💾 Analysis saved: {filename}")

                return result

            finally:
                await context.close()

    async def _analyze_page_structure(self, page) -> Dict:
        """Analyze overall page structure"""
        try:
            structure = await page.evaluate("""
                ({
                    totalElements: document.querySelectorAll('*').length,
                    pricingElements: {
                        dollarSigns: document.querySelectorAll('*').length - document.querySelectorAll(':not(:contains("$"))').length,
                        priceClasses: Array.from(document.querySelectorAll('[class*="price"], [class*="rent"], [class*="cost"]')).length,
                        priceIds: Array.from(document.querySelectorAll('[id*="price"], [id*="rent"], [id*="cost"]')).length,
                        dataPrice: Array.from(document.querySelectorAll('[data-price], [data-rent]')).length
                    },
                    unitElements: {
                        unitClasses: Array.from(document.querySelectorAll('[class*="unit"], [class*="apartment"], [class*="floor"]')).length,
                        bedroomElements: Array.from(document.querySelectorAll('[class*="bed"], [class*="bedroom"]')).length,
                        bathroomElements: Array.from(document.querySelectorAll('[class*="bath"], [class*="bathroom"]')).length
                    },
                    dynamicContent: {
                        reactRoot: !!document.querySelector('[data-reactroot]'),
                        vueApp: !!document.querySelector('[data-vue-app], .vue-app'),
                        angularApp: !!document.querySelector('[ng-app]'),
                        scripts: document.querySelectorAll('script').length,
                        stylesheets: document.querySelectorAll('link[rel="stylesheet"]').length
                    },
                    navigationElements: {
                        links: document.querySelectorAll('a').length,
                        buttons: document.querySelectorAll('button').length,
                        forms: document.querySelectorAll('form').length
                    }
                })
            """)

            return structure

        except Exception as e:
            print(f"⚠️  Structure analysis error: {e}")
            return {}

    async def _attempt_pricing_navigation(self, page):
        """Try to navigate to pricing/floor plan sections"""
        print("🧭 Attempting pricing navigation...")

        navigation_attempts = [
            'a[href*="floor"]', 'a[href*="plan"]', 'a[href*="pricing"]',
            'a[href*="rent"]', 'a[href*="rates"]', 'a[href*="availability"]',
            'button[class*="floor"]', 'button[class*="plan"]', 'button[class*="pricing"]'
        ]

        for selector in navigation_attempts:
            try:
                elements = page.locator(selector)
                count = await elements.count()

                if count > 0:
                    print(f"   Found {count} elements: {selector}")

                    # Click first element
                    first_element = elements.first
                    element_text = await first_element.text_content()
                    print(f"   Clicking: '{element_text.strip()}'")

                    await first_element.click()
                    await asyncio.sleep(2)  # Wait for navigation/loading

                    # Check if URL changed
                    current_url = page.url
                    print(f"   New URL: {current_url}")

                    break

            except Exception as e:
                continue

    async def _analyze_pricing_elements(self, page) -> Dict:
        """Analyze pricing-specific elements"""
        try:
            pricing_analysis = await page.evaluate("""
                (() => {
                    const elements = [];

                    // Find all elements containing dollar signs
                    const allElements = document.querySelectorAll('*');
                    for (const el of allElements) {
                        const text = el.textContent || '';
                        if (text.includes('$') && text.length < 200) {  // Reasonable length limit
                            elements.push({
                                tag: el.tagName,
                                className: el.className,
                                id: el.id,
                                text: text.trim(),
                                path: getElementPath(el)
                            });
                        }
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
                            if (path.length > 5) break;  // Limit depth
                        }
                        return path.slice(0, 3).join(' > ');  // Top 3 levels
                    }

                    return {
                        dollarSignElements: elements.length,
                        sampleElements: elements.slice(0, 10),  // First 10 samples
                        uniqueClasses: [...new Set(elements.map(e => e.className).filter(c => c))],
                        uniqueIds: [...new Set(elements.map(e => e.id).filter(i => i))]
                    };
                })()
            """)

            return pricing_analysis

        except Exception as e:
            print(f"⚠️  Pricing analysis error: {e}")
            return {}

    async def _extract_sample_pricing(self, page) -> Dict:
        """Extract sample pricing data for analysis"""
        try:
            sample_data = await page.evaluate("""
                (() => {
                    const prices = [];
                    const units = [];

                    // Extract price patterns
                    const priceRegex = /\$[\d,]+(?:\.\d{2})?(?:\s*\/\s*month|\s*monthly|\s*mo\.?)?/gi;
                    const allText = document.body.textContent || '';
                    const priceMatches = allText.match(priceRegex) || [];
                    prices.push(...priceMatches.slice(0, 20));  // First 20 matches

                    // Extract unit patterns
                    const unitRegex = /\d+\s*(?:bedroom|bathroom|bed|bath|br|ba)/gi;
                    const unitMatches = allText.match(unitRegex) || [];
                    units.push(...unitMatches.slice(0, 15));  // First 15 matches

                    return {
                        extractedPrices: [...new Set(prices)],  // Remove duplicates
                        extractedUnits: [...new Set(units)],
                        totalPriceMatches: priceMatches.length,
                        totalUnitMatches: unitMatches.length
                    };
                })()
            """)

            return sample_data

        except Exception as e:
            print(f"⚠️  Sample extraction error: {e}")
            return {}

    def _generate_recommendations(self, structure: Dict, pricing: Dict, sample: Dict) -> List[str]:
        """Generate recommendations based on analysis"""
        recommendations = []

        # Analyze structure
        if structure.get('pricingElements', {}).get('dollarSigns', 0) > 0:
            recommendations.append(f"✅ Found {structure['pricingElements']['dollarSigns']} elements with dollar signs - good pricing detection potential")

        if structure.get('dynamicContent', {}).get('reactRoot', False):
            recommendations.append("⚠️  React app detected - pricing may be dynamically loaded")

        # Analyze pricing elements
        if pricing.get('dollarSignElements', 0) > 0:
            recommendations.append(f"📊 Found {pricing['dollarSignElements']} pricing elements for analysis")

            unique_classes = pricing.get('uniqueClasses', [])
            if unique_classes:
                recommendations.append(f"🎯 Key pricing classes found: {', '.join(unique_classes[:3])}")

        # Analyze sample data
        prices_found = len(sample.get('extractedPrices', []))
        units_found = len(sample.get('extractedUnits', []))

        if prices_found > 0:
            recommendations.append(f"💰 Successfully extracted {prices_found} unique prices from text content")
        else:
            recommendations.append("❌ No prices found in text content - may be image-based or dynamically loaded")

        if units_found > 0:
            recommendations.append(f"🏠 Successfully extracted {units_found} unique unit types from text content")
        else:
            recommendations.append("❌ No unit information found in text content")

        # Video training recommendations
        recommendations.append("🎥 For better video training: Demonstrate clicking on pricing tables/lists and scrolling through rental data")

        return recommendations


async def main():
    """Run Huntley HTML analysis"""
    print("🔍 HUNTLEY HTML STRUCTURE ANALYSIS")
    print("Understanding The Huntley's pricing layout for better AI training")
    print("=" * 70)

    analyzer = HuntleyHTMLAnalyzer()

    try:
        result = await analyzer.analyze_huntley_structure()

        if result:
            print("\n📊 ANALYSIS SUMMARY:")
            print("=" * 20)

            structure = result.get('structure_analysis', {})
            pricing = result.get('pricing_analysis', {})
            sample = result.get('sample_pricing_data', {})

            print(f"🏗️  Page Structure:")
            print(f"   Total Elements: {structure.get('totalElements', 'N/A')}")
            print(f"   Pricing Elements: {structure.get('pricingElements', {}).get('dollarSigns', 'N/A')} with $")
            print(f"   Unit Elements: {structure.get('unitElements', {}).get('unitClasses', 'N/A')} unit-related")

            print(f"\n💰 Pricing Analysis:")
            print(f"   Dollar Sign Elements: {pricing.get('dollarSignElements', 'N/A')}")
            print(f"   Unique Classes: {len(pricing.get('uniqueClasses', []))}")

            print(f"\n📋 Sample Data:")
            print(f"   Prices Extracted: {len(sample.get('extractedPrices', []))}")
            print(f"   Units Extracted: {len(sample.get('extractedUnits', []))}")

            if sample.get('extractedPrices'):
                print(f"   Sample Prices: {sample['extractedPrices'][:5]}")

            print(f"\n🎯 Recommendations:")
            for rec in result.get('recommendations', []):
                print(f"   • {rec}")

            print(f"\n✅ Analysis complete! Check the saved JSON file for detailed results.")

    except KeyboardInterrupt:
        print("\n⏹️  Analysis interrupted")
    except Exception as e:
        print(f"\n❌ Analysis error: {e}")


if __name__ == "__main__":
    import os
    asyncio.run(main())