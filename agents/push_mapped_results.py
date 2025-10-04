import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent
combined = ROOT / 'extraction_results' / 'combined_extractions.json'
out = ROOT / 'extraction_results' / 'supabase_mapped_push.json'

if not combined.exists():
    print('combined_extractions.json not found')
    raise SystemExit(1)

data = json.loads(combined.read_text(encoding='utf-8'))
reports = data.get('reports', [])

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
if not SUPABASE_URL or not SUPABASE_KEY:
    print('Set SUPABASE_URL and SUPABASE_KEY environment variables (e.g. from .env.local.bak)')
    raise SystemExit(1)

def post(table, payload):
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/{table}"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }
    body = json.dumps(payload).encode('utf-8')
    try:
        import requests
        r = requests.post(url, headers=headers, json=payload, timeout=30)
        return {'ok': True, 'status': r.status_code, 'text': r.text}
    except Exception:
        try:
            from urllib import request as _request
            req = _request.Request(url, data=body, method='POST')
            for k, v in headers.items():
                req.add_header(k, v)
            with _request.urlopen(req, timeout=30) as resp:
                resp_text = resp.read().decode('utf-8', errors='replace')
                return {'ok': True, 'status': resp.getcode(), 'text': resp_text}
        except Exception as e:
            return {'ok': False, 'error': str(e)}

results = []

for r in reports:
    site = r.get('site_key') or r.get('url')
    # If the extraction run produced a structured `extraction` object, consider mapping
    extraction = r.get('extraction') if isinstance(r.get('extraction'), dict) else None

    if extraction:
        # Heuristic: if we have core listing fields, target scraped_properties
        keys = set(extraction.keys())
        required_for_scraped = {'listing_url', 'current_price', 'bedrooms', 'bathrooms', 'name', 'property_id', 'unit_number', 'city', 'state', 'address'}
        if required_for_scraped.issubset(keys):
            payload = [{
                'address': extraction.get('address'),
                'listing_url': extraction.get('listing_url'),
                'current_price': extraction.get('current_price'),
                'bedrooms': extraction.get('bedrooms'),
                'bathrooms': extraction.get('bathrooms'),
                'name': extraction.get('name'),
                'property_id': extraction.get('property_id'),
                'unit_number': extraction.get('unit_number'),
                'city': extraction.get('city'),
                'state': extraction.get('state'),
                'source': r.get('url') or extraction.get('source') or 'scraper',
                'scraped_at': r.get('timestamp'),
            }]
            resp = post('scraped_properties', payload)
            results.append({'site': site, 'target': 'scraped_properties', 'payload_count': len(payload), 'resp': resp})
            continue

        # Otherwise push the raw extraction into ai_results.result for analysis
        payload = [{
            'model': 'scraper_extraction',
            'result': extraction
        }]
        resp = post('ai_results', payload)
        results.append({'site': site, 'target': 'ai_results', 'payload_count': len(payload), 'resp': resp})
        continue

    # No structured extraction -> record as a scraping log
    message = r.get('error') or 'no-extraction'
    meta = {k: v for k, v in r.items() if k not in ('site_key',)}
    payload = [{
        'level': 'error' if r.get('error') else 'info',
        'message': f"Extraction result for {site}: {message}",
        'meta': meta
    }]
    resp = post('scraping_logs', payload)
    results.append({'site': site, 'target': 'scraping_logs', 'payload_count': len(payload), 'resp': resp})

out.write_text(json.dumps({'results': results}, indent=2), encoding='utf-8')
print('Wrote', out)
