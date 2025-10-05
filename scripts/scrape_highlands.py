#!/usr/bin/env python3
"""Scrape units from Highlands at Sweetwater Creek and produce RPC payload.

Usage:
  python scripts/scrape_highlands.py --url https://www.highlandsatsweetwatercreek.com --dry-run

Options:
  --url      The property URL to scrape (defaults to the site you asked)
  --output   File path to write the payload (default: scripts/highlands_payload.json)
  --push     If set, calls the runner to push to Supabase (requires SUPABASE_* env vars)
  --force    Ignore robots.txt warnings
  --dry-run  Validate and save payload but do not push

Notes:
  - This script uses requests + BeautifulSoup. If the site relies on JS to render unit lists,
    this simple scraper may not find units. In that case use a headless browser (Playwright/Selenium)
    or the Edge Function approach.
"""
import argparse
import json
import os
import re
import sys
from typing import List, Dict, Any

import requests
from bs4 import BeautifulSoup


def fail(msg: str):
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(1)


def fetch(url: str) -> str:
    try:
        r = requests.get(url, timeout=20)
        r.raise_for_status()
        return r.text
    except Exception as e:
        fail(f'Failed to fetch {url}: {e}')


def check_robots(site_url: str) -> bool:
    # simple robots.txt check for /
    parsed = requests.utils.urlparse(site_url)
    robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
    try:
        r = requests.get(robots_url, timeout=5)
        if r.status_code != 200:
            return True
        txt = r.text.lower()
        # naive check: if Disallow: / then block
        if 'disallow: /' in txt:
            return False
        return True
    except Exception:
        return True


def extract_price(text: str) -> int:
    if not text:
        return None
    m = re.search(r'\$?\s*([0-9,]+)', text.replace('$', ''))
    if not m:
        return None
    return int(m.group(1).replace(',', ''))


def extract_beds(text: str) -> int:
    if not text:
        return None
    m = re.search(r'([0-9]+)\s*bed', text.lower())
    if m:
        return int(m.group(1))
    # fallback single digit
    m2 = re.search(r'([0-9]+)\s*br', text.lower())
    if m2:
        return int(m2.group(1))
    return None


def extract_baths(text: str) -> float:
    if not text:
        return None
    m = re.search(r'([0-9]+(?:\.[0-9]+)?)\s*bath', text.lower())
    if m:
        return float(m.group(1))
    return None


def parse_units(html: str, base_url: str) -> List[Dict[str, Any]]:
    soup = BeautifulSoup(html, 'html.parser')
    rows: List[Dict[str, Any]] = []

    # Heuristics: look for elements that look like floorplans or unit cards
    candidates = soup.select('.floorplan, .unit, .unit-card, .plan, .apartment')
    if not candidates:
        # fallback: look for listing rows
        candidates = soup.select('li, div')

    seen = 0
    for el in candidates:
        text = el.get_text(' ', strip=True)
        # simple heuristic: must mention bed or br or $
        if not re.search(r'\b(bed|br|studio|\$)\b', text.lower()):
            continue

        # Extract fields
        unit_name = el.select_one('.unit-name')
        unit_name_text = unit_name.get_text(' ', strip=True) if unit_name else None

        price_text = None
        price_el = el.select_one('.rent, .price, .monthly, .rate')
        if price_el:
            price_text = price_el.get_text(' ', strip=True)
        else:
            # try to find $ in text
            m = re.search(r'\$\s*[0-9,]+', text)
            price_text = m.group(0) if m else None

        floorplan = el.select_one('.floorplan-name, .plan-name')
        floorplan_text = floorplan.get_text(' ', strip=True) if floorplan else None

        beds = extract_beds(text)
        baths = extract_baths(text)
        rent = extract_price(price_text)

        # amenities: look for list items inside the card
        amenities = [li.get_text(' ', strip=True) for li in el.select('ul li')]

        # deduce external ids
        unit_id = unit_name_text or floorplan_text or f'unit-{seen+1}'
        external_id = f'highlands:{unit_id}'

        row = {
            'source': 'highlandsatsweetwatercreek',
            'external_id': external_id,
            'property_external_id': 'highlandsatsweetwatercreek',
            'unit_identifier': unit_id,
            'unit_name': unit_name_text,
            'beds': beds,
            'baths': baths,
            'rent': rent,
            'floorplan': floorplan_text,
            'amenities': amenities or None,
            'ai_price': None,
            'effective_price': None,
            'ai_provenance': None,
        }
        rows.append(row)
        seen += 1

    # If nothing found, attempt to find table rows with pricing
    if not rows and soup.find_all('table'):
        for tr in soup.select('table tr'):
            t = tr.get_text(' ', strip=True)
            if re.search(r'\$\s*[0-9,]+', t):
                # crude split
                parts = [p.strip() for p in t.split() if p.strip()]
                rows.append({
                    'source': 'highlandsatsweetwatercreek',
                    'external_id': f'highlands:row:{len(rows)+1}',
                    'property_external_id': 'highlandsatsweetwatercreek',
                    'unit_identifier': None,
                    'unit_name': None,
                    'beds': extract_beds(t),
                    'baths': extract_baths(t),
                    'rent': extract_price(t),
                    'floorplan': None,
                    'amenities': None,
                    'ai_price': None,
                    'effective_price': None,
                    'ai_provenance': None,
                })

    return rows


def save_payload(rows: List[Dict[str, Any]], path: str):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(rows, f, indent=2)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='https://www.highlandsatsweetwatercreek.com')
    parser.add_argument('--output', default='scripts/highlands_payload.json')
    parser.add_argument('--push', action='store_true')
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--force', action='store_true')
    args = parser.parse_args()

    if not args.force:
        ok = check_robots(args.url)
        if not ok:
            fail('robots.txt disallows crawling. Use --force to override.')

    html = fetch(args.url)
    rows = parse_units(html, args.url)
    if not rows:
        print('No units found. The page might be JS-rendered. Consider using a headless browser.')

    # Build RPC-shaped payload (list of rows)
    payload = rows
    save_payload(payload, args.output)
    print(f'Wrote {len(payload)} rows to {args.output}')

    if args.push:
        # call the runner script
        runner = os.path.join('scripts', 'run_scraper_to_supabase.py')
        cmd = [sys.executable, runner, '--payload', args.output]
        if args.dry_run:
            cmd.append('--dry-run')
        print('Calling runner:', ' '.join(cmd))
        os.execv(sys.executable, [sys.executable] + cmd)


if __name__ == '__main__':
    main()
