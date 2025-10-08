# Lightweight integration test: invoke claude-queue-builder and assert DB side-effects
# Usage (powershell):
# $env:POSTGRES_URI='postgresql://postgres:postgres@localhost:54330/postgres'; python .\scripts\tests\test_claude_queue_integration.py

import os
import requests
import json
import sys
from subprocess import check_output, CalledProcessError

SUPABASE_URL = os.environ.get('SUPABASE_URL','http://127.0.0.1:54321/functions/v1')
FUNC_URL = f"{SUPABASE_URL}/claude-queue-builder"

def run_query(q):
    env = os.environ.copy()
    env['POSTGRES_URI'] = os.environ.get('POSTGRES_URI','postgresql://postgres:postgres@localhost:54330/postgres')
    try:
        out = check_output([sys.executable, 'scripts/query_sql.py', q], env=env)
        print(out.decode())
        return out.decode()
    except CalledProcessError as e:
        print('Query failed:', e)
        raise

def main():
    print('Calling claude-queue-builder...')
    headers = {}
    if os.environ.get('SUPABASE_SERVICE_ROLE_KEY'):
        headers['Authorization'] = f"Bearer {os.environ.get('SUPABASE_SERVICE_ROLE_KEY')}"
        headers['apikey'] = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    resp = requests.post(FUNC_URL, json={'test_mode': False}, headers=headers, timeout=30)
    print('Function status:', resp.status_code)
    print(resp.text)

    print('\n--- scraping_queue recent rows ---')
    run_query("SELECT id, external_id, property_id, property_source_id, url, source, status, created_at FROM scraping_queue ORDER BY id DESC LIMIT 5;")

    print('\n--- property_discovery recent rows ---')
    run_query("SELECT id, property_name, property_url, created_at FROM property_discovery ORDER BY created_at DESC LIMIT 5;")

    print('\n--- property_sources recent rows ---')
    run_query("SELECT id, url, property_name, metadata, created_at FROM property_sources ORDER BY created_at DESC LIMIT 5;")

if __name__ == '__main__':
    main()
