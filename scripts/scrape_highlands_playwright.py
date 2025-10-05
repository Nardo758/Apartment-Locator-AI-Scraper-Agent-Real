#!/usr/bin/env python3
"""Playwright-based scraper for Highlands at Sweetwater Creek.

Usage:
  pip install playwright
  playwright install chromium
  python scripts/scrape_highlands_playwright.py --dry-run

Options:
  --dry-run    Save payload to file and print it (no push)
  --push       Push to Supabase using scripts/run_scraper_to_supabase.py (requires SUPABASE_* env vars)
  --url        URL to scrape (defaults to the floorplans page)
"""
import argparse
import asyncio
import json
import os
import subprocess
import sys
from datetime import datetime
from typing import Any, Dict, List

from playwright.async_api import async_playwright


async def scrape_highlands_playwright(dry_run: bool = True, push: bool = False, url: str = None, timeout: int = 60000, headful: bool = False) -> List[Dict[str, Any]]:
    url = url or 'https://highlandsatsweetwatercreek.com/floorplans/'
    print('🚀 Starting Playwright scraper for Highlands at Sweetwater Creek...')

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=not headful)
        page = await browser.new_page()

        try:
            await page.goto(url, timeout=timeout)
            # First wait for load to settle
            try:
                await page.wait_for_load_state('networkidle', timeout=timeout)
            except Exception:
                # continue; some sites never reach networkidle
                pass

            # Wait for elements that commonly indicate floorplans or pricing
            selector = '.floorplan-item, .unit-card, .pricing-card, [class*="pricing"], [class*="rent"]'
            try:
                await page.wait_for_selector(selector, timeout=int(timeout/6))
            except Exception as e:
                # Capture diagnostics: screenshot + HTML
                diag_screenshot = 'highlands_playwright_diag.png'
                diag_html = 'highlands_playwright_diag.html'
                try:
                    await page.screenshot(path=diag_screenshot, full_page=True)
                except Exception:
                    pass
                try:
                    html = await page.content()
                    with open(diag_html, 'w', encoding='utf-8') as f:
                        f.write(html)
                except Exception:
                    pass
                print(f'⚠️ Selector wait timed out: {e}')
                print(f'⚠️ Saved diagnostic screenshot to {diag_screenshot} and HTML to {diag_html}')
                # continue — attempt to evaluate anyway

            units = await page.evaluate('''() => {
                const units = [];
                const unitElements = document.querySelectorAll('.floorplan-item, .unit-card, .pricing-card, [class*="unit"], [class*="plan"]');
                unitElements.forEach((element, index) => {
                    const text = element.innerText || '';
                    const t = text.toLowerCase();
                    if (!(t.includes('bed') || t.includes('bath') || t.includes('$') || t.includes('sq'))) return;

                    function extractPrice(s){ const m = s.match(/\$\s*([0-9,]+)/); return m ? parseInt(m[1].replace(/,/g,'')) : null }
                    function extractBedrooms(s){ if(s.includes('studio')) return 0; const m = s.match(/(\d)\s*bed/); return m?parseInt(m[1]):null }
                    function extractBathrooms(s){ const m = s.match(/(\d(?:\.\d)?)\s*bath/); return m?parseFloat(m[1]):null }

                    const unit = {
                        external_id: `highlands_unit_${index+1}`,
                        name: element.querySelector('h2, h3, .title')?.innerText || `Unit ${index+1}`,
                        current_price: extractPrice(text),
                        bedrooms: extractBedrooms(text),
                        bathrooms: extractBathrooms(text),
                        square_feet: (text.match(/(\d{3,4})\s*sq/)||[])[1] || null,
                        address: '2175 East West Connector',
                        city: 'Austell',
                        state: 'GA',
                        source: 'highlandsatsweetwatercreek'
                    };

                    if (unit.current_price || unit.bedrooms) units.push(unit);
                });
                return units;
            }''')

            print(f'✅ Found {len(units)} units')

            # Map to RPC row shape expected by our pipeline
            rows: List[Dict[str, Any]] = []
            for u in units:
                row = {
                    'source': u.get('source', 'highlandsatsweetwatercreek'),
                    'external_id': u.get('external_id'),
                    'property_external_id': 'highlandsatsweetwatercreek',
                    'unit_identifier': u.get('name'),
                    'unit_name': u.get('name'),
                    'beds': u.get('bedrooms'),
                    'baths': u.get('bathrooms'),
                    'rent': u.get('current_price'),
                    'floorplan': None,
                    'amenities': None,
                    'ai_price': None,
                    'effective_price': None,
                    'ai_provenance': None,
                }
                rows.append(row)

            # Save raw rows and a wrapped payload for inspection
            raw_path = 'highlands_playwright_payload.json'
            wrapped_path = 'highlands_playwright_wrapped.json'
            with open(raw_path, 'w', encoding='utf-8') as f:
                json.dump(rows, f, indent=2)
            wrapped = {
                'p_rows': rows,
                'p_scraped_url': url,
                'p_scraped_at': datetime.utcnow().isoformat() + 'Z'
            }
            with open(wrapped_path, 'w', encoding='utf-8') as f:
                json.dump(wrapped, f, indent=2)

            print(f'💾 Saved {len(rows)} rows to {raw_path} and wrapped payload to {wrapped_path}')

            if dry_run:
                print('📦 Dry run - not pushing')
                return rows

            if push:
                # Call the existing runner to push (it will wrap into p_rows)
                runner = os.path.join('scripts', 'run_scraper_to_supabase.py')
                cmd = [sys.executable, runner, '--payload', raw_path]
                print('🚀 Pushing via runner:', ' '.join(cmd))
                subprocess.check_call(cmd)

            return rows

        finally:
            await browser.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--dry-run', action='store_true', default=True)
    parser.add_argument('--push', action='store_true')
    parser.add_argument('--url', default=None)
    parser.add_argument('--timeout', type=int, default=60000, help='Navigation timeout in ms')
    parser.add_argument('--headful', action='store_true', help='Run browser in headed mode for debugging')
    args = parser.parse_args()

    # Playwright requires browsers to be installed: `playwright install chromium`
    rows = asyncio.run(scrape_highlands_playwright(dry_run=args.dry_run, push=args.push, url=args.url, timeout=args.timeout, headful=args.headful))
    if rows is None:
        print('No rows extracted')


if __name__ == '__main__':
    main()
