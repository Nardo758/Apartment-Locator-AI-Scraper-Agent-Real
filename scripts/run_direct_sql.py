"""
Run direct SQL queries against the staging Postgres database for verification.
Reads POSTGRES_URI from environment or from .env.local in repository root.

Outputs:
- Column listing for scraped_properties and apartments
- Row counts for scraped_properties, apartments, price_history
- Most recent 5 rows from scraped_properties and price_history
"""
import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor


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


def run():
    load_env_local()
    uri = os.getenv('POSTGRES_URI')
    if not uri:
        print('POSTGRES_URI not set in environment or .env.local')
        sys.exit(1)

    conn = psycopg2.connect(uri)
    cur = conn.cursor(cursor_factory=RealDictCursor)

    queries = [
        ("columns_scraped", "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='scraped_properties' ORDER BY ordinal_position;"),
        ("columns_apartments", "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='apartments' ORDER BY ordinal_position;"),
        ("count_scraped", "SELECT count(*) AS cnt FROM public.scraped_properties;"),
        ("count_apartments", "SELECT count(*) AS cnt FROM public.apartments;"),
        ("count_price_history", "SELECT count(*) AS cnt FROM public.price_history;"),
        ("recent_scraped", "SELECT * FROM public.scraped_properties ORDER BY updated_at DESC NULLS LAST LIMIT 5;"),
        ("recent_price_history", "SELECT * FROM public.price_history ORDER BY recorded_at DESC LIMIT 5;"),
    ]

    for name, q in queries:
        print('\n---', name)
        try:
            cur.execute(q)
            rows = cur.fetchall()
            for r in rows:
                print(r)
        except Exception as e:
            print('ERROR running', name, e)

    cur.close()
    conn.close()

if __name__ == '__main__':
    run()
