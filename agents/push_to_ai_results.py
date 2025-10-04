import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent
combined = ROOT / 'extraction_results' / 'combined_extractions.json'
out = ROOT / 'extraction_results' / 'supabase_ai_results_push.json'

if not combined.exists():
    print('combined_extractions.json not found')
    raise SystemExit(1)

records = json.loads(combined.read_text(encoding='utf-8')).get('reports', [])

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
if not SUPABASE_URL or not SUPABASE_KEY:
    print('Set SUPABASE_URL and SUPABASE_KEY environment variables (e.g. from .env.local.bak)')
    raise SystemExit(1)

url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/ai_results"
headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

# Map each record into the ai_results shape: job_id left null, model 'training_push', result => extraction
payload = []
for rec in records:
    payload.append({
        'model': 'training_push',
        'result': rec,
        # optionally include site_key in result as top-level; avoid changing schema
    })

body = json.dumps(payload).encode('utf-8')

try:
    import requests
    r = requests.post(url, headers=headers, json=payload, timeout=30)
    out.write_text(json.dumps({'pushed': True, 'status_code': r.status_code, 'response_text': r.text}, indent=2), encoding='utf-8')
    print('Wrote', out)
except Exception:
    try:
        from urllib import request as _request
        req = _request.Request(url, data=body, method='POST')
        for k, v in headers.items():
            req.add_header(k, v)
        with _request.urlopen(req, timeout=30) as resp:
            resp_text = resp.read().decode('utf-8', errors='replace')
            out.write_text(json.dumps({'pushed': True, 'status_code': resp.getcode(), 'response_text': resp_text}, indent=2), encoding='utf-8')
            print('Wrote', out)
    except Exception as e:
        out.write_text(json.dumps({'pushed': False, 'reason': str(e)}, indent=2), encoding='utf-8')
        print('Wrote', out)
