#!/usr/bin/env python3
"""
Read a saved scrape_result.json (from agents/live_results/*) and either perform a dry-run
print of the mapped payload or call the Supabase service-role RPC `rpc_bulk_upsert_properties`.

Usage:
  python agents/push_scrape_to_supabase.py --file <path-to-scrape_result.json> [--dry-run]

Requires environment variables:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY

The script is intentionally minimal and uses only the `requests` library to call Supabase REST/RPC.
"""
import os
import sys
import json
import argparse
from typing import Dict, Any, List
from decimal import Decimal, InvalidOperation
import hashlib
try:
    import requests  # type: ignore
except Exception:
    requests = None


def load_scrape_result(path: str) -> Dict[str, Any]:
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def map_unit_to_payload(property_url: str, unit: Dict[str, Any], improved: bool = False) -> Dict[str, Any]:
    """Map a single unit dict from scrape_result.json to the RPC payload shape.

    This mapping follows the `scraped_properties` fields used throughout the repo.
    Adjust as needed.
    """
    # Basic mapping heuristics
    external_id = unit.get('external_id') or f"tmp-{abs(hash(property_url + unit.get('unit_name','')))}"
    bedrooms = None
    bathrooms = None
    sqft = None
    price = None

    # price normalization
    p = unit.get('price') or unit.get('rent') or unit.get('current_price')
    if isinstance(p, str):
        s = p.replace('$', '').replace(',', '').strip()
        if improved:
            try:
                price = Decimal(s)
            except (InvalidOperation, Exception):
                price = None
        else:
            try:
                price = int(float(s))
            except Exception:
                price = None
    elif isinstance(p, (int, float, Decimal)):
        if improved and isinstance(p, (int, float)):
            price = Decimal(str(p))
        elif improved and isinstance(p, Decimal):
            price = p
        else:
            price = int(p)

    # simple numeric extraction for beds/baths/sqft if present
    bb = unit.get('bedbath') or unit.get('beds') or unit.get('bedrooms')
    if isinstance(bb, str):
        # look for e.g. '1 bed 1 bath' or '2 bd / 1 ba'
        import re
        m = re.search(r"(\d+(?:\.\d+)?)\s*(?:bed|bd|br)", bb, re.I)
        if m:
            try:
                if improved:
                    bedrooms = int(float(m.group(1)))
                else:
                    bedrooms = float(m.group(1))
            except Exception:
                bedrooms = None
        m2 = re.search(r"(\d+(?:\.\d+)?)\s*(?:bath|ba)", bb, re.I)
        if m2:
            try:
                if improved:
                    bathrooms = int(float(m2.group(1)))
                else:
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
    # if improved mapping, keep Decimal as decimal string for safe transport
    out_price = None
    if improved and isinstance(price, Decimal):
        out_price = str(price)
    else:
        out_price = price

    payload = {
        'external_id': external_id,
        'property_url': property_url,
        'unit_number': unit.get('unit_name') or unit.get('unit_number') or None,
        'name': unit.get('unit_name') or unit.get('display_name') or None,
        'listing_url': property_url,
        'current_price': out_price,
        'bedrooms': bedrooms,
        'bathrooms': bathrooms,
        'square_feet': sqft,
        'raw': unit,
    }
    return payload


