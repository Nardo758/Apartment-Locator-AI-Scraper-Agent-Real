#!/usr/bin/env python3
"""Convert `highlands_playwright_payload.json` into the desired field shape.

Produces `highlands_converted_payload.json` with objects like:
{
  "external_id": "highlands_unit_1",
  "name": "Unit 1",
  "current_price": 1563,
  "bedrooms": 1,
  "bathrooms": 1.0,
  "square_feet": null,
  "address": "2175 East West Connector",
  "city": "Austell",
  "state": "GA"
}
"""
import json
from typing import Any, Dict


def convert_row(r: Dict[str, Any]) -> Dict[str, Any]:
    return {
        'external_id': r.get('external_id'),
        'name': r.get('unit_name') or r.get('unit_identifier') or r.get('external_id'),
        'current_price': r.get('rent') if r.get('rent') is not None else r.get('current_price'),
        'bedrooms': r.get('beds') if r.get('beds') is not None else r.get('bedrooms'),
        'bathrooms': float(r.get('baths')) if r.get('baths') is not None else (float(r.get('bathrooms')) if r.get('bathrooms') is not None else None),
        'square_feet': r.get('square_feet') if 'square_feet' in r else None,
        'address': r.get('address') or '2175 East West Connector',
        'city': r.get('city') or 'Austell',
        'state': r.get('state') or 'GA',
    }


def main():
    src = 'highlands_playwright_payload.json'
    out = 'highlands_converted_payload.json'
    try:
        with open(src, 'r', encoding='utf-8') as f:
            rows = json.load(f)
    except FileNotFoundError:
        print(f'ERROR: source file {src} not found')
        return

    converted = [convert_row(r) for r in rows]
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(converted, f, indent=2)
    print(f'Wrote {len(converted)} rows to {out}')


if __name__ == '__main__':
    main()
