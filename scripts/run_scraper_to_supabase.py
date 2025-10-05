#!/usr/bin/env python3
"""Run a local scraper payload push to Supabase RPC `rpc_bulk_upsert_properties_v2`.

Usage:
  - Locally: set env vars SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or use .env.local) then:
      python scripts/run_scraper_to_supabase.py --payload scripts/sample_scrape_payload.json

  - In CI: configure secrets SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in GitHub Actions and run the workflow.
"""
import os
import sys
import json
import argparse
from typing import Any, Dict

import urllib.request


def fail(msg: str):
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(1)


def load_payload(path: str) -> Any:
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def call_rpc(supabase_url: str, service_role: str, payload: Any) -> Dict:
    url = supabase_url.rstrip('/') + '/rest/v1/rpc/rpc_bulk_upsert_properties_v2'
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, method='POST')
    req.add_header('Content-Type', 'application/json')
    req.add_header('apikey', service_role)
    req.add_header('Authorization', f'Bearer {service_role}')
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode('utf-8')
            return {'status': resp.getcode(), 'body': body}
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8') if hasattr(e, 'read') else ''
        return {'status': e.code, 'body': body}
    except Exception as e:
        fail(f'Network error calling RPC: {e}')


def simple_validate(payload: Any):
    if not isinstance(payload, list):
        fail('Payload must be a JSON array of rows')
    # minimal per-row checks
    for i, row in enumerate(payload):
        if not isinstance(row, dict):
            fail(f'Row {i} is not an object')
        required = ['source', 'external_id']
        for key in required:
            if key not in row:
                fail(f'Row {i} missing required key: {key}')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--payload', required=True, help='Path to JSON payload (array of rows)')
    parser.add_argument('--dry-run', action='store_true', help='Validate payload and print RPC body without making network call')
    args = parser.parse_args()

    dry_run = args.dry_run
    supabase_url = os.getenv('SUPABASE_URL')
    service_role = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    if not dry_run and (not supabase_url or not service_role):
        fail('Environment variables SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (or use --dry-run)')

    payload = load_payload(args.payload)
    simple_validate(payload)

    # The RPC expects a JSONB input parameter p_rows - wrap accordingly
    rpc_payload = {'p_rows': payload}
    if dry_run:
        print('DRY RUN: Prepared RPC payload (will not call network)')
        print(json.dumps(rpc_payload, indent=2))
        return

    print('Calling RPC with', len(payload), 'rows...')
    resp = call_rpc(supabase_url, service_role, rpc_payload)
    print('Response status:', resp['status'])
    print('Response body:')
    print(resp['body'])


if __name__ == '__main__':
    main()