def build_payloads(scrape: Dict[str, Any], improved: bool = False) -> List[Dict[str, Any]]:
    property_url = scrape.get('property_url') or scrape.get('url')
    units = scrape.get('units') or []

    # stable external_id generation helper
    def stable_external_id(property_url: str, unit_name: str) -> str:
        base = (property_url or '') + '||' + (unit_name or '')
        h = hashlib.sha1(base.encode('utf-8')).hexdigest()
        return f"ext_{h[:16]}"

    mapped = []
    seen = set()
    from urllib.parse import urlparse

    def domain_of(url: str) -> str:
        if not url:
            return ''
        try:
            host = urlparse(url).netloc
            if host.startswith('www.'):
                host = host[4:]
            return host
        except Exception:
            return url

    prop_domain = domain_of(property_url)

    for u in units:
        # ensure stable external id if missing
        if not u.get('external_id'):
            u['external_id'] = stable_external_id(property_url, u.get('unit_name') or u.get('unit_number'))
        payload = map_unit_to_payload(property_url, u, improved=improved)
        key = (payload.get('external_id'), payload.get('unit_number'))
        if key in seen:
            # duplicate — skip
            continue
        seen.add(key)

        # Build RPC-shaped object expected by rpc_bulk_upsert_properties(p_rows jsonb)
        rpc_item = {
            'property_id': prop_domain or property_url,
            'unit_number': payload.get('unit_number'),
            'unit': payload.get('unit_number'),
            'name': payload.get('name') or '',
            # scraped_properties requires address, city, state as NOT NULL
            'address': property_url or '',
            'source': prop_domain or '',
            'city': '',
            'state': '',
            'current_price': payload.get('current_price'),
            'bedrooms': payload.get('bedrooms') or 0,
            'bathrooms': payload.get('bathrooms') or 0,
            'square_feet': payload.get('square_feet'),
            'listing_url': payload.get('listing_url') or property_url
        }
        mapped.append(rpc_item)
    return mapped


def call_supabase_rpc(supabase_url: str, service_key: str, rpc_name: str, items: List[Dict[str, Any]]) -> Dict[str, Any]:
    # Supabase RPC endpoint: POST {supabase_url}/rest/v1/rpc/{rpc_name}
    global requests
    if requests is None:
        try:
            import requests as _requests  # type: ignore
            requests = _requests
        except Exception:
            print('The Python package `requests` is required to push to Supabase. Please install it in your environment:')
            print('  python -m pip install requests')
            sys.exit(4)
    url = supabase_url.rstrip('/') + f"/rest/v1/rpc/{rpc_name}"
    headers = {
        'apikey': service_key,
        'Authorization': f'Bearer {service_key}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
    }
    # The DB function expects a JSON array as the single parameter (p_rows jsonb),
    # Supabase REST requires named parameter matching the function arg name.
    resp = requests.post(url, headers=headers, json={'p_rows': items})
    try:
        data = resp.json()
    except Exception:
        data = {'status_code': resp.status_code, 'text': resp.text}
    return {'ok': resp.ok, 'status_code': resp.status_code, 'data': data}


from typing import Tuple


