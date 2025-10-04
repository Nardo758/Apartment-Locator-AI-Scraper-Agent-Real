#!/usr/bin/env python3
"""Simple dry-run mapper for scrape_result.json -> RPC payloads (standard library only).

Usage:
  python agents/dry_run_map.py agents/live_results/<domain>/scrape_result.json
"""
import sys
import json
import re
from pathlib import Path


def map_unit_to_payload(property_url: str, unit: dict) -> dict:
    external_id = unit.get('external_id') or f"tmp-{abs(hash(property_url + unit.get('unit_name','')))}"
    bedrooms = None
    bathrooms = None
    sqft = None
    price = None

    # price normalization
    p = unit.get('price') or unit.get('rent') or unit.get('current_price')
    if isinstance(p, str):
        s = p.replace('$', '').replace(',', '').strip()
        try:
            price = int(float(s))
        except Exception:
            price = None
    elif isinstance(p, (int, float)):
        price = int(p)

    # beds/baths
    bb = unit.get('bedbath') or unit.get('beds') or unit.get('bedrooms')
    if isinstance(bb, str):
        m = re.search(r"(\d+(?:\.\d+)?)\s*(?:bed|bd|br)", bb, re.I)
        if m:
            try:
                bedrooms = float(m.group(1))
            except Exception:
                bedrooms = None
        m2 = re.search(r"(\d+(?:\.\d+)?)\s*(?:bath|ba)", bb, re.I)
        if m2:
            try:
                bathrooms = float(m2.group(1))
            except Exception:
                bathrooms = None

    sqft_raw = unit.get('sqft') or unit.get('square_feet')
    if isinstance(sqft_raw, str):
        try:
            sqft = int(str(sqft_raw).replace(',', '').split()[0])
        except Exception:
            sqft = None
    elif isinstance(sqft_raw, (int, float)):
        sqft = int(sqft_raw)

    payload = {
        'external_id': external_id,
        'property_url': property_url,
        'unit_number': unit.get('unit_name') or unit.get('unit_number') or None,
        'name': unit.get('unit_name') or unit.get('display_name') or None,
        'listing_url': property_url,
        'current_price': price,
        'bedrooms': bedrooms,
        'bathrooms': bathrooms,
        'square_feet': sqft,
        'raw': unit,
    }
    return payload


def main():
    if len(sys.argv) < 2:
        print('Usage: python agents/dry_run_map.py <scrape_result.json>')
        sys.exit(2)
    path = Path(sys.argv[1])
    if not path.exists():
        print('File not found:', path)
        sys.exit(3)

    with path.open('r', encoding='utf-8') as f:
        scrape = json.load(f)

    property_url = scrape.get('property_url') or scrape.get('url')
    units = scrape.get('units') or []
    payloads = [map_unit_to_payload(property_url, u) for u in units]

    out = {'count': len(payloads), 'payloads': payloads}
    print(json.dumps(out, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()
