"""
Call the rpc_merge_apartments_to_scraped_v1 function with a sample payload using psycopg2.
Reads POSTGRES_URI from .env.local or environment.
"""
import os
import sys
import json
import psycopg2


def load_env_local():
    path = '.env.local'
    if not os.path.exists(path):
        return
    with open(path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' in line:
                k, v = line.split('=', 1)
                os.environ.setdefault(k.strip(), v.strip())


def main():
    load_env_local()
    uri = os.getenv('POSTGRES_URI')
    if not uri:
        print('POSTGRES_URI not set')
        sys.exit(1)

    sample = [{
        'external_id': 'claude_test_merge_' + str(os.getpid()),
        'property_id': 'merge.example.com',
        'unit_number': 'M1',
        'title': 'Merge Test Unit M1',
        'address': '1 Merge Plaza',
        'source': 'claude-test',
        'city': 'MergeCity',
        'state': 'CA',
        'rent_price': 1700,
        'bedrooms': 1,
        'bathrooms': 1.0,
        'amenities': ['gym', 'rooftop'],
        'application_fee': 25,
        'admin_fee_amount': 0,
        'security_deposit': 500,
        'ai_provider': 'claude',
        'ai_raw': {'_test': True}
    }]

    conn = psycopg2.connect(uri)
    cur = conn.cursor()
    try:
        cur.execute("SELECT public.rpc_merge_apartments_to_scraped_v1(%s::jsonb)", (json.dumps(sample),))
        res = cur.fetchone()
        print('RPC result:', res)
    except Exception as e:
        print('ERROR calling RPC', e)
    finally:
        conn.commit()
        cur.close()
        conn.close()

if __name__ == '__main__':
    main()