def validate_and_coerce(items: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[str]]:
    """Validate required fields and coerce common types to expected shapes.

    Returns (cleaned_items, issues). Issues is a list of human-readable strings.
    This function mutates copies of items and is best-effort: it will fill defaults where safe.
    """
    from copy import deepcopy
    cleaned = []
    issues = []

    for idx, it in enumerate(items):
        c = deepcopy(it)

        # property_id and unit_number required
        if not c.get('property_id'):
            issues.append(f'item[{idx}] missing property_id')
            c['property_id'] = ''
        if not c.get('unit_number'):
            issues.append(f'item[{idx}] missing unit_number')
            c['unit_number'] = ''

        # current_price: allow string decimal or numeric; normalize to string with 2 decimals
        cp = c.get('current_price')
        if cp is None:
            issues.append(f'item[{idx}] missing current_price')
        else:
            try:
                from decimal import Decimal, InvalidOperation
                if isinstance(cp, str):
                    cp_clean = cp.replace('$', '').replace(',', '').strip()
                    cp_dec = Decimal(cp_clean)
                else:
                    cp_dec = Decimal(str(cp))
                c['current_price'] = format(cp_dec.quantize(Decimal('0.01')), 'f')
            except Exception:
                issues.append(f'item[{idx}] current_price could not be parsed: {cp}')

        # bedrooms -> int
        b = c.get('bedrooms')
        if b is None:
            c['bedrooms'] = 0
        else:
            try:
                c['bedrooms'] = int(float(b))
            except Exception:
                issues.append(f'item[{idx}] bedrooms coerced to 0 from {b}')
                c['bedrooms'] = 0

        # bathrooms -> float
        ba = c.get('bathrooms')
        if ba is None:
            c['bathrooms'] = 0
        else:
            try:
                c['bathrooms'] = float(ba)
            except Exception:
                issues.append(f'item[{idx}] bathrooms coerced to 0 from {ba}')
                c['bathrooms'] = 0

        # square_feet -> int or None
        sf = c.get('square_feet')
        if sf is None:
            c['square_feet'] = None
        else:
            try:
                c['square_feet'] = int(float(str(sf).replace(',', '')))
            except Exception:
                issues.append(f'item[{idx}] square_feet coerced to null from {sf}')
                c['square_feet'] = None

        # listing_url fallback
        if not c.get('listing_url'):
            c['listing_url'] = ''

        cleaned.append(c)

    return cleaned, issues


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--file', '-f', required=True, help='Path to scrape_result.json')
    ap.add_argument('--dry-run', action='store_true', help='Do not call Supabase, just print payloads')
    ap.add_argument('--rpc', default='rpc_bulk_upsert_properties', help='RPC name to call on Supabase')
    ap.add_argument('--improved-mapping', action='store_true', help='Use improved mapping: preserve cents, stable ids, dedupe')
    args = ap.parse_args()

    path = args.file
    if not os.path.exists(path):
        print(f"File not found: {path}")
        sys.exit(2)

    scrape = load_scrape_result(path)
    payloads = build_payloads(scrape, improved=args.improved_mapping)

    # ensure backups directory exists
    backups_dir = os.path.join(os.path.dirname(__file__), 'backups')
    if not os.path.exists(backups_dir):
        try:
            os.makedirs(backups_dir, exist_ok=True)
        except Exception:
            pass

    if args.dry_run:
        # ensure Decimal values are serialized safely
        def _serialize(obj):
            if isinstance(obj, Decimal):
                return str(obj)
            raise TypeError

        # validate/coerce payloads for safer inspection
        cleaned, issues = validate_and_coerce(payloads)

        out = {'mode': 'dry-run', 'count': len(cleaned), 'payloads': cleaned, 'validation_issues': issues}
        print(json.dumps(out, indent=2, ensure_ascii=False, default=_serialize))
        # save a local backup for reproducibility
        import datetime
        ts = datetime.datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')
        backup_path = os.path.join(backups_dir, f'dryrun_{ts}.json')
        try:
            with open(backup_path, 'w', encoding='utf-8') as bf:
                json.dump(out, bf, indent=2, ensure_ascii=False, default=_serialize)
            print(f'Local dry-run backup saved to: {backup_path}')
        except Exception as e:
            print('Failed to write local dry-run backup:', e)
        print('\nDry-run complete. No Supabase calls made.')
        return

    # require SUPABASE_URL and SERVICE_ROLE_KEY for push
    supabase_url = os.environ.get('SUPABASE_URL')
    service_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_SERVICE_KEY')
    if not supabase_url or not service_key:
        print('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required for push')
        sys.exit(3)

    # validate/coerce payloads before push
    cleaned, issues = validate_and_coerce(payloads)
    if issues:
        print('Validation issues detected before push:')
        for isue in issues:
            print(' -', isue)

    print(f'Calling Supabase RPC {args.rpc} with {len(cleaned)} items...')
    result = call_supabase_rpc(supabase_url, service_key, args.rpc, cleaned)
    # save a local backup of the payload + RPC response
    try:
        import datetime
        ts = datetime.datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')
        backup_obj = {'mode': 'push', 'rpc': args.rpc, 'items': cleaned, 'validation_issues': issues, 'result': result}
        backup_path = os.path.join(backups_dir, f'push_{ts}.json')
        with open(backup_path, 'w', encoding='utf-8') as bf:
            json.dump(backup_obj, bf, indent=2, ensure_ascii=False)
        print(f'Local push backup saved to: {backup_path}')
    except Exception as e:
        print('Failed to write local push backup:', e)

    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()
